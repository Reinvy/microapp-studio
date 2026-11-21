'use client';

/**
 * Recovery sheet.
 *
 * The only place the 24-word phrase is ever displayed. It is opened from Settings
 * ("Amankan data"), the shell banner, or the backup flow; it reads the mnemonic
 * from the encrypted secure store, asks the user to re-type three random indices,
 * and records `recoverySecured`.
 *
 * The words are never logged, never written to preferences, and never rendered
 * until the sheet is open. A wrong confirmation re-asks with fresh indices and
 * does not reveal which word was wrong (`E-AUTH-002`).
 */

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Alert, Badge, Button, Sheet, TextField } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { loadIdentitySecret } from '@/features/identity/secureStore';

export interface RecoverySheetProps {
  open: boolean;
  onClose: () => void;
}

interface Challenge {
  index: number;
}

/** Three distinct indices in 1..24, stable for one sheet session. */
function pickChallenges(seed: () => number): Challenge[] {
  const picked = new Set<number>();
  while (picked.size < 3) picked.add(Math.floor(seed() * 24));
  return [...picked].sort((a, b) => a - b).map((index) => ({ index }));
}

export function RecoverySheet({ open, onClose }: RecoverySheetProps): ReactElement {
  const host = useHost();
  const [words, setWords] = useState<string[] | null>(null);
  const [error, setError] = useState<'E-AUTH-001' | 'E-AUTH-002' | null>(null);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [secured, setSecured] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>(() =>
    pickChallenges(() => Math.random()),
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Every reset happens in the async body: opening the sheet must not cascade
    // four synchronous renders.
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setError(null);
      setSecured(false);
      setAnswers(['', '', '']);
      setChallenges(pickChallenges(() => Math.random()));
      const phrase = await loadIdentitySecret();
      if (cancelled) return;
      if (!phrase) {
        setWords(null);
        setError('E-AUTH-001');
        return;
      }
      setWords(phrase.trim().split(/\s+/).slice(0, 24));
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const confirm = useCallback(async () => {
    if (!words) return;
    const matches = challenges.every(
      (challenge, position) => answers[position]?.trim().toLowerCase() === words[challenge.index]?.toLowerCase(),
    );
    if (!matches) {
      setError('E-AUTH-002');
      setAnswers(['', '', '']);
      setChallenges(pickChallenges(() => Math.random()));
      return;
    }
    setError(null);
    host.setPrefs({ recoverySecured: true });
    await host.audit('identity.recovery.confirm');
    setSecured(true);
  }, [answers, challenges, host, words]);

  const body = useMemo(() => {
    if (error === 'E-AUTH-001') return <Alert tone="error" title={host.t('errors.E-AUTH-001')}><p>{host.t('shell.identityDegraded')}</p></Alert>;
    if (!words) return <p role="status">{host.t('common.loading')}</p>;
    return (
      <div className="mads-stack">
        <Alert tone="warning" title={host.t('settings.general.recover')}>
          <p>{host.t('shell.recoveryBannerBody')}</p>
        </Alert>
        <ol className="mads-mnemonic-grid" aria-label={host.t('settings.general.recover')}>
          {words.map((word, index) => (
            <li key={`${index}-${word}`} data-testid="mnemonic-word">
              <Badge tone="neutral">{index + 1}</Badge> <code>{word}</code>
            </li>
          ))}
        </ol>
        {secured ? (
          <Alert tone="success" title={host.t('common.done')}>
            <p>{host.t('settings.general.identityHealthy')}</p>
          </Alert>
        ) : (
          <>
            {error === 'E-AUTH-002' ? (
              <Alert tone="error" title={host.t('errors.E-AUTH-002')}>
                <p>{host.t('shell.recoveryBannerBody')}</p>
              </Alert>
            ) : null}
            {challenges.map((challenge, position) => (
              <TextField
                key={challenge.index}
                label={`${position + 1}`}
                value={answers[position] ?? ''}
                onChange={(value) =>
                  setAnswers((current) => current.map((entry, index) => (index === position ? value : entry)))
                }
                description={`#${challenge.index + 1}`}
              />
            ))}
            <Button onClick={() => void confirm()}>{host.t('common.confirm')}</Button>
          </>
        )}
      </div>
    );
  }, [answers, challenges, confirm, error, host, secured, words]);

  return (
    <Sheet open={open} title={host.t('settings.general.recover')} onClose={onClose} side="right">
      {body}
    </Sheet>
  );
}
