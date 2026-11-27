// API client. Base URL: window.PQ_API_BASE (the native shell may inject it) >
// localStorage "pq-api" > PUBLIC_API_BASE at build time > same origin.
// Auth: Bearer token from login (native app) plus the pr_session cookie the
// server sets for same-origin use.

declare global {
  interface Window {
    PQ_API_BASE?: string;
  }
}

const TOKEN = 'pq-token';
const USER = 'pq-user';

export function apiBase(): string {
  let base = '';
  try {
    base = window.PQ_API_BASE || localStorage.getItem('pq-api') || '';
  } catch {
    base = window.PQ_API_BASE || '';
  }
  if (!base) base = import.meta.env.PUBLIC_API_BASE || '';
  return base.replace(/\/+$/, '');
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN);
  } catch {
    return null;
  }
}

export interface Session {
  token: string;
  role: 'admin' | 'student';
  name: string;
}

export function saveSession(s: Session) {
  try {
    localStorage.setItem(TOKEN, s.token);
    localStorage.setItem(USER, JSON.stringify({ role: s.role, name: s.name }));
  } catch {
    /* private mode: the cookie still works on the same origin */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(USER);
  } catch {
    /* ignore */
  }
}

export function cachedUser(): { role: string; name: string } | null {
  try {
    const raw = localStorage.getItem(USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** status 0 = network error / API unreachable. */
export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; timeout?: number } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeout ?? 20000);
  let res: Response;
  try {
    res = await fetch(apiBase() + path, {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: apiBase() ? 'include' : 'same-origin',
      signal: ctrl.signal,
    });
  } catch {
    throw new ApiError(0, 'network');
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = data && typeof data === 'object' ? (data as { error?: unknown }).error : undefined;
    const msg = (err !== undefined && err !== null ? String(err) : '') || res.statusText || 'error';
    throw new ApiError(res.status, msg);
  }
  if (data === null && text) throw new ApiError(res.status, 'bad json');
  return data as T;
}

export interface Me {
  role: 'admin' | 'student';
  name: string;
  phone: string;
  passes: string[];
}

export async function me(): Promise<Me | null> {
  try {
    return await api<Me>('/api/auth/me');
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) clearSession();
    return null;
  }
}

/* ------------------------------------------------- attempts (offline queue) */

const QUEUE = 'pq-attempt-queue';

export interface Attempt {
  exam: string;
  paper: string;
  answers: (number | null)[];
  score: number;
  total: number;
  topics: Record<string, [number, number]>;
}

function readQueue(): Attempt[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(q: Attempt[]) {
  try {
    if (q.length) localStorage.setItem(QUEUE, JSON.stringify(q.slice(-20)));
    else localStorage.removeItem(QUEUE);
  } catch {
    /* ignore */
  }
}

/** Posts the attempt; if the API is unreachable it is queued and retried on the next page load. */
export async function postAttempt(a: Attempt) {
  try {
    await api('/api/attempts', { body: a });
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return; // rejected: don't retry
    writeQueue([...readQueue(), a]);
  }
}

export async function flushAttempts() {
  const q = readQueue();
  if (!q.length) return;
  const left: Attempt[] = [];
  for (const a of q) {
    try {
      await api('/api/attempts', { body: a });
    } catch (e) {
      if (!(e instanceof ApiError && e.status >= 400 && e.status < 500)) left.push(a);
    }
  }
  writeQueue(left);
}
