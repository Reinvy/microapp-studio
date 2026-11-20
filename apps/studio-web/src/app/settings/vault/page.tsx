'use client';

/**
 * Vault page: create the key wrap with a PIN, unlock, add sealed items, reveal
 * them, and grant per-item read access to an installed app.
 *
 * Plaintext only exists in this component's state after an explicit reveal and
 * is never written back to the database.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useHost } from '@/features/host/HostProvider';
import { SettingsShell } from '@/features/settings/SettingsShell';
import { loadIdentitySecret } from '@/features/identity/secureStore';
import { vaultApi } from '@/features/identity/identityService';
import { uuidv7 } from '@/db/ids';
import {
  activeKeyWrap,
  createVaultItem,
  grantVaultItem,
  listVaultItems,
  saveKeyWrap,
  type VaultItem,
} from '@/db/repositories/vault';

const hex = (bytes: Uint8Array): string =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

export default function VaultPage(): ReactElement {
  const host = useHost();
  const [hasWrap, setHasWrap] = useState<boolean | null>(null);
  const [blob, setBlob] = useState<Uint8Array | null>(null);
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState('');
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [grantApp, setGrantApp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!host.db || !host.workspace) return;
    const wrap = await activeKeyWrap(host.db, host.workspace.id);
    setHasWrap(wrap !== null);
    if (wrap) {
      const combined = new Uint8Array(16 + 12 + wrap.wrappedKey.byteLength);
      combined.set(wrap.salt, 0);
      combined.set(wrap.nonce, 16);
      combined.set(wrap.wrappedKey, 28);
      setBlob(combined);
    }
    setItems(await listVaultItems(host.db, host.workspace.id));
  }, [host.db, host.workspace]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const createVault = async (): Promise<void> => {
    if (!host.db || !host.workspace || !host.identityService || !host.identity) return;
    setError(null);
    try {
      const mnemonic = await loadIdentitySecret();
      if (!mnemonic) throw new Error('E-AUTH-006 recovery phrase unavailable; restore identity first');
      const api = vaultApi(host.identityService);
      const record = {
        siteId: hex(host.identity.siteId),
        siteIdBase32: '',
        hkdfSalt: hex(host.identity.hkdfSalt),
        identityPubkey: hex(host.identity.identityPubkey),
        deviceSignPubkey: hex(host.identity.deviceSignPubkey),
        deviceEcdhPubkey: hex(host.identity.deviceEcdhPubkey),
      };
      const wrapBlob = await api.wrap(pin, record, mnemonic);
      if (wrapBlob.byteLength < 28 + 32) throw new Error('E-CRYPTO-001 invalid key wrap');
      await saveKeyWrap(host.db, {
        workspaceId: host.workspace.id,
        kdf: 'argon2id',
        salt: wrapBlob.slice(0, 16),
        memoryKib: 65_536,
        iterations: 3,
        parallelism: 1,
        nonce: wrapBlob.slice(16, 28),
        wrappedKey: wrapBlob.slice(28),
      });
      await host.audit('vault.create', undefined, { kdf: 'argon2id' });
      await refresh();
      setNotice(host.t('vault.unlock'));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : host.t('errors.generic'));
    }
  };

  const unlock = async (): Promise<void> => {
    if (!host.identityService || !blob) return;
    setError(null);
    try {
      await vaultApi(host.identityService).unlock(pin, blob);
      setUnlocked(true);
      await host.audit('vault.unlock');
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : host.t('vault.locked'));
      setUnlocked(false);
    }
  };

  const lock = async (): Promise<void> => {
    if (!host.identityService) return;
    await vaultApi(host.identityService).lock();
    setUnlocked(false);
    setRevealed({});
  };

  const addItem = async (): Promise<void> => {
    if (!host.db || !host.workspace || !host.identityService || !host.identity) return;
    if (!unlocked) {
      setError(host.t('vault.locked'));
      return;
    }
    setError(null);
    try {
      const recordId = uuidv7();
      const sealed = await vaultApi(host.identityService).seal(undefined, {
        siteId: hex(host.identity.siteId),
        recordType: 'vault_item',
        recordId,
        schemaVersion: 1,
      }, secret);
      await createVaultItem(host.db, {
        workspaceId: host.workspace.id,
        kind: 'note',
        label,
        envelope: sealed.envelope,
        keyId: sealed.keyId,
        nonce: sealed.nonce,
      });
      await dbAudit('vault.item.create');
      setLabel('');
      setSecret('');
      await refresh();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : host.t('errors.generic'));
    }
  };

  const reveal = async (item: VaultItem): Promise<void> => {
    if (!host.identityService || !host.identity) return;
    setError(null);
    try {
      const plaintext = await vaultApi(host.identityService).open(
        { siteId: hex(host.identity.siteId), recordType: 'vault_item', recordId: item.id, schemaVersion: 1 },
        item.envelope,
      );
      setRevealed((prev) => ({ ...prev, [item.id]: plaintext }));
      await dbAudit('vault.item.read');
    } catch (revealError) {
      setError(revealError instanceof Error ? revealError.message : host.t('errors.generic'));
    }
  };

  const grant = async (item: VaultItem): Promise<void> => {
    if (!host.db || !host.workspace || !grantApp) return;
    await grantVaultItem(host.db, {
      workspaceId: host.workspace.id,
      itemId: item.id,
      appInstallId: grantApp,
    });
    await dbAudit('vault.grant');
    setNotice(host.t('permissions.granted'));
  };

  async function dbAudit(action: string): Promise<void> {
    await host.audit(action);
  }

  return (
    <SettingsShell title={host.t('vault.title')}>
      {error ? (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="alert">
          {notice}
        </p>
      ) : null}

      {hasWrap === false ? (
        <section className="card stack-md" aria-label={host.t('vault.create')}>
          <h2>{host.t('vault.create')}</h2>
          <label className="field">
            <span>{host.t('vault.passphrase')}</span>
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button type="button" className="button button-primary" onClick={() => void createVault()} disabled={pin.length < 6}>
            {host.t('vault.create')}
          </button>
        </section>
      ) : null}

      {hasWrap ? (
        <section className="card stack-md" aria-label={host.t('vault.unlock')}>
          <label className="field">
            <span>{host.t('vault.passphrase')}</span>
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <div className="badge-row">
            <button type="button" className="button button-primary" onClick={() => void unlock()} disabled={unlocked || pin.length < 6}>
              {host.t('vault.unlock')}
            </button>
            <button type="button" className="button" onClick={() => void lock()} disabled={!unlocked}>
              {host.t('vault.lock')}
            </button>
          </div>
          <p role="status">{unlocked ? host.t('permissions.granted') : host.t('vault.locked')}</p>
        </section>
      ) : null}

      {unlocked ? (
        <section className="card stack-md" aria-label={host.t('vault.title')}>
          <label className="field">
            <span>{host.t('vault.label')}</span>
            <input type="text" value={label} onChange={(event) => setLabel(event.target.value)} />
          </label>
          <label className="field">
            <span>{host.t('vault.secret')}</span>
            <textarea rows={3} value={secret} onChange={(event) => setSecret(event.target.value)} />
          </label>
          <button type="button" className="button" onClick={() => void addItem()} disabled={label.length === 0}>
            {host.t('common.save')}
          </button>
        </section>
      ) : null}

      <section className="stack-md" aria-label={host.t('vault.title')}>
        {items.length === 0 ? <p>{host.t('vault.empty')}</p> : null}
        {items.length > 0 ? (
          <label className="field">
            <span>Grant ke aplikasi</span>
            <select value={grantApp} onChange={(event) => setGrantApp(event.target.value)}>
              <option value="">—</option>
              {host.apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.appId}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <ul className="stack-md">
          {items.map((item) => (
            <li key={item.id} className="card">
              <strong>{item.label}</strong>
              <div className="badge-row">
                <button type="button" className="button" onClick={() => void reveal(item)} disabled={!unlocked}>
                  Reveal
                </button>
                <button type="button" className="button" onClick={() => void grant(item)} disabled={!grantApp}>
                  Grant
                </button>
              </div>
              {revealed[item.id] ? <pre aria-live="polite">{revealed[item.id]}</pre> : null}
            </li>
          ))}
        </ul>
      </section>
    </SettingsShell>
  );
}
