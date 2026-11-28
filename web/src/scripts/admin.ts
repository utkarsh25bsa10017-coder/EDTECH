// Admin console. Nothing is shown until GET /api/auth/me says role "admin".
// Credentials are checked by the server only; none live in this file.
import { api, ApiError, clearSession, me, saveSession, type Session } from './api.ts';
import { bindPhoneInput, loginPhone } from './phone.ts';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

type Row = Record<string, unknown>;

function cell(v: unknown): string {
  if (v === null || v === undefined) return '<span class="muted">–</span>';
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('en' in o && 'hi' in o) return `${esc(o.en)}<br><span class="muted" lang="hi">${esc(o.hi)}</span>`;
    const j = JSON.stringify(v);
    return `<code>${esc(j.length > 120 ? `${j.slice(0, 117)}…` : j)}</code>`;
  }
  return esc(v);
}

function asList(data: unknown): Row[] {
  if (Array.isArray(data)) return data as Row[];
  if (data && typeof data === 'object') {
    for (const k of ['items', 'rows', 'data', 'leads', 'attempts', 'questions']) {
      const v = (data as Row)[k];
      if (Array.isArray(v)) return v as Row[];
    }
  }
  return [];
}

function table(rows: Row[], prefer: string[] = []): string {
  if (!rows.length) return '<p class="muted">Nothing here yet.</p>';
  const keys = new Set<string>();
  for (const r of rows.slice(0, 50)) Object.keys(r).forEach((k) => keys.add(k));
  const cols = [...prefer.filter((k) => keys.has(k)), ...[...keys].filter((k) => !prefer.includes(k))];
  return `<div class="table-wrap"><table class="data"><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${cols.map((c) => `<td>${cell(r[c])}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div>`;
}

function csv(rows: Row[]): string {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const q = (v: unknown) => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...rows.map((r) => keys.map((k) => q(r[k])).join(','))].join('\n');
}

function statsHtml(data: unknown): string {
  if (!data || typeof data !== 'object') return '<p class="muted">No stats.</p>';
  const tiles: string[] = [];
  const blocks: string[] = [];
  for (const [k, v] of Object.entries(data as Row)) {
    if (typeof v === 'number' || typeof v === 'string') tiles.push(`<div class="stat"><span class="stat-v">${esc(v)}</span><span class="stat-l">${esc(k.replace(/_/g, ' '))}</span></div>`);
    else if (Array.isArray(v)) blocks.push(`<h3>${esc(k.replace(/_/g, ' '))}</h3>${table(v as Row[])}`);
    else if (v && typeof v === 'object') {
      const entries = Object.entries(v as Row);
      const nested = entries.some(([, x]) => x && typeof x === 'object');
      if (nested) {
        const rows = entries.map(([name, x]) => ({ name, ...(x && typeof x === 'object' ? (x as Row) : { value: x }) }));
        blocks.push(`<h3>${esc(k.replace(/_/g, ' '))}</h3>${table(rows, ['name'])}`);
      } else {
        blocks.push(`<h3>${esc(k.replace(/_/g, ' '))}</h3>${table(entries.map(([name, value]) => ({ name, value })))}`);
      }
    }
  }
  return `${tiles.length ? `<div class="stats">${tiles.join('')}</div>` : ''}${blocks.join('')}`;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 0) return 'Could not reach the API.';
    if (e.status === 401 || e.status === 403) return 'Not allowed. Sign in again.';
    return `Error ${e.status}: ${e.message}`;
  }
  if (e instanceof Error && e.message) return e.message;
  return 'Something went wrong.';
}

export async function initAdmin() {
  const found = document.querySelector<HTMLElement>('[data-admin]');
  if (!found) return;
  const root: HTMLElement = found;
  const loginEl = root.querySelector<HTMLElement>('[data-admin-login]')!;
  const app = root.querySelector<HTMLElement>('[data-admin-app]')!;
  const status = root.querySelector<HTMLElement>('[data-admin-status]')!;
  const loginForm = loginEl.querySelector<HTMLFormElement>('form')!;
  const loginErr = loginEl.querySelector<HTMLElement>('.form-err')!;

  async function gate() {
    status.textContent = 'Checking…';
    status.hidden = false;
    const m = await me();
    status.hidden = true;
    if (m?.role === 'admin') {
      loginEl.hidden = true;
      app.hidden = false;
      root.querySelector('[data-admin-who]')!.textContent = m.name || 'admin';
      void openTab('stats');
    } else {
      app.hidden = true;
      app.querySelectorAll('[data-pane]').forEach((p) => (p.innerHTML = ''));
      loginEl.hidden = false;
      if (m) {
        loginErr.textContent = 'This account is not an admin.';
        loginErr.hidden = false;
      }
    }
  }

  bindPhoneInput(loginForm.querySelector<HTMLInputElement>('input[name=phone]')!);
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    loginErr.hidden = true;
    const btn = loginForm.querySelector<HTMLButtonElement>('button')!;
    btn.disabled = true;
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
    }
  });

  root.querySelector('[data-admin-logout]')!.addEventListener('click', async () => {
    try {
      await api('/api/auth/logout', { method: 'POST', body: {} });
    } catch {
      /* ignore */
    }
    clearSession();
    location.reload();
  });

  /* ---------------------------------------------------------------- tabs */
  const tabs = root.querySelectorAll<HTMLButtonElement>('[data-tab]');
  tabs.forEach((t) => t.addEventListener('click', () => void openTab(t.dataset.tab!)));

  async function openTab(name: string) {
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    root.querySelectorAll<HTMLElement>('[data-pane]').forEach((p) => (p.hidden = p.dataset.pane !== name));
    const pane = root.querySelector<HTMLElement>(`[data-pane="${name}"]`)!;
    if (name === 'stats') await loadStats(pane);
    if (name === 'leads') await loadLeads(pane);
    if (name === 'questions') await loadQuestions(pane);
    if (name === 'attempts') await loadAttempts(pane);
  }

  async function loadStats(pane: HTMLElement) {
    pane.innerHTML = '<p class="muted">Loading…</p>';
    try {
      pane.innerHTML = statsHtml(await api('/api/admin/stats'));
    } catch (e) {
      pane.innerHTML = `<p class="form-err">${esc(errMsg(e))}</p>`;
    }
  }

  const examOptions = () => (root.dataset.exams ?? '').split(',').filter(Boolean).map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join('');

  async function loadLeads(pane: HTMLElement) {
    if (!pane.dataset.built) {
      pane.dataset.built = '1';
      pane.innerHTML = `<form class="filters" data-f><label class="inline-field"><span>Exam</span><select name="exam"><option value="">All</option>${examOptions()}</select></label>
        <label class="inline-field"><span>Limit</span><input name="limit" type="number" value="200" min="1" max="5000" /></label>
        <button class="btn" type="submit">Load</button><button class="btn btn-quiet" type="button" data-csv>Download CSV</button></form><div data-out></div>`;
      pane.querySelector('form')!.addEventListener('submit', (e) => {
        e.preventDefault();
        void loadLeads(pane);
      });
      pane.querySelector('[data-csv]')!.addEventListener('click', () => {
        const rows = (pane as HTMLElement & { _rows?: Row[] })._rows ?? [];
        const blob = new Blob([csv(rows)], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    }
    const out = pane.querySelector<HTMLElement>('[data-out]')!;
    const fd = new FormData(pane.querySelector('form')!);
    const qs = new URLSearchParams();
    if (fd.get('exam')) qs.set('exam', String(fd.get('exam')));
    qs.set('limit', String(fd.get('limit') || 200));
    out.innerHTML = '<p class="muted">Loading…</p>';
    try {
      const rows = asList(await api(`/api/admin/leads?${qs}`));
      (pane as HTMLElement & { _rows?: Row[] })._rows = rows;
      out.innerHTML = `<p class="muted small">${rows.length} leads</p>${table(rows, ['created_at', 'phone', 'name', 'exam', 'score', 'total', 'source'])}`;
    } catch (e) {
      out.innerHTML = `<p class="form-err">${esc(errMsg(e))}</p>`;
    }
  }

  async function loadAttempts(pane: HTMLElement) {
    pane.innerHTML = '<p class="muted">Loading…</p>';
    try {
      const rows = asList(await api('/api/admin/attempts?limit=200'));
      pane.innerHTML = `<p class="muted small">${rows.length} attempts</p>${table(rows, ['created_at', 'exam', 'paper', 'score', 'total', 'user', 'name', 'phone'])}`;
    } catch (e) {
      pane.innerHTML = `<p class="form-err">${esc(errMsg(e))}</p>`;
    }
  }

  const PAGE = 25;
  async function loadQuestions(pane: HTMLElement, offset = 0) {
    if (!pane.dataset.built) {
      pane.dataset.built = '1';
      pane.innerHTML = `<form class="filters" data-f>
        <label class="inline-field"><span>Exam</span><select name="exam"><option value="">All</option>${examOptions()}</select></label>
        <label class="inline-field"><span>Status</span><select name="status"><option value="draft">Draft</option><option value="reviewed">Reviewed</option><option value="rejected">Rejected</option><option value="">All</option></select></label>
        <label class="inline-field grow"><span>Search</span><input name="q" type="search" placeholder="id, text, topic" /></label>
        <button class="btn" type="submit">Filter</button></form><div data-out></div><div class="row-actions" data-pager></div>`;
      pane.querySelector('form')!.addEventListener('submit', (e) => {
        e.preventDefault();
        void loadQuestions(pane, 0);
      });
      pane.addEventListener('click', async (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-set]');
        if (b) {
          const card = b.closest<HTMLElement>('[data-qid]')!;
          b.disabled = true;
          try {
            await api(`/api/admin/questions/${encodeURIComponent(card.dataset.qid!)}`, { method: 'PATCH', body: { status: b.dataset.set } });
            card.dataset.status = b.dataset.set;
            card.querySelector('[data-st]')!.textContent = b.dataset.set!;
          } catch (err) {
            alert(errMsg(err));
          } finally {
            b.disabled = false;
          }
        }
        const pg = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-offset]');
        if (pg) void loadQuestions(pane, Number(pg.dataset.offset));
      });
    }
    const out = pane.querySelector<HTMLElement>('[data-out]')!;
    const pager = pane.querySelector<HTMLElement>('[data-pager]')!;
    const fd = new FormData(pane.querySelector('form')!);
    const qs = new URLSearchParams();
    for (const k of ['exam', 'status', 'q']) if (fd.get(k)) qs.set(k, String(fd.get(k)));
    qs.set('limit', String(PAGE));
    qs.set('offset', String(offset));
    out.innerHTML = '<p class="muted">Loading…</p>';
    try {
      const data = await api(`/api/admin/questions?${qs}`);
      const rows = asList(data);
      const total = data && typeof data === 'object' && 'total' in (data as Row) ? Number((data as Row).total) : null;
      out.innerHTML = rows.length ? rows.map(questionCard).join('') : '<p class="muted">No questions match.</p>';
      pager.innerHTML = `${offset > 0 ? `<button class="btn btn-quiet" type="button" data-offset="${Math.max(0, offset - PAGE)}">Previous</button>` : ''}
        <span class="muted small">${offset + 1}–${offset + rows.length}${total !== null ? ` of ${total}` : ''}</span>
        ${rows.length === PAGE ? `<button class="btn btn-quiet" type="button" data-offset="${offset + PAGE}">Next</button>` : ''}`;
    } catch (e) {
      out.innerHTML = `<p class="form-err">${esc(errMsg(e))}</p>`;
      pager.innerHTML = '';
    }
  }

  function bi2(v: unknown): string {
    if (v && typeof v === 'object' && 'en' in (v as Row)) {
      const o = v as { en: string; hi: string };
      return o.en === o.hi ? `<span lang="hi">${esc(o.hi)}</span>` : `<span lang="hi">${esc(o.hi)}</span><br><span class="muted">${esc(o.en)}</span>`;
    }
    return esc(v);
  }

  function questionCard(q: Row): string {
    const opts = Array.isArray(q.options) ? (q.options as unknown[]) : [];
    const ans = Number(q.answer);
    const id = String(q.id ?? '');
    return `<article class="panel qrev" data-qid="${esc(id)}" data-status="${esc(q.status)}">
      <header class="qrev-h"><code>${esc(id)}</code> <span class="tag" data-st>${esc(q.status)}</span> <span class="muted small">${esc(q.exam)} · ${bi2(q.subject)} · ${bi2(q.topic)} · ${esc(q.difficulty ?? '')} · ${esc(q.source ?? '')}</span></header>
      <div class="qrev-t">${bi2(q.text)}</div>
      <ol class="qrev-o">${opts.map((o, k) => `<li class="${k === ans ? 'is-right' : ''}">${bi2(o)}</li>`).join('')}</ol>
      ${q.explanation ? `<div class="expl">${bi2(q.explanation)}</div>` : ''}
      ${q.pyq_ref ? `<p class="small muted">PYQ: ${esc(q.pyq_ref)}</p>` : ''}
      ${q.time_sensitive ? `<p class="small note">Time-sensitive, facts as of ${esc(q.facts_as_of ?? '?')}</p>` : ''}
      <div class="row-actions">
        <button class="btn btn-primary" type="button" data-set="reviewed">Approve</button>
        <button class="btn" type="button" data-set="rejected">Reject</button>
        <button class="btn btn-quiet" type="button" data-set="draft">Back to draft</button>
      </div>
    </article>`;
  }

  await gate();
}
