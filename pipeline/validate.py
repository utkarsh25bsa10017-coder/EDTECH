"""Deterministic checks on content/bank/** and content/pyq/**.

    .venv/bin/python pipeline/validate.py [--exam ctet] [--strict]

Writes output/reports/validate.json and output/reports/validate.md and prints
a summary. --strict exits 1 when any error is found.
"""
from __future__ import annotations

import argparse
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (DIFFICULTIES, EXAMS, REPORTS, SOURCES, STATUSES, TYPES, Loaded, bi,  # noqa: E402
                    has_devanagari, has_latin, load_bank, load_pyq, norm_text, rel,
                    subject_slug, token_set_ratio, tokens, write_json_atomic)

DUP_THRESHOLD = 0.85
ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*-\d{4}$")


def is_english_item(q: dict) -> bool:
    """English-language items (English grammar, comprehension): same English text in
    both fields by convention. Recognised by the subject (or topic) naming English."""
    names = " ".join([bi(q.get("subject"), "en"), bi(q.get("subject"), "hi"), bi(q.get("topic"), "en")]).lower()
    return bool(re.search(r"english|अंग्रेज़ी|अंग्रेजी", names))


def is_hindi_only_item(q: dict) -> bool:
    t = q.get("text") or {}
    return bi(t, "en") == bi(t, "hi") and has_devanagari(bi(t, "en"))


def stem_for_similarity(q: dict) -> str:
    """Passage-based items repeat the passage in every item; compare only the
    question stem (last paragraph) plus the options for those."""
    parts = []
    for lang in ("en", "hi"):
        text = bi(q.get("text"), lang)
        if len(text) > 400:
            paras = [p for p in re.split(r"\n\s*\n|\n", text) if p.strip()]
            if len(paras) > 1:
                text = paras[-1]
        opts = " ".join(bi(o, lang) for o in q.get("options") or [])
        parts.append(f"{text} {opts}")
        if has_latin(text) and lang == "en" and len(tokens(text)) >= 4:
            break
    return " ".join(parts)


def _common_prefix_len(x: str, y: str) -> int:
    n = min(len(x), len(y))
    i = 0
    while i < n and x[i] == y[i]:
        i += 1
    return i


def shared_passage_similarity(a: dict, b: dict, sim: float) -> float:
    """Two items on the same passage/poem share a long prefix; compare what
    follows the shared passage (the actual question) plus the options."""
    best = sim
    for lang in ("en", "hi"):
        ta, tb = bi(a.get("text"), lang), bi(b.get("text"), lang)
        k = _common_prefix_len(ta, tb)
        if k >= 150:
            sa = tokens(ta[k:] + " " + " ".join(bi(o, lang) for o in a.get("options") or []))
            sb = tokens(tb[k:] + " " + " ".join(bi(o, lang) for o in b.get("options") or []))
            return token_set_ratio(sa, sb)
    return best


class Report:
    def __init__(self):
        self.issues: list[dict] = []

    def add(self, level: str, code: str, where: Loaded | None, msg: str, **extra):
        d = {"level": level, "code": code, "msg": msg}
        if where is not None:
            d.update(id=where.q.get("id"), file=rel(where.file), index=where.index)
        d.update(extra)
        self.issues.append(d)


def _bi_ok(v) -> bool:
    return isinstance(v, dict) and isinstance(v.get("en"), str) and isinstance(v.get("hi"), str) \
        and v["en"].strip() != "" and v["hi"].strip() != ""


