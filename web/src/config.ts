export const SITE_NAME = 'Prashnottar';
export const SITE_NAME_HI = 'प्रश्नोत्तर';
export const TAGLINE = {
  en: 'Practice papers and mock tests for teacher and state service exams',
  hi: 'शिक्षक एवं राज्य सेवा परीक्षाओं के अभ्यास प्रश्नपत्र और मॉक टेस्ट',
};
export const DESCRIPTION =
  'Free practice questions, timed mock tests and printable papers in Hindi and English for BPSC TRE, BPSC CCE, MPPSC, RAS, Bihar STET, CTET and CG TET. Independent; not affiliated with any commission or board.';

/** API origin. Empty = same origin (the Rust server serves this build). The native app sets a full URL. */
export const API_BASE: string = (import.meta.env.PUBLIC_API_BASE ?? '').replace(/\/+$/, '');
/** WhatsApp number in international format without +, e.g. 919876543210. Empty = link hidden. */
export const WHATSAPP_NUMBER: string = (import.meta.env.PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');
export const META_PIXEL_ID: string = (import.meta.env.PUBLIC_META_PIXEL_ID ?? '').trim();

export function whatsappUrl(text?: string): string | undefined {
  if (!WHATSAPP_NUMBER) return undefined;
  return `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
