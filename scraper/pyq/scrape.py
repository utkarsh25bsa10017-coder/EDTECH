"""Download official past papers and answer keys for the seven exams.

    .venv/bin/python -m scraper.pyq.scrape                 # all exams
    .venv/bin/python -m scraper.pyq.scrape --exam ras ctet
    .venv/bin/python -m scraper.pyq.scrape --retry-failed  # retry failed URLs too
    .venv/bin/python -m scraper.pyq.scrape --max-tries 3   # quick test (default 30)

Writes PDFs to scraper/pdfs/<exam>/ and the manifest to scraper/manifest.json.
Rerunnable: URLs already downloaded (status ok, file present) are skipped.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import threading
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from .net import Client, FetchError
from . import sources as S

SCRAPER = Path(__file__).resolve().parent.parent
PDF_DIR = SCRAPER / "pdfs"
MANIFEST = SCRAPER / "manifest.json"
_lock = threading.Lock()


def log(*a):
    with _lock:
        print(*a, flush=True)


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def slug(s: str) -> str:
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()
    return s[:90] or "x"


def load_manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text())
    return {"generated": None, "entries": [], "discovery_problems": []}


def save_manifest(m: dict) -> None:
    m["generated"] = now()
    m["entries"].sort(key=lambda e: (e["exam"], -(e.get("year") or 0), e["cycle"], e["kind"], e["paper"]))
    tmp = MANIFEST.with_suffix(".tmp")
    tmp.write_text(json.dumps(m, ensure_ascii=False, indent=1))
    tmp.replace(MANIFEST)


def file_name(it: S.Item) -> str:
    tag = "key" if it.kind == S.AK else "qp"
    h = hashlib.sha1(it.url.encode()).hexdigest()[:6]
    return f"{slug(it.cycle)}--{slug(it.paper)}--{tag}-{h}.pdf"


def discover(c: Client, exams: set[str]) -> tuple[list[S.Item], list[dict]]:
    jobs = {}
    if "ras" in exams:
        jobs["rpsc"] = lambda: (S.discover_ras(c), [])
    if "ctet" in exams:
        jobs["ctet"] = lambda: (S.discover_ctet(c), [])
    for site, cfg in S.LISTINGS.items():
        if exams & set(cfg["exams"]):
            jobs[site] = (lambda site=site: S.discover_listing(c, site, log))
    items, problems = [], []

    def run(name, fn):
        log(f"[discover] {name} ...")
        try:
            its, probs = fn()
        except FetchError as e:
            log(f"[discover] {name} FAILED: {e}")
            return [], [{"site": name, "url": e.url, "error": str(e)}]
        log(f"[discover] {name}: {len(its)} documents, {len(probs)} problems")
        return its, [dict(p, site=name) for p in probs]

    with ThreadPoolExecutor(max_workers=len(jobs) or 1) as ex:
        for its, probs in ex.map(lambda kv: run(*kv), jobs.items()):
            items += its
            problems += probs
    items += S.discover_secondary()
    items = [i for i in items if i.exam in exams]
    # de-duplicate by URL, keep first
    seen, uniq = set(), []
    for i in items:
        if i.url not in seen:
            seen.add(i.url)
            uniq.append(i)
    return uniq, problems


def download(c: Client, it: S.Item, entry: dict) -> dict:
    dest = PDF_DIR / it.exam / file_name(it)
    entry.update(it.as_dict())
    entry["file"] = str(dest.relative_to(SCRAPER))
    try:
        r = c.get(it.url)
    except FetchError as e:
        entry.update(status="skipped-robots" if e.kind == "robots" else "failed",
                     error=str(e), error_kind=e.kind, checked_at=now())
        log(f"  {entry['status']}: {it.exam} {it.cycle} {it.paper}: {e.kind} {e.detail}")
        return entry
    data = r.content
    if b"%PDF" not in data[:1024]:
        entry.update(status="failed", error=f"not a PDF ({len(data)} bytes, {r.headers.get('Content-Type')})",
                     error_kind="not-pdf", checked_at=now())
        log(f"  failed: {it.exam} {it.cycle} {it.paper}: not a PDF")
        return entry
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    entry.update(status="ok", sha256=hashlib.sha256(data).hexdigest(), bytes=len(data),
                 error=None, error_kind=None, fetched_at=now(), checked_at=now())
    log(f"  ok: {it.exam} {it.cycle} {it.paper} ({len(data)//1024} KB)")
    return entry


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exam", nargs="*", default=list(S.EXAMS), choices=S.EXAMS)
    ap.add_argument("--retry-failed", action="store_true")
    ap.add_argument("--max-tries", type=int, default=30)
    ap.add_argument("--discover-only", action="store_true")
    a = ap.parse_args(argv)
    exams = set(a.exam)
    c = Client(max_tries=a.max_tries, log=log)
    t0 = time.time()
    items, problems = discover(c, exams)
    m = load_manifest()
    by_url = {e["url"]: e for e in m["entries"]}
    m["discovery_problems"] = problems
    todo = []
    for it in items:
        e = by_url.get(it.url)
        if e is None:
            e = {"status": "pending"}
            m["entries"].append(e)
            by_url[it.url] = e
            e.update(it.as_dict())
        if e.get("status") == "ok" and (SCRAPER / e.get("file", "")).exists():
            continue
        if e.get("status") in ("failed", "skipped-robots") and not a.retry_failed and e.get("checked_at"):
            continue
        todo.append((it, e))
    log(f"[download] {len(todo)} to fetch ({len(items)} discovered)")
    save_manifest(m)
    if not a.discover_only:
        groups = defaultdict(list)
        for it, e in todo:
            groups[urlparse(it.url).netloc].append((it, e))

        def worker(pairs):
            for it, e in pairs:
                download(c, it, e)
                with _lock:
                    save_manifest(m)

        with ThreadPoolExecutor(max_workers=min(6, len(groups) or 1)) as ex:
            list(ex.map(worker, groups.values()))
    save_manifest(m)
    # summary
    summ = defaultdict(lambda: defaultdict(int))
    for e in m["entries"]:
        if e["exam"] in exams:
            summ[e["exam"]][f"{e['kind']}:{e.get('status')}"] += 1
    for ex_, d in sorted(summ.items()):
        log(f"  {ex_:11s} " + ", ".join(f"{k}={v}" for k, v in sorted(d.items())))
    for p in problems:
        log(f"  problem: {p.get('site')}: {p.get('error')}")
    log(f"done in {time.time()-t0:.0f}s; manifest: {MANIFEST}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
