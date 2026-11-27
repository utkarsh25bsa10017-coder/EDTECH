// CBT-style mock test, plus the "paper + OMR" timed mode.
// Rendered entirely on the client from a PaperData, so the same code runs for
// free papers (embedded JSON) and paid papers (fetched from the API).
import { postAttempt } from './api.ts';
import { leadHtml, wireLead } from './lead.ts';
import { bi, both, esc, fmtTime, forget, items, LETTERS, load, save, tr, type Item, type PaperData } from './paper.ts';
import { attemptBody, score, sectionTable, solutionsHtml, summaryHtml, topicTable, wireSolutionFilter } from './result.ts';

type Status = 'nv' | 'na' | 'a' | 'm' | 'am';

interface Run {
  answers: (number | null)[];
  marked: boolean[];
  visited: boolean[];
  pos: number;
  startedAt: number;
  endsAt: number;
}

export interface CbtOptions {
  omr?: boolean;
  /** Where "Exit" and "practice" links go. */
  examHref: string;
  practiceHref?: string;
  bookletHref?: string;
  sheetHref?: string;
}

const STATUS_LABEL: Record<Status, { en: string; hi: string }> = {
  nv: tr('Not visited', 'नहीं देखा'),
  na: tr('Not answered', 'उत्तर नहीं दिया'),
  a: tr('Answered', 'उत्तर दिया'),
  m: tr('Marked for review', 'समीक्षा हेतु चिह्नित'),
  am: tr('Answered & marked', 'उत्तर दिया व चिह्नित'),
};

