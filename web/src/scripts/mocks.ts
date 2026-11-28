// /<exam>/mocks/: every paper from GET /api/papers/{exam}, locked or not
// (passes from /api/auth/me; admins see everything), with the student's best
// and last score from GET /api/me/attempts.
import { me } from './api.ts';
import { initPrefs } from './prefs.ts';
import {
  api,
  ApiError,
  asBi,
  BASE,
  bi,
  durationBi,
  esc,
  KIND,
  myAttempts,
  num,
  pricingHref,
  signInHref,
  tr,
  type ListedPaper,
  type MyAttempt,
} from './study.ts';

const ORDER = ['mock', 'probable', 'sample', 'pyq', 'free'];
const HEAD: Record<string, [string, string]> = {
  mock: ['Full mocks', 'फ़ुल मॉक'],
  probable: ['Most-probable sets', 'संभावित प्रश्न सेट'],
  sample: ['Sample papers', 'सैंपल पेपर'],
  pyq: ['Past papers', 'पिछले प्रश्नपत्र'],
  free: ['Free sets', 'मुफ़्त सेट'],
};

export async function initMocks() {
  const box = document.querySelector<HTMLElement>('[data-mocks]');
  if (!box) return;
  const exam = box.dataset.exam!;
  const staticIds = new Set((box.dataset.static ?? '').split(',').filter(Boolean));

  let list: ListedPaper[];
  try {
    const data = await api<ListedPaper[]>(`/api/papers/${exam}`);
    list = (Array.isArray(data) ? data : []).filter((p) => /^[a-z0-9-]+$/.test(p.id));
  } catch (e) {
    // Keep the static free list; say why the paid ones are missing.
    const note = box.querySelector('p.muted');
    if (note)
      note.innerHTML =
        e instanceof ApiError && e.status === 0
          ? bi(tr('Paid mocks load here when you are online.', 'ऑनलाइन होने पर पेड मॉक यहां दिखेंगे।'))
          : bi(tr('Paid mocks could not be loaded. Please try again later.', 'पेड मॉक लोड नहीं हो सके। बाद में फिर कोशिश करें।'));
    return;
  }

  const user = await me();
  const all = !!user && user.role === 'admin';
  const hasPass = !!user && (user.passes ?? []).includes(exam);
  let attempts: MyAttempt[] = [];
  if (user) {
    try {
      attempts = (await myAttempts(exam)) ?? [];
    } catch {
      /* scores are a bonus */
    }
  }

  const play = (id: string, m: string) => `${BASE}/play/?exam=${exam}&paper=${encodeURIComponent(id)}&mode=${m}`;
  const url = (p: ListedPaper, m: 'test' | 'practice') => (p.free && staticIds.has(p.id) ? `${BASE}/${exam}/${p.id}/${m}/` : play(p.id, m));

  function scores(id: string): string {
    if (!user) return '';
    const mine = attempts.filter((a) => a.paper === id);
    if (!mine.length) return `<p class="muted small score-line">${bi(tr('Not attempted yet', 'अभी तक नहीं दिया'))}</p>`;
    const last = mine[0];
    const best = mine.reduce((b, a) => (a.score / (a.total || 1) > b.score / (b.total || 1) ? a : b), mine[0]);
    return `<p class="small score-line">${bi(
      tr(
        `Best ${num(best.score)}/${num(best.total)} · Last ${num(last.score)}/${num(last.total)} · ${mine.length} ${mine.length === 1 ? 'attempt' : 'attempts'}`,
        `सर्वश्रेष्ठ ${num(best.score)}/${num(best.total)} · पिछला ${num(last.score)}/${num(last.total)} · ${mine.length} प्रयास`,
      ),
    )}</p>`;
  }

  function item(p: ListedPaper): string {
    const open = p.free || all || hasPass;
    const k = KIND[p.kind] ?? asBi(p.kind);
    const t = asBi(p.title, p.id);
    const tags = [
      `<span class="tag ${p.free ? 'tag-ok' : ''}">${bi(p.free ? tr('Free', 'मुफ़्त') : k)}</span>`,
      open ? '' : `<span class="tag tag-lock">${bi(tr('Locked', 'लॉक'))}</span>`,
      all && p.status === 'draft' ? `<span class="tag">${bi(tr('Draft', 'ड्राफ़्ट'))}</span>` : '',
    ].join('');
    const d = durationBi(Number(p.duration_minutes) || 0);
    const actions = open
      ? `<a class="btn btn-primary" href="${url(p, 'test')}">${bi(tr('Start test', 'टेस्ट शुरू करें'))}</a><a class="btn btn-quiet" href="${url(p, 'practice')}">${bi(tr('Practice', 'अभ्यास'))}</a>`
      : `<a class="btn" href="${pricingHref()}">${bi(tr('Unlock', 'अनलॉक करें'))}</a>`;
    return `<li class="paper-item ${open ? '' : 'locked'}">
      <div class="paper-meta">${tags}
        <h3 class="h-sm">${bi(t)}</h3>
        <p class="muted small">${bi(tr(`${Number(p.questions) || 0} questions · ${d.en}`, `${Number(p.questions) || 0} प्रश्न · ${d.hi}`))}</p>
        ${scores(p.id)}
      </div>
      <div class="row-actions">${actions}</div>
    </li>`;
  }

  const groups = ORDER.map((kind) => [kind, list.filter((p) => (p.free ? 'free' : ORDER.includes(p.kind) ? p.kind : 'mock') === kind)] as const).filter(
    ([, ps]) => ps.length,
  );
  const lockedAny = list.some((p) => !p.free) && !all && !hasPass;
  const note = lockedAny
    ? `<div class="panel unlock-note">
        <div><p class="unlock-h">${bi(tr('Paid papers open with a pack for this exam.', 'पेड प्रश्नपत्र इस परीक्षा के पैक से खुलते हैं।'))}</p>
        ${user ? '' : `<p class="muted small">${bi(tr('Already bought? Sign in to open your papers and see your scores.', 'पहले से खरीदा है? अपने प्रश्नपत्र और स्कोर देखने के लिए साइन इन करें।'))}</p>`}</div>
        <div class="row-actions"><a class="btn btn-primary" href="${pricingHref()}">${bi(tr('See packs', 'पैक देखें'))}</a>${user ? '' : `<a class="btn btn-quiet" href="${signInHref()}">${bi(tr('Sign in', 'साइन इन करें'))}</a>`}</div>
      </div>`
    : !user
      ? `<p class="muted small">${bi(tr('Sign in to keep track of your scores.', 'अपने स्कोर का हिसाब रखने के लिए साइन इन करें।'))} <a href="${esc(signInHref())}">${bi(tr('Sign in', 'साइन इन करें'))}</a></p>`
      : '';

  box.innerHTML = list.length
    ? `${note}${groups
        .map(([kind, ps]) => `<h2 class="h-sm mock-group">${bi(tr(HEAD[kind][0], HEAD[kind][1]))}</h2><ul class="paper-list">${ps.map(item).join('')}</ul>`)
        .join('')}`
    : `<div class="panel"><p>${bi(tr('Mock tests for this exam are being prepared.', 'इस परीक्षा के मॉक टेस्ट तैयार हो रहे हैं।'))}</p></div>`;
  initPrefs(box);
}
