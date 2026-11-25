import { z } from 'zod';

export interface Bi {
  en: string;
  hi: string;
}

export const EXAMS = ['bpsc-tre', 'bihar-daroga', 'bpsc-cce', 'up-si'] as const;
export type Exam = (typeof EXAMS)[number];

export interface ExamInfo {
  slug: Exam;
  short: Bi;
  name: Bi;
  /** Conducting body, shown under the name. */
  body: Bi;
  /** Official website; only listed where we are sure of the address. */
  website?: string;
  state: Bi;
  blurb: Bi;
  /** Subject areas the exam tests, in the order the paper usually runs. */
  subjects: Bi[];
}

export const EXAM_INFO: Record<Exam, ExamInfo> = {
  'bpsc-tre': {
    slug: 'bpsc-tre',
    short: { en: 'BPSC TRE', hi: 'बीपीएससी टीआरई' },
    name: { en: 'BPSC Teacher Recruitment Exam', hi: 'बीपीएससी शिक्षक भर्ती परीक्षा' },
    body: { en: 'Bihar Public Service Commission', hi: 'बिहार लोक सेवा आयोग' },
    website: 'https://bpsc.bihar.gov.in',
    state: { en: 'Bihar', hi: 'बिहार' },
    blurb: {
      en: 'Government school teacher recruitment in Bihar. Language, general studies and the subject paper, with child development and pedagogy.',
      hi: 'बिहार के सरकारी विद्यालयों में शिक्षक भर्ती। भाषा, सामान्य अध्ययन और विषय पत्र, साथ में बाल विकास एवं शिक्षाशास्त्र।',
    },
    subjects: [
      { en: 'General Hindi / English', hi: 'सामान्य हिन्दी / अंग्रेज़ी' },
      { en: 'General Studies', hi: 'सामान्य अध्ययन' },
      { en: 'Bihar General Knowledge', hi: 'बिहार सामान्य ज्ञान' },
      { en: 'Child Development & Pedagogy', hi: 'बाल विकास एवं शिक्षाशास्त्र' },
      { en: 'Subject paper', hi: 'विषय पत्र' },
    ],
  },
  'bihar-daroga': {
    slug: 'bihar-daroga',
    short: { en: 'Bihar Daroga', hi: 'बिहार दरोगा' },
    name: { en: 'Bihar Police Sub-Inspector (Daroga)', hi: 'बिहार पुलिस अवर निरीक्षक (दरोगा)' },
    body: { en: 'Bihar Police Subordinate Services Commission', hi: 'बिहार पुलिस अवर सेवा आयोग' },
    state: { en: 'Bihar', hi: 'बिहार' },
    blurb: {
      en: 'Sub-Inspector recruitment for Bihar Police. General studies, Bihar GK, reasoning and mathematics.',
      hi: 'बिहार पुलिस में अवर निरीक्षक भर्ती। सामान्य अध्ययन, बिहार सामान्य ज्ञान, तर्कशक्ति और गणित।',
    },
    subjects: [
      { en: 'General Studies', hi: 'सामान्य अध्ययन' },
      { en: 'Bihar General Knowledge', hi: 'बिहार सामान्य ज्ञान' },
      { en: 'Reasoning', hi: 'तर्कशक्ति' },
      { en: 'Mathematics', hi: 'गणित' },
      { en: 'General Hindi (mains)', hi: 'सामान्य हिन्दी (मुख्य)' },
    ],
  },
  'bpsc-cce': {
    slug: 'bpsc-cce',
    short: { en: 'BPSC Prelims', hi: 'बीपीएससी प्रारंभिक' },
    name: { en: 'BPSC Combined Competitive Exam (Prelims)', hi: 'बीपीएससी संयुक्त प्रतियोगी परीक्षा (प्रारंभिक)' },
    body: { en: 'Bihar Public Service Commission', hi: 'बिहार लोक सेवा आयोग' },
    website: 'https://bpsc.bihar.gov.in',
    state: { en: 'Bihar', hi: 'बिहार' },
    blurb: {
      en: 'Bihar’s civil services exam. The prelims general studies paper covers history, geography, polity, economy, science, Bihar and mental ability.',
      hi: 'बिहार की सिविल सेवा परीक्षा। प्रारंभिक सामान्य अध्ययन पत्र में इतिहास, भूगोल, राजव्यवस्था, अर्थव्यवस्था, विज्ञान, बिहार और मानसिक योग्यता।',
    },
    subjects: [
      { en: 'History & National Movement', hi: 'इतिहास एवं राष्ट्रीय आंदोलन' },
      { en: 'Geography', hi: 'भूगोल' },
      { en: 'Polity & Economy', hi: 'राजव्यवस्था एवं अर्थव्यवस्था' },
      { en: 'General Science', hi: 'सामान्य विज्ञान' },
      { en: 'Bihar Special', hi: 'बिहार विशेष' },
      { en: 'Mental Ability', hi: 'मानसिक योग्यता' },
    ],
  },
  'up-si': {
    slug: 'up-si',
    short: { en: 'UP SI', hi: 'यूपी एसआई' },
    name: { en: 'UP Police Sub-Inspector', hi: 'उत्तर प्रदेश पुलिस उप निरीक्षक' },
    body: { en: 'UP Police Recruitment and Promotion Board', hi: 'उत्तर प्रदेश पुलिस भर्ती एवं प्रोन्नति बोर्ड' },
    website: 'https://uppbpb.gov.in',
    state: { en: 'Uttar Pradesh', hi: 'उत्तर प्रदेश' },
    blurb: {
      en: 'Sub-Inspector recruitment for UP Police. General Hindi, law and constitution, numerical ability and reasoning.',
      hi: 'उत्तर प्रदेश पुलिस में उप निरीक्षक भर्ती। सामान्य हिन्दी, विधि एवं संविधान, संख्यात्मक योग्यता और तर्कशक्ति।',
    },
    subjects: [
      { en: 'General Hindi', hi: 'सामान्य हिन्दी' },
      { en: 'Basic Law, Constitution & GK', hi: 'मूल विधि, संविधान एवं सामान्य ज्ञान' },
      { en: 'Numerical & Mental Ability', hi: 'संख्यात्मक एवं मानसिक योग्यता' },
      { en: 'Mental Aptitude & Reasoning', hi: 'मानसिक अभिरुचि एवं तार्किक क्षमता' },
    ],
  },
};

