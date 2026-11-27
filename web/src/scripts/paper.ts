// Shared client helpers for practice, mock test, OMR and booklet views.
// Free papers are embedded as <script type="application/json" id="paper-data">;
// paid papers are fetched from GET /api/papers/{exam}/{id}.
import { api, ApiError } from './api.ts';

export interface Bi {
  en: string;
  hi: string;
}

export interface Question {
  id: string;
  qid?: string;
  topic: Bi;
  difficulty?: 'easy' | 'medium' | 'hard';
  text: Bi;
  options: Bi[];
  answer: number;
  explanation: Bi;
}

export interface Section {
  id: string;
  name: Bi;
  questions: Question[];
}

export interface PaperData {
  id: string;
  exam: string;
  title: Bi;
  kind: 'free' | 'mock' | 'sample' | 'probable' | 'pyq';
  free: boolean;
  status?: 'draft' | 'reviewed';
  duration_minutes: number;
  marks_per_question: number;
  negative_marking: number;
  sections: Section[];
}

export interface Item {
  q: Question;
  section: Section;
  /** 0-based index across the whole paper. */
  i: number;
  /** 1-based number across the whole paper. */
  n: number;
}

export const LETTERS = ['A', 'B', 'C', 'D', 'E'];

export type LoadError = 'signin' | 'nopass' | 'notfound' | 'offline' | 'bad';

export class PaperLoadError extends Error {
  constructor(public kind: LoadError) {
    super(kind);
  }
}

function valid(p: unknown): p is PaperData {
  const x = p as PaperData;
  return !!x && typeof x.id === 'string' && Array.isArray(x.sections) && x.sections.every((s) => Array.isArray(s.questions));
}

/** Embedded paper if present, else the one named in ?exam=&paper= from the API. */
export async function loadPaper(): Promise<PaperData> {
  const el = document.getElementById('paper-data');
  if (el?.textContent) return JSON.parse(el.textContent) as PaperData;
  const qs = new URLSearchParams(location.search);
  const exam = qs.get('exam') ?? '';
  const id = qs.get('paper') ?? '';
  if (!/^[a-z0-9-]+$/.test(exam) || !/^[a-z0-9-]+$/.test(id)) throw new PaperLoadError('notfound');
  try {
    const p = await api<unknown>(`/api/papers/${exam}/${id}`);
    if (!valid(p)) throw new PaperLoadError('bad');
    return p;
  } catch (e) {
    if (e instanceof PaperLoadError) throw e;
    if (e instanceof ApiError) {
      if (e.status === 0) throw new PaperLoadError('offline');
      if (e.status === 401) throw new PaperLoadError('signin');
      if (e.status === 402 || e.status === 403) throw new PaperLoadError('nopass');
      if (e.status === 404) throw new PaperLoadError('notfound');
    }
    throw new PaperLoadError('bad');
  }
}

export function items(paper: PaperData): Item[] {
  let i = 0;
  return paper.sections.flatMap((section) => section.questions.map((q) => ({ q, section, i: i, n: ++i })));
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

/** Both languages as sibling elements; the UI language toggle shows one. */
export function bi(t: Bi, tag = 'span', cls = ''): string {
  const c = cls ? ` ${cls}` : '';
  if (t.en.trim() === t.hi.trim()) return `<${tag} class="${c.trim()}" lang="hi">${esc(t.hi)}</${tag}>`;
  return `<${tag} class="l-en${c}" lang="en">${esc(t.en)}</${tag}><${tag} class="l-hi${c}" lang="hi">${esc(t.hi)}</${tag}>`;
}

/** Both languages stacked (booklet and printed papers show Hindi and English together). */
export function both(t: Bi, cls = ''): string {
  if (t.en.trim() === t.hi.trim()) return `<span class="${cls}" lang="hi">${esc(t.hi)}</span>`;
  return `<span class="${cls} b-hi" lang="hi">${esc(t.hi)}</span><span class="${cls} b-en" lang="en">${esc(t.en)}</span>`;
}

export const tr = (en: string, hi: string): Bi => ({ en, hi });

export function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: progress lasts for this page only */
  }
}

export function forget(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function fmtTime(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Friendly message for a failed paper load. */
export function loadErrorHtml(kind: LoadError, exam: string, base: string): string {
  const msg: Record<LoadError, Bi> = {
    signin: tr('Sign in to open this paper. It is part of a paid pack.', 'यह प्रश्नपत्र खोलने के लिए साइन इन करें। यह पेड पैक का हिस्सा है।'),
    nopass: tr('This paper is part of a paid pack you have not unlocked yet.', 'यह प्रश्नपत्र उस पेड पैक का हिस्सा है जो अभी आपके खाते में नहीं है।'),
    notfound: tr('We could not find this paper.', 'यह प्रश्नपत्र नहीं मिला।'),
    offline: tr('Could not reach the server. Check your connection and try again.', 'सर्वर से संपर्क नहीं हो सका। इंटरनेट जांचकर फिर कोशिश करें।'),
    bad: tr('Something went wrong loading this paper. Please try again.', 'प्रश्नपत्र लोड करने में समस्या हुई। कृपया फिर कोशिश करें।'),
  };
  const examLink = /^[a-z0-9-]+$/.test(exam) ? `${base}/${exam}/` : `${base}/`;
  const actions: string[] = [];
  if (kind === 'signin') actions.push(`<a class="btn btn-primary" href="${base}/account/?next=${encodeURIComponent(location.pathname + location.search)}">${bi(tr('Sign in', 'साइन इन करें'))}</a>`);
  if (kind === 'nopass' || kind === 'signin') actions.push(`<a class="btn" href="${examLink}#pricing">${bi(tr('See packs', 'पैक देखें'))}</a>`);
  if (kind === 'offline' || kind === 'bad') actions.push(`<button class="btn btn-primary" type="button" onclick="location.reload()">${bi(tr('Try again', 'फिर कोशिश करें'))}</button>`);
  actions.push(`<a class="btn btn-quiet" href="${examLink}">${bi(tr('Back to the exam page', 'परीक्षा पेज पर लौटें'))}</a>`);
  return `<div class="panel load-error" role="alert"><p>${bi(msg[kind])}</p><div class="row-actions">${actions.join('')}</div></div>`;
}

export const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');
