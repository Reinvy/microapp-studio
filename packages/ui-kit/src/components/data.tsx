import type { CSSProperties, ReactNode } from 'react';
import { cx } from './utils';

/* ---------- Badge (MADS-DATA-12) ---------- */

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'error';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  const resolvedTone = tone === 'error' ? 'danger' : tone;
  return (
    <span className={cx('mads-badge', `mads-badge--${resolvedTone}`, className)}>{children}</span>
  );
}

/* ---------- DataTable (MADS-DATA-01) ---------- */

export interface DataTableColumn {
  key: string;
  label: string;
}

export interface DataTableProps {
  columns: DataTableColumn[];
  rows: Record<string, ReactNode>[];
  empty?: ReactNode;
  caption?: string;
  className?: string;
}

export function DataTable({ columns, rows, empty, caption, className }: DataTableProps) {
  return (
    <div className={cx('mads-table-wrap', className)}>
      <table className="mads-table">
        {caption ? <caption className="mads-table__caption">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="mads-table__empty" colSpan={Math.max(1, columns.length)}>
                {empty ?? 'Tidak ada data.'}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column) => (
                  <td key={column.key}>{row[column.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- EmptyState (MADS-DATA-18) ---------- */

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cx('mads-empty-state', className)}>
      <h2 className="mads-empty-state__title">{title}</h2>
      {description ? <p className="mads-empty-state__description">{description}</p> : null}
      {action ? <div className="mads-empty-state__action">{action}</div> : null}
    </div>
  );
}

/* ---------- Image (MADS-MED-01) ---------- */

export interface ImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
}

export function Image({ src, alt, width, height, className }: ImageProps) {
  const style: CSSProperties = {};
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height;
  return (
    <img
      className={cx('mads-image', className)}
      src={src}
      alt={alt}
      style={Object.keys(style).length > 0 ? style : undefined}
      loading="lazy"
      decoding="async"
    />
  );
}

/* ---------- List ---------- */

export interface ListProps {
  items: ReactNode[];
  label: string;
  className?: string;
}

export function List({ items, label, className }: ListProps) {
  return (
    <ul className={cx('mads-list', className)} aria-label={label}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

/* ---------- Progress (MADS-DATA-16) ---------- */

export interface ProgressProps {
  value: number;
  max?: number;
  label: string;
  className?: string;
}

export function Progress({ value, max = 100, label, className }: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  return (
    <div className={cx('mads-progress', className)}>
      <span className="mads-progress__label">{label}</span>
      <progress className="mads-progress__bar" value={clamped} max={safeMax} aria-label={label} />
    </div>
  );
}

/* ---------- Skeleton (MADS-DATA-17) ---------- */

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  label?: string;
  className?: string;
}

export function Skeleton({ width, height, label, className }: SkeletonProps) {
  const style: CSSProperties = {};
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height;
  return (
    <div
      className={cx('mads-skeleton', className)}
      style={Object.keys(style).length > 0 ? style : undefined}
      aria-busy="true"
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

/* ---------- StatCard (MADS-DATA-11) ---------- */

export type StatTone = 'up' | 'down' | 'neutral';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: string;
  tone?: StatTone;
  className?: string;
}

export function StatCard({ label, value, delta, tone, className }: StatCardProps) {
  const direction: StatTone =
    tone ??
    (delta
      ? delta.trim().startsWith('-')
        ? 'down'
        : delta.trim().startsWith('+')
          ? 'up'
          : 'neutral'
      : 'neutral');
  return (
    <div className={cx('mads-stat-card', className)}>
      <span className="mads-stat-card__label">{label}</span>
      <span className="mads-stat-card__value">{value}</span>
      {delta ? (
        <span className={cx('mads-stat-card__delta', `mads-stat-card__delta--${direction}`)}>
          {direction === 'up' ? (
            <span className="mads-visually-hidden">Naik </span>
          ) : direction === 'down' ? (
            <span className="mads-visually-hidden">Turun </span>
          ) : null}
          {delta}
        </span>
      ) : null}
    </div>
  );
}
