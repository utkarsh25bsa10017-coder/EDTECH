// Login / register (phone + password) and the account page with passes.
import { api, ApiError, clearSession, me, saveSession, type Session } from './api.ts';
import { config } from './config.ts';
import { normalisePhone } from './lead.ts';

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');
const bi = (en: string, hi: string) => `<span class="l-en" lang="en">${en}</span><span class="l-hi" lang="hi">${hi}</span>`;
const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function safeNext(): string | null {
  const n = new URLSearchParams(location.search).get('next');
  return n && n.startsWith('/') && !n.startsWith('//') ? n : null;
}

function errText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return bi('Could not reach the server. Check your connection.', 'सर्वर से संपर्क नहीं हो सका। इंटरनेट जांचें।');
    if (e.status === 401 || e.status === 403) return bi('Wrong phone number or password.', 'फ़ोन नंबर या पासवर्ड गलत है।');
    if (e.status === 409) return bi('An account with this phone number already exists. Please sign in.', 'इस फ़ोन नंबर से खाता पहले से है। कृपया साइन इन करें।');
    if (e.status === 429) return bi('Too many tries. Wait a minute and try again.', 'बहुत अधिक प्रयास। एक मिनट रुककर फिर कोशिश करें।');
  }
  return bi('Something went wrong. Please try again.', 'कुछ गड़बड़ हुई। कृपया फिर कोशिश करें।');
}

export async function initAccount() {
  const root = document.querySelector<HTMLElement>('[data-account]');
  if (!root) return;
  const authEl = root.querySelector<HTMLElement>('[data-auth]')!;
  const meEl = root.querySelector<HTMLElement>('[data-me]')!;
  const loading = root.querySelector<HTMLElement>('[data-loading]')!;

  async function showMe() {
    const m = await me();
    loading.hidden = true;
    if (!m) {
      authEl.hidden = false;
      meEl.hidden = true;
      return;
    }
    const next = safeNext();
    if (next) {
      location.href = next;
      return;
    }
    authEl.hidden = true;
    meEl.hidden = false;
    const exams = config().exams;
    const passes = (m.passes ?? []).filter(Boolean);
    meEl.querySelector('[data-me-name]')!.textContent = m.name || '';
    meEl.querySelector('[data-me-phone]')!.textContent = m.phone || '';
    meEl.querySelector('[data-me-passes]')!.innerHTML = passes.length
      ? passes
          .map((p) => {
            const n = exams[p] ?? { en: p, hi: p };
            return `<li><a class="pass-item" href="${BASE}/${esc(p)}/"><span>${bi(esc(n.en), esc(n.hi))}</span><span class="tag tag-ok">${bi('Active', 'सक्रिय')}</span></a></li>`;
          })
          .join('')
      : `<li class="muted">${bi('No packs yet. Your purchases appear here once the payment is confirmed.', 'अभी कोई पैक नहीं। भुगतान की पुष्टि होते ही आपकी खरीद यहां दिखेगी।')}</li>`;
    const admin = meEl.querySelector<HTMLElement>('[data-me-admin]');
    if (admin) admin.hidden = m.role !== 'admin';
  }

  // Tabs
  const tabs = root.querySelectorAll<HTMLButtonElement>('[data-auth-tab]');
  const forms = root.querySelectorAll<HTMLFormElement>('[data-auth-form]');
  const pick = (name: string) => {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.authTab === name)));
    forms.forEach((f) => (f.hidden = f.dataset.authForm !== name));
  };
  tabs.forEach((t) => t.addEventListener('click', () => pick(t.dataset.authTab!)));
  if (location.hash === '#register') pick('register');

  for (const form of forms) {
    const err = form.querySelector<HTMLElement>('.form-err')!;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const kind = form.dataset.authForm;
      err.hidden = true;
      let body: Record<string, string>;
      if (kind === 'register') {
        const phone = normalisePhone(String(fd.get('phone') ?? ''));
        const password = String(fd.get('password') ?? '');
        const name = String(fd.get('name') ?? '').trim();
        if (!name) return fail(bi('Please enter your name.', 'कृपया अपना नाम लिखें।'));
        if (!phone) return fail(bi('Enter a valid 10-digit Indian mobile number.', 'सही 10 अंकों का भारतीय मोबाइल नंबर लिखें।'));
        if (password.length < 8) return fail(bi('Use at least 8 characters for the password.', 'पासवर्ड में कम से कम 8 अक्षर रखें।'));
        body = { name, phone, password };
      } else {
        const raw = String(fd.get('username') ?? '').trim();
        body = { username: normalisePhone(raw) ?? raw, password: String(fd.get('password') ?? '') };
        if (!body.username || !body.password) return fail(bi('Enter your phone number and password.', 'फ़ोन नंबर और पासवर्ड लिखें।'));
      }
      const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
      btn.disabled = true;
      try {
        const s = await api<Session>(kind === 'register' ? '/api/auth/register' : '/api/auth/login', { body });
        if (s?.token) saveSession(s);
        loading.hidden = false;
        authEl.hidden = true;
        await showMe();
      } catch (e2) {
        fail(errText(e2));
      } finally {
        btn.disabled = false;
      }
      function fail(html: string) {
        err.innerHTML = html;
        err.hidden = false;
      }
    });
  }

  root.querySelector('[data-logout]')?.addEventListener('click', async () => {
    try {
      await api('/api/auth/logout', { method: 'POST', body: {} });
    } catch {
      /* sign out locally anyway */
    }
    clearSession();
    location.reload();
  });

  await showMe();
}
