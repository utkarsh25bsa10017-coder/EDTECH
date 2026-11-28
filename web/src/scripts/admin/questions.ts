// Question review: status tabs, exam filter, server-side search and paging
// (offset), row selection with bulk status changes, and a side panel showing
// the full bilingual question. Keyboard: j/k move, Enter opens, r reviewed,
// x rejected, d draft, space selects, Esc closes.
import { api } from '../api.ts';
import { questionTotals, type Mount, type Stats } from './ctx.ts';
import {
  asList,
  bi,
  debounce,
  emptyState,
  errMsg,
  errorBox,
  esc,
  examName,
  examSelect,
  icon,
  num,
  pageHeader,
  pager,
  pool,
  searchBox,
  skeleton,
  statusBadge,
  statusLabel,
  tabs,
  toast,
  type Row,
} from './util.ts';

const PAGE = 25;
type Status = 'draft' | 'reviewed' | 'rejected';
const STATUSES: Status[] = ['draft', 'reviewed', 'rejected'];
const LETTERS = 'ABCDEFGH';

/** Hindi first, English underneath when it differs. */
function biBlock(v: unknown, cls = ''): string {
  const t = bi(v);
  if (!t.en.trim() || t.en === t.hi) return `<div class="${cls}" lang="hi">${esc(t.hi)}</div>`;
  return `<div class="${cls}"><div lang="hi">${esc(t.hi)}</div><div class="a-en" lang="en">${esc(t.en)}</div></div>`;
}

function preview(q: Row): string {
  const t = bi(q.text);
  const s = (t.en || t.hi).replace(/\s+/g, ' ').trim();
  return s.length > 160 ? `${s.slice(0, 157)}…` : s;
}

