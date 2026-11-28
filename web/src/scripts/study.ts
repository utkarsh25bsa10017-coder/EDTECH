// Shared bits for topic practice, the mock hub and the progress page.
import { api, ApiError } from './api.ts';
import { BASE, bi, esc, tr, type Bi } from './paper.ts';

export { BASE, bi, esc, tr, api, ApiError };
export type { Bi };

/* ------------------------------------------------------------------ API shapes */

export interface TopicRow {
  topic: Bi;
  count: number;
  free: number;
}
export interface SubjectRow {
  subject: Bi;
  count: number;
  topics: TopicRow[];
}
export interface TopicsResponse {
  exam: string;
  locked: boolean;
  free_per_topic: number;
  total: number;
  subjects: SubjectRow[];
}

export interface MyAttempt {
  id: number;
  exam: string;
  paper: string;
  score: number;
  total: number;
  topics: Record<string, [number, number]> | null;
  created_at: number;
}

export interface ListedPaper {
  id: string;
  kind: string;
  title: Bi | string;
  free: boolean;
  status?: string;
  questions: number;
  duration_minutes: number;
}

/* ------------------------------------------------------------------ urls */

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Attempt id for a topic-practice session: topic:<subject-slug>[:<topic-slug>], at most 64 chars. */
export function topicPaperId(subject: string | null, topic: string | null): string {
  const parts = [subject ? slug(subject) : '', topic ? slug(topic) : ''].filter(Boolean);
  return `topic:${parts.join(':') || 'mixed'}`.slice(0, 64);
}

export const isTopicPaper = (paper: string) => paper.startsWith('topic:');

export function pickerHref(exam: string, subject?: string | null): string {
  return `${BASE}/${exam}/practice/${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
}

export function sessionHref(exam: string, o: { subject?: string | null; topic?: string | null; offset?: number }): string {
  const q = new URLSearchParams();
  if (o.subject) q.set('subject', o.subject);
  if (o.topic) q.set('topic', o.topic);
  if (o.offset) q.set('offset', String(o.offset));
  return `${BASE}/${exam}/practice/topic/?${q}`;
}

export const pricingHref = () => `${BASE}/pricing/`;
export const signInHref = (next = location.pathname + location.search) => `${BASE}/account/?next=${encodeURIComponent(next)}`;

/* ------------------------------------------------------------------ labels */

export const KIND: Record<string, Bi> = {
  free: tr('Free set', 'मुफ़्त सेट'),
  mock: tr('Full mock', 'फ़ुल मॉक'),
  sample: tr('Sample paper', 'सैंपल पेपर'),
  probable: tr('Most-probable set', 'संभावित प्रश्न सेट'),
  pyq: tr('Past paper', 'पिछला प्रश्नपत्र'),
};

export const asBi = (t: Bi | string | undefined | null, fallback = ''): Bi =>
  !t ? { en: fallback, hi: fallback } : typeof t === 'string' ? { en: t, hi: t } : t;

export function durationBi(minutes: number): Bi {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const en = [h ? `${h} hr` : '', m ? `${m} min` : ''].filter(Boolean).join(' ') || '–';
  const hi = [h ? `${h} घंटे` : '', m ? `${m} मिनट` : ''].filter(Boolean).join(' ') || '–';
  return { en, hi };
}

export const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

/** Score as text: whole numbers stay whole, others get up to 2 decimals. */
export const num = (n: number) => String(Math.round(n * 100) / 100);

export function dateBi(unix: number): Bi {
  const d = new Date(unix * 1000);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return { en: d.toLocaleDateString('en-IN', opts), hi: d.toLocaleDateString('hi-IN', opts) };
}

/** Exam short names from the build-time config. */
export function examName(exam: string): Bi {
  try {
    const c = JSON.parse(document.getElementById('pq-config')?.textContent || '{}') as { exams?: Record<string, Bi> };
    return c.exams?.[exam] ?? { en: exam, hi: exam };
  } catch {
    return { en: exam, hi: exam };
  }
}

/** Signed-in user's attempts (newest first), or null when signed out. */
export async function myAttempts(exam?: string, limit = 500): Promise<MyAttempt[] | null> {
  try {
    const q = new URLSearchParams({ limit: String(limit) });
    if (exam) q.set('exam', exam);
    return await api<MyAttempt[]>(`/api/me/attempts?${q}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

/** Per-topic [right, total] summed over attempts. */
export function topicTotals(list: MyAttempt[]): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  for (const a of list) {
    for (const [t, v] of Object.entries(a.topics ?? {})) {
      if (!Array.isArray(v) || v.length < 2) continue;
      const cur = out.get(t) ?? [0, 0];
      cur[0] += Number(v[0]) || 0;
      cur[1] += Number(v[1]) || 0;
      out.set(t, cur);
    }
  }
  return out;
}

export function errorPanel(e: unknown): string {
  const offline = e instanceof ApiError && e.status === 0;
  const msg = offline
    ? tr('Could not reach the server. Check your connection and try again.', 'सर्वर से संपर्क नहीं हो सका। इंटरनेट जांचकर फिर कोशिश करें।')
    : tr('Something went wrong. Please try again.', 'कुछ गड़बड़ हुई। कृपया फिर कोशिश करें।');
  return `<div class="panel load-error" role="alert"><p>${bi(msg)}</p><div class="row-actions"><button class="btn btn-primary" type="button" onclick="location.reload()">${bi(tr('Try again', 'फिर कोशिश करें'))}</button></div></div>`;
}
