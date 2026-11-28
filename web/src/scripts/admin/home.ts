// Home: KPI cards, leads/attempts per day for the last 14 days (inline SVG,
// counted client-side from created_at), question review progress per exam,
// and the latest leads and attempts.
import { questionTotals, type Mount, type Stats } from './ctx.ts';
import { emptyState, errorBox, esc, examName, num, pageHeader, phone, relTime, skeleton, type Row } from './util.ts';

const DAYS = 14;

interface Day {
  date: Date;
  n: number;
}

function perDay(rows: Row[]): Day[] {
  const now = new Date();
  const days: Day[] = [];
  for (let i = DAYS - 1; i >= 0; i--) days.push({ date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - i), n: 0 });
  const start = days[0].date.getTime();
  for (const r of rows) {
    const t = Number(r.created_at) * 1000;
    if (!t || t < start) continue;
    const d = new Date(t);
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const hit = days.find((x) => x.date.getTime() === key);
    if (hit) hit.n++;
  }
  return days;
}

function niceTop(max: number): { top: number; step: number } {
  if (max <= 4) return { top: 4, step: 2 };
  const raw = max / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  return { top: Math.ceil(max / step) * step, step };
}

const dayFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const monFmt = new Intl.DateTimeFormat('en-IN', { month: 'short' });

/** Single-series bar chart sized to its host in real pixels, so text never scales. */
function drawBars(host: HTMLElement, days: Day[], noun: [string, string]) {
  const w = Math.max(240, host.clientWidth);
  const h = 168;
  const padL = 30;
  const padR = 2;
  const padT = 10;
  const padB = 26;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const { top, step } = niceTop(Math.max(...days.map((d) => d.n)));
  const band = plotW / days.length;
  const bw = Math.min(26, Math.max(6, band * 0.62));
  const y = (v: number) => padT + plotH - (v / top) * plotH;
  const labelEvery = band < 24 ? 3 : 2;

  let grid = '';
  for (let v = 0; v <= top + 1e-9; v += step) {
    grid += `<line x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}" class="${v === 0 ? 'c-base' : 'c-grid'}"/>`;
    grid += `<text x="${padL - 8}" y="${y(v) + 4}" text-anchor="end" class="c-axis">${num(v)}</text>`;
  }
  let bars = '';
  let labels = '';
  let hits = '';
  days.forEach((d, i) => {
    const cx = padL + band * i + band / 2;
    if (d.n > 0) {
      const top0 = y(d.n);
      const bh = padT + plotH - top0;
      const r = Math.min(4, bh, bw / 2);
      const x0 = cx - bw / 2;
      const yb = padT + plotH;
      bars += `<path class="c-bar" d="M${x0},${yb}V${top0 + r}Q${x0},${top0} ${x0 + r},${top0}H${x0 + bw - r}Q${x0 + bw},${top0} ${x0 + bw},${top0 + r}V${yb}Z"/>`;
    }
    const fromEnd = days.length - 1 - i;
    if (fromEnd % labelEvery === 0) {
      const dd = d.date.getDate();
      const txt = fromEnd === 0 ? 'Today' : i < labelEvery || dd <= labelEvery ? `${dd} ${monFmt.format(d.date)}` : String(dd);
      labels += `<text x="${cx}" y="${h - 6}" text-anchor="middle" class="c-axis">${txt}</text>`;
    }
    hits += `<rect class="c-hit" data-i="${i}" x="${padL + band * i}" y="${padT}" width="${band}" height="${plotH}"/>`;
  });
  const total = days.reduce((a, d) => a + d.n, 0);
  host.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(`${total} ${total === 1 ? noun[0] : noun[1]} in the last ${DAYS} days`)}">${grid}<g class="c-hl"></g>${bars}${labels}${hits}</svg>${total ? '' : `<p class="a-chart-none">No ${esc(noun[1])} in the last ${DAYS} days</p>`}<div class="a-tip" hidden></div>
    <table class="sr-only"><caption>${esc(noun[1])} per day</caption><tbody>${days.map((d) => `<tr><th>${esc(dayFmt.format(d.date))}</th><td>${d.n}</td></tr>`).join('')}</tbody></table>`;

  const svg = host.querySelector('svg')!;
  const tip = host.querySelector<HTMLElement>('.a-tip')!;
  const hl = svg.querySelector('.c-hl')!;
  svg.addEventListener('pointermove', (e) => {
    const r = (e.target as Element).closest<SVGRectElement>('.c-hit');
    if (!r) return;
    const i = Number(r.dataset.i);
    const d = days[i];
    hl.innerHTML = `<rect class="c-col" x="${padL + band * i}" y="${padT}" width="${band}" height="${plotH}" rx="4"/>`;
    tip.innerHTML = `<span class="a-tip-d">${esc(dayFmt.format(d.date))}</span><strong>${num(d.n)}</strong> ${esc(d.n === 1 ? noun[0] : noun[1])}`;
    tip.hidden = false;
    const cx = padL + band * i + band / 2;
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.min(w - tw, Math.max(0, cx - tw / 2))}px`;
    tip.style.top = `${Math.max(0, y(d.n) - tip.offsetHeight - 8)}px`;
  });
  svg.addEventListener('pointerleave', () => {
    tip.hidden = true;
    hl.innerHTML = '';
  });
}