def check_question(L: Loaded, origin: str, dir_exam: str, rep: Report) -> None:
    q = L.q
    E = lambda code, msg, **kw: rep.add("error", code, L, msg, **kw)  # noqa: E731
    W = lambda code, msg, **kw: rep.add("warning", code, L, msg, **kw)  # noqa: E731

    qid = q.get("id")
    if not isinstance(qid, str) or not ID_RE.match(qid):
        E("id-format", f"id {qid!r} is not <exam>-<subject-slug>-NNNN")
    exam = q.get("exam")
    if exam not in EXAMS:
        E("exam", f"exam {exam!r} is not a known slug")
    elif exam != dir_exam:
        E("exam-dir", f"exam {exam!r} but file is under {dir_exam}/")
    elif isinstance(qid, str) and not qid.startswith(exam + "-"):
        E("id-prefix", f"id {qid!r} does not start with '{exam}-'")

    for f in ("subject", "topic", "text", "explanation"):
        if not _bi_ok(q.get(f)):
            E(f"{f}-missing", f"{f} needs non-empty 'en' and 'hi'")
    if q.get("difficulty") not in DIFFICULTIES:
        E("difficulty", f"difficulty {q.get('difficulty')!r} not in {DIFFICULTIES}")
    if q.get("type") not in TYPES:
        E("type", f"type {q.get('type')!r} not in {TYPES}")
    if q.get("source") not in SOURCES:
        E("source", f"source {q.get('source')!r} not in {SOURCES}")
    if q.get("status") not in STATUSES:
        E("status", f"status {q.get('status')!r} not in {STATUSES}")
    if origin == "pyq" and q.get("source") != "pyq":
        E("pyq-source", "items under content/pyq must have source 'pyq'")
    if q.get("source") == "pyq" and not q.get("pyq_ref"):
        E("pyq-ref", "source 'pyq' needs a pyq_ref like 'BPSC 69th Prelims 2023 Q12'")
    if q.get("source") == "generated" and q.get("pyq_ref"):
        W("pyq-ref-generated", "generated item carries a pyq_ref")
    if not isinstance(q.get("time_sensitive", False), bool):
        E("time-sensitive", "time_sensitive must be true/false")
    if q.get("time_sensitive") and not re.fullmatch(r"\d{4}-\d{2}", str(q.get("facts_as_of") or "")):
        E("facts-as-of", "time_sensitive items need facts_as_of 'YYYY-MM'")
    if q.get("ocr_confidence") == "low":
        W("ocr-low", "OCR confidence is low; check against the PDF")

    opts = q.get("options")
    if not isinstance(opts, list) or not 4 <= len(opts) <= 5:
        E("options-count", f"needs 4 or 5 options, has {len(opts) if isinstance(opts, list) else 'none'}")
        opts = opts if isinstance(opts, list) else []
    for i, o in enumerate(opts):
        if not _bi_ok(o):
            E("option-empty", f"option {i} needs non-empty 'en' and 'hi'")
    ans = q.get("answer")
    if not isinstance(ans, int) or isinstance(ans, bool) or not 0 <= ans < max(len(opts), 1):
        if not (ans is None and origin == "pyq"):
            E("answer", f"answer {ans!r} is not a valid 0-based index for {len(opts)} options")
        else:
            W("answer-missing", "no answer from the official key yet")
    for lang in ("en", "hi"):
        normed = [" ".join(bi(o, lang).lower().split()) for o in opts]
        dup = [k for k, v in Counter(normed).items() if v > 1 and k]
        if dup:
            E("options-duplicate", f"options repeat in '{lang}': {dup[0][:60]!r}")

    english = is_english_item(q)
    if not english:
        for f in ("text", "explanation"):
            v = q.get(f)
            if isinstance(v, dict) and v.get("hi") and not has_devanagari(v["hi"]):
                E("hi-not-devanagari", f"{f}.hi has no Devanagari")
        latin_opts = [i for i, o in enumerate(opts) if isinstance(o, dict) and o.get("hi")
                      and not has_devanagari(o["hi"]) and re.search(r"[A-Za-z]{4,}", o["hi"])
                      and o["hi"] == o.get("en")]
        if latin_opts and len(latin_opts) == len(opts) and not is_hindi_only_item(q):
            W("hi-options-english", "every Hindi option is the English text (untranslated?)")
    else:
        v = q.get("text") or {}
        if isinstance(v, dict) and has_devanagari(bi(v, "en")):
            W("english-item-devanagari", "English-language item has Devanagari in text.en")
    if isinstance(q.get("text"), dict) and not english and not is_hindi_only_item(q):
        t = q["text"]
        if bi(t, "en") and bi(t, "en") == bi(t, "hi"):
            W("text-same", "text.en and text.hi are identical but the item is neither Hindi-only nor English")


