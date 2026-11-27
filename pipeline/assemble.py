"""Build papers from the question bank, in web/src/data/PAPER_FORMAT.md format.

    .venv/bin/python pipeline/assemble.py [--exam ctet] [--seed 2026] [--max-overlap 0.2]

Per exam (rejected questions are never used):
- free-01      20 mixed questions, kind "free", free: true -> web/src/data/papers/<exam>/free-01.json (public)
- mock-NN      full papers in the exam's pattern length, as many as the bank supports
               with at most --max-overlap of each mock's questions reused from earlier
               mocks                                     -> content/papers/<exam>/mock-NN.json
- sample-01    one sample paper, kind "sample"           -> content/papers/<exam>/sample-01.json
- probable-01  "most probable" paper: subjects and topics picked by weight from
               output/reports/<exam>-weights.json (analyze.py; PYQ-based when PYQs are
               parsed, else syllabus), favouring high-frequency topics
                                                         -> content/papers/<exam>/probable-01.json

Selection is deterministic: questions are ranked by a hash of (seed, paper, qid),
so reruns on the same bank give the same papers, and new bank questions only
shift a few picks. Each paper question keeps its bank id as "qid".
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import analyze  # noqa: E402
import patterns  # noqa: E402
from common import (EXAMS, PAPERS, REPORTS, WEB_PAPERS, bi, load_bank, rel, subject_slug,  # noqa: E402
                    write_json_atomic)

FREE_SIZE = 20
MAX_MOCKS = 30
DIFF_MIX = {"easy": 0.3, "medium": 0.5, "hard": 0.2}
STATUS_RANK = {"reviewed": 0, "draft": 1}


def h(*parts) -> int:
    return int(hashlib.sha256("|".join(map(str, parts)).encode()).hexdigest()[:12], 16)


def largest_remainder(weights: dict[str, float], total: int, caps: dict[str, int] | None = None) -> dict[str, int]:
    """Integer counts proportional to weights summing to total, respecting caps
    (redistributing what a capped subject can't take)."""
    caps = caps or {}
    alloc = {k: 0 for k in weights}
    remaining, active = total, {k: w for k, w in weights.items() if w > 0}
    while remaining > 0 and active:
        tot = sum(active.values())
        raw = {k: remaining * w / tot for k, w in active.items()}
        add = {k: int(math.floor(v)) for k, v in raw.items()}
        left = remaining - sum(add.values())
        for k in sorted(raw, key=lambda k: (-(raw[k] - add[k]), k))[:left]:
            add[k] += 1
        progressed = False
        for k, a in add.items():
            room = caps.get(k, 10 ** 9) - alloc[k]
            take = min(a, room)
            alloc[k] += take
            remaining -= take
            progressed |= take > 0
            if alloc[k] >= caps.get(k, 10 ** 9):
                active.pop(k, None)
        if not progressed:
            break
    return alloc


# --------------------------------------------------------------------------- #
# Units: a question, or a group of questions sharing one passage/poem
# --------------------------------------------------------------------------- #
def passage_key(q: dict) -> str | None:
    for lang in ("hi", "en"):
        t = bi(q.get("text"), lang)
        if len(t) > 300:
            paras = [p for p in re.split(r"\n", t) if p.strip()]
            body = "\n".join(paras[:-1]) if len(paras) > 2 else t[: int(len(t) * 0.6)]
            if len(body) > 200:
                return hashlib.sha1(body[:400].encode()).hexdigest()[:12]
    return None


MERGE: dict[str, str] = {}  # set per exam from patterns: subject slug -> section it is assembled into


def asm_subject(q: dict) -> str:
    s = subject_slug(q)
    return MERGE.get(s, s)


class Unit:
    def __init__(self, qs: list[dict]):
        self.qs = sorted(qs, key=lambda q: q["id"])
        self.ids = [q["id"] for q in self.qs]
        self.subject = asm_subject(self.qs[0])
        self.size = len(self.qs)
        self.links = set()
        for q in self.qs:
            if q.get("variant_of"):
                self.links.add(q["variant_of"])
        self.family = set()  # filled later: ids related through variant_of

    @property
    def key(self) -> str:
        return self.ids[0]


def build_units(bank: list[dict]) -> list[Unit]:
    groups = defaultdict(list)
    singles = []
    for q in bank:
        k = passage_key(q)
        if k:
            groups[(asm_subject(q), k)].append(q)
        else:
            singles.append(q)
    units = [Unit([q]) for q in singles]
    for (_, _k), qs in groups.items():
        units.append(Unit(qs))
    # variant families: union-find over variant_of
    parent = {}

    def find(x):
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for q in bank:
        if q.get("variant_of"):
            parent[find(q["id"])] = find(q["variant_of"])
    for u in units:
        u.family = {find(i) for i in u.ids}
    return sorted(units, key=lambda u: u.key)


# --------------------------------------------------------------------------- #
# Selection
# --------------------------------------------------------------------------- #
class Picker:
    def __init__(self, exam: str, units: list[Unit], seed: int):
        self.exam, self.units, self.seed = exam, units, seed
        self.by_subject = defaultdict(list)
        for u in units:
            self.by_subject[u.subject].append(u)
        self.use = Counter()       # qid -> times used in papers built so far
        self.mock_used = set()     # qids used in mocks
        self.relaxed = Counter()   # paper -> questions added with relaxed rules (variants together, split passages)

    def rank(self, paper: str, u: Unit, extra: float = 0.0) -> tuple:
        q0 = u.qs[0]
        status = min(STATUS_RANK.get(q.get("status"), 2) for q in u.qs)
        checked = 0 if all(q.get("ai_checked") or q.get("status") == "reviewed" for q in u.qs) else 1
        return (sum(self.use[i] for i in u.ids), status, checked, -extra, h(self.seed, self.exam, paper, u.key))

    def pick(self, paper: str, counts: dict[str, int], prefer=None, avoid_ids=frozenset(),
             filt=None) -> dict[str, list[dict]]:
        """counts: subject -> questions. prefer(unit) -> score (higher first, after usage).
        Difficulty is balanced towards DIFF_MIX inside each subject."""
        chosen: dict[str, list[dict]] = {}
        families = set()
        for subj, need in counts.items():
            pool = [u for u in self.by_subject.get(subj, []) if not (set(u.ids) & avoid_ids)
                    and (filt is None or filt(u))]
            pool.sort(key=lambda u: self.rank(paper, u, prefer(u) if prefer else 0.0))
            got: list[dict] = []
            diff_have = Counter()
            target = {d: need * f for d, f in DIFF_MIX.items()}
            # pass 1 respects the difficulty mix; pass 2 fills whatever is left; only if the
            # subject is still short, pass 3 allows a variant next to its original and
            # pass 4 takes part of a passage group.
            for level in (1, 2, 3, 4):
                for u in pool:
                    if len(got) >= need:
                        break
                    if any(q in got for q in u.qs):
                        continue
                    if level < 3 and u.family & families:
                        continue
                    qs = u.qs
                    if u.size > need - len(got):
                        if level < 4:
                            continue
                        qs = u.qs[: need - len(got)]
                    if level == 1:
                        d = u.qs[0].get("difficulty", "medium")
                        if diff_have[d] + u.size > target.get(d, 0) + 0.999 and u.size == 1:
                            continue
                    if level >= 3:
                        self.relaxed[paper] += len(qs)
                    got.extend(qs)
                    families |= u.family
                    for q in qs:
                        diff_have[q.get("difficulty", "medium")] += 1
            chosen[subj] = got
        for qs in chosen.values():
            for q in qs:
                self.use[q["id"]] += 1
        return chosen


def subject_counts(exam: str, total: int, bank_counts: Counter, weights: dict[str, float] | None = None):
    """Counts per subject for one paper of `total` questions and notes on what was adjusted."""
    pat = patterns.get(exam)
    excl = set(pat.get("exclude", []))
    notes = []
    if weights is None:
        weights = dict(pat["split"])
        present = {s for s in bank_counts if s not in excl}
        if pat.get("strict"):
            present &= set(weights)
        missing = [s for s in weights if s not in present]
        if missing:
            notes.append(f"subjects of the pattern missing in the bank (share redistributed): {', '.join(missing)}")
        extra = [s for s in present if s not in weights]
        btot = sum(bank_counts[s] for s in present) or 1
        for s in extra:
            weights[s] = pat["questions"] * bank_counts[s] / btot
        if extra:
            notes.append(f"bank subjects not in the default split, weighted by bank share: {', '.join(sorted(extra))}")
        weights = {s: w for s, w in weights.items() if s in present}
    else:
        weights = {s: w for s, w in weights.items() if s not in excl and bank_counts.get(s)}
    counts = largest_remainder(weights, total, caps={s: bank_counts[s] for s in weights})
    return {s: c for s, c in counts.items() if c > 0}, notes


def to_paper_question(sec_id: str, n: int, q: dict) -> dict:
    out = {
        "id": f"{sec_id}{n}",
        "qid": q["id"],
        "topic": q.get("topic"),
        "difficulty": q.get("difficulty"),
        "type": q.get("type"),
        "text": q.get("text"),
        "options": q.get("options"),
        "answer": q.get("answer"),
        "explanation": q.get("explanation"),
    }
    if q.get("pyq_ref"):
        out["pyq_ref"] = q["pyq_ref"]
    if q.get("time_sensitive"):
        out["time_sensitive"] = True
        out["facts_as_of"] = q.get("facts_as_of")
    return out


def sections_from(chosen: dict[str, list[dict]], order: list[str], names: dict[str, dict]) -> list[dict]:
    secs = []
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    for subj in [s for s in order if chosen.get(s)] + sorted(s for s in chosen if s not in order and chosen[s]):
        sid = letters[len(secs)]
        qs = chosen[subj]
        # keep passage groups together, otherwise easy -> hard
        qs = sorted(qs, key=lambda q: (passage_key(q) or "", {"easy": 0, "medium": 1, "hard": 2}.get(q.get("difficulty"), 1), q["id"]))
        secs.append({"id": sid, "name": names.get(subj) or {"en": subj, "hi": subj},
                     "subject": subj,
                     "questions": [to_paper_question(sid, i + 1, q) for i, q in enumerate(qs)]})
    return secs


def paper_doc(exam: str, pid: str, kind: str, title: dict, sections: list[dict], pat: dict,
              duration: int, assembly: dict) -> dict:
    qs = [q for s in sections for q in s["questions"]]
    return {
        "id": pid,
        "exam": exam,
        "title": title,
        "kind": kind,
        "free": kind == "free",
        "status": "draft",  # becomes "reviewed" only when every question is expert-reviewed
        "duration_minutes": duration,
        "marks_per_question": pat["marks_per_question"],
        "negative_marking": pat["negative_marking"],
        "options": max((len(q["options"]) for q in qs), default=pat["options"]),
        "questions": len(qs),
        "sections": sections,
        "assembly": assembly,
    }


def finalize_status(doc: dict, status_by_id: dict[str, str]) -> dict:
    ids = [q["qid"] for s in doc["sections"] for q in s["questions"]]
    if ids and all(status_by_id.get(i) == "reviewed" for i in ids):
        doc["status"] = "reviewed"
    return doc


def assemble_exam(exam: str, seed: int, max_overlap: float, write: bool = True) -> dict:
    loaded, _ = load_bank(exam)
    bank = [L.q for L in loaded if L.q.get("status") != "rejected" and isinstance(L.q.get("id"), str)
            and isinstance(L.q.get("options"), list) and isinstance(L.q.get("answer"), int)]
    seen, uniq = set(), []
    for q in sorted(bank, key=lambda q: q["id"]):
        if q["id"] not in seen:
            seen.add(q["id"])
            uniq.append(q)
    bank = uniq
    pat = patterns.get(exam)
    MERGE.clear()
    MERGE.update(pat.get("merge", {}))
    excl = set(pat.get("exclude", []))
    if pat.get("strict"):
        excl |= {subject_slug(q) for q in bank} - set(pat["split"])
    status_by_id = {q["id"]: q.get("status") for q in bank}
    names = {}
    for q in bank:
        if subject_slug(q) not in MERGE:
            names.setdefault(subject_slug(q), q.get("subject"))
    order = list(dict.fromkeys(list(pat["split"]) + sorted(names)))
    units = build_units(bank)
    picker = Picker(exam, units, seed)
    bank_counts = Counter(asm_subject(q) for q in bank if subject_slug(q) not in excl)
    usable = sum(c for s, c in bank_counts.items() if s not in excl)
    summary = {"exam": exam, "bank_usable": usable, "papers": [], "notes": []}
    if not bank:
        summary["notes"].append("bank is empty")
        return summary
    per_q = pat["duration_minutes"] / pat["questions"]
    common_assembly = {"seed": seed, "bank_size": len(bank),
                       "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                       "pattern_source": pat["source"], "pattern_notes": pat.get("notes")}
    outputs: list[tuple[Path, dict]] = []

    # ---- mocks ------------------------------------------------------------
    counts, notes = subject_counts(exam, pat["questions"], bank_counts)
    summary["notes"] += notes
    full = sum(counts.values())
    k = 0
    while k < MAX_MOCKS:
        if full < pat["questions"]:
            summary["notes"].append(f"bank can't fill one full mock ({usable} usable questions, "
                                    f"{pat['questions']} needed); no mocks built")
            break
        pid = f"mock-{k + 1:02d}"
        trial = Picker(exam, units, seed)
        trial.use = Counter(picker.use)
        chosen = trial.pick(pid, counts)
        ids = [q["id"] for qs in chosen.values() for q in qs]
        reused = sum(i in picker.mock_used for i in ids)
        if len(ids) < pat["questions"] or (k > 0 and reused > max_overlap * len(ids)):
            if k == 0:
                summary["notes"].append(f"first mock came out short ({len(ids)}/{pat['questions']})")
            break
        picker.use = trial.use
        picker.mock_used |= set(ids)
        k += 1
        secs = sections_from(chosen, order, names)
        doc = paper_doc(exam, pid, "mock", {"en": f"Full Mock Test {k}", "hi": f"फुल मॉक टेस्ट {k}"}, secs, pat,
                        pat["duration_minutes"],
                        common_assembly | {"subject_counts": counts, "reused_from_earlier_mocks": reused,
                                           "relaxed_rule_questions": trial.relaxed[pid],
                                           "notes": notes})
        outputs.append((PAPERS / exam / f"{pid}.json", finalize_status(doc, status_by_id)))
    summary["mocks"] = k

    # ---- sample -----------------------------------------------------------
    if full >= pat["questions"] * 0.5:
        chosen = picker.pick("sample-01", counts)
        secs = sections_from(chosen, order, names)
        n = sum(len(s["questions"]) for s in secs)
        doc = paper_doc(exam, "sample-01", "sample", {"en": "Sample Paper", "hi": "नमूना प्रश्न-पत्र"}, secs, pat,
                        round(per_q * n) if n < pat["questions"] else pat["duration_minutes"],
                        common_assembly | {"subject_counts": counts, "notes": notes +
                                           ([f"short paper: {n}/{pat['questions']}"] if n < pat["questions"] else [])})
        outputs.append((PAPERS / exam / "sample-01.json", finalize_status(doc, status_by_id)))

    # ---- probable ---------------------------------------------------------
    wrep = analyze.analyze(exam)
    if write:
        write_json_atomic(REPORTS / f"{exam}-weights.json", wrep)
    sw = wrep["subject_weights"]
    tw = wrep["topic_weights"]
    pcounts, pnotes = subject_counts(exam, pat["questions"], bank_counts, weights=sw)
    if sum(pcounts.values()) < pat["questions"]:
        pnotes.append(f"bank could not fill all {pat['questions']} questions by weight")

    def topic_pref(u: Unit) -> float:
        return max(tw.get(f"{subject_slug(q)}::{bi(q.get('topic'), 'en')}", 0.0) for q in u.qs)

    # per subject, take topics in proportion to weight (high-frequency first)
    chosen: dict[str, list[dict]] = {}
    for subj, need in pcounts.items():
        tweights = {t.split("::", 1)[1]: w for t, w in tw.items() if t.split("::")[0] == subj}
        avail = Counter(bi(q.get("topic"), "en") for u in picker.by_subject[subj] for q in u.qs)
        tweights = {t: w for t, w in tweights.items() if avail.get(t)}
        if tweights:
            tcounts = largest_remainder(tweights, need, caps=dict(avail))
            got = []
            for t, c in sorted(tcounts.items(), key=lambda kv: -tweights[kv[0]]):
                if c <= 0:
                    continue
                sel = picker.pick(f"probable-01:{t}", {subj: c}, prefer=topic_pref,
                                  avoid_ids=frozenset(q["id"] for q in got),
                                  filt=lambda u, t=t: any(bi(q.get("topic"), "en") == t for q in u.qs))
                got += sel.get(subj, [])
            if len(got) < need:
                sel = picker.pick("probable-01:fill", {subj: need - len(got)}, prefer=topic_pref,
                                  avoid_ids=frozenset(q["id"] for q in got))
                got += sel.get(subj, [])
            chosen[subj] = got[:need] if len(got) > need else got
        else:
            chosen.update(picker.pick("probable-01", {subj: need}, prefer=topic_pref))
    secs = sections_from(chosen, order, names)
    n = sum(len(s["questions"]) for s in secs)
    doc = paper_doc(exam, "probable-01", "probable", {"en": "Most Probable Paper", "hi": "सर्वाधिक संभावित प्रश्न-पत्र"},
                    secs, pat, pat["duration_minutes"] if n >= pat["questions"] else round(per_q * n),
                    common_assembly | {
                        "weights": {
                            "source": wrep["source"],
                            "how_derived": wrep["note"],
                            "pyq_parsed": wrep["pyq_parsed"],
                            "years": wrep.get("years", []),
                            "subject_weights": sw,
                            "top_topics": dict(list(tw.items())[:25]),
                            "report": rel(REPORTS / f"{exam}-weights.json"),
                        },
                        "subject_counts": pcounts, "notes": pnotes})
    outputs.append((PAPERS / exam / "probable-01.json", finalize_status(doc, status_by_id)))

    # ---- free set (public) ------------------------------------------------
    # Prefer short, stand-alone, non-time-sensitive items, and questions no paid paper uses.
    fcounts, _ = subject_counts(exam, FREE_SIZE, bank_counts)
    free_pick = picker.pick("free-01", fcounts,
                            filt=lambda u: u.size == 1 and not u.qs[0].get("time_sensitive")
                            and u.qs[0].get("difficulty") in ("easy", "medium"))
    if sum(len(v) for v in free_pick.values()) < FREE_SIZE:
        short = FREE_SIZE - sum(len(v) for v in free_pick.values())
        more = picker.pick("free-01:fill", {s: c for s, c in fcounts.items()},
                           avoid_ids=frozenset(q["id"] for v in free_pick.values() for q in v),
                           filt=lambda u: u.size == 1)
        for s, qs in more.items():
            for q in qs:
                if short <= 0:
                    break
                free_pick.setdefault(s, []).append(q)
                short -= 1
    secs = sections_from(free_pick, order, names)
    n = sum(len(s["questions"]) for s in secs)
    doc = paper_doc(exam, "free-01", "free", {"en": "Free Practice Set", "hi": "निःशुल्क अभ्यास सेट"}, secs, pat,
                    max(10, round(per_q * n)),
                    common_assembly | {"subject_counts": {s: len(v) for s, v in free_pick.items() if v}})
    outputs.append((WEB_PAPERS / exam / "free-01.json", finalize_status(doc, status_by_id)))

    paid = [q["qid"] for p, d in outputs if d["kind"] != "free" for s in d["sections"] for q in s["questions"]]
    free_ids = [q["qid"] for s in doc["sections"] for q in s["questions"]]
    summary["free_overlap_with_paid"] = len(set(free_ids) & set(paid))
    for path, d in outputs:
        if write:
            write_json_atomic(path, d)
        summary["papers"].append({"id": d["id"], "kind": d["kind"], "questions": d["questions"],
                                  "path": rel(path), "status": d["status"]})
    # remove stale mocks from an earlier, bigger run
    if write:
        for old in sorted((PAPERS / exam).glob("mock-*.json")):
            m = re.match(r"mock-(\d+)\.json$", old.name)
            if m and int(m.group(1)) > k:
                old.unlink()
    return summary


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exam", nargs="*", choices=EXAMS, default=list(EXAMS))
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--max-overlap", type=float, default=0.2,
                    help="max share of a mock's questions already used in earlier mocks")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args(argv)
    all_s = []
    for ex in a.exam:
        s = assemble_exam(ex, a.seed, a.max_overlap, write=not a.dry_run)
        all_s.append(s)
        ps = ", ".join(f"{p['id']}({p['questions']})" for p in s["papers"])
        print(f"assemble {ex:11s} usable={s['bank_usable']:4d} mocks={s.get('mocks', 0)}  {ps}")
        for n in s["notes"]:
            print(f"    note: {n}")
    if not a.dry_run:
        write_json_atomic(REPORTS / "assemble.json", {"generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                                                       "seed": a.seed, "exams": all_s})
        print(f"summary: {rel(REPORTS / 'assemble.json')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