function chartCard(key: string, title: string, days: Day[]): string {
  const total = days.reduce((a, d) => a + d.n, 0);
  const week = days.slice(-7).reduce((a, d) => a + d.n, 0);
  return `<section class="a-card a-chart-card" aria-labelledby="c-${key}">
    <div class="a-card-h"><h2 id="c-${key}">${esc(title)}</h2><span class="a-dim">Last ${DAYS} days</span></div>
    <p class="a-chart-big"><strong>${num(total)}</strong> <span class="a-dim">· ${num(week)} in the last 7 days</span></p>
    <div class="a-chart" data-chart="${key}"></div>
  </section>`;
}

function kpi(label: string, value: string, foot: string, href?: string, extra = ''): string {
  const inner = `<span class="a-kpi-l">${esc(label)}</span><span class="a-kpi-v">${value}</span>${extra}<span class="a-kpi-f">${foot}</span>`;
  return href ? `<a class="a-card a-kpi" href="${href}">${inner}</a>` : `<div class="a-card a-kpi">${inner}</div>`;
}

const since = (rows: Row[], days: number) => rows.filter((r) => Number(r.created_at) > Date.now() / 1000 - days * 86400).length;

function progressBar(rev: number, rej: number, total: number, cls = ''): string {
  if (!total) return `<span class="a-prog ${cls}"><i class="p-draft" style="flex:1"></i></span>`;
  const seg = (n: number, c: string) => (n ? `<i class="${c}" style="flex:${n}"></i>` : '');
  return `<span class="a-prog ${cls}" aria-hidden="true">${seg(rev, 'p-ok')}${seg(rej, 'p-bad')}${seg(total - rev - rej, 'p-draft')}</span>`;
}

function reviewCard(s: Stats, exams: string[]): string {
  const all = questionTotals(s);
  const pct = all.total ? Math.round((all.reviewed / all.total) * 1000) / 10 : 0;
  const known = [...exams, ...Object.keys(s.questions ?? {}).filter((e) => !exams.includes(e))];
  const rows = known
    .map((ex) => {
      const t = questionTotals(s, ex);
      if (!t.total) return '';
      return `<a class="a-prog-row" href="#/questions?exam=${encodeURIComponent(ex)}&status=draft" aria-label="${esc(`${examName(ex)}: ${t.reviewed} reviewed, ${t.rejected} rejected, ${t.draft} draft of ${t.total}. Review drafts`)}">
        <span class="a-prog-name">${esc(examName(ex))}</span>
        ${progressBar(t.reviewed, t.rejected, t.total)}
        <span class="a-prog-n"><span title="Reviewed">${num(t.reviewed)}</span><span title="Rejected">${num(t.rejected)}</span><span title="Draft">${num(t.draft)}</span><span class="a-prog-tot">${num(t.total)}</span></span>
      </a>`;
    })
    .join('');
  return `<section class="a-card" aria-labelledby="c-review">
    <div class="a-card-h"><h2 id="c-review">Question review</h2><span class="a-dim">${num(all.reviewed)} of ${num(all.total)} reviewed (${pct}%)</span></div>
    <div class="a-legend"><span><i class="p-ok"></i>Reviewed</span><span><i class="p-bad"></i>Rejected</span><span><i class="p-draft"></i>Draft</span></div>
    ${rows ? `<div class="a-prog-list"><div class="a-prog-row a-prog-head" aria-hidden="true"><span>Exam</span><span></span><span class="a-prog-n"><span>Reviewed</span><span>Rejected</span><span>Draft</span><span class="a-prog-tot">Total</span></span></div>${rows}</div>` : emptyState('No questions loaded', 'The bank is empty. Add files under content/bank and reload it from the Questions page.')}
  </section>`;
}

