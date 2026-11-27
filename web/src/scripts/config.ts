// Build-time settings handed to client scripts by Base.astro (#pq-config).
export interface ClientConfig {
  base: string;
  whatsapp: string;
  /** "<exam>:<tier>" and "bundle:<id>" → { href, live } */
  buy: Record<string, { href: string; live: boolean }>;
  prices: Record<string, number>;
  exams: Record<string, { en: string; hi: string }>;
}

let cached: ClientConfig | null = null;

export function config(): ClientConfig {
  if (cached) return cached;
  try {
    cached = JSON.parse(document.getElementById('pq-config')?.textContent || '') as ClientConfig;
  } catch {
    cached = { base: '', whatsapp: '', buy: {}, prices: {}, exams: {} };
  }
  return cached;
}

export function whatsappLink(text?: string): string | null {
  const n = config().whatsapp;
  return n ? `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}` : null;
}
