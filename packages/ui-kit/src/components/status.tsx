import type { ReactNode } from 'react';
import { Button } from './input';
import { Glyph, type GlyphName } from './icons';
import { Alert } from './feedback';
import { cx } from './utils';

/* ---------- PermissionBadge (MADS-DATA-22) ---------- */

export type PermissionState = 'granted' | 'denied' | 'once' | 'declared';

const PERMISSION_STATE: Record<PermissionState, { glyph: GlyphName; label: string }> = {
  granted: { glyph: 'success', label: 'Diizinkan' },
  denied: { glyph: 'error', label: 'Ditolak' },
  once: { glyph: 'clock', label: 'Sekali ini' },
  declared: { glyph: 'info', label: 'Dideklarasikan' },
};

export interface PermissionBadgeProps {
  /** Permission id, for example `storage.app`. */
  permission: string;
  granted: PermissionState;
  /** Human label from the permission catalog. */
  label: string;
  /** Why the app needs it; exposed as the native tooltip. */
  reason?: string;
  className?: string;
}

/**
 * Permission state as icon + text + colour. The label is always rendered, so
 * the state never depends on colour perception.
 */
export function PermissionBadge({
  permission,
  granted,
  label,
  reason,
  className,
}: PermissionBadgeProps) {
  const meta = PERMISSION_STATE[granted];
  return (
    <span
      className={cx('mads-permission-badge', `mads-permission-badge--${granted}`, className)}
      data-permission={permission}
      title={reason}
    >
      <Glyph name={meta.glyph} />
      <span className="mads-permission-badge__label">{label}</span>
      <span className="mads-visually-hidden"> — {meta.label}</span>
    </span>
  );
}

/* ---------- StorageMeter (MADS-DATA-23) ---------- */

export type StorageMeterTone = 'ok' | 'warning' | 'critical';

function formatBytes(bytes: number, locale: string): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
  return `${formatted} ${units[unit]}`;
}

export interface StorageMeterProps {
  label: string;
  used: number;
  quota: number;
  locale?: string;
  className?: string;
}

/**
 * Storage bar as a real `role="meter"`. Tone flips to warning above 80% and
 * critical above 95%; the percentage text repeats the state for everyone.
 */
export function StorageMeter({ label, used, quota, locale = 'id-ID', className }: StorageMeterProps) {
  const safeQuota = quota > 0 ? quota : 0;
  const percent = safeQuota === 0 ? 0 : Math.min(100, (used / safeQuota) * 100);
  const tone: StorageMeterTone = percent > 95 ? 'critical' : percent > 80 ? 'warning' : 'ok';
  const percentLabel = `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(percent)}%`;
  const valueText = `${formatBytes(used, locale)} ${new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(percent / 100)} dari ${formatBytes(safeQuota, locale)}`;

  return (
    <div className={cx('mads-storage-meter', `mads-storage-meter--${tone}`, className)}>
      <div className="mads-storage-meter__header">
        <span className="mads-storage-meter__label">{label}</span>
        <span className="mads-storage-meter__value">{percentLabel}</span>
      </div>
      <div
        className="mads-storage-meter__track"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeQuota}
        aria-valuenow={Math.round(used)}
        aria-valuetext={valueText}
      >
        <span
          className="mads-storage-meter__fill"
          aria-hidden="true"
          style={{ inlineSize: `${percent}%` }}
        />
      </div>
      <p className="mads-storage-meter__detail">
        {formatBytes(used, locale)} / {formatBytes(safeQuota, locale)}
      </p>
    </div>
  );
}

/* ---------- AIStatus (MADS-FBK-09) ---------- */

export type AIStatusState = 'idle' | 'thinking' | 'error' | 'ok';

const AI_STATE: Record<AIStatusState, { label: string; glyph: GlyphName }> = {
  idle: { label: 'Siap', glyph: 'sparkle' },
  thinking: { label: 'Memproses…', glyph: 'clock' },
  error: { label: 'Gagal', glyph: 'error' },
  ok: { label: 'Selesai', glyph: 'success' },
};

export interface AIStatusProps {
  state: AIStatusState;
  /** Overrides the default state copy. */
  label?: string;
  className?: string;
}

export function AIStatus({ state, label, className }: AIStatusProps) {
  const meta = AI_STATE[state];
  return (
    <p
      className={cx('mads-ai-status', `mads-ai-status--${state}`, className)}
      aria-live="polite"
      data-state={state}
    >
      <Glyph name={meta.glyph} />
      <span>{label ?? meta.label}</span>
    </p>
  );
}

/* ---------- AIError (MADS-FBK-10) ---------- */

export interface AIErrorProps {
  code: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function AIError({
  code,
  message,
  onRetry,
  retryLabel = 'Coba lagi',
  className,
}: AIErrorProps) {
  return (
    <Alert
      tone="danger"
      title={code}
      className={cx('mads-ai-error', className)}
      actions={
        onRetry ? (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : undefined
      }
    >
      {message}
    </Alert>
  );
}

/* ---------- SuggestionChip (MADS-INP-14) ---------- */

export interface SuggestionChipProps {
  children: ReactNode;
  pressed?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function SuggestionChip({
  children,
  pressed = false,
  onClick,
  disabled,
  className,
}: SuggestionChipProps) {
  return (
    <button
      type="button"
      className={cx('mads-suggestion-chip', className)}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