function latestLeads(rows: Row[]): string {
  const items = rows.slice(0, 5);
  return `<section class="a-card a-card-flush" aria-labelledby="c-ll">
    <div class="a-card-h a-pad"><h2 id="c-ll">Latest leads</h2><a class="a-link" href="#/leads">View all</a></div>
    ${
      items.length
        ? `<ul class="a-mini">${items
            .map(
              (r) =>
                `<li><span class="a-mini-main"><strong>${esc(r.name || phone(r.phone))}</strong><span class="a-dim">${esc(r.name ? phone(r.phone) : '')} ${esc(examName(r.exam))}</span></span><span class="a-dim">${esc(relTime(r.created_at))}</span></li>`,
            )
            .join('')}</ul>`
        : `<p class="a-mini-empty">No leads yet.</p>`
    }
  </section>`;
}

function latestAttempts(rows: Row[]): string {
  const items = rows.slice(0, 5);
  return `<section class="a-card a-card-flush" aria-labelledby="c-la">
    <div class="a-card-h a-pad"><h2 id="c-la">Latest attempts</h2><a class="a-link" href="#/attempts">View all</a></div>
    ${
      items.length
        ? `<ul class="a-mini">${items
            .map((r) => {
              const pct = Number(r.total) ? Math.round((Number(r.score) / Number(r.total)) * 100) : 0;
              return `<li><span class="a-mini-main"><strong>${esc(r.student || 'Guest')}</strong><span class="a-dim">${esc(examName(r.exam))} · ${esc(r.paper)} · ${num(Number(r.score))}/${num(Number(r.total))} (${pct}%)</span></span><span class="a-dim">${esc(relTime(r.created_at))}</span></li>`;
            })
            .join('')}</ul>`
        : `<p class="a-mini-empty">No attempts yet.</p>`
    }
  </section>`;
}

export const mountHome: Mount = (el, ctx) => {
  let ro: ResizeObserver | undefined;

  async function render(force = false) {
    el.innerHTML = `${pageHeader('Home', 'Leads, students and question review at a glance.', [
      { label: 'Refresh', action: 'refresh', icon: 'refresh' },
      { label: 'Review questions', href: '#/questions?status=draft', primary: true },
    ])}${skeleton(8)}`;
    let s: Stats, leads: Row[], attempts: Row[];
    try {
      [s, leads, attempts] = await Promise.all([ctx.stats(force), ctx.leads(force), ctx.attempts(force)]);
    } catch (e) {
      el.querySelector('.a-skel')!.outerHTML = errorBox(e, 'refresh');
      return;
    }
    const q = questionTotals(s);
    const pct = q.total ? Math.round((q.reviewed / q.total) * 100) : 0;
    const leadDays = perDay(leads);
    const attemptDays = perDay(attempts);
    el.querySelector('.a-skel')!.outerHTML = `
      <div class="a-kpis">
        ${kpi('Leads', num(s.leads), `${num(since(leads, 7))} in the last 7 days`, '#/leads')}
        ${kpi('Students', num(s.students), 'Registered accounts')}
        ${kpi('Attempts', num(s.attempts), `${num(since(attempts, 7))} in the last 7 days`, '#/attempts')}
        ${kpi('Passes sold', num(s.passes), 'All exams')}
        ${kpi('Questions reviewed', `${num(q.reviewed)}<span class="a-kpi-of"> / ${num(q.total)}</span>`, `${pct}% done · ${num(q.draft)} drafts left`, '#/questions?status=draft', `<span class="a-meter" aria-hidden="true"><i style="width:${pct}%"></i></span>`)}
      </div>
      <div class="a-grid-2">${chartCard('leads', 'Leads per day', leadDays)}${chartCard('attempts', 'Attempts per day', attemptDays)}</div>
      ${reviewCard(s, ctx.exams)}
      <div class="a-grid-2">${latestLeads(leads)}${latestAttempts(attempts)}</div>`;
    const draw = () => {
      drawBars(el.querySelector<HTMLElement>('[data-chart="leads"]')!, leadDays, ['lead', 'leads']);
      drawBars(el.querySelector<HTMLElement>('[data-chart="attempts"]')!, attemptDays, ['attempt', 'attempts']);
    };
    draw();
    ro?.disconnect();
    let lastW = 0;
    ro = new ResizeObserver(() => {
      const w = el.querySelector<HTMLElement>('[data-chart="leads"]')?.clientWidth ?? 0;
      if (w && Math.abs(w - lastW) > 4) {
        lastW = w;
        draw();
      }
    });
    ro.observe(el.querySelector<HTMLElement>('[data-chart="leads"]')!);
  }

  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-action="refresh"]');
    if (b) {
      void render(true);
      ctx.refreshCounts();
    }
  });
  void render();
  return { destroy: () => ro?.disconnect() };
};

