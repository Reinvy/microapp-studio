import { useId, type ReactNode } from 'react';
import { Sheet } from './layout';
import { PermissionBadge, type PermissionState } from './status';
import { cx } from './utils';

export interface ShareSummaryRow {
  label: string;
  value: string;
}

export interface SharePermission {
  id: string;
  label: string;
  granted: PermissionState;
  reason?: string;
}

export interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  summary: ShareSummaryRow[];
  permissions: SharePermission[];
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  /** Show the "copy index link" button; disabled while no source exists. */
  copyLink?: boolean;
  copyLinkDisabledReason?: string;
  copyLinkLabel?: string;
  onCopyLink?: () => void;
  className?: string;
}

/**
 * Presentational share panel: manifest facts, permissions and actions.
 * Packaging, signing, copying and downloading all stay in the caller.
 */
export function ShareSheet({
  open,
  onClose,
  title = 'Bagikan aplikasi',
  summary,
  permissions,
  primaryAction,
  secondaryAction,
  copyLink = false,
  copyLinkDisabledReason,
  copyLinkLabel = 'Salin link index',
  onCopyLink,
  className,
}: ShareSheetProps) {
  const copyDisabled = Boolean(copyLinkDisabledReason);
  const copyReasonId = useId();
  return (
    <Sheet
      open={open}
      title={title}
      onClose={onClose}
      side="right"
      className={cx('mads-share-sheet', className)}
      footer={
        <>
          {secondaryAction}
          {primaryAction}
        </>
      }
    >
      <dl className="mads-share-sheet__summary">
        {summary.map((row) => (
          <div className="mads-share-sheet__row" key={row.label}>
            <dt className="mads-share-sheet__term">{row.label}</dt>
            <dd className="mads-share-sheet__value">{row.value}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mads-share-sheet__heading">Izin yang diminta</h3>
      {permissions.length === 0 ? (
        <p className="mads-share-sheet__empty">Tidak ada izin tambahan.</p>
      ) : (
        <ul className="mads-share-sheet__permissions">
          {permissions.map((permission) => (
            <li key={permission.id}>
              <PermissionBadge
                permission={permission.id}
                granted={permission.granted}
                label={permission.label}
                reason={permission.reason}
              />
            </li>
          ))}
        </ul>
      )}
      {copyLink ? (
        <div className="mads-share-sheet__copy">
          <button
            type="button"
            className="mads-button mads-button--secondary mads-button--md"
            disabled={copyDisabled}
            title={copyDisabled ? copyLinkDisabledReason : undefined}
            aria-describedby={copyDisabled ? copyReasonId : undefined}
            onClick={onCopyLink}
          >
            <span className="mads-button__label">{copyLinkLabel}</span>
          </button>
          {copyDisabled ? (
            <p className="mads-share-sheet__copy-reason" id={copyReasonId}>
              {copyLinkDisabledReason}
            </p>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}
