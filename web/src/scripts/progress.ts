// /progress/: the signed-in student's attempts (GET /api/me/attempts):
// per-exam score trend (inline SVG), weak topics and recent attempts.
import { me } from './api.ts';
import { initPrefs } from './prefs.ts';
import {
  api,
  asBi,
  BASE,
  bi,
  dateBi,
  errorPanel,
  esc,
  examName,
  isTopicPaper,
  myAttempts,
  num,
  pct,
  pickerHref,
  sessionHref,
  signInHref,
  topicTotals,
  tr,
  type Bi,
  type ListedPaper,
  type MyAttempt,
  type TopicsResponse,
} from './study.ts';

const EXAM_ORDER = ['bpsc-tre', 'bpsc-cce', 'mppsc', 'ras', 'bihar-stet', 'ctet', 'cg-tet'];
const WEAK_BELOW = 60;
const WEAK_MIN_QUESTIONS = 3;

const share = (a: MyAttempt) => (a.total > 0 ? Math.max(0, Math.min(100, (a.score / a.total) * 100)) : 0);

/** Line of score % over attempts, oldest to newest. Hollow dots = topic practice. */
function trendSvg(list: MyAttempt[], name: (a: MyAttempt) => Bi): string {
  const pts = list.slice(0, 30).reverse();
  // About the width it renders at, so the 11px labels stay readable.
  const W = 320;
  const H = 150;
  const L = 34;
  const R = 12;
  const T = 12;
  const B = 24;
  const x = (i: number) => (pts.length === 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (pts.length - 1));
  const y = (v: number) => T + ((100 - v) * (H - T - B)) / 100;
  const grid = [0, 50, 100]
    .map((v) => `<line class="tr-grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tr-ax" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`)
    .join('');
  const line = pts.length > 1 ? `<polyline class="tr-line" points="${pts.map((a, i) => `${x(i).toFixed(1)},${y(share(a)).toFixed(1)}`).join(' ')}"/>` : '';
  const dots = pts
    .map((a, i) => {
      const n = name(a);
      const d = dateBi(a.created_at);
      const tip = `${n.en}: ${num(a.score)}/${num(a.total)} (${Math.round(share(a))}%) · ${d.en}`;
      return `<g class="tr-pt"><circle class="tr-hit" cx="${x(i)}" cy="${y(share(a))}" r="14"/><circle class="tr-dot ${isTopicPaper(a.paper) ? 'hollow' : ''}" cx="${x(i)}" cy="${y(share(a))}" r="4.5"/><title>${esc(tip)}</title></g>`;
    })
    .join('');
  const firstD = dateBi(pts[0].created_at);
  const lastD = dateBi(pts[pts.length - 1].created_at);
  const axis =
    pts.length > 1
      ? ['en', 'hi']
          .map(
            (l) =>
              `<text class="tr-ax l-${l}" x="${L}" y="${H - 6}">${esc(firstD[l as 'en'])}</text><text class="tr-ax l-${l}" x="${W - R}" y="${H - 6}" text-anchor="end">${esc(lastD[l as 'en'])}</text>`,
          )
          .join('')
      : '';
  return `<svg class="trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="Score trend, ${pts.length} attempts">${grid}${line}${dots}${axis}</svg>`;
}

