"""UP Board (UPMSP) model papers and question banks from upmsp.edu.in.

The board only hosts the current session: model papers for classes 10 and 12
and question banks for classes 9-12. The pages do not say which session they
are for, so it is read from the first page of each PDF.

    python scraper/up/scrape.py [--limit N]
"""
from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import SUBJECTS, Fetcher, Paper, disambiguate, download_and_write, pdf_pages, resolve_subject  # noqa: E402

PAGES = {
    "https://upmsp.edu.in/Board_ModelPaper.aspx": None,
    "https://upmsp.edu.in/Board_QuestionBank.aspx": "Question Bank",
}
LINK_RE = re.compile(r"/(ModelPaper|QuestionBank)/class0?(\d+)/", re.I)
# "सत्र-2026-27"; legacy Kruti Dev PDFs extract it as "l=&2026&27".
SESSION_RE = re.compile(r"(20\d\d)\s*[&\-–—/]\s*(\d\d)\b")

ALIASES = {
    "math": "mathematics",
    "socialscience": "social-science",
    "elemantry hindi": "elementary-hindi",
    "lekhashastra": "accountancy",
    "arbi": "arabic",
    "farsi": "persian",
    "sangeet gaayan": "sangeet-gayan",
    "sainyavigyan": "sainya-vigyan",
}
EXTRA = {
    "arabic": "Arabic",
    "persian": "Persian",
    "elementary-hindi": "Elementary Hindi",
    "general-hindi": "General Hindi",
    "computer": "Computer",
    "sainya-vigyan": "Military Science (Sainya Vigyan)",
    "tarkshastra": "Logic (Tarkshastra)",
    "sangeet-gayan": "Music Vocal (Sangeet Gayan)",
    "sangeet-vadan": "Music Instrumental (Sangeet Vadan)",
    "chittrakala-alekhan": "Drawing (Chitrakala Alekhan)",
    "chittrakala-pravidhik": "Technical Drawing (Chitrakala Pravidhik)",
    "kashth-shilp": "Woodcraft (Kashth Shilp)",
    "granth-shilp": "Bookcraft (Granth Shilp)",
    "silai-shilp": "Tailoring (Silai Shilp)",
    "ranjan-kala": "Dyeing (Ranjan Kala)",
}


def subject_from_label(label: str) -> str:
    """'902 Elemantry Hindi_Class9th_QuestionBank' / '923 Class-09th Sanskrit' -> 'Elemantry Hindi' / 'Sanskrit'."""
    label = re.sub(r"^\s*\d{3}\s*-?\s*", "", label)
    label = re.sub(r"_?Class[-\s]?\d+(th)?(_QuestionBank)?", " ", label, flags=re.I)
    return " ".join(re.sub(r"[-_]", " ", label).split())


def detect_session(raw: bytes) -> tuple[int, str] | None:
    try:
        text = "\n".join(pdf_pages(raw)[:2])
    except Exception:  # damaged PDF: let download_and_write report it
        return None
    if m := SESSION_RE.search(text):
        start = int(m.group(1))
        if int(m.group(2)) == (start + 1) % 100:
            return start + 1, f"{start}-{m.group(2)}"
    return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, help="only download the first N papers (for testing)")
    args = ap.parse_args()

    f = Fetcher("up")
    # (page, url, class, variant, (year, session) read from the PDF, row label)
    found: list[tuple[str, str, int, str | None, tuple[int, str] | None, str]] = []
    for page, variant in PAGES.items():
        soup = BeautifulSoup(f.get_text(page, use_cache=False), "lxml")
        for tr in soup.find_all("tr"):
            a = tr.find("a", href=LINK_RE)
            if not a or tr.find("table"):
                continue
            url = f.abs_url(page, a["href"])
            label = next((t for t in (" ".join(td.get_text().split()) for td in tr.find_all("td")) if re.match(r"\d{3}", t)),
                         Path(a["href"]).stem)
            try:
                session = detect_session(f.get(url))
            except (RuntimeError, ValueError, PermissionError):
                session = None
            found.append((page, url, int(LINK_RE.search(url).group(2)), variant, session, label))

    # Question banks rarely print the session; they are published alongside the model papers.
    common_session = Counter(item[4] for item in found if item[4]).most_common(1)
    if not common_session:
        sys.exit("could not read the session from any UP PDF")
    fallback = common_session[0][0]

    papers: list[Paper] = []
    for page, url, klass, variant, session, label in found:
        year, sess = session or fallback
        slug, subject_name = resolve_subject(subject_from_label(label), ALIASES, EXTRA)
        display = subject_name["en"] if subject_name else SUBJECTS[slug][0]
        kind_name = "Question Bank" if variant else "Model Paper"
        papers.append(Paper(
            board="up", klass=klass, subject_slug=slug, subject_name=subject_name,
            year=year, session=sess, kind="model", lang="en" if slug == "english" else "hi",
            variant=variant, title=f"UP Board {kind_name} {sess}: Class {klass} {display}",
            source_page=page, paper_pdf=url,
        ))
    disambiguate(papers, lambda p: Path(p.paper_pdf).stem)
    download_and_write(f, papers[: args.limit])


if __name__ == "__main__":
    main()
