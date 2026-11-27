// Scoring and the result screen shared by the mock test, OMR mode and practice.
import { bi, esc, LETTERS, round2, fmtTime, tr, type Bi, type Item, type PaperData, type Question } from './paper.ts';

export type Answers = (number | null)[];

/** RPSC-style papers add a fifth option meaning "not attempted"; picking it is a skip, not a wrong answer. */
export function isSkipOption(q: Question, idx: number): boolean {
  const o = q.options[idx];
  return !!o && idx === 4 && idx !== q.answer && /not attempted|unattempted|अनुत्तरित|प्रयास नहीं/i.test(`${o.en} ${o.hi}`);
}

export interface Outcome {
  score: number;
  max: number;
  right: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  sections: { name: Bi; right: number; wrong: number; skipped: number; total: number; score: number }[];
  topics: { topic: Bi; right: number; total: number; attempted: number }[];
}

export function verdict(q: Question, a: number | null): 'right' | 'wrong' | 'skip' {
  if (a === null || a === undefined || isSkipOption(q, a)) return 'skip';
  return a === q.answer ? 'right' : 'wrong';
}

export function score(paper: PaperData, list: Item[], answers: Answers): Outcome {
  const mpq = paper.marks_per_question;
  const neg = paper.negative_marking;
  const sec = new Map<string, Outcome['sections'][number]>();
  const top = new Map<string, Outcome['topics'][number]>();
  let right = 0;
  let wrong = 0;
  let skipped = 0;
  for (const it of list) {
    const v = verdict(it.q, answers[it.i]);
    const s = sec.get(it.section.id) ?? { name: it.section.name, right: 0, wrong: 0, skipped: 0, total: 0, score: 0 };
    const t = top.get(it.q.topic.en) ?? { topic: it.q.topic, right: 0, total: 0, attempted: 0 };
    s.total++;
    t.total++;
    if (v === 'right') {
      right++;
      s.right++;
      s.score += mpq;
      t.right++;
      t.attempted++;
    } else if (v === 'wrong') {
      wrong++;
      s.wrong++;
      s.score -= neg;
      t.attempted++;
    } else {
      skipped++;
      s.skipped++;
    }
    sec.set(it.section.id, s);
    top.set(it.q.topic.en, t);
  }
  for (const s of sec.values()) s.score = round2(s.score);
  return {
    score: round2(right * mpq - wrong * neg),
    max: round2(list.length * mpq),
    right,
    wrong,
    skipped,
    accuracy: right + wrong ? Math.round((right / (right + wrong)) * 100) : 0,
    sections: [...sec.values()],
    topics: [...top.values()].sort((a, b) => a.right / a.total - b.right / b.total),
  };
}

/** Body for POST /api/attempts. */
export function attemptBody(paper: PaperData, list: Item[], answers: Answers, o: Outcome) {
  const topics: Record<string, [number, number]> = {};
  for (const t of o.topics) topics[t.topic.en] = [t.right, t.total];
  return { exam: paper.exam, paper: paper.id, answers: list.map((it) => answers[it.i] ?? null), score: o.score, total: o.max, topics };
}

function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

export function summaryHtml(paper: PaperData, o: Outcome, seconds: number | null): string {
  const neg = paper.negative_marking > 0;
  const stat = (label: Bi, value: string, cls = '') => `<div class="stat ${cls}"><span class="stat-v">${value}</span><span class="stat-l">${bi(label)}</span></div>`;
  return `<div class="score-head">
    <p class="eyebrow">${bi(tr('Your score', 'आपका स्कोर'))}</p>
    <p class="score-big"><strong>${o.score}</strong><span>/ ${o.max}</span></p>
    ${neg ? `<p class="muted small">${bi(tr(`Includes −${paper.negative_marking} for each wrong answer.`, `हर गलत उत्तर पर −${paper.negative_marking} शामिल।`))}</p>` : ''}
  </div>
  <div class="stats">
    ${stat(tr('Accuracy', 'सटीकता'), `${o.accuracy}%`)}
    ${stat(tr('Right', 'सही'), String(o.right), 'ok')}
    ${stat(tr('Wrong', 'गलत'), String(o.wrong), 'bad')}
    ${stat(tr('Skipped', 'छोड़े'), String(o.skipped))}
    ${seconds !== null ? stat(tr('Time taken', 'लिया गया समय'), fmtTime(seconds)) : ''}
  </div>`;
}

