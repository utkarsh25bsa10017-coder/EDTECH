// What every admin page gets from the shell: the exam list, URL params for
// its filters, navigation, and cached API reads shared between pages.
import type { Row } from './util.ts';

export interface Stats {
  leads: number;
  students: number;
  attempts: number;
  passes: number;
  /** exam -> status -> count */
  questions: Record<string, Record<string, number>>;
}

export interface Ctx {
  exams: string[];
  /** The page's filter state, from the URL hash (#/page?key=value). */
  params: URLSearchParams;
  /** Updates the hash without reloading the page (filters, pagination). */
  setParams(p: Record<string, string | number | null | undefined>): void;
  go(hash: string): void;
  stats(force?: boolean): Promise<Stats>;
  leads(force?: boolean): Promise<Row[]>;
  attempts(force?: boolean): Promise<Row[]>;
  /** Re-reads stats and updates the sidebar counts. */
  refreshCounts(): void;
}

export interface PageHandle {
  /** Return true when the key was handled. */
  onKey?(e: KeyboardEvent): boolean;
  destroy?(): void;
}

export type Mount = (el: HTMLElement, ctx: Ctx) => PageHandle | void;

export function questionTotals(s: Stats, exam = '') {
  const t = { draft: 0, reviewed: 0, rejected: 0, total: 0 };
  for (const [ex, by] of Object.entries(s.questions ?? {})) {
    if (exam && ex !== exam) continue;
    for (const [st, n] of Object.entries(by)) {
      if (st === 'draft' || st === 'reviewed' || st === 'rejected') t[st] += n;
      t.total += n;
    }
  }
  return t;
}
