export const SITE_NAME = 'Prashnottar';
export const SITE_NAME_HI = 'प्रश्नोत्तर';
export const TAGLINE = {
  en: 'Practice papers for BPSC TRE, Bihar Daroga, BPSC Prelims and UP SI',
  hi: 'बीपीएससी टीआरई, बिहार दरोगा, बीपीएससी प्रारंभिक और यूपी एसआई के अभ्यास प्रश्नपत्र',
};
export const DESCRIPTION =
  'Practice mode, timed mock tests and exam-style question papers in Hindi and English for BPSC TRE, Bihar Daroga (BPSSC SI), BPSC Prelims and UP SI.';

import type { Exam } from './lib/exams.ts';

/**
 * Where each exam's "Get the Pass" button sends buyers: a payment page
 * (Razorpay, Cosmofeed…) or a WhatsApp chat. Set one variable per exam, or
 * PUBLIC_CHECKOUT_URL for all of them. Unset = the button says payments open soon.
 */
const CHECKOUT: Record<Exam, string | undefined> = {
  'bpsc-tre': import.meta.env.PUBLIC_CHECKOUT_URL_BPSC_TRE,
  'bihar-daroga': import.meta.env.PUBLIC_CHECKOUT_URL_BIHAR_DAROGA,
  'bpsc-cce': import.meta.env.PUBLIC_CHECKOUT_URL_BPSC_CCE,
  'up-si': import.meta.env.PUBLIC_CHECKOUT_URL_UP_SI,
};

export function checkoutUrl(exam: Exam): string | undefined {
  return CHECKOUT[exam] || import.meta.env.PUBLIC_CHECKOUT_URL || undefined;
}
