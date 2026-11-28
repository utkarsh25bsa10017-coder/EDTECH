// /<exam>/practice/topic/?subject=&topic=&offset= : ten questions at a time
// from GET /api/practice/{exam}/questions, rendered by the practice view
// (practice.ts). Finishing saves an attempt with paper "topic:<subject>[:<topic>]".
import type { PaperData, Question } from './paper.ts';
import { initPrefs } from './prefs.ts';
import { cachedUser } from './api.ts';
import {
  api,
  ApiError,
  bi,
  errorPanel,
  examName,
  pickerHref,
  pricingHref,
  sessionHref,
  signInHref,
  topicPaperId,
  tr,
  type Bi,
} from './study.ts';

const PAGE = 10;

interface BankQuestion extends Question {
  subject?: Bi;
}

interface QuestionsResponse {
  locked: boolean;
  preview: boolean;
  total: number;
  available: number;
  offset: number;
  limit: number;
  items: BankQuestion[];
}

function unlockPanel(total: number, free: number): string {
  const signedIn = !!cachedUser();
  return `<div class="panel unlock-note">
    <div>
      <p class="unlock-h">${bi(tr(`You have reached the end of the free preview (${free} of ${total} questions).`, `मुफ़्त झलक पूरी हुई (${total} में से ${free} प्रश्न)।`))}</p>
      <p class="muted small">${bi(tr('A pack for this exam unlocks every question in every topic, with explanations.', 'इस परीक्षा का पैक हर टॉपिक के सभी प्रश्न व्याख्या सहित खोलता है।'))}</p>
    </div>
    <div class="row-actions">
      <a class="btn btn-primary" href="${pricingHref()}">${bi(tr('Unlock all questions', 'सभी प्रश्न अनलॉक करें'))}</a>
      ${signedIn ? '' : `<a class="btn btn-quiet" href="${signInHref()}">${bi(tr('Already bought? Sign in', 'पहले से खरीदा है? साइन इन करें'))}</a>`}
    </div>
  </div>`;
}

function message(root: HTMLElement, html: string) {
  root.innerHTML = `<div class="container narrow page-pad">${html}</div>`;
  initPrefs(root);
}

export async function startTopicPractice() {
  const root = document.getElementById('app');
  if (!root) return;
  const exam = root.dataset.exam!;
  const qs = new URLSearchParams(location.search);
  const subject = qs.get('subject')?.trim() || null;
  const topic = qs.get('topic')?.trim() || null;
  const offset = Math.max(0, Math.floor(Number(qs.get('offset')) || 0));
  const back = pickerHref(exam, subject);
  const backBtn = `<a class="btn btn-quiet" href="${back}">${bi(tr('Back to topics', 'टॉपिक सूची पर लौटें'))}</a>`;
  if (!subject && !topic) {
    location.replace(pickerHref(exam));
    return;
  }

  const q = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
  if (subject) q.set('subject', subject);
  if (topic) q.set('topic', topic);
  let data: QuestionsResponse;
  try {
    data = await api<QuestionsResponse>(`/api/practice/${exam}/questions?${q}`);
  } catch (e) {
    message(root, e instanceof ApiError && e.status === 404 ? `<div class="panel load-error"><p>${bi(tr('Unknown exam.', 'अज्ञात परीक्षा।'))}</p></div>` : errorPanel(e));
    return;
  }

  const items = data.items.filter((x) => x && Array.isArray(x.options) && typeof x.answer === 'number' && x.text);
  if (!items.length) {
    if (data.locked && offset >= data.available) message(root, unlockPanel(data.total, data.available) + `<div class="row-actions">${backBtn}</div>`);
    else
      message(
        root,
        `<div class="panel"><p>${bi(tr('No questions here yet.', 'यहां अभी कोई प्रश्न नहीं है।'))}</p><div class="row-actions">${backBtn}</div></div>`,
      );
    return;
  }

  const first = items[0];
  const name: Bi = topic ? first.topic : (first.subject ?? { en: subject ?? '', hi: subject ?? '' });
  const end = offset + items.length;
  const paper: PaperData = {
    id: topicPaperId(subject ?? first.subject?.en ?? null, topic),
    exam,
    title: name,
    kind: 'free',
    free: false,
    duration_minutes: 0,
    marks_per_question: 1,
    negative_marking: 0,
    sections: [{ id: 'topic', name, questions: items }],
  };

  const more = end < data.available;
  const nextN = Math.min(PAGE, data.available - end);
  const finishActions = more
    ? `<a class="btn btn-primary" href="${sessionHref(exam, { subject, topic, offset: end })}">${bi(tr(`Next ${nextN} questions`, `अगले ${nextN} प्रश्न`))}</a>`
    : '';
  const finishHtml =
    !more && data.locked
      ? unlockPanel(data.total, data.available)
      : !more
        ? `<div class="panel"><p class="unlock-h">${bi(tr(`That was every question in ${name.en}.`, `${name.hi} के सभी प्रश्न पूरे हुए।`))}</p><div class="row-actions">${backBtn}</div></div>`
        : '';

  document.title = `${name.en} · ${examName(exam).en} | Prashnottar`;
  root.innerHTML = '';
  const { mountPractice } = await import('./practice.ts');
  mountPractice(root, paper, {
    examHref: back,
    storageKey: `pq-practice:${exam}/${paper.id}@${offset}`,
    numberOffset: offset,
    numberTotal: data.available,
    finishActions: `${finishActions}<a class="btn" href="${back}">${bi(tr('Choose another topic', 'दूसरा टॉपिक चुनें'))}</a>`,
    finishHtml,
  });
  initPrefs(root);
}