def near_duplicates(items: list[tuple[str, Loaded]], rep: Report, ids: dict) -> list[dict]:
    """Pairs with token-set similarity >= DUP_THRESHOLD. items: (origin, Loaded)."""
    sigs = [tokens(stem_for_similarity(L.q)) for _, L in items]
    df = Counter(t for s in sigs for t in s)
    post = defaultdict(list)
    for i, s in enumerate(sigs):
        for t in s:
            if df[t] <= 60:
                post[t].append(i)
    pairs = []
    for i, s in enumerate(sigs):
        if len(s) < 3:
            continue
        cand = Counter()
        for t in s:
            if df[t] <= 60:
                for j in post[t]:
                    if j > i:
                        cand[j] += 1
        for j, shared in cand.items():
            if shared < 0.5 * min(len(s), len(sigs[j])):
                continue
            sim = token_set_ratio(s, sigs[j])
            if sim < DUP_THRESHOLD:
                continue
            a, b = items[i][1].q, items[j][1].q
            sim = shared_passage_similarity(a, b, sim)
            if sim < DUP_THRESHOLD:
                continue
            ida, idb = a.get("id"), b.get("id")
            if ida == idb:
                continue
            linked = (a.get("variant_of") in (idb,) or b.get("variant_of") in (ida,)
                      or (a.get("variant_of") and a.get("variant_of") == b.get("variant_of")))
            same_exam = a.get("exam") == b.get("exam")
            p = {"a": ida, "b": idb, "similarity": round(sim, 3), "linked_by_variant_of": bool(linked),
                 "same_exam": same_exam, "origins": [items[i][0], items[j][0]],
                 "a_text": bi(a.get("text"), "en")[:90], "b_text": bi(b.get("text"), "en")[:90]}
            pairs.append(p)
            if linked:
                continue
            if same_exam and items[i][0] == items[j][0]:
                rep.add("error", "near-duplicate", items[i][1],
                        f"near-duplicate of {idb} (similarity {sim:.2f}); link with variant_of or replace",
                        other=idb, similarity=round(sim, 3))
            elif {items[i][0], items[j][0]} == {"bank", "pyq"}:
                rep.add("warning", "close-to-pyq", items[i][1] if items[i][0] == "bank" else items[j][1],
                        f"generated item is very close to PYQ {idb if items[i][0]=='bank' else ida} "
                        f"(similarity {sim:.2f}); make sure it is not a copy", similarity=round(sim, 3))
            else:
                rep.add("warning", "cross-exam-duplicate", items[i][1],
                        f"same question as {idb} in {b.get('exam')} (similarity {sim:.2f}); "
                        "avoid selling identical items in bundled exams", other=idb, similarity=round(sim, 3))
    return pairs


def coverage(qs: list[dict]) -> dict:
    by = {k: Counter() for k in ("subject", "difficulty", "type", "status", "source")}
    topics = defaultdict(Counter)
    ai = 0
    for q in qs:
        s = f"{subject_slug(q)} | {bi(q.get('subject'), 'en')}"
        by["subject"][s] += 1
        topics[s][bi(q.get("topic"), "en")] += 1
        for k in ("difficulty", "type", "status", "source"):
            by[k][str(q.get(k))] += 1
        ai += bool(q.get("ai_checked"))
    out = {k: dict(sorted(v.items())) for k, v in by.items()}
    out["topics"] = {s: dict(c.most_common()) for s, c in sorted(topics.items())}
    out["total"] = len(qs)
    out["ai_checked"] = ai
    out["time_sensitive"] = sum(bool(q.get("time_sensitive")) for q in qs)
    return out


def run(exam: str | None = None) -> dict:
    rep = Report()
    bank, berr = load_bank(exam)
    pyq, perr = load_pyq(exam)
    for e in berr + perr:
        rep.issues.append({"level": "error", "code": "file", "msg": e["error"], "file": e["file"]})
    items = [("bank", L) for L in bank] + [("pyq", L) for L in pyq]
    ids: dict[str, Loaded] = {}
    for origin, L in items:
        # content/<bank|pyq>/<exam>/...: the exam dir is the first part below bank/pyq
        parts = Path(rel(L.file)).parts
        dir_exam = parts[2] if len(parts) > 2 and parts[0] == "content" else L.file.parent.name
        check_question(L, origin, dir_exam, rep)
        qid = L.q.get("id")
        if isinstance(qid, str):
            if qid in ids:
                rep.add("error", "duplicate-id", L, f"id also used in {rel(ids[qid].file)}")
            else:
                ids[qid] = L
    for origin, L in items:
        v = L.q.get("variant_of")
        if v and v not in ids:
            rep.add("error", "variant-of-missing", L, f"variant_of {v!r} is not an existing id")
        elif v and v == L.q.get("id"):
            rep.add("error", "variant-of-self", L, "variant_of points to itself")
    pairs = near_duplicates(items, rep, ids)

    per_exam = {}
    for ex in EXAMS:
        bq = [L.q for o, L in items if o == "bank" and L.q.get("exam") == ex]
        pq = [L.q for o, L in items if o == "pyq" and L.q.get("exam") == ex]
        if exam and ex != exam:
            continue
        iss = [i for i in rep.issues if str(i.get("id", "")).startswith(ex + "-")
               or f"/{ex}/" in str(i.get("file", ""))]
        is_pyq = lambda i: "content/pyq/" in str(i.get("file", ""))  # noqa: E731
        per_exam[ex] = {
            "bank": coverage(bq), "pyq": coverage(pq),
            "errors": sum(i["level"] == "error" for i in iss),
            "warnings": sum(i["level"] == "warning" for i in iss),
            "bank_errors": sum(i["level"] == "error" and not is_pyq(i) for i in iss),
            "pyq_errors": sum(i["level"] == "error" and is_pyq(i) for i in iss),
            "pyq_low_confidence": sum(q.get("ocr_confidence") == "low" for q in pq),
            "issue_codes": dict(Counter(i["code"] for i in iss).most_common()),
        }
    report = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "scope": exam or "all",
        "counts": {"bank": len(bank), "pyq": len(pyq),
                   "errors": sum(i["level"] == "error" for i in rep.issues),
                   "warnings": sum(i["level"] == "warning" for i in rep.issues)},
        "per_exam": per_exam,
        "near_duplicates": pairs,
        "issues": rep.issues,
    }
    return report


