// Admin console shell. Nothing is shown until GET /api/auth/me says role
// "admin"; credentials are checked by the server only. Pages live in
// ./admin/: Home, Leads, Questions, Attempts, routed by the URL hash
// (#/questions?status=draft) so reloads and the back button keep the view.
import { api, ApiError, clearSession, me, saveSession, type Session } from './api.ts';
import { bindPhoneInput, loginPhone } from './phone.ts';
import { questionTotals, type Ctx, type Mount, type PageHandle, type Stats } from './admin/ctx.ts';
import { mountHome } from './admin/home.ts';
import { mountAttempts, mountLeads } from './admin/leads.ts';
import { mountQuestions } from './admin/questions.ts';
import { asList, errMsg, num, setExamNames } from './admin/util.ts';

const PAGES: Record<string, { title: string; mount: Mount }> = {
  home: { title: 'Home', mount: mountHome },
  leads: { title: 'Leads', mount: mountLeads },
  questions: { title: 'Questions', mount: mountQuestions },
  attempts: { title: 'Attempts', mount: mountAttempts },
};

const TTL = 60_000;
function cached<T>(load: () => Promise<T>) {
  let at = 0;
  let p: Promise<T> | null = null;
  return (force = false): Promise<T> => {
    if (!p || force || Date.now() - at > TTL) {
      at = Date.now();
      const next = load();
      p = next;
      next.catch(() => {
        if (p === next) p = null;
      });
    }
    return p;
  };
}

function parseHash(): { page: string; params: URLSearchParams } {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const page = PAGES[path] ? path : 'home';
  return { page, params: new URLSearchParams(query) };
}

const isField = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || !!t.closest('input, select, textarea'));
const isControl = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest('button, a, summary, [role="tab"], label');

