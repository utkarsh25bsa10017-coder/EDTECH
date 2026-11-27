"""Exam patterns used by analyze.py and assemble.py.

Each exam's numbers come from content/bank/<exam>/_pattern.md when that file
states them (question count, duration, negative marking, options, subject
split); otherwise from the defaults below, which follow the latest official
notifications as far as we know them. Every value records where it came from.
"""
from __future__ import annotations

import re
from fractions import Fraction

from common import BANK

# Defaults. split: subject slug -> questions in one full paper. Slugs that the
# bank does not have are dropped and their share redistributed (and reported);
# bank subjects not listed get their bank share. exclude: never in a mock.
DEFAULTS: dict[str, dict] = {
    "bpsc-tre": dict(
        name={"en": "BPSC TRE", "hi": "बीपीएससी टीआरई"},
        questions=250, duration_minutes=270, marks_per_question=1, negative_marking=0, options=4,
        split={"english": 30, "hindi": 70,
               "maths": 30, "cdp": 25, "bihar": 20, "sci": 18, "history": 15, "geo": 12, "polity": 12,
               "ca": 10, "eco": 8},
        exclude=[],
        notes="Modelled on TRE 3.0 (classes 1-5): Language paper (qualifying) Part I English 30 + Part II Hindi 70, "
              "then General Studies 150 (GS, mental ability/maths, child development and pedagogy). "
              "Assumed 2 h + 2.5 h, 1 mark each, no negative marking. Not confirmed for TRE 4.0.",
    ),
    "bpsc-cce": dict(
        name={"en": "BPSC CCE Prelims", "hi": "बीपीएससी सीसीई प्रारंभिक"},
        questions=150, duration_minutes=120, marks_per_question=1, negative_marking=Fraction(1, 3), options=5,
        split={"hist": 26, "geo": 19, "polity": 17, "eco": 15, "sci": 19, "bihar": 22, "ca": 11, "mental": 21},
        exclude=[],
        notes="General Studies, 150 questions, 2 hours, 5 options (A-E), 1/3 negative marking (68th onwards).",
    ),
    "mppsc": dict(
        name={"en": "MPPSC State Service Prelims", "hi": "एमपीपीएससी राज्य सेवा प्रारंभिक"},
        questions=100, duration_minutes=120, marks_per_question=2, negative_marking=0, options=4,
        split={"hist": 12, "geo": 12, "polity": 12, "eco": 10, "sci": 12, "env": 5, "ca": 10, "mp": 17,
               "ict": 5, "tribal": 5},
        exclude=["csat"],  # Paper II (CSAT) is a separate, qualifying paper
        notes="General Studies Paper I: 100 questions x 2 marks, 2 hours; no negative marking assumed. "
              "Paper II (CSAT) is qualifying and not assembled here.",
    ),
    "ras": dict(
        name={"en": "RPSC RAS Prelims", "hi": "आरपीएससी आरएएस प्रारंभिक"},
        questions=150, duration_minutes=180, marks_per_question=round(200 / 150, 4),
        negative_marking=Fraction(1, 3), options=4,
        split={"rj-hist": 25, "rj-geo": 17, "rj-polity": 17, "hist": 12, "geo": 10, "polity": 12, "eco": 12,
               "sci": 15, "mental": 15, "ca": 15},
        exclude=[],
        notes="General Knowledge and General Science: 150 questions, 200 marks, 3 hours, 1/3 negative marking. "
              "RPSC prints a fifth bubble 'E' (question not attempted); it is not an answer option.",
    ),
    "bihar-stet": dict(
        name={"en": "Bihar STET", "hi": "बिहार एसटीईटी"},
        questions=150, duration_minutes=150, marks_per_question=1, negative_marking=0, options=4,
        split={"hindi": 100, "pedagogy": 50},
        exclude=[],
        strict=True,  # a candidate takes one subject; other subject slugs are separate papers
        notes="Paper I (secondary): subject 100 + teaching aptitude and pedagogy 50; 2.5 hours; no negative marking. "
              "Hindi is used as the subject paper here.",
    ),
    "ctet": dict(
        name={"en": "CTET Paper 1", "hi": "सीटीईटी पेपर 1"},
        questions=150, duration_minutes=150, marks_per_question=1, negative_marking=0, options=4,
        split={"cdp": 30, "hindi": 30, "english": 30, "maths": 30, "evs": 30},
        exclude=["sci", "sst"],
        notes="Paper 1 (classes I-V). Science and Social Studies items belong to Paper 2 and are left out of mocks.",
    ),
    "cg-tet": dict(
        name={"en": "CG TET Paper 1", "hi": "सीजी टीईटी पेपर 1"},
        questions=150, duration_minutes=150, marks_per_question=1, negative_marking=0, options=4,
        split={"cdp": 30, "hindi": 30, "english": 30, "maths": 30, "evs": 30},
        exclude=["sci", "sst"],
        merge={"cg": "evs"},  # Chhattisgarh GK items are spread across the EVS section (see _pattern.md)
        notes="Paper 1 (primary): CDP, Hindi, English, Mathematics and EVS, 30 each; no negative marking.",
    ),
}


