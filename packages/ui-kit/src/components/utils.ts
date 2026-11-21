import { useEffect, useId, useRef } from 'react';

/** Join class names, dropping falsy entries. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Focusable descendants of `root` in DOM order. */
export function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.getAttribute('aria-hidden') !== 'true',
  );
}

/** Stable ids for a labelled form control plus its description and error. */
export function useFieldIds(providedId?: string) {
  const generatedId = useId();
  const fieldId = providedId ?? generatedId;
  return {
    fieldId,
    descriptionId: `${fieldId}-description`,
    errorId: `${fieldId}-error`,
  };
}

/** Build an `aria-describedby` value from optional description/error ids. */
export function describedBy(
  descriptionId: string | undefined,
  errorId: string | undefined,
): string | undefined {
  const ids = [descriptionId, errorId].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

type DialogInitialFocus = 'container' | 'first';

/**
 * Dialog focus management: moves focus in on open, traps Tab, closes on
 * Escape, restores focus to the previously focused element on close, and
 * stops the page behind the dialog from scrolling.
 *
 * `initialFocusSelector` wins over `initialFocus` when it matches a
 * descendant, which lets a dialog put focus on a specific control (for
 * example Cancel on a destructive confirmation).
 */
export function useDialogFocus(
  open: boolean,
  onClose: () => void,
  initialFocus: DialogInitialFocus = 'first',
  initialFocusSelector?: string,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const preferred = initialFocusSelector
      ? container?.querySelector<HTMLElement>(initialFocusSelector)
      : null;
    const target =
      preferred ??
      (initialFocus === 'first' ? (getFocusable(container)[0] ?? container) : container);
    target?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !container) return;
      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open, initialFocus, initialFocusSelector]);

  return containerRef;
}

/** Close glyph used by dismiss controls without importing an icon package. */
export function closeGlyph() {
  return '\u00d7';
}