export async function initProgress() {
  const box = document.querySelector<HTMLElement>('[data-progress-page]');
  if (!box) return;
  const done = () => initPrefs(box);

  const user = await me();
  if (!user) {
    box.innerHTML = `<div class="panel signin-prompt">
      <h2 class="h-sm">${bi(tr('Sign in to see your progress', 'अपनी प्रगति देखने के लिए साइन इन करें'))}</h2>
      <p class="muted">${bi(tr('Your scores, score trend and weak topics are saved to your account when you practise signed in.', 'साइन इन करके अभ्यास करने पर आपके स्कोर, प्रगति और कमज़ोर टॉपिक आपके खाते में सहेजे जाते हैं।'))}</p>
      <div class="row-actions"><a class="btn btn-primary" href="${signInHref(`${BASE}/progress/`)}">${bi(tr('Sign in', 'साइन इन करें'))}</a></div>
    </div>`;
    return done();
  }

  let list: MyAttempt[];
  try {
    list = (await myAttempts(undefined, 1000)) ?? [];
  } catch (e) {
    box.innerHTML = errorPanel(e);
    return done();
  }
  const hello = `<p class="muted">${bi(tr(`Signed in as ${user.name}`, `${user.name} के रूप में साइन इन`))}</p>`;
  if (!list.length) {
    box.innerHTML = `${hello}<div class="panel">
      <h2 class="h-sm">${bi(tr('Nothing here yet', 'अभी यहां कुछ नहीं है'))}</h2>
      <p class="muted">${bi(tr('Finish a free set, a mock test or a round of topic practice while signed in, and your scores will show up here.', 'साइन इन रहते हुए कोई मुफ़्त सेट, मॉक टेस्ट या विषयवार अभ्यास पूरा करें, आपके स्कोर यहां दिखेंगे।'))}</p>
      <div class="row-actions"><a class="btn btn-primary" href="${BASE}/">${bi(tr('Choose your exam', 'अपनी परीक्षा चुनें'))}</a></div>
    </div>`;
    return done();
  }

  const exams = EXAM_ORDER.filter((e) => list.some((a) => a.exam === e));
  // Paper titles and the topic list (for bilingual names and practice links), per exam.
  const titles = new Map<string, Bi>();
  const topicInfo = new Map<string, { topic: Bi; subject: string }>();
  await Promise.all(
    exams.flatMap((e) => [
      api<ListedPaper[]>(`/api/papers/${e}`)
        .then((ps) => ps.forEach((p) => titles.set(`${e}/${p.id}`, asBi(p.title, p.id))))
        .catch(() => undefined),
      api<TopicsResponse>(`/api/practice/${e}/topics`)
        .then((r) => r.subjects.forEach((s) => s.topics.forEach((t) => topicInfo.set(`${e}/${t.topic.en}`, { topic: t.topic, subject: s.subject.en }))))
        .catch(() => undefined),
    ]),
  );
  const topicBi = (exam: string, en: string) => topicInfo.get(`${exam}/${en}`)?.topic ?? { en, hi: en };

  function name(a: MyAttempt): Bi {
    if (isTopicPaper(a.paper)) {
      const keys = Object.keys(a.topics ?? {});
      if (!keys.length) return tr('Topic practice', 'विषयवार अभ्यास');
      const t = topicBi(a.exam, keys[0]);
      const more = keys.length > 1 ? ` +${keys.length - 1}` : '';
      return { en: `Topic practice: ${t.en}${more}`, hi: `विषयवार अभ्यास: ${t.hi}${more}` };
    }
    return titles.get(`${a.exam}/${a.paper}`) ?? { en: a.paper, hi: a.paper };
  }

  // Overall numbers.
  const all = topicTotals(list);
  let right = 0;
  let seen = 0;
  for (const [r, t] of all.values()) {
    right += r;
    seen += t;
  }
  const tests = list.filter((a) => !isTopicPaper(a.paper)).length;
  const stat = (label: Bi, v: string) => `<div class="stat"><span class="stat-v">${v}</span><span class="stat-l">${bi(label)}</span></div>`;
  const stats = `<div class="stats progress-stats">
    ${stat(tr('Papers taken', 'दिए गए प्रश्नपत्र'), String(tests))}
    ${stat(tr('Practice rounds', 'अभ्यास दौर'), String(list.length - tests))}
    ${stat(tr('Questions seen', 'देखे गए प्रश्न'), String(seen))}
    ${stat(tr('Answered right', 'सही उत्तर'), `${pct(right, seen)}%`)}
  </div>`;

  // Trend per exam.
  const trends = exams
    .map((e) => {
      const mine = list.filter((a) => a.exam === e);
      const last = mine[0];
      const best = mine.reduce((b, a) => (share(a) > share(b) ? a : b), mine[0]);
      const mixed = mine.slice(0, 30).some((a) => isTopicPaper(a.paper)) && mine.slice(0, 30).some((a) => !isTopicPaper(a.paper));
      const legend = mixed
        ? `<p class="tr-legend muted small"><span><i class="lg-dot"></i>${bi(tr('Paper', 'प्रश्नपत्र'))}</span><span><i class="lg-dot hollow"></i>${bi(tr('Topic practice', 'विषयवार अभ्यास'))}</span></p>`
        : '';
      return `<article class="panel trend-card">
        <header class="trend-h">
          <h3 class="h-sm"><a href="${BASE}/${e}/">${bi(examName(e))}</a></h3>
          <p class="muted small">${bi(
            tr(
              `${mine.length} ${mine.length === 1 ? 'attempt' : 'attempts'} · last ${Math.round(share(last))}% · best ${Math.round(share(best))}%`,
              `${mine.length} प्रयास · पिछला ${Math.round(share(last))}% · सर्वश्रेष्ठ ${Math.round(share(best))}%`,
            ),
          )}</p>
        </header>
        ${trendSvg(mine, name)}
        ${legend}
        <p class="trend-links small"><a href="${BASE}/${e}/mocks/">${bi(tr('Mock tests', 'मॉक टेस्ट'))}</a><a href="${pickerHref(e)}">${bi(tr('Topic practice', 'विषयवार अभ्यास'))}</a></p>
      </article>`;
    })
    .join('');

  // Weak topics, per exam.
  const weak: { exam: string; topic: string; r: number; t: number }[] = [];
  for (const e of exams) {
    for (const [topic, [r, t]] of topicTotals(list.filter((a) => a.exam === e))) {
      if (t >= WEAK_MIN_QUESTIONS && pct(r, t) < WEAK_BELOW) weak.push({ exam: e, topic, r, t });
    }
  }
  weak.sort((a, b) => a.r / a.t - b.r / b.t || b.t - a.t);
  const weakRows = weak
    .slice(0, 12)
    .map((w) => {
      const info = topicInfo.get(`${w.exam}/${w.topic}`);
      const p = pct(w.r, w.t);
      const action = info
        ? `<a class="btn btn-quiet" href="${sessionHref(w.exam, { subject: info.subject, topic: w.topic })}">${bi(tr('Practise', 'अभ्यास करें'))}</a>`
        : `<a class="btn btn-quiet" href="${pickerHref(w.exam)}">${bi(tr('Topics', 'टॉपिक'))}</a>`;
      return `<li class="weak-row">
        <span class="weak-main"><span class="weak-name">${bi(topicBi(w.exam, w.topic))}</span><span class="muted small">${bi(examName(w.exam))} · ${bi(tr(`${w.r} of ${w.t} right`, `${w.t} में ${w.r} सही`))}</span></span>
        <span class="weak-pct"><span class="meter" aria-hidden="true"><i style="width:${p}%"></i></span> ${p}%</span>
        ${action}
      </li>`;
    })
    .join('');
  const weakHtml = weak.length
    ? `<ul class="weak-list">${weakRows}</ul>`
    : `<p class="muted">${bi(tr(`No weak topics yet: every topic with ${WEAK_MIN_QUESTIONS} or more questions is at ${WEAK_BELOW}% or better.`, `अभी कोई कमज़ोर टॉपिक नहीं: ${WEAK_MIN_QUESTIONS} या अधिक प्रश्नों वाले हर टॉपिक में ${WEAK_BELOW}% या अधिक।`))}</p>`;

  // Recent attempts.
  const recent = list
    .slice(0, 20)
    .map((a) => {
      const d = dateBi(a.created_at);
      return `<tr><td class="nowrap">${bi(d)}</td><td><span class="att-name">${bi(name(a))}</span><span class="muted small att-exam">${bi(examName(a.exam))}</span></td><td class="num">${num(a.score)}/${num(a.total)}</td><td class="num">${Math.round(share(a))}%</td></tr>`;
    })
    .join('');

  box.innerHTML = `${hello}${stats}
    <section class="block" aria-labelledby="pg-trend"><h2 id="pg-trend">${bi(tr('Score trend', 'स्कोर का रुझान'))}</h2>
      <p class="muted small">${bi(tr('Each dot is one attempt, as a percentage of the maximum marks.', 'हर बिंदु एक प्रयास है, अधिकतम अंकों के प्रतिशत के रूप में।'))}</p>
      <div class="trend-grid">${trends}</div></section>
    <section class="block" aria-labelledby="pg-weak"><h2 id="pg-weak">${bi(tr('Topics to revise', 'दोहराने वाले टॉपिक'))}</h2>
      <div class="panel">${weakHtml}</div></section>
    <section class="block" aria-labelledby="pg-recent"><h2 id="pg-recent">${bi(tr('Recent attempts', 'हाल के प्रयास'))}</h2>
      <div class="panel"><div class="table-wrap"><table class="data"><thead><tr>
        <th>${bi(tr('Date', 'तारीख'))}</th><th>${bi(tr('Paper', 'प्रश्नपत्र'))}</th><th class="num">${bi(tr('Score', 'अंक'))}</th><th class="num">%</th>
      </tr></thead><tbody>${recent}</tbody></table></div></div></section>`;
  done();
}