def to_markdown(r: dict) -> str:
    L = [f"# Validation report ({r['scope']})", "", f"Generated {r['generated']}.", "",
         f"Bank questions: **{r['counts']['bank']}**, PYQ questions: **{r['counts']['pyq']}**. "
         f"Errors: **{r['counts']['errors']}**, warnings: **{r['counts']['warnings']}**.", ""]
    L += ["| Exam | Bank | Bank errors | PYQ | PYQ errors | PYQ low-OCR | Warnings | AI-checked | Top issues |",
          "|---|---|---|---|---|---|---|---|---|"]
    for ex, d in r["per_exam"].items():
        top = ", ".join(f"{k} {v}" for k, v in list(d["issue_codes"].items())[:4])
        L.append(f"| {ex} | {d['bank']['total']} | {d['bank_errors']} | {d['pyq']['total']} | {d['pyq_errors']} | "
                 f"{d['pyq_low_confidence']} | {d['warnings']} | {d['bank']['ai_checked']} | {top} |")
    for ex, d in r["per_exam"].items():
        b = d["bank"]
        if not b["total"] and not d["pyq"]["total"]:
            continue
        L += ["", f"## {ex}", ""]
        L.append("Subjects: " + ", ".join(f"{k.split(' | ')[0]} {v}" for k, v in b["subject"].items()))
        L.append("")
        L.append("Difficulty: " + ", ".join(f"{k} {v}" for k, v in b["difficulty"].items()) +
                 ". Type: " + ", ".join(f"{k} {v}" for k, v in b["type"].items()) +
                 ". Status: " + ", ".join(f"{k} {v}" for k, v in b["status"].items()) + ".")
        L.append("")
        for s, tops in b["topics"].items():
            L.append(f"- **{s}** ({sum(tops.values())}): " + "; ".join(f"{t} {n}" for t, n in list(tops.items())[:12])
                     + (" ..." if len(tops) > 12 else ""))
        if d["pyq"]["total"]:
            L.append(f"\nPYQ: {d['pyq']['total']} parsed; subjects " +
                     ", ".join(f"{k.split(' | ')[0]} {v}" for k, v in d["pyq"]["subject"].items()))
    errs = [i for i in r["issues"] if i["level"] == "error"]
    warns = [i for i in r["issues"] if i["level"] == "warning"]
    for title, lst in (("Errors", errs), ("Warnings", warns)):
        if not lst:
            continue
        L += ["", f"## {title} ({len(lst)})", ""]
        for i in lst[:400]:
            L.append(f"- `{i.get('id', '-')}` [{i['code']}] {i['msg']} ({i.get('file', '')})")
        if len(lst) > 400:
            L.append(f"- ... {len(lst) - 400} more in validate.json")
    return "\n".join(L) + "\n"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exam", choices=EXAMS)
    ap.add_argument("--strict", action="store_true")
    a = ap.parse_args(argv)
    r = run(a.exam)
    REPORTS.mkdir(parents=True, exist_ok=True)
    name = f"validate-{a.exam}" if a.exam else "validate"
    write_json_atomic(REPORTS / f"{name}.json", r)
    (REPORTS / f"{name}.md").write_text(to_markdown(r), encoding="utf-8")
    c = r["counts"]
    print(f"validate: {c['bank']} bank + {c['pyq']} pyq questions; {c['errors']} errors, {c['warnings']} warnings")
    for ex, d in r["per_exam"].items():
        if d["bank"]["total"] or d["pyq"]["total"]:
            top = ", ".join(f"{k}={v}" for k, v in list(d["issue_codes"].items())[:5])
            print(f"  {ex:11s} bank {d['bank']['total']:4d} (errors {d['bank_errors']})  "
                  f"pyq {d['pyq']['total']:4d} (errors {d['pyq_errors']}, low-OCR {d['pyq_low_confidence']})  "
                  f"warnings {d['warnings']:4d}  {top}")
    print(f"report: {rel(REPORTS / (name + '.md'))}, {rel(REPORTS / (name + '.json'))}")
    return 1 if (a.strict and c["errors"]) else 0


if __name__ == "__main__":
    sys.exit(main())