def _num(s: str) -> float:
    return float(s)


def parse_pattern_md(exam: str) -> dict:
    """Pull what we can from content/bank/<exam>/_pattern.md."""
    f = BANK / exam / "_pattern.md"
    if not f.exists():
        return {}
    t = f.read_text(encoding="utf-8")
    out: dict = {"_file": f"content/bank/{exam}/_pattern.md"}
    for m in re.finditer(r"(\d{2,3})\s+(?:[\w-]+\s+){0,3}?(?:questions|MCQs)\b", t, re.I):
        line = t[t.rfind("\n", 0, m.start()) + 1: t.find("\n", m.end())]
        if re.search(r"\bbank\b|original|generated|items", line, re.I):
            continue  # "Bank: 400 original MCQs" describes the bank, not the paper
        out["questions"] = int(m.group(1))
        break
    m = re.search(r"(\d+(?:\.\d+)?)\s*hours?\b", t, re.I)
    if m:
        out["duration_minutes"] = int(round(_num(m.group(1)) * 60))
    else:
        m = re.search(r"(\d{2,3})\s*minutes", t, re.I)
        if m:
            out["duration_minutes"] = int(m.group(1))
    if re.search(r"\bno negative marking\b", t, re.I):
        out["negative_marking"] = 0
    else:
        m = re.search(r"negative marking[^.\n]*?(\d)\s*/\s*(\d)", t, re.I) or \
            re.search(r"(\d)\s*/\s*(\d)\s*(?:of a\s*)?marks?\s*(?:per|for each)\s*wrong", t, re.I)
        if m:
            out["negative_marking"] = Fraction(int(m.group(1)), int(m.group(2)))
    m = re.search(r"\b([45])\s*options\b", t, re.I) or re.search(r"\b(five|four)[- ]option", t, re.I)
    if m:
        v = m.group(1).lower()
        out["options"] = {"five": 5, "four": 4}.get(v, int(v) if v.isdigit() else 4)
    # subject split: a markdown table "| `slug` | name | count |" ...
    split = {}
    for slug, cnt in re.findall(r"^\|\s*`([a-z0-9-]+)`\s*\|[^|\n]*\|\s*(\d+)\s*\|", t, re.M):
        split[slug] = int(cnt)
    # ... or a line like "The bank split (400) follows the brief: hist 70, geo 50, ..."
    if not split:
        for line in t.splitlines():
            if re.search(r"split|weights?|composition", line, re.I):
                pairs = re.findall(r"\b([a-z][a-z0-9-]*)\s+(\d{1,3})\b(?=\s*[,.;)]|\s*$)", line)
                if len(pairs) >= 3:
                    split = {k: int(v) for k, v in pairs}
                    break
    if split:
        out["bank_split"] = split
    return out


def get(exam: str) -> dict:
    """Merged pattern with provenance."""
    d = dict(DEFAULTS[exam])
    src = {k: "defaults (pipeline/patterns.py)" for k in
           ("questions", "duration_minutes", "negative_marking", "options", "split")}
    md = parse_pattern_md(exam)
    for k in ("questions", "duration_minutes", "negative_marking", "options"):
        if k in md:
            d[k] = md[k]
            src[k] = md["_file"]
    if md.get("bank_split"):
        d["pattern_md_split"] = md["bank_split"]
    d["source"] = src
    d["negative_marking"] = float(round(Fraction(d["negative_marking"]), 4)) if d["negative_marking"] else 0
    return d


def syllabus_weights(exam: str) -> tuple[dict[str, float], str]:
    """Subject weights (sum 1) when no PYQs are parsed: the split stated in
    _pattern.md, else the defaults above."""
    p = get(exam)
    split = p.get("pattern_md_split")
    src = f"subject split in content/bank/{exam}/_pattern.md"
    if not split:
        split, src = p["split"], "default subject split in pipeline/patterns.py (no split found in _pattern.md)"
    split = {k: v for k, v in split.items() if k not in p.get("exclude", [])}
    tot = sum(split.values()) or 1
    return {k: v / tot for k, v in split.items()}, src
