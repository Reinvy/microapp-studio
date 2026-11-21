'use client';

/**
 * First-run welcome overlay (SCR-01).
 *
 * It sits over Home but never blocks it: `aria-modal="false"`, no focus trap,
 * `Tab` can leave it, and Home behind stays clickable. Focus starts on the first
 * create action and returns to the **Buat** trigger when dismissed.
 */

import { useEffect, useId, useRef, type ReactElement } from 'react';
import { Button } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';

export interface WelcomeOverlayProps {
  onTemplate: () => void;
  onMagic: () => void;
  onBlank: () => void;
  disabled?: boolean;
}

export function WelcomeOverlay({ onTemplate, onMagic, onBlank, disabled }: WelcomeOverlayProps): ReactElement | null {
  const host = useHost();
  const titleId = useId();
  const bodyId = useId();
  const firstRef = useRef<HTMLButtonElement>(null);
  const visible = !host.prefs.welcomeDismissed;
  const blocked = disabled || !host.ready;

  useEffect(() => {
    if (visible) firstRef.current?.focus();
  }, [visible]);

  if (!visible) return null;

  const dismiss = (): void => {
    host.setPrefs({ welcomeDismissed: true });
  };

  return (
    <div className="mads-card" role="dialog" aria-modal="false" aria-labelledby={titleId} aria-describedby={bodyId}>
      <h2 id={titleId}>{host.t('welcome.title')}</h2>
      <p id={bodyId}>{host.t('welcome.body')}</p>
      <div className="mads-cluster">
        <Button ref={firstRef} onClick={() => { dismiss(); onTemplate(); }} disabled={blocked}>
          {host.t('welcome.createTemplate')}
        </Button>
        <Button variant="secondary" onClick={() => { dismiss(); onMagic(); }} disabled={blocked}>
          {host.t('welcome.createMagic')}
        </Button>
        <Button variant="secondary" onClick={() => { dismiss(); onBlank(); }} disabled={blocked}>
          {host.t('welcome.createBlank')}
        </Button>
        <Button variant="ghost" onClick={dismiss}>
          {host.t('welcome.skip')}
        </Button>
      </div>
    </div>
  );
}
