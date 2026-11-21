'use client';

/**
 * Host provider: bootstraps the SQLite worker, identity, workspace, preferences,
 * and app list, and owns every privileged host operation the screens call.
 *
 * Boot order is load-bearing:
 *   1. worker + migrations (a failure here is `E-SHELL-001`, limited mode);
 *   2. identity is created automatically — never through a modal — and a failure
 *      degrades to ephemeral mode (`E-SHELL-002`) instead of blocking Home;
 *   3. default workspace, then preferences (the DB copy wins, localStorage is
 *      what `theme-init.js` used for the first paint);
 *   4. app list, then `phase = 'ready'`.
 *
 * Consent is host-level: `requestPermission` opens one dialog at a time and
 * resolves with the user's decision after writing the grant and the audit entry.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { WorkerHostDb, type AppDbKey } from '@/db/client';
import {
  createWorkspace as createWorkspaceRow,
  ensureDefaultWorkspace,
  listWorkspaces,
  setActiveWorkspace,
  type Workspace,
} from '@/db/repositories/workspaces';
import { loadIdentity, type LocalIdentity } from '@/db/repositories/identity';
import { appendAudit, type AuditHasher } from '@/db/repositories/audit';
import {
  getApp,
  getAppById,
  listApps,
  recordLaunch,
  setAppState,
  setPinned as setPinnedRow,
  type InstalledApp,
} from '@/db/repositories/apps';
import { rebuildSearchIndex } from '@/db/repositories/search';
import { grantPermission } from '@/db/repositories/permissions';
import { loadPreferences, savePreferences } from '@/db/repositories/settings';
import {
  duplicateApp as duplicateAppService,
  exportPackage,
  installVerified,
  renameApp as renameAppService,
  rollbackApp as rollbackAppService,
  uninstallApp as uninstallAppService,
} from '@/features/packages/packageService';
import { AppDatabase, exportAppDataCsv, exportAppDataJson, validateImport } from '@/features/appdb/appDb';
import { IdentityService } from '@/features/identity/identityService';
import { ensureLocalIdentity, resetEnsureIdentity } from '@/features/identity/ensureIdentity';
import { isDegraded, saveIdentitySecret } from '@/features/identity/secureStore';
import { applyPreferences, mirrorPreferences, watchSystemTheme } from '@/features/preferences/apply';
import { probeNetwork } from '@/features/shell/connectivity';
import { parsePreferences, type Preferences } from '@/features/preferences/types';
import { createTranslator, detectLocale, setActiveLocale, SUPPORTED_LOCALES, type Locale, type Translate } from '@/i18n';
import { verifyPackage, type InstallSourceName, type VerifiedPackage } from '@microapp/runtime-web';

export type HostPhase = 'booting' | 'ready';
/**
 * `unknown` until the client has actually asked the Cache API. Rendering a
 * guessed value would make the server and the first client render disagree
 * (a real hydration error), so the badge waits for the answer.
 */
export type CacheStatus = 'unknown' | 'cached' | 'uncached';
export type PermissionOutcome = 'once' | 'always' | 'denied';

export interface PermissionRequest {
  appInstallId: string;
  appId: string;
  permissionId: string;
  reason?: string;
  /** Runner/preview mount that asked; `Allow once` is scoped to it. */
  sessionId?: string;
}

export interface PendingPermission {
  request: PermissionRequest;
  appName: string;
}

export interface StorageEstimate {
  usage: number;
  quota: number;
}

