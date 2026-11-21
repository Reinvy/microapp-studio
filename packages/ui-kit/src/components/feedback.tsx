import type { ReactNode } from 'react';
import { Glyph, type GlyphName } from './icons';
import { closeGlyph, cx } from './utils';

/* ---------- Alert (MADS-FBK-01) ---------- */

export type AlertTone = 'info' | 'success' | 'warning' | 'danger' | 'error';

type ResolvedTone = Exclude<AlertTone, 'error'>;

const ALERT_META: Record<ResolvedTone, { label: string; glyph: GlyphName }> = {
  info: { label: 'Info', glyph: 'info' },
  success: { label: 'Berhasil', glyph: 'success' },
  warning: { label: 'Peringatan', glyph: 'warning' },
  danger: { label: 'Galat', glyph: 'error' },
};

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  /** Block body: paragraphs, lists, links. */
  children: ReactNode;
  /** Trailing actions row (buttons/links). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Inline status surface. The tone is carried by an icon, a visually hidden
 * tone label and the `*-surface` colour together; colour alone never conveys
 * meaning.
 */
export function Alert({ tone = 'info', title, children, actions, className }: AlertProps) {
  const resolvedTone: ResolvedTone = tone === 'error' ? 'danger' : tone;
  const meta = ALERT_META[resolvedTone];
  return (
    <div
      className={cx('mads-alert', `mads-alert--${resolvedTone}`, className)}
      role={resolvedTone === 'danger' ? 'alert' : 'status'}
    >
      <span className="mads-alert__icon">
        <Glyph name={meta.glyph} />
      </span>
      <span className="mads-visually-hidden">{meta.label}: </span>
      <div className="mads-alert__content">
        {title ? <p className="mads-alert__title">{title}</p> : null}
        <div className="mads-alert__body">{children}</div>
      </div>
      {actions ? <div className="mads-alert__actions">{actions}</div> : null}
    </div>
  );
}

/* ---------- Banner (MADS-FBK-01b) ---------- */

export type BannerTone = 'info' | 'success' | 'warning' | 'error';

export interface BannerProps {
  tone?: BannerTone;
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}

/**
 * Page-level banner. Same semantics as `Alert` plus an optional dismiss
 * control; errors announce themselves (`role="alert"`), everything else is a
 * polite status.
 */
export function Banner({
  tone = 'info',
  title,
  children,
  actions,
  onDismiss,
  dismissLabel = 'Tutup pemberitahuan',
  className,
}: BannerProps) {
  const meta = ALERT_META[tone === 'error' ? 'danger' : tone];
  return (
    <div
      className={cx('mads-banner', `mads-banner--${tone}`, className)}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className="mads-banner__icon">
        <Glyph name={meta.glyph} size={18} />
      </span>
      <span className="mads-visually-hidden">{meta.label}: </span>
      <div className="mads-banner__content">
        {title ? <p className="mads-banner__title">{title}</p> : null}
        <div className="mads-banner__body">{children}</div>
      </div>
      {actions ? <div className="mads-banner__actions">{actions}</div> : null}
      {onDismiss ? (
        <button
          type="button"
          className="mads-banner__dismiss"
          aria-label={dismissLabel}
          onClick={onDismiss}
        >
          <span aria-hidden="true">{closeGlyph()}</span>
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Toast (MADS-FBK-02) ---------- */

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps {
  message: string;
  tone?: ToastTone;
  onDismiss?: () => void;
  className?: string;
}

export function Toast({ message, tone = 'info', onDismiss, className }: ToastProps) {
  return (
    <div className={cx('mads-toast', `mads-toast--${tone}`, className)} role="status" aria-atomic="true">
      <span className="mads-toast__message">{message}</span>
      {onDismiss ? (
        <button
          type="button"
          className="mads-toast__dismiss"
          aria-label="Tutup notifikasi"
          onClick={onDismiss}
        >
          <span aria-hidden="true">{closeGlyph()}</span>
        </button>
      ) : null}
    </div>
  );
}

/* ---------- ErrorSurface ---------- */

export interface ErrorSurfaceProps {
  code: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function ErrorSurface({ code, title, description, actions, className }: ErrorSurfaceProps) {
  return (
    <div className={cx('mads-error-surface', className)} role="alert">
      <p className="mads-error-surface__code">{code}</p>
      <h2 className="mads-error-surface__title">{title}</h2>
      {description ? <p className="mads-error-surface__description">{description}</p> : null}
      {actions ? <div className="mads-error-surface__actions">{actions}</div> : null}
    </div>
  );
}

/* ---------- OfflineBanner (MADS-FBK-08) ---------- */

export interface OfflineBannerProps {
  offline: boolean;
  message?: string;
  className?: string;
}

export function OfflineBanner({
  offline,
  message = 'Anda sedang offline. Perubahan disimpan lokal dan disinkronkan saat koneksi kembali.',
  className,
}: OfflineBannerProps) {
  if (!offline) return null;
  return (
    <div className={cx('mads-offline-banner', className)} role="status">
      {message}
    </div>
  );
}
