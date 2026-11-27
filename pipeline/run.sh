#!/usr/bin/env bash
# Prashnottar content pipeline: one entry point.
#
#   pipeline/run.sh validate            # deterministic checks -> output/reports/validate.{md,json}
#   pipeline/run.sh review [args]       # filter agent (needs ANTHROPIC_API_KEY); args go to review.py
#   pipeline/run.sh analyze             # topic weights -> output/reports/<exam>-weights.json
#   pipeline/run.sh assemble [args]     # papers -> web/src/data/papers/<exam>/free-01.json, content/papers/<exam>/
#   pipeline/run.sh scrape [args]       # download official PYQs -> scraper/pdfs, scraper/manifest.json
#   pipeline/run.sh ocr [args]          # PDFs -> scraper/text (Docker image prashnottar-ocr)
#   pipeline/run.sh parse [args]        # text -> content/pyq/<exam>/*.json
#   pipeline/run.sh pyq                 # scrape + ocr + parse
#   pipeline/run.sh test                # unit tests (mocked Claude client)
#   pipeline/run.sh all                 # validate, review (skipped without a key), analyze, assemble
#
# Extra arguments after the step name are passed to the script, e.g.
#   pipeline/run.sh assemble --exam ctet
#   pipeline/run.sh review --exam bpsc-tre --batch
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

if [[ -f .env ]]; then set -a; . ./.env; set +a; fi

PY="$ROOT/.venv/bin/python"
if [[ ! -x "$PY" ]]; then
  UV="$(command -v uv || echo "$HOME/.local/bin/uv")"
  if [[ ! -x "$UV" ]]; then
    echo "installing uv to ~/.local/bin ..." >&2
    curl -LsSf https://astral.sh/uv/install.sh | sh >&2 || { echo "could not install uv" >&2; exit 1; }
    UV="$HOME/.local/bin/uv"
  fi
  "$UV" venv "$ROOT/.venv" --python 3.12 >&2 && \
  "$UV" pip install --python "$PY" -r "$ROOT/pipeline/requirements.txt" >&2 || exit 1
fi

step="${1:-}"; shift || true
case "$step" in
  validate) exec "$PY" pipeline/validate.py "$@" ;;
  review)   exec "$PY" pipeline/review.py "$@" ;;
  analyze)  exec "$PY" pipeline/analyze.py "$@" ;;
  assemble) exec "$PY" pipeline/assemble.py "$@" ;;
  scrape)   exec "$PY" -m scraper.pyq.scrape "$@" ;;
  ocr)      exec "$PY" -m scraper.pyq.ocr "$@" ;;
  parse)    exec "$PY" -m scraper.pyq.parse "$@" ;;
  pyq)
    "$PY" -m scraper.pyq.scrape && "$PY" -m scraper.pyq.ocr && "$PY" -m scraper.pyq.parse ;;
  test)     exec "$PY" -m unittest discover -s pipeline/tests -v ;;
  all)
    "$PY" pipeline/validate.py || exit $?
    if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
      "$PY" pipeline/review.py || echo "review did not finish (see above); continuing" >&2
    else
      echo "review: skipped (ANTHROPIC_API_KEY not set; run 'pipeline/run.sh review' for instructions)"
    fi
    "$PY" pipeline/analyze.py || exit $?
    "$PY" pipeline/assemble.py || exit $?
    ;;
  *) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
