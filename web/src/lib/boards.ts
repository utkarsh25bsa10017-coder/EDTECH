import type { Board, Extraction, Kind, Lang, PaperSummary } from './schema.ts';
import { BOARD_CLASSES } from './schema.ts';

export interface Bi {
  en: string;
  hi: string;
}

export interface BoardInfo {
  slug: Board;
  short: string;
  name: Bi;
  body: Bi;
  website: string;
  classes: readonly number[];
  /** Local names for class 10 / 12 exams, shown next to "Class N". */
  aliases?: Partial<Record<number, Bi>>;
  blurb: Bi;
}

export const BOARD_INFO: Record<Board, BoardInfo> = {
  cbse: {
    slug: 'cbse',
    short: 'CBSE',
    name: { en: 'Central Board of Secondary Education', hi: 'केंद्रीय माध्यमिक शिक्षा बोर्ड' },
    body: { en: 'CBSE', hi: 'सीबीएसई' },
    website: 'https://cbseacademic.nic.in',
    classes: BOARD_CLASSES.cbse,
    blurb: {
      en: 'Sample question papers with official marking schemes, and previous years’ board papers for classes 9–12.',
      hi: 'कक्षा 9–12 के लिए आधिकारिक अंकन योजना सहित प्रतिदर्श प्रश्नपत्र और पिछले वर्षों के बोर्ड प्रश्नपत्र।',
    },
  },
  icse: {
    slug: 'icse',
    short: 'ICSE',
    name: { en: 'Indian Certificate of Secondary Education', hi: 'भारतीय माध्यमिक शिक्षा प्रमाणपत्र' },
    body: { en: 'CISCE', hi: 'सीआईएससीई' },
    website: 'https://cisce.org',
    classes: BOARD_CLASSES.icse,
    blurb: {
      en: 'CISCE specimen papers and past ICSE papers for classes 9 and 10.',
      hi: 'कक्षा 9 और 10 के लिए सीआईएससीई नमूना प्रश्नपत्र और पिछले आईसीएसई प्रश्नपत्र।',
    },
  },
  isc: {
    slug: 'isc',
    short: 'ISC',
    name: { en: 'Indian School Certificate', hi: 'भारतीय विद्यालय प्रमाणपत्र' },
    body: { en: 'CISCE', hi: 'सीआईएससीई' },
    website: 'https://cisce.org',
    classes: BOARD_CLASSES.isc,
    blurb: {
      en: 'CISCE specimen papers and past ISC papers for classes 11 and 12.',
      hi: 'कक्षा 11 और 12 के लिए सीआईएससीई नमूना प्रश्नपत्र और पिछले आईएससी प्रश्नपत्र।',
    },
  },
  up: {
    slug: 'up',
    short: 'UP Board',
    name: { en: 'Uttar Pradesh Madhyamik Shiksha Parishad', hi: 'उत्तर प्रदेश माध्यमिक शिक्षा परिषद' },
    body: { en: 'UPMSP', hi: 'यूपीएमएसपी' },
    website: 'https://upmsp.edu.in',
    classes: BOARD_CLASSES.up,
    aliases: {
      10: { en: 'High School', hi: 'हाईस्कूल' },
      12: { en: 'Intermediate', hi: 'इंटरमीडिएट' },
    },
    blurb: {
      en: 'Model papers and question banks for High School and Intermediate, in Hindi and English.',
      hi: 'हाईस्कूल और इंटरमीडिएट के मॉडल प्रश्नपत्र और प्रश्न बैंक, हिन्दी और अंग्रेज़ी में।',
    },
  },
  bihar: {
    slug: 'bihar',
    short: 'Bihar Board',
    name: { en: 'Bihar School Examination Board', hi: 'बिहार विद्यालय परीक्षा समिति' },
    body: { en: 'BSEB', hi: 'बीएसईबी' },
    website: 'https://biharboardonline.bihar.gov.in',
    classes: BOARD_CLASSES.bihar,
    aliases: {
      10: { en: 'Matric', hi: 'मैट्रिक' },
      12: { en: 'Intermediate', hi: 'इंटरमीडिएट' },
    },
    blurb: {
      en: 'Model papers for Matric and Intermediate, published by BSEB.',
      hi: 'बीएसईबी द्वारा प्रकाशित मैट्रिक और इंटरमीडिएट के मॉडल प्रश्नपत्र।',
    },
  },
};

