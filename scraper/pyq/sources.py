"""Where official PYQ papers and answer keys come from, per exam.

Every discover_* function returns a list of Item. Only the commission's own
documents are listed: question booklets and answer keys. Coaching-site
questions or explanations are never taken.

Primary sources are the commission websites. When a commission site is
unreachable from this machine, two secondary routes are tried:
  1. the Wayback Machine copy of the commission's own listing page and PDFs
     (byte-identical official files), and
  2. scraper/pyq/secondary.json: a curated list of public pages that host the
     commission's untouched PDF (each entry says why it is official).
"""
from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from urllib.parse import urljoin, urlparse, parse_qs

from bs4 import BeautifulSoup

from .net import Client, FetchError

HERE = Path(__file__).resolve().parent
EXAMS = ("bpsc-tre", "bpsc-cce", "mppsc", "ras", "bihar-stet", "ctet", "cg-tet")
QP, AK = "question_paper", "answer_key"


@dataclass
class Item:
    exam: str
    cycle: str            # "RAS Prelims 2023", "CTET December 2019"
    year: int | None
    paper: str            # "General Studies", "Paper 1", "Paper 2 Set D"
    kind: str             # question_paper | answer_key
    url: str
    source_page: str
    via: str = "official"  # official | wayback | secondary
    note: str = ""
    extra: dict = field(default_factory=dict)

    def key(self) -> str:
        return self.url

    def as_dict(self) -> dict:
        return asdict(self)


def _year(s: str) -> int | None:
    ys = [int(y) for y in re.findall(r"(?<!\d)(20[0-3]\d|19[89]\d)(?!\d)", s)]
    return max(ys) if ys else None


def _soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, "html.parser")


# --------------------------------------------------------------------------- #
# RPSC (RAS Prelims)
# --------------------------------------------------------------------------- #
RPSC = "https://rpsc.rajasthan.gov.in/"
_RAS_PRE = re.compile(
    r"(State\s*(and|&)\s*Sub\.?\s*Services|\bRAS\b|R\.\s*A\.\s*S\.)")   # case-sensitive "RAS"
_RAS_SKIP = re.compile(r"(Main|Mains|Interview|TSP|Blind|Re-?Exam notice)", re.I)
# RAS Pre 2012 had optional subjects; only the compulsory GS paper is in scope.
_RAS_2012_OPTIONAL = re.compile(r"Exam 2012\s*/\s*(?!\s*GK)", re.I)


def _rpsc_rows(html: str, page: str):
    s = _soup(html)
    for r in s.select("div.release-row"):
        t = r.select_one(".release-title")
        m = r.select_one(".release-meta")
        a = r.find("a", href=True)
        if not (t and a):
            continue
        yield t.get_text(" ", strip=True), (m.get_text(" ", strip=True) if m else ""), urljoin(page, a["href"])


def discover_ras(c: Client) -> list[Item]:
    items: list[Item] = []
    for slice_, kind in (("QP", QP), ("AK", AK)):
        page = f"{RPSC}viewcommon?Slice={slice_}"
        html = c.get(page).text
        for title, meta, url in _rpsc_rows(html, page):
            blob = f"{title} | {meta}"
            if not _RAS_PRE.search(blob) or _RAS_SKIP.search(title):
                continue
            if not re.search(r"\bPre|G\.?\s*K\.?.*G\.?\s*S|RAS/RTS", blob, re.I):
                continue
            if "2012" in title and _RAS_2012_OPTIONAL.search(title):
                continue
            year = _year(meta) or _year(title)
            paper = "General Knowledge and General Science"
            if re.search(r"revised", title, re.I):
                paper += " (revised key)"
            elif re.search(r"final", title, re.I):
                paper += " (final key)"
            elif kind == AK:
                paper += " (model key)"
            items.append(Item("ras", f"RAS Prelims {year}", year, paper, kind, url, page,
                              note=title))
    return items


# --------------------------------------------------------------------------- #
# CTET (CBSE)
# --------------------------------------------------------------------------- #
CTET = "https://ctet.nic.in/"


