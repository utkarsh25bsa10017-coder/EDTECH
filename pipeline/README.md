# Content pipeline

Turns the question bank (`content/bank/<exam>/`) and official past papers into checked, assembled papers.
Formats and rules: `docs/ARCHITECTURE.md` and `web/src/data/PAPER_FORMAT.md`.

Everything runs from the repo root through one entry point. On first use it creates `.venv` with `uv`:

```bash
pipeline/run.sh validate     # deterministic checks
pipeline/run.sh review       # LLM filter agent (needs ANTHROPIC_API_KEY)
pipeline/run.sh analyze      # topic weights from PYQs (or syllabus fallback)
pipeline/run.sh assemble     # free set, mocks, sample, most-probable paper
pipeline/run.sh all          # validate, review (skipped without a key), analyze, assemble

pipeline/run.sh pyq          # scrape + ocr + parse official past papers
pipeline/run.sh test         # unit tests (the reviewer runs against a mocked client)
```

Arguments after the step name go to the script, for example `pipeline/run.sh assemble --exam ctet`.
Every step can be rerun. Other agents may still be writing the bank, so rerun after they finish.

## Steps

| Step | Script | Reads | Writes |
|---|---|---|---|
| validate | `validate.py` | `content/bank/**`, `content/pyq/**` | `output/reports/validate.{md,json}` |
| review | `review.py` | draft questions | `output/reviews/<exam>.jsonl`; updates `ai_checked` / `status` in the bank |
| analyze | `analyze.py` | `content/pyq/<exam>`, bank, `_pattern.md` | `output/reports/<exam>-weights.json` |
| assemble | `assemble.py` | bank (not `rejected`), weights | `web/src/data/papers/<exam>/free-01.json` (public), `content/papers/<exam>/{mock-NN,sample-01,probable-01}.json` |
| scrape | `scraper/pyq/scrape.py` | commission websites | `scraper/pdfs/<exam>/`, `scraper/manifest.json` |
| ocr | `scraper/pyq/ocr.py` | PDFs | `scraper/text/<exam>/*.txt` (+ `.json` with method and confidence) |
| parse | `scraper/pyq/parse.py` | text + official keys | `content/pyq/<exam>/*.json` |

### validate
Checks schema, 4–5 options, a valid answer index, distinct options, non-empty `en`/`hi`, Devanagari in `hi`
(English-language items excepted), explanation present, unique ids, `variant_of` targets, and near-duplicates.
Two items count as near-duplicates when their normalised token sets are at least 0.85 similar. Passage items
are compared on the question after the shared passage. Same-exam duplicates are errors unless `variant_of`
links them. Duplicates across bundled exams, or a generated item close to a PYQ, are warnings. The report
also counts coverage per exam by subject, topic, difficulty, type and status. Add `--strict` to exit 1 on errors.

### review (filter agent)
For each `draft` question, Claude judges: is the keyed answer correct, is there exactly one best answer, is it
unambiguous, is it accurate and current (BNS not IPC, and so on), is the language right in both languages,
and does it fit the exam. The verdict comes back as structured output (`Verdict` in `review.py`):

- `accept`: stays `draft`, gets `"ai_checked": true`.
- `fix`: the corrected question replaces the old one, with `"ai_fixed": true`. The original is kept in the JSONL. Use `--no-apply-fixes` to record without changing anything.
- `reject`: `status` becomes `rejected`.

`reviewed` is never set automatically; a human expert sets it (admin API `PATCH /api/admin/questions/{id}`).
Reruns skip questions already reviewed in their current form.

```bash
export ANTHROPIC_API_KEY=...                    # or put it in .env (gitignored)
pipeline/run.sh review --exam ctet --limit 10   # try a few first
pipeline/run.sh review                          # everything, live
pipeline/run.sh review --exam ctet --batch      # Message Batches API, 50% cost, usually < 1 h
pipeline/run.sh review --exam ctet --collect msgbatch_...   # pick up a batch later
REVIEW_MODEL=claude-opus-5-5                    # default model; override if needed
pipeline/run.sh review --include-pyq            # also check parsed PYQs
```

Retry rule: network errors and HTTP 408/409/429/5xx/529 wait 10 s and retry in a loop. A 400, 401, 403 or
404 stops the run with a clear message. Without a key the script prints setup instructions and exits 2
without changing anything.

### analyze
Works out the share of PYQ questions per subject and topic, year by year, with a trend for each, and
compares the result with the bank's mix (coverage score, under-covered subjects, topic gaps). An exam
needs at least 30 parsed and classified PYQs. Below that, subject weights fall back to the split in
`content/bank/<exam>/_pattern.md`, or the defaults in `patterns.py` when that file has none. Topic weights
then follow the bank's topic mix. The report states which source it used.

### assemble
Built for every exam:
- `free-01`: 20 mixed, stand-alone, easy or medium questions (`kind: "free"`, `free: true`). It avoids questions the paid papers use.
- `mock-NN`: full papers in the exam's pattern length, as many as the bank supports. No mock reuses more than 20% of its questions from earlier mocks (`--max-overlap`).
- `sample-01`: one sample paper.
- `probable-01`: subjects and topics chosen in proportion to the analyze weights, favouring high-frequency topics. The paper's `assembly.weights` says how the weights were derived.

Section sizes follow `patterns.py`: the exam's official split, plus question count, duration, negative marking
and options taken from `_pattern.md` where it states them. If the bank lacks a subject, its share is
redistributed and the paper's `assembly.notes` says so. Passage and poem items stay together, and a variant
is kept apart from its original. Selection ranks questions by a hash of seed, paper and id. The same bank
gives the same papers every run, and new questions only shift a few picks. Each question keeps its bank id
as `qid`. A paper's `status` is `reviewed` only when every question in it is reviewed.

## PYQ scraper (`scraper/pyq/`)
- `scrape.py` downloads official question papers and answer keys. Sources are the commission sites, then the Wayback Machine copy of a commission page, then `scraper/pyq/secondary.json`. That file lists public pages hosting the commission's own PDFs, each with a reason it counts as official.
  - Politeness: robots.txt is respected, requests to one host are 2–5 s apart, and the User-Agent is generic.
  - Retry rule: transient errors wait 10 s, up to 30 tries per URL; other 4xx are recorded. A host whose first request fails 30 times is marked down for the rest of the run.
  - Every document is recorded in `scraper/manifest.json`: exam, cycle, paper, kind, URL, sha256, status, error.
- `ocr.py` uses the PDF's text layer when it is clean Unicode. Otherwise it OCRs with the `prashnottar-ocr` image (`scraper/docker/Dockerfile`: tesseract hin+eng, poppler, ocrmypdf), with memory and CPU caps and no network.
- `parse.py` splits the text into questions and options and attaches answers from the official key. It writes bank-schema items (`source: "pyq"`, `pyq_ref`, `status: "draft"`) to `content/pyq/<exam>/`. Low-quality OCR is marked `"ocr_confidence": "low"` instead of guessed. Subjects and topics are assigned from the nearest bank question (`topic_source: "auto-nn"`) until someone sets them by hand.

`scraper/pdfs/`, `scraper/text/`, `content/pyq/`, `content/papers/` and `output/` are gitignored.
