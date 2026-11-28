// /<exam>/practice/: pick a subject, then a topic. Counts come from
// GET /api/practice/{exam}/topics; the signed-in student's accuracy per topic
// from GET /api/me/attempts.
import { cachedUser } from './api.ts';
import { initPrefs } from './prefs.ts';
import {
  api,
  bi,
  errorPanel,
  esc,
  myAttempts,
  pct,
  pricingHref,
  sessionHref,
  signInHref,
  topicTotals,
  tr,
  type TopicsResponse,
} from './study.ts';

const chevron = `<svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>`;

export async function initTopics() {
  const box = document.querySelector<HTMLElement>('[data-topics]');
  if (!box) return;
  const exam = box.dataset.exam!;
  const want = new URLSearchParams(location.search).get('subject');

  let data: TopicsResponse;
  try {
    data = await api<TopicsResponse>(`/api/practice/${exam}/topics`);
  } catch (e) {
    box.innerHTML = errorPanel(e);
    initPrefs(box);
    return;
  }
  if (!data.subjects.length) {
    box.innerHTML = `<div class="panel"><h2 class="h-sm">${bi(tr('Topic practice for this exam is being prepared.', 'इस परीक्षा का विषयवार अभ्यास तैयार हो रहा है।'))}</h2><p class="muted small">${bi(tr('Questions go live after they are checked. Meanwhile, try the free set.', 'प्रश्न जांच के बाद उपलब्ध होते हैं। तब तक मुफ़्त सेट आज़माएं।'))}</p></div>`;
    initPrefs(box);
    return;
  }

  // Accuracy so far, per topic (signed-in only; a failure just hides it).
  let mine = new Map<string, [number, number]>();
  if (cachedUser()) {
    try {
      const list = await myAttempts(exam);
      if (list) mine = topicTotals(list);
    } catch {
      /* not essential */
    }
  }

  const signedIn = !!cachedUser();
  const topicCount = data.subjects.reduce((n, s) => n + s.topics.length, 0);
  const lockNote = data.locked
    ? `<div class="panel unlock-note">
        <div>
          <p class="unlock-h">${bi(tr(`Free preview: the first ${data.free_per_topic} questions of every topic`, `मुफ़्त झलक: हर टॉपिक के पहले ${data.free_per_topic} प्रश्न`))}</p>
          <p class="muted small">${bi(tr(`A pack for this exam unlocks all ${data.total} questions, with explanations.`, `इस परीक्षा का पैक सभी ${data.total} प्रश्न व्याख्या सहित खोलता है।`))}</p>
        </div>
        <div class="row-actions">
          <a class="btn btn-primary" href="${pricingHref()}">${bi(tr('See packs', 'पैक देखें'))}</a>
          ${signedIn ? '' : `<a class="btn btn-quiet" href="${signInHref()}">${bi(tr('Sign in', 'साइन इन करें'))}</a>`}
        </div>
      </div>`
    : '';

  const subjects = data.subjects
    .map((s) => {
      const open = want === s.subject.en || data.subjects.length === 1;
      const topics = s.topics
        .map((t) => {
          const m = mine.get(t.topic.en);
          const acc = m && m[1] ? pct(m[0], m[1]) : null;
          const accTag =
            acc === null ? '' : `<span class="tag ${acc < 60 ? 'tag-weak' : 'tag-ok'}">${bi(tr(`You: ${acc}%`, `आपका: ${acc}%`))}</span>`;
          const count =
            data.locked && t.count > t.free
              ? bi(tr(`${t.free} free of ${t.count}`, `${t.count} में ${t.free} मुफ़्त`))
              : bi(tr(`${t.count} ${t.count === 1 ? 'question' : 'questions'}`, `${t.count} प्रश्न`));
          return `<li><a class="topic-row" href="${sessionHref(exam, { subject: s.subject.en, topic: t.topic.en })}">
            <span class="topic-main"><span class="topic-name">${bi(t.topic)}</span><span class="muted small">${count}</span></span>
            ${accTag}${chevron}</a></li>`;
        })
        .join('');
      return `<details class="panel subj" ${open ? 'open' : ''} data-subject="${esc(s.subject.en)}">
        <summary>
          <span class="subj-name">${bi(s.subject)}</span>
          <span class="muted small subj-count">${bi(tr(`${s.topics.length} ${s.topics.length === 1 ? 'topic' : 'topics'} · ${s.count} ${s.count === 1 ? 'question' : 'questions'}`, `${s.topics.length} टॉपिक · ${s.count} प्रश्न`))}</span>
          ${chevron}
        </summary>
        <div class="subj-body">
          <a class="btn btn-quiet subj-all" href="${sessionHref(exam, { subject: s.subject.en })}">${bi(tr(`Practise the whole subject`, `पूरा विषय अभ्यास करें`))}</a>
          <ul class="topic-list">${topics}</ul>
        </div>
      </details>`;
    })
    .join('');

  box.innerHTML = `
    <p class="muted topics-sum">${bi(tr(`${data.total} questions · ${data.subjects.length} subjects · ${topicCount} topics`, `${data.total} प्रश्न · ${data.subjects.length} विषय · ${topicCount} टॉपिक`))}</p>
    ${lockNote}
    <div class="subj-list">${subjects}</div>`;
  initPrefs(box);
  if (want) box.querySelector<HTMLElement>(`[data-subject="${CSS.escape(want)}"]`)?.scrollIntoView({ block: 'start' });
}
