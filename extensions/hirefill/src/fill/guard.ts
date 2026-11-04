/**
 * HireFill never submits an application. Every click the filler makes goes
 * through safeClick, which refuses anything that looks like submit/apply/send.
 */
const BLOCK = /\b(submit|apply|send|finish|complete application|review and submit|confirm|absenden|bewerben|senden)\b/i;

export class SubmitBlocked extends Error {}

export function isSubmitLike(el: Element): boolean {
  const b = el as HTMLButtonElement;
  // A <button> inside a <form> with no type IS a submit button (b.type reports "submit").
  if ((b.tagName === 'BUTTON' || b.tagName === 'INPUT') && b.type === 'submit' && (b.form || el.closest('form'))) return true;
  if (b.tagName === 'INPUT' && (el as HTMLInputElement).type === 'image') return true;
  const text = `${el.textContent ?? ''} ${(el as HTMLInputElement).value ?? ''} ${el.getAttribute('aria-label') ?? ''}`;
  if (BLOCK.test(text)) return true;
  return /bottom-navigation-next-button|pageFooterNextButton|submit/i.test(el.getAttribute('data-automation-id') ?? '');
}

export function safeClick(el: Element): void {
  if (isSubmitLike(el)) throw new SubmitBlocked(`HireFill refused to click "${(el.textContent ?? '').trim().slice(0, 40)}"`);
  (el as HTMLElement).click();
}
