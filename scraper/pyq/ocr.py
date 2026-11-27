"""Turn downloaded PDFs into text: scraper/text/<exam>/<name>.txt

    .venv/bin/python -m scraper.pyq.ocr [--exam ras] [--force] [--jobs 3]

Question papers from these commissions are bilingual in two columns (RPSC:
Hindi left, English right; CTET: English left, Hindi right), so each page is
handled as two halves. For every half (or whole page, for answer keys):
1. the PDF's own text layer is used when it is clean Unicode;
2. otherwise (scans, legacy Kruti Dev / Shivaji style Hindi fonts) the region
   is OCRed with the prashnottar-ocr Docker image (pdftoppm 300 dpi grey +
   tesseract hin+eng), with memory/CPU caps and no network.

Output format: a header line per region, then its text:
    @@ page=3 col=L src=ocr conf=78.4
A sidecar <name>.json records the method and mean confidence per region.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SCRAPER = Path(__file__).resolve().parent.parent
TEXT_DIR = SCRAPER / "text"
MANIFEST = SCRAPER / "manifest.json"
IMAGE = "prashnottar-ocr"
DOCKERFILE_DIR = SCRAPER / "docker"
DPI = 300
VERSION = 2  # bump to force re-processing after changes here

_DEVA = re.compile(r"[ऀ-ॿ]")
_LEGACY = re.compile(r"[ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]")
# Legacy-font Hindi extracted as Latin shows clusters like "H$m", "{Z", "àíZ"
_LEGACY_TOKENS = re.compile(r"(\w\$\w|\{[A-Za-z]|[A-Za-z]>|\b[A-Z][a-z]?[A-Z][a-z]?[A-Z]\b|²|¶)")


def log(*a):
    print(*a, flush=True)


def usable(text: str, min_chars: int = 60, numeric_ok: bool = False) -> tuple[bool, str]:
    chars = len(re.sub(r"\s+", "", text))
    if chars < min_chars:
        return False, "little or no text layer"
    letters = len(re.findall(r"[^\W\d_]", text))
    if not numeric_ok and letters < max(min_chars * 0.5, chars * 0.4):
        return False, "text layer has no letters (unmapped font glyphs)"
    if text.count("�") > chars * 0.01:
        return False, "replacement characters"
    if len(_LEGACY.findall(text)) > chars * 0.01:
        return False, "legacy (non-Unicode) Hindi font"
    if not _DEVA.search(text) and len(_LEGACY_TOKENS.findall(text)) > chars * 0.01:
        return False, "Latin-encoded Hindi"
    return True, "ok"


def ensure_image() -> bool:
    if subprocess.run(["docker", "image", "inspect", IMAGE], capture_output=True).returncode == 0:
        return True
    log(f"building Docker image {IMAGE} from {DOCKERFILE_DIR} ...")
    return subprocess.run(["docker", "build", "-t", IMAGE, str(DOCKERFILE_DIR)]).returncode == 0


def run_ocr(pdf: Path, regions: list[dict], jobs: int) -> dict[str, tuple[str, float]]:
    """regions: {key, page (1-based), box (x0,y0,x1,y1 in PDF points) or None, psm}.
    Returns key -> (text, mean confidence)."""
    if not regions:
        return {}
    with tempfile.TemporaryDirectory(prefix="ocr-") as td:
        td = Path(td)
        try:  # re-save with pymupdf: repairs broken xref tables that poppler rejects
            import pymupdf
            d = pymupdf.open(pdf)
            d.save(td / "in.pdf", garbage=3, deflate=True)
            d.close()
        except Exception:
            shutil.copyfile(pdf, td / "in.pdf")
        lines = ["#!/bin/sh", "set -e", "mkdir -p /tmp/o /w/out", "cd /tmp/o"]
        jobs_txt = []
        for r in regions:
            k, p = r["key"], r["page"]
            crop = ""
            if r.get("box"):
                s = DPI / 72.0
                x0, y0, x1, y1 = r["box"]
                crop = f"-x {int(x0 * s)} -y {int(y0 * s)} -W {int((x1 - x0) * s)} -H {int((y1 - y0) * s)}"
            lines.append(f"pdftoppm -r {DPI} -gray -f {p} -l {p} -singlefile {crop} /w/in.pdf {k}")
            jobs_txt.append(f"{k} {r.get('psm', 4)}")
        (td / "jobs.txt").write_text("\n".join(jobs_txt) + "\n")
        lines.append(f"cat /w/jobs.txt | xargs -P {jobs} -n 2 sh -c "
                     "'OMP_THREAD_LIMIT=1 tesseract $0.pgm /w/out/$0 -l hin+eng --psm $1 txt tsv >/dev/null 2>&1'")
        (td / "run.sh").write_text("\n".join(lines) + "\n")
        cmd = ["docker", "run", "--rm", "--network", "none", f"--memory={500 + 400 * jobs}m", f"--cpus={jobs}",
               "--user", f"{os.getuid()}:{os.getgid()}", "-v", f"{td}:/w", IMAGE, "sh", "/w/run.sh"]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            raise RuntimeError(f"OCR container failed for {pdf.name}: {r.stderr[-500:]}")
        out = {}
        for reg in regions:
            k = reg["key"]
            txt_f, tsv_f = td / "out" / f"{k}.txt", td / "out" / f"{k}.tsv"
            text = txt_f.read_text(errors="replace") if txt_f.exists() else ""
            vals = []
            if tsv_f.exists():
                for line in tsv_f.read_text(errors="replace").splitlines()[1:]:
                    parts = line.split("\t")
                    if len(parts) == 12 and parts[11].strip():
                        try:
                            c = float(parts[10])
                        except ValueError:
                            continue
                        if c >= 0:
                            vals.append(c)
            out[k] = (text, round(sum(vals) / len(vals), 1) if vals else 0.0)
        return out


def two_column(doc) -> bool:
    """True when most pages have a gutter: text blocks on both sides of the middle
    and almost none crossing it (or a scan, where we assume the bilingual layout)."""
    votes = 0
    pages = list(range(min(len(doc), 8)))
    for i in pages:
        pg = doc[i]
        mid = pg.rect.width / 2
        blocks = [b for b in pg.get_text("blocks") if b[4].strip()]
        if not blocks:
            votes += 1  # scanned page: RPSC/CTET booklets are two-column
            continue
        left = sum(1 for b in blocks if b[2] < mid + 5)
        right = sum(1 for b in blocks if b[0] > mid - 5)
        cross = sum(1 for b in blocks if b[0] < mid - 30 and b[2] > mid + 30)
        if left >= 3 and right >= 3 and cross <= max(1, len(blocks) // 10):
            votes += 1
    return votes >= len(pages) / 2


def out_base(entry: dict) -> Path:
    return TEXT_DIR / entry["exam"] / Path(entry["file"]).stem


def process(entry: dict, force: bool, jobs: int) -> dict:
    import pymupdf
    pdf = SCRAPER / entry["file"]
    base = out_base(entry)
    meta_f = base.with_suffix(".json")
    if meta_f.exists() and base.with_suffix(".txt").exists() and not force:
        meta = json.loads(meta_f.read_text())
        if meta.get("sha256") == entry.get("sha256") and meta.get("version") == VERSION:
            return meta
    base.parent.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(pdf)
    try:
        layout = "two-column" if entry["kind"] == "question_paper" and two_column(doc) else "single"
        regions, ocr_needed = [], []
        for i, pg in enumerate(doc):
            W, H = pg.rect.width, pg.rect.height
            if layout == "two-column":
                boxes = {"L": (0, 0, W / 2, H), "R": (W / 2, 0, W, H)}
            else:
                boxes = {"F": None}
            for col, box in boxes.items():
                clip = pymupdf.Rect(*box) if box else None
                txt = pg.get_text("text", clip=clip, sort=True)
                ok, why = usable(txt, 40 if entry["kind"] == "answer_key" else 60,
                                  numeric_ok=entry["kind"] == "answer_key")
                if ok and re.search(r"Right Option Id|Question Id\s*:", txt):
                    ok, why = False, "CBT export: question text is in images"
                reg = {"key": f"p{i + 1:03d}{col}", "page": i + 1, "col": col, "box": box,
                       "psm": 4 if layout == "two-column" else 6}
                if ok:
                    reg.update(src="text", text=txt, conf=None)
                else:
                    reg.update(src="ocr", why=why)
                    ocr_needed.append(reg)
                regions.append(reg)
    finally:
        doc.close()
    if ocr_needed:
        log(f"  OCR {entry['exam']} {Path(entry['file']).name}: {len(ocr_needed)} of {len(regions)} regions "
            f"({ocr_needed[0]['why']})")
        res = run_ocr(pdf, ocr_needed, jobs)
        for reg in ocr_needed:
            reg["text"], reg["conf"] = res.get(reg["key"], ("", 0.0))
    with open(base.with_suffix(".txt"), "w", encoding="utf-8") as f:
        for reg in regions:
            conf = "" if reg["conf"] is None else f" conf={reg['conf']}"
            f.write(f"@@ page={reg['page']} col={reg['col']} src={reg['src']}{conf}\n{reg['text'].rstrip()}\n")
    confs = [r["conf"] for r in regions if r["conf"] is not None]
    meta = {
        "version": VERSION, "layout": layout,
        "method": "text-layer" if not ocr_needed else ("ocr" if len(ocr_needed) == len(regions) else "mixed"),
        "regions": len(regions), "ocr_regions": len(ocr_needed),
        "confidence": round(sum(confs) / len(confs), 1) if confs else None,
        "region_confidence": {r["key"]: r["conf"] for r in regions if r["conf"] is not None},
        "sha256": entry.get("sha256"), "pdf": entry["file"], "url": entry["url"], "kind": entry["kind"],
        "exam": entry["exam"], "cycle": entry["cycle"], "paper": entry["paper"], "year": entry.get("year"),
    }
    meta_f.write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    return meta


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exam", nargs="*")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--jobs", type=int, default=3, help="tesseract processes in parallel (keep small)")
    ap.add_argument("--kind", choices=["question_paper", "answer_key"])
    a = ap.parse_args(argv)
    if not MANIFEST.exists():
        log("no manifest yet: run python -m scraper.pyq.scrape first")
        return 1
    m = json.loads(MANIFEST.read_text())
    todo = [e for e in m["entries"] if e.get("status") == "ok" and (not a.exam or e["exam"] in a.exam)
            and (not a.kind or e["kind"] == a.kind) and (SCRAPER / e["file"]).exists()]
    # a key is only useful next to its question paper
    qp_cycles = {(e["exam"], e["cycle"]) for e in todo if e["kind"] == "question_paper"}
    skipped = [e for e in todo if e["kind"] == "answer_key" and (e["exam"], e["cycle"]) not in qp_cycles]
    todo = [e for e in todo if e not in skipped]
    if skipped:
        log(f"skipping {len(skipped)} answer keys without a downloaded question paper")
    # keys first: they are small and tell the parser which papers are worth OCRing
    todo.sort(key=lambda e: (e["kind"] != "answer_key", e["exam"] not in ("ras", "ctet"), e["exam"], -(e.get("year") or 0)))
    if not ensure_image():
        log("Docker image unavailable; regions that need OCR will fail")
    done = 0
    for e in todo:
        try:
            meta = process(e, a.force, a.jobs)
            done += 1
            log(f"  {meta['method']:10s} {meta['layout']:10s} conf={meta.get('confidence')} {e['exam']} {Path(e['file']).name}")
        except Exception as ex:  # one bad PDF must not stop the batch
            log(f"  FAILED {e['file']}: {ex}")
    log(f"ocr: {done}/{len(todo)} documents have text under {TEXT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
