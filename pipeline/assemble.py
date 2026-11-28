"""Build papers from the question bank, in web/src/data/PAPER_FORMAT.md format.

    .venv/bin/python pipeline/assemble.py [--exam ctet] [--seed 2026] [--mocks 5] [--max-overlap 0.2]
                                          [--mocks-only] [--dry-run]

Per exam (rejected questions are never used):
- free-01      20 mixed questions, kind "free", free: true -> web/src/data/papers/<exam>/free-01.json (public)
- mock-NN      full papers in the exam's pattern length. Mocks are append-only: existing
               mock files are never rewritten or deleted (students have attempts against
               them); new ones continue the numbering until the exam has --mocks of them
               or the next one would share more than --max-overlap of its questions with
               any single other mock of the exam    -> content/papers/<exam>/mock-NN.json
               (delete the mock files by hand to rebuild them from scratch)
- sample-01    one sample paper, kind "sample"           -> content/papers/<exam>/sample-01.json
- probable-01  "most probable" paper: subjects and topics picked by weight from
               output/reports/<exam>-weights.json (analyze.py; PYQ-based when PYQs are
               parsed, else syllabus), favouring high-frequency topics
                                                         -> content/papers/<exam>/probable-01.json

Selection is deterministic: questions are ranked by a hash of (seed, paper, qid),
so reruns on the same bank give the same papers, and new bank questions only
shift a few picks. Each paper question keeps its bank id as "qid".

--mocks-only adds mocks and touches nothing else (no free/sample/probable, no
weights report); its summary goes to output/reports/assemble-mocks.json.
Every paper is checked against PAPER_FORMAT (validate.check_paper) before it is written.
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
import validate  # noqa: E402
from common import (EXAMS, PAPERS, REPORTS, WEB_PAPERS, bi, load_bank, rel, subject_slug,  # noqa: E402
                    write_json_atomic)

FREE_SIZE = 20
MAX_MOCKS = 30
DEFAULT_MOCKS = 5
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


# --------------------------------------------------------------------------- #
# Mocks: append-only, pairwise overlap limit
# --------------------------------------------------------------------------- #
MOCK_RE = re.compile(r"mock-(\d+)\.json$")


def paper_qids(doc: dict) -> list[str]:
    return [q.get("qid") or f"{doc.get('id')}:{q.get('id')}"
            for s in doc.get("sections") or [] for q in s.get("questions") or []]


def existing_mocks(exam: str) -> dict[str, list[str]]:
    """mock id -> bank qids of the mocks already on disk, in numeric order.
    An unreadable mock file raises: better to stop than to build around it."""
    d = PAPERS / exam
    found = []
    for f in d.glob("mock-*.json") if d.is_dir() else []:
        m = MOCK_RE.fullmatch(f.name)
        if m:
            found.append((int(m.group(1)), f))
    out = {}
    for _, f in sorted(found):
        out[f.stem] = paper_qids(json.loads(f.read_text(encoding="utf-8")))
    return out


def other_paper_use(exam: str) -> Counter:
    """How often each qid appears in the exam's non-mock papers on disk (sample,
    probable, free): new mocks avoid those questions when it costs nothing."""
    c = Counter()
    for d in (PAPERS / exam, WEB_PAPERS / exam):
        for f in sorted(d.glob("*.json")) if d.is_dir() else []:
            if f.name.startswith((".", "mock-")):
                continue
            try:
                c.update(paper_qids(json.loads(f.read_text(encoding="utf-8"))))
            except (OSError, ValueError):
                continue
    return c


def pick_mock(picker: Picker, pid: str, counts: dict[str, int], earlier: dict[str, set[str]],
              cap: int, other_use: Counter, diff_first: bool = False) -> tuple[dict[str, list[dict]], int]:
    """One mock with `counts` questions per subject, keeping its overlap with each
    earlier mock as low and as even as possible. Greedy over all subjects at once;
    each step takes the unit with the lowest
      (pushes some overlap past cap, times already used in mocks, largest overlap
       with any one earlier mock after taking it, outside the difficulty mix,
       use in sample/probable/free, status, ai_checked, hash).
    Fresh questions therefore go first; repeats are spread over the earlier mocks.
    diff_first moves "outside the difficulty mix" to the front (after the cap), as
    Picker.pick does: a closer DIFF_MIX at the price of more repeats.
    Like Picker.pick, variants stay apart and passage groups whole unless the
    subject cannot be filled otherwise. Does not touch picker.use."""
    mock_use = Counter(i for ids in earlier.values() for i in ids)
    overlap = dict.fromkeys(earlier, 0)
    need = dict(counts)
    chosen: dict[str, list[dict]] = {s: [] for s in counts}
    taken: set[str] = set()      # unit keys
    families: set = set()
    diff_have = {s: Counter() for s in counts}
    target = {s: {d: c * f for d, f in DIFF_MIX.items()} for s, c in counts.items()}
    static = {}
    for s in counts:
        for u in picker.by_subject.get(s, []):
            status = min(STATUS_RANK.get(q.get("status"), 2) for q in u.qs)
            checked = 0 if all(q.get("ai_checked") or q.get("status") == "reviewed" for q in u.qs) else 1
            static[u.key] = (sum(other_use[i] for i in u.ids), status, checked, h(picker.seed, picker.exam, pid, u.key))
    relaxed = 0
    for level in (1, 2, 3):  # 2: a variant may sit next to its original; 3: part of a passage group
        while any(n > 0 for n in need.values()):
            best, best_key = None, None
            for s, n in need.items():
                if n <= 0:
                    continue
                for u in picker.by_subject.get(s, []):
                    if u.key in taken:
                        continue
                    if level < 2 and u.family & families:
                        continue
                    qs = u.qs
                    if u.size > n:
                        if level < 3:
                            continue
                        qs = u.qs[:n]
                    ids = [q["id"] for q in qs]
                    new_max = max((overlap[m] + sum(i in e for i in ids) for m, e in earlier.items()), default=0)
                    over = 0
                    if u.size == 1:
                        d = qs[0].get("difficulty", "medium")
                        over = int(diff_have[s][d] + 1 > target[s].get(d, 0) + 0.999)
                    used = sum(mock_use[i] for i in ids)
                    key = ((new_max > cap, over, used, new_max) if diff_first else
                           (new_max > cap, used, new_max, over)) + static[u.key]
                    if best_key is None or key < best_key:
                        best, best_key = (s, u, qs), key
            if best is None:
                break
            s, u, qs = best
            taken.add(u.key)
            families |= u.family
            chosen[s].extend(qs)
            need[s] -= len(qs)
            if level > 1:
                relaxed += len(qs)
            for q in qs:
                diff_have[s][q.get("difficulty", "medium")] += 1
                for m, e in earlier.items():
                    overlap[m] += q["id"] in e
    return chosen, relaxed


def build_mocks(exam: str, picker: Picker, counts: dict[str, int], pat: dict, target: int, max_overlap: float,
                notes: list[str], order: list[str], names: dict, common_assembly: dict,
                status_by_id: dict[str, str]) -> tuple[list[tuple[Path, dict]], dict]:
    """Keep the exam's existing mocks, add new ones up to `target` mocks in total.
    Records every mock's qids in picker.use / picker.mock_used (for sample/probable/free).
    Returns (new files to write, info for the summary)."""
    size = pat["questions"]
    cap = int(math.floor(max_overlap * size + 1e-9))
    have = existing_mocks(exam)
    earlier = {p: set(ids) for p, ids in have.items()}
    for ids in have.values():
        picker.use.update(ids)
        picker.mock_used |= set(ids)
    other_use = other_paper_use(exam)
    outputs: list[tuple[Path, dict]] = []
    stop = None
    nxt = max((int(p.split("-")[1]) for p in have), default=0) + 1
    while len(earlier) < min(target, MAX_MOCKS):
        if sum(counts.values()) < size:
            stop = f"bank can't fill one full mock ({sum(counts.values())} of {size} questions)"
            break
        pid = f"mock-{nxt:02d}"
        # keep the difficulty mix when the overlap limit allows it, else minimise repeats
        for diff_first in (True, False):
            chosen, relaxed = pick_mock(picker, pid, counts, earlier, cap, other_use, diff_first)
            ids = [q["id"] for qs in chosen.values() for q in qs]
            ov = {m: len(set(ids) & e) for m, e in earlier.items()}
            if len(ids) == size and max(ov.values(), default=0) <= cap:
                break
        if len(ids) < size:
            stop = f"{pid} came out short ({len(ids)}/{size})"
            break
        worst = max(ov, key=lambda m: (ov[m], m)) if ov else None
        if worst and ov[worst] > cap:
            stop = (f"{pid} would share {ov[worst]}/{size} questions ({ov[worst] / size:.0%}) with {worst}; "
                    f"limit {cap} ({max_overlap:.0%}): the bank cannot support more mocks this different")
            break
        seen = sum(i in picker.mock_used for i in ids)
        secs = sections_from(chosen, order, names)
        doc = paper_doc(exam, pid, "mock", {"en": f"Full Mock Test {nxt}", "hi": f"फुल मॉक टेस्ट {nxt}"}, secs, pat,
                        pat["duration_minutes"],
                        common_assembly | {"subject_counts": counts, "reused_from_earlier_mocks": seen,
                                           "overlap_rule": f"pairwise: at most {cap} of {size} questions "
                                                           f"({max_overlap:.0%}) shared with any one other mock",
                                           "overlap_with_mocks": ov,
                                           "selection": "difficulty mix first" if diff_first else "fewest repeats first",
                                           "relaxed_rule_questions": relaxed,
                                           "notes": notes})
        doc = finalize_status(doc, status_by_id)
        problems = validate.check_paper(doc, exam, pid, free_dir=False)
        if problems:
            stop = f"{pid} failed the paper format check, not written: {'; '.join(problems[:3])}"
            break
        outputs.append((PAPERS / exam / f"{pid}.json", doc))
        picker.use.update(ids)
        picker.mock_used |= set(ids)
        earlier[pid] = set(ids)
        nxt += 1
    # overlap table over all mocks, old and new
    table, seen_before = [], set()
    for p, e in earlier.items():
        table.append({"id": p, "new": p not in have, "questions": len(e),
                      "overlap": {o: len(e & f) for o, f in earlier.items() if o != p},
                      "seen_in_earlier_mocks": len(e & seen_before)})
        seen_before |= e
    if stop is None and len(earlier) >= target:
        stop = f"target of {target} mocks reached"
    return outputs, {"kept": list(have), "added": [d["id"] for _, d in outputs], "cap": cap,
                     "stop": stop, "table": table}


def assemble_exam(exam: str, seed: int, max_overlap: float, write: bool = True, mocks: int = DEFAULT_MOCKS,
                  mocks_only: bool = False) -> dict:
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

    # ---- mocks (append-only) ----------------------------------------------
    counts, notes = subject_counts(exam, pat["questions"], bank_counts)
    summary["notes"] += notes
    full = sum(counts.values())
    new_mocks, minfo = build_mocks(exam, picker, counts, pat, mocks, max_overlap, notes, order, names,
                                   common_assembly, status_by_id)
    outputs += new_mocks
    summary["mocks"] = len(minfo["table"])
    summary["mock_info"] = minfo
    summary["notes"].append(f"mocks: kept {len(minfo['kept'])}, added {len(minfo['added'])}; stopped: {minfo['stop']}")
    if mocks_only:
        for path, d in outputs:
            if write:
                write_json_atomic(path, d)
            summary["papers"].append({"id": d["id"], "kind": d["kind"], "questions": d["questions"],
                                      "path": rel(path), "status": d["status"]})
        return summary

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
    paid_set = set(paid) | picker.mock_used
    summary["free_overlap_with_paid"] = len(set(free_ids) & paid_set)
    for path, d in outputs:
        if d["kind"] != "mock":  # new mocks were checked in build_mocks
            problems = validate.check_paper(d, exam, d["id"], free_dir=d["kind"] == "free")
            if problems:
                summary["notes"].append(f"{d['id']} failed the paper format check, not written: {'; '.join(problems[:3])}")
                continue
        if write:
            write_json_atomic(path, d)
        summary["papers"].append({"id": d["id"], "kind": d["kind"], "questions": d["questions"],
                                  "path": rel(path), "status": d["status"]})
    return summary


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exam", nargs="*", choices=EXAMS, default=list(EXAMS))
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--mocks", type=int, default=DEFAULT_MOCKS,
                    help=f"mocks wanted per exam, counting the ones already on disk (default {DEFAULT_MOCKS}); "
                         "fewer are built when the overlap limit stops it")
    ap.add_argument("--max-overlap", type=float, default=0.2,
                    help="max share of a new mock's questions shared with any one other mock of the exam")
    ap.add_argument("--mocks-only", action="store_true",
                    help="only add mocks; leave free, sample and probable papers and the weights report alone")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args(argv)
    all_s = []
    for ex in a.exam:
        s = assemble_exam(ex, a.seed, a.max_overlap, write=not a.dry_run, mocks=a.mocks, mocks_only=a.mocks_only)
        all_s.append(s)
        ps = ", ".join(f"{p['id']}({p['questions']})" for p in s["papers"])
        print(f"assemble {ex:11s} usable={s['bank_usable']:4d} mocks={s.get('mocks', 0)}  "
              f"{'wrote' if not a.dry_run else 'would write'}: {ps or '-'}")
        for n in s["notes"]:
            print(f"    note: {n}")
        for e in s.get("mock_info", {}).get("table", []):
            ov = ", ".join(f"{o} {n}" for o, n in e["overlap"].items()) or "-"
            print(f"    {e['id']}{' (new)' if e['new'] else ''}: {e['questions']} questions; shared with {ov}; "
                  f"seen in earlier mocks {e['seen_in_earlier_mocks']}")
    if not a.dry_run:
        name = "assemble-mocks.json" if a.mocks_only else "assemble.json"
        write_json_atomic(REPORTS / name, {"generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                                           "seed": a.seed, "mocks": a.mocks, "max_overlap": a.max_overlap,
                                           "exams": all_s})
        print(f"summary: {rel(REPORTS / name)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
