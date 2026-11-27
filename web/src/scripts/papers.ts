// Exam page: paid papers come from GET /api/papers/{exam}; free ones are
// already in the static HTML. Unlocked if the signed-in user has a pass.
import { api, ApiError, me } from './api.ts';

interface Listed {
  id: string;
  kind: string;
  title: { en: string; hi: string } | string;
  free: boolean;
  questions: number;
  duration_minutes: number;
}

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const bi = (en: string, hi: string) => `<span class="l-en" lang="en">${en}</span><span class="l-hi" lang="hi">${hi}</span>`;
const KIND: Record<string, [string, string]> = {
  free: ['Free set', 'मुफ़्त सेट'],
  mock: ['Full mock', 'फ़ुल मॉक'],
  sample: ['Sample paper', 'सैंपल पेपर'],
  probable: ['Most-probable set', 'संभावित प्रश्न सेट'],
  pyq: ['Past paper', 'पिछला प्रश्नपत्र'],
};

export async function initPaidPapers() {
  const box = document.querySelector<HTMLElement>('[data-paid-papers]');
  if (!box) return;
  const exam = box.dataset.exam!;
  const staticIds = new Set((box.dataset.static ?? '').split(',').filter(Boolean));
  let list: Listed[];
  try {
    const data = await api<Listed[] | { papers: Listed[] }>(`/api/papers/${exam}`);
    list = Array.isArray(data) ? data : Array.isArray(data?.papers) ? data.papers : [];
  } catch (e) {
    box.innerHTML = `<p class="muted small">${
      e instanceof ApiError && e.status === 0
        ? bi('Paid mocks and sets load here when you are online.', 'ऑनलाइन होने पर पेड मॉक और सेट यहां दिखेंगे।')
        : bi('Paid mocks and sets will appear here soon.', 'पेड मॉक और सेट जल्द ही यहां दिखेंगे।')
    }</p>`;
    return;
  }
  const paid = list.filter((p) => !p.free && !staticIds.has(p.id) && /^[a-z0-9-]+$/.test(p.id));
  if (!paid.length) {
    box.innerHTML = `<p class="muted small">${bi('Paid mocks and most-probable sets are being prepared and will appear here.', 'पेड मॉक और संभावित प्रश्न सेट तैयार हो रहे हैं और यहां दिखेंगे।')}</p>`;
    return;
  }
  const user = await me();
  const unlocked = !!user && (user.role === 'admin' || (user.passes ?? []).includes(exam));
  box.innerHTML = `<ul class="paper-list">${paid
    .map((p) => {
      const t = typeof p.title === 'string' ? { en: p.title, hi: p.title } : p.title;
      const k = KIND[p.kind] ?? [p.kind, p.kind];
      const play = (m: string) => `${BASE}/play/?exam=${exam}&paper=${encodeURIComponent(p.id)}&mode=${m}`;
      const actions = unlocked
        ? `<a class="btn btn-primary" href="${play('test')}">${bi('Start test', 'टेस्ट शुरू करें')}</a><a class="btn btn-quiet" href="${play('practice')}">${bi('Practice', 'अभ्यास')}</a><a class="btn btn-quiet" href="${play('booklet')}">${bi('Print', 'प्रिंट')}</a>`
        : `<a class="btn" href="#pricing">${bi('Unlock with a pack', 'पैक से अनलॉक करें')}</a>`;
      return `<li class="paper-item ${unlocked ? '' : 'locked'}">
        <div class="paper-meta"><span class="tag">${bi(esc(k[0]), esc(k[1]))}</span>${unlocked ? '' : `<span class="tag tag-lock">${bi('Locked', 'लॉक')}</span>`}
          <h3 class="h-sm">${bi(esc(t.en), esc(t.hi))}</h3>
          <p class="muted small">${bi(`${esc(p.questions)} questions · ${esc(p.duration_minutes)} min`, `${esc(p.questions)} प्रश्न · ${esc(p.duration_minutes)} मिनट`)}</p></div>
        <div class="row-actions">${actions}</div></li>`;
    })
    .join('')}</ul>${
    !user ? `<p class="muted small">${bi(`Already bought? <a href="${BASE}/account/?next=${encodeURIComponent(location.pathname)}">Sign in</a> to open your papers.`, `पहले से खरीदा है? पेपर खोलने के लिए <a href="${BASE}/account/?next=${encodeURIComponent(location.pathname)}">साइन इन करें</a>।`)}</p>` : ''
  }`;
}
