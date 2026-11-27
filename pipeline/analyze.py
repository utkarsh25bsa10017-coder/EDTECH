"""Topic weightage from parsed PYQs, and how well the bank covers it.

    .venv/bin/python pipeline/analyze.py [--exam ras]

Writes output/reports/<exam>-weights.json. When no PYQs are parsed for an exam,
the subject weights fall back to the split in content/bank/<exam>/_pattern.md
(or the defaults in patterns.py) and topic weights to the bank's own topic
mix; the report says so in "source" and "note".
"""
from __future__ import annotations

import argparse
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import patterns  # noqa: E402
from common import EXAMS, REPORTS, bi, load_bank, load_pyq, rel, subject_slug, write_json_atomic  # noqa: E402

MIN_PYQ = 30  # fewer parsed PYQs than this -> not enough to trust; fall back


def pyq_year(q: dict) -> int | None:
    if isinstance(q.get("year"), int):
        return q["year"]
    m = re.findall(r"(?<!\d)(20[0-3]\d|19[89]\d)(?!\d)", str(q.get("pyq_ref") or ""))
    return int(m[-1]) if m else None


def slope(points: list[tuple[int, float]]) -> float:
    if len(points) < 2:
        return 0.0
    n = len(points)
    mx = sum(x for x, _ in points) / n
    my = sum(y for _, y in points) / n
    den = sum((x - mx) ** 2 for x, _ in points)
    return sum((x - mx) * (y - my) for x, y in points) / den if den else 0.0


def trend_label(s: float) -> str:
    if s > 0.01:
        return "rising"
    if s < -0.01:
        return "falling"
    return "stable"


def shares(qs: list[dict], key) -> dict[str, float]:
    c = Counter(key(q) for q in qs)
    tot = sum(c.values()) or 1
    return {k: v / tot for k, v in c.most_common()}


def topic_key(q: dict) -> str:
    return f"{subject_slug(q)}::{bi(q.get('topic'), 'en') or 'unclassified'}"


