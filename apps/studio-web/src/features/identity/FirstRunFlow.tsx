'use client';

/**
 * First-run onboarding: create an identity, show the 24-word phrase once,
 * confirm three words, then persist the identity and device certificate.
 * Recovery import is offered for an existing installation.
 */

import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useHost } from '@/features/host/HostProvider';
import type { CreateIdentityResult } from './types';

type Step = 'intro' | 'show' | 'confirm' | 'recover';

const CONFIRM_INDICES = [2, 9, 17];

export function FirstRunFlow(): ReactElement {
  const host = useHost();
  const t = host.t;
  const [step, setStep] = useState<Step>('intro');
  const [created, setCreated] = useState<CreateIdentityResult | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const words = useMemo(() => created?.mnemonic.split(' ') ?? [], [created]);

  const startCreate = async (): Promise<void> => {
    if (!host.identityService) return;
    setBusy(true);
    setError(null);
    try {
      const result = await host.identityService.create();
      setCreated(result);
      setStep('show');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const confirmWords = async (): Promise<void> => {
    if (!created) return;
    const mismatch = CONFIRM_INDICES.some(
      (index) => (answers[index] ?? '').trim().toLowerCase() !== words[index],
    );
    if (mismatch) {
      setError(t('firstRun.mismatch'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await host.completeOnboarding(created, created.mnemonic);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  const runRecovery = async (): Promise<void> => {
    if (!host.identityService) return;
    setBusy(true);
    setError(null);
    try {
      await host.identityService.validateMnemonic(phrase.trim());
      await host.restoreIdentity(phrase.trim());
    } catch (recoverError) {
      const message = recoverError instanceof Error ? recoverError.message : '';
      setError(message.startsWith('E-AUTH-006') ? t('firstRun.recoverMismatch') : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="mads-main" className="screen">
      <div className="screen-header">
        <h1>{t('firstRun.title')}</h1>
        <span className="badge-row">
          <span className="badge">{host.storage === 'opfs' ? 'OPFS' : 'Ephemeral'}</span>
        </span>
      </div>

      {error ? (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      ) : null}

      {step === 'intro' ? (
        <section className="stack-md" aria-label={t('firstRun.title')}>
          <p>{t('firstRun.intro')}</p>
          <div className="badge-row">
            <button type="button" className="button button-primary" onClick={() => void startCreate()} disabled={busy}>
              {t('firstRun.create')}
            </button>
            <button type="button" className="button" onClick={() => setStep('recover')} disabled={busy}>
              {t('firstRun.recover')}
            </button>
          </div>
        </section>
      ) : null}

      {step === 'show' ? (
        <section className="stack-md" aria-label={t('firstRun.wordNotice')}>
          <p role="note">{t('firstRun.wordNotice')}</p>
          <ol className="mnemonic-grid" aria-label="24 kata pemulihan">
            {words.map((word, index) => (
              <li key={`${index}-${word}`} data-testid="mnemonic-word">
                <span aria-hidden="true">{index + 1}.</span> {word}
              </li>
            ))}
          </ol>
          <button type="button" className="button button-primary" onClick={() => setStep('confirm')}>
            {t('common.confirm')}
          </button>
        </section>
      ) : null}

      {step === 'confirm' ? (
        <section className="stack-md" aria-label={t('firstRun.confirmTitle')}>
          <h2>{t('firstRun.confirmTitle')}</h2>
          <p>{t('firstRun.confirmHint')}</p>
          {CONFIRM_INDICES.map((index) => (
            <label key={index} className="field">
              <span>{`#${index + 1}`}</span>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={answers[index] ?? ''}
                onChange={(event) => setAnswers((prev) => ({ ...prev, [index]: event.target.value }))}
                aria-label={`Kata nomor ${index + 1}`}
              />
            </label>
          ))}
          <button type="button" className="button button-primary" onClick={() => void confirmWords()} disabled={busy}>
            {t('firstRun.confirm')}
          </button>
        </section>
      ) : null}

      {step === 'recover' ? (
        <section className="stack-md" aria-label={t('firstRun.recoverTitle')}>
          <h2>{t('firstRun.recoverTitle')}</h2>
          <p>{t('firstRun.recoverHint')}</p>
          <label className="field">
            <span>{t('firstRun.recoverTitle')}</span>
            <textarea
              rows={4}
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              aria-label={t('firstRun.recoverHint')}
            />
          </label>
          <div className="badge-row">
            <button type="button" className="button button-primary" onClick={() => void runRecovery()} disabled={busy}>
              {t('common.confirm')}
            </button>
            <button type="button" className="button" onClick={() => setStep('intro')}>
              {t('common.cancel')}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
