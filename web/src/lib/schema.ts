// Validation for the scraper output contract (scraper/SCHEMA.md).
// Shared by the seed script (run directly by Node) and the Astro site, so
// imports must keep explicit `.ts` extensions and erasable-only syntax.
import { z } from 'zod';

export const BOARDS = ['cbse', 'icse', 'isc', 'up', 'bihar'] as const;
export const KINDS = ['pyq', 'sample', 'specimen', 'model'] as const;
export const LANGS = ['en', 'hi', 'bi'] as const;
export const EXTRACTIONS = ['full', 'questions', 'pdf-only'] as const;

export type Board = (typeof BOARDS)[number];
export type Kind = (typeof KINDS)[number];
export type Lang = (typeof LANGS)[number];
export type Extraction = (typeof EXTRACTIONS)[number];

export const BOARD_CLASSES: Record<Board, readonly number[]> = {
  cbse: [9, 10, 11, 12],
  icse: [9, 10],
  isc: [11, 12],
  up: [9, 10, 11, 12],
  bihar: [9, 10, 11, 12],
};

// Mirrors common.ALLOWED_DOMAINS. Scrapers may justify extra board-run hosts,
// so a miss here is a warning, not a rejection.
export const OFFICIAL_DOMAINS = [
  'cbseacademic.nic.in',
  'cbse.gov.in',
  'cbse.nic.in',
  'cisce.org',
  'upmsp.edu.in',
  'upmspresults.up.nic.in',
  'biharboardonline.bihar.gov.in',
  'biharboardonline.com',
  'biharboardonline.org',
];

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase slug');
const text = z.string().trim().min(1);
// Empty strings from scrapers mean "absent".
const optionalText = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() ? v.trim() : null));
const httpUrl = z.url({ protocol: /^https?$/ });
const optionalNumber = z
  .number()
  .positive()
  .nullish()
  .transform((v) => v ?? null);

export const QuestionSchema = z.object({
  number: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(text),
  section: optionalText,
  marks: z
    .number()
    .nonnegative()
    .nullish()
    .transform((v) => v ?? null),
  text,
  solution: optionalText,
  has_figure: z.boolean().nullish().transform((v) => v ?? false),
  page: z.number().int().positive().nullish().transform((v) => v ?? null),
});

export const PaperSchema = z
  .object({
    id: slug,
    board: z.enum(BOARDS),
    class: z.number().int(),
    subject_slug: slug,
    subject_name: z.object({
      en: text,
      hi: optionalText,
    }),
    year: z.number().int().min(1990).max(2100),
    session: optionalText,
    kind: z.enum(KINDS),
    lang: z.enum(LANGS),
    variant: optionalText,
    title: text,
    source_page: httpUrl,
    paper_pdf: httpUrl,
    solution_pdf: httpUrl.nullish().transform((v) => v ?? null),
    duration_minutes: optionalNumber,
    max_marks: optionalNumber,
    extraction: z.enum(EXTRACTIONS),
    questions: z.array(QuestionSchema).nullish().transform((v) => v ?? []),
    scraped_at: z.iso.datetime({ offset: true }),
  })
  .superRefine((p, ctx) => {
    if (!BOARD_CLASSES[p.board].includes(p.class)) {
      ctx.addIssue({
        code: 'custom',
        path: ['class'],
        message: `class ${p.class} is not offered by board "${p.board}" (expected ${BOARD_CLASSES[p.board].join(', ')})`,
      });
    }
  })
  .transform((p) => ({
    ...p,
    // A pdf-only record must never surface half-extracted text.
    questions: p.extraction === 'pdf-only' ? [] : p.questions,
  }));

export type QuestionRecord = z.output<typeof QuestionSchema>;
export type PaperRecord = z.output<typeof PaperSchema>;

export const PAPER_KEYS = new Set([
  'id', 'board', 'class', 'subject_slug', 'subject_name', 'year', 'session', 'kind', 'lang',
  'variant', 'title', 'source_page', 'paper_pdf', 'solution_pdf', 'duration_minutes',
  'max_marks', 'extraction', 'questions', 'scraped_at',
]);
export const QUESTION_KEYS = new Set([
  'number', 'section', 'marks', 'text', 'solution', 'has_figure', 'page',
]);

export interface PaperSummary extends Omit<PaperRecord, 'questions'> {
  question_count: number;
  solution_count: number;
  figure_count: number;
}

export interface Catalog {
  generated_at: string;
  papers: PaperSummary[];
}

export function summarize(p: PaperRecord): PaperSummary {
  const { questions, ...rest } = p;
  return {
    ...rest,
    question_count: questions.length,
    solution_count: questions.filter((q) => q.solution).length,
    figure_count: questions.filter((q) => q.has_figure).length,
  };
}

export function isOfficialUrl(url: string): boolean {
  const host = new URL(url).hostname.toLowerCase();
  return OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
}