export interface HostContextValue {
  phase: HostPhase;
  /** True when the database and workspace are open: create/install can run. */
  ready: boolean;
  /** `E-SHELL-001` when the worker could not open the database. */
  bootError: string | null;
  /** `E-SHELL-002` when identity creation failed. */
  identityError: string | null;
  /** True when key material is session-only or absent; create stays disabled. */
  ephemeral: boolean;
  degradedIdentity: boolean;
  storage: 'opfs' | 'memory' | null;
  db: WorkerHostDb | null;
  identityService: IdentityService | null;
  identity: LocalIdentity | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  apps: InstalledApp[];
  prefs: Preferences;
  setPrefs: (patch: Partial<Preferences>) => void;
  prefsError: string | null;
  retryPrefsSave: () => void;
  locale: Locale;
  t: Translate;
  online: boolean;
  cacheStatus: CacheStatus;
  storageEstimate: StorageEstimate | null;
  storagePersisted: boolean;
  requestPersist: () => Promise<void>;
  refreshStorageEstimate: () => Promise<void>;
  pendingPermission: PendingPermission | null;
  resolvePermission: (outcome: PermissionOutcome) => Promise<void>;
  requestPermission: (input: PermissionRequest) => Promise<PermissionOutcome>;
  refresh: () => Promise<void>;
  inspectPackage: (
    file: File,
    source: InstallSourceName,
    keys?: { authorPubkeyHex?: string; registryPubkeyHex?: string },
  ) => Promise<{ pkg: VerifiedPackage; bytes: Uint8Array }>;
  installPackage: (
    file: File,
    source: InstallSourceName,
    approvedPermissions: string[],
    options?: {
      authorPubkeyHex?: string;
      registryPubkeyHex?: string;
      allowKeyChange?: boolean;
      allowDowngrade?: boolean;
    },
  ) => Promise<InstalledApp>;
  uninstallApp: (installId: string) => Promise<void>;
  duplicateApp: (installId: string) => Promise<InstalledApp>;
  renameApp: (installId: string, name: string | null) => Promise<InstalledApp>;
  setPinned: (installId: string, pinned: boolean) => Promise<void>;
  rollbackApp: (installId: string, version: string) => Promise<InstalledApp>;
  launchApp: (appId: string) => Promise<InstalledApp | null>;
  stopApp: (appId: string) => Promise<void>;
  exportPackageBytes: (installId: string) => Promise<Uint8Array | null>;
  audit: (action: string, target?: string, metadata?: Record<string, unknown>) => Promise<void>;
  openAppDb: (installId: string) => Promise<AppDatabase>;
  exportAppData: (installId: string, format: 'json' | 'csv') => Promise<string>;
  importAppData: (installId: string, payload: unknown) => Promise<number>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  restoreIdentity: (mnemonic: string) => Promise<void>;
}

const HostContext = createContext<HostContextValue | null>(null);

const SHELL_CACHE = 'microapp-shell-v3';

