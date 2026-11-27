// Guidance chatbot: floating "Ask" button + panel, POST /api/chat.
import { api, ApiError } from './api.ts';
import { whatsappLink } from './config.ts';
import { currentUi } from './prefs.ts';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const KEY = 'pq-chat';

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Plain text with line breaks and bare links; nothing else is trusted. */
function render(s: string) {
  return esc(s)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br>');
}

export function initChat() {
  const wrap = document.querySelector<HTMLElement>('[data-chat]');
  if (!wrap) return;
  const openBtn = wrap.querySelector<HTMLButtonElement>('[data-chat-open]')!;
  const panel = wrap.querySelector<HTMLElement>('[data-chat-panel]')!;
  const closeBtn = wrap.querySelector<HTMLButtonElement>('[data-chat-close]')!;
  const log = wrap.querySelector<HTMLElement>('[data-chat-log]')!;
  const form = wrap.querySelector<HTMLFormElement>('[data-chat-form]')!;
  const input = form.querySelector<HTMLTextAreaElement>('textarea')!;
  const send = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const chips = wrap.querySelector<HTMLElement>('[data-chat-chips]')!;
  const exam = document.body.dataset.exam || undefined;

  let msgs: Msg[] = [];
  try {
    msgs = JSON.parse(sessionStorage.getItem(KEY) || '[]');
  } catch {
    msgs = [];
  }
  const persist = () => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30)));
    } catch {
      /* ignore */
    }
  };

  const bubble = (m: Msg | { role: 'note'; content: string }, html = false) => {
    const el = document.createElement('div');
    el.className = `msg msg-${m.role}`;
    el.innerHTML = html ? m.content : render(m.content);
    log.append(el);
    log.scrollTop = log.scrollHeight;
    return el;
  };

  const redraw = () => {
    log.querySelectorAll('.msg:not(.msg-hello)').forEach((n) => n.remove());
    for (const m of msgs) bubble(m);
    chips.hidden = msgs.length > 0;
  };
  redraw();

  const open = () => {
    panel.hidden = false;
    openBtn.setAttribute('aria-expanded', 'true');
    wrap.classList.add('is-open');
    input.focus();
  };
  const close = () => {
    panel.hidden = true;
    openBtn.setAttribute('aria-expanded', 'false');
    wrap.classList.remove('is-open');
    openBtn.focus();
  };
  openBtn.addEventListener('click', () => (panel.hidden ? open() : close()));
  closeBtn.addEventListener('click', close);
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  async function ask(text: string) {
    text = text.trim().slice(0, 1000);
    if (!text) return;
    msgs.push({ role: 'user', content: text });
    persist();
    bubble(msgs[msgs.length - 1]);
    chips.hidden = true;
    input.value = '';
    send.disabled = true;
    const wait = bubble({ role: 'note', content: currentUi() === 'hi' ? 'लिख रहे हैं…' : 'Typing…' });
    try {
      const res = await api<{ reply: string }>('/api/chat', { body: { messages: msgs.slice(-12), exam, lang: currentUi() }, timeout: 70000 });
      wait.remove();
      const reply = (res && typeof res.reply === 'string' && res.reply) || '…';
      msgs.push({ role: 'assistant', content: reply });
      persist();
      bubble(msgs[msgs.length - 1]);
    } catch (e) {
      wait.remove();
      msgs.pop();
      persist();
      const hi = currentUi() === 'hi';
      const wa = whatsappLink(hi ? 'नमस्ते, मुझे परीक्षा की तैयारी में मदद चाहिए।' : 'Hi, I need help with my exam preparation.');
      const offline = e instanceof ApiError && e.status === 0;
      const base = offline
        ? hi
          ? 'अभी सहायक से संपर्क नहीं हो पा रहा है। थोड़ी देर बाद फिर कोशिश करें।'
          : 'The assistant is not reachable right now. Please try again in a little while.'
        : hi
          ? 'माफ़ कीजिए, अभी जवाब नहीं दे पाए। थोड़ी देर बाद फिर पूछें।'
          : 'Sorry, we could not answer just now. Please ask again in a little while.';
      bubble({ role: 'note', content: esc(base) + (wa ? ` <a href="${wa}" target="_blank" rel="noopener">${hi ? 'व्हाट्सऐप पर बात करें' : 'Talk to us on WhatsApp'}</a>` : '') }, true);
      input.value = text;
    } finally {
      send.disabled = false;
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void ask(input.value);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void ask(input.value);
    }
  });
  chips.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b) return;
    const hi = currentUi() === 'hi';
    void ask((hi ? b.dataset.qHi : b.dataset.qEn) || b.textContent || '');
  });
}
