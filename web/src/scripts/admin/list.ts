// Client-side index table used by Leads and Attempts: filter tabs, exam
// select, search, sortable columns and pagination, all kept in the URL hash.
import type { Ctx, Mount } from './ctx.ts';
import { debounce, emptyState, errorBox, esc, examSelect, icon, pageHeader, pager, searchBox, skeleton, tabs, type Action, type Row } from './util.ts';

export interface Column {
  key: string;
  label: string;
  render: (r: Row) => string;
  /** Sort value; columns without it are not sortable. */
  sort?: (r: Row) => number | string;
  cls?: string;
}

export interface ListConfig {
  title: string;
  noun: [string, string];
  load: (ctx: Ctx, force: boolean) => Promise<Row[]>;
  /** Server cap, to say "showing the latest N". */
  cap: number;
  tabLabel: string;
  tabs: { value: string; label: string; match: (r: Row) => boolean }[];
  search: { placeholder: string; text: (r: Row) => string };
  columns: Column[];
  defaultSort: string;
  empty: { title: string; body: string };
  actions?: Action[];
  onAction?: (action: string, rows: Row[]) => void;
}

const PAGE = 25;

export function listPage(cfg: ListConfig): Mount {
  return (el, ctx) => {
    let rows: Row[] = [];
    const p = ctx.params;
    const st = {
      tab: p.get('tab') ?? 'all',
      exam: p.get('exam') ?? '',
      q: p.get('q') ?? '',
      page: Math.max(0, Number(p.get('page') ?? 0) || 0),
      sort: p.get('sort') ?? cfg.defaultSort,
    };
    let cursor = -1;

    const tabDefs = [{ value: 'all', label: 'All', match: () => true }, ...cfg.tabs];

    function filtered(): Row[] {
      const t = tabDefs.find((x) => x.value === st.tab) ?? tabDefs[0];
      const q = st.q.trim().toLowerCase();
      const out = rows.filter((r) => t.match(r) && (!st.exam || r.exam === st.exam) && (!q || cfg.search.text(r).toLowerCase().includes(q)));
      const desc = st.sort.startsWith('-');
      const col = cfg.columns.find((c) => c.key === st.sort.replace(/^-/, ''));
      if (col?.sort) {
        const f = col.sort;
        out.sort((a, b) => {
          const x = f(a);
          const y = f(b);
          const c = x < y ? -1 : x > y ? 1 : 0;
          return desc ? -c : c;
        });
      }
      return out;
    }

    function sync() {
      ctx.setParams({ tab: st.tab === 'all' ? null : st.tab, exam: st.exam || null, q: st.q || null, page: st.page || null, sort: st.sort === cfg.defaultSort ? null : st.sort });
    }

    function header(): string {
      return pageHeader(cfg.title, rows.length ? `${rows.length >= cfg.cap ? `Latest ${rows.length}` : rows.length} ${rows.length === 1 ? cfg.noun[0] : cfg.noun[1]}` : '', cfg.actions);
    }

    async function load(force = false) {
      el.innerHTML = `${pageHeader(cfg.title, '', cfg.actions)}<div class="a-card a-card-flush">${skeleton(8)}</div>`;
      try {
        rows = await cfg.load(ctx, force);
      } catch (e) {
        el.querySelector('.a-card')!.innerHTML = errorBox(e, 'reload');
        return;
      }
      if (!rows.length) {
        el.innerHTML = `${header()}<div class="a-card">${emptyState(cfg.empty.title, cfg.empty.body)}</div>`;
        return;
      }
      el.innerHTML = `${header()}<div class="a-card a-card-flush" data-list>
        <div data-tabs></div>
        <div class="a-toolbar">${searchBox(cfg.search.placeholder, st.q)}${examSelect(ctx.exams, st.exam)}</div>
        <div data-body></div>
      </div>`;
      const search = el.querySelector<HTMLInputElement>('input[name=q]')!;
      const onSearch = debounce(() => {
        st.q = search.value;
        st.page = 0;
        sync();
        draw();
      }, 150);
      search.addEventListener('input', onSearch);
      el.querySelector<HTMLSelectElement>('select[name=exam]')!.addEventListener('change', (e) => {
        st.exam = (e.target as HTMLSelectElement).value;
        st.page = 0;
        sync();
        draw();
      });
      draw();
    }

    function draw() {
      const counts = tabDefs.map((t) => ({ value: t.value, label: t.label, count: rows.filter((r) => t.match(r) && (!st.exam || r.exam === st.exam)).length }));
      el.querySelector('[data-tabs]')!.innerHTML = tabs(cfg.tabLabel, counts, st.tab);
      const list = filtered();
      const pages = Math.max(1, Math.ceil(list.length / PAGE));
      if (st.page >= pages) st.page = pages - 1;
      const from = st.page * PAGE;
      const view = list.slice(from, from + PAGE);
      cursor = -1;
      const body = el.querySelector<HTMLElement>('[data-body]')!;
      if (!view.length) {
        body.innerHTML = emptyState(`No ${cfg.noun[1]} match`, 'Try a different search or filter.', { label: 'Clear filters', action: 'clear' });
        return;
      }
      const sortKey = st.sort.replace(/^-/, '');
      const desc = st.sort.startsWith('-');
      body.innerHTML = `<div class="a-table-wrap"><table class="a-table">
        <thead><tr>${cfg.columns
          .map((c) => {
            if (!c.sort) return `<th scope="col" class="${c.cls ?? ''}">${esc(c.label)}</th>`;
            const on = c.key === sortKey;
            return `<th scope="col" class="${c.cls ?? ''}" aria-sort="${on ? (desc ? 'descending' : 'ascending') : 'none'}"><button type="button" class="a-sort" data-sort="${c.key}">${esc(c.label)}${on ? icon(desc ? 'down' : 'up', 14) : ''}</button></th>`;
          })
          .join('')}</tr></thead>
        <tbody>${view.map((r) => `<tr>${cfg.columns.map((c) => `<td class="${c.cls ?? ''}">${c.render(r)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      ${pager(from, view.length, list.length, st.page > 0, st.page < pages - 1)}`;
    }

    el.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const tab = t.closest<HTMLElement>('[data-tab]');
      if (tab) {
        st.tab = tab.dataset.tab!;
        st.page = 0;
        sync();
        draw();
        el.querySelector<HTMLElement>(`[data-tab="${st.tab}"]`)?.focus();
        return;
      }
      const pg = t.closest<HTMLButtonElement>('[data-page]');
      if (pg && !pg.disabled) {
        st.page += pg.dataset.page === 'next' ? 1 : -1;
        sync();
        draw();
        el.querySelector<HTMLElement>(`[data-page="${pg.dataset.page}"]:not([disabled])`)?.focus();
        return;
      }
      const so = t.closest<HTMLElement>('[data-sort]');
      if (so) {
        const k = so.dataset.sort!;
        st.sort = st.sort === `-${k}` ? k : `-${k}`;
        sync();
        draw();
        el.querySelector<HTMLElement>(`[data-sort="${k}"]`)?.focus();
        return;
      }
      const act = t.closest<HTMLElement>('[data-action]');
      if (!act) return;
      const a = act.dataset.action!;
      if (a === 'reload') void load(true);
      else if (a === 'clear') {
        Object.assign(st, { tab: 'all', exam: '', q: '', page: 0 });
        sync();
        void load();
      } else cfg.onAction?.(a, filtered());
    });

    void load();

    return {
      onKey(e) {
        const trs = [...el.querySelectorAll<HTMLTableRowElement>('.a-table tbody tr')];
        if (!trs.length) return false;
        if (e.key === 'j' || e.key === 'k') {
          cursor = Math.max(0, Math.min(trs.length - 1, cursor + (e.key === 'j' ? 1 : -1)));
          trs.forEach((tr, i) => tr.classList.toggle('is-cursor', i === cursor));
          trs[cursor].scrollIntoView({ block: 'nearest' });
          return true;
        }
        return false;
      },
    };
  };
}
