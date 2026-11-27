// Printable question booklet and matching OMR answer sheet.
// Rendered on the client so free (embedded) and paid (API) papers share it;
// scripts/pdf.mjs prints these pages with Playwright.
import { bi, both, esc, items, LETTERS, tr, type Bi, type PaperData } from './paper.ts';

const DISCLAIMER = tr('Prashnottar practice paper, not an official document', 'प्रश्नोत्तर अभ्यास प्रश्नपत्र, आधिकारिक दस्तावेज़ नहीं');

type Lang = 'both' | 'hi' | 'en';

function langText(t: Bi, lang: Lang, cls = ''): string {
  if (lang === 'both') return both(t, cls);
  const v = lang === 'hi' ? t.hi : t.en;
  return `<span class="${cls}" lang="${t.en.trim() === t.hi.trim() ? 'hi' : lang}">${esc(v)}</span>`;
}

function readLang(): Lang {
  const l = new URLSearchParams(location.search).get('lang');
  return l === 'hi' || l === 'en' ? l : 'both';
}

function markDone() {
  const ready = () => (document.documentElement.dataset.ready = '1');
  if (document.fonts?.ready) document.fonts.ready.then(ready, ready);
  else ready();
}

function toolbar(examHref: string, extra = ''): string {
  const lang = readLang();
  const opt = (v: Lang, label: string) => `<option value="${v}" ${lang === v ? 'selected' : ''}>${label}</option>`;
  return `<div class="print-toolbar no-print container">
    <a class="btn btn-quiet" href="${esc(examHref)}">${bi(tr('Back', 'वापस'))}</a>
    <label class="inline-field"><span>${bi(tr('Language', 'भाषा'))}</span>
      <select data-lang-select>${opt('both', 'हिन्दी + English')}${opt('hi', 'हिन्दी')}${opt('en', 'English')}</select></label>
    ${extra}
    <button class="btn btn-primary" type="button" onclick="window.print()">${bi(tr('Print / save as PDF', 'प्रिंट / पीडीएफ़ सहेजें'))}</button>
  </div>`;
}

function wireToolbar(root: HTMLElement) {
  root.querySelector<HTMLSelectElement>('[data-lang-select]')?.addEventListener('change', (e) => {
    const u = new URL(location.href);
    const v = (e.target as HTMLSelectElement).value;
    if (v === 'both') u.searchParams.delete('lang');
    else u.searchParams.set('lang', v);
    location.replace(u.toString());
  });
}

export function mountBooklet(root: HTMLElement, paper: PaperData, opts: { examHref: string; examName: Bi; sheetHref?: string }) {
  const lang = readLang();
  const list = items(paper);
  const N = list.length;
  const max = N * paper.marks_per_question;
  const neg = paper.negative_marking;
  const hasFive = list.some((it) => it.q.options.length === 5);
  const L = (t: Bi, cls = '') => langText(t, lang, cls);

  const instructions: Bi[] = [
    tr(`This booklet has ${N} questions. Time allowed: ${paper.duration_minutes} minutes. Maximum marks: ${max}.`, `इस पुस्तिका में ${N} प्रश्न हैं। निर्धारित समय: ${paper.duration_minutes} मिनट। पूर्णांक: ${max}।`),
    tr(`Each question carries ${paper.marks_per_question} mark${paper.marks_per_question === 1 ? '' : 's'}.`, `प्रत्येक प्रश्न ${paper.marks_per_question} अंक का है।`),
    neg > 0
      ? tr(`${neg} mark will be deducted for each wrong answer.`, `प्रत्येक गलत उत्तर के लिए ${neg} अंक काटा जाएगा।`)
      : tr('There is no negative marking.', 'ऋणात्मक अंकन नहीं है।'),
    tr('Choose the one best answer and fill its bubble on the OMR sheet with a black or blue ball-point pen.', 'एक सबसे उपयुक्त उत्तर चुनें और ओएमआर शीट पर उसका गोला काले या नीले बॉल-पॉइंट पेन से भरें।'),
    ...(hasFive ? [tr('Option E means "question not attempted". Fill it if you leave a question.', 'विकल्प E का अर्थ है "प्रश्न अनुत्तरित"। प्रश्न छोड़ने पर इसे भरें।')] : []),
    tr('If the Hindi and English versions differ, treat the Hindi version as final.', 'हिन्दी और अंग्रेज़ी पाठ में अंतर होने पर हिन्दी पाठ अंतिम माना जाए।'),
    tr('Do not use a calculator or mobile phone. Rough work may be done in the space provided.', 'कैलकुलेटर या मोबाइल का प्रयोग न करें। रफ़ कार्य दिए गए स्थान पर करें।'),
  ];

  const cover = `<section class="sheet cover">
    <div class="cover-top">
      <p class="cover-brand">Prashnottar · <span lang="hi">प्रश्नोत्तर</span></p>
      <p class="cover-disclaimer">${both(DISCLAIMER)}</p>
    </div>
    <h1 class="cover-title">${both(opts.examName)}</h1>
    <p class="cover-sub">${both(paper.title)}</p>
    <table class="cover-facts">
      <tr><th>${both(tr('Questions', 'प्रश्न'))}</th><td>${N}</td><th>${both(tr('Time', 'समय'))}</th><td>${paper.duration_minutes} min / मिनट</td></tr>
      <tr><th>${both(tr('Maximum marks', 'पूर्णांक'))}</th><td>${max}</td><th>${both(tr('Negative marking', 'ऋणात्मक अंकन'))}</th><td>${neg > 0 ? `−${neg}` : '0'}</td></tr>
    </table>
    <div class="cover-fill">
      <div><span>${both(tr('Name', 'नाम'))}</span><i></i></div>
      <div><span>${both(tr('Roll number', 'अनुक्रमांक'))}</span><i></i></div>
    </div>
    <div class="cover-instr">
      <div><h2>निर्देश</h2><ol lang="hi">${instructions.map((t) => `<li>${esc(t.hi)}</li>`).join('')}</ol></div>
      <div><h2>Instructions</h2><ol lang="en">${instructions.map((t) => `<li>${esc(t.en)}</li>`).join('')}</ol></div>
    </div>
    <p class="cover-foot">${both(tr('Do not open this booklet until you are told to.', 'जब तक कहा न जाए, यह पुस्तिका न खोलें।'))}</p>
  </section>`;

  const body = `<section class="sheet questions">
    ${paper.sections
      .map(
        (s) => `<h2 class="b-sec">${L(s.name)}</h2>${list
          .filter((it) => it.section === s)
          .map(
            (it) => `<div class="b-q"><div class="b-qt"><span class="b-n">${it.n}.</span><div>${L(it.q.text, 'b-line')}</div></div><ol class="b-opts">${it.q.options
              .map((o, k) => `<li><span class="b-l">(${LETTERS[k]})</span><div>${L(o, 'b-line')}</div></li>`)
              .join('')}</ol></div>`,
          )
          .join('')}`,
      )
      .join('')}
  </section>`;

  const key = `<section class="sheet answer-key">
    <h2>${both(tr('Answer key', 'उत्तर कुंजी'))}</h2>
    <div class="key-grid">${list.map((it) => `<span><b>${it.n}</b> ${LETTERS[it.q.answer]}</span>`).join('')}</div>
    <h2 class="key-expl-h">${both(tr('Explanations', 'व्याख्या'))}</h2>
    <div class="key-expl">${list.map((it) => `<p><b>${it.n}. (${LETTERS[it.q.answer]})</b> ${L(it.q.explanation, 'b-line')}</p>`).join('')}</div>
  </section>`;

  const sheetLink = opts.sheetHref ? `<a class="btn" href="${esc(opts.sheetHref)}">${bi(tr('OMR sheet', 'ओएमआर शीट'))}</a>` : '';
  root.classList.add('booklet');
  root.innerHTML = `${toolbar(opts.examHref, sheetLink)}<div class="print-foot" data-print-foot>${both(DISCLAIMER)}</div><div class="pages">${cover}${body}${key}</div>`;
  if (new URLSearchParams(location.search).has('pdf')) document.documentElement.classList.add('pdf');
  wireToolbar(root);
  markDone();
}

