// Leads and Attempts: client-side index tables over the latest 500 rows.
import { listPage } from './list.ts';
import { badge, esc, examName, num, phone, timeCell, toast, type Row } from './util.ts';

const SOURCE: Record<string, string> = { landing: 'Landing page', ctwa: 'WhatsApp ad', app: 'App' };
const dim = '<span class="a-dim">–</span>';

function csv(rows: Row[]): string {
  const keys = ['created_at', 'phone', 'name', 'exam', 'score', 'total', 'source', 'followup_step', 'opted_out'];
  const q = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...rows.map((r) => keys.map((k) => q(k === 'created_at' ? new Date(Number(r[k]) * 1000).toISOString() : r[k])).join(','))].join('\n');
}

export const mountLeads = listPage({
  title: 'Leads',
  noun: ['lead', 'leads'],
  cap: 500,
  load: (ctx, force) => ctx.leads(force),
  tabLabel: 'Lead source',
  tabs: Object.entries(SOURCE).map(([value, label]) => ({ value, label, match: (r: Row) => r.source === value })),
  search: { placeholder: 'Search phone or name', text: (r) => `${r.phone ?? ''} ${r.name ?? ''}` },
  defaultSort: '-created',
  columns: [
    { key: 'phone', label: 'Phone', render: (r) => `<a class="a-mono a-link" href="tel:+91${esc(r.phone)}">${esc(phone(r.phone))}</a>` },
    { key: 'name', label: 'Name', render: (r) => (r.name ? esc(r.name) : dim), sort: (r) => String(r.name ?? '').toLowerCase() },
    { key: 'exam', label: 'Exam', render: (r) => esc(examName(r.exam)), cls: 'a-nowrap' },
    {
      key: 'score',
      label: 'Score',
      cls: 'a-num',
      render: (r) => (r.score !== null && r.score !== undefined ? `${num(Number(r.score))}${r.total ? `<span class="a-dim">/${num(Number(r.total))}</span>` : ''}` : dim),
      sort: (r) => (Number(r.total) ? Number(r.score) / Number(r.total) : -1),
    },
    { key: 'source', label: 'Source', render: (r) => badge(SOURCE[String(r.source)] ?? String(r.source ?? ''), r.source === 'ctwa' ? 'info' : 'neutral') },
    { key: 'followup', label: 'Follow-ups', cls: 'a-num', render: (r) => (Number(r.followup_step) ? `${num(Number(r.followup_step))} sent` : dim), sort: (r) => Number(r.followup_step) || 0 },
    { key: 'opted', label: 'Opted out', render: (r) => (r.opted_out ? badge('Opted out', 'bad') : dim) },
    { key: 'created', label: 'Created', cls: 'a-nowrap', render: (r) => timeCell(r.created_at), sort: (r) => Number(r.created_at) || 0 },
  ],
  empty: { title: 'No leads yet', body: 'Leads appear here when someone leaves their number on a landing page, a click-to-WhatsApp ad or the app.' },
  actions: [{ label: 'Export CSV', action: 'csv', icon: 'download' }],
  onAction(a, rows) {
    if (a !== 'csv') return;
    if (!rows.length) return toast('No leads to export.');
    const blob = new Blob([csv(rows)], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast(`Exported ${rows.length} ${rows.length === 1 ? 'lead' : 'leads'}`);
  },
});

export const mountAttempts = listPage({
  title: 'Attempts',
  noun: ['attempt', 'attempts'],
  cap: 500,
  load: (ctx, force) => ctx.attempts(force),
  tabLabel: 'Who attempted',
  tabs: [
    { value: 'students', label: 'Signed in', match: (r) => !!r.student },
    { value: 'guests', label: 'Guests', match: (r) => !r.student },
  ],
  search: { placeholder: 'Search student or paper', text: (r) => `${r.student ?? ''} ${r.paper ?? ''}` },
  defaultSort: '-created',
  columns: [
    { key: 'student', label: 'Student', render: (r) => (r.student ? `<strong>${esc(r.student)}</strong>` : '<span class="a-dim">Guest</span>'), sort: (r) => String(r.student ?? '').toLowerCase() },
    { key: 'exam', label: 'Exam', render: (r) => esc(examName(r.exam)), cls: 'a-nowrap' },
    { key: 'paper', label: 'Paper', render: (r) => `<span class="a-mono">${esc(r.paper)}</span>` },
    {
      key: 'score',
      label: 'Score',
      cls: 'a-nowrap',
      render: (r) => {
        const pct = Number(r.total) ? Math.max(0, Math.round((Number(r.score) / Number(r.total)) * 100)) : 0;
        return `<span class="a-score"><span class="a-num">${num(Number(r.score))}<span class="a-dim">/${num(Number(r.total))}</span></span><span class="a-meter a-meter-sm" aria-hidden="true"><i style="width:${pct}%"></i></span><span class="a-dim a-num">${pct}%</span></span>`;
      },
      sort: (r) => (Number(r.total) ? Number(r.score) / Number(r.total) : -1),
    },
    { key: 'created', label: 'Created', cls: 'a-nowrap', render: (r) => timeCell(r.created_at), sort: (r) => Number(r.created_at) || 0 },
  ],
  empty: { title: 'No attempts yet', body: 'Attempts appear here when students finish a paper.' },
});