def _drive_id(href: str) -> str | None:
    m = re.search(r"/file/d/([A-Za-z0-9_-]{10,})", href) or re.search(r"[?&]id=([A-Za-z0-9_-]{10,})", href)
    return m.group(1) if m else None


def discover_ctet(c: Client) -> list[Item]:
    items: list[Item] = []
    arch = f"{CTET}archive/"
    s = _soup(c.get(arch).text)
    pages = sorted({a["href"] for a in s.find_all("a", href=True)
                    if re.search(r"ctet\.nic\.in/question-paper-[a-z]+-\d{4}/?$", a["href"])})
    for page in pages:
        cyc = page.rstrip("/").rsplit("question-paper-", 1)[1]          # december-2019
        mon, yr = cyc.rsplit("-", 1)
        cycle = f"CTET {mon.capitalize()} {yr}"
        try:
            ps = _soup(c.get(page).text)
        except FetchError as e:
            items.append(Item("ctet", cycle, int(yr), "listing page", QP, page, arch,
                              note=f"listing failed: {e}"))
            continue
        seen = set()
        for a in ps.find_all("a", href=True):
            href, label = a["href"], a.get_text(" ", strip=True)
            if href in seen or not label or label.lower().startswith(("view", "share")):
                continue
            did = _drive_id(href) if "drive.google.com" in href else None
            if did:
                # paper1_set_H, paper2_14Dec_set_D ...
                if not re.match(r"paper\s*[12]", label, re.I):
                    continue
                seen.add(href)
                url = f"https://drive.google.com/uc?export=download&id={did}"
                items.append(Item("ctet", cycle, int(yr), label.replace("_", " "), QP, url, page,
                                  note="Google Drive link published on ctet.nic.in",
                                  extra={"drive_view": href}))
            elif href.lower().endswith(".pdf") and "/uploads/" in href:
                m = re.search(r"MAIN\s+PAPER\s*([12])", label, re.I)
                if not m:      # regional-language papers are out of scope
                    continue
                seen.add(href)
                items.append(Item("ctet", cycle, int(yr), f"Paper {m.group(1)} (main)", QP, href, page,
                                  note=label))
    keys = f"{CTET}previous-year-final-answer-key/"
    ks = _soup(c.get(keys).text)
    for tr in ks.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        a = tr.find("a", href=re.compile(r"\.pdf$", re.I))
        if not cells or not a:
            continue
        title = cells[0]
        yr = _year(title) or (int(cells[1]) if len(cells) > 1 and cells[1].isdigit() else None)
        mon = re.search(r"CTET\s+([A-Za-z]+)", title)
        mon_s = mon.group(1) if mon else ""
        mon_full = {"dec": "December", "jan": "January", "feb": "Feb", "aug": "August",
                    "july": "July", "jul": "July"}.get(re.sub(r"\d+", "", mon_s.lower()), mon_s.capitalize())
        cycle = f"CTET {mon_full} {yr}"
        p = re.search(r"(?:P|Paper\s*)([12])\b", title)
        paper = f"Paper {p.group(1)}" if p else "Paper 1 and 2"
        if re.search(r"Hindi Medium", title, re.I):
            paper += " Hindi medium"
        elif re.search(r"English Medium", title, re.I):
            paper += " English medium"
        d = re.search(r"(\d{2}(?:Feb|March|Dec|Jan)\d{4})", title)
        if d:
            paper += f" {d.group(1)}"
        items.append(Item("ctet", cycle, yr, paper + " (final key)", AK, a["href"], keys, note=title))
    return items