/** What the Pass unlocks, listed on every exam page and on the pricing page. */
export const PASS_FEATURES: Bi[] = [
  { en: 'Full-length mock tests in the exam pattern', hi: 'परीक्षा पैटर्न पर पूर्ण मॉक टेस्ट' },
  { en: 'Topic-wise practice with explanations', hi: 'व्याख्या सहित विषयवार अभ्यास' },
  { en: 'Solved previous year papers', hi: 'हल सहित पिछले वर्षों के प्रश्नपत्र' },
  { en: 'Weak-topic report after every test', hi: 'हर टेस्ट के बाद कमज़ोर विषयों की रिपोर्ट' },
  { en: 'All four exams in one Pass', hi: 'चारों परीक्षाएं एक ही पास में' },
];

export const PASS_PRICE = 1000;

/* ------------------------------------------------------------------ papers */

const bi = z.object({ en: z.string().min(1), hi: z.string().min(1) });

const questionSchema = z.object({
  id: z.string().min(1),
  topic: bi,
  difficulty: z.enum(['easy', 'medium', 'hard']),
  text: bi,
  options: z.array(bi).length(4),
  answer: z.number().int().min(0).max(3),
  explanation: bi,
});

const paperSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  exam: z.enum(EXAMS),
  title: bi,
  kind: z.enum(['mock', 'pyq']),
  free: z.boolean(),
  status: z.enum(['draft', 'reviewed']),
  duration_minutes: z.number().int().positive(),
  marks_per_question: z.number().positive(),
  negative_marking: z.number().min(0),
  sections: z
    .array(
      z.object({
        id: z.string().min(1),
        name: bi,
        questions: z.array(questionSchema).min(1),
      }),
    )
    .min(1),
});

export type Question = z.infer<typeof questionSchema>;
export type Paper = z.infer<typeof paperSchema>;

const files = import.meta.glob<{ default: unknown }>('../data/papers/*/*.json', { eager: true });

function loadPapers(): Paper[] {
  const out: Paper[] = [];
  for (const [path, mod] of Object.entries(files)) {
    const parsed = paperSchema.safeParse(mod.default);
    if (!parsed.success) {
      throw new Error(`Invalid paper ${path}:\n${z.prettifyError(parsed.error)}`);
    }
    const p = parsed.data;
    const [, folder, file] = /papers\/([^/]+)\/([^/]+)\.json$/.exec(path) ?? [];
    if (folder !== p.exam || file !== p.id) {
      throw new Error(`Paper ${path} must live at papers/${p.exam}/${p.id}.json`);
    }
    const ids = new Set<string>();
    for (const q of p.sections.flatMap((s) => s.questions)) {
      if (ids.has(q.id)) throw new Error(`Duplicate question id ${q.id} in ${path}`);
      ids.add(q.id);
    }
    out.push(p);
  }
  return out.sort((a, b) => a.exam.localeCompare(b.exam) || a.id.localeCompare(b.id));
}

const ALL = loadPapers();

export function papersFor(exam: Exam): Paper[] {
  return ALL.filter((p) => p.exam === exam);
}

export function allPapers(): Paper[] {
  return ALL;
}

export function questionCount(p: Paper): number {
  return p.sections.reduce((n, s) => n + s.questions.length, 0);
}

export function maxMarks(p: Paper): number {
  return questionCount(p) * p.marks_per_question;
}

export function topicsOf(p: Paper): Bi[] {
  const seen = new Map<string, Bi>();
  for (const q of p.sections.flatMap((s) => s.questions)) seen.set(q.topic.en, q.topic);
  return [...seen.values()];
}

export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export function durationLabel(minutes: number): Bi {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const en = [h ? `${h} hour${h === 1 ? '' : 's'}` : '', m ? `${m} minutes` : ''].filter(Boolean).join(' ');
  const hi = [h ? `${h} घंटे` : '', m ? `${m} मिनट` : ''].filter(Boolean).join(' ');
  return { en, hi };
}

/** What the practice and test pages embed for their client scripts. */
export function paperJson(p: Paper): string {
  const data = {
    id: p.id,
    exam: p.exam,
    title: p.title,
    examName: EXAM_INFO[p.exam].short,
    duration_minutes: p.duration_minutes,
    marks_per_question: p.marks_per_question,
    negative_marking: p.negative_marking,
    sections: p.sections,
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
