// Shared helpers for the admin console: escaping, formatting, icons, toast,
// and the small HTML builders every page uses (page header, badges, empty
// states, pagination). Everything returns HTML strings; values are escaped.
import { ApiError } from '../api.ts';

export type Row = Record<string, unknown>;

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/* ------------------------------------------------------------------ icons */
const PATHS = {
  home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.2A6.5 6.5 0 0 1 21.5 20"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="m9 15 2 2 4-4"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>',
  inbox: '<path d="M3 13h5l1.5 2.5h5L16 13h5"/><path d="M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
} as const;
export type IconName = keyof typeof PATHS;

export function icon(name: IconName, size = 20, cls = ''): string {
  return `<svg class="a-ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
}

/* ------------------------------------------------------------------ formatting */
let EXAM_NAMES: Record<string, string> = {};
export function setExamNames(m: Record<string, string>) {
  EXAM_NAMES = m;
}
export const examName = (slug: unknown) => EXAM_NAMES[String(slug)] ?? String(slug ?? '');

const nf = new Intl.NumberFormat('en-IN');
export const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? nf.format(n) : '–');

const df = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export const fullDate = (unix: number) => df.format(new Date(unix * 1000));

/** "just now", "5 min ago", "3 h ago", "yesterday", "12 Nov". */
export function relTime(unix: unknown): string {
  if (typeof unix !== 'number' || !unix) return '–';
  const s = Date.now() / 1000 - unix;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 2 * 86400) return 'yesterday';
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} days ago`;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(unix * 1000));
}

export const timeCell = (unix: unknown) =>
  typeof unix === 'number' && unix ? `<time datetime="${new Date(unix * 1000).toISOString()}" title="${esc(fullDate(unix))}">${esc(relTime(unix))}</time>` : '<span class="a-dim">–</span>';

export function phone(p: unknown): string {
  const d = String(p ?? '');
  return /^\d{10}$/.test(d) ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}

export function bi(v: unknown): { en: string; hi: string } {
  if (v && typeof v === 'object' && 'en' in (v as Row)) {
    const o = v as { en?: unknown; hi?: unknown };
    return { en: String(o.en ?? ''), hi: String(o.hi ?? o.en ?? '') };
  }
  const s = String(v ?? '');
  return { en: s, hi: s };
}

export function errMsg(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return 'Could not reach the API.';
    if (e.status === 401 || e.status === 403) return 'Not allowed. Sign in again.';
    return `Error ${e.status}: ${e.message}`;
  }
  if (e instanceof Error && e.message) return e.message;
  return 'Something went wrong.';
}

export function asList(data: unknown): Row[] {
  if (Array.isArray(data)) return data as Row[];
  if (data && typeof data === 'object' && Array.isArray((data as Row).items)) return (data as Row).items as Row[];
  return [];
}

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...a: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

/* ------------------------------------------------------------------ builders */
export interface Action {
  label: string;
  /** data-action value the page listens for, or an href. */
  action?: string;
  href?: string;
  icon?: IconName;
  primary?: boolean;
}

function actionHtml(a: Action): string {
  const cls = `a-btn${a.primary ? ' a-btn-primary' : ''}`;
  const inner = `${a.icon ? icon(a.icon, 18) : ''}<span>${esc(a.label)}</span>`;
  return a.href ? `<a class="${cls}" href="${esc(a.href)}">${inner}</a>` : `<button class="${cls}" type="button" data-action="${esc(a.action)}">${inner}</button>`;
}

export function pageHeader(title: string, sub: string, actions: Action[] = []): string {
  return `<header class="a-page-h">
    <div class="a-page-t"><h1 tabindex="-1">${esc(title)}</h1>${sub ? `<p class="a-page-sub">${sub}</p>` : ''}</div>
    ${actions.length ? `<div class="a-page-actions">${actions.map(actionHtml).join('')}</div>` : ''}
  </header>`;
}

const STATUS_TONE: Record<string, string> = { reviewed: 'ok', rejected: 'bad', draft: 'neutral' };
const STATUS_LABEL: Record<string, string> = { reviewed: 'Reviewed', rejected: 'Rejected', draft: 'Draft' };
export const statusLabel = (s: unknown) => STATUS_LABEL[String(s)] ?? String(s ?? '');

