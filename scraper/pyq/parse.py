"""Parse OCR/text of official papers into PYQ questions (bank schema).

    .venv/bin/python -m scraper.pyq.parse [--exam ras ctet]

Reads scraper/text/<exam>/*.txt (from ocr.py) and the manifest, pairs each
question paper with its official answer key, and writes
content/pyq/<exam>/<paper>.json: an array of bank-schema questions with
source "pyq", pyq_ref like "RAS Prelims 2023 Q12", status "draft" and the
answer from the official key (null when the key is missing or the question
was deleted). Items whose OCR or structure looks unreliable carry
"ocr_confidence": "low" instead of a guess.

Layout handled: two-column bilingual booklets (one language per column, both
columns carrying the same questions), and single-language pages. Questions are
found by their option markers (1)..(4)/(5): question numbers in OCR are often
garbled, so numbering is inferred from the sequence and checked against the
printed numbers.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

SCRAPER = Path(__file__).resolve().parent.parent
ROOT = SCRAPER.parent
TEXT_DIR = SCRAPER / "text"
MANIFEST = SCRAPER / "manifest.json"
PYQ_DIR = ROOT / "content" / "pyq"
sys.path.insert(0, str(ROOT / "pipeline"))

_DEVA = re.compile(r"[ऀ-ॿ]")
_LATIN = re.compile(r"[A-Za-z]")

# Exam-specific facts about the booklets
EXAM_RULES = {
    # RPSC prints a 5th bubble "Question not attempted" (अनुत्तरित प्रश्न): not an answer option.
    "ras": {"markers": 5, "drop_last": True, "anchor": True},
    "ctet": {"markers": 4, "drop_last": False, "label": None, "lang_cols": None},
    "bpsc-cce": {"markers": 5, "drop_last": False},
    "bpsc-tre": {"markers": 4, "drop_last": False},
    "mppsc": {"markers": 4, "drop_last": False},
    "bihar-stet": {"markers": 4, "drop_last": False},
    "cg-tet": {"markers": 4, "drop_last": False},
}

# looser marker for anchored booklets, where only the last four markers matter: also "(+)", "(8 text"
LOOSE_MARKER = re.compile(r"(?:(?<=\s)|^)[\(\[\{]\s*([0-9lIi|!zZsSoO\u0966-\u096F]?)\s*[\)\]\}]"
                    r"|^\s*[\(\[\{]?\s*([1-5lI+\u0967-\u096B])\s*[\)\]\}]", re.M)
NOT_ATTEMPTED = re.compile(r"^[^\S\n]*(?:[\(\[\{]?\s*[5sS\u096B]?\s*[\)\]\}]?\s*)?"
                           r"(अनु\S{0,3}रि\S{0,2}\s*प्र\S*|अनुत्तरित|Question\s*n\S{0,3}\s*attempt\w*|not\s*attempt\w*)",
                           re.I | re.M)


def lang_of(text: str) -> str:
    d, l = len(_DEVA.findall(text)), len(_LATIN.findall(text))
    if d + l < 20:
        return "?"
    return "hi" if d > l else "en"


# --------------------------------------------------------------------------- #
# Reading ocr.py output
# --------------------------------------------------------------------------- #
@dataclass
class Region:
    page: int
    col: str
    src: str
    conf: float | None
    text: str


def read_regions(path: Path) -> list[Region]:
    regs, cur, buf = [], None, []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        m = re.match(r"^@@ page=(\d+) col=(\w) src=(\w+)(?: conf=([\d.]+))?$", line)
        if m:
            if cur:
                regs.append(Region(*cur, "\n".join(buf)))
            cur = (int(m.group(1)), m.group(2), m.group(3), float(m.group(4)) if m.group(4) else None)
            buf = []
        else:
            buf.append(line)
    if cur:
        regs.append(Region(*cur, "\n".join(buf)))
    for r in regs:  # the column rule in the middle of the page OCRs as '|' at line edges
        r.text = "\n".join(re.sub(r"^[\s|!¦]+|[\s|!¦]+$", "", l) for l in r.text.splitlines())
    return regs


# --------------------------------------------------------------------------- #
# Splitting a text stream into questions by option markers
# --------------------------------------------------------------------------- #
# "(1)" and OCR variants: "(l)", "()", "(7)", "(9)", "[2]", "{3)", "1)" at line start
MARKER = re.compile(r"(?:(?<=\s)|^)[\(\[\{]\s*([0-9lIi|!zZsSoO]?)\s*[\)\]\}]|(?:^|\n)\s*([1-5])\s*\)", re.M)
LIKE = {
    1: set("1lIi|!7]+\u0967"), 2: set("2zZ\u0968"), 3: set("389\u0969"), 4: set("4A\u096A"), 5: set("5sS\u096B"),
}
QNUM = re.compile(r"(?:^|\n)\s*[|!i\[\]]?\s*(\d{1,3})\s*[.,।]\s*", re.M)
NOISE_LINE = re.compile(r"^\s*(P-I+|\(\d+\)|[A-D]|\d{1,2}|SPACE FOR ROUGH WORK.*|रफ कार्य.*|\W*)\s*$", re.I)


def marker_digit(m: re.Match) -> str:
    g2 = m.group(2) if m.re.groups >= 2 else None
    return (m.group(1) if m.group(1) is not None else g2) or ""


def looks_like(ch: str, n: int) -> bool:
    if ch == "":
        return n == 1  # "()" most often is a mangled (1)
    return ch in LIKE.get(n, ())


@dataclass
class Block:
    stem: str
    options: list[str]
    printed_no: int | None
    issues: list[str] = field(default_factory=list)
    page: int = 0
    conf: float | None = None
    pos: int = 0


def clean(s: str) -> str:
    lines = [l for l in s.splitlines() if not NOISE_LINE.match(l)]
    s = " ".join(" ".join(lines).split())
    s = re.sub(r"\s+([,.?।:;)])", r"\1", s)
    return s.strip(" |_-—=«»")


LETTER_MARKER = re.compile(r"(?:(?<=\s)|^)[\(\[\{]\s*([A-Ea-e]?)\s*[\)\]\}]|^\s*([A-E])\s*[.)]\s", re.M)
LETTER_LIKE = {1: set("Aa"), 2: set("Bb8"), 3: set("Cc"), 4: set("Dd0O"), 5: set("Ee")}


def split_blocks(text: str, k: int, drop_last: bool, letters: bool = False) -> list[Block]:
    """text: one column stream. Returns question blocks in order."""
    global LIKE
    saved = LIKE
    if letters:
        LIKE = LETTER_LIKE
    try:
        return _split_blocks(text, k, drop_last, LETTER_MARKER if letters else MARKER)
    finally:
        LIKE = saved


def _split_blocks(text: str, k: int, drop_last: bool, marker_re) -> list[Block]:
    marks = list(marker_re.finditer(text))
    groups: list[list[re.Match]] = []
    cur: list[re.Match] = []
    for m in marks:
        d = marker_digit(m)
        want = len(cur) + 1
        if looks_like(d, want):
            cur.append(m)
            if len(cur) == k:
                groups.append(cur)
                cur = []
        elif looks_like(d, 1):
            cur = [m]           # a fresh "(1)": what came before was stem text (e.g. "(i)" lists)
        elif cur and d == "":
            cur.append(m)       # unreadable marker in the right place
            if len(cur) == k:
                groups.append(cur)
                cur = []
    blocks: list[Block] = []
    prev_end = 0
    for gi, g in enumerate(groups):
        stem_raw = text[prev_end:g[0].start()]
        # the stem starts at the last printed question number before the options
        nums = list(QNUM.finditer(stem_raw))
        printed = None
        if nums:
            # prefer the last number that begins a line of real text
            lastn = nums[-1]
            stem_raw = stem_raw[lastn.start():]
            try:
                printed = int(lastn.group(1))
            except ValueError:
                printed = None
            stem_raw = stem_raw[lastn.end() - lastn.start():]
        opts = []
        for j, m in enumerate(g):
            end = g[j + 1].start() if j + 1 < len(g) else None
            if end is None:
                # last option runs to the next question number or the next group's text
                nxt = groups[gi + 1][0].start() if gi + 1 < len(groups) else len(text)
                tail = text[m.end():nxt]
                cut = QNUM.search(tail)
                if drop_last:
                    na = NOT_ATTEMPTED.search(tail)
                    if na:
                        # keep only up to the end of that line
                        eol = tail.find("\n", na.end())
                        cut_pos = eol if eol >= 0 else na.end()
                        if not cut or cut.start() > cut_pos:
                            tail = tail[:cut_pos]
                            prev_end = m.end() + cut_pos
                            opts.append(tail)
                            continue
                if cut:
                    tail = tail[:cut.start()]
                else:
                    # no number found: keep the first two lines, the rest is likely the next stem
                    tl = tail.split("\n")
                    tail = "\n".join(tl[:2])
                prev_end = m.end() + len(tail)
                opts.append(tail)
            else:
                opts.append(text[m.end():end])
        b = Block(clean(stem_raw), [clean(o) for o in opts], printed, pos=g[0].start())
        if drop_last:
            if b.options and NOT_ATTEMPTED.search(b.options[-1]) or len(b.options) == k:
                b.options = b.options[:k - 1]
        if not b.stem:
            b.issues.append("empty stem")
        if any(not o for o in b.options):
            b.issues.append("empty option")
        blocks.append(b)
    return blocks


def number_blocks(blocks: list[Block]) -> list[int]:
    """Infer question numbers: trust a printed number when it continues the
    sequence, else previous + 1."""
    out, prev = [], 0
    for b in blocks:
        p = b.printed_no
        if p is not None and (p == prev + 1 or (prev == 0 and 1 <= p <= 5)):
            n = p
        elif p is not None and prev < p <= prev + 3 and p <= 200:
            n = p  # a question we missed in between
        else:
            n = prev + 1
            if p is not None:
                b.issues.append(f"printed number {p} read, inferred {n}")
            else:
                b.issues.append(f"number inferred ({n})")
        out.append(n)
        prev = n
    return out


# --------------------------------------------------------------------------- #
# Answer keys
# --------------------------------------------------------------------------- #
def _undouble(t: str) -> list[str]:
    """Bold rows in RPSC keys come out with every glyph doubled: '4141' -> '41', '22' -> '2'."""
    out = [t]
    if len(t) % 2 == 0 and t[: len(t) // 2] == t[len(t) // 2:]:
        out.append(t[: len(t) // 2])
    return out


def parse_key_rpsc(text: str) -> dict[int, str]:
    """RPSC final keys: rows of 'Q RES Q RES Q RES' (column offsets of 50)."""
    key: dict[int, str] = {}
    ans_re = re.compile(r"[1-5](?:[,&][1-5])*|\*")
    for line in text.splitlines():
        toks = line.split()
        if len(toks) < 2 or len(toks) % 2 or not all(re.fullmatch(r"\d{1,6}|\*+|[1-5](?:[,&][1-5])*", t) for t in toks):
            continue
        qs_c = [_undouble(t) for t in toks[0::2]]
        as_c = [_undouble(t) for t in toks[1::2]]
        # choose question readings that are consistent: q, q+50, q+100 ... (or q, q+1 for 1-col pages)
        best = None
        for base_i, cands in enumerate(qs_c):
            for c in cands:
                if not c.isdigit():
                    continue
                for step in (50, 1, 25, 40, 60, 100):
                    q0 = int(c) - step * base_i
                    seq = [q0 + step * j for j in range(len(qs_c))]
                    if q0 >= 1 and all(str(seq[j]) in qs_c[j] for j in range(len(qs_c))):
                        best = seq
                        break
                if best:
                    break
            if best:
                break
        if not best:
            continue
        for q, ac in zip(best, as_c):
            a = next((x for x in reversed(ac) if ans_re.fullmatch(x)), None)
            if a is not None and 1 <= q <= 200:
                key.setdefault(q, a)
    if len(key) < 20:  # one value per line (text extracted without layout)
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        for a, b in zip(lines, lines[1:]):
            if re.fullmatch(r"\d{1,3}", a) and ans_re.fullmatch(b) and 1 <= int(a) <= 200:
                key.setdefault(int(a), b)
    return key


def parse_key_ctet(text: str) -> dict[str, dict[int, str]]:
    """CTET keys: 'Set :- A PAPER-I MAIN' blocks with '| 1 2 | 26 4 | ...' rows."""
    sets: dict[str, dict[int, str]] = defaultdict(dict)
    cur = None
    has_main = bool(re.search(r"Set\s*:?-?\s*[A-Z]\b.*MAIN", text))
    for line in text.splitlines():
        m = re.search(r"Set\s*:?-?\s*([A-Z])\b", line)
        if m:
            # keys list the main booklet and then each language booklet; keep the main one
            lang = re.search(r"\d\d-([A-Z]+)", line.upper())
            if not has_main or "MAIN" in line.upper():
                cur = m.group(1)
            elif lang:
                cur = f"{m.group(1)}:{lang.group(1)}"
            else:
                cur = None
            continue
        if cur and "|" in line:
            for q, a in re.findall(r"(\d{1,3})\s+([1-4](?:,[1-4])+|[0-9]|\*)\s*(?=\||$)", line):
                # "9" = marks awarded to all candidates (question dropped)
                sets[cur].setdefault(int(q), "*" if a in ("9", "0") else a)
    return dict(sets)


def parse_key_generic(text: str) -> dict[str, dict[int, str]]:
    """Fallback: 'Q. 12 - (3)', '12  C' etc. Options A-D become 1-4."""
    out: dict[int, str] = {}
    for q, a in re.findall(r"(?:^|\s)(\d{1,3})\s*[.):-]?\s*\(?([1-5A-Da-d*])\)?(?=\s|$)", text):
        a = {"A": "1", "B": "2", "C": "3", "D": "4"}.get(a.upper(), a)
        out.setdefault(int(q), a)
    return {"": out}


KEY_PARSERS = ("ras", "ctet")  # key layouts we parse reliably; others are left for a human


def read_key(exam: str, path: Path) -> dict[str, dict[int, str]]:
    text = "\n".join(r.text for r in read_regions(path))
    if exam == "ras":
        k = parse_key_rpsc(text)
        if len(k) >= 50:
            return {"": k}
    if exam == "ctet":
        k = parse_key_ctet(text)
        if k:
            return k
    return parse_key_generic(text)


# --------------------------------------------------------------------------- #
# Subject/topic: nearest bank question (TF-IDF cosine)
# --------------------------------------------------------------------------- #
class Classifier:
    def __init__(self, exam: str):
        from common import load_bank, subject_slug, tokens
        self.tokens = tokens
        self.items = []
        for L in load_bank(exam)[0]:
            q = L.q
            t = tokens(" ".join([str((q.get("text") or {}).get("en", "")), str((q.get("text") or {}).get("hi", "")),
                                 str((q.get("topic") or {}).get("en", "")),
                                 " ".join(str(o.get("en", "")) for o in q.get("options") or [] if isinstance(o, dict))]))
            self.items.append((t, subject_slug(q), q.get("subject"), q.get("topic")))
        df = Counter(tok for t, *_ in self.items for tok in t)
        n = len(self.items) or 1
        self.idf = {tok: math.log((n + 1) / (c + 0.5)) for tok, c in df.items()}
        self.vecs = [self._vec(t) for t, *_ in self.items]

    def _vec(self, toks):
        v = {t: self.idf.get(t, math.log(len(self.items) + 1)) for t in toks}
        norm = math.sqrt(sum(x * x for x in v.values())) or 1.0
        return {t: x / norm for t, x in v.items()}

    def classify(self, text: str):
        if not self.items:
            return None
        v = self._vec(self.tokens(text))
        scored = sorted(((sum(w * vec.get(t, 0) for t, w in v.items()), i) for i, vec in enumerate(self.vecs)),
                        reverse=True)[:7]
        if not scored or scored[0][0] < 0.06:
            return None
        votes = Counter()
        for s, i in scored:
            votes[self.items[i][1]] += s
        subj = votes.most_common(1)[0][0]
        best = next(i for s, i in scored if self.items[i][1] == subj)
        _, slug, sname, topic = self.items[best]
        return {"subject_slug": slug, "subject": sname, "topic": topic, "score": round(scored[0][0], 3)}


# --------------------------------------------------------------------------- #
# Putting a paper together
# --------------------------------------------------------------------------- #
def column_streams(regs: list[Region]):
    """Group regions into streams. Bilingual pages: one stream per language.
    Monolingual pages (both columns same language): a single 'mono' stream, L then R."""
    pages = defaultdict(dict)
    for r in regs:
        pages[r.page][r.col] = r
    streams = defaultdict(list)   # name -> list[(page, text, conf)]
    for p in sorted(pages):
        cols = pages[p]
        if "F" in cols:
            streams["mono"].append((p, cols["F"].text, cols["F"].conf))
            continue
        L, R = cols.get("L"), cols.get("R")
        ll, rl = lang_of(L.text) if L else "?", lang_of(R.text) if R else "?"
        if ll != "?" and rl != "?" and ll != rl:
            streams[ll].append((p, L.text, L.conf))
            streams[rl].append((p, R.text, R.conf))
        else:
            for c in (L, R):
                if c:
                    streams["mono"].append((p, c.text, c.conf))
    return streams


def join_stream(stream):
    parts, spans, pos = [], [], 0
    for p, t, c in stream:
        parts.append(t + "\n")
        spans.append((pos, pos + len(t) + 1, p, c))
        pos += len(t) + 1
    return "".join(parts), spans


def locate(spans, pos):
    for s_, e, p, c in spans:
        if s_ <= pos < e:
            return p, c
    return (spans[-1][2], spans[-1][3]) if spans else (0, None)


def anchored_blocks(text: str) -> list[Block]:
    """RPSC style: every question ends with the fixed 5th option 'Question not
    attempted' / 'अनुत्तरित प्रश्न'. Split on it; the last four option markers
    before it are options 1-4."""
    blocks, prev = [], 0
    for a in NOT_ATTEMPTED.finditer(text):
        chunk = text[prev:a.start()]
        eol = text.find("\n", a.end())
        prev = eol if eol >= 0 else a.end()
        marks = list(MARKER.finditer(chunk))
        if len(marks) < 5:
            marks = list(LOOSE_MARKER.finditer(chunk))
        # the "(5)" of the not-attempted line itself, right before the anchor
        if marks and chunk[marks[-1].end():].strip(" .:-|_—") == "":
            marks = marks[:-1]
        issues = []
        if len(marks) < 4:
            issues.append(f"only {len(marks)} option markers found")
        opt_marks = marks[-4:]
        if opt_marks:
            pre = chunk[:opt_marks[0].start()]
        else:
            pre = chunk
        if len(pre) > 1200:  # first question: cover-page instructions come before it
            nums_all = list(QNUM.finditer(pre))
            num = nums_all[-1] if nums_all else None
        else:
            num = QNUM.search(pre[:200])
        printed = int(num.group(1)) if num else None
        stem = pre[num.end():] if num else pre
        opts = []
        for j, m in enumerate(opt_marks):
            end = opt_marks[j + 1].start() if j + 1 < len(opt_marks) else len(chunk)
            o = chunk[m.end():end]
            if j == len(opt_marks) - 1:
                o = re.split(r"[\(\[\{]\s*[5sS]\s*[\)\]\}]", o)[0]
            opts.append(o)
        b = Block(clean(stem), [clean(o) for o in opts], printed, issues, pos=a.start())
        if not b.stem:
            b.issues.append("empty stem")
        if any(not o for o in b.options):
            b.issues.append("empty option")
        blocks.append(b)
    return blocks


def blocks_for(stream, k, drop_last, anchor=False) -> list[Block]:
    text, spans = join_stream(stream)
    if anchor and len(NOT_ATTEMPTED.findall(text)) < 10:
        anchor, drop_last, k = False, False, 4  # older booklets have no 'not attempted' option
    if anchor:
        blocks = anchored_blocks(text)
    else:
        # options labelled (A)-(D)/(E) or (1)-(4)/(5)? Use whichever the paper prints.
        nl = len(re.findall(r"\(\s*[A-D]\s*\)", text)) + len(re.findall(r"(?m)^\s*[A-D]\s*[.)]\s", text))
        nd = len(re.findall(r"\(\s*[1-4]\s*\)", text))
        letters = nl > nd
        if letters:
            ne = len(re.findall(r"(?m)\(\s*E\s*\)|^\s*E\s*[.)]\s", text))
            ndd = len(re.findall(r"(?m)\(\s*D\s*\)|^\s*D\s*[.)]\s", text))
            k = 5 if ndd and ne > 0.6 * ndd else 4
        else:
            n5, n4 = len(re.findall(r"\(\s*5\s*\)", text)), len(re.findall(r"\(\s*4\s*\)", text))
            k = 5 if n4 and n5 > 0.6 * n4 else k
        blocks = split_blocks(text, k, drop_last, letters)
    for b in blocks:
        b.page, b.conf = locate(spans, b.pos)
    return blocks


def pair_blocks(streams, rules):
    """Pair the two language columns page by page (both columns carry the same
    questions in the same order). Returns [(en_block|None, hi_block|None, issues)]."""
    k, drop, anchor = rules["markers"], rules["drop_last"], rules.get("anchor", False)
    per = {name: blocks_for(st, k, drop, anchor) for name, st in streams.items()}
    by_page = defaultdict(lambda: defaultdict(list))
    for name, bl in per.items():
        for b in bl:
            by_page[b.page][name].append(b)
    rows = []
    for p in sorted(by_page):
        d = by_page[p]
        en, hi = d.get("en", []), d.get("hi", [])
        n = max(len(en), len(hi))
        for i in range(n):
            e = en[i] if i < len(en) else None
            h = hi[i] if i < len(hi) else None
            iss = [] if len(en) == len(hi) else [f"page {p}: {len(en)} English vs {len(hi)} Hindi questions"]
            rows.append((e, h, iss))
        for b in d.get("mono", []):
            lg = lang_of(b.stem + " " + " ".join(b.options))
            rows.append((b, b, ["monolingual", f"mono-{lg if lg != '?' else 'en'}"]))
    return rows


def number_rows(rows, start: int = 0) -> list[int]:
    """Question numbers: the sequence, confirmed or re-synchronised by the printed
    numbers (OCR often drops the hundreds digit: '22.' for 122)."""
    out, prev = [], start
    for e, h, iss in rows:
        cands = [b.printed_no for b in (e, h) if b is not None and b.printed_no is not None]
        readings = set()
        for c in cands:
            readings |= {c, c + 100 * (prev // 100), c + 100 * ((prev + 1) // 100)}
        exp = prev + 1
        near = sorted((abs(r - exp), r) for r in readings if exp - 2 <= r <= exp + 2 and r >= 1)
        if prev == 0 and not near and readings & {1, 2, 3}:
            near = [(0, min(readings & {1, 2, 3}))]
        if near and near[0][1] == exp:
            n = exp
        elif near:
            n = near[0][1]
            iss.append(f"resynchronised on printed number {n} (sequence expected {exp})")
        else:
            n = exp
            iss.append(f"number inferred ({n})" + (f", read {cands}" if cands else ""))
        out.append(n)
        prev = n
    return out


def build_paper(exam: str, qp_meta: dict, qp_txt: Path, key: dict[int, str] | None, key_note: str,
                clf: Classifier | None) -> tuple[list[dict], dict]:
    rules = EXAM_RULES.get(exam, {"markers": 4, "drop_last": False})
    k, drop = rules["markers"], rules["drop_last"]
    regs = read_regions(qp_txt)
    streams = column_streams(regs)
    rows = pair_blocks(streams, rules)
    # Bilingual questions are numbered as one sequence. Single-language sections
    # (CTET language papers: an English and a Hindi option for the same numbers)
    # are numbered separately, continuing after the bilingual part.
    groups = defaultdict(list)
    for r in rows:
        g = next((i for i in r[2] if i.startswith("mono-")), "bi")
        groups[g].append(r)
    numbered_rows = []
    bi_nums = number_rows(groups.get("bi", []))
    numbered_rows += [("bi", n, r) for n, r in zip(bi_nums, groups.get("bi", []))]
    last_bi = max(bi_nums) if bi_nums else 0
    for g in sorted(x for x in groups if x != "bi"):
        ns = number_rows(groups[g], start=last_bi)
        numbered_rows += [(g, n, r) for n, r in zip(ns, groups[g])]
    keys = key if isinstance(key, dict) and any(isinstance(v, dict) for v in key.values()) else {"bi": key or {}}
    cycle, year = qp_meta["cycle"], qp_meta.get("year")
    paper_label = qp_meta["paper"]
    m = re.search(r"Paper\s*([12])", paper_label)
    ref_base = cycle + (f" Paper {m.group(1)}" if exam == "ctet" and m else "")
    drop = {"ctet", "ras", "prelims", "bpsc", "mppsc", "cg", "tet", "bihar", "stet", "re", "exam"}
    words = [w for w in re.findall(r"[a-z0-9]+", cycle.lower()) if w not in drop]
    words = [w[:3] if w.isalpha() else w for w in words]
    tag = "-".join(words) + (f"-p{m.group(1)}" if m else "") + (f"-{qp_meta['uniq']}" if qp_meta.get("uniq") else "")
    out = []
    stats = Counter()
    def quality(row):
        e, h, iss = row
        return sum(len(b.options) for b in (e, h) if b) - len(iss)
    best_row = {}
    for g, n, row in numbered_rows:
        if (g, n) not in best_row or quality(row) > quality(best_row[(g, n)]):
            best_row[(g, n)] = row
    for (g, n), (en_b, hi_b, row_issues) in sorted(best_row.items(), key=lambda kv: (kv[0][0] != "bi", kv[0])):
        key = keys.get(g) if g != "bi" else keys.get("bi")
        lang_tag = {"mono-en": "-en", "mono-hi": "-hi"}.get(g, "")
        lang_ref = {"mono-en": " (English language section)", "mono-hi": " (Hindi language section)"}.get(g, "")
        issues = [i for i in row_issues if i != "monolingual" and not i.startswith("mono-")]
        if g != "bi" and key is None:
            issues.append("no official key for this language section")
        if "monolingual" in row_issues:
            stats["monolingual"] += 1
        if not en_b and not hi_b:
            continue
        if not en_b or not hi_b:
            issues.append("only one language parsed")
            en_b = en_b or hi_b
            hi_b = hi_b or en_b
        if n == 1 and len(en_b.stem) > 600:
            issues.append("stem may include cover-page instructions")
        nopt = k - 1 if drop else k
        if len(en_b.options) != len(hi_b.options) or len(en_b.options) not in (4, 5):
            issues.append(f"option count en={len(en_b.options)} hi={len(hi_b.options)}")
        nopt = min(len(en_b.options), len(hi_b.options)) or nopt
        issues += en_b.issues + ([i for i in hi_b.issues if i not in en_b.issues] if hi_b is not en_b else [])
        confs = [c for c in (en_b.conf, hi_b.conf) if c is not None]
        low_conf = bool(confs) and min(confs) < 75
        ans_raw = (key or {}).get(n)
        answer, extra = None, {}
        if ans_raw is None:
            issues.append("no official key for this question")
        elif ans_raw == "*":
            extra["key_note"] = "question deleted in the official final key"
        else:
            first = int(ans_raw.split(",")[0].split("&")[0])
            if 1 <= first <= nopt:
                answer = first - 1
            if "," in ans_raw or "&" in ans_raw:
                extra["key_note"] = f"official key accepts more than one option: {ans_raw}"
        text = {"en": en_b.stem, "hi": hi_b.stem}
        options = [{"en": en_b.options[i] if i < len(en_b.options) else "",
                    "hi": hi_b.options[i] if i < len(hi_b.options) else ""} for i in range(nopt)]
        cls = clf.classify(en_b.stem + " " + " ".join(en_b.options) + " " + hi_b.stem) if clf else None
        letter = "ABCDE"[answer] if answer is not None else None
        q = {
            "id": f"{exam}-pyq-{tag}{lang_tag}-{n:04d}",
            "exam": exam,
            "subject": (cls or {}).get("subject") or {"en": "Unclassified", "hi": "अवर्गीकृत"},
            "subject_slug": (cls or {}).get("subject_slug") or "unclassified",
            "topic": (cls or {}).get("topic") or {"en": "Unclassified", "hi": "अवर्गीकृत"},
            "topic_source": f"auto-nn {cls['score']}" if cls else "none",
            "difficulty": "medium",
            "type": "single",
            "text": text,
            "options": options,
            "answer": answer,
            "explanation": ({"en": f"Official answer key: option ({answer + 1}).",
                             "hi": f"आधिकारिक उत्तर कुंजी: विकल्प ({answer + 1})।"} if answer is not None else
                            {"en": "No answer in the official key.", "hi": "आधिकारिक उत्तर कुंजी में उत्तर नहीं।"}),
            "source": "pyq",
            "pyq_ref": f"{ref_base} Q{n}{lang_ref}",
            "year": year,
            "variant_of": None,
            "time_sensitive": False,
            "facts_as_of": None,
            "status": "draft",
            "official": {"question_paper": qp_meta["url"], "answer_key": key_note or None,
                         "page": en_b.page or hi_b.page},
            **extra,
        }
        if low_conf or issues:
            q["ocr_confidence"] = "low" if (low_conf or any(not i.startswith("number inferred") and
                                                            not i.startswith("printed number") for i in issues)) else "medium"
            q["parse_issues"] = issues + ([f"OCR confidence {min(confs)}"] if low_conf else [])
        else:
            q["ocr_confidence"] = "high"
        stats[q["ocr_confidence"]] += 1
        stats["with_answer"] += answer is not None
        out.append(q)
    summary = {"questions": len(out), **stats}
    return out, summary


def build_cbt_paper(exam: str, qp_meta: dict, qp_txt: Path, clf) -> tuple[list[dict], dict]:
    """Computer-based test exports (BSEB STET): 'Question N ... (A) <id> ... Right Option Id : <id>'.
    The question paper carries its own official key."""
    text = "\n".join(r.text for r in read_regions(qp_txt))
    parts = re.split(r"(?m)^\s*Question\s*(?:No\.?\s*)?(\d{1,3})\b(?!\s*Id)", text)
    out, stats = [], Counter()
    year = qp_meta.get("year")
    slug = re.sub(r"[^a-z0-9]+", "-", f"{year}-{qp_meta['paper']}".lower()).strip("-")[:24].strip("-") + \
        "-" + __import__("hashlib").sha1(qp_meta["url"].encode()).hexdigest()[:4]
    section, prev_n, seq = 1, 0, 0
    for i in range(1, len(parts) - 1, 2):
        n, body = int(parts[i]), parts[i + 1]
        if n <= prev_n:
            section += 1  # numbering restarts in each section of the CBT paper
        prev_n = n
        seq += 1
        right = re.search(r"Right\s*Option\s*Id\s*[:;]?\s*(\d{4,})", body)
        ids = re.findall(r"\(\s*([A-D])\s*\)\s*\n?\s*(\d{4,})", body)
        body_q = re.split(r"Question\s*Id|Option\s*Id|Right\s*Answer|Answer\s*:", body)[0]
        opts_txt = re.split(r"(?m)^\s*\(?\s*[A-D]\s*\)\s*", body)
        issues = []
        answer = None
        if right and ids:
            idmap = {v: "ABCD".index(k) for k, v in ids}
            answer = idmap.get(right.group(1))
        if answer is None and right:
            last = int(right.group(1)[-1])
            answer = last - 1 if 1 <= last <= 4 else None
        stem = clean(body_q)
        # option texts: lines after each (A)..(D) label that are not bare ids
        options = []
        for lab in "ABCD":
            m_ = re.search(rf"\(\s*{lab}\s*\)\s*(?:\d{{4,}})?\s*(.*?)(?=\(\s*[A-D]\s*\)|Right\s*Option|Right\s*Answer|$)", body, re.S)
            o = clean(re.sub(r"\b\d{4,}\b", "", m_.group(1))) if m_ else ""
            options.append(o)
        if not stem:
            issues.append("question text not recovered (image)")
        if sum(1 for o in options if o) < 4:
            issues.append("option text not recovered (image)")
        lang = lang_of(stem + " ".join(options))
        cls = clf.classify(stem + " " + " ".join(options)) if clf else None
        q = {
            "id": f"{exam}-pyq-{slug}-{seq:04d}", "exam": exam,
            "subject": (cls or {}).get("subject") or {"en": "Unclassified", "hi": "अवर्गीकृत"},
            "subject_slug": (cls or {}).get("subject_slug") or "unclassified",
            "topic": (cls or {}).get("topic") or {"en": "Unclassified", "hi": "अवर्गीकृत"},
            "topic_source": f"auto-nn {cls['score']}" if cls else "none",
            "difficulty": "medium", "type": "single",
            "text": {"en": stem, "hi": stem},
            "options": [{"en": o, "hi": o} for o in options],
            "answer": answer,
            "explanation": ({"en": f"Official answer key: option ({answer + 1}).",
                             "hi": f"आधिकारिक उत्तर कुंजी: विकल्प ({answer + 1})।"} if answer is not None else
                            {"en": "No answer in the official key.", "hi": "आधिकारिक उत्तर कुंजी में उत्तर नहीं।"}),
            "source": "pyq", "pyq_ref": f"{qp_meta['cycle']} {qp_meta['paper']} " + (f"section {section} " if section > 1 else "") + f"Q{n}",
            "year": year,
            "variant_of": None, "time_sensitive": False, "facts_as_of": None, "status": "draft",
            "official": {"question_paper": qp_meta["url"], "answer_key": "embedded (Right Option Id)"},
            "language": lang,
        }
        q["ocr_confidence"] = "low" if issues else "medium"
        if issues:
            q["parse_issues"] = issues
        stats[q["ocr_confidence"]] += 1
        stats["with_answer"] += answer is not None
        out.append(q)
    return out, {"questions": len(out), **stats}


def booklet_set(qp_txt: Path, candidates=None) -> str | None:
    """The booklet's set letter: 'Test Booklet Code X', else the letter printed in
    the page headers (a line holding just that letter) that is one of the key's sets."""
    regs = read_regions(qp_txt)
    head = "\n".join(r.text for r in regs[:6])
    m = re.search(r"Test\s*Booklet\s*Code\s*[:\-]?\s*([A-Z])\b", head, re.I) or \
        re.search(r"Booklet\s*(?:Series|Code)\s*[:\-]?\s*([A-Z])\b", head, re.I)
    if m and (not candidates or m.group(1).upper() in candidates):
        return m.group(1).upper()
    text = "\n".join(r.text for r in regs)
    heads = Counter(re.findall(r"(?m)^\s*(?:P-I+\s*)?(?:\(\d+\)\s*)?([A-Z])\s*(?:\(\d+\))?\s*(?:P-I+)?\s*$", text))
    for letter, _ in heads.most_common():
        if not candidates or letter in candidates:
            return letter
    return None


