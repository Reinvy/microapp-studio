import type { ReactNode } from 'react';
import { closeGlyph, cx } from './utils';

/* ---------- Alert (MADS-FBK-01) ---------- */

export type AlertTone = 'info' | 'success' | 'warning' | 'danger' | 'error';

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  const resolvedTone = tone === 'error' ? 'danger' : tone;
  return (
    <div
      className={cx('mads-alert', `mads-alert--${resolvedTone}`, className)}
      role={resolvedTone === 'danger' ? 'alert' : 'status'}
    >
      <span className="mads-alert__marker" aria-hidden="true" />
      <div className="mads-alert__content">
        {title ? <span className="mads-alert__title">{title}</span> : null}
        <span>{children}</span>
      </div>
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