export const mountQuestions: Mount = (el, ctx) => {
  const p = ctx.params;
  const st = {
    status: (p.get('status') ?? 'draft') as Status | '',
    exam: p.get('exam') ?? '',
    q: p.get('q') ?? '',
    offset: Math.max(0, Number(p.get('offset') ?? 0) || 0),
  };
  if (p.get('status') === 'all') st.status = '';
  let items: Row[] = [];
  let total = 0;
  let cursor = -1;
  let open = -1;
  const selected = new Set<string>();
  let stats: Stats | null = null;
  let reqId = 0;

  el.innerHTML = `${pageHeader('Questions', '', [{ label: 'Reload bank', action: 'reload-bank', icon: 'refresh' }])}
    <div class="a-card a-card-flush">
      <div data-tabs></div>
      <div class="a-toolbar">${searchBox('Search id, text, topic', st.q)}${examSelect(ctx.exams, st.exam)}</div>
      <div data-body>${skeleton(10)}</div>
    </div>
    <p class="a-hint"><kbd class="a-kbd">j</kbd><kbd class="a-kbd">k</kbd> move · <kbd class="a-kbd">Enter</kbd> open · <kbd class="a-kbd">r</kbd> reviewed · <kbd class="a-kbd">x</kbd> rejected · <kbd class="a-kbd">d</kbd> draft · <kbd class="a-kbd">Space</kbd> select · <kbd class="a-kbd">?</kbd> all shortcuts</p>
    <aside class="a-panel" data-panel hidden aria-label="Question details" tabindex="-1"></aside>
    <div class="a-scrim" data-scrim hidden></div>`;

  const body = el.querySelector<HTMLElement>('[data-body]')!;
  const panel = el.querySelector<HTMLElement>('[data-panel]')!;
  const scrim = el.querySelector<HTMLElement>('[data-scrim]')!;
  const sub = el.querySelector<HTMLElement>('.a-page-sub') ?? el.querySelector('.a-page-t')!.appendChild(Object.assign(document.createElement('p'), { className: 'a-page-sub' }));

  function sync() {
    ctx.setParams({ status: st.status === 'draft' ? null : st.status || 'all', exam: st.exam || null, q: st.q || null, offset: st.offset || null });
  }

  /** Items on this page that no longer match the status tab (changed here). */
  const movedOut = () => (st.status ? items.filter((q) => q.status !== st.status).length : 0);

  function drawTabs() {
    const t = stats ? questionTotals(stats, st.exam) : null;
    const searching = !!st.q.trim();
    const count = (s: Status | '') => (searching ? (s === st.status ? total : null) : t ? (s ? t[s] : t.total) : null);
    el.querySelector('[data-tabs]')!.innerHTML = tabs(
      'Review status',
      [...STATUSES.map((s) => ({ value: s, label: statusLabel(s), count: count(s) })), { value: '', label: 'All', count: count('') }],
      st.status,
    );
    if (stats) {
      const all = questionTotals(stats);
      sub.textContent = `${num(all.total)} in the bank · ${num(all.reviewed)} reviewed · ${num(all.rejected)} rejected`;
    }
  }

  async function refreshStats(force = false) {
    try {
      stats = await ctx.stats(force);
    } catch {
      stats = null;
    }
    drawTabs();
  }

  async function load(then?: () => void) {
    const id = ++reqId;
    const qs = new URLSearchParams();
    if (st.exam) qs.set('exam', st.exam);
    if (st.status) qs.set('status', st.status);
    if (st.q.trim()) qs.set('q', st.q.trim());
    qs.set('limit', String(PAGE));
    qs.set('offset', String(st.offset));
    if (!items.length) body.innerHTML = skeleton(10);
    else body.classList.add('is-loading');
    try {
      const data = await api<{ total: number; items: Row[] }>(`/api/admin/questions?${qs}`);
      if (id !== reqId) return;
      items = asList(data);
      total = Number(data?.total ?? items.length);
    } catch (e) {
      if (id !== reqId) return;
      body.classList.remove('is-loading');
      items = [];
      body.innerHTML = errorBox(e, 'retry');
      return;
    }
    body.classList.remove('is-loading');
    if (!items.length && st.offset > 0 && total > 0) {
      st.offset = Math.max(0, Math.floor((total - 1) / PAGE) * PAGE);
      sync();
      return load(then);
    }
    selected.clear();
    cursor = -1;
    drawTabs();
    draw();
    if (then) then();
    else if (open >= 0) closePanel(false);
  }

  function rowHtml(q: Row, i: number): string {
    const id = String(q.id ?? '');
    const sel = selected.has(id);
    const subj = bi(q.subject).en;
    const topic = bi(q.topic).en;
    return `<tr data-i="${i}" class="${i === cursor ? 'is-cursor' : ''}${i === open ? ' is-open' : ''}${sel ? ' is-sel' : ''}${st.status && q.status !== st.status ? ' is-moved' : ''}">
      <td class="a-cb"><label><input type="checkbox" data-sel="${i}" ${sel ? 'checked' : ''} aria-label="Select ${esc(id)}" /></label></td>
      <td class="a-q"><button type="button" class="a-q-open" data-open="${i}"><span class="a-q-t">${esc(preview(q))}</span><span class="a-q-id">${esc(id)}</span></button></td>
      <td class="a-nowrap a-col-m">${esc(examName(q.exam))}</td>
      <td class="a-col-l"><span class="a-q-sub">${esc(subj)}</span>${topic && topic !== subj ? `<span class="a-dim a-q-top">${esc(topic)}</span>` : ''}</td>
      <td class="a-col-l a-cap">${esc(q.difficulty ?? '')}</td>
      <td>${statusBadge(q.status)}</td>
    </tr>`;
  }

  function headHtml(): string {
    const n = selected.size;
    const allOn = n > 0 && n === items.length;
    const cb = `<label><input type="checkbox" data-sel-all ${allOn ? 'checked' : ''} aria-label="Select all on this page" /></label>`;
    if (n) {
      return `<tr class="a-bulk"><th class="a-cb">${cb}</th><th colspan="5"><div class="a-bulk-bar"><strong>${n} selected</strong>
        <button type="button" class="a-btn a-btn-sm" data-bulk="reviewed">Mark reviewed</button>
        <button type="button" class="a-btn a-btn-sm" data-bulk="rejected">Reject</button>
        <button type="button" class="a-btn a-btn-sm" data-bulk="draft">Set to draft</button>
        <button type="button" class="a-btn a-btn-sm a-btn-plain" data-bulk="clear">Clear</button></div></th></tr>`;
    }
    return `<tr><th class="a-cb">${cb}</th><th scope="col">Question</th><th scope="col" class="a-col-m">Exam</th><th scope="col" class="a-col-l">Subject</th><th scope="col" class="a-col-l">Difficulty</th><th scope="col">Status</th></tr>`;
  }

  function draw() {
    if (!items.length) {
      const filtering = st.q.trim() || st.exam;
      body.innerHTML =
        st.status === 'draft' && !filtering
          ? emptyState('No drafts left', 'Every question has been reviewed or rejected.', { label: 'See reviewed', action: 'tab-reviewed' })
          : emptyState('No questions match', 'Try a different search, exam or status.', { label: 'Clear filters', action: 'clear' });
      return;
    }
    const moved = movedOut();
    body.innerHTML = `<div class="a-table-wrap"><table class="a-table a-qtable">
      <thead>${headHtml()}</thead>
      <tbody>${items.map(rowHtml).join('')}</tbody>
    </table></div>
    ${pager(st.offset, items.length, total, st.offset > 0, st.offset + PAGE - moved < total - moved)}`;
  }

  function redrawRow(i: number) {
    const tr = body.querySelector(`tr[data-i="${i}"]`);
    if (tr) tr.outerHTML = rowHtml(items[i], i);
  }
  function redrawHead() {
    const th = body.querySelector('thead');
    if (th) th.innerHTML = headHtml();
  }

  function setCursor(i: number, scroll = true) {
    const prev = cursor;
    cursor = Math.max(0, Math.min(items.length - 1, i));
    if (prev >= 0 && prev < items.length) body.querySelector(`tr[data-i="${prev}"]`)?.classList.remove('is-cursor');
    const tr = body.querySelector<HTMLElement>(`tr[data-i="${cursor}"]`);
    tr?.classList.add('is-cursor');
    if (scroll) tr?.scrollIntoView({ block: 'nearest' });
  }

  /* ------------------------------------------------------------------ panel */
  function panelHtml(q: Row, i: number): string {
    const opts = Array.isArray(q.options) ? (q.options as unknown[]) : [];
    const ans = Number(q.answer);
    const meta: [string, string][] = [
      ['Exam', esc(examName(q.exam))],
      ['Subject', esc(bi(q.subject).en)],
      ['Topic', esc(bi(q.topic).en)],
      ['Difficulty', `<span class="a-cap">${esc(q.difficulty ?? '–')}</span>`],
      ['Type', `<span class="a-cap">${esc(q.type ?? '–')}</span>`],
      ['Source', q.source === 'pyq' ? `PYQ${q.pyq_ref ? ` · ${esc(q.pyq_ref)}` : ''}` : esc(q.source ?? '–')],
    ];
    if (q.variant_of) meta.push(['Variant of', `<span class="a-mono">${esc(q.variant_of)}</span>`]);
    const hasMore = st.offset + PAGE - movedOut() < total - movedOut();
    return `<div class="a-panel-h">
        <div class="a-panel-id"><span class="a-mono">${esc(q.id)}</span>${statusBadge(q.status)}</div>
        <div class="a-panel-nav">
          <button type="button" class="a-btn a-btn-icon a-btn-plain" data-nav="-1" aria-label="Previous question (k)"${i <= 0 && st.offset === 0 ? ' disabled' : ''}>${icon('up', 18)}</button>
          <span class="a-dim a-num">${num(st.offset + i + 1)} of ${num(total)}</span>
          <button type="button" class="a-btn a-btn-icon a-btn-plain" data-nav="1" aria-label="Next question (j)"${i >= items.length - 1 && !hasMore ? ' disabled' : ''}>${icon('down', 18)}</button>
          <button type="button" class="a-btn a-btn-icon a-btn-plain" data-close aria-label="Close (Esc)">${icon('x', 18)}</button>
        </div>
      </div>
      <div class="a-panel-b">
        ${q.time_sensitive ? `<p class="a-banner a-banner-warn">Time-sensitive: facts as of ${esc(q.facts_as_of ?? 'unknown date')}. Check they are still true.</p>` : ''}
        <h2 class="sr-only">Question</h2>
        ${biBlock(q.text, 'a-qtext')}
        <ol class="a-opts" aria-label="Options">${opts
          .map(
            (o, k) =>
              `<li class="${k === ans ? 'is-right' : ''}"><span class="a-opt-l" aria-hidden="true">${LETTERS[k] ?? k + 1}</span>${biBlock(o, 'a-opt-t')}${k === ans ? `<span class="a-badge a-badge-ok a-opt-ok">${icon('check', 14)}Answer</span>` : ''}</li>`,
          )
          .join('')}</ol>
        ${!(ans >= 0 && ans < opts.length) ? `<p class="a-banner a-banner-bad">The answer index (${esc(q.answer)}) does not match any option.</p>` : ''}
        ${q.explanation ? `<h3 class="a-panel-sh">Explanation</h3>${biBlock(q.explanation, 'a-expl')}` : '<p class="a-dim">No explanation.</p>'}
        <h3 class="a-panel-sh">Details</h3>
        <dl class="a-meta">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      </div>
      <div class="a-panel-f">
        <button type="button" class="a-btn" data-set="rejected"${q.status === 'rejected' ? ' disabled' : ''}>Reject <kbd class="a-kbd">x</kbd></button>
        <button type="button" class="a-btn a-btn-plain" data-set="draft"${q.status === 'draft' ? ' disabled' : ''}>Draft <kbd class="a-kbd">d</kbd></button>
        <button type="button" class="a-btn a-btn-primary" data-set="reviewed"${q.status === 'reviewed' ? ' disabled' : ''}>Mark reviewed <kbd class="a-kbd">r</kbd></button>
      </div>`;
  }

  let returnFocus: HTMLElement | null = null;
  function openPanel(i: number, focus = true) {
    if (i < 0 || i >= items.length) return;
    if (open < 0) returnFocus = document.activeElement as HTMLElement | null;
    const prev = open;
    open = i;
    if (prev >= 0) body.querySelector(`tr[data-i="${prev}"]`)?.classList.remove('is-open');
    body.querySelector(`tr[data-i="${i}"]`)?.classList.add('is-open');
    setCursor(i);
    panel.innerHTML = panelHtml(items[i], i);
    panel.hidden = false;
    scrim.hidden = false;
    document.querySelector('[data-admin]')!.toggleAttribute('data-panel-open', true);
    panel.querySelector('.a-panel-b')!.scrollTop = 0;
    if (focus) panel.focus({ preventScroll: true });
  }

  function closePanel(restore = true) {
    if (open >= 0) body.querySelector(`tr[data-i="${open}"]`)?.classList.remove('is-open');
    open = -1;
    panel.hidden = true;
    scrim.hidden = true;
    panel.innerHTML = '';
    document.querySelector('[data-admin]')!.removeAttribute('data-panel-open');
    if (restore) {
      const btn = cursor >= 0 ? body.querySelector<HTMLElement>(`[data-open="${cursor}"]`) : returnFocus;
      (btn ?? returnFocus)?.focus({ preventScroll: true });
    }
  }

  function step(delta: 1 | -1) {
    const base = open >= 0 ? open : cursor;
    const target = base + delta;
    if (target >= 0 && target < items.length) {
      if (open >= 0) openPanel(target);
      else setCursor(target);
      return;
    }
    const moved = movedOut();
    if (delta === 1 && st.offset + PAGE - moved < total - moved) {
      const wasOpen = open >= 0;
      st.offset = st.offset + PAGE - moved;
      sync();
      void load(() => (wasOpen ? openPanel(0) : setCursor(0)));
    } else if (delta === -1 && st.offset > 0) {
      const wasOpen = open >= 0;
      st.offset = Math.max(0, st.offset - PAGE);
      sync();
      void load(() => (wasOpen ? openPanel(items.length - 1) : setCursor(items.length - 1)));
    }
  }

  /* ------------------------------------------------------------------ status changes */
  /** Network writes run one at a time: the server rewrites the whole bank file on each change. */
  let chain: Promise<void> = Promise.resolve();

  function redrawObj(q: Row) {
    const i = items.indexOf(q);
    if (i < 0) return;
    redrawRow(i);
    if (open === i) panel.innerHTML = panelHtml(q, i);
  }

  function updatePager() {
    const pg = body.querySelector('.a-pager');
    if (pg && items.length) {
      const moved = movedOut();
      pg.outerHTML = pager(st.offset, items.length, total, st.offset > 0, st.offset + PAGE - moved < total - moved);
    }
  }

  function setStatus(idx: number[], status: Status, opts: { undo?: boolean; advance?: boolean } = {}) {
    const objs = idx.map((i) => items[i]).filter((q) => q && q.status !== status);
    if (!objs.length) {
      if (opts.advance) step(1);
      return;
    }
    const prev = new Map(objs.map((q) => [q, q.status as Status]));
    for (const q of objs) {
      q.status = status;
      redrawObj(q);
    }
    updatePager();
    if (opts.advance) step(1);

    chain = chain.then(async () => {
      const results = await pool(objs, 1, (q) => api(`/api/admin/questions/${encodeURIComponent(String(q.id))}`, { method: 'PATCH', body: { status } }));
      const failed = objs.filter((_, k) => results[k].status === 'rejected');
      const done = objs.filter((_, k) => results[k].status === 'fulfilled');
      for (const q of failed) {
        q.status = prev.get(q)!;
        redrawObj(q);
      }
      if (failed.length) {
        updatePager();
        const why = errMsg((results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason);
        toast(`${done.length ? `${done.length} saved, ${failed.length} failed` : 'Not saved'}: ${why}`, { error: true });
      } else {
        const what = done.length === 1 ? 'Question' : `${done.length} questions`;
        const msg = status === 'draft' ? `${what} set to draft` : `${what} marked ${statusLabel(status).toLowerCase()}`;
        toast(
          msg,
          opts.undo === false
            ? {}
            : {
                undo: () => {
                  const byStatus = new Map<Status, number[]>();
                  for (const q of done) {
                    const i = items.indexOf(q);
                    const s0 = prev.get(q)!;
                    if (i >= 0) byStatus.set(s0, [...(byStatus.get(s0) ?? []), i]);
                  }
                  for (const [s0, list] of byStatus) setStatus(list, s0, { undo: false });
                },
              },
        );
      }
      if (done.length) {
        void refreshStats(true);
        ctx.refreshCounts();
      }
    });
  }

  function bulk(status: Status) {
    const idx = items.map((q, i) => (selected.has(String(q.id)) ? i : -1)).filter((i) => i >= 0);
    selected.clear();
    redrawHead();
    body.querySelectorAll<HTMLInputElement>('[data-sel]').forEach((c) => {
      c.checked = false;
      c.closest('tr')!.classList.remove('is-sel');
    });
    setStatus(idx, status);
  }

  function toggleSel(i: number, on?: boolean) {
    const id = String(items[i].id);
    const v = on ?? !selected.has(id);
    if (v) selected.add(id);
    else selected.delete(id);
    const tr = body.querySelector(`tr[data-i="${i}"]`);
    tr?.classList.toggle('is-sel', v);
    const cb = tr?.querySelector<HTMLInputElement>('[data-sel]');
    if (cb) cb.checked = v;
    redrawHead();
  }

  /* ------------------------------------------------------------------ events */
  const search = el.querySelector<HTMLInputElement>('input[name=q]')!;
  search.addEventListener(
    'input',
    debounce(() => {
      st.q = search.value;
      st.offset = 0;
      sync();
      void load();
    }, 300),
  );
  el.querySelector<HTMLSelectElement>('select[name=exam]')!.addEventListener('change', (e) => {
    st.exam = (e.target as HTMLSelectElement).value;
    st.offset = 0;
    sync();
    void load();
  });

  el.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.matches('[data-sel]')) toggleSel(Number(t.dataset.sel), t.checked);
    else if (t.matches('[data-sel-all]')) {
      const on = t.checked;
      items.forEach((_, i) => toggleSel(i, on));
    }
  });

  let lastSel = -1;
  el.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const cbx = t.closest<HTMLInputElement>('[data-sel]');
    if (cbx) {
      const i = Number(cbx.dataset.sel);
      if ((e as MouseEvent).shiftKey && lastSel >= 0) {
        const [a, b] = [Math.min(lastSel, i), Math.max(lastSel, i)];
        for (let k = a; k <= b; k++) toggleSel(k, cbx.checked);
      }
      lastSel = i;
      return;
    }
    const tab = t.closest<HTMLElement>('[data-tab]');
    if (tab) {
      st.status = tab.dataset.tab as Status | '';
      st.offset = 0;
      sync();
      drawTabs();
      el.querySelector<HTMLElement>(`[data-tab="${st.status}"]`)?.focus();
      void load();
      return;
    }
    const o = t.closest<HTMLElement>('[data-open]');
    if (o) return openPanel(Number(o.dataset.open));
    const td = t.closest<HTMLElement>('tbody td');
    if (td && !td.classList.contains('a-cb') && !t.closest('a,button,input,label')) return openPanel(Number(td.parentElement!.dataset.i));
    const pg = t.closest<HTMLButtonElement>('[data-page]');
    if (pg && !pg.disabled) {
      const moved = movedOut();
      st.offset = pg.dataset.page === 'next' ? st.offset + PAGE - moved : Math.max(0, st.offset - PAGE);
      sync();
      void load(() => body.querySelector<HTMLElement>(`[data-page="${pg.dataset.page}"]:not([disabled])`)?.focus());
      el.querySelector('.a-card')!.scrollIntoView({ block: 'start' });
      return;
    }
    const bk = t.closest<HTMLElement>('[data-bulk]');
    if (bk) {
      if (bk.dataset.bulk === 'clear') {
        items.forEach((_, i) => toggleSel(i, false));
      } else bulk(bk.dataset.bulk as Status);
      return;
    }
    const nav = t.closest<HTMLButtonElement>('[data-nav]');
    if (nav) return step(Number(nav.dataset.nav) as 1 | -1);
    if (t.closest('[data-close]') || t === scrim) return closePanel();
    const set = t.closest<HTMLButtonElement>('[data-set]');
    if (set && open >= 0) return setStatus([open], set.dataset.set as Status, { advance: true });
    const act = t.closest<HTMLElement>('[data-action]');
    if (!act) return;
    const a = act.dataset.action;
    if (a === 'retry') void load();
    else if (a === 'clear') {
      Object.assign(st, { exam: '', q: '', offset: 0 });
      search.value = '';
      el.querySelector<HTMLSelectElement>('select[name=exam]')!.value = '';
      sync();
      drawTabs();
      void load();
    } else if (a === 'tab-reviewed') {
      st.status = 'reviewed';
      st.offset = 0;
      sync();
      drawTabs();
      void load();
    } else if (a === 'reload-bank') void reloadBank(act as HTMLButtonElement);
  });

  async function reloadBank(btn: HTMLButtonElement) {
    if (!confirm('Reload the question bank from the files in content/bank? Statuses are kept: they live in the files.')) return;
    btn.disabled = true;
    try {
      const r = await api<{ questions?: number }>('/api/admin/reload', { method: 'POST', body: {} });
      toast(`Bank reloaded${typeof r?.questions === 'number' ? `: ${num(r.questions)} questions` : ''}`);
      void refreshStats(true);
      ctx.refreshCounts();
      void load();
    } catch (e) {
      toast(`Reload failed: ${errMsg(e)}`, { error: true });
    } finally {
      btn.disabled = false;
    }
  }

  drawTabs();
  void refreshStats();
  void load();

  return {
    onKey(e) {
      const k = e.key;
      if (k === 'Escape') {
        if (open >= 0) closePanel();
        else if (selected.size) items.forEach((_, i) => toggleSel(i, false));
        else return false;
        return true;
      }
      if (!items.length) return false;
      if (k === 'j' || k === 'k') {
        if (cursor < 0 && open < 0) setCursor(0);
        else step(k === 'j' ? 1 : -1);
        return true;
      }
      if ((k === 'Enter' || k === 'o') && open < 0) {
        openPanel(cursor < 0 ? 0 : cursor);
        return true;
      }
      const target = open >= 0 ? open : cursor;
      const map: Record<string, Status> = { r: 'reviewed', x: 'rejected', d: 'draft' };
      if (map[k]) {
        if (target < 0) return false;
        setStatus([target], map[k], { advance: true });
        return true;
      }
      if ((k === ' ' || k === 's') && open < 0 && cursor >= 0) {
        toggleSel(cursor);
        return true;
      }
      return false;
    },
    destroy() {
      document.querySelector('[data-admin]')?.removeAttribute('data-panel-open');
    },
  };
};