export function HostProvider({ children }: { children: ReactNode }): ReactElement {
  const [phase, setPhase] = useState<HostPhase>('booting');
  const [bootError, setBootError] = useState<string | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [storage, setStorage] = useState<'opfs' | 'memory' | null>(null);
  const [identity, setIdentity] = useState<LocalIdentity | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [degradedIdentity, setDegradedIdentity] = useState(false);
  const [online, setOnline] = useState(true);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>('unknown');
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);
  const [storagePersisted, setStoragePersisted] = useState(false);
  const [prefs, setPrefsState] = useState<Preferences>(() => parsePreferences(null, detectLocale()));
  const [prefsError, setPrefsError] = useState<string | null>(null);
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null);

  const dbRef = useRef<WorkerHostDb | null>(null);
  const [db, setDb] = useState<WorkerHostDb | null>(null);
  const identityServiceRef = useRef<IdentityService | null>(null);
  const [identityService, setIdentityService] = useState<IdentityService | null>(null);
  const prefsRef = useRef(prefs);
  const consentQueue = useRef<Array<{ request: PermissionRequest; resolve: (outcome: PermissionOutcome) => void }>>([]);
  const activeConsent = useRef<{ request: PermissionRequest; resolve: (outcome: PermissionOutcome) => void } | null>(
    null,
  );
  const appsRef = useRef(apps);
  const locale = prefs.locale;
  const t = useMemo(() => createTranslator(locale), [locale]);

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  useEffect(() => {
    appsRef.current = apps;
  }, [apps]);

  useEffect(() => {
    setActiveLocale(locale);
  }, [locale]);

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

  const refreshStorageEstimate = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.storage) return;
    try {
      const [estimate, persisted] = await Promise.all([
        navigator.storage.estimate(),
        navigator.storage.persisted?.() ?? Promise.resolve(false),
      ]);
      setStorageEstimate({ usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 });
      setStoragePersisted(persisted);
    } catch {
      setStorageEstimate(null);
    }
  }, []);

  const requestPersist = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return;
    try {
      await navigator.storage.persist();
    } catch {
      // Denied persistence is a documented state, not an error.
    }
    await refreshStorageEstimate();
  }, [refreshStorageEstimate]);

  const setPrefs = useCallback<HostContextValue['setPrefs']>((patch) => {
    const next = { ...prefsRef.current, ...patch };
    prefsRef.current = next;
    setPrefsState(next);
    applyPreferences(next);
    mirrorPreferences(next);
    const db = dbRef.current;
    if (!db) return;
    void savePreferences(db, next)
      .then(() => setPrefsError(null))
      .catch(() => setPrefsError('E-SET-002'));
  }, []);

  const retryPrefsSave = useCallback(() => {
    const db = dbRef.current;
    if (!db) return;
    void savePreferences(db, prefsRef.current)
      .then(() => setPrefsError(null))
      .catch(() => setPrefsError('E-SET-002'));
  }, []);

  const loadWorkspaceData = useCallback(
    async (db: WorkerHostDb, active: Workspace): Promise<void> => {
      setWorkspace(active);
      setApps(await listApps(db, active.id));
      setWorkspaces(await listWorkspaces(db));
      await refreshStorageEstimate();
    },
    [refreshStorageEstimate],
  );

  const refresh = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;
    const loadedIdentity = await loadIdentity(db);
    setIdentity(loadedIdentity);
    const active = await ensureDefaultWorkspace(db, { locale });
    await loadWorkspaceData(db, active);
  }, [locale, loadWorkspaceData]);

  // --- boot ---------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    void (async () => {
      try {
        const worker = new Worker(new URL('../../db/worker/host-db.worker.ts', import.meta.url), {
          type: 'module',
        });
        const workerDb = await WorkerHostDb.create(worker);
        if (cancelled) {
          await workerDb.close();
          return;
        }
        dbRef.current = workerDb;
        setDb(workerDb);
        setStorage(workerDb.storage);

        const service = IdentityService.spawn();
        identityServiceRef.current = service;
        setIdentityService(service);

        // Identity: automatic, never a modal — and never on the critical path.
        // Key derivation is Argon2id, which is deliberately slow, so provisioning
        // runs in the background while Home becomes usable. Failures still degrade
        // (`identityError`) instead of blocking.
        const provisionIdentity = async (): Promise<void> => {
          try {
            resetEnsureIdentity();
            // The audit callback fires *during* provisioning, so it must not close
            // over the provisioning result; the actor is read back from the row.
            const created = await ensureLocalIdentity(workerDb, {
              service,
              audit: async (action, target, metadata) => {
                const hasher: AuditHasher = async (prev, seq, payload) => {
                  const { createCoreClient, coreWasmUrl, loadCoreWasm } = await import('@microapp/runtime-web');
                  const coreModule = await loadCoreWasm(coreWasmUrl());
                  return createCoreClient(coreModule).auditHash(prev, seq, payload);
                };
                const actor = (await loadIdentity(workerDb))?.id ?? 'system';
                await appendAudit(
                  workerDb,
                  { actor, action, target: target ?? null, metadata: metadata ?? {} },
                  hasher,
                );
              },
            });
            if (!cancelled) {
              setIdentity(created.identity);
              setDegradedIdentity(created.degraded || isDegraded());
              setIdentityError(null);
            }
          } catch {
            if (!cancelled) {
              setIdentityError('E-SHELL-002');
              setDegradedIdentity(true);
            }
          }
        };
        void provisionIdentity();

        const active = await ensureDefaultWorkspace(workerDb, { locale: prefsRef.current.locale });
        const stored = await loadPreferences(workerDb, prefsRef.current.locale);
        const initial = stored ?? prefsRef.current;
        if (!stored) await savePreferences(workerDb, initial);
        prefsRef.current = initial;
        setPrefsState(initial);
        applyPreferences(initial);
        mirrorPreferences(initial);

        if (cancelled) return;
        setWorkspace(active);
        setApps(await listApps(workerDb, active.id));
        setWorkspaces(await listWorkspaces(workerDb));
        setPhase('ready');
        await refreshStorageEstimate();
      } catch {
        if (cancelled) return;
        // Limited mode: Home still renders, create is disabled, export stays open.
        setBootError('E-SHELL-001');
        setStorage(null);
        setPhase('ready');
      }
    })();
    return () => {
      cancelled = true;
      identityServiceRef.current?.destroy();
      identityServiceRef.current = null;
      void dbRef.current?.close();
      dbRef.current = null;
      setDb(null);
    };
    // Boot runs once; locale changes are applied through `setPrefs`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- connectivity, cache status, OS theme -------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // `navigator.onLine` is the fast signal; the probe is the true one.
    const update = (): void => {
      setOnline(navigator.onLine);
      void probeNetwork().then((reachable) => setOnline(reachable));
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    void (async () => {
      try {
        setCacheStatus((await caches.has(SHELL_CACHE)) ? 'cached' : 'uncached');
      } catch {
        setCacheStatus('uncached');
      }
    })();
    const onControllerChange = (): void => {
      void caches
        .has(SHELL_CACHE)
        .then((has) => setCacheStatus(has ? 'cached' : 'uncached'))
        .catch(() => setCacheStatus('uncached'));
    };
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    applyPreferences(prefs);
    if (prefs.theme !== 'system') return;
    return watchSystemTheme(() => applyPreferences(prefsRef.current));
  }, [prefs]);

  // --- consent ------------------------------------------------------------
  const presentNextConsent = useCallback(() => {
    const next = consentQueue.current.shift() ?? null;
    activeConsent.current = next;
    if (!next) {
      setPendingPermission(null);
      return;
    }
    const app = appsRef.current.find((candidate) => candidate.id === next.request.appInstallId);
    setPendingPermission({
      request: next.request,
      appName: app?.displayName ?? app?.name ?? next.request.appId,
    });
  }, []);

  const requestPermission = useCallback<HostContextValue['requestPermission']>(
    (request) =>
      new Promise<PermissionOutcome>((resolve) => {
        consentQueue.current.push({ request, resolve });
        if (!activeConsent.current) presentNextConsent();
      }),
    [presentNextConsent],
  );

  const resolvePermission = useCallback<HostContextValue['resolvePermission']>(
    async (outcome) => {
      const answered = activeConsent.current;
      if (!answered) return;
      const { request, resolve } = answered;
      presentNextConsent();
      const db = dbRef.current;
      const active = workspace;
      if (!db || !active) {
        resolve(outcome);
        return;
      }
      const now = Date.now();
      try {
        if (outcome === 'denied') {
          await audit('permission.deny', request.appId, { permission: request.permissionId });
        } else if (outcome === 'always') {
          await grantPermission(db, {
            workspaceId: active.id,
            appInstallId: request.appInstallId,
            permissionId: request.permissionId,
            scope: 'persistent',
            nowMs: now,
          });
          await audit('permission.grant', request.appId, {
            permission: request.permissionId,
            scope: 'persistent',
          });
        } else {
          await grantPermission(db, {
            workspaceId: active.id,
            appInstallId: request.appInstallId,
            permissionId: request.permissionId,
            scope: 'once',
            sessionId: request.sessionId ?? request.appInstallId,
            nowMs: now,
          });
          await audit('permission.grant', request.appId, { permission: request.permissionId, scope: 'once' });
        }
      } catch {
        // A grant that cannot be written must not look like consent.
        if (outcome !== 'denied') {
          resolve('denied');
          return;
        }
      }
      resolve(outcome);
    },
    [audit, presentNextConsent, workspace],
  );

  // --- packages -----------------------------------------------------------
  const coreClient = useCallback(async () => {
    const { createCoreClient, coreWasmUrl, loadCoreWasm } = await import('@microapp/runtime-web');
    return createCoreClient(await loadCoreWasm(coreWasmUrl()));
  }, []);

  const inspectPackage = useCallback<HostContextValue['inspectPackage']>(
    async (file, source, keys) => {
      const core = await coreClient();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pkg = await verifyPackage(core, bytes, source, {
        authorPubkeyHex: keys?.authorPubkeyHex,
        registryPubkeyHex: keys?.registryPubkeyHex,
      });
      return { pkg, bytes };
    },
    [coreClient],
  );

  const installPackage = useCallback<HostContextValue['installPackage']>(
    async (file, source, approvedPermissions, options) => {
      const db = dbRef.current;
      const active = workspace;
      if (!db || !active) throw new Error('E-SHELL-001 host database unavailable');
      const { pkg, bytes } = await inspectPackage(file, source, options);
      for (const permission of pkg.manifest.permissions) {
        if (permission !== 'storage.app' && !approvedPermissions.includes(permission)) {
          throw new Error(`E-RUN-003 required permission denied: ${permission}`);
        }
      }
      const outcome = await installVerified(db, active, pkg, bytes, source, {
        allowKeyChange: options?.allowKeyChange,
        allowDowngrade: options?.allowDowngrade,
      });
      await rebuildSearchIndex(db, active.id);
      await audit('app.install', pkg.manifest.id, { version: pkg.manifest.version, source });
      setApps(await listApps(db, active.id));
      await refreshStorageEstimate();
      return outcome.app;
    },
    [audit, inspectPackage, refreshStorageEstimate, workspace],
  );

  const uninstallApp = useCallback<HostContextValue['uninstallApp']>(
    async (installId) => {
      const db = dbRef.current;
      const active = workspace;
      if (!db || !active) throw new Error('E-SHELL-001 host database unavailable');
      await uninstallAppService(db, active, installId);
      await audit('app.uninstall', installId);
      setApps(await listApps(db, active.id));
      await refreshStorageEstimate();
    },
    [audit, refreshStorageEstimate, workspace],
  );

  const duplicateApp = useCallback<HostContextValue['duplicateApp']>(
    async (installId) => {
      const db = dbRef.current;
      const active = workspace;
      if (!db || !active) throw new Error('E-SHELL-001 host database unavailable');
      const created = await duplicateAppService(db, active, installId);
      await audit('app.duplicate', created.appId);
      setApps(await listApps(db, active.id));
      await refreshStorageEstimate();
      return created;
    },
    [audit, refreshStorageEstimate, workspace],
  );

  const renameApp = useCallback<HostContextValue['renameApp']>(
    async (installId, name) => {
      const db = dbRef.current;
      const active = workspace;
      if (!db || !active) throw new Error('E-SHELL-001 host database unavailable');
      const updated = await renameAppService(db, active, installId, name);
      await audit('app.rename', updated.appId);
      setApps(await listApps(db, active.id));
      return updated;
    },
    [audit, workspace],
  );

  const setPinned = useCallback<HostContextValue['setPinned']>(
    async (installId, pinned) => {
      const db = dbRef.current;
      const active = workspace;
      if (!db || !active) throw new Error('E-SHELL-001 host database unavailable');
      await setPinnedRow(db, active.id, installId, pinned);
      setApps(await listApps(db, active.id));
    },
    [workspace],
  );

  const rollbackApp = useCallback<HostContextValue['rollbackApp']>(
    async (installId, version) => {
      const db = dbRef.current;
      const active = workspace;
      if (!db || !active) throw new Error('E-SHELL-001 host database unavailable');
      const app = await rollbackAppService(db, active, installId, version);
      await audit('app.rollback', app.appId, { version });
      setApps(await listApps(db, active.id));
      return app;
    },
    [audit, workspace],
  );

  const exportPackageBytes = useCallback<HostContextValue['exportPackageBytes']>(
    async (installId) => {
      const db = dbRef.current;
      const active = workspace;
      if (!db || !active) return null;
      return exportPackage(db, active, installId);
    },
    [workspace],
  );

  const launchApp = useCallback<HostContextValue['launchApp']>(
    async (appId) => {
      const db = dbRef.current;
      const active = workspace;
      if (!db || !active) return null;
      const app = await getApp(db, active.id, appId);
      if (!app) return null;
      await recordLaunch(db, active.id, app.id);
      await audit('sandbox.launch', app.appId, { version: app.version });
      setApps(await listApps(db, active.id));
      return app;
    },
    [audit, workspace],
  );

  const stopApp = useCallback<HostContextValue['stopApp']>(
    async (appId) => {
      const db = dbRef.current;
      const active = workspace;
      if (!db || !active) return;
      const app = await getApp(db, active.id, appId);
      if (!app) return;
      await setAppState(db, active.id, app.id, 'installed');
      await audit('sandbox.kill', app.appId);
      setApps(await listApps(db, active.id));
    },
    [audit, workspace],
  );

  // --- app databases ------------------------------------------------------
  const appKeyFor = useCallback(
    async (installId: string): Promise<AppDbKey> => {
      const db = dbRef.current;
      const active = workspace;
      if (!db || !active) throw new Error('E-SHELL-001 host database unavailable');
      const app = await getAppById(db, active.id, installId);
      if (!app) throw new Error('E-DATA-001 app not found in workspace');
      return { workspaceSlug: active.slug, appInstallId: app.id, appId: app.appId };
    },
    [workspace],
  );

  const openAppDb = useCallback<HostContextValue['openAppDb']>(
    async (installId) => {
      const db = dbRef.current;
      if (!db) throw new Error('E-SHELL-001 host database unavailable');
      const database = new AppDatabase(db, await appKeyFor(installId));
      await database.open();
      return database;
    },
    [appKeyFor],
  );

  const exportAppData = useCallback<HostContextValue['exportAppData']>(
    async (installId, format) => {
      const database = await openAppDb(installId);
      const records = await database.allRows();
      const text = format === 'csv' ? await exportAppDataCsv(records) : await exportAppDataJson(records);
      await audit('app.data.export', installId, { rows: records.length });
      return text;
    },
    [audit, openAppDb],
  );

  const importAppData = useCallback<HostContextValue['importAppData']>(
    async (installId, payload) => {
      const parsed = await validateImport(payload);
      const database = await openAppDb(installId);
      const written = await database.replaceRows(parsed.records);
      await audit('app.data.import', installId, { rows: written });
      return written;
    },
    [audit, openAppDb],
  );

  // --- workspaces ---------------------------------------------------------
  const switchWorkspace = useCallback<HostContextValue['switchWorkspace']>(
    async (workspaceId) => {
      const db = dbRef.current;
      if (!db) return;
      await setActiveWorkspace(db, workspaceId);
      const active = (await listWorkspaces(db)).find((candidate) => candidate.id === workspaceId);
      if (!active) throw new Error('E-DATA-001 workspace not found');
      await loadWorkspaceData(db, active);
    },
    [loadWorkspaceData],
  );

  const createWorkspace = useCallback<HostContextValue['createWorkspace']>(
    async (name) => {
      const db = dbRef.current;
      if (!db) throw new Error('E-SHELL-001 host database unavailable');
      const created = await createWorkspaceRow(db, { name, locale });
      setWorkspaces(await listWorkspaces(db));
      await audit('workspace.create', created.id);
      return created;
    },
    [audit, locale],
  );

  const restoreIdentity = useCallback<HostContextValue['restoreIdentity']>(
    async (mnemonic) => {
      await saveIdentitySecret(mnemonic);
      setDegradedIdentity(isDegraded());
      setIdentityError(null);
      resetEnsureIdentity();
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<HostContextValue>(
    () => ({
      phase,
      bootError,
      identityError,
      ready: phase === 'ready' && db !== null && workspace !== null,
      // Provisioning is asynchronous, so `identity === null` alone is not a
      // failure; only an explicit error or a degraded secure store is.
      ephemeral: identityError !== null || degradedIdentity,
      degradedIdentity,
      storage,
      db,
      identityService,
      identity,
      workspace,
      workspaces,
      apps,
      prefs,
      setPrefs,
      prefsError,
      retryPrefsSave,
      locale,
      t,
      online,
      cacheStatus,
      storageEstimate,
      storagePersisted,
      requestPersist,
      refreshStorageEstimate,
      pendingPermission,
      resolvePermission,
      requestPermission,
      refresh,
      inspectPackage,
      installPackage,
      uninstallApp,
      duplicateApp,
      renameApp,
      setPinned,
      rollbackApp,
      launchApp,
      stopApp,
      exportPackageBytes,
      audit,
      openAppDb,
      exportAppData,
      importAppData,
      switchWorkspace,
      createWorkspace,
      restoreIdentity,
    }),
    [
      phase,
      bootError,
      identityError,
      identity,
      degradedIdentity,
      storage,
      db,
      identityService,
      workspace,
      workspaces,
      apps,
      prefs,
      setPrefs,
      prefsError,
      retryPrefsSave,
      locale,
      t,
      online,
      cacheStatus,
      storageEstimate,
      storagePersisted,
      requestPersist,
      refreshStorageEstimate,
      pendingPermission,
      resolvePermission,
      requestPermission,
      refresh,
      inspectPackage,
      installPackage,
      uninstallApp,
      duplicateApp,
      renameApp,
      setPinned,
      rollbackApp,
      launchApp,
      stopApp,
      exportPackageBytes,
      audit,
      openAppDb,
      exportAppData,
      importAppData,
      switchWorkspace,
      createWorkspace,
      restoreIdentity,
    ],
  );

  return <HostContext.Provider value={value}>{children}</HostContext.Provider>;
}

export function useHost(): HostContextValue {
  const context = useContext(HostContext);
  if (!context) throw new Error('useHost must be used inside HostProvider');
  return context;
}

export function useHostOptional(): HostContextValue | null {
  return useContext(HostContext);
}

export type { Locale };
export { SUPPORTED_LOCALES };