export function mountCbt(root: HTMLElement, paper: PaperData, opts: CbtOptions) {
  const omr = !!opts.omr;
  const list = items(paper);
  const N = list.length;
  const KEY = `pq-run:${omr ? 'omr' : 'test'}:${paper.exam}/${paper.id}`;
  const LAST = `pq-last:${paper.exam}/${paper.id}`;

  root.classList.add('cbt');
  root.dataset.mode = omr ? 'omr' : 'test';
  root.innerHTML = `
    <header class="cbt-bar glass-bar">
      <a class="cbt-exit" href="${esc(opts.examHref)}" data-exit aria-label="Exit">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
      </a>
      <span class="cbt-title">${bi(paper.title)}</span>
      <span class="cbt-timer" data-timer hidden><span class="sr-only">${bi(tr('Time left', 'शेष समय'))}</span><span data-time>--:--</span></span>
      <button class="chip" type="button" data-lang-toggle><span class="l-en" lang="hi">हिन्दी</span><span class="l-hi" lang="en">English</span></button>
    </header>
    <p class="sr-only" aria-live="polite" data-announce></p>

    <section class="cbt-intro container narrow" data-intro>
      <div class="panel">
        <h1>${omr ? bi(tr('Paper + OMR: instructions', 'प्रश्नपत्र + ओएमआर: निर्देश')) : bi(tr('Mock test: instructions', 'मॉक टेस्ट: निर्देश'))}</h1>
        <ul class="facts">
          <li>${bi(tr(`${N} questions in ${paper.sections.length} section${paper.sections.length > 1 ? 's' : ''}`, `${paper.sections.length} खण्डों में ${N} प्रश्न`))}</li>
          <li>${bi(tr(`${paper.duration_minutes} minutes`, `${paper.duration_minutes} मिनट`))}</li>
          <li>${bi(
            tr(
              `+${paper.marks_per_question} per right answer, ${paper.negative_marking > 0 ? `−${paper.negative_marking} per wrong answer` : 'no negative marking'}`,
              `सही उत्तर पर +${paper.marks_per_question}, ${paper.negative_marking > 0 ? `गलत उत्तर पर −${paper.negative_marking}` : 'ऋणात्मक अंकन नहीं'}`,
            ),
          )}</li>
        </ul>
        <ol class="rules">
          <li>${bi(tr('The clock starts when you press Start. The test submits itself when time runs out.', 'स्टार्ट दबाते ही समय शुरू होगा। समय समाप्त होने पर टेस्ट अपने आप जमा हो जाएगा।'))}</li>
          ${
            omr
              ? `<li>${bi(tr('Read the questions on the paper and fill one bubble per question on the OMR sheet. On a phone, switch between Paper and OMR at the bottom.', 'प्रश्नपत्र में प्रश्न पढ़ें और ओएमआर शीट पर हर प्रश्न का एक गोला भरें। फ़ोन पर नीचे से प्रश्नपत्र और ओएमआर के बीच बदलें।'))}</li>
                 <li>${bi(tr('Tap a filled bubble again to clear it.', 'भरे हुए गोले को दोबारा दबाकर हटाएं।'))}</li>`
              : `<li>${bi(tr('Save & Next records your answer and moves on. Mark for Review flags a question to come back to; marked answers still count.', 'सेव एवं नेक्स्ट उत्तर सहेजकर आगे बढ़ता है। समीक्षा हेतु चिह्नित प्रश्न बाद में देखने के लिए है; चिह्नित उत्तर भी गिने जाते हैं।'))}</li>
                 <li>${bi(tr('The question palette shows the status of every question. Tap a number to jump to it.', 'प्रश्न पैलेट हर प्रश्न की स्थिति दिखाता है। किसी नंबर पर दबाकर वहां जाएं।'))}</li>
                 <li class="kbd-hint">${bi(tr('Keyboard: 1–5 pick an option, N next, P previous, M mark for review.', 'कीबोर्ड: 1–5 विकल्प चुनें, N अगला, P पिछला, M समीक्षा हेतु चिह्नित।'))}</li>`
          }
        </ol>
        ${omr ? '' : `<div class="legend">${(['nv', 'na', 'a', 'm', 'am'] as Status[]).map((s, k) => `<span><i class="st st-${s}">${k + 1}</i>${bi(STATUS_LABEL[s])}</span>`).join('')}</div>`}
        ${paper.status === 'draft' ? `<p class="note">${bi(tr('Draft set: answers are still being checked by subject experts.', 'ड्राफ़्ट सेट: उत्तरों की जांच विषय विशेषज्ञ कर रहे हैं।'))}</p>` : ''}
        <label class="check"><input type="checkbox" data-agree /> <span>${bi(tr('I have read the instructions.', 'मैंने निर्देश पढ़ लिए हैं।'))}</span></label>
        <div class="row-actions">
          <button class="btn btn-primary" type="button" data-start disabled>${bi(tr('Start', 'शुरू करें'))}</button>
          <button class="btn" type="button" data-resume hidden>${bi(tr('Resume where I left off', 'जहां छोड़ा था वहीं से जारी रखें'))}</button>
          ${opts.practiceHref ? `<a class="btn btn-quiet" href="${esc(opts.practiceHref)}">${bi(tr('Practise first', 'पहले अभ्यास करें'))}</a>` : ''}
        </div>
      </div>
    </section>

    <section class="cbt-main" data-main hidden></section>

    <dialog class="dialog panel" data-confirm aria-labelledby="cbt-confirm-h">
      <h2 id="cbt-confirm-h">${bi(tr('Submit the test?', 'टेस्ट जमा करें?'))}</h2>
      <div data-confirm-body></div>
      <div class="row-actions end">
        <button class="btn" type="button" data-cancel>${bi(tr('Keep going', 'जारी रखें'))}</button>
        <button class="btn btn-primary" type="button" data-confirm-yes>${bi(tr('Submit', 'जमा करें'))}</button>
      </div>
    </dialog>

    <section class="cbt-result container" data-result hidden></section>`;

  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const intro = $('[data-intro]');
  const main = $('[data-main]');
  const resultEl = $('[data-result]');
  const timerEl = $('[data-timer]');
  const timeEl = $('[data-time]');
  const announce = $('[data-announce]');
  const dialog = $<HTMLDialogElement>('[data-confirm]');

  let run: Run | null = null;
  let tick = 0;
  let warned5 = false;
  let warned1 = false;

  /* ----------------------------------------------------------- intro */
  const agree = $<HTMLInputElement>('[data-agree]');
  const startBtn = $<HTMLButtonElement>('[data-start]');
  agree.addEventListener('change', () => (startBtn.disabled = !agree.checked));

  const saved = load<Run>(KEY);
  if (saved && Array.isArray(saved.answers) && saved.answers.length === N) {
    if (saved.endsAt > Date.now()) {
      const resume = $<HTMLButtonElement>('[data-resume]');
      resume.hidden = false;
      resume.addEventListener('click', () => begin(saved));
    } else {
      // Time ran out while the page was closed: submit what was saved.
      run = saved;
      finish(true);
    }
  }

  startBtn.addEventListener('click', () => {
    const now = Date.now();
    begin({
      answers: Array(N).fill(null),
      marked: Array(N).fill(false),
      visited: Array(N).fill(false),
      pos: 0,
      startedAt: now,
      endsAt: now + paper.duration_minutes * 60_000,
    });
  });

  function begin(r: Run) {
    run = r;
    intro.hidden = true;
    main.hidden = false;
    timerEl.hidden = false;
    if (omr) buildOmr();
    else buildTest();
    tick = window.setInterval(onTick, 1000);
    onTick();
    persist();
    window.addEventListener('beforeunload', guard);
    window.scrollTo(0, 0);
  }

  function guard(e: BeforeUnloadEvent) {
    if (run) {
      persist();
      e.preventDefault();
    }
  }

  function persist() {
    if (run) save(KEY, run);
  }

  function onTick() {
    if (!run) return;
    const left = Math.round((run.endsAt - Date.now()) / 1000);
    timeEl.textContent = fmtTime(left);
    timerEl.classList.toggle('low', left <= 300);
    if (left <= 300 && !warned5 && left > 60) {
      warned5 = true;
      announce.textContent = 'Five minutes left. पांच मिनट शेष।';
    }
    if (left <= 60 && !warned1) {
      warned1 = true;
      announce.textContent = 'One minute left. एक मिनट शेष।';
    }
    if (left <= 0) finish(true);
  }

  function status(i: number): Status {
    const r = run!;
    const ans = r.answers[i] !== null;
    if (r.marked[i]) return ans ? 'am' : 'm';
    if (ans) return 'a';
    return r.visited[i] ? 'na' : 'nv';
  }

  function counts() {
    const c: Record<Status, number> = { nv: 0, na: 0, a: 0, m: 0, am: 0 };
    for (let i = 0; i < N; i++) c[status(i)]++;
    return c;
  }

  /* ------------------------------------------------------- CBT view */
  function buildTest() {
    main.innerHTML = `
      <div class="cbt-grid">
        <div class="cbt-left">
          <nav class="sec-tabs" aria-label="Sections" data-tabs></nav>
          <article class="panel q-card" data-q aria-live="polite"></article>
        </div>
        <aside class="cbt-side" data-side aria-label="Question palette">
          <div class="panel side-panel">
            <div class="side-head"><h2 class="h-sm">${bi(tr('Question palette', 'प्रश्न पैलेट'))}</h2>
              <button class="icon-btn side-close" type="button" data-side-close aria-label="Close">&times;</button></div>
            <div class="legend compact" data-legend></div>
            <div class="palette" data-palette></div>
            <button class="btn btn-primary btn-block" type="button" data-submit>${bi(tr('Submit test', 'टेस्ट जमा करें'))}</button>
          </div>
        </aside>
      </div>
      <div class="action-bar glass-bar" role="toolbar" aria-label="Question actions">
        <button class="btn btn-quiet" type="button" data-prev aria-keyshortcuts="P">${bi(tr('Prev', 'पिछला'))}</button>
        <button class="btn" type="button" data-mark aria-keyshortcuts="M">${bi(tr('Mark & next', 'चिह्नित व आगे'))}</button>
        <button class="btn btn-quiet" type="button" data-clear>${bi(tr('Clear', 'हटाएं'))}</button>
        <button class="btn btn-quiet palette-btn" type="button" data-side-open aria-label="Question palette">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        </button>
        <button class="btn btn-primary" type="button" data-save aria-keyshortcuts="N">${bi(tr('Save & next', 'सेव एवं नेक्स्ट'))}</button>
      </div>`;

    const tabs = $('[data-tabs]');
    tabs.innerHTML = paper.sections
      .map((s, k) => `<button type="button" class="tab" data-sec="${k}">${bi(s.name)} <span class="tab-n" data-sec-n="${k}"></span></button>`)
      .join('');
    tabs.hidden = paper.sections.length < 2;
    $('[data-legend]').innerHTML = (['a', 'na', 'nv', 'm', 'am'] as Status[]).map((s) => `<span><i class="st st-${s}" data-cnt="${s}">0</i>${bi(STATUS_LABEL[s])}</span>`).join('');
    $('[data-palette]').innerHTML = list.map((it) => `<button type="button" class="st" data-go="${it.i}" aria-label="Question ${it.n}">${it.n}</button>`).join('');

    main.addEventListener('click', onMainClick);
    document.addEventListener('keydown', onKey);
    show(run!.pos);
  }

  function onMainClick(e: Event) {
    const t = e.target as HTMLElement;
    const r = run!;
    const opt = t.closest<HTMLInputElement>('input[data-opt]');
    if (opt) {
      r.answers[r.pos] = Number(opt.value);
      refresh();
      return;
    }
    const go = t.closest<HTMLElement>('[data-go]');
    if (go) {
      show(Number(go.dataset.go));
      closeSide();
      return;
    }
    const sec = t.closest<HTMLElement>('[data-sec]');
    if (sec) {
      const k = Number(sec.dataset.sec);
      const first = list.find((it) => it.section === paper.sections[k]);
      if (first) show(first.i);
      return;
    }
    if (t.closest('[data-save]')) return next();
    if (t.closest('[data-prev]')) return show(Math.max(0, r.pos - 1));
    if (t.closest('[data-mark]')) {
      r.marked[r.pos] = true;
      return next();
    }
    if (t.closest('[data-clear]')) {
      r.answers[r.pos] = null;
      show(r.pos);
      return;
    }
    if (t.closest('[data-side-open]')) return openSide();
    if (t.closest('[data-side-close]')) return closeSide();
    if (t.closest('[data-submit]')) return confirmSubmit();
  }

  function next() {
    const r = run!;
    if (r.pos < N - 1) show(r.pos + 1);
    else {
      refresh();
      confirmSubmit();
    }
  }

  function onKey(e: KeyboardEvent) {
    if (!run || main.hidden || dialog.open) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'TEXTAREA' || (tag === 'INPUT' && (e.target as HTMLInputElement).type !== 'radio')) return;
    const r = run;
    const k = e.key.toLowerCase();
    if (/^[1-5]$/.test(k)) {
      const idx = Number(k) - 1;
      if (idx < list[r.pos].q.options.length) {
        r.answers[r.pos] = idx;
        show(r.pos, true);
        e.preventDefault();
      }
    } else if (k === 'n') {
      next();
      e.preventDefault();
    } else if (k === 'p') {
      show(Math.max(0, r.pos - 1));
      e.preventDefault();
    } else if (k === 'm') {
      r.marked[r.pos] = !r.marked[r.pos];
      refresh();
      announce.textContent = r.marked[r.pos] ? 'Marked for review' : 'Mark removed';
      e.preventDefault();
    }
  }

  function show(i: number, keepFocus = false) {
    const r = run!;
    r.pos = i;
    r.visited[i] = true;
    const it = list[i];
    const chosen = r.answers[i];
    const qEl = $('[data-q]');
    qEl.innerHTML = `
      <header class="q-head">
        <span class="qno">${bi(tr(`Question ${it.n} of ${N}`, `प्रश्न ${it.n} / ${N}`))}</span>
        <span class="muted small">${bi(it.section.name)}</span>
      </header>
      <div class="q-text">${bi(it.q.text, 'p')}</div>
      <fieldset class="opts" data-opts>
        <legend class="sr-only">${bi(tr('Options', 'विकल्प'))}</legend>
        ${it.q.options
          .map(
            (o, k) => `<label class="opt${chosen === k ? ' is-chosen' : ''}"><input type="radio" name="q-opt" value="${k}" data-opt ${chosen === k ? 'checked' : ''} aria-keyshortcuts="${k + 1}" /><span class="opt-l">${LETTERS[k]}</span><span class="opt-t">${bi(o)}</span></label>`,
          )
          .join('')}
      </fieldset>
      ${r.marked[i] ? `<p class="marked-note">${bi(tr('Marked for review', 'समीक्षा हेतु चिह्नित'))}</p>` : ''}`;
    if (!keepFocus && document.activeElement && root.contains(document.activeElement) && document.activeElement.closest('[data-q]')) {
      (qEl as HTMLElement).focus?.();
    }
    if (keepFocus) qEl.querySelector<HTMLInputElement>('input:checked')?.focus();
    refresh();
    qEl.scrollIntoView({ block: 'nearest' });
  }

  function refresh() {
    const r = run!;
    for (const b of root.querySelectorAll<HTMLElement>('[data-go]')) {
      const i = Number(b.dataset.go);
      const s = status(i);
      b.className = `st st-${s}${i === r.pos ? ' current' : ''}`;
      b.setAttribute('aria-label', `Question ${i + 1}: ${STATUS_LABEL[s].en}`);
      if (i === r.pos) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    }
    for (const opt of root.querySelectorAll<HTMLElement>('[data-opts] .opt')) {
      const input = opt.querySelector('input')!;
      opt.classList.toggle('is-chosen', Number(input.value) === r.answers[r.pos]);
      input.checked = Number(input.value) === r.answers[r.pos];
    }
    const c = counts();
    for (const el of root.querySelectorAll<HTMLElement>('[data-cnt]')) el.textContent = String(c[el.dataset.cnt as Status]);
    const curSec = list[r.pos].section;
    paper.sections.forEach((s, k) => {
      const tab = root.querySelector<HTMLElement>(`[data-sec="${k}"]`);
      if (!tab) return;
      const its = list.filter((it) => it.section === s);
      tab.setAttribute('aria-current', String(s === curSec));
      root.querySelector<HTMLElement>(`[data-sec-n="${k}"]`)!.textContent = `${its.filter((it) => r.answers[it.i] !== null).length}/${its.length}`;
    });
    const markBtn = root.querySelector<HTMLElement>('[data-mark]');
    if (markBtn) markBtn.setAttribute('aria-pressed', String(r.marked[r.pos]));
    persist();
  }

  function openSide() {
    root.querySelector('[data-side]')?.classList.add('open');
    root.querySelector<HTMLElement>('[data-side-close]')?.focus();
  }
  function closeSide() {
    root.querySelector('[data-side]')?.classList.remove('open');
  }

  /* ------------------------------------------------------- OMR view */
  function buildOmr() {
    const r = run!;
    main.innerHTML = `
      <div class="omr-grid" data-omr-grid data-view="paper">
        <div class="omr-paper panel" data-pane="paper">
          ${paper.sections
            .map(
              (s) => `<h2 class="h-sm sec-h">${both(s.name)}</h2>${list
                .filter((it) => it.section === s)
                .map(
                  (it) => `<div class="pq" id="pq-${it.n}"><p class="pq-text"><strong>${it.n}.</strong> ${bi(it.q.text)}</p><ol class="pq-opts">${it.q.options.map((o, k) => `<li><span class="opt-l">${LETTERS[k]}</span> ${bi(o)}</li>`).join('')}</ol></div>`,
                )
                .join('')}`,
            )
            .join('')}
        </div>
        <div class="omr-sheet panel" data-pane="sheet">
          <h2 class="h-sm">${bi(tr('OMR answer sheet', 'ओएमआर उत्तर पत्रक'))}</h2>
          <p class="muted small" data-omr-count></p>
          <div class="omr-rows" role="group" aria-label="OMR answer sheet">
            ${list
              .map(
                (it) => `<div class="omr-row" role="radiogroup" aria-label="Question ${it.n}"><a class="omr-n" href="#pq-${it.n}" data-jump="${it.n}">${it.n}</a>${it.q.options
                  .map(
                    (_, k) => `<button type="button" class="bubble" role="radio" aria-checked="${r.answers[it.i] === k}" data-b="${it.i}:${k}" aria-label="Q${it.n} ${LETTERS[k]}">${LETTERS[k]}</button>`,
                  )
                  .join('')}</div>`,
              )
              .join('')}
          </div>
        </div>
      </div>
      <div class="action-bar glass-bar">
        <div class="seg omr-switch" role="group" aria-label="View">
          <button type="button" class="seg-b" data-view="paper" aria-pressed="true">${bi(tr('Paper', 'प्रश्नपत्र'))}</button>
          <button type="button" class="seg-b" data-view="sheet" aria-pressed="false">${bi(tr('OMR sheet', 'ओएमआर शीट'))}</button>
        </div>
        <button class="btn btn-primary" type="button" data-submit>${bi(tr('Submit', 'जमा करें'))}</button>
      </div>`;
    const grid = $('[data-omr-grid]');
    const countEl = $('[data-omr-count]');
    const upd = () => {
      const n = r.answers.filter((a) => a !== null).length;
      countEl.innerHTML = bi(tr(`${n} of ${N} filled`, `${N} में से ${n} भरे`));
    };
    upd();
    main.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const bub = t.closest<HTMLElement>('[data-b]');
      if (bub) {
        const [i, k] = bub.dataset.b!.split(':').map(Number);
        r.answers[i] = r.answers[i] === k ? null : k;
        r.visited[i] = true;
        for (const x of bub.parentElement!.querySelectorAll<HTMLElement>('[data-b]')) {
          x.setAttribute('aria-checked', String(Number(x.dataset.b!.split(':')[1]) === r.answers[i]));
        }
        upd();
        persist();
        return;
      }
      const v = t.closest<HTMLElement>('[data-view]');
      if (v && v.classList.contains('seg-b')) {
        grid.dataset.view = v.dataset.view;
        for (const x of root.querySelectorAll('.omr-switch [data-view]')) x.setAttribute('aria-pressed', String(x === v));
        window.scrollTo(0, 0);
        return;
      }
      const j = t.closest<HTMLElement>('[data-jump]');
      if (j && matchMedia('(max-width: 899px)').matches) {
        grid.dataset.view = 'paper';
        for (const x of root.querySelectorAll<HTMLElement>('.omr-switch [data-view]')) x.setAttribute('aria-pressed', String(x.dataset.view === 'paper'));
      }
      if (t.closest('[data-submit]')) confirmSubmit();
    });
  }

  /* --------------------------------------------------------- submit */
  function confirmSubmit() {
    const c = counts();
    const answered = c.a + c.am;
    $('[data-confirm-body]').innerHTML = `<ul class="facts">
      <li>${bi(tr(`Answered: ${answered}`, `उत्तर दिए: ${answered}`))}</li>
      <li>${bi(tr(`Not answered: ${N - answered}`, `उत्तर नहीं दिए: ${N - answered}`))}</li>
      ${omr ? '' : `<li>${bi(tr(`Marked for review: ${c.m + c.am}`, `समीक्षा हेतु चिह्नित: ${c.m + c.am}`))}</li>`}
      <li>${bi(tr(`Time left: ${timeEl.textContent}`, `शेष समय: ${timeEl.textContent}`))}</li></ul>`;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else if (confirm('Submit the test?')) finish(false);
  }
  $('[data-cancel]').addEventListener('click', () => dialog.close());
  $('[data-confirm-yes]').addEventListener('click', () => {
    dialog.close();
    finish(false);
  });

  function finish(timeUp: boolean) {
    if (!run) return;
    const r = run;
    run = null;
    clearInterval(tick);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('beforeunload', guard);
    if (dialog.open) dialog.close();
    forget(KEY);
    const seconds = Math.min((Math.min(Date.now(), r.endsAt) - r.startedAt) / 1000, paper.duration_minutes * 60);
    const o = score(paper, list, r.answers);
    save(LAST, { score: o.score, max: o.max, at: Date.now() });
    void postAttempt(attemptBody(paper, list, r.answers, o));

    intro.hidden = true;
    main.hidden = true;
    timerEl.hidden = true;
    resultEl.hidden = false;
    resultEl.innerHTML = `
      ${timeUp ? `<p class="note" role="status">${bi(tr('Time is up. Your test was submitted automatically.', 'समय समाप्त। आपका टेस्ट अपने आप जमा हो गया।'))}</p>` : ''}
      <div class="panel result-panel">
        <h1 class="h-md">${bi(paper.title)}</h1>
        ${summaryHtml(paper, o, seconds)}
        <div class="row-actions">
          <button class="btn" type="button" data-retake>${bi(tr('Take it again', 'फिर से दें'))}</button>
          ${opts.practiceHref ? `<a class="btn btn-quiet" href="${esc(opts.practiceHref)}">${bi(tr('Practice mode', 'अभ्यास मोड'))}</a>` : ''}
          <a class="btn btn-quiet" href="${esc(opts.examHref)}">${bi(tr('Exam page', 'परीक्षा पेज'))}</a>
        </div>
      </div>
      ${paper.free ? `<div data-lead-slot>${leadHtml(paper.exam)}</div>` : ''}
      <div class="panel">${sectionTable(o)}${topicTable(o)}</div>
      <div class="panel">${solutionsHtml(list, r.answers, omr ? undefined : r.marked)}</div>`;
    wireSolutionFilter(resultEl);
    const slot = resultEl.querySelector<HTMLElement>('[data-lead-slot]');
    if (slot) wireLead(slot, { exam: paper.exam, score: o.score, total: o.max });
    resultEl.querySelector('[data-retake]')!.addEventListener('click', () => location.reload());
    window.scrollTo(0, 0);
    resultEl.querySelector<HTMLElement>('h1')?.focus();
  }

  return { list: list as Item[] };
}
