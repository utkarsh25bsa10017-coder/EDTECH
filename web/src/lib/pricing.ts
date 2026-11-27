import type { Bi, Exam } from './exams.ts';
import { href } from './url.ts';

/**
 * Price ladder, the same for every exam, plus two bundles. Checkout links come
 * from PUBLIC_CHECKOUT_URL_<EXAM>_<TIER> (e.g. PUBLIC_CHECKOUT_URL_BPSC_TRE_PROBABLE)
 * or PUBLIC_CHECKOUT_URL for all. With neither, buy buttons open /buy/, which
 * says payments open soon.
 */
export const TIERS = ['probable', 'fast2', 'pass'] as const;
export type Tier = (typeof TIERS)[number];

export interface TierInfo {
  id: Tier;
  price: number;
  name: Bi;
  summary: Bi;
  includes: Bi[];
}

const b = (en: string, hi: string): Bi => ({ en, hi });

export const TIER_INFO: Record<Tier, TierInfo> = {
  probable: {
    id: 'probable',
    price: 249,
    name: b('Most-probable set', 'संभावित प्रश्न सेट'),
    summary: b('The questions most likely to come, from past-paper trends.', 'पिछले प्रश्नपत्रों के रुझान से सबसे संभावित प्रश्न।'),
    includes: [
      b('Most-probable question set with full solutions', 'संभावित प्रश्न सेट, पूरे हल के साथ'),
      b('Topic-wise weak-area report', 'विषयवार कमज़ोर क्षेत्र रिपोर्ट'),
      b('Printable paper and OMR sheet', 'प्रिंट करने योग्य प्रश्नपत्र और ओएमआर शीट'),
    ],
  },
  fast2: {
    id: 'fast2',
    price: 499,
    name: b('2-month fast-track', '2 महीने का फ़ास्ट-ट्रैक'),
    summary: b('A focused plan for the last two months.', 'अंतिम दो महीनों के लिए केंद्रित योजना।'),
    includes: [
      b('Everything in the most-probable set', 'संभावित प्रश्न सेट की हर चीज़'),
      b('Timed full mocks in the exam pattern', 'परीक्षा पैटर्न में समयबद्ध फ़ुल मॉक'),
      b('Solved past papers', 'हल किए गए पिछले प्रश्नपत्र'),
      b('Two-month study plan', 'दो महीने की अध्ययन योजना'),
    ],
  },
  pass: {
    id: 'pass',
    price: 999,
    name: b('3-month fast-track (full Pass)', '3 महीने का फ़ास्ट-ट्रैक (पूरा पास)'),
    summary: b('Everything for this exam, for this exam cycle.', 'इस परीक्षा की हर सामग्री, इस परीक्षा चक्र के लिए।'),
    includes: [
      b('Everything in the 2-month plan', '2 महीने की योजना की हर चीज़'),
      b('All mocks, sample papers and topic practice', 'सभी मॉक, सैंपल पेपर और विषयवार अभ्यास'),
      b('Three-month study plan', 'तीन महीने की अध्ययन योजना'),
      b('Every subject in the syllabus', 'पाठ्यक्रम के सभी विषय'),
    ],
  },
};

export const BUNDLES = ['tre-ctet', 'tre-stet'] as const;
export type Bundle = (typeof BUNDLES)[number];

export interface BundleInfo {
  id: Bundle;
  price: number;
  exams: Exam[];
  name: Bi;
  summary: Bi;
}

export const BUNDLE_INFO: Record<Bundle, BundleInfo> = {
  'tre-ctet': {
    id: 'tre-ctet',
    price: 799,
    exams: ['bpsc-tre', 'ctet'],
    name: b('TRE + CTET bundle', 'टीआरई + सीटीईटी बंडल'),
    summary: b('Full Pass for BPSC TRE 4.0 and CTET. Child development and pedagogy overlap.', 'बीपीएससी टीआरई 4.0 और सीटीईटी का पूरा पास। बाल विकास एवं शिक्षाशास्त्र दोनों में।'),
  },
  'tre-stet': {
    id: 'tre-stet',
    price: 799,
    exams: ['bpsc-tre', 'bihar-stet'],
    name: b('TRE + STET bundle', 'टीआरई + एसटीईटी बंडल'),
    summary: b('Full Pass for BPSC TRE 4.0 and Bihar STET. Subject paper and pedagogy overlap.', 'बीपीएससी टीआरई 4.0 और बिहार एसटीईटी का पूरा पास। विषय पत्र एवं शिक्षाशास्त्र दोनों में।'),
  },
};

