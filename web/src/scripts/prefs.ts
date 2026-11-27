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
  root.lang = ui === 'hi' ? 'hi' : 'en';
  applyAttributes(ui);
  document.dispatchEvent(new CustomEvent<Ui>('pq:ui', { detail: ui }));
}

function effectiveTheme(): 'light' | 'dark' {
  const set = root.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Wires toggles inside `scope` (default: the whole page). Safe to call again for new content. */
export function initPrefs(scope: ParentNode = document) {
  applyAttributes(currentUi());
  root.lang = currentUi() === 'hi' ? 'hi' : 'en';

  for (const btn of scope.querySelectorAll<HTMLButtonElement>('[data-lang-toggle]:not([data-wired])')) {
    btn.dataset.wired = '1';
    btn.setAttribute('aria-label', 'Switch language / भाषा बदलें');
    btn.addEventListener('click', () => {
      const next: Ui = currentUi() === 'hi' ? 'en' : 'hi';
      save('pq-ui', next);
      setUi(next);
    });
  }

  for (const btn of scope.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]:not([data-wired])')) {
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      save('pq-theme', next);
    });
  }
}
