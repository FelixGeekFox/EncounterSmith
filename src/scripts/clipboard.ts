/**
 * Copy helper with an honest failure path.
 *
 * The async Clipboard API is unavailable on insecure origins and in a handful
 * of older browsers, so there is a legacy fallback. If both refuse, the caller
 * is told, rather than being shown a success message that never happened.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (text.length === 0) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or insecure context: try the legacy route.
    }
  }

  if (typeof document === 'undefined') return false;

  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.setAttribute('aria-hidden', 'true');
  field.style.position = 'fixed';
  field.style.top = '-1000px';
  field.style.opacity = '0';
  document.body.appendChild(field);

  try {
    field.select();
    field.setSelectionRange(0, field.value.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

export const COPY_FAILED_MESSAGE =
  'Copy was blocked by your browser. Select the result and copy it by hand instead.';
