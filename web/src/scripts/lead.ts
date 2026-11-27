// "Full solutions and the next set on WhatsApp" + the ₹249 buy button, shown
// after a free set. POST /api/leads with source "landing".
import { api, ApiError } from './api.ts';
import { config } from './config.ts';
import { bi, esc, tr } from './paper.ts';
import { track, wireBuyButtons } from './track.ts';

/** Indian mobile: 10 digits starting 6–9, optional +91 / 0 prefix. Returns the 10 digits or null. */
export function normalisePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

export function leadHtml(exam: string, idSuffix = 'r'): string {
  const c = config();
  const examName = c.exams[exam] ?? { en: exam, hi: exam };
  const link = c.buy[`${exam}:probable`];
  const price = c.prices.probable ?? 249;
  const id = (s: string) => `lead-${s}-${idSuffix}`;
  return `<section class="next-step" aria-labelledby="${id('h')}">
    <div class="panel lead-card">
      <h3 id="${id('h')}">${bi(tr('Get full solutions and the next set on WhatsApp', 'पूरे हल और अगला सेट व्हाट्सऐप पर पाएं'))}</h3>
      <p class="muted">${bi(tr('Free. One practice set and a few tips a week. Stop any time by replying STOP.', 'मुफ़्त। हफ़्ते में एक अभ्यास सेट और कुछ सुझाव। STOP लिखकर कभी भी बंद करें।'))}</p>
      <form class="form" data-lead novalidate>
        <label class="field"><span>${bi(tr('WhatsApp number', 'व्हाट्सऐप नंबर'))}</span>
          <span class="phone-in"><span class="cc" aria-hidden="true">+91</span><input name="phone" id="${id('p')}" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="14" required placeholder="98765 43210" aria-describedby="${id('e')}" /></span>
        </label>
        <label class="field"><span>${bi(tr('Name (optional)', 'नाम (वैकल्पिक)'))}</span><input name="name" type="text" autocomplete="name" maxlength="60" /></label>
        <label class="check"><input type="checkbox" name="consent" required /> <span>${bi(tr('I agree to receive messages from Prashnottar on WhatsApp about my exam. I can opt out any time.', 'मैं अपनी परीक्षा के बारे में प्रश्नोत्तर से व्हाट्सऐप पर संदेश पाने के लिए सहमत हूं। मैं कभी भी बंद कर सकता/सकती हूं।'))}</span></label>
        <p class="form-err" id="${id('e')}" role="alert" hidden></p>
        <button class="btn btn-primary btn-block" type="submit">${bi(tr('Send it on WhatsApp', 'व्हाट्सऐप पर भेजें'))}</button>
      </form>
      <div class="lead-done" data-lead-done hidden role="status"><p><strong>${bi(tr('Done. We will message you on WhatsApp shortly.', 'हो गया। हम जल्द ही आपको व्हाट्सऐप पर संदेश भेजेंगे।'))}</strong></p></div>
    </div>
    <div class="panel buy-card">
      <p class="eyebrow">${bi(examName)}</p>
      <h3>${bi(tr('Most-probable set', 'संभावित प्रश्न सेट'))} <span class="price">₹${price}</span></h3>
      <p class="muted">${bi(tr('The questions most likely to come, picked from past-paper trends, with full solutions.', 'पिछले प्रश्नपत्रों के रुझान से चुने गए सबसे संभावित प्रश्न, पूरे हल के साथ।'))}</p>
      ${link ? `<a class="btn btn-block" href="${esc(link.href)}" data-buy="probable" data-exam="${esc(exam)}" data-price="${price}" ${link.live ? 'rel="noopener"' : ''}>${bi(tr(`Buy for ₹${price}`, `₹${price} में खरीदें`))}</a>` : ''}
      <p class="muted small">${bi(tr('One-time payment. 7-day refund policy.', 'एक बार भुगतान। 7 दिन की रिफ़ंड नीति।'))}</p>
    </div>
  </section>`;
}

export function wireLead(root: HTMLElement, ctx: { exam: string; score?: number; total?: number }) {
  wireBuyButtons(root);
  const form = root.querySelector<HTMLFormElement>('[data-lead]');
  if (!form) return;
  const err = form.querySelector<HTMLElement>('.form-err')!;
  const show = (m: { en: string; hi: string } | null) => {
    err.hidden = !m;
    err.innerHTML = m ? bi(m) : '';
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const phone = normalisePhone(String(fd.get('phone') ?? ''));
    const phoneEl = form.querySelector<HTMLInputElement>('[name=phone]')!;
    phoneEl.setAttribute('aria-invalid', String(!phone));
    if (!phone) return show(tr('Enter a valid 10-digit Indian mobile number.', 'सही 10 अंकों का भारतीय मोबाइल नंबर लिखें।'));
    if (!fd.get('consent')) return show(tr('Please tick the consent box so we can message you.', 'संदेश भेजने के लिए कृपया सहमति वाले बॉक्स पर टिक करें।'));
    show(null);
    const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    btn.disabled = true;
    const name = String(fd.get('name') ?? '').trim();
    try {
      await api('/api/leads', {
        body: { phone, ...(name ? { name } : {}), exam: ctx.exam, score: ctx.score, total: ctx.total, source: 'landing', consent: true },
      });
      track('Lead', { content_category: ctx.exam });
      form.hidden = true;
      root.querySelector<HTMLElement>('[data-lead-done]')!.hidden = false;
    } catch (e) {
      btn.disabled = false;
      show(
        e instanceof ApiError && e.status === 0
          ? tr('Could not reach the server. Check your connection and try again.', 'सर्वर से संपर्क नहीं हो सका। इंटरनेट जांचकर फिर कोशिश करें।')
          : tr('Something went wrong. Please try again.', 'कुछ गड़बड़ हुई। कृपया फिर कोशिश करें।'),
      );
    }
  });
}
