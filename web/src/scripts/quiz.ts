// Shared helpers for practice mode and mock tests. The page embeds the paper
// as JSON in <script type="application/json" id="paper-data">.

export interface Bi {
  en: string;
  hi: string;
}

export interface Question {
  id: string;
  topic: Bi;
  difficulty: 'easy' | 'medium' | 'hard';
  text: Bi;
  options: Bi[];
  answer: number;
  explanation: Bi;
}

export interface Section {
  id: string;
  name: Bi;
  questions: Question[];
}

export interface PaperData {
  id: string;
  exam: string;
  title: Bi;
  examName: Bi;
  duration_minutes: number;
  marks_per_question: number;
  negative_marking: number;
  sections: Section[];
}

export interface Item {
  q: Question;
  section: Section;
  /** 1-based number across the whole paper. */
  n: number;
}

export const LETTERS = ['A', 'B', 'C', 'D'];

export function loadPaper(): PaperData {
  const el = document.getElementById('paper-data');
  if (!el?.textContent) throw new Error('paper data missing');
  return JSON.parse(el.textContent) as PaperData;
}

export function items(paper: PaperData): Item[] {
  let n = 0;
  return paper.sections.flatMap((section) => section.questions.map((q) => ({ q, section, n: ++n })));
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

/** Both languages as sibling elements; the UI language toggle shows one. */
export function bi(t: Bi, tag = 'span', cls = ''): string {
  const c = cls ? ` ${cls}` : '';
  if (t.en.trim() === t.hi.trim()) return `<${tag} class="${c.trim()}" lang="hi">${esc(t.hi)}</${tag}>`;
  return `<${tag} class="l-en${c}" lang="en">${esc(t.en)}</${tag}><${tag} class="l-hi${c}" lang="hi">${esc(t.hi)}</${tag}>`;
}

/** Two plain strings, for messages built in code. */
export const tr = (en: string, hi: string): Bi => ({ en, hi });

export function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: progress lasts for this page only */
  }
}

export function forget(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export interface TopicStat {
  topic: Bi;
  right: number;
  total: number;
}

/** Per-topic tally over the questions that were attempted. */
export function topicStats(list: Item[], chosen: (id: string) => number | null | undefined): TopicStat[] {
  const map = new Map<string, TopicStat>();
  for (const { q } of list) {
    const c = chosen(q.id);
    if (c === null || c === undefined) continue;
    const s = map.get(q.topic.en) ?? { topic: q.topic, right: 0, total: 0 };
    s.total++;
    if (c === q.answer) s.right++;
    map.set(q.topic.en, s);
  }
  return [...map.values()].sort((a, b) => a.right / a.total - b.right / b.total);
}

export function topicTable(stats: TopicStat[]): string {
  if (!stats.length) return '';
  const rows = stats
    .map((s) => {
      const pct = Math.round((s.right / s.total) * 100);
      const weak = pct < 60;
      return `<tr class="${weak ? 'weak' : ''}"><td>${bi(s.topic)}</td><td>${s.right}/${s.total}</td><td><span class="bar"><i style="width:${pct}%"></i></span> ${pct}%</td><td>${weak ? bi(tr('Revise', 'दोहराएं'), 'span', 'tag-weak') : ''}</td></tr>`;
    })
    .join('');
  return `<table class="topics"><thead><tr><th>${bi(tr('Topic', 'विषय'))}</th><th>${bi(tr('Right', 'सही'))}</th><th>${bi(tr('Accuracy', 'सटीकता'))}</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
