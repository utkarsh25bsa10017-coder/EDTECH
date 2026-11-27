"""The filter agent: Claude reviews each draft question.

    export ANTHROPIC_API_KEY=...            # required
    .venv/bin/python pipeline/review.py --exam ctet --limit 20      # live, one request per question
    .venv/bin/python pipeline/review.py --exam ctet --batch         # Message Batches API (50% cost)
    .venv/bin/python pipeline/review.py --exam ctet --batch --collect BATCH_ID   # pick up results later
    REVIEW_MODEL=claude-opus-5-5 (default) overrides the model.

For each draft question Claude judges: keyed answer correct; exactly one best
answer; unambiguous; factually accurate and current (e.g. BNS not IPC); language
quality in English and Hindi; fit to the exam's pattern. Verdict:
  accept -> stays "draft", gets "ai_checked": true
  fix    -> the corrected question replaces the old one (still "draft"),
            "ai_checked": true, "ai_fixed": true (--no-apply-fixes: record only)
  reject -> "status": "rejected"
Nothing is ever marked "reviewed": that is for a human expert.
Verdicts are appended to output/reviews/<exam>.jsonl; questions already reviewed
in their current form (same content hash) are skipped, so runs can resume.

Retry rule (docs/ARCHITECTURE.md): network errors, 408/409/429/5xx and 529 wait
10 s and retry in a loop; 400/401/403/404 or a missing key stop with a message.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, Field, ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parent))
import patterns  # noqa: E402
from common import (EXAMS, REVIEWS, Loaded, bi, load_bank, load_pyq, rel,  # noqa: E402
                    update_questions_in_file)

DEFAULT_MODEL = "claude-opus-5-5"
RETRY_WAIT = 10
TRANSIENT_STATUS = {408, 409, 429, 529}
PERMANENT_STATUS = {400, 401, 403, 404}
MAX_TOKENS = 16000


# --------------------------------------------------------------------------- #
# Structured verdict
# --------------------------------------------------------------------------- #
class BiText(BaseModel):
    en: str
    hi: str


class FixedQuestion(BaseModel):
    text: BiText
    options: list[BiText] = Field(description="4 options, or 5 when the exam uses a fifth option")
    answer: int = Field(description="0-based index of the correct option")
    explanation: BiText


class Checks(BaseModel):
    key_correct: bool = Field(description="the keyed answer is correct")
    single_best_answer: bool = Field(description="exactly one option is the best answer")
    unambiguous: bool
    factually_accurate_and_current: bool = Field(
        description="facts are right and not outdated as of the review date (e.g. BNS/BNSS/BSA, not IPC/CrPC)")
    english_ok: bool = Field(description="English is correct and natural")
    hindi_ok: bool = Field(description="Hindi is correct, natural and matches the English")
    fits_exam_pattern: bool


class Verdict(BaseModel):
    verdict: Literal["accept", "fix", "reject"]
    checks: Checks
    correct_answer_index: Optional[int] = Field(
        description="0-based index of the option you believe is correct (in the original options), or null if none is")
    reasons: list[str] = Field(description="short reasons, one per problem found; empty when accepted cleanly")
    fixed: Optional[FixedQuestion] = Field(description="the corrected question when verdict is fix, else null")
    confidence: Literal["high", "medium", "low"]


SYSTEM = """You are the quality filter for Prashnottar, a Hindi-first exam-preparation product for Indian \
government exams (BPSC TRE, BPSC CCE Prelims, MPPSC Prelims, RPSC RAS Prelims, Bihar STET, CTET, CG TET). \
Students pay for these questions, and a wrong key or outdated fact destroys trust, so you are strict.

