"""Polite HTTP for the PYQ scraper.

Rules (docs/ARCHITECTURE.md, "External APIs and the retry rule"):
- robots.txt is checked for every host before fetching.
- 2-5 s (random) between two requests to the same host.
- Generic User-Agent, no personal details.
- Transient errors (network, timeout, 408/429/5xx): wait 10 s and retry,
  at most 30 tries per URL, then the URL is recorded as failed.
- Other 4xx: no retry, recorded as failed.
- A host whose robots.txt (the first request to it) fails all 30 tries is
  marked down for the rest of the run, so a dead site costs one 5-15 minute
  wait instead of one per URL.
"""
from __future__ import annotations

import random
import threading
import time
import urllib.robotparser
from dataclasses import dataclass
from urllib.parse import urlparse

import requests

USER_AGENT = "Mozilla/5.0 (compatible; PYQArchiver/0.1; educational archive; respects robots.txt)"
RETRY_WAIT = 10.0
MAX_TRIES = 30
TRANSIENT = {408, 429}
CONNECT_TIMEOUT = 15
READ_TIMEOUT = 120


class FetchError(Exception):
    """Final failure for one URL. kind: 'transient' (tries exhausted),
    'http' (permanent 4xx), 'robots' (disallowed), 'host-down'."""

    def __init__(self, url: str, kind: str, detail: str):
        super().__init__(f"{kind}: {detail} ({url})")
        self.url, self.kind, self.detail = url, kind, detail


@dataclass
class Response:
    url: str
    status: int
    content: bytes
    headers: dict

    @property
    def text(self) -> str:
        for enc in ("utf-8", "cp1252", "latin-1"):
            try:
                return self.content.decode(enc)
            except UnicodeDecodeError:
                continue
        return self.content.decode("utf-8", "replace")


class Client:
    def __init__(self, max_tries: int = MAX_TRIES, min_gap: float = 2.0, max_gap: float = 5.0,
                 log=print):
        self.max_tries = min(max_tries, MAX_TRIES)
        self.min_gap, self.max_gap = min_gap, max_gap
        self.log = log
        self.session = requests.Session()
        self.session.headers["User-Agent"] = USER_AGENT
        self._last: dict[str, float] = {}
        self._robots: dict[str, urllib.robotparser.RobotFileParser | None] = {}
        self.down: dict[str, str] = {}
        self._lock = threading.Lock()
        self._host_locks: dict[str, threading.Lock] = {}

    # -- politeness -------------------------------------------------------
    def _host_lock(self, host: str) -> threading.Lock:
        with self._lock:
            return self._host_locks.setdefault(host, threading.Lock())

    def _throttle(self, host: str) -> None:
        last = self._last.get(host)
        if last is not None:
            gap = random.uniform(self.min_gap, self.max_gap)
            wait = gap - (time.monotonic() - last)
            if wait > 0:
                time.sleep(wait)
        self._last[host] = time.monotonic()

    def _raw(self, url: str, **kw) -> Response:
        """One URL with the retry rule. Caller holds the host lock."""
        host = urlparse(url).netloc
        last = ""
        for attempt in range(1, self.max_tries + 1):
            self._throttle(host)
            try:
                r = self.session.get(url, timeout=(CONNECT_TIMEOUT, READ_TIMEOUT), **kw)
            except requests.RequestException as e:
                last = f"{type(e).__name__}: {str(e)[:160]}"
            else:
                if r.status_code in TRANSIENT or r.status_code >= 500:
                    last = f"HTTP {r.status_code}"
                elif r.status_code >= 400:
                    raise FetchError(url, "http", f"HTTP {r.status_code}")
                else:
                    return Response(r.url, r.status_code, r.content, dict(r.headers))
            if attempt < self.max_tries:
                self.log(f"    retry {attempt}/{self.max_tries} in {RETRY_WAIT:.0f}s: {last} [{url}]")
                time.sleep(RETRY_WAIT)
        raise FetchError(url, "transient", f"{self.max_tries} tries, last: {last}")

    def _robots_ok(self, url: str) -> bool:
        p = urlparse(url)
        base = f"{p.scheme}://{p.netloc}"
        if base not in self._robots:
            rp = urllib.robotparser.RobotFileParser()
            try:
                r = self._raw(base + "/robots.txt")
                ctype = r.headers.get("Content-Type", r.headers.get("content-type", ""))
                if "html" in ctype.lower() and "<html" in r.text[:500].lower():
                    self._robots[base] = None  # an HTML page, not a robots file
                else:
                    rp.parse(r.text.splitlines())
                    self._robots[base] = rp
            except FetchError as e:
                if e.kind == "http":  # 404 etc.: no robots.txt, everything allowed
                    self._robots[base] = None
                else:
                    self.down[p.netloc] = e.detail
                    raise FetchError(url, "host-down", f"{p.netloc} unreachable: {e.detail}")
        rp = self._robots[base]
        return rp is None or rp.can_fetch(USER_AGENT, url)

    # -- public -----------------------------------------------------------
    def get(self, url: str, **kw) -> Response:
        host = urlparse(url).netloc
        with self._host_lock(host):
            if host in self.down:
                raise FetchError(url, "host-down", f"{host} unreachable earlier in this run: {self.down[host]}")
            if not self._robots_ok(url):
                raise FetchError(url, "robots", "robots.txt disallows this URL")
            return self._raw(url, **kw)
