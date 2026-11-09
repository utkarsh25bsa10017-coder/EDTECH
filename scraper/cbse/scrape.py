"""CBSE Sample Question Papers + Marking Schemes from cbseacademic.nic.in.

Covers every session listed on the SQP archive (2015-16 onwards) plus the
current session linked from the home page, for classes 10 and 12. The two
older RAR bundles on the archive page (2014-15) are extracted into
pdfs/cbse/archives/ but get no records: they have no per-paper URL to link.

    python scraper/cbse/scrape.py [--limit N] [--no-archives]
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import PDF_DIR, Fetcher, Paper, disambiguate, download_and_write, resolve_subject  # noqa: E402

HOME = "https://cbseacademic.nic.in/"
ARCHIVE = "https://cbseacademic.nic.in/sqp_archive.html"
PAGE_RE = re.compile(r"SQP_CLASS(XII|X)_(\d{4})[-_](\d{2})", re.I)

# subject_key() forms of names CBSE has printed over the years -> one slug.
ALIASES = {
    "hindi a": "hindi-a",
    "hindi b": "hindi-b",
    "hindi adhaar": "hindi-core",
    "hindi aichhik": "hindi-elective",
    "english communicative": "english-communicative",
    "pol science": "political-science",
    "computer application": "computer-applications",
    "engg graphic": "engineering-graphics",
    "engineering graphics": "engineering-graphics",
    "element book keeping accountancy": "elements-of-book-keeping-and-accountancy",
    "elements book keeping accountancy": "elements-of-book-keeping-and-accountancy",
    "elements business": "elements-of-business",
    "carnatic melodic": "carnatic-music-melodic",
    "carnatic music melodic": "carnatic-music-melodic",
    "carnatic music melodic instrumental": "carnatic-music-melodic",
    "carnatic music melodic instruments": "carnatic-music-melodic",
    "carnatic percussion": "carnatic-music-percussion",
    "carnatic music percussion": "carnatic-music-percussion",
    "carnatic music percussion instrumental": "carnatic-music-percussion",
    "carnatic music percussion instruments": "carnatic-music-percussion",
    "carnatic vocal": "carnatic-music-vocal",
    "carnatic music vocal": "carnatic-music-vocal",
    "carnatic music vocal instrumental": "carnatic-music-vocal",
    "music hindustani instruments melodic": "hindustani-music-melodic",
    "music hindustani percussion instruments": "hindustani-music-percussion",
    "music hindustani vocal": "hindustani-music-vocal",
    "dance bharatnatyam": "bharatanatyam",
    "dance manipuri": "manipuri-dance",
    "dance odissi": "odissi",
    "dance mohiniattam": "mohiniattam",
    "applied arts commercial art": "applied-arts",
    "commercial art": "applied-arts",
    "commercial arts": "applied-arts",
    "fine arts commercial arts": "applied-arts",
    "graphic": "graphics",
    "fine arts graphics": "graphics",
    "painting graphics": "graphics",
    "graphics history indian art": "graphics",
    "graphics design": "graphic-design",
    "fine arts painting": "painting",
    "painting history indian art": "painting",
    "fine arts sculpture": "sculpture",
    "painting sculpture": "sculpture",
    "sculpture history indian art": "sculpture",
    "gujrati": "gujarati",
    "malyalam": "malayalam",
    "russion": "russian",
    "rai language": "rai",
    "tangkhul mil": "tangkhul",
    "telugu ap": "telugu-ap",
    "telugu telangana": "telugu-telangana",
    "telangana telugu": "telugu-telangana",
    "urdu a": "urdu-a",
    "urdu course a": "urdu-a",
    "urdu b": "urdu-b",
    "urdu course b": "urdu-b",
    "heritage craft": "heritage-crafts",
    "library information science": "library-and-information-science",
    "theatre": "theatre-studies",
    "ncc national cadet corps": "ncc",
    "creative writing translation studies": "creative-writing-and-translation-studies",
    "english creative writing translation studies": "creative-writing-and-translation-studies",
    "e publishing e office": "e-publishing-and-e-office",
    "foundation information technology": "foundation-of-information-technology",
    "information communication technology": "information-and-communication-technology",
    "human rights gender studies": "human-rights-and-gender-studies",
    "multimedia web technology": "multimedia-and-web-technology",
}

# Display names for slugs that are not in common.SUBJECTS and whose printed
# name varies between sessions.
EXTRA = {
    "english-communicative": "English Communicative",
    "engineering-graphics": "Engineering Graphics",
    "elements-of-book-keeping-and-accountancy": "Elements of Book Keeping and Accountancy",
    "elements-of-business": "Elements of Business",
    "carnatic-music-melodic": "Carnatic Music (Melodic Instruments)",
    "carnatic-music-percussion": "Carnatic Music (Percussion Instruments)",
    "carnatic-music-vocal": "Carnatic Music (Vocal)",
    "hindustani-music-melodic": "Hindustani Music (Melodic Instruments)",
    "hindustani-music-percussion": "Hindustani Music (Percussion Instruments)",
    "hindustani-music-vocal": "Hindustani Music (Vocal)",
    "bharatanatyam": "Bharatanatyam",
    "manipuri-dance": "Manipuri Dance",
    "odissi": "Odissi",
    "mohiniattam": "Mohiniattam",
    "applied-arts": "Applied Arts (Commercial Art)",
    "graphics": "Graphics",
    "graphic-design": "Graphic Design",
    "painting": "Painting",
    "sculpture": "Sculpture",
    "gujarati": "Gujarati",
    "malayalam": "Malayalam",
    "russian": "Russian",
    "rai": "Rai",
    "tangkhul": "Tangkhul",
    "telugu-ap": "Telugu (Andhra Pradesh)",
    "telugu-telangana": "Telugu (Telangana)",
    "urdu-a": "Urdu Course A",
    "urdu-b": "Urdu Course B",
    "heritage-crafts": "Heritage Crafts",
    "library-and-information-science": "Library and Information Science",
    "theatre-studies": "Theatre Studies",
    "ncc": "NCC (National Cadet Corps)",
    "creative-writing-and-translation-studies": "Creative Writing and Translation Studies",
    "e-publishing-and-e-office": "e-Publishing and e-Office",
    "ktpi": "Knowledge Traditions and Practices of India",
    "foundation-of-information-technology": "Foundation of Information Technology",
    "information-and-communication-technology": "Information and Communication Technology",
    "human-rights-and-gender-studies": "Human Rights and Gender Studies",
    "multimedia-and-web-technology": "Multimedia and Web Technology",
}

DEVANAGARI = re.compile(r"[ऀ-ॿ]")


def session_pages(f: Fetcher, refresh: bool) -> list[str]:
    """Every SQP_CLASS* page linked from the home page and the archive, newest first."""
    pages: dict[str, None] = {}
    for url in (HOME, ARCHIVE):
        soup = BeautifulSoup(f.get_text(url, use_cache=not refresh), "lxml")
        for a in soup.find_all("a", href=True):
            if PAGE_RE.search(a["href"]):
                pages[f.abs_url(url, a["href"])] = None
    return sorted(pages, key=lambda u: PAGE_RE.search(u).group(2), reverse=True)


def clean_subject(name: str) -> tuple[str, list[str], bool]:
    """Strip qualifiers CBSE appends to subject names. Returns (name, variant parts, hindi_medium)."""
    variant: list[str] = []
    hindi = bool(re.search(r"\(\s*hindi\s*\)", name, re.I))
    name = re.sub(r"\s*\(\s*hindi\s*\)", "", name, flags=re.I)
    if re.search(r"visually\s+impaired", name, re.I):
        variant.append("Visually Impaired")
        name = re.sub(r"\s*\((?:for\s+)?visually\s+impaired\)?", "", name, flags=re.I)
    if m := re.search(r"\s*-\s*(new|old)\s*$", name, re.I):
        variant.append(m.group(1).title())
        name = name[: m.start()]
    if m := re.search(r"\s+(cbse|ncert)\s*$", name, re.I):
        variant.append(m.group(1).upper())
        name = name[: m.start()]
    return name.strip(), variant, hindi


def parse_page(f: Fetcher, url: str) -> list[Paper]:
    m = PAGE_RE.search(url)
    klass = 12 if m.group(1).upper() == "XII" else 10
    start = int(m.group(2))
    session, year = f"{start}-{m.group(3)}", start + 1

    soup = BeautifulSoup(f.get_text(url), "lxml")  # past sessions never change
    papers: list[Paper] = []
    term_layout = False  # 2021-22 split the year into Term 1 / Term 2 column pairs
    for tr in soup.find_all("tr"):
        if tr.find("table"):
            continue
        cells = tr.find_all(["td", "th"])
        texts = [" ".join(c.get_text().split()) for c in cells]
        if any(re.fullmatch(r"Term\s*-?\s*(1|I)", t, re.I) for t in texts):
            term_layout = True
        if len(cells) < 2 or not tr.find("a", href=True) or cells[0].find("a"):
            continue

        name, extra_variant, hindi_medium = clean_subject(texts[0])
        slug, subject_name = resolve_subject(name, ALIASES, EXTRA)
        display = (subject_name or {}).get("en") or name

        # Collect links keyed by (term, hindi version, set) so each SQP finds its MS.
        sqps: dict[tuple, tuple[str, bool]] = {}
        mss: dict[tuple, str] = {}
        for col, cell in enumerate(cells[1:], start=1):
            for a in cell.find_all("a", href=True):
                label = " ".join(a.get_text().split())
                href = f.abs_url(url, a["href"])
                if not href.lower().endswith(".pdf"):
                    print(f"  skip non-PDF {href}", flush=True)
                    continue
                term = None
                if term_layout:
                    term = 2 if col >= 3 or re.search(r"term[\s_-]*2", href, re.I) else 1
                hindi = hindi_medium or bool(DEVANAGARI.search(label)) or bool(re.search(r"[_-]hi\.pdf$", href, re.I))
                s = re.search(r"set[\s-]*([0-9a-z])\b", label, re.I)
                key = (term, hindi, s.group(1).upper() if s else None)
                updated = label.lower().startswith("updated")
                if re.match(r"(updated\s+)?ms\b", label, re.I) or "अंकन" in label or "marking" in label.lower():
                    if key not in mss or updated:
                        mss[key] = href
                elif key not in sqps or updated:
                    sqps[key] = (href, updated)

        for key, (href, _updated) in sqps.items():
            term, hindi, set_ = key
            if slug == "manipuri" and "dance" in href.lower():  # 2016-18 pages file the dance paper under the language
                slug, subject_name = resolve_subject("Dance Manipuri", ALIASES, EXTRA)
                display = subject_name["en"]
            parts = ([f"Term {term}"] if term else []) + ([f"Set {set_}"] if set_ else []) + extra_variant
            if hindi and not slug.startswith(("hindi", "sanskrit")):
                parts.append("Hindi Medium")
            variant = ", ".join(parts) or None
            lang = "hi" if hindi or slug.startswith(("hindi", "sanskrit")) else "en"
            papers.append(Paper(
                board="cbse", klass=klass, subject_slug=slug, subject_name=subject_name,
                year=year, session=session, kind="sample", lang=lang, variant=variant,
                title=f"CBSE Sample Question Paper {session}: Class {klass} {display}"
                      + (f" ({variant})" if variant else ""),
                source_page=url, paper_pdf=href, solution_pdf=mss.get(key),
            ))
    return papers


def fetch_archives(f: Fetcher) -> None:
    """Extract the pre-2015 RAR bundles linked from the archive page."""
    soup = BeautifulSoup(f.get_text(ARCHIVE), "lxml")
    for a in soup.find_all("a", href=True):
        url = f.abs_url(ARCHIVE, a["href"])
        if not url.lower().endswith((".rar", ".zip")):
            continue
        try:
            f.get(url)
        except (RuntimeError, ValueError, PermissionError) as e:
            print(f"archive FAIL {url}: {e}", flush=True)
            continue
        name = re.sub(r"[^A-Za-z0-9-]+", "-", Path(a["href"]).stem).strip("-")
        out = PDF_DIR / "cbse" / "archives" / name
        out.mkdir(parents=True, exist_ok=True)
        r = subprocess.run(["7z", "x", "-y", f"-o{out}", str(f.cache_path(url))], capture_output=True, text=True)
        n = sum(1 for p in out.rglob("*") if p.suffix.lower() == ".pdf")
        print(f"archive {'ok' if r.returncode == 0 else 'FAIL'} {url} -> {out} ({n} PDFs)", flush=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, help="only download the first N papers (for testing)")
    ap.add_argument("--no-archives", action="store_true", help="skip the 2014-15 RAR bundles")
    ap.add_argument("--refresh", action="store_true", help="re-fetch the home/archive pages to pick up a new session")
    args = ap.parse_args()

    # cbseacademic.nic.in put this client behind a CAPTCHA at 1 req/s; go slower.
    f = Fetcher("cbse", min_interval=3.0)
    by_url: dict[str, Paper] = {}
    for url in session_pages(f, args.refresh):
        found = parse_page(f, url)
        print(f"{url}: {len(found)} papers", flush=True)
        for p in found:  # a few PDFs are linked from two rows; the first row is the right one
            by_url.setdefault(p.paper_pdf, p)
    papers = list(by_url.values())
    disambiguate(papers, lambda p: Path(unquote(urlparse(p.paper_pdf).path)).stem)
    download_and_write(f, papers[: args.limit])
    if not args.no_archives and not args.limit:
        fetch_archives(f)


if __name__ == "__main__":
    main()