def match_key(exam: str, qp: dict, keys: list[dict]) -> dict | None:
    same = [k for k in keys if k["cycle"] == qp["cycle"]]
    if exam == "ctet":
        m = re.search(r"Paper\s*([12])", qp["paper"])
        if m:
            same = [k for k in same if re.search(rf"Paper\s*{m.group(1)}\b", k["paper"])] or \
                   [k for k in same if "Paper 1 and 2" in k["paper"]]
        # prefer the medium matching nothing in particular; keys are identical across media
    if len(same) == 1:
        return same[0]
    if not same:
        return None
    # several candidates (e.g. two papers in one year): the closest title wins, if clearly closest
    def sim(a, b):
        ta, tb = set(re.findall(r"\w+", a.lower())), set(re.findall(r"\w+", b.lower()))
        return len(ta & tb) / (len(ta | tb) or 1)
    scored = sorted(((sim(qp.get("note", ""), k.get("note", "")), k) for k in same), key=lambda x: -x[0])
    if exam == "ctet":
        return scored[0][1]
    if len(scored) > 1 and scored[0][0] - scored[1][0] < 0.05:
        return None
    return scored[0][1]


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exam", nargs="*")
    a = ap.parse_args(argv)
    if not MANIFEST.exists():
        print("no manifest: run the scraper first")
        return 1
    m = json.loads(MANIFEST.read_text())
    entries = [e for e in m["entries"] if e.get("status") == "ok" and (not a.exam or e["exam"] in a.exam)]
    by_exam = defaultdict(list)
    for e in entries:
        by_exam[e["exam"]].append(e)
    report = {}
    for exam, es in sorted(by_exam.items()):
        def txt_of(e):
            return TEXT_DIR / exam / (Path(e["file"]).stem + ".txt")
        keys = [e for e in es if e["kind"] == "answer_key" and txt_of(e).exists()]
        qps = [e for e in es if e["kind"] == "question_paper" and txt_of(e).exists()]
        if not qps:
            continue
        clf = Classifier(exam)
        out_dir = PYQ_DIR / exam
        out_dir.mkdir(parents=True, exist_ok=True)
        report[exam] = []
        same = Counter((q["cycle"], q["paper"]) for q in qps)
        for qp in qps:
            qp = dict(qp)
            if same[(qp["cycle"], qp["paper"])] > 1:  # two booklets with the same title (e.g. RAS 2013)
                qp["uniq"] = __import__("hashlib").sha1(qp["url"].encode()).hexdigest()[:4]
            kd = match_key(exam, qp, keys)
            key, key_note = None, ""
            if kd and exam not in KEY_PARSERS:
                key_note = (f"{kd['url']} (not attached automatically: multi-set key layout; "
                            "map the booklet series by hand)")
                kd = None
            extra_note = ""
            if kd:
                sets = read_key(exam, txt_of(kd))
                bset = booklet_set(txt_of(qp), {k for k in sets if ":" not in k}) if exam == "ctet" else ""
                key = sets.get(bset or "") or (next(iter(sets.values())) if len(sets) == 1 else None)
                if exam == "ctet":
                    b = bset or "?"
                    if not bset:
                        extra_note = " (booklet set not recognised: answers not attached)"
                    key = {"bi": key or {}, "mono-en": sets.get(f"{b}:ENGLISH"), "mono-hi": sets.get(f"{b}:HINDI")}
                key_note = kd["url"] + (f" (set {bset})" if exam == "ctet" and bset else "") + extra_note
            if "Right Option Id" in txt_of(qp).read_text(encoding="utf-8", errors="replace"):
                qs, summ = build_cbt_paper(exam, qp, txt_of(qp), clf)
            else:
                qs, summ = build_paper(exam, qp, txt_of(qp), key, key_note, clf)
            name = re.sub(r"[^a-z0-9]+", "-", f"{qp['cycle']} {qp['paper']}".lower()).strip("-")
            if qp.get("uniq"):
                name += f"-{qp['uniq']}"
            if not qs:
                print(f"parse {exam}: {qp['cycle']} {qp['paper']}: no questions found")
                continue
            ids = Counter(q["id"] for q in qs)
            if any(v > 1 for v in ids.values()):  # two booklets of the same cycle: suffix
                pass
            out = out_dir / f"{name}.json"
            # keep ids unique across files of the same cycle (e.g. several sets)
            existing = {p.name for p in out_dir.glob("*.json")}
            out.write_text(json.dumps(qs, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            summ.update(file=str(out.relative_to(ROOT)), key=bool(key), key_url=kd["url"] if kd else None)
            report[exam].append(summ)
            print(f"parse {exam}: {qp['cycle']} | {qp['paper']}: {summ['questions']} questions, "
                  f"{summ.get('with_answer', 0)} with official answer, high={summ.get('high', 0)} "
                  f"medium={summ.get('medium', 0)} low={summ.get('low', 0)} -> {out.relative_to(ROOT)}")
    (ROOT / "output" / "reports").mkdir(parents=True, exist_ok=True)
    (ROOT / "output" / "reports" / "pyq-parse.json").write_text(json.dumps(report, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
