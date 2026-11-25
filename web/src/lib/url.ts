import type { Exam } from './exams.ts';

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** Prefixes the configured base path; page paths always end in a slash. */
export function href(path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const cut = p.search(/[?#]/);
  const pathname = cut < 0 ? p : p.slice(0, cut);
  const rest = cut < 0 ? '' : p.slice(cut);
  const isPage = !/\.[a-z0-9]+$/i.test(pathname) && !pathname.endsWith('/');
  return BASE + (isPage ? `${pathname}/` : pathname) + rest;
}

export const examUrl = (exam: Exam) => href(`/${exam}/`);
export const paperUrl = (exam: Exam, paper: string) => href(`/${exam}/${paper}/`);
export const practiceUrl = (exam: Exam, paper: string) => href(`/${exam}/${paper}/practice/`);
export const testUrl = (exam: Exam, paper: string) => href(`/${exam}/${paper}/test/`);
export const pricingUrl = () => href('/pricing/');
