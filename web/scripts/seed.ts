// Seed script: ingests scraper output (scraper/data/**/*.json, see
// scraper/SCHEMA.md), validates every record and writes the normalized
// content the site is built from into web/.content/.
//
//   node scripts/seed.ts [--strict] [--papers-dir DIR] [--out DIR]
//
// Invalid files are skipped with a reason; --strict (or SEED_STRICT=1) turns
// any skipped file into a non-zero exit.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  PAPER_KEYS,
  PaperSchema,
  QUESTION_KEYS,
  isOfficialUrl,
  summarize,
  type Catalog,
  type PaperRecord,
} from '../src/lib/schema.ts';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export interface SeedOptions {
  papersDir: string;
  outDir: string;
}

export interface SeedIssue {
  file: string;
  message: string;
}

export interface SeedReport {
  files: number;
  papers: number;
  questions: number;
  skipped: SeedIssue[];
  warnings: SeedIssue[];
}

async function listJson(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true, recursive: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => path.join(e.parentPath, e.name))
    .sort();
}

function unknownKeys(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const rec = raw as Record<string, unknown>;
  const extra = Object.keys(rec).filter((k) => !PAPER_KEYS.has(k));
  if (Array.isArray(rec.questions)) {
    const qExtra = new Set<string>();
    for (const q of rec.questions) {
      if (q && typeof q === 'object') {
        for (const k of Object.keys(q)) if (!QUESTION_KEYS.has(k)) qExtra.add(k);
      }
    }
    extra.push(...[...qExtra].map((k) => `questions[].${k}`));
  }
  return extra;
}

export async function seed({ papersDir, outDir }: SeedOptions): Promise<SeedReport> {
  const files = await listJson(papersDir);
  const report: SeedReport = { files: files.length, papers: 0, questions: 0, skipped: [], warnings: [] };
  const byId = new Map<string, { paper: PaperRecord; file: string }>();
  const rel = (f: string) => path.relative(papersDir, f);

  for (const file of files) {
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(file, 'utf8'));
    } catch (err) {
      report.skipped.push({ file: rel(file), message: `invalid JSON: ${(err as Error).message}` });
      continue;
    }

    const parsed = PaperSchema.safeParse(raw);
    if (!parsed.success) {
      report.skipped.push({ file: rel(file), message: z.prettifyError(parsed.error) });
      continue;
    }
    const paper = parsed.data;
    const warn = (message: string) => report.warnings.push({ file: rel(file), message });

    const extra = unknownKeys(raw);
    if (extra.length) warn(`ignored fields not in SCHEMA.md: ${extra.join(', ')}`);

    for (const key of ['paper_pdf', 'solution_pdf', 'source_page'] as const) {
      const url = paper[key];
      if (url && !isOfficialUrl(url)) warn(`${key} is not on a known official domain: ${url}`);
    }

    const expected = path.join(paper.board, String(paper.class), paper.subject_slug, `${paper.id}.json`);
    if (rel(file) !== expected) warn(`expected at ${expected}`);

    const prev = byId.get(paper.id);
    if (prev) {
      const keepNew = Date.parse(paper.scraped_at) >= Date.parse(prev.paper.scraped_at);
      warn(`duplicate id ${paper.id} (also in ${rel(prev.file)}); keeping the ${keepNew ? 'newer' : 'older'} copy from ${rel(keepNew ? file : prev.file)}`);
      if (!keepNew) continue;
    }
    byId.set(paper.id, { paper, file });
  }

  const papers = [...byId.values()].map((v) => v.paper).sort((a, b) => a.id.localeCompare(b.id));
  report.papers = papers.length;
  report.questions = papers.reduce((n, p) => n + p.questions.length, 0);

  await rm(outDir, { recursive: true, force: true });
  await mkdir(path.join(outDir, 'papers'), { recursive: true });
  await Promise.all(
    papers.map((p) => writeFile(path.join(outDir, 'papers', `${p.id}.json`), JSON.stringify(p))),
  );
  const catalog: Catalog = { generated_at: new Date().toISOString(), papers: papers.map(summarize) };
  await writeFile(path.join(outDir, 'catalog.json'), JSON.stringify(catalog));
  await writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  return report;
}

function argValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict') || process.env.SEED_STRICT === '1';
  const papersDir = path.resolve(
    argValue(args, '--papers-dir') ?? process.env.PAPERS_DIR ?? path.join(WEB_ROOT, '..', 'scraper', 'data'),
  );
  const outDir = path.resolve(argValue(args, '--out') ?? process.env.CONTENT_DIR ?? path.join(WEB_ROOT, '.content'));

  const report = await seed({ papersDir, outDir });

  for (const w of report.warnings) console.warn(`warn  ${w.file}: ${w.message}`);
  for (const s of report.skipped) console.error(`skip  ${s.file}:\n${s.message.replace(/^/gm, '      ')}`);
  console.log(
    `seed: ${report.papers} papers, ${report.questions} questions from ${report.files} files ` +
      `(${report.skipped.length} skipped, ${report.warnings.length} warnings)\n` +
      `      ${path.relative(process.cwd(), papersDir) || '.'} -> ${path.relative(process.cwd(), outDir) || '.'}`,
  );
  if (strict && report.skipped.length) {
    console.error('seed: --strict set and some files were skipped');
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
