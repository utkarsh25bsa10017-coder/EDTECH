"""Shared helpers for every board scraper.

Every scraper imports this module so that politeness rules, caching, the
output contract (see SCHEMA.md) and garbled-text detection stay identical
across boards.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import time
import unicodedata
import urllib.robotparser
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
CACHE_DIR = ROOT / "cache"
PDF_DIR = ROOT / "pdfs"

USER_AGENT = "PrashnottarBot/0.1 (educational archive; respects robots.txt)"

# Only official board / government domains. Third-party solution sites hold
# copyrighted material and are deliberately excluded.
ALLOWED_DOMAINS = (
    "cbseacademic.nic.in",
    "cbse.gov.in",
    "cbse.nic.in",
    "cisce.org",
    "upmsp.edu.in",
    "upmspresults.up.nic.in",
    "biharboardonline.bihar.gov.in",
    "biharboardonline.com",
    "biharboardonline.org",
)

BOARDS = ("cbse", "icse", "isc", "up", "bihar")
KINDS = ("pyq", "sample", "specimen", "model")
LANGS = ("en", "hi", "bi")
EXTRACTION = ("full", "questions", "pdf-only")

# Canonical subject slugs with English / Hindi display names. Add new
# subjects here following the same pattern so every board shares slugs.
SUBJECTS: dict[str, tuple[str, str]] = {
    "mathematics": ("Mathematics", "गणित"),
    "mathematics-standard": ("Mathematics (Standard)", "गणित (मानक)"),
    "mathematics-basic": ("Mathematics (Basic)", "गणित (बुनियादी)"),
    "applied-mathematics": ("Applied Mathematics", "अनुप्रयुक्त गणित"),
    "science": ("Science", "विज्ञान"),
    "social-science": ("Social Science", "सामाजिक विज्ञान"),
    "english": ("English", "अंग्रेज़ी"),
    "english-language": ("English Language", "अंग्रेज़ी भाषा"),
    "english-literature": ("English Literature", "अंग्रेज़ी साहित्य"),
    "english-language-literature": ("English Language & Literature", "अंग्रेज़ी भाषा एवं साहित्य"),
    "english-core": ("English Core", "अंग्रेज़ी (कोर)"),
    "english-elective": ("English Elective", "अंग्रेज़ी (ऐच्छिक)"),
    "hindi": ("Hindi", "हिन्दी"),
    "hindi-a": ("Hindi Course A", "हिन्दी पाठ्यक्रम अ"),
    "hindi-b": ("Hindi Course B", "हिन्दी पाठ्यक्रम ब"),
    "hindi-core": ("Hindi Core", "हिन्दी (आधार)"),
    "hindi-elective": ("Hindi Elective", "हिन्दी (ऐच्छिक)"),
    "sanskrit": ("Sanskrit", "संस्कृत"),
    "urdu": ("Urdu", "उर्दू"),
    "physics": ("Physics", "भौतिक विज्ञान"),
    "chemistry": ("Chemistry", "रसायन विज्ञान"),
    "biology": ("Biology", "जीव विज्ञान"),
    "accountancy": ("Accountancy", "लेखाशास्त्र"),
    "business-studies": ("Business Studies", "व्यवसाय अध्ययन"),
    "economics": ("Economics", "अर्थशास्त्र"),
    "commerce": ("Commerce", "वाणिज्य"),
    "commercial-studies": ("Commercial Studies", "वाणिज्यिक अध्ययन"),
    "history": ("History", "इतिहास"),
    "geography": ("Geography", "भूगोल"),
    "history-civics": ("History & Civics", "इतिहास एवं नागरिक शास्त्र"),
    "political-science": ("Political Science", "राजनीति विज्ञान"),
    "sociology": ("Sociology", "समाजशास्त्र"),
    "psychology": ("Psychology", "मनोविज्ञान"),
    "home-science": ("Home Science", "गृह विज्ञान"),
    "physical-education": ("Physical Education", "शारीरिक शिक्षा"),
    "computer-science": ("Computer Science", "कंप्यूटर विज्ञान"),
    "computer-applications": ("Computer Applications", "कंप्यूटर अनुप्रयोग"),
    "informatics-practices": ("Informatics Practices", "सूचना विज्ञान अभ्यास"),
    "information-technology": ("Information Technology", "सूचना प्रौद्योगिकी"),
    "artificial-intelligence": ("Artificial Intelligence", "कृत्रिम बुद्धिमत्ता"),
    "environmental-science": ("Environmental Science", "पर्यावरण विज्ञान"),
    "environmental-applications": ("Environmental Applications", "पर्यावरण अनुप्रयोग"),
    "legal-studies": ("Legal Studies", "विधिक अध्ययन"),
    "entrepreneurship": ("Entrepreneurship", "उद्यमिता"),
    "fine-arts": ("Fine Arts", "ललित कला"),
    "music": ("Music", "संगीत"),
    "agriculture": ("Agriculture", "कृषि"),
}

_STOPWORDS = {"and", "of", "the"}


def subject_key(name: str) -> str:
    """Normalise a printed subject name for matching:
    'English Language & Literature' -> 'english language literature'."""
    return " ".join(w for w in re.findall(r"[a-z0-9]+", name.lower()) if w not in _STOPWORDS)


_SUBJECT_KEYS = {subject_key(en): slug for slug, (en, _hi) in SUBJECTS.items()}


def resolve_subject(name: str, aliases: dict[str, str] | None = None,
                    extra: dict[str, str] | None = None) -> tuple[str, dict | None]:
    """Map a subject name as printed by a board to (slug, subject_name).

    aliases maps subject_key() forms to slugs; extra maps board-specific slugs
    (not in SUBJECTS) to English display names. subject_name is None for
    canonical SUBJECTS (write_paper fills it in), else {"en": ..., "hi": None}.
    """
    key = subject_key(name)
    slug = (aliases or {}).get(key) or _SUBJECT_KEYS.get(key) or key.replace(" ", "-")
    if slug in SUBJECTS:
        return slug, None
    return slug, {"en": (extra or {}).get(slug) or name.strip(), "hi": None}


# --------------------------------------------------------------------------- #
# HTTP
# --------------------------------------------------------------------------- #

class Blocked(Exception):
    """The site answered with a CAPTCHA / bot wall. Deliberately not a
    RuntimeError so scrapers stop instead of retrying every remaining URL."""


def _is_challenge(r: requests.Response) -> bool:
    head = r.content[:4000].lower()
    return not head.lstrip().startswith(b"%pdf") and b"captcha" in head


class Fetcher:
    """Polite, cached HTTP client restricted to official domains."""

    def __init__(self, board: str, min_interval: float = 1.0, verify: bool = True,
                 extra_domains: tuple[str, ...] = ()):
        """extra_domains: additional hosts verifiably run by the board (linked from
        its official site). Justify each one with a comment at the call site."""
        assert board in BOARDS or board == "cisce", board
        self.board = board
        self.allowed = ALLOWED_DOMAINS + tuple(extra_domains)
        self.min_interval = min_interval
        self.verify = verify
        self.session = requests.Session()
        self.session.headers["User-Agent"] = USER_AGENT
        self.cache = CACHE_DIR / board
        self.cache.mkdir(parents=True, exist_ok=True)
        self._last: dict[str, float] = {}
        self._robots: dict[str, urllib.robotparser.RobotFileParser | None] = {}

    def _host_allowed(self, url: str) -> bool:
        host = (urlparse(url).hostname or "").lower()
        return any(host == d or host.endswith("." + d) for d in self.allowed)

    def _robots_ok(self, url: str) -> bool:
        p = urlparse(url)
        base = f"{p.scheme}://{p.netloc}"
        if base not in self._robots:
            rp = urllib.robotparser.RobotFileParser()
            try:
                r = self.session.get(base + "/robots.txt", timeout=20, verify=self.verify)
                if r.status_code == 200 and "html" not in r.headers.get("content-type", ""):
                    rp.parse(r.text.splitlines())
                    self._robots[base] = rp
                else:
                    self._robots[base] = None  # no robots.txt -> allowed
            except requests.RequestException:
                self._robots[base] = None
        rp = self._robots[base]
        return rp is None or rp.can_fetch(USER_AGENT, url)

    def _throttle(self, url: str) -> None:
        host = urlparse(url).netloc
        wait = self.min_interval - (time.monotonic() - self._last.get(host, 0))
        if wait > 0:
            time.sleep(wait)
        self._last[host] = time.monotonic()

    def cache_path(self, url: str) -> Path:
        h = hashlib.sha1(url.encode()).hexdigest()[:16]
        ext = Path(urlparse(url).path).suffix.lower()[:6] or ".bin"
        return self.cache / f"{h}{ext}"

    def get(self, url: str, *, use_cache: bool = True, retries: int = 3) -> bytes:
        if not self._host_allowed(url):
            raise ValueError(f"refusing non-official domain: {url}")
        path = self.cache_path(url)
        if use_cache and path.exists() and path.stat().st_size > 0:
            return path.read_bytes()
        if not self._robots_ok(url):
            raise PermissionError(f"robots.txt disallows {url}")
        last_err: Exception | None = None
        for attempt in range(retries):
            self._throttle(url)
            try:
                r = self.session.get(url, timeout=60, verify=self.verify)
                r.raise_for_status()
                if _is_challenge(r):
                    raise Blocked(f"{urlparse(url).netloc} is asking for a CAPTCHA (at {url}); stopping. "
                                  "Do not work around it: wait, or run from another network.")
                path.write_bytes(r.content)
                return r.content
            except requests.RequestException as e:
                last_err = e
                time.sleep(2 * (attempt + 1))
        raise RuntimeError(f"failed {url}: {last_err}")

    def save_pdf(self, url: str, dest: Path) -> Path:
        """Download a PDF (via the cache) and place it at dest.

        dest is hard-linked to the cached copy so the readable archive under
        PDF_DIR costs no extra disk space. Raises ValueError when the server
        returns something that is not a PDF (error pages often come back 200).
        """
        raw = self.get(url)
        if b"%PDF" not in raw[:1024]:
            self.cache_path(url).unlink(missing_ok=True)  # retry on the next run
            raise ValueError(f"not a PDF ({len(raw)} bytes): {url}")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.unlink(missing_ok=True)
        try:
            os.link(self.cache_path(url), dest)
        except OSError:
            shutil.copyfile(self.cache_path(url), dest)
        return dest

    @staticmethod
    def abs_url(base: str, href: str) -> str:
        """Absolute, properly escaped URL for a link found on base (boards put
        spaces and even backslashes in their hrefs)."""
        return requests.utils.requote_uri(urljoin(base, href.strip().replace("\\", "/")))

    def get_text(self, url: str, **kw) -> str:
        raw = self.get(url, **kw)
        for enc in ("utf-8", "cp1252", "latin-1"):
            try:
                return raw.decode(enc)
            except UnicodeDecodeError:
                continue
        return raw.decode("utf-8", "replace")


# --------------------------------------------------------------------------- #
# PDF + text quality
# --------------------------------------------------------------------------- #

def pdf_pages(path: Path | bytes) -> list[str]:
    """Return plain text per page (1 string per page)."""
    import pymupdf

    doc = pymupdf.open(stream=path, filetype="pdf") if isinstance(path, bytes) else pymupdf.open(path)
    try:
        return [page.get_text("text", sort=True) for page in doc]
    finally:
        doc.close()


_DEVA = re.compile(r"[ऀ-ॿ]")
_LATIN = re.compile(r"[A-Za-z]")
# Characters that show up when legacy (Kruti Dev / Chanakya) Hindi fonts are
# extracted as if they were Latin text.
_LEGACY_HINDI_ARTIFACTS = re.compile(r"[ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿]")


def devanagari_ratio(text: str) -> float:
    deva = len(_DEVA.findall(text))
    latin = len(_LATIN.findall(text))
    total = deva + latin
    return deva / total if total else 0.0


def looks_garbled(text: str, lang: str) -> bool:
    """Heuristic: True when extracted text is unusable (scan, legacy font, etc.)."""
    stripped = re.sub(r"\s+", "", text)
    if len(stripped) < 40:
        return True
    if "�" in text and text.count("�") > len(stripped) * 0.01:
        return True
    if len(_LEGACY_HINDI_ARTIFACTS.findall(text)) > len(stripped) * 0.02:
        return True
    if lang == "hi" and devanagari_ratio(text) < 0.25:
        return True
    return False


def clean_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = text.replace(" ", " ").replace("​", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# --------------------------------------------------------------------------- #
# Output
# --------------------------------------------------------------------------- #

@dataclass
class Question:
    number: str
    text: str
    section: str | None = None
    marks: float | None = None
    solution: str | None = None
    has_figure: bool = False
    page: int | None = None


@dataclass
class Paper:
    board: str
    klass: int
    subject_slug: str
    year: int
    kind: str
    lang: str
    title: str
    source_page: str
    paper_pdf: str
    solution_pdf: str | None = None
    variant: str | None = None
    session: str | None = None
    duration_minutes: int | None = None
    max_marks: int | None = None
    subject_name: dict | None = None
    questions: list[Question] = field(default_factory=list)
    extraction: str | None = None

    @property
    def id(self) -> str:
        parts = [self.board, str(self.klass), self.subject_slug, str(self.year), self.kind, self.lang]
        if self.variant:
            parts.append(re.sub(r"[^a-z0-9]+", "-", self.variant.lower()).strip("-"))
        return "-".join(parts)


def disambiguate(papers: list[Paper], label) -> None:
    """Papers that would share an id get label(paper) appended to their variant and title."""
    groups: dict[str, list[Paper]] = {}
    for p in papers:
        groups.setdefault(p.id, []).append(p)
    for group in groups.values():
        if len(group) > 1:
            for p in group:
                extra = label(p)
                p.variant = f"{p.variant}, {extra}" if p.variant else extra
                p.title = f"{p.title} ({extra})"


def pdf_path(p: Paper, suffix: str = "") -> Path:
    """Where the downloaded copy of a paper lives: pdfs/<board>/<class>/<year>/<id>.pdf"""
    return PDF_DIR / p.board / str(p.klass) / str(p.year) / f"{p.id}{suffix}.pdf"


def download_and_write(fetcher: Fetcher, papers: list[Paper]) -> list[tuple[str, str]]:
    """Download each paper's PDF (and solution PDF) into PDF_DIR, then write its
    record. A paper whose PDF cannot be fetched gets no record; a failed
    solution only drops solution_pdf. Failures are listed in
    PDF_DIR/<board>/failed.tsv and returned as (url, error)."""
    errors = (RuntimeError, ValueError, PermissionError)
    failures: list[tuple[str, str]] = []
    written = 0
    for i, p in enumerate(papers, 1):
        tag = f"[{i}/{len(papers)}]"
        try:
            fetcher.save_pdf(p.paper_pdf, pdf_path(p))
        except errors as e:
            failures.append((p.paper_pdf, str(e)))
            print(f"{tag} FAIL {p.id}: {e}", flush=True)
            continue
        if p.solution_pdf:
            try:
                fetcher.save_pdf(p.solution_pdf, pdf_path(p, ".marking-scheme"))
            except errors as e:
                failures.append((p.solution_pdf, str(e)))
                print(f"{tag} solution FAIL {p.id}: {e}", flush=True)
                p.solution_pdf = None
        write_paper(p)
        written += 1
        print(f"{tag} ok {p.id}", flush=True)
    if papers:
        log = PDF_DIR / papers[0].board / "failed.tsv"
        log.parent.mkdir(parents=True, exist_ok=True)
        log.write_text("".join(f"{u}\t{e}\n" for u, e in failures))
        print(f"done: {written}/{len(papers)} papers, {len(failures)} failed downloads (see {log})", flush=True)
    return failures


def write_paper(p: Paper) -> Path:
    assert p.board in BOARDS, p.board
    assert 9 <= p.klass <= 12, p.klass
    assert p.kind in KINDS, p.kind
    assert p.lang in LANGS, p.lang
    assert re.fullmatch(r"[a-z0-9-]+", p.subject_slug), p.subject_slug
    assert p.paper_pdf.startswith("http"), p.paper_pdf

    name = p.subject_name
    if name is None:
        if p.subject_slug not in SUBJECTS:
            raise ValueError(f"unknown subject slug {p.subject_slug!r}: add it to SUBJECTS or pass subject_name")
        en, hi = SUBJECTS[p.subject_slug]
        name = {"en": en, "hi": hi}

    qs = [q for q in p.questions if q.text and q.text.strip()]
    extraction = p.extraction
    if extraction is None:
        if not qs:
            extraction = "pdf-only"
        elif any(q.solution for q in qs):
            extraction = "full"
        else:
            extraction = "questions"

    record = {
        "id": p.id,
        "board": p.board,
        "class": p.klass,
        "subject_slug": p.subject_slug,
        "subject_name": name,
        "year": p.year,
        "session": p.session,
        "kind": p.kind,
        "lang": p.lang,
        "variant": p.variant,
        "title": p.title,
        "source_page": p.source_page,
        "paper_pdf": p.paper_pdf,
        "solution_pdf": p.solution_pdf,
        "duration_minutes": p.duration_minutes,
        "max_marks": p.max_marks,
        "extraction": extraction,
        "questions": [
            {
                "number": q.number,
                "section": q.section,
                "marks": q.marks,
                "text": clean_text(q.text),
                "solution": clean_text(q.solution) if q.solution else None,
                "has_figure": q.has_figure,
                "page": q.page,
            }
            for q in qs
        ],
        "scraped_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    out = DATA_DIR / p.board / str(p.klass) / p.subject_slug / f"{p.id}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(record, ensure_ascii=False, indent=1))
    return out