const env = import.meta.env;

/* Vite only replaces static import.meta.env.X references, so every name is spelled out. */
const CHECKOUT: Record<string, string | undefined> = {
  'bpsc-tre:probable': env.PUBLIC_CHECKOUT_URL_BPSC_TRE_PROBABLE,
  'bpsc-tre:fast2': env.PUBLIC_CHECKOUT_URL_BPSC_TRE_FAST2,
  'bpsc-tre:pass': env.PUBLIC_CHECKOUT_URL_BPSC_TRE_PASS,
  'bpsc-cce:probable': env.PUBLIC_CHECKOUT_URL_BPSC_CCE_PROBABLE,
  'bpsc-cce:fast2': env.PUBLIC_CHECKOUT_URL_BPSC_CCE_FAST2,
  'bpsc-cce:pass': env.PUBLIC_CHECKOUT_URL_BPSC_CCE_PASS,
  'mppsc:probable': env.PUBLIC_CHECKOUT_URL_MPPSC_PROBABLE,
  'mppsc:fast2': env.PUBLIC_CHECKOUT_URL_MPPSC_FAST2,
  'mppsc:pass': env.PUBLIC_CHECKOUT_URL_MPPSC_PASS,
  'ras:probable': env.PUBLIC_CHECKOUT_URL_RAS_PROBABLE,
  'ras:fast2': env.PUBLIC_CHECKOUT_URL_RAS_FAST2,
  'ras:pass': env.PUBLIC_CHECKOUT_URL_RAS_PASS,
  'bihar-stet:probable': env.PUBLIC_CHECKOUT_URL_BIHAR_STET_PROBABLE,
  'bihar-stet:fast2': env.PUBLIC_CHECKOUT_URL_BIHAR_STET_FAST2,
  'bihar-stet:pass': env.PUBLIC_CHECKOUT_URL_BIHAR_STET_PASS,
  'ctet:probable': env.PUBLIC_CHECKOUT_URL_CTET_PROBABLE,
  'ctet:fast2': env.PUBLIC_CHECKOUT_URL_CTET_FAST2,
  'ctet:pass': env.PUBLIC_CHECKOUT_URL_CTET_PASS,
  'cg-tet:probable': env.PUBLIC_CHECKOUT_URL_CG_TET_PROBABLE,
  'cg-tet:fast2': env.PUBLIC_CHECKOUT_URL_CG_TET_FAST2,
  'cg-tet:pass': env.PUBLIC_CHECKOUT_URL_CG_TET_PASS,
  'bundle:tre-ctet': env.PUBLIC_CHECKOUT_URL_BUNDLE_TRE_CTET,
  'bundle:tre-stet': env.PUBLIC_CHECKOUT_URL_BUNDLE_TRE_STET,
};

const FALLBACK: string | undefined = env.PUBLIC_CHECKOUT_URL || undefined;

export interface BuyLink {
  href: string;
  /** true = a real payment page; false = the "payments opening soon" note. */
  live: boolean;
}

export function tierLink(exam: Exam, tier: Tier): BuyLink {
  const url = CHECKOUT[`${exam}:${tier}`] || FALLBACK;
  return url ? { href: url, live: true } : { href: href(`/buy/?exam=${exam}&tier=${tier}`), live: false };
}

export function bundleLink(bundle: Bundle): BuyLink {
  const url = CHECKOUT[`bundle:${bundle}`] || FALLBACK;
  return url ? { href: url, live: true } : { href: href(`/buy/?bundle=${bundle}`), live: false };
}

export const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
