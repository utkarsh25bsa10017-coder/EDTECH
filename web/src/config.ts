export const SITE_NAME = 'Prashnottar';
export const SITE_NAME_HI = 'प्रश्नोत्तर';
export const TAGLINE = {
  en: 'Practice papers for BPSC TRE, Bihar Daroga, BPSC Prelims and UP SI',
  hi: 'बीपीएससी टीआरई, बिहार दरोगा, बीपीएससी प्रारंभिक और यूपी एसआई के अभ्यास प्रश्नपत्र',
};
export const DESCRIPTION =
  'Practice mode, timed mock tests and exam-style question papers in Hindi and English for BPSC TRE, Bihar Daroga (BPSSC SI), BPSC Prelims and UP SI.';

/**
 * Where the "Get the Pass" button sends buyers: a payment page (Razorpay,
 * Cosmofeed…) or a WhatsApp chat. Unset = the button says payments open soon.
 */
export const CHECKOUT_URL: string | undefined = import.meta.env.PUBLIC_CHECKOUT_URL || undefined;
