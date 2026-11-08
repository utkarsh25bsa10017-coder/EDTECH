// UI language + theme toggles. The inline bootstrap in Base.astro applies the
// stored choice before first paint; this wires up the buttons afterwards.
export type Ui = 'en' | 'hi';

const root = document.documentElement;

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode): the choice lasts for this page only */
  }
}

export function currentUi(): Ui {
  return root.dataset.ui === 'hi' ? 'hi' : 'en';
}

/** Attributes can't hold two languages, so they are swapped from data-*-en / data-*-hi. */
function applyAttributes(ui: Ui) {
  for (const [attr, key] of [
    ['placeholder', 'ph'],
    ['aria-label', 'label'],
    ['title', 'tip'],
  ] as const) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-${key}-en]`)) {
      const value = el.getAttribute(`data-${key}-${ui}`) ?? el.getAttribute(`data-${key}-en`);
      if (value !== null) el.setAttribute(attr, value);
    }
  }
}

export function setUi(ui: Ui) {
  if (ui === 'hi') root.dataset.ui = 'hi';
  else delete root.dataset.ui;
  applyAttributes(ui);
  document.dispatchEvent(new CustomEvent<Ui>('pq:ui', { detail: ui }));
}

function effectiveTheme(): 'light' | 'dark' {
  const set = root.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function initPrefs() {
  applyAttributes(currentUi());

  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-lang-toggle]')) {
    btn.addEventListener('click', () => {
      const next: Ui = currentUi() === 'hi' ? 'en' : 'hi';
      save('pq-ui', next);
      setUi(next);
    });
  }

  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')) {
    btn.addEventListener('click', () => {
      const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      save('pq-theme', next);
    });
  }
}
