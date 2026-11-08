import type { Board, PaperSummary } from './schema.ts';
import { classSlug } from './boards.ts';

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

export const boardUrl = (board: Board) => href(`/${board}/`);
export const classUrl = (board: Board, cls: number) => href(`/${board}/${classSlug(cls)}/`);
export const subjectUrl = (board: Board, cls: number, subject: string) =>
  href(`/${board}/${classSlug(cls)}/${subject}/`);

/** Last URL segment for a paper: the id without its board-class-subject prefix. */
export function paperSlug(p: Pick<PaperSummary, 'id' | 'board' | 'class' | 'subject_slug'>): string {
  const prefix = `${p.board}-${p.class}-${p.subject_slug}-`;
  return p.id.startsWith(prefix) && p.id.length > prefix.length ? p.id.slice(prefix.length) : p.id;
}

export const paperUrl = (p: PaperSummary) =>
  href(`/${p.board}/${classSlug(p.class)}/${p.subject_slug}/${paperSlug(p)}/`);

/** Official PDF link, opened at a page when the viewer supports #page=. */
export function pdfAt(url: string, page: number | null): string {
  return page ? `${url}#page=${page}` : url;
}