export const KIND_LABEL: Record<Kind, Bi> = {
  pyq: { en: 'Previous year paper', hi: 'पिछले वर्ष का प्रश्नपत्र' },
  sample: { en: 'Sample paper', hi: 'प्रतिदर्श प्रश्नपत्र' },
  specimen: { en: 'Specimen paper', hi: 'नमूना प्रश्नपत्र' },
  model: { en: 'Model paper', hi: 'मॉडल प्रश्नपत्र' },
};

export const KIND_SHORT: Record<Kind, Bi> = {
  pyq: { en: 'Board paper', hi: 'बोर्ड प्रश्नपत्र' },
  sample: { en: 'Sample', hi: 'प्रतिदर्श' },
  specimen: { en: 'Specimen', hi: 'नमूना' },
  model: { en: 'Model', hi: 'मॉडल' },
};

export const LANG_LABEL: Record<Lang, Bi> = {
  en: { en: 'English', hi: 'अंग्रेज़ी' },
  hi: { en: 'Hindi', hi: 'हिन्दी' },
  bi: { en: 'Bilingual', hi: 'द्विभाषी' },
};

export const EXTRACTION_LABEL: Record<Extraction, Bi> = {
  full: { en: 'Questions & answers', hi: 'प्रश्न और उत्तर' },
  questions: { en: 'Questions', hi: 'प्रश्न' },
  'pdf-only': { en: 'PDF only', hi: 'केवल PDF' },
};

export const KIND_ORDER: Kind[] = ['pyq', 'sample', 'specimen', 'model'];
export const LANG_ORDER: Lang[] = ['en', 'hi', 'bi'];

export function classLabel(n: number): Bi {
  return { en: `Class ${n}`, hi: `कक्षा ${n}` };
}

export function classSlug(n: number): string {
  return `class-${n}`;
}

export function parseClassSlug(s: string): number | null {
  const m = /^class-(\d+)$/.exec(s);
  return m ? Number(m[1]) : null;
}

export function subjectName(p: Pick<PaperSummary, 'subject_name'>): Bi {
  return { en: p.subject_name.en, hi: p.subject_name.hi ?? p.subject_name.en };
}

/** Consistent display name, e.g. "CBSE Class 10 Science Sample paper 2025". */
export function paperName(p: PaperSummary): Bi {
  const b = BOARD_INFO[p.board];
  const s = subjectName(p);
  const k = KIND_LABEL[p.kind];
  const v = p.variant ? ` (${p.variant})` : '';
  return {
    en: `${b.short} Class ${p.class} ${s.en} ${k.en} ${p.year}${v}`,
    hi: `${b.short} कक्षा ${p.class} ${s.hi} ${k.hi} ${p.year}${v}`,
  };
}

export function durationLabel(minutes: number): Bi {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const en = [h ? `${h} hour${h === 1 ? '' : 's'}` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
  const hi = [h ? `${h} घंटे` : '', m ? `${m} मिनट` : ''].filter(Boolean).join(' ');
  return { en, hi };
}

function fmtNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toString();
}

export function marksLabel(n: number): Bi {
  return { en: `${fmtNumber(n)} mark${n === 1 ? '' : 's'}`, hi: `${fmtNumber(n)} अंक` };
}

export function countLabel(n: number, one: Bi, many: Bi): Bi {
  const w = n === 1 ? one : many;
  return { en: `${n.toLocaleString('en-IN')} ${w.en}`, hi: `${n.toLocaleString('en-IN')} ${w.hi}` };
}

export const PAPERS: [Bi, Bi] = [
  { en: 'paper', hi: 'प्रश्नपत्र' },
  { en: 'papers', hi: 'प्रश्नपत्र' },
];
export const QUESTIONS: [Bi, Bi] = [
  { en: 'question', hi: 'प्रश्न' },
  { en: 'questions', hi: 'प्रश्न' },
];

/** "A" -> "Section A"; already-descriptive names ("Part I", "खण्ड-क") stay as printed. */
export function sectionLabel(section: string): Bi {
  if (/^[A-Z]$|^[IVX]+$/.test(section)) return { en: `Section ${section}`, hi: `खण्ड ${section}` };
  return { en: section, hi: section };
}