def analyze(exam: str) -> dict:
    bank = [L.q for L in load_bank(exam)[0] if L.q.get("status") != "rejected"]
    pyq = [L.q for L in load_pyq(exam)[0]]
    pat = patterns.get(exam)
    excl = set(pat.get("exclude", []))
    if pat.get("strict"):  # e.g. Bihar STET: one subject paper; other subjects are separate papers
        excl |= {subject_slug(q) for q in bank} - set(pat["split"])
    # only PYQs whose OCR and structure parsed cleanly count; garbled items classify badly
    classified = [q for q in pyq if subject_slug(q) not in ("unclassified", "unknown")
                  and q.get("ocr_confidence") in (None, "high", "medium")]
    report: dict = {
        "exam": exam,
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "pyq_parsed": len(pyq),
        "pyq_classified": len(classified),
        "bank_questions": len(bank),
    }
    subject_names = {}
    for q in bank + pyq:
        subject_names.setdefault(subject_slug(q), q.get("subject"))

    if len(classified) >= MIN_PYQ:
        by_year = defaultdict(list)
        for q in classified:
            by_year[pyq_year(q) or 0].append(q)
        years = sorted(y for y in by_year if y)
        subj_year = {y: shares(by_year[y], subject_slug) for y in years}
        topic_year = {y: shares(by_year[y], topic_key) for y in years}
        # average of yearly shares, so a year with more parsed questions doesn't dominate
        subjects = sorted({s for d in subj_year.values() for s in d})
        topics = sorted({t for d in topic_year.values() for t in d})
        ny = len(years) or 1
        sw = {s: sum(subj_year[y].get(s, 0) for y in years) / ny for s in subjects} if years \
            else shares(classified, subject_slug)
        tw = {t: sum(topic_year[y].get(t, 0) for y in years) / ny for t in topics} if years \
            else shares(classified, topic_key)
        report.update(
            source="pyq",
            note=f"Weights from {len(classified)} cleanly parsed and classified PYQs (of {len(pyq)}) across years {years}. "
                 "Subjects/topics of PYQs are assigned automatically (nearest bank question) unless set by hand, "
                 "so treat small differences as noise.",
            years=years,
            subject_by_year={str(y): {k: round(v, 4) for k, v in d.items()} for y, d in subj_year.items()},
            subject_trend={s: {"slope_per_year": round(slope([(y, subj_year[y].get(s, 0)) for y in years]), 4),
                               "trend": trend_label(slope([(y, subj_year[y].get(s, 0)) for y in years]))}
                           for s in subjects},
            topic_by_year={str(y): {k: round(v, 4) for k, v in d.items()} for y, d in topic_year.items()},
            topic_trend={t: trend_label(slope([(y, topic_year[y].get(t, 0)) for y in years])) for t in topics},
        )
    else:
        sw, src = patterns.syllabus_weights(exam)
        # topic weights inside a subject: the bank's own topic mix (a proxy for the syllabus)
        tw = {}
        bank_by_subj = defaultdict(list)
        for q in bank:
            bank_by_subj[subject_slug(q)].append(q)
        for s, w in sw.items():
            ts = shares(bank_by_subj.get(s, []), topic_key)
            for t, v in ts.items():
                tw[t] = w * v
        why = ("no PYQs parsed yet" if not pyq else
               f"only {len(classified)} of {len(pyq)} parsed PYQs are clean enough to classify (< {MIN_PYQ}; "
               "the rest are low-confidence OCR)")
        report.update(
            source="syllabus",
            note=f"Fallback: {why}. Subject weights from the {src}; topic weights inside each subject "
                 "follow the bank's own topic mix, which is only a proxy for exam frequency.",
            years=[],
        )
    sw = {k: v for k, v in sw.items() if k not in excl}
    tot = sum(sw.values()) or 1
    sw = {k: v / tot for k, v in sorted(sw.items(), key=lambda kv: -kv[1])}
    ttot = sum(v for t, v in tw.items() if t.split("::")[0] not in excl) or 1
    tw = {t: v / ttot for t, v in sorted(tw.items(), key=lambda kv: -kv[1]) if t.split("::")[0] not in excl}

    # bank coverage of the weights
    bank_in = [q for q in bank if subject_slug(q) not in excl]
    bsw = shares(bank_in, subject_slug)
    btw = shares(bank_in, topic_key)
    bcount = Counter(subject_slug(q) for q in bank_in)
    tcount = Counter(topic_key(q) for q in bank_in)
    per_subject = []
    for s in sorted(set(sw) | set(bsw), key=lambda k: -sw.get(k, 0)):
        need = round(sw.get(s, 0) * pat["questions"])
        per_subject.append({
            "subject": s, "name": subject_names.get(s),
            "weight": round(sw.get(s, 0), 4), "bank_share": round(bsw.get(s, 0), 4),
            "bank_questions": bcount.get(s, 0), "per_paper": need,
            "papers_supported": (bcount.get(s, 0) // need) if need else None,
            "status": ("missing in bank" if sw.get(s, 0) > 0 and not bcount.get(s) else
                       "under-covered" if bsw.get(s, 0) < 0.6 * sw.get(s, 0) else
                       "over-covered" if sw.get(s, 0) and bsw.get(s, 0) > 1.6 * sw.get(s, 0) else
                       "not in weights" if not sw.get(s) else "ok"),
        })
    gaps = []
    if report["source"] == "pyq":
        for t, w in list(tw.items())[:60]:
            have = tcount.get(t, 0)
            if have < max(3, round(w * 400)):
                gaps.append({"topic": t, "weight": round(w, 4), "bank_questions": have})
    l1 = sum(abs(sw.get(s, 0) - bsw.get(s, 0)) for s in set(sw) | set(bsw))
    report.update(
        pattern={k: pat[k] for k in ("questions", "duration_minutes", "marks_per_question",
                                     "negative_marking", "options")} | {"source": pat["source"]},
        subject_weights={k: round(v, 4) for k, v in sw.items()},
        topic_weights={k: round(v, 5) for k, v in tw.items()},
        coverage={
            "score": round(1 - l1 / 2, 3),
            "score_meaning": "1 = bank subject mix matches the weights exactly; 0 = no overlap",
            "per_subject": per_subject,
            "topic_gaps": gaps,
            "bank_topic_shares": {k: round(v, 4) for k, v in btw.items()},
        },
    )
    return report


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exam", nargs="*", choices=EXAMS, default=list(EXAMS))
    a = ap.parse_args(argv)
    REPORTS.mkdir(parents=True, exist_ok=True)
    for ex in a.exam:
        r = analyze(ex)
        out = REPORTS / f"{ex}-weights.json"
        write_json_atomic(out, r)
        top = ", ".join(f"{k} {v:.0%}" for k, v in list(r["subject_weights"].items())[:5])
        weak = [p["subject"] for p in r["coverage"]["per_subject"] if p["status"] in ("missing in bank", "under-covered")]
        print(f"analyze {ex:11s} source={r['source']:8s} pyq={r['pyq_parsed']:4d} bank={r['bank_questions']:4d} "
              f"coverage={r['coverage']['score']:.2f} [{top}]" + (f" weak: {', '.join(weak)}" if weak else ""))
        print(f"  -> {rel(out)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
