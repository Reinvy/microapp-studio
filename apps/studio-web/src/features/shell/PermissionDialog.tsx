'use client';

/**
 * Global consent dialog.
 *
 * One at a time, clay sheet semantics, default focus on **Tolak** and `Esc`
 * denies (DESIGN-CLAY §12, SEC-003). The dialog is purely presentational: the
 * host provider writes the grant and the audit entry after this resolves.
 */

import { useEffect, useId, useRef, type ReactElement } from 'react';
import { Button } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { permissionDefinition, riskLabel } from '@/features/permissions/catalog';

export function PermissionDialog(): ReactElement | null {
  const host = useHost();
  const pending = host.pendingPermission;
  const titleId = useId();
  const bodyId = useId();
  const denyRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pending) return;
    denyRef.current?.focus();
  }, [pending]);

  useEffect(() => {
    if (!pending) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        void host.resolvePermission('denied');
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [host, pending]);

  if (!pending) return null;

  const definition = permissionDefinition(pending.request.permissionId, host.locale);

  return (
    <div className="mads-modal-overlay" role="presentation">
      <div
        className="mads-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        ref={dialogRef}
      >
        <header className="mads-modal__header">
          <h2 className="mads-modal__title" id={titleId}>
            {host.t('consent.dialogLabel')}
          </h2>
        </header>
        <div className="mads-modal__body">
          <p id={bodyId}>
            {host.t('consent.body', { app: pending.appName, permission: definition.label })}
          </p>
          <p className="mads-alert__content">
            <strong>{definition.label}</strong> — {definition.reason || pending.request.reason || ''}
          </p>
          <p>{riskLabel(definition.risk, host.locale)}</p>
          {pending.request.permissionId === 'storage.app' ? <p>{host.t('consent.storageAlways')}</p> : null}
        </div>
        <footer className="mads-modal__footer">
          <Button ref={denyRef} variant="secondary" onClick={() => void host.resolvePermission('denied')}>
            {host.t('consent.deny')}
          </Button>
          <Button variant="secondary" onClick={() => void host.resolvePermission('once')}>
            {host.t('consent.allowOnce')}
          </Button>
          <Button onClick={() => void host.resolvePermission('always')}>{host.t('consent.allowAlways')}</Button>
        </footer>
      </div>
    </div>
  );
}
