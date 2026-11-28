// Practice mode: answer, then the explanation straight away. No timer.
import { postAttempt } from './api.ts';
import { leadHtml, wireLead } from './lead.ts';
import { bi, esc, forget, items, LETTERS, load, save, tr, type PaperData } from './paper.ts';
import { attemptBody, isSkipOption, score, solutionsHtml, summaryHtml, topicTable, wireSolutionFilter } from './result.ts';

interface State {
  answers: (number | null)[];
  pos: number;
  startedAt: number;
}

export interface PracticeOptions {
  examHref: string;
  testHref?: string;
  /** localStorage key for resuming (default: one per paper). */
  storageKey?: string;
  /** Number questions as part of a longer run: "Question offset+n of total". */
  numberOffset?: number;
  numberTotal?: number;
  /** Extra buttons/links on the finish screen, and extra HTML after the result panel. */
  finishActions?: string;
  finishHtml?: string;
}

export function mountPractice(root: HTMLElement, paper: PaperData, opts: PracticeOptions) {
  const list = items(paper);
  const N = list.length;
  const KEY = opts.storageKey ?? `pq-practice:${paper.exam}/${paper.id}`;
  const OFF = opts.numberOffset ?? 0;
  const ALL = opts.numberTotal ?? N;
  let st: State = load<State>(KEY) ?? { answers: Array(N).fill(null), pos: 0, startedAt: Date.now() };
  if (!Array.isArray(st.answers) || st.answers.length !== N) st = { answers: Array(N).fill(null), pos: 0, startedAt: Date.now() };

  root.classList.add('practice');
  root.innerHTML = `
    <header class="cbt-bar glass-bar">
      <a class="cbt-exit" href="${esc(opts.examHref)}" aria-label="Exit">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
      </a>
      <span class="cbt-title">${bi(paper.title)}</span>
      <span class="chip chip-static" data-tally></span>
      <button class="chip" type="button" data-lang-toggle><span class="l-en" lang="hi">हिन्दी</span><span class="l-hi" lang="en">English</span></button>
    </header>
    <div class="progress" aria-hidden="true"><i data-progress></i></div>
    <div class="container narrow practice-body">
      <article class="panel q-card" data-q></article>
      <section data-done hidden></section>
    </div>
    <div class="action-bar glass-bar" data-bar>
      <button class="btn btn-quiet" type="button" data-prev aria-keyshortcuts="P">${bi(tr('Previous', 'पिछला'))}</button>
      <button class="btn btn-quiet" type="button" data-finish>${bi(tr('Finish', 'समाप्त'))}</button>
      <button class="btn btn-primary" type="button" data-next aria-keyshortcuts="N">${bi(tr('Next', 'अगला'))}</button>
    </div>`;

  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const qEl = $('[data-q]');
  const done = $('[data-done]');
  const bar = $('[data-bar]');

  function tally() {
    let right = 0;
    let tried = 0;
    list.forEach((it) => {
      const a = st.answers[it.i];
      if (a === null || isSkipOption(it.q, a)) return;
      tried++;
      if (a === it.q.answer) right++;
    });
    $('[data-tally]').innerHTML = bi(tr(`${right}/${tried} right`, `${tried} में ${right} सही`));
    $('[data-progress]').style.width = `${Math.round((tried / N) * 100)}%`;
  }

  function show(i: number, focusFeedback = false) {
    st.pos = i;
    save(KEY, st);
    const it = list[i];
    const a = st.answers[i];
    const answered = a !== null;
    qEl.innerHTML = `
      <header class="q-head"><span class="qno">${bi(tr(`Question ${it.n + OFF} of ${ALL}`, `प्रश्न ${it.n + OFF} / ${ALL}`))}</span><span class="muted small">${bi(it.q.topic)}</span></header>
      <div class="q-text">${bi(it.q.text, 'p')}</div>
      <div class="opts" role="group" aria-label="Options">
        ${it.q.options
          .map((o, k) => {
            let cls = '';
            if (answered) cls = k === it.q.answer ? 'is-right' : k === a ? 'is-wrong' : 'is-dim';
            return `<button type="button" class="opt ${cls}" data-opt="${k}" ${answered ? 'aria-disabled="true"' : ''} aria-keyshortcuts="${k + 1}"><span class="opt-l">${LETTERS[k]}</span><span class="opt-t">${bi(o)}</span></button>`;
          })
          .join('')}
      </div>
      <div class="feedback" data-feedback aria-live="polite" tabindex="-1">${
        answered
          ? `<p class="verdict ${a === it.q.answer ? 'ok' : 'bad'}">${a === it.q.answer ? bi(tr('Correct', 'सही')) : bi(tr(`Not quite. The answer is ${LETTERS[it.q.answer]}.`, `सही उत्तर ${LETTERS[it.q.answer]} है।`))}</p>
             <div class="expl">${bi(it.q.explanation)}</div>`
          : ''
      }</div>`;
    ($('[data-prev]') as HTMLButtonElement).disabled = i === 0;
    $('[data-next]').innerHTML = i === N - 1 ? bi(tr('See result', 'परिणाम देखें')) : bi(tr('Next', 'अगला'));
    tally();
    if (focusFeedback) root.querySelector<HTMLElement>('[data-feedback]')?.focus({ preventScroll: true });
  }

  function choose(k: number) {
    if (st.answers[st.pos] !== null) return;
    if (k >= list[st.pos].q.options.length) return;
    st.answers[st.pos] = k;
    show(st.pos, true);
    root.querySelector('[data-feedback]')?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function finish() {
    const o = score(paper, list, st.answers);
    void postAttempt(attemptBody(paper, list, st.answers, o));
    forget(KEY);
    qEl.hidden = true;
    bar.hidden = true;
    done.hidden = false;
    done.innerHTML = `
      <div class="panel result-panel">
        <h1 class="h-md">${bi(tr('Set complete', 'सेट पूरा'))}</h1>
        ${summaryHtml(paper, o, null)}
        <div class="row-actions">
          ${opts.finishActions ?? ''}
          ${opts.testHref ? `<a class="btn" href="${esc(opts.testHref)}">${bi(tr('Now try it as a timed test', 'अब समयबद्ध टेस्ट दें'))}</a>` : ''}
          <button class="btn btn-quiet" type="button" data-again>${bi(tr('Practise again', 'फिर अभ्यास करें'))}</button>
        </div>
      </div>
      ${opts.finishHtml ?? ''}
      ${paper.free ? `<div data-lead-slot>${leadHtml(paper.exam, 'p')}</div>` : ''}
      <div class="panel">${topicTable(o)}</div>
      <div class="panel">${solutionsHtml(list, st.answers)}</div>`;
    wireSolutionFilter(done);
    const slot = done.querySelector<HTMLElement>('[data-lead-slot]');
    if (slot) wireLead(slot, { exam: paper.exam, score: o.score, total: o.max });
    done.querySelector('[data-again]')!.addEventListener('click', () => {
      st = { answers: Array(N).fill(null), pos: 0, startedAt: Date.now() };
      done.hidden = true;
      qEl.hidden = false;
      bar.hidden = false;
      show(0);
    });
    window.scrollTo(0, 0);
  }

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const opt = t.closest<HTMLElement>('[data-opt]');
    if (opt) return choose(Number(opt.dataset.opt));
    if (t.closest('[data-prev]')) return st.pos > 0 && show(st.pos - 1);
    if (t.closest('[data-next]')) return st.pos < N - 1 ? show(st.pos + 1) : finish();
    if (t.closest('[data-finish]')) return finish();
  });

  document.addEventListener('keydown', (e) => {
    if (qEl.hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if (/^[1-5]$/.test(k)) choose(Number(k) - 1);
    else if (k === 'n') st.pos < N - 1 ? show(st.pos + 1) : finish();
    else if (k === 'p' && st.pos > 0) show(st.pos - 1);
    else return;
    e.preventDefault();
  });

  show(Math.min(st.pos, N - 1));
}