For the multiple-choice question you are given, check:
1. Is the keyed answer correct?
2. Is there exactly one best answer? (No second defensible option; "all/none/more than one of the above" \
options must be consistent with the others.)
3. Is the question unambiguous and self-contained?
4. Is it factually accurate and current as of the review date? Flag outdated law (IPC/CrPC/Evidence Act \
instead of BNS/BNSS/BSA, in force since 1 July 2024), renamed schemes or bodies, superseded figures, and \
facts that depend on a current office holder unless the item is marked time-sensitive with a facts_as_of date.
5. Language: is the English correct and natural, and is the Hindi correct, natural, in standard Devanagari, \
and faithful to the English? Hindi-only items (Hindi grammar) carry the same Hindi in both fields; \
English-language items carry the same English in both. That is intended, not an error.
6. Does it fit the exam's pattern and level (given below with the question)?
7. Is the explanation correct and does it support the keyed answer?

Verdicts:
- accept: everything is right (minor stylistic preferences are not a reason to fix).
- fix: the item is worth keeping but something must change (wrong key, a weak distractor making two \
answers defensible, an error in the explanation, poor Hindi). Return the complete corrected question in \
`fixed` (text, all options, answer index, explanation, both languages), keeping the original language \
conventions and the number of options.
- reject: unsalvageable (wrong premise, hopelessly ambiguous, off-syllabus, copied-looking, or outdated \
in a way a small edit can't fix).

Be concrete in `reasons`. Do not invent facts: if you are not sure a fact is correct, say so in the \
reasons and lower `confidence`; use reject only when you are confident the item is wrong."""


def exam_context(exam: str) -> str:
    p = patterns.get(exam)
    return (f"Exam: {p['name']['en']} ({exam}). Pattern: {p['questions']} questions, {p['duration_minutes']} minutes, "
            f"{p['options']} options, negative marking {p['negative_marking'] or 'none'}. {p.get('notes', '')}")


REVIEW_FIELDS = ("id", "exam", "subject", "topic", "difficulty", "type", "text", "options", "answer",
                 "explanation", "source", "pyq_ref", "variant_of", "time_sensitive", "facts_as_of")


def content_hash(q: dict) -> str:
    core = {k: q.get(k) for k in ("text", "options", "answer", "explanation")}
    return hashlib.sha256(json.dumps(core, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]


def user_message(q: dict, today: str) -> str:
    item = {k: q.get(k) for k in REVIEW_FIELDS}
    letters = "ABCDE"
    keyed = q.get("answer")
    keyed_s = f"{keyed} ({letters[keyed]})" if isinstance(keyed, int) and 0 <= keyed < 5 else str(keyed)
    return (f"Review date: {today}.\n{exam_context(q.get('exam', ''))}\n\n"
            f"Keyed answer index: {keyed_s}\n\nQuestion JSON:\n"
            f"{json.dumps(item, ensure_ascii=False, indent=1)}")


# --------------------------------------------------------------------------- #
# API calls with the retry rule
# --------------------------------------------------------------------------- #
class Fatal(Exception):
    pass


def _status(e) -> int | None:
    return getattr(e, "status_code", None)


def call_with_retry(fn, *, sleep=None, log=print, max_loops: int | None = None):
    """Run fn(); transient errors wait RETRY_WAIT and retry (forever unless
    max_loops), permanent errors raise Fatal."""
    import anthropic
    n = 0
    while True:
        n += 1
        try:
            return fn()
        except (anthropic.APIConnectionError, anthropic.APITimeoutError) as e:
            why = f"network: {type(e).__name__}"
        except anthropic.APIStatusError as e:
            st = _status(e)
            if st in PERMANENT_STATUS:
                hint = {400: "bad request (check the model name and request shape)",
                        401: "invalid ANTHROPIC_API_KEY",
                        403: "the key lacks permission for this model/feature",
                        404: "model or endpoint not found (check REVIEW_MODEL)"}[st]
                raise Fatal(f"HTTP {st}: {hint}: {getattr(e, 'message', e)}") from e
            if st in TRANSIENT_STATUS or (st or 0) >= 500:
                why = f"HTTP {st}"
            else:
                raise Fatal(f"HTTP {st}: {getattr(e, 'message', e)}") from e
        if max_loops and n >= max_loops:
            raise Fatal(f"gave up after {n} transient errors ({why})")
        log(f"    transient error ({why}); retrying in {RETRY_WAIT}s")
        (sleep or time.sleep)(RETRY_WAIT)


def review_one(client, model: str, q: dict, today: str, **kw) -> tuple[Verdict | None, dict]:
    def go():
        return client.messages.parse(
            model=model,
            max_tokens=MAX_TOKENS,
            system=[{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user_message(q, today)}],
            output_format=Verdict,
        )
    resp = call_with_retry(go, **kw)
    meta = {"stop_reason": getattr(resp, "stop_reason", None),
            "request_id": getattr(resp, "_request_id", None)}
    usage = getattr(resp, "usage", None)
    if usage is not None:
        meta["usage"] = {k: getattr(usage, k, None) for k in
                         ("input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens")}
    v = getattr(resp, "parsed_output", None)
    if v is None and meta["stop_reason"] not in ("refusal", "max_tokens"):
        text = next((b.text for b in getattr(resp, "content", []) if getattr(b, "type", "") == "text"), "")
        try:
            v = Verdict.model_validate_json(text)
        except (ValidationError, ValueError):
            v = None
    return v, meta


# --------------------------------------------------------------------------- #
# Applying verdicts
# --------------------------------------------------------------------------- #
def valid_fix(fx: FixedQuestion | None, q: dict) -> str | None:
    if fx is None:
        return "verdict is fix but no corrected question was returned"
    n = len(fx.options)
    if not 4 <= n <= 5:
        return f"corrected question has {n} options"
    if not 0 <= fx.answer < n:
        return f"corrected answer index {fx.answer} out of range"
    for b in [fx.text, fx.explanation, *fx.options]:
        if not b.en.strip() or not b.hi.strip():
            return "corrected question has an empty field"
    if len({o.en.strip().lower() for o in fx.options}) < n:
        return "corrected options are not distinct"
    return None


def updates_for(q: dict, v: Verdict | None, meta: dict, model: str, apply_fixes: bool, now: str) -> tuple[dict, dict]:
    """Returns (question field updates, extra fields for the review record)."""
    base = {"ai_review": {"model": model, "at": now}}
    if v is None:
        base["ai_review"].update(verdict="error", note=f"no usable verdict (stop_reason={meta.get('stop_reason')})")
        return base, {"applied": "none: no verdict"}
    base["ai_review"].update(verdict=v.verdict, confidence=v.confidence, reasons=v.reasons[:6])
    if v.verdict == "accept":
        return base | {"ai_checked": True}, {"applied": "ai_checked"}
    if v.verdict == "reject":
        return base | {"ai_checked": True, "status": "rejected"}, {"applied": "rejected"}
    problem = valid_fix(v.fixed, q)
    if problem:
        base["ai_review"]["note"] = f"fix not applied: {problem}; needs a human"
        return base | {"ai_checked": False}, {"applied": f"none: {problem}"}
    if not apply_fixes:
        base["ai_review"]["note"] = "fix proposed, not applied (--no-apply-fixes); see output/reviews"
        return base | {"ai_checked": False}, {"applied": "none: --no-apply-fixes"}
    fx = v.fixed
    upd = {
        "text": fx.text.model_dump(),
        "options": [o.model_dump() for o in fx.options],
        "answer": fx.answer,
        "explanation": fx.explanation.model_dump(),
        "ai_checked": True,
        "ai_fixed": True,
    }
    if q.get("status") == "reviewed":  # a human-reviewed item changed: back to draft for the expert
        upd["status"] = "draft"
    return base | upd, {"applied": "fixed"}


def load_done(exam: str) -> set[tuple[str, str]]:
    f = REVIEWS / f"{exam}.jsonl"
    done = set()
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue
            if r.get("verdict") in ("accept", "fix", "reject"):
                done.add((r["id"], r.get("content_hash_before")))
                if r.get("content_hash_after"):
                    done.add((r["id"], r["content_hash_after"]))
    return done


def candidates(exam: str, include_pyq: bool, recheck: bool) -> list[Loaded]:
    items = load_bank(exam)[0] + (load_pyq(exam)[0] if include_pyq else [])
    done = set() if recheck else load_done(exam)
    out = []
    for L in items:
        q = L.q
        if q.get("status") != "draft" or not isinstance(q.get("id"), str):
            continue
        if q.get("ai_checked") and not recheck:
            continue
        if (q["id"], content_hash(q)) in done:
            continue
        if q.get("source") == "pyq" and q.get("answer") is None:
            continue  # no official key yet
        out.append(L)
    return out


def record_and_apply(exam: str, L: Loaded, v: Verdict | None, meta: dict, model: str, apply_fixes: bool) -> dict:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    q = L.q
    upd, extra = updates_for(q, v, meta, model, apply_fixes, now)
    rec = {
        "id": q["id"], "exam": exam, "file": rel(L.file), "at": now, "model": model,
        "content_hash_before": content_hash(q),
        "verdict": v.verdict if v else "error",
        **({"checks": v.checks.model_dump(), "correct_answer_index": v.correct_answer_index,
            "reasons": v.reasons, "confidence": v.confidence,
            "fixed": v.fixed.model_dump() if v.fixed else None} if v else {}),
        "original": {k: q.get(k) for k in ("text", "options", "answer", "explanation")},
        **extra, **meta,
    }
    n = update_questions_in_file(L.file, {q["id"]: upd})
    if extra["applied"] == "fixed":
        rec["content_hash_after"] = content_hash({**q, **upd})
    rec["written_to_bank"] = bool(n)
    REVIEWS.mkdir(parents=True, exist_ok=True)
    with open(REVIEWS / f"{exam}.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    return rec


# --------------------------------------------------------------------------- #
# Batch mode
# --------------------------------------------------------------------------- #
def batch_request(q: dict, model: str, today: str) -> dict:
    import anthropic
    return {
        "custom_id": q["id"][:64],
        "params": {
            "model": model,
            "max_tokens": MAX_TOKENS,
            "system": [{"type": "text", "text": SYSTEM, "cache_control": {"type": "ephemeral"}}],
            "messages": [{"role": "user", "content": user_message(q, today)}],
            "output_config": {"format": {"type": "json_schema", "schema": anthropic.transform_schema(Verdict)}},
        },
    }


def run_batch(client, exam: str, items: list[Loaded], model: str, apply_fixes: bool, collect: str | None,
              poll: int = 60, log=print) -> int:
    today = datetime.now().strftime("%Y-%m-%d")
    by_id = {L.q["id"][:64]: L for L in items}
    state_f = REVIEWS / f"{exam}.batch.json"
    if collect:
        batch_id = collect
    else:
        reqs = [batch_request(L.q, model, today) for L in items]
        b = call_with_retry(lambda: client.messages.batches.create(requests=reqs), log=log)
        batch_id = b.id
        REVIEWS.mkdir(parents=True, exist_ok=True)
        state_f.write_text(json.dumps({"batch_id": batch_id, "exam": exam, "model": model,
                                       "ids": list(by_id), "created": today}, indent=1))
        log(f"batch {batch_id} created with {len(reqs)} requests (state in {rel(state_f)})")
    while True:
        b = call_with_retry(lambda: client.messages.batches.retrieve(batch_id), log=log)
        if b.processing_status == "ended":
            break
        log(f"  batch {batch_id}: {b.processing_status}, processing={b.request_counts.processing}")
        time.sleep(poll)
    if collect and state_f.exists():
        st = json.loads(state_f.read_text())
        by_id = {L.q["id"][:64]: L for L in load_bank(exam)[0] + load_pyq(exam)[0] if L.q.get("id", "")[:64] in st["ids"]}
    n = 0
    for res in call_with_retry(lambda: list(client.messages.batches.results(batch_id)), log=log):
        L = by_id.get(res.custom_id)
        if L is None:
            continue
        v, meta = None, {"batch_id": batch_id, "result": res.result.type}
        if res.result.type == "succeeded":
            msg = res.result.message
            meta["stop_reason"] = msg.stop_reason
            text = next((blk.text for blk in msg.content if blk.type == "text"), "")
            try:
                v = Verdict.model_validate_json(text)
            except (ValidationError, ValueError):
                v = None
        else:
            log(f"  {res.custom_id}: {res.result.type} (left as is; rerun to retry)")
            continue
        rec = record_and_apply(exam, L, v, meta, model, apply_fixes)
        n += 1
        log(f"  {rec['id']}: {rec['verdict']} -> {rec['applied']}")
    return n


# --------------------------------------------------------------------------- #
def missing_key_message() -> str:
    return (
        "review: ANTHROPIC_API_KEY is not set, so the filter agent can't run yet.\n"
        "  1. Create a key at https://platform.claude.com/ (Settings > API keys).\n"
        "  2. Put it in the server's .env (gitignored) as ANTHROPIC_API_KEY=..., then\n"
        "       set -a; . ./.env; set +a\n"
        "  3. Run:  pipeline/run.sh review                 (all exams, live)\n"
        "     or:   .venv/bin/python pipeline/review.py --exam ctet --batch   (50% cost, results within ~1 h)\n"
        "  Optional: REVIEW_MODEL=claude-opus-5-5 (default).\n"
        "Nothing was changed.")


def make_client():
    import anthropic
    return anthropic.Anthropic(max_retries=0, timeout=600.0)


def main(argv=None, client=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exam", nargs="*", choices=EXAMS, default=list(EXAMS))
    ap.add_argument("--limit", type=int, default=0, help="review at most N questions per exam")
    ap.add_argument("--batch", action="store_true", help="use the Message Batches API (50%% cost, async)")
    ap.add_argument("--collect", metavar="BATCH_ID", help="collect results of an earlier batch")
    ap.add_argument("--include-pyq", action="store_true", help="also review parsed PYQs (keys are official)")
    ap.add_argument("--recheck", action="store_true", help="review again even if ai_checked")
    ap.add_argument("--no-apply-fixes", action="store_true", help="record fixes without changing the bank")
    ap.add_argument("--dry-run", action="store_true", help="list what would be reviewed; no API calls")
    a = ap.parse_args(argv)
    if a.collect and len(a.exam) != 1:
        ap.error("--collect needs exactly one --exam (the batch's exam)")
    model = os.environ.get("REVIEW_MODEL", DEFAULT_MODEL)

    plan = {ex: candidates(ex, a.include_pyq, a.recheck) for ex in a.exam}
    if a.limit:
        plan = {ex: v[: a.limit] for ex, v in plan.items()}
    total = sum(len(v) for v in plan.values())
    print(f"review: {total} draft questions to check with {model}: " +
          ", ".join(f"{ex} {len(v)}" for ex, v in plan.items()))
    if a.dry_run:
        return 0
    if client is None:
        if not os.environ.get("ANTHROPIC_API_KEY"):
            print(missing_key_message())
            return 2
        client = make_client()
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        for ex, items in plan.items():
            if not items and not a.collect:
                continue
            if a.batch or a.collect:
                n = run_batch(client, ex, items, model, not a.no_apply_fixes, a.collect)
                print(f"review {ex}: {n} verdicts applied from the batch")
                continue
            tally = {"accept": 0, "fix": 0, "reject": 0, "error": 0}
            for i, L in enumerate(items, 1):
                v, meta = review_one(client, model, L.q, today)
                rec = record_and_apply(ex, L, v, meta, model, not a.no_apply_fixes)
                tally[rec["verdict"]] += 1
                print(f"  [{ex} {i}/{len(items)}] {rec['id']}: {rec['verdict']} -> {rec['applied']}"
                      + (f" ({'; '.join(rec.get('reasons', [])[:1])[:100]})" if rec["verdict"] != "accept" else ""))
            print(f"review {ex}: " + ", ".join(f"{k} {v}" for k, v in tally.items()) +
                  f"; log {rel(REVIEWS / (ex + '.jsonl'))}")
    except Fatal as e:
        print(f"review stopped: {e}")
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
