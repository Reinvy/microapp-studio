import { useId, type ReactNode } from 'react';
import { IconButton } from './input';
import { closeGlyph, cx, useDialogFocus } from './utils';

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** CSS selector for the element that receives focus on open. */
  initialFocusSelector?: string;
  className?: string;
}

/**
 * Blocking dialog (MADS-LAY-08). Focus moves into the dialog on open, Tab is
 * trapped, Escape closes, the page behind cannot scroll, and focus returns to
 * the trigger afterwards. The title is the accessible name; `aria-modal` is
 * always true, so the consumer never has to patch it.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
  initialFocusSelector,
  className,
}: ModalProps) {
  const dialogRef = useDialogFocus(open, onClose, 'first', initialFocusSelector);
  const titleId = useId();
  if (!open) return null;
  return (
    <div className="mads-modal-overlay">
      <div
        ref={dialogRef}
        className={cx('mads-modal', `mads-modal--${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="mads-modal__header">
          <h2 className="mads-modal__title" id={titleId}>
            {title}
          </h2>
          <IconButton icon={closeGlyph()} label="Tutup dialog" onClick={onClose} variant="ghost" />
        </div>
        <div className="mads-modal__body">{children}</div>
        {footer ? <div className="mads-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
