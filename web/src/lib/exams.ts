import { z } from 'zod';

export interface Bi {
  en: string;
  hi: string;
}

/** Slugs from docs/ARCHITECTURE.md. Order = order on the site. */
export const EXAMS = ['bpsc-tre', 'bpsc-cce', 'mppsc', 'ras', 'bihar-stet', 'ctet', 'cg-tet'] as const;
export type Exam = (typeof EXAMS)[number];

export function isExam(s: string | null | undefined): s is Exam {
  return !!s && (EXAMS as readonly string[]).includes(s);
}

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
  /** Expected exam window. Always tentative: confirm with the official notice. */
  timing: Bi;
  track: 'core' | 'filler';
}

const b = (en: string, hi: string): Bi => ({ en, hi });

export const TENTATIVE = b('Tentative: confirm with the official notice.', 'संभावित: आधिकारिक सूचना से पुष्टि करें।');

export const EXAM_INFO: Record<Exam, ExamInfo> = {
  'bpsc-tre': {
    slug: 'bpsc-tre',
    short: b('BPSC TRE 4.0', 'बीपीएससी टीआरई 4.0'),
    name: b('BPSC Teacher Recruitment Exam (TRE 4.0)', 'बीपीएससी शिक्षक भर्ती परीक्षा (टीआरई 4.0)'),
    body: b('Bihar Public Service Commission (BPSC)', 'बिहार लोक सेवा आयोग (बीपीएससी)'),
    website: 'https://bpsc.bihar.gov.in',
    state: b('Bihar', 'बिहार'),
    blurb: b(
      'Government school teacher recruitment in Bihar: language, general studies, the subject paper, and child development and pedagogy.',
      'बिहार के सरकारी विद्यालयों में शिक्षक भर्ती: भाषा, सामान्य अध्ययन, विषय पत्र तथा बाल विकास एवं शिक्षाशास्त्र।',
    ),
    subjects: [
      b('General Hindi / English', 'सामान्य हिन्दी / अंग्रेज़ी'),
      b('General Studies', 'सामान्य अध्ययन'),
      b('Bihar General Knowledge', 'बिहार सामान्य ज्ञान'),
      b('Mental Ability & Maths', 'मानसिक योग्यता एवं गणित'),
      b('Child Development & Pedagogy', 'बाल विकास एवं शिक्षाशास्त्र'),
      b('Subject paper (by class level)', 'विषय पत्र (कक्षा स्तर अनुसार)'),
    ],
    timing: b('About July 2027', 'लगभग जुलाई 2027'),
    track: 'core',
  },
  'bpsc-cce': {
    slug: 'bpsc-cce',
    short: b('BPSC CCE', 'बीपीएससी सीसीई'),
    name: b('BPSC 73rd Combined Competitive Exam (Prelims)', 'बीपीएससी 73वीं संयुक्त प्रतियोगी परीक्षा (प्रारंभिक)'),
    body: b('Bihar Public Service Commission (BPSC)', 'बिहार लोक सेवा आयोग (बीपीएससी)'),
    website: 'https://bpsc.bihar.gov.in',
    state: b('Bihar', 'बिहार'),
    blurb: b(
      'Bihar’s civil services exam. The prelims paper covers history, geography, polity, economy, science, Bihar and mental ability.',
      'बिहार की सिविल सेवा परीक्षा। प्रारंभिक पत्र में इतिहास, भूगोल, राजव्यवस्था, अर्थव्यवस्था, विज्ञान, बिहार और मानसिक योग्यता।',
    ),
    subjects: [
      b('History & National Movement', 'इतिहास एवं राष्ट्रीय आंदोलन'),
      b('Geography', 'भूगोल'),
      b('Polity & Economy', 'राजव्यवस्था एवं अर्थव्यवस्था'),
      b('General Science', 'सामान्य विज्ञान'),
      b('Current Events', 'समसामयिक घटनाएं'),
      b('Bihar Special', 'बिहार विशेष'),
      b('Mental Ability', 'मानसिक योग्यता'),
    ],
    timing: b('Late 2027 (73rd CCE)', '2027 के अंत में (73वीं सीसीई)'),
    track: 'core',
  },
  mppsc: {
    slug: 'mppsc',
    short: b('MPPSC', 'एमपीपीएससी'),
    name: b('MPPSC State Service Exam (Prelims)', 'एमपीपीएससी राज्य सेवा परीक्षा (प्रारंभिक)'),
    body: b('Madhya Pradesh Public Service Commission (MPPSC)', 'मध्यप्रदेश लोक सेवा आयोग (एमपीपीएससी)'),
    website: 'https://mppsc.mp.gov.in',
    state: b('Madhya Pradesh', 'मध्यप्रदेश'),
    blurb: b(
      'Madhya Pradesh’s state services exam. Prelims: a general studies paper and a qualifying aptitude paper, with a strong MP focus.',
      'मध्यप्रदेश की राज्य सेवा परीक्षा। प्रारंभिक: सामान्य अध्ययन का पत्र और क्वालिफ़ाइंग अभिरुचि पत्र, मध्यप्रदेश पर विशेष ज़ोर।',
    ),
    subjects: [
      b('History of India & MP', 'भारत एवं मध्यप्रदेश का इतिहास'),
      b('Geography', 'भूगोल'),
      b('Polity & Economy', 'राजव्यवस्था एवं अर्थव्यवस्था'),
      b('General Science & Environment', 'सामान्य विज्ञान एवं पर्यावरण'),
      b('Tribes of MP', 'मध्यप्रदेश की जनजातियां'),
      b('Current Affairs', 'समसामयिकी'),
      b('General Aptitude (CSAT)', 'सामान्य अभिरुचि (सीसैट)'),
    ],
    timing: b('Prelims about 24 January and 2 May 2027', 'प्रारंभिक लगभग 24 जनवरी और 2 मई 2027'),
    track: 'core',
  },
  ras: {
    slug: 'ras',
    short: b('RAS', 'आरएएस'),
    name: b('RPSC RAS/RTS Combined Competitive Exam (Prelims)', 'आरपीएससी आरएएस/आरटीएस संयुक्त प्रतियोगी परीक्षा (प्रारंभिक)'),
    body: b('Rajasthan Public Service Commission (RPSC)', 'राजस्थान लोक सेवा आयोग (आरपीएससी)'),
    website: 'https://rpsc.rajasthan.gov.in',
    state: b('Rajasthan', 'राजस्थान'),
    blurb: b(
      'Rajasthan’s administrative services exam. One prelims paper on general knowledge and general science, heavy on Rajasthan.',
      'राजस्थान की प्रशासनिक सेवा परीक्षा। प्रारंभिक में सामान्य ज्ञान एवं सामान्य विज्ञान का एक पत्र, राजस्थान पर विशेष ज़ोर।',
    ),
    subjects: [
      b('Rajasthan: history, art & culture', 'राजस्थान: इतिहास, कला एवं संस्कृति'),
      b('Indian History', 'भारत का इतिहास'),
      b('Geography', 'भूगोल'),
      b('Polity & Administration', 'राजव्यवस्था एवं प्रशासन'),
      b('Economy', 'अर्थव्यवस्था'),
      b('Science & Technology', 'विज्ञान एवं प्रौद्योगिकी'),
      b('Reasoning & Current Affairs', 'तर्कशक्ति एवं समसामयिकी'),
    ],
    timing: b('Late 2027', '2027 के अंत में'),
    track: 'core',
  },
  'bihar-stet': {
    slug: 'bihar-stet',
    short: b('Bihar STET', 'बिहार एसटीईटी'),
    name: b('Bihar Secondary Teacher Eligibility Test (STET)', 'बिहार माध्यमिक शिक्षक पात्रता परीक्षा (एसटीईटी)'),
    body: b('Bihar School Examination Board (BSEB)', 'बिहार विद्यालय परीक्षा समिति (बीएसईबी)'),
    state: b('Bihar', 'बिहार'),
    blurb: b(
      'Eligibility test for secondary and senior secondary teachers in Bihar: your subject plus teaching aptitude. Pairs well with TRE.',
      'बिहार में माध्यमिक और उच्च माध्यमिक शिक्षकों की पात्रता परीक्षा: आपका विषय और शिक्षण अभिरुचि। टीआरई के साथ उपयोगी।',
    ),
    subjects: [
      b('Chosen subject', 'चुना गया विषय'),
      b('Teaching Aptitude', 'शिक्षण अभिरुचि'),
      b('Pedagogy', 'शिक्षाशास्त्र'),
    ],
    timing: b('Possibly mid-2027', 'संभवतः 2027 के मध्य में'),
    track: 'filler',
  },
  ctet: {
    slug: 'ctet',
    short: b('CTET', 'सीटीईटी'),
    name: b('Central Teacher Eligibility Test (CTET)', 'केंद्रीय शिक्षक पात्रता परीक्षा (सीटीईटी)'),
    body: b('Central Board of Secondary Education (CBSE)', 'केंद्रीय माध्यमिक शिक्षा बोर्ड (सीबीएसई)'),
    website: 'https://ctet.nic.in',
    state: b('All India', 'अखिल भारतीय'),
    blurb: b(
      'National teacher eligibility test. Paper 1 for classes 1–5, Paper 2 for classes 6–8. Child development carries every paper.',
      'राष्ट्रीय शिक्षक पात्रता परीक्षा। कक्षा 1–5 के लिए प्रश्नपत्र 1, कक्षा 6–8 के लिए प्रश्नपत्र 2। बाल विकास हर पत्र में।',
    ),
    subjects: [
      b('Child Development & Pedagogy', 'बाल विकास एवं शिक्षाशास्त्र'),
      b('Language I & II', 'भाषा I एवं II'),
      b('Mathematics', 'गणित'),
      b('Environmental Studies', 'पर्यावरण अध्ययन'),
      b('Science / Social Studies', 'विज्ञान / सामाजिक अध्ययन'),
    ],
    timing: b('Usually twice a year', 'आम तौर पर साल में दो बार'),
    track: 'filler',
  },
  'cg-tet': {
    slug: 'cg-tet',
    short: b('CG TET', 'सीजी टीईटी'),
    name: b('Chhattisgarh Teacher Eligibility Test (CG TET)', 'छत्तीसगढ़ शिक्षक पात्रता परीक्षा (सीजी टीईटी)'),
    body: b('CG Vyapam / Chhattisgarh Staff Selection Board', 'छत्तीसगढ़ व्यापम / छत्तीसगढ़ कर्मचारी चयन मंडल'),
    state: b('Chhattisgarh', 'छत्तीसगढ़'),
    blurb: b(
      'Chhattisgarh’s teacher eligibility test, in the CTET pattern, with questions on Chhattisgarh across sections.',
      'छत्तीसगढ़ की शिक्षक पात्रता परीक्षा, सीटीईटी के पैटर्न पर, कई खण्डों में छत्तीसगढ़ से जुड़े प्रश्न।',
    ),
    subjects: [
      b('Child Development & Pedagogy', 'बाल विकास एवं शिक्षाशास्त्र'),
      b('Hindi', 'हिन्दी'),
      b('English / regional language', 'अंग्रेज़ी / क्षेत्रीय भाषा'),
      b('Mathematics', 'गणित'),
      b('EVS / Science / Social Studies', 'पर्यावरण / विज्ञान / सामाजिक अध्ययन'),
    ],
    timing: b('About 26 September 2027', 'लगभग 26 सितंबर 2027'),
    track: 'filler',
  },
};

