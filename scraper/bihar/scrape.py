"""Bihar Board (BSEB) model papers from biharboardonline.com.

The board only hosts the current year's model papers: Matric (class 10) and
Intermediate (class 12).

    python scraper/bihar/scrape.py [--limit N]
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import SUBJECTS, Fetcher, Paper, disambiguate, download_and_write, resolve_subject  # noqa: E402

PAGES = {
    "https://biharboardonline.com/modelpapermatric.html": 10,
    "https://biharboardonline.com/modelpaperinter.html": 12,
}
LINK_RE = re.compile(r"(?:Matric|Inter)ModelPaper[/\\](\d{4})/", re.I)
# "105/124/205/223 - ENGLISH", "101- MIL-HINDI", "112/212/312/508-L.L-BHOJPURI"
LABEL_RE = re.compile(r"^\s*([\d/]+)\s*-\s*(?:(MIL|SIL|OPT|L\.L)\s*-\s*)?(.+)$", re.I)
PREFIX_VARIANT = {"MIL": "MIL", "SIL": "SIL", "OPT": "Optional"}
# Intermediate subject codes start with the stream's digit.
STREAMS = {"1": "Science", "2": "Commerce", "3": "Arts"}

ALIASES = {
    "adv math": "advanced-mathematics",
    "bangla": "bengali",
    "philosohphy": "philosophy",
    "yoga physical education": "physical-education",
    "multimedia web technology": "multimedia-and-web-technology",
}
EXTRA = {
    "advanced-mathematics": "Advanced Mathematics",
    "bengali": "Bengali",
    "multimedia-and-web-technology": "Multimedia and Web Technology",
    "philosophy": "Philosophy",
}
HINDI_SCRIPT = {"hindi", "sanskrit", "maithili", "magahi", "bhojpuri", "prakrit", "pali"}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, help="only download the first N papers (for testing)")
    args = ap.parse_args()

    f = Fetcher("bihar")
    papers: list[Paper] = []
    codes: dict[str, str] = {}
    for page, klass in PAGES.items():
        soup = BeautifulSoup(f.get_text(page, use_cache=False), "lxml")
        for a in soup.find_all("a", href=LINK_RE):
            label = " ".join(a.get_text().split())
            m = LABEL_RE.match(label)
            if not m:
                print(f"  skip unrecognised label {label!r}", flush=True)
                continue
            code, prefix, name = m.group(1).split("/")[0], (m.group(2) or "").upper(), m.group(3)
            if not prefix and re.search(r"OPT", a["href"], re.I):
                prefix = "OPT"
            name = name.split("(")[0].strip().title()  # "SOCIAL SCIENCE (PROJECT WORK) ..." -> "Social Science"
            slug, subject_name = resolve_subject(name, ALIASES, EXTRA)
            display = subject_name["en"] if subject_name else SUBJECTS[slug][0]
            year = int(LINK_RE.search(a["href"]).group(1))
            variant = PREFIX_VARIANT.get(prefix)
            url = f.abs_url(page, a["href"])
            codes[url] = code
            papers.append(Paper(
                board="bihar", klass=klass, subject_slug=slug, subject_name=subject_name,
                year=year, session=f"{year - 1}-{year % 100:02d}", kind="model",
                lang="en" if slug == "english" else "hi" if slug in HINDI_SCRIPT else "bi",
                variant=variant,
                title=f"Bihar Board Model Paper {year}: Class {klass} {display}" + (f" ({variant})" if variant else ""),
                source_page=page, paper_pdf=url,
            ))
    disambiguate(papers, lambda p: STREAMS.get(codes[p.paper_pdf][0], f"Code {codes[p.paper_pdf]}")
                 if p.klass == 12 else f"Code {codes[p.paper_pdf]}")
    download_and_write(f, papers[: args.limit])


if __name__ == "__main__":
    main()