# --------------------------------------------------------------------------- #
# Commission sites that are often unreachable from outside India.
# Generic: read listing pages (live, else their Wayback copy), keep PDF links
# whose anchor text matches the exam.
# --------------------------------------------------------------------------- #
LISTINGS = {
    "bpsc": {
        "pages": ["https://bpsc.bihar.gov.in/", "https://bpsc.bihar.gov.in/answer-key/",
                  "https://bpsc.bihar.gov.in/model-answer/"],
        "exams": {
            "bpsc-cce": re.compile(r"(\d{2}(st|nd|rd|th)\s*(Combined|Comb|C\.?C\.?E|Integrated)).*(Pre|Prelim)", re.I),
            "bpsc-tre": re.compile(r"(TRE|Teacher Recruitment|School Teacher|विद्यालय अध्यापक|अध्यापक नियुक्ति|Head Teacher)", re.I),
        },
    },
    "mppsc": {
        "pages": ["https://mppsc.mp.gov.in/", "https://mppsc.mp.gov.in/Model-Answer"],
        "exams": {"mppsc": re.compile(r"(State Service.*(Pre|Prelim)|राज्य सेवा प्रारंभिक|राज्य सेवा परीक्षा)", re.I)},
    },
    "vyapam": {
        "pages": ["https://vyapamcg.cgstate.gov.in/", "https://vyapamcg.cgstate.gov.in/model-answer"],
        "exams": {"cg-tet": re.compile(r"(\bTET\b|शिक्षक पात्रता)", re.I)},
    },
    "bseb-stet": {
        "pages": ["https://bsebstet.org/"],
        "exams": {"bihar-stet": re.compile(r"(STET|Secondary Teacher Eligibility).*(answer|key|question|paper)", re.I)},
    },
}

_KEY_WORDS = re.compile(r"(answer\s*key|model\s*answer|उत्तर\s*कुंजी|मॉडल\s*उत्तर|प्रावधिक|key)", re.I)


def _wayback_raw(url: str, ts: str = "2026") -> str:
    return f"https://web.archive.org/web/{ts}id_/{url}"


def _listing_items(c: Client, site: str, page: str, html: str, via: str, base_url: str) -> list[Item]:
    cfg = LISTINGS[site]
    out = []
    s = _soup(html)
    for a in s.find_all("a", href=True):
        href = a["href"]
        label = " ".join(a.get_text(" ", strip=True).split()) or a.get("title", "")
        if not re.search(r"\.pdf($|\?)", href, re.I):
            continue
        absu = urljoin(base_url, href)
        if via == "wayback":
            m = re.search(r"/web/(\d+)[a-z_]*/(https?://.*)$", absu)
            absu = _wayback_raw(m.group(2), m.group(1)) if m else absu
        for exam, rx in cfg["exams"].items():
            if rx.search(label):
                kind = AK if _KEY_WORDS.search(label) else QP
                yr = _year(label)
                out.append(Item(exam, label[:80], yr, label[:120], kind, absu, page, via=via, note=label))
    return out


def discover_listing(c: Client, site: str, log=print) -> tuple[list[Item], list[dict]]:
    items, problems = [], []
    for page in LISTINGS[site]["pages"]:
        try:
            r = c.get(page)
            items += _listing_items(c, site, page, r.text, "official", page)
            continue
        except FetchError as e:
            problems.append({"url": page, "error": str(e), "via": "official"})
            log(f"  {site}: {page} failed ({e.kind}); trying the Wayback copy")
        wb = f"https://web.archive.org/web/2026/{page}"
        try:
            r = c.get(wb)
            items += _listing_items(c, site, page, r.text, "wayback", r.url)
        except FetchError as e:
            problems.append({"url": wb, "error": str(e), "via": "wayback"})
            if e.kind in ("host-down", "transient"):
                # same hosts for the remaining pages: don't wait again
                problems += [{"url": p, "error": f"skipped: {e.kind} earlier", "via": "official"}
                             for p in LISTINGS[site]["pages"][LISTINGS[site]["pages"].index(page) + 1:]]
                break
    return items, problems


def discover_secondary() -> list[Item]:
    f = HERE / "secondary.json"
    if not f.exists():
        return []
    out = []
    for d in json.loads(f.read_text()):
        if d.get("exam") not in EXAMS or not d.get("url"):
            continue
        out.append(Item(d["exam"], d.get("cycle", ""), d.get("year"), d.get("paper", ""),
                        d.get("kind", QP), d["url"], d.get("source_page", ""), via="secondary",
                        note=d.get("why_official", "")))
    return out
