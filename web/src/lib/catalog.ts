// Build-time access to the content written by scripts/seed.ts.
import fs from 'node:fs';
import path from 'node:path';
import type { Board, Catalog, Kind, PaperRecord, PaperSummary } from './schema.ts';
import { BOARDS } from './schema.ts';
import { KIND_ORDER, LANG_ORDER, subjectName, type Bi } from './boards.ts';

const CONTENT_DIR = path.resolve(process.cwd(), process.env.CONTENT_DIR ?? '.content');

let cached: Catalog | null = null;

function load(): Catalog {
  if (cached && !import.meta.env.DEV) return cached;
  const file = path.join(CONTENT_DIR, 'catalog.json');
  if (!fs.existsSync(file)) {
    throw new Error(`No content found at ${file}. Run \`npm run seed\` (or \`npm run build\`, which seeds first).`);
  }
  cached = JSON.parse(fs.readFileSync(file, 'utf8')) as Catalog;
  return cached;
}

export function allPapers(): PaperSummary[] {
  return load().papers;
}

export function loadPaper(id: string): PaperRecord {
  return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'papers', `${id}.json`), 'utf8')) as PaperRecord;
}

/** Newest year first, then board paper before sample/specimen/model, then medium and set. */
export function comparePapers(a: PaperSummary, b: PaperSummary): number {
  return (
    b.year - a.year ||
    KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
    LANG_ORDER.indexOf(a.lang) - LANG_ORDER.indexOf(b.lang) ||
    (a.variant ?? '').localeCompare(b.variant ?? '', 'en', { numeric: true })
  );
}

export function papersWhere(filter: { board?: Board; cls?: number; subject?: string }): PaperSummary[] {
  return allPapers()
    .filter(
      (p) =>
        (!filter.board || p.board === filter.board) &&
        (!filter.cls || p.class === filter.cls) &&
        (!filter.subject || p.subject_slug === filter.subject),
    )
    .sort(comparePapers);
}

export interface SubjectEntry {
  slug: string;
  name: Bi;
  count: number;
  minYear: number;
  maxYear: number;
  kinds: Kind[];
  withAnswers: number;
}

export function subjectsFor(board: Board, cls: number): SubjectEntry[] {
  const map = new Map<string, SubjectEntry>();
  for (const p of papersWhere({ board, cls })) {
    const e = map.get(p.subject_slug) ?? {
      slug: p.subject_slug,
      name: subjectName(p),
      count: 0,
      minYear: p.year,
      maxYear: p.year,
      kinds: [],
      withAnswers: 0,
    };
    e.count++;
    e.minYear = Math.min(e.minYear, p.year);
    e.maxYear = Math.max(e.maxYear, p.year);
    if (!e.kinds.includes(p.kind)) e.kinds.push(p.kind);
    if (p.solution_count > 0 || p.solution_pdf) e.withAnswers++;
    map.set(p.subject_slug, e);
  }
  return [...map.values()].sort((a, b) => a.name.en.localeCompare(b.name.en));
}

export function subjectPairs(): { board: Board; cls: number; subject: string }[] {
  const seen = new Set<string>();
  const out: { board: Board; cls: number; subject: string }[] = [];
  for (const p of allPapers()) {
    const key = `${p.board}/${p.class}/${p.subject_slug}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ board: p.board, cls: p.class, subject: p.subject_slug });
    }
  }
  return out;
}

export interface Totals {
  papers: number;
  questions: number;
  answers: number;
  subjects: number;
  byBoard: Record<Board, number>;
}

export function totals(): Totals {
  const papers = allPapers();
  const byBoard = Object.fromEntries(BOARDS.map((b) => [b, 0])) as Record<Board, number>;
  const subjects = new Set<string>();
  let questions = 0;
  let answers = 0;
  for (const p of papers) {
    byBoard[p.board]++;
    subjects.add(`${p.board}/${p.class}/${p.subject_slug}`);
    questions += p.question_count;
    answers += p.solution_count;
  }
  return { papers: papers.length, questions, answers, subjects: subjects.size, byBoard };
}

export function recentPapers(limit: number): PaperSummary[] {
  return [...allPapers()]
    .sort((a, b) => Date.parse(b.scraped_at) - Date.parse(a.scraped_at) || comparePapers(a, b))
    .slice(0, limit);
}

/** Subject names keyed by slug, for client-side labels (search filters). */
export function subjectNames(): Record<string, Bi> {
  const out: Record<string, Bi> = {};
  for (const p of allPapers()) out[p.subject_slug] ??= subjectName(p);
  return out;
}
