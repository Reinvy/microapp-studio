'use client';

/**
 * Host provider: bootstraps the SQLite worker, identity, workspace, and app list.
 *
 * Boot order matters: migrations run inside the worker before any repository
 * call; identity is loaded before the workspace so audit entries always carry an
 * actor; app list is read after the workspace so isolation is guaranteed.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import {
  WorkerHostDb,
} from '@/db/client';
import { ensureDefaultWorkspace, loadWorkspaceState, saveWorkspaceState, type Workspace } from '@/db/repositories/workspaces';
import { createIdentity, loadIdentity, setDeviceCert, type LocalIdentity } from '@/db/repositories/identity';
import { appendAudit, type AuditHasher } from '@/db/repositories/audit';
import { getApp, installApp, listApps, setAppState, type InstalledApp } from '@/db/repositories/apps';
import { indexRecord, rebuildSearchIndex } from '@/db/repositories/search';
import { IdentityService } from '@/features/identity/identityService';
import { clearIdentitySecret, isDegraded, loadIdentitySecret, saveIdentitySecret } from '@/features/identity/secureStore';
import type { CreateIdentityResult } from '@/features/identity/types';
import { createTranslator, detectLocale, type Locale, type Translate } from '@/i18n';
import { verifyPackage, materialize, type InstallSourceName, type VerifiedPackage } from '@microapp/runtime-web';

export type HostPhase = 'booting' | 'first-run' | 'ready' | 'error';

export interface HostContextValue {
  phase: HostPhase;
  error: string | null;
  storage: 'opfs' | 'memory' | null;
  degradedIdentity: boolean;
  db: WorkerHostDb | null;
  identityService: IdentityService | null;
  identity: LocalIdentity | null;
  workspace: Workspace | null;
  apps: InstalledApp[];
  locale: Locale;
  t: Translate;
  refresh: () => Promise<void>;
  completeOnboarding: (created: CreateIdentityResult, mnemonic: string) => Promise<void>;
  restoreIdentity: (mnemonic: string) => Promise<void>;
  inspectPackage: (
    file: File,
    source: InstallSourceName,
    keys?: { authorPubkeyHex?: string; registryPubkeyHex?: string },
  ) => Promise<VerifiedPackage>;
  installPackage: (
    file: File,
    source: InstallSourceName,
    approvedPermissions: string[],
    keys?: { authorPubkeyHex?: string; registryPubkeyHex?: string },
  ) => Promise<InstalledApp>;
  launchApp: (appId: string) => Promise<InstalledApp | null>;
  stopApp: (appId: string) => Promise<void>;
  audit: (action: string, target?: string, metadata?: Record<string, unknown>) => Promise<void>;
}

const HostContext = createContext<HostContextValue | null>(null);

function toBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export function HostProvider({ children }: { children: ReactNode }): ReactElement {
  const [phase, setPhase] = useState<HostPhase>('booting');
  const [error, setError] = useState<string | null>(null);
  const [storage, setStorage] = useState<'opfs' | 'memory' | null>(null);
  const [identity, setIdentity] = useState<LocalIdentity | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [degradedIdentity, setDegradedIdentity] = useState(false);
  const dbRef = useRef<WorkerHostDb | null>(null);
  const [db, setDb] = useState<WorkerHostDb | null>(null);
  const identityServiceRef = useRef<IdentityService | null>(null);
  const [identityService, setIdentityService] = useState<IdentityService | null>(null);
  const locale = useMemo(() => detectLocale(), []);
  const t = useMemo(() => createTranslator(locale), [locale]);

  const audit = useCallback<HostContextValue['audit']>(async (action, target, metadata) => {
    const db = dbRef.current;
    if (!db) return;
    const hasher: AuditHasher = async (prev, seq, payload) => {
      const { createCoreClient, coreWasmUrl, loadCoreWasm } = await import('@microapp/runtime-web');
      const coreModule = await loadCoreWasm(coreWasmUrl());
      const client = createCoreClient(coreModule);
      return client.auditHash(prev, seq, payload);
    };
    await appendAudit(db, { actor: identity?.id ?? 'system', action, target: target ?? null, metadata }, hasher);
  }, [identity]);

  const refresh = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;
    const loadedIdentity = await loadIdentity(db);
    setIdentity(loadedIdentity);
    if (!loadedIdentity) {
      setPhase('first-run');
      return;
    }
    const ws = await ensureDefaultWorkspace(db, { locale });
    setWorkspace(ws);
    setApps(await listApps(db, ws.id));
    const state = await loadWorkspaceState(db, ws.id);
    if (state.lastAppId === null) {
      await saveWorkspaceState(db, ws.id, { ...state, lastAppId: null });
    }
    setPhase('ready');
  }, [locale]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    void (async () => {
      try {
        const worker = new Worker(new URL('../../db/worker/host-db.worker.ts', import.meta.url), {
          type: 'module',
        });
        const db = await WorkerHostDb.create(worker);
        if (cancelled) {
          await db.close();
          return;
        }
        dbRef.current = db;
        setDb(db);
        setStorage(db.storage);
        identityServiceRef.current = IdentityService.spawn();
        setIdentityService(identityServiceRef.current);
        const existing = await loadIdentity(db);
        setIdentity(existing);
        if (existing) {
          const secret = await loadIdentitySecret();
          setDegradedIdentity(secret === null || isDegraded());
        }
        await refresh();
      } catch (bootError) {
        if (cancelled) return;
        setError(bootError instanceof Error ? bootError.message : 'host bootstrap failed');
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
      identityServiceRef.current?.destroy();
      void dbRef.current?.close();
      dbRef.current = null;
      setDb(null);
    };
  }, [refresh]);

  const completeOnboarding = useCallback<HostContextValue['completeOnboarding']>(
    async (created, mnemonic) => {
      const db = dbRef.current;
      const service = identityServiceRef.current;
      if (!db || !service) throw new Error('E-HOST-002 host database unavailable');
      const record = created.record;
      await createIdentity(db, {
        siteId: toBytes(record.siteId),
        identityPubkey: toBytes(record.identityPubkey),
        keyAgreementPubkey: toBytes(record.deviceEcdhPubkey),
        hkdfSalt: toBytes(record.hkdfSalt),
        deviceSignPubkey: toBytes(record.deviceSignPubkey),
        deviceEcdhPubkey: toBytes(record.deviceEcdhPubkey),
        nowMs: Date.now(),
      });
      await saveIdentitySecret(mnemonic);
      const cert = await service.deviceCertificate({ phrase: mnemonic, passphrase: '', record });
      await setDeviceCert(db, cert, Date.now() + 365 * 24 * 60 * 60 * 1000);
      const ws = await ensureDefaultWorkspace(db, { locale });
      await audit('identity.create', record.siteId, { siteIdBase32: record.siteIdBase32 });
      setWorkspace(ws);
      setIdentity(await loadIdentity(db));
      setApps([]);
      setDegradedIdentity(isDegraded());
      setPhase('ready');
    },
    [audit, locale],
  );

  const restoreIdentity = useCallback<HostContextValue['restoreIdentity']>(
    async (mnemonic) => {
      const db = dbRef.current;
      const service = identityServiceRef.current;
      if (!db || !service) throw new Error('E-HOST-002 host database unavailable');
      const existing = await loadIdentity(db);
      if (!existing) {
        throw new Error('E-AUTH-006 no identity on this device to restore into');
      }
      const record = {
        siteId: [...existing.siteId].map((b) => b.toString(16).padStart(2, '0')).join(''),
        siteIdBase32: '',
        hkdfSalt: [...existing.hkdfSalt].map((b) => b.toString(16).padStart(2, '0')).join(''),
        identityPubkey: [...existing.identityPubkey].map((b) => b.toString(16).padStart(2, '0')).join(''),
        deviceSignPubkey: [...existing.deviceSignPubkey].map((b) => b.toString(16).padStart(2, '0')).join(''),
        deviceEcdhPubkey: [...existing.deviceEcdhPubkey].map((b) => b.toString(16).padStart(2, '0')).join(''),
      };
      await service.recover(mnemonic, record);
      await saveIdentitySecret(mnemonic);
      await audit('identity.restore', record.siteId);
      await clearIdentitySecret().catch(() => undefined);
      await saveIdentitySecret(mnemonic);
      setDegradedIdentity(isDegraded());
      await refresh();
    },
    [audit, refresh],
  );

  const inspectPackage = useCallback<HostContextValue['inspectPackage']>(
    async (file, source, keys) => {
      const { createCoreClient, coreWasmUrl, loadCoreWasm } = await import('@microapp/runtime-web');
      const coreModule = await loadCoreWasm(coreWasmUrl());
      const core = createCoreClient(coreModule);
      const bytes = new Uint8Array(await file.arrayBuffer());
      return verifyPackage(core, bytes, source, {
        authorPubkeyHex: keys?.authorPubkeyHex,
        registryPubkeyHex: keys?.registryPubkeyHex,
      });
    },
    [],
  );

  const installPackage = useCallback<HostContextValue['installPackage']>(
    async (file, source, approvedPermissions, keys) => {
      const db = dbRef.current;
      if (!db || !workspace) throw new Error('E-HOST-002 host database unavailable');
      const { createCoreClient, coreWasmUrl, loadCoreWasm } = await import('@microapp/runtime-web');
      const coreModule = await loadCoreWasm(coreWasmUrl());
      const core = createCoreClient(coreModule);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pkg: VerifiedPackage = await verifyPackage(core, bytes, source, {
        authorPubkeyHex: keys?.authorPubkeyHex,
        registryPubkeyHex: keys?.registryPubkeyHex,
      });
      for (const permission of pkg.manifest.permissions.required) {
        if (!approvedPermissions.includes(permission)) {
          throw new Error(`E-SBX-005 required permission denied: ${permission}`);
        }
      }
      const root = await navigator.storage.getDirectory();
      const writer = {
        async write(path: string, data: Uint8Array): Promise<void> {
          const segments = path.split('/').filter(Boolean);
          let directory = root;
          for (const segment of segments.slice(0, -1)) {
            directory = await directory.getDirectoryHandle(segment, { create: true });
          }
          const name = segments.at(-1);
          if (!name) throw new Error('E-DATA-001 empty package path');
          const handle = await directory.getFileHandle(name, { create: true });
          const stream = await handle.createWritable();
          await stream.write(data as unknown as BufferSource);
          await stream.close();
        },
      };
      const written = await materialize(pkg, writer);
      const installed = await installApp(db, {
        workspaceId: workspace.id,
        appId: pkg.manifest.id,
        version: pkg.manifest.version,
        manifestJson: JSON.stringify(pkg.manifest),
        contentHash: toBytes(pkg.digestHex),
        signature: pkg.authorSignature ?? new Uint8Array(64),
        authorKeyFingerprint: keys?.authorPubkeyHex ?? 'unsigned-git',
        installSource: source,
        bundlePath: `apps/${pkg.manifest.id}/${pkg.manifest.version}`,
        dbRelativePath: `workspaces/${workspace.slug}/apps/${pkg.manifest.id}.db`,
        schemaVersion: 1,
      });
      await indexRecord(db, {
        workspaceId: workspace.id,
        kind: 'app',
        refId: installed.id,
        appInstallId: installed.id,
        title: pkg.manifest.id,
        body: `${pkg.manifest.version} ${verifiedBytes(written.bytes)}`,
      });
      await rebuildSearchIndex(db, workspace.id);
      await audit('app.install', pkg.manifest.id, { version: pkg.manifest.version, source });
      setApps(await listApps(db, workspace.id));
      return installed;
    },
    [audit, workspace],
  );

  const launchApp = useCallback<HostContextValue['launchApp']>(
    async (appId) => {
      const db = dbRef.current;
      if (!db || !workspace) return null;
      const app = await getApp(db, workspace.id, appId);
      if (!app) return null;
      await setAppState(db, workspace.id, app.id, 'running');
      await audit('sandbox.launch', app.appId, { version: app.version });
      setApps(await listApps(db, workspace.id));
      return app;
    },
    [audit, workspace],
  );

  const stopApp = useCallback<HostContextValue['stopApp']>(
    async (appId) => {
      const db = dbRef.current;
      if (!db || !workspace) return;
      const app = await getApp(db, workspace.id, appId);
      if (!app) return;
      await setAppState(db, workspace.id, app.id, 'installed');
      await audit('sandbox.kill', app.appId);
      setApps(await listApps(db, workspace.id));
    },
    [audit, workspace],
  );

  const value = useMemo<HostContextValue>(
    () => ({
      phase,
      error,
      storage,
      degradedIdentity,
      db,
      identityService,
      identity,
      workspace,
      apps,
      locale,
      t,
      refresh,
      completeOnboarding,
      restoreIdentity,
      inspectPackage,
      installPackage,
      launchApp,
      stopApp,
      audit,
    }),
    [
      phase,
      error,
      storage,
      degradedIdentity,
      db,
      identityService,
      identity,
      workspace,
      apps,
      locale,
      t,
      refresh,
      completeOnboarding,
      restoreIdentity,
      inspectPackage,
      installPackage,
      launchApp,
      stopApp,
      audit,
    ],
  );

  return <HostContext.Provider value={value}>{children}</HostContext.Provider>;
}

function verifiedBytes(bytes: number): string {
  return `${bytes} bytes`;
}

export function useHost(): HostContextValue {
  const context = useContext(HostContext);
  if (!context) throw new Error('useHost must be used inside HostProvider');
  return context;
}