export async function initAdmin() {
  const found = document.querySelector<HTMLElement>('[data-admin]');
  if (!found) return;
  const root: HTMLElement = found;
  const loginEl = root.querySelector<HTMLElement>('[data-admin-login]')!;
  const app = root.querySelector<HTMLElement>('[data-admin-app]')!;
  const status = root.querySelector<HTMLElement>('[data-admin-status]')!;
  const loginForm = loginEl.querySelector<HTMLFormElement>('form')!;
  const loginErr = loginEl.querySelector<HTMLElement>('.form-err')!;
  const view = root.querySelector<HTMLElement>('[data-admin-page]')!;
  const keys = root.querySelector<HTMLDialogElement>('[data-admin-keys]')!;
  const exams = (root.dataset.exams ?? '').split(',').filter(Boolean);
  try {
    setExamNames(JSON.parse(root.dataset.examNames ?? '{}'));
  } catch {
    /* slugs are shown instead */
  }

  /* ---------------------------------------------------------------- data */
  const stats = cached(() => api<Stats>('/api/admin/stats'));
  const leads = cached(async () => asList(await api('/api/admin/leads?limit=500')));
  const attempts = cached(async () => asList(await api('/api/admin/attempts?limit=500')));

  function setCount(name: string, n: number | null) {
    const b = root.querySelector<HTMLElement>(`[data-count="${name}"]`);
    if (!b) return;
    b.textContent = n ? num(n) : '';
    b.hidden = !n;
  }
  function refreshCounts(force = true) {
    stats(force)
      .then((s) => setCount('questions', questionTotals(s).draft))
      .catch(() => setCount('questions', null));
  }

  /* ---------------------------------------------------------------- router */
  let current: PageHandle | void;
  let currentPage = '';
  let fromNav = false;

  function route() {
    const { page, params } = parseHash();
    current?.destroy?.();
    current = undefined;
    currentPage = page;
    root.querySelectorAll<HTMLAnchorElement>('[data-nav]').forEach((a) => {
      if (a.dataset.nav === page) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = `${PAGES[page].title} · Admin | Prashnottar`;
    const el = document.createElement('div');
    el.className = `a-view a-view-${page}`;
    view.replaceChildren(el);
    const ctx: Ctx = {
      exams,
      params,
      setParams(p) {
        const q = new URLSearchParams(parseHash().params);
        for (const [k, v] of Object.entries(p)) {
          if (v === null || v === undefined || v === '') q.delete(k);
          else q.set(k, String(v));
        }
        const s = q.toString();
        history.replaceState(null, '', `#/${page}${s ? `?${s}` : ''}`);
      },
      go: (h) => {
        location.hash = h;
      },
      stats,
      leads,
      attempts,
      refreshCounts: () => refreshCounts(false),
    };
    current = PAGES[page].mount(el, ctx);
    if (fromNav) {
      window.scrollTo(0, 0);
      el.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
    }
    fromNav = false;
  }

  root.querySelectorAll<HTMLAnchorElement>('[data-nav]').forEach((a) =>
    a.addEventListener('click', (e) => {
      fromNav = true;
      // Clicking the section you are in resets its filters.
      if (a.dataset.nav === currentPage) {
        e.preventDefault();
        history.replaceState(null, '', a.getAttribute('href'));
        route();
      }
    }),
  );
  window.addEventListener('hashchange', () => {
    if (!app.hidden) route();
  });

  /* ---------------------------------------------------------------- keyboard */
  let gPending = 0;
  document.addEventListener('keydown', (e) => {
    if (app.hidden || keys.open) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isField(e.target)) {
      if (e.key === 'Escape' && e.target instanceof HTMLInputElement) e.target.blur();
      return;
    }
    if ((e.key === ' ' || e.key === 'Enter') && isControl(e.target)) return;
    if (gPending && Date.now() - gPending < 1200) {
      gPending = 0;
      const to = ({ h: 'home', l: 'leads', q: 'questions', a: 'attempts' } as Record<string, string>)[e.key];
      if (to) {
        e.preventDefault();
        fromNav = true;
        location.hash = `#/${to}`;
        return;
      }
    }
    if (e.key === 'g') {
      gPending = Date.now();
      return;
    }
    if (e.key === '/') {
      const s = view.querySelector<HTMLInputElement>('input[type=search]');
      if (s) {
        e.preventDefault();
        s.focus();
        s.select();
      }
      return;
    }
    if (e.key === '?') {
      e.preventDefault();
      keys.showModal();
      return;
    }
    if (current?.onKey?.(e)) e.preventDefault();
  });
  keys.addEventListener('click', (e) => {
    if (e.target === keys || (e.target as HTMLElement).closest('[data-close-keys]')) keys.close();
  });
  root.querySelectorAll('[data-open-keys]').forEach((b) => b.addEventListener('click', () => keys.showModal()));

  /* ---------------------------------------------------------------- auth */
  async function gate() {
    status.hidden = false;
    const m = await me();
    status.hidden = true;
    if (m?.role === 'admin') {
      loginEl.hidden = true;
      app.hidden = false;
      const name = m.name || 'Admin';
      root.querySelectorAll('[data-admin-who]').forEach((n) => (n.textContent = name));
      root.querySelectorAll('[data-admin-initial]').forEach((n) => (n.textContent = name.trim().charAt(0).toUpperCase() || 'A'));
      refreshCounts(false);
      route();
    } else {
      app.hidden = true;
      view.replaceChildren();
      loginEl.hidden = false;
      document.title = 'Admin sign in | Prashnottar';
      if (m) {
        loginErr.textContent = 'This account is not an admin.';
        loginErr.hidden = false;
      }
      loginForm.querySelector<HTMLInputElement>('input[name=phone]')!.focus();
    }
  }

  bindPhoneInput(loginForm.querySelector<HTMLInputElement>('input[name=phone]')!);
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    loginErr.hidden = true;
    const btn = loginForm.querySelector<HTMLButtonElement>('button[type=submit]')!;
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      const phone = loginPhone(String(fd.get('phone') ?? ''));
      if (!phone) throw new Error('Enter the 10-digit admin mobile number.');
      const s = await api<Session>('/api/auth/login', { body: { phone, password: String(fd.get('password') ?? '') } });
      if (s?.token) saveSession(s);
      loginForm.reset();
      await gate();
    } catch (e2) {
      loginErr.textContent = e2 instanceof ApiError && (e2.status === 401 || e2.status === 403) ? 'Wrong phone number or password.' : errMsg(e2);
      loginErr.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  });

  root.querySelectorAll('[data-admin-logout]').forEach((b) =>
    b.addEventListener('click', async () => {
      try {
        await api('/api/auth/logout', { method: 'POST', body: {} });
      } catch {
        /* ignore */
      }
      clearSession();
      location.reload();
    }),
  );

  await gate();
}
