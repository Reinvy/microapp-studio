import {
  forwardRef,
  useId,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { closeGlyph, cx, getFocusable, useDialogFocus } from './utils';

/* ---------- AppShell (MADS-LAY-01) ---------- */

export interface AppShellProps {
  sidebar?: ReactNode;
  header?: ReactNode;
  dock?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Root application frame. The shell renders the `banner` and `main`
 * landmarks and the skip link; navigation landmarks come from the
 * `Sidebar`/`Dock` components passed through the slots.
 */
export function AppShell({ sidebar, header, dock, children, className }: AppShellProps) {
  return (
    <div className={cx('mads-app-shell', className)}>
      <a className="mads-skip-link" href="#mads-main">
        Lewati ke konten utama
      </a>
      <header className="mads-app-shell__header" role="banner">
        {header}
      </header>
      <div className="mads-app-shell__body">
        {sidebar ? <div className="mads-app-shell__sidebar">{sidebar}</div> : null}
        <main className="mads-app-shell__main" id="mads-main" role="main" tabIndex={-1}>
          {children}
        </main>
      </div>
      {dock ? <div className="mads-app-shell__dock">{dock}</div> : null}
    </div>
  );
}

/* ---------- Card (MADS-LAY-05) ---------- */

export interface CardProps {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Card({ title, children, footer, className }: CardProps) {
  const titleId = useId();
  const Wrapper = title ? 'section' : 'div';
  return (
    <Wrapper
      className={cx('mads-card', className)}
      aria-labelledby={title ? titleId : undefined}
    >
      {title ? (
        <h2 className="mads-card__title" id={titleId}>
          {title}
        </h2>
      ) : null}
      <div className="mads-card__body">{children}</div>
      {footer ? <div className="mads-card__footer">{footer}</div> : null}
    </Wrapper>
  );
}

/* ---------- Grid (MADS-LAY-03) ---------- */

export type GapSize = 'xs' | 'sm' | 'md' | 'lg';

export interface GridProps {
  columns?: number;
  gap?: GapSize;
  children: ReactNode;
  className?: string;
}

export function Grid({ columns = 1, gap = 'md', children, className }: GridProps) {
  const safeColumns = Math.min(12, Math.max(1, Math.round(columns)));
  return (
    <div className={cx('mads-grid', `mads-grid--cols-${safeColumns}`, `mads-grid--gap-${gap}`, className)}>
      {children}
    </div>
  );
}

/* ---------- Stack (MADS-LAY-02) ---------- */

export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';

export interface StackProps {
  direction?: 'row' | 'column';
  gap?: GapSize;
  align?: StackAlign;
  children: ReactNode;
  className?: string;
}

export function Stack({ direction = 'column', gap = 'md', align, children, className }: StackProps) {
  return (
    <div
      className={cx(
        'mads-stack',
        `mads-stack--${direction}`,
        `mads-stack--gap-${gap}`,
        align ? `mads-stack--align-${align}` : undefined,
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------- Sheet (MADS-LAY-06) ---------- */

export interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  side?: 'left' | 'right';
  className?: string;
}

export function Sheet({ open, title, onClose, children, footer, side = 'right', className }: SheetProps) {
  const dialogRef = useDialogFocus(open, onClose);
  const titleId = useId();
  if (!open) return null;
  return (
    <div className={cx('mads-sheet-overlay', `mads-sheet-overlay--${side}`)}>
      <div
        ref={dialogRef}
        className={cx('mads-sheet', `mads-sheet--${side}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="mads-sheet__header">
          <h2 className="mads-sheet__title" id={titleId}>
            {title}
          </h2>
          <button
            type="button"
            className="mads-icon-button mads-icon-button--ghost"
            aria-label="Tutup panel"
            onClick={onClose}
          >
            <span aria-hidden="true">{closeGlyph()}</span>
          </button>
        </div>
        <div className="mads-sheet__body">{children}</div>
        {footer ? <div className="mads-sheet__footer">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ---------- Toolbar (MADS-LAY-10) ---------- */

export interface ToolbarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'aria-label'> {
  children: ReactNode;
  label: string;
}

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProps>(function Toolbar(
  { children, label, className, onKeyDown, ...rest },
  ref,
) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const items = getFocusable(event.currentTarget);
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = index < 0 ? 0 : (index + 1) % items.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = index <= 0 ? items.length - 1 : index - 1;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = items.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    items[next]?.focus();
  };

  return (
    <div
      {...rest}
      ref={ref}
      role="toolbar"
      aria-label={label}
      className={cx('mads-toolbar', className)}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
});
