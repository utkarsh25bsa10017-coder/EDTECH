// Login / register (phone + password) and the account page with passes.
import { api, ApiError, clearSession, me, saveSession, type Session } from './api.ts';
import { config } from './config.ts';
import { normalisePhone } from './lead.ts';
import { bindPhoneInput, loginPhone } from './phone.ts';

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

  // Sign in <-> create account
  const views = root.querySelectorAll<HTMLElement>('[data-view]');
  const forms = root.querySelectorAll<HTMLFormElement>('[data-auth-form]');
  const pick = (name: string) => {
    views.forEach((v) => (v.hidden = v.dataset.view !== name));
    forms.forEach((f) => f.querySelector<HTMLElement>('.form-err')!.hidden = true);
    root.querySelector<HTMLInputElement>(`[data-view="${name}"] input`)?.focus();
    history.replaceState(null, '', name === 'register' ? '#register' : location.pathname + location.search);
  };
  root.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.go!)));
  if (location.hash === '#register') views.forEach((v) => (v.hidden = v.dataset.view !== 'register'));

  root.querySelectorAll<HTMLInputElement>('input[name=phone]').forEach(bindPhoneInput);
  root.querySelectorAll<HTMLButtonElement>('[data-pw-toggle]').forEach((b) => {
    b.addEventListener('click', () => {
      const input = b.parentElement!.querySelector('input')!;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.textContent = show ? 'Hide' : 'Show';
      b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  for (const form of forms) {
    const err = form.querySelector<HTMLElement>('.form-err')!;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const kind = form.dataset.authForm;
      err.hidden = true;
      let body: Record<string, string>;
      const phoneEl = form.querySelector<HTMLInputElement>('input[name=phone]')!;
      const pwEl = form.querySelector<HTMLInputElement>('input[name=password]')!;
      const password = String(fd.get('password') ?? '');
      if (kind === 'register') {
        const phone = normalisePhone(String(fd.get('phone') ?? ''));
        const name = String(fd.get('name') ?? '').trim();
        if (!name) return fail(bi('Please enter your name.', 'कृपया अपना नाम लिखें।'), form.querySelector('input[name=name]'));
        if (!phone) return fail(bi('Enter a valid 10-digit mobile number (starts with 6, 7, 8 or 9).', 'सही 10 अंकों का मोबाइल नंबर लिखें (6, 7, 8 या 9 से शुरू)।'), phoneEl);
        if (password.length < 8) return fail(bi('Use at least 8 characters for the password.', 'पासवर्ड में कम से कम 8 अक्षर रखें।'), pwEl);
        body = { name, phone, password };
      } else {
        const phone = loginPhone(String(fd.get('phone') ?? ''));
        if (!phone) return fail(bi('Enter your 10-digit mobile number.', 'अपना 10 अंकों का मोबाइल नंबर लिखें।'), phoneEl);
        if (!password) return fail(bi('Enter your password.', 'पासवर्ड लिखें।'), pwEl);
        body = { phone, password };
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
      function fail(html: string, el?: HTMLInputElement | null) {
        err.innerHTML = html;
        err.hidden = false;
        if (el) {
          el.setAttribute('aria-invalid', 'true');
          el.focus();
        }
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
