"""Shared helpers for the content pipeline (validate, review, analyze, assemble)."""
from __future__ import annotations

import json
import os
import re
import tempfile
import unicodedata
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
BANK = CONTENT / "bank"
PYQ = CONTENT / "pyq"
PAPERS = CONTENT / "papers"
WEB_PAPERS = ROOT / "web" / "src" / "data" / "papers"
OUTPUT = ROOT / "output"
REPORTS = OUTPUT / "reports"
REVIEWS = OUTPUT / "reviews"

EXAMS = ("bpsc-tre", "bpsc-cce", "mppsc", "ras", "bihar-stet", "ctet", "cg-tet")
DIFFICULTIES = ("easy", "medium", "hard")
TYPES = ("single", "statement", "match", "assertion", "sequence", "numeric")
SOURCES = ("generated", "pyq")
STATUSES = ("draft", "reviewed", "rejected")

_DEVA = re.compile(r"[ऀ-ॿ]")
_LATIN = re.compile(r"[A-Za-z]")


def has_devanagari(s: str) -> bool:
    return bool(_DEVA.search(s or ""))


def has_latin(s: str) -> bool:
    return bool(_LATIN.search(s or ""))


@dataclass
class Loaded:
    q: dict
    file: Path
    index: int  # position in the file's array


def load_dir(base: Path, exam: str | None = None) -> tuple[list[Loaded], list[dict]]:
    """Load every question array under base/<exam>/*.json.
    Returns (questions, file_errors). Files starting with '_' are skipped."""
    out: list[Loaded] = []
    errors: list[dict] = []
    if not base.exists():
        return out, errors
    dirs = [base / exam] if exam else sorted(p for p in base.iterdir() if p.is_dir())
    for d in dirs:
        if not d.is_dir():
            continue
        for f in sorted(d.rglob("*.json")):
            if f.name.startswith("_"):
                continue
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                errors.append({"file": rel(f), "error": f"invalid JSON: {e}"})
                continue
            if isinstance(data, dict) and isinstance(data.get("questions"), list):
                data = data["questions"]
            if not isinstance(data, list):
                errors.append({"file": rel(f), "error": "top level is not an array of questions"})
                continue
            for i, q in enumerate(data):
                if isinstance(q, dict):
                    out.append(Loaded(q, f, i))
                else:
                    errors.append({"file": rel(f), "error": f"item {i} is not an object"})
    return out, errors


def load_bank(exam: str | None = None):
    return load_dir(BANK, exam)


def load_pyq(exam: str | None = None):
    return load_dir(PYQ, exam)


def rel(p: Path) -> str:
    try:
        return str(p.resolve().relative_to(ROOT))
    except ValueError:
        return str(p)


def subject_slug(q: dict) -> str:
    """Subject slug: explicit 'subject_slug' (PYQ items), else from the id
    (<exam>-<subject-slug>-NNNN), else from the English name."""
    if q.get("subject_slug"):
        return q["subject_slug"]
    exam, qid = q.get("exam", ""), q.get("id", "")
    if exam and qid.startswith(exam + "-"):
        rest = qid[len(exam) + 1:]
        if "-" in rest:
            return rest.rsplit("-", 1)[0]
    name = (q.get("subject") or {}).get("en", "") or "unknown"
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "unknown"


def bi(d, key="en") -> str:
    if isinstance(d, dict):
        return str(d.get(key) or "")
    return str(d or "")


# --------------------------------------------------------------------------- #
# Text normalisation and similarity (near-duplicate detection, classification)
# --------------------------------------------------------------------------- #
_PUNCT = re.compile(r"[^\wऀ-ॿ]+", re.UNICODE)
_STOP = {
    "the", "of", "a", "an", "in", "is", "are", "was", "were", "which", "what", "who", "to", "and", "or",
    "for", "on", "by", "with", "from", "as", "at", "be", "following", "these", "this", "that", "its",
    "it", "above", "below", "statement", "statements", "correct", "incorrect", "not", "one", "consider",
    "select", "answer", "using", "code", "given", "true", "false",
    "का", "के", "की", "में", "है", "हैं", "से", "को", "और", "या", "पर", "ने", "एक", "यह", "वह",
    "निम्नलिखित", "कौन", "सा", "सी", "से", "था", "थे", "थी", "कथन", "कथनों", "सही", "गलत", "किस",
    "क्या", "नहीं", "उपर्युक्त", "उत्तर", "दिए", "गए", "कूट",
}


def norm_text(s: str) -> str:
    s = unicodedata.normalize("NFC", s or "").lower()
    s = re.sub(r"\(\s*[a-e1-5]\s*\)", " ", s)
    return " ".join(_PUNCT.sub(" ", s).split())


def tokens(s: str) -> set[str]:
    return {t for t in norm_text(s).split() if t not in _STOP and len(t) > 1}


def token_set_ratio(a: set[str], b: set[str]) -> float:
    """Token-set similarity in [0,1], in the spirit of fuzzywuzzy's token_set_ratio:
    shared tokens over the smaller set, damped when the sets differ a lot in size."""
    if not a or not b:
        return 0.0
    inter = len(a & b)
    small, big = min(len(a), len(b)), max(len(a), len(b))
    contain = inter / small
    jacc = inter / len(a | b)
    # a short question fully inside a long one is not a duplicate unless sizes are close
    return 0.5 * contain + 0.5 * jacc if small / big < 0.6 else max(jacc, 0.8 * contain + 0.2 * jacc)


def question_signature(q: dict) -> set[str]:
    """Tokens of the English stem + options (Hindi when the English is not Latin text)."""
    parts = [bi(q.get("text"), "en")]
    parts += [bi(o, "en") for o in q.get("options") or []]
    t = tokens(" ".join(parts))
    if len(t) < 4:
        t |= tokens(" ".join([bi(q.get("text"), "hi")] + [bi(o, "hi") for o in q.get("options") or []]))
    return t


# --------------------------------------------------------------------------- #
# Writing
# --------------------------------------------------------------------------- #
def write_json_atomic(path: Path, data, indent=1) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".tmp-", suffix=".json")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=indent)
        f.write("\n")
    os.replace(tmp, path)


def update_questions_in_file(path: Path, updates: dict[str, dict]) -> int:
    """Re-read path (other writers may have changed it), merge updates into the
    questions with matching ids, write atomically. Returns how many were updated."""
    data = json.loads(path.read_text(encoding="utf-8"))
    arr = data["questions"] if isinstance(data, dict) else data
    n = 0
    for q in arr:
        u = updates.get(q.get("id"))
        if u:
            q.update(u)
            n += 1
    if n:
        write_json_atomic(path, data)
    return n