export function mountSheet(root: HTMLElement, paper: PaperData, opts: { examHref: string; examName: Bi; bookletHref?: string }) {
  const list = items(paper);
  const nOpts = Math.max(...list.map((it) => it.q.options.length));
  const digits = 8;
  const roll = `<table class="roll" aria-label="Roll number grid"><tr>${Array.from({ length: digits }, () => '<td class="roll-box"></td>').join('')}</tr>${Array.from(
    { length: 10 },
    (_, d) => `<tr>${Array.from({ length: digits }, () => `<td><span class="ob">${d}</span></td>`).join('')}</tr>`,
  ).join('')}</table>`;
  const rows = list
    .map((it) => `<div class="omr-line"><span class="omr-qn">${it.n}</span>${Array.from({ length: nOpts }, (_, k) => (k < it.q.options.length ? `<span class="ob">${LETTERS[k]}</span>` : '<span class="ob ob-none"></span>')).join('')}</div>`)
    .join('');
  const bookletLink = opts.bookletHref ? `<a class="btn" href="${esc(opts.bookletHref)}">${bi(tr('Question booklet', 'प्रश्न पुस्तिका'))}</a>` : '';
  root.classList.add('booklet', 'omr-print');
  root.innerHTML = `${toolbar(opts.examHref, bookletLink)}<div class="print-foot" data-print-foot>${both(DISCLAIMER)}</div>
  <div class="pages"><section class="sheet omr-page">
    <header class="omr-head">
      <div><p class="cover-brand">Prashnottar · <span lang="hi">प्रश्नोत्तर</span></p><h1>${both(tr('OMR answer sheet', 'ओएमआर उत्तर पत्रक'))}</h1>
      <p>${both(opts.examName)} · ${both(paper.title)}</p></div>
      <div class="omr-ids">
        <div class="cover-fill"><div><span>${both(tr('Name', 'नाम'))}</span><i></i></div><div><span>${both(tr('Signature', 'हस्ताक्षर'))}</span><i></i></div></div>
        <div><p class="small">${both(tr('Roll number', 'अनुक्रमांक'))}</p>${roll}</div>
      </div>
    </header>
    <div class="omr-how">
      <p>${both(tr('Use a black or blue ball-point pen. Fill one bubble per question completely. Do not tick or cross.', 'काले या नीले बॉल-पॉइंट पेन का प्रयोग करें। हर प्रश्न का एक गोला पूरा भरें। टिक या क्रॉस न लगाएं।'))}</p>
      <p class="omr-eg"><span>${both(tr('Right', 'सही'))}</span> <span class="ob filled"></span> <span>${both(tr('Wrong', 'गलत'))}</span> <span class="ob">✓</span> <span class="ob">✕</span> <span class="ob half"></span></p>
    </div>
    <div class="omr-cols">${rows}</div>
    <p class="cover-disclaimer">${both(DISCLAIMER)}</p>
  </section></div>`;
  if (new URLSearchParams(location.search).has('pdf')) document.documentElement.classList.add('pdf');
  wireToolbar(root);
  markDone();
}
