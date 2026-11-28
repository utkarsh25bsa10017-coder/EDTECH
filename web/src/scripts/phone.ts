// Phone number inputs: digits only, at most 10. A pasted "+91 98765 43210"
// or "098765 43210" is trimmed to the 10 digits.

/** The 10 digits typed to sign in (any 10 digits, so the admin number works). */
export function loginPhone(raw: string): string | null {
  let d = raw.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^\d{10}$/.test(d) ? d : null;
}

function clean(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 10);
}

export function bindPhoneInput(input: HTMLInputElement) {
  input.addEventListener('input', () => {
    const v = clean(input.value);
    if (v !== input.value) input.value = v;
    input.removeAttribute('aria-invalid');
  });
  input.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    if (!/\d/.test(e.key)) e.preventDefault();
  });
}
