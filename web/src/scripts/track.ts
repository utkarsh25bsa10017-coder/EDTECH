// Meta Pixel events. The pixel only loads when PUBLIC_META_PIXEL_ID is set
// (see components/Pixel.astro); otherwise these calls do nothing.
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function track(event: 'ViewContent' | 'Lead' | 'InitiateCheckout', params: Record<string, unknown> = {}) {
  try {
    window.fbq?.('track', event, params);
  } catch {
    /* blocked by an extension: ignore */
  }
}

/** Every element with data-buy fires InitiateCheckout when clicked. */
export function wireBuyButtons(root: ParentNode = document) {
  for (const el of root.querySelectorAll<HTMLElement>('[data-buy]:not([data-buy-wired])')) {
    el.dataset.buyWired = '1';
    el.addEventListener('click', () => {
      track('InitiateCheckout', {
        content_name: el.dataset.buy,
        content_category: el.dataset.exam,
        value: Number(el.dataset.price) || undefined,
        currency: 'INR',
      });
    });
  }
}
