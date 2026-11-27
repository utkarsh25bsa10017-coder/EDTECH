// Entry point for every paper view. Free papers: static page with embedded
// JSON. Paid papers: /play/?exam=&paper=&mode= fetches from the API.
import { config } from './config.ts';
import { BASE, loadErrorHtml, loadPaper, PaperLoadError, tr } from './paper.ts';
import { initPrefs } from './prefs.ts';

type Mode = 'practice' | 'test' | 'omr' | 'booklet' | 'sheet';
const MODES: Mode[] = ['practice', 'test', 'omr', 'booklet', 'sheet'];

export async function startPlayer() {
  const root = document.getElementById('app');
  if (!root) return;
  const qs = new URLSearchParams(location.search);
  const embedded = !!document.getElementById('paper-data');
  const modeRaw = root.dataset.mode || qs.get('mode') || 'practice';
  const mode: Mode = (MODES as string[]).includes(modeRaw) ? (modeRaw as Mode) : 'practice';

  let paper;
  try {
    paper = await loadPaper();
  } catch (e) {
    const kind = e instanceof PaperLoadError ? e.kind : 'bad';
    root.innerHTML = `<div class="container narrow page-pad">${loadErrorHtml(kind, qs.get('exam') ?? '', BASE)}</div>`;
    initPrefs();
    return;
  }

  const link = (m: Mode) => (embedded ? `${BASE}/${paper.exam}/${paper.id}/${m}/` : `${BASE}/play/?exam=${paper.exam}&paper=${encodeURIComponent(paper.id)}&mode=${m}`);
  const examHref = `${BASE}/${paper.exam}/`;
  const examName = config().exams[paper.exam] ?? tr(paper.exam, paper.exam);
  document.title = `${paper.title.en} · ${examName.en} | Prashnottar`;
  root.innerHTML = '';

  if (mode === 'practice') {
    const { mountPractice } = await import('./practice.ts');
    mountPractice(root, paper, { examHref, testHref: link('test') });
  } else if (mode === 'test' || mode === 'omr') {
    const { mountCbt } = await import('./cbt.ts');
    mountCbt(root, paper, { omr: mode === 'omr', examHref, practiceHref: link('practice') });
  } else if (mode === 'booklet') {
    const { mountBooklet } = await import('./booklet.ts');
    mountBooklet(root, paper, { examHref, examName, sheetHref: link('sheet') });
  } else {
    const { mountSheet } = await import('./booklet.ts');
    mountSheet(root, paper, { examHref, examName, bookletHref: link('booklet') });
  }
  // Wire the language toggles the views just rendered.
  initPrefs(root);
}