export function badge(text: string, tone: 'ok' | 'bad' | 'warn' | 'info' | 'neutral' = 'neutral'): string {
  return `<span class="a-badge a-badge-${tone}">${esc(text)}</span>`;
}
export function statusBadge(s: unknown): string {
  const k = String(s ?? '');
  return `<span class="a-badge a-badge-${STATUS_TONE[k] ?? 'neutral'} a-status" data-st>${esc(statusLabel(k))}</span>`;
}

export function emptyState(title: string, body: string, action?: Action): string {
  return `<div class="a-empty">${icon('inbox', 40, 'a-empty-ic')}<h2>${esc(title)}</h2><p>${esc(body)}</p>${action ? actionHtml(action) : ''}</div>`;
}

export function errorBox(e: unknown, retry = 'retry'): string {
  return `<div class="a-banner a-banner-bad" role="alert"><span>${esc(errMsg(e))}</span><button class="a-btn a-btn-sm" type="button" data-action="${retry}">Try again</button></div>`;
}

export const skeleton = (rows = 6) =>
  `<div class="a-skel" aria-busy="true" aria-label="Loading">${'<div class="a-skel-row"></div>'.repeat(rows)}</div>`;

/** Footer pager: "1–25 of 400" with previous/next buttons. */
export function pager(from: number, count: number, total: number | null, hasPrev: boolean, hasNext: boolean): string {
  const range = count ? `${num(from + 1)}–${num(from + count)}${total !== null ? ` of ${num(total)}` : ''}` : '';
  return `<div class="a-pager"><span class="a-pager-r">${range}</span>
    <div class="a-pager-b">
      <button class="a-btn a-btn-icon" type="button" data-page="prev" aria-label="Previous page"${hasPrev ? '' : ' disabled'}>${icon('left', 18)}</button>
      <button class="a-btn a-btn-icon" type="button" data-page="next" aria-label="Next page"${hasNext ? '' : ' disabled'}>${icon('right', 18)}</button>
    </div></div>`;
}

/** Filter tabs along the top of a card (Polaris index-table tabs). */
export function tabs(name: string, items: { value: string; label: string; count?: number | null }[], current: string): string {
  return `<div class="a-tabs" role="tablist" aria-label="${esc(name)}">${items
    .map(
      (t) =>
        `<button type="button" role="tab" class="a-tab" data-tab="${esc(t.value)}" aria-selected="${t.value === current}">${esc(t.label)}${
          t.count !== undefined && t.count !== null ? `<span class="a-tab-n">${num(t.count)}</span>` : ''
        }</button>`,
    )
    .join('')}</div>`;
}

export function examSelect(exams: string[], current: string, label = 'Exam'): string {
  return `<label class="a-select"><span class="sr-only">${esc(label)}</span><select name="exam"><option value="">All exams</option>${exams
    .map((x) => `<option value="${esc(x)}"${x === current ? ' selected' : ''}>${esc(examName(x))}</option>`)
    .join('')}</select>${icon('down', 16)}</label>`;
}

export function searchBox(placeholder: string, value: string): string {
  return `<label class="a-search">${icon('search', 18)}<span class="sr-only">${esc(placeholder)}</span><input type="search" name="q" placeholder="${esc(placeholder)}" value="${esc(value)}" autocomplete="off" spellcheck="false" /><kbd class="a-kbd a-search-k" aria-hidden="true">/</kbd></label>`;
}

/* ------------------------------------------------------------------ toast */
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string, opts: { error?: boolean; undo?: () => void } = {}) {
  const el = document.querySelector<HTMLElement>('[data-admin-toast]');
  if (!el) return;
  clearTimeout(toastTimer);
  el.className = `a-toast${opts.error ? ' a-toast-bad' : ''}`;
  el.innerHTML = `<span>${esc(msg)}</span>${opts.undo ? '<button type="button" class="a-toast-undo" data-undo>Undo</button>' : ''}<button type="button" class="a-toast-x" aria-label="Dismiss" data-dismiss>${icon('x', 16)}</button>`;
  el.hidden = false;
  const hide = () => {
    el.hidden = true;
    el.innerHTML = '';
  };
  el.querySelector('[data-dismiss]')!.addEventListener('click', hide);
  el.querySelector('[data-undo]')?.addEventListener('click', () => {
    hide();
    opts.undo!();
  });
  toastTimer = setTimeout(hide, opts.undo ? 7000 : 4000);
}

/** Runs async jobs with a small concurrency limit; returns per-job results. */
export async function pool<T, R>(items: T[], n: number, job: (t: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        out[i] = { status: 'fulfilled', value: await job(items[i]) };
      } catch (reason) {
        out[i] = { status: 'rejected', reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}