/* ------------------------------------------------------------------ papers */

export const PAPER_KINDS = ['free', 'mock', 'sample', 'probable', 'pyq'] as const;
export type PaperKind = (typeof PAPER_KINDS)[number];

export const KIND_LABEL: Record<PaperKind, Bi> = {
  free: b('Free set', 'मुफ़्त सेट'),
  mock: b('Full mock', 'फ़ुल मॉक'),
  sample: b('Sample paper', 'सैंपल पेपर'),
  probable: b('Most-probable set', 'संभावित प्रश्न सेट'),
  pyq: b('Past paper', 'पिछला प्रश्नपत्र'),
};

const bi = z.object({ en: z.string().min(1), hi: z.string().min(1) });

const questionSchema = z
  .object({
    id: z.string().min(1),
    qid: z.string().optional(),
    topic: bi,
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    type: z.string().optional(),
    text: bi,
    options: z.array(bi).min(4).max(5),
    answer: z.number().int().min(0),
    explanation: bi,
  })
  .refine((q) => q.answer < q.options.length, { message: 'answer must index an option' });

const paperSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  exam: z.enum(EXAMS),
  title: bi,
  kind: z.enum(PAPER_KINDS),
  free: z.boolean(),
  status: z.enum(['draft', 'reviewed']).default('draft'),
  duration_minutes: z.number().positive(),
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
    // The static build is public. A paid paper here would leak the paid asset.
    if (!p.free) {
      throw new Error(`Paper ${path} has free: false. Paid papers belong in content/papers/ and are served by the API only.`);
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

export function durationLabel(minutes: number): Bi {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  const en = [h ? `${h} hour${h === 1 ? '' : 's'}` : '', m ? `${m} minutes` : ''].filter(Boolean).join(' ');
  const hi = [h ? `${h} घंटे` : '', m ? `${m} मिनट` : ''].filter(Boolean).join(' ');
  return { en, hi };
}

/** What the practice, test and booklet pages embed for their client scripts. */
export function paperJson(p: Paper): string {
  return JSON.stringify(p).replace(/</g, '\\u003c');
}
