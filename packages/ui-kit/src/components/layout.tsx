import {
  forwardRef,
  useId,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { closeGlyph, cx, getFocusable, useDialogFocus } from './utils';

/* ---------- AppShell (MADS-LAY-01) ---------- */

export type ShellVariant = 'desktop' | 'rail' | 'mobile';

export interface AppShellProps {
  /** Slot rendered as the desktop (264 px) sidebar. */
  sidebar?: ReactNode;
  /** Slot rendered as the tablet (80 px) rail. */
  rail?: ReactNode;
  /** Slot rendered as the mobile dock. */
  dock?: ReactNode;
  header?: ReactNode;
  children: ReactNode;
  variant?: ShellVariant;
  mainId?: string;
  mainLabel?: string;
  skipLabel?: string;
  className?: string;
}

/**
 * Root application frame. It owns the single `<main>` landmark, the skip link
 * (always the first focusable child) and exactly one navigation slot chosen by
 * `variant`: sidebar on desktop, rail on tablet, dock on mobile. Pages must not
 * render their own `<main>`.
 */
export function AppShell({
  sidebar,
  rail,
  dock,
  header,
  children,
  variant = 'desktop',
  mainId = 'mads-main',
  mainLabel,
  skipLabel = 'Lewati ke konten',
  className,
}: AppShellProps) {
  return (
    <div className={cx('mads-app-shell', `mads-app-shell--${variant}`, className)}>
      <a className="mads-skip-link" href={`#${mainId}`}>
        {skipLabel}
      </a>
      {header ? (
        <header className="mads-app-shell__header" role="banner">
          {header}
        </header>
      ) : null}
      <div className="mads-app-shell__body">
        {variant === 'desktop' && sidebar ? (
          <div className="mads-app-shell__sidebar">{sidebar}</div>
        ) : null}
        {variant === 'rail' && rail ? <div className="mads-app-shell__rail">{rail}</div> : null}
        <main
          className="mads-app-shell__main"
          id={mainId}
          role="main"
          aria-label={mainLabel}
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
      {variant === 'mobile' && dock ? (
        <div className="mads-app-shell__dock">{dock}</div>
      ) : null}
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
  /** CSS selector for the element that receives focus on open. */
  initialFocusSelector?: string;
  className?: string;
}

/**
 * Side panel (MADS-LAY-06). Same focus contract as `Modal`: focus enters the
 * panel, Tab cycles inside, Escape closes, the page behind cannot scroll, and
 * focus returns to the trigger on close.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
  side = 'right',
  initialFocusSelector,
  className,
}: SheetProps) {
  const dialogRef = useDialogFocus(open, onClose, 'first', initialFocusSelector);
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