export function sectionTable(o: Outcome): string {
  if (o.sections.length < 2) return '';
  const rows = o.sections
    .map((s) => `<tr><td>${bi(s.name)}</td><td>${s.right}</td><td>${s.wrong}</td><td>${s.skipped}</td><td><strong>${s.score}</strong></td></tr>`)
    .join('');
  return `<h3>${bi(tr('Section-wise', 'खण्डवार'))}</h3><div class="table-wrap"><table class="data"><thead><tr><th>${bi(tr('Section', 'खण्ड'))}</th><th>${bi(tr('Right', 'सही'))}</th><th>${bi(tr('Wrong', 'गलत'))}</th><th>${bi(tr('Skipped', 'छोड़े'))}</th><th>${bi(tr('Score', 'अंक'))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function topicTable(o: Outcome): string {
  if (!o.topics.length) return '';
  const rows = o.topics
    .map((t) => {
      const p = pct(t.right, t.total);
      const weak = t.attempted > 0 && p < 60;
      const tag = weak ? `<span class="tag tag-weak">${bi(tr('Revise', 'दोहराएं'))}</span>` : t.attempted === 0 ? `<span class="tag">${bi(tr('Not tried', 'छोड़ा'))}</span>` : '';
      return `<tr class="${weak ? 'weak' : ''}"><td>${bi(t.topic)}</td><td>${t.right}/${t.total}</td><td><span class="meter" aria-hidden="true"><i style="width:${p}%"></i></span> ${p}%</td><td>${tag}</td></tr>`;
    })
    .join('');
  return `<h3>${bi(tr('Topic-wise', 'विषयवार'))}</h3><div class="table-wrap"><table class="data"><thead><tr><th>${bi(tr('Topic', 'विषय'))}</th><th>${bi(tr('Right', 'सही'))}</th><th>${bi(tr('Score', 'प्रतिशत'))}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function optionList(q: Question, chosen: number | null, reveal: boolean): string {
  return `<ol class="opts static">${q.options
    .map((o, k) => {
      const cls = reveal ? (k === q.answer ? 'is-right' : k === chosen ? (isSkipOption(q, k) ? 'is-chosen' : 'is-wrong') : '') : k === chosen ? 'is-chosen' : '';
      const note = reveal && k === q.answer ? `<span class="sr-only">${bi(tr('(correct answer)', '(सही उत्तर)'))}</span>` : reveal && k === chosen ? `<span class="sr-only">${bi(tr('(your answer)', '(आपका उत्तर)'))}</span>` : '';
      return `<li class="opt ${cls}"><span class="opt-l">${LETTERS[k]}</span><span class="opt-t">${bi(o)}${note}</span></li>`;
    })
    .join('')}</ol>`;
}

export function solutionsHtml(list: Item[], answers: Answers, marked?: boolean[]): string {
  const filters = `<div class="seg" role="group" aria-label="Filter" data-sol-filter>
    <button type="button" class="seg-b" aria-pressed="true" data-f="all">${bi(tr('All', 'सभी'))}</button>
    <button type="button" class="seg-b" aria-pressed="false" data-f="wrong">${bi(tr('Wrong', 'गलत'))}</button>
    <button type="button" class="seg-b" aria-pressed="false" data-f="skip">${bi(tr('Skipped', 'छोड़े'))}</button>
    ${marked ? `<button type="button" class="seg-b" aria-pressed="false" data-f="marked">${bi(tr('Marked', 'चिह्नित'))}</button>` : ''}
  </div>`;
  const body = list
    .map((it) => {
      const a = answers[it.i] ?? null;
      const v = verdict(it.q, a);
      const badge = v === 'right' ? `<span class="tag tag-ok">${bi(tr('Right', 'सही'))}</span>` : v === 'wrong' ? `<span class="tag tag-bad">${bi(tr('Wrong', 'गलत'))}</span>` : `<span class="tag">${bi(tr('Skipped', 'छोड़ा'))}</span>`;
      return `<article class="sol" data-v="${v}" data-m="${marked?.[it.i] ? 1 : 0}">
        <header class="sol-h"><span class="qno">Q${it.n}</span>${badge}<span class="muted small">${bi(it.q.topic)}</span></header>
        <div class="q-text">${bi(it.q.text, 'p')}</div>
        ${optionList(it.q, a, true)}
        <div class="expl"><strong>${bi(tr('Explanation', 'व्याख्या'))}:</strong> ${bi(it.q.explanation)}</div>
      </article>`;
    })
    .join('');
  return `<h3>${bi(tr('Solutions', 'हल'))}</h3>${filters}<div class="sols" data-sols>${body}</div>`;
}

export function wireSolutionFilter(root: HTMLElement) {
  const group = root.querySelector<HTMLElement>('[data-sol-filter]');
  if (!group) return;
  group.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-f]');
    if (!b) return;
    for (const x of group.querySelectorAll('[data-f]')) x.setAttribute('aria-pressed', String(x === b));
    const f = b.dataset.f;
    for (const s of root.querySelectorAll<HTMLElement>('.sol')) {
      s.hidden = f === 'all' ? false : f === 'marked' ? s.dataset.m !== '1' : s.dataset.v !== f;
    }
  });
}

export { esc };
