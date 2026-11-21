/**
 * Package install/update/rollback/uninstall service.
 *
 * Responsibilities are deliberately narrow: verification is done by the Rust
 * core (through the loader), OPFS layout by the storage helpers, and rows by the
 * repository. This module is the only place that decides *whether* an install is
 * allowed (key change, downgrade, permission revocation) and the only place that
 * sequences staging → rows → search index → audit.
 *
 * The original `.mapp` bytes are stored next to the bundle as `package.mapp`, so
 * share/export and reinstall keep working without the source file.
 */

import type { WorkerHostDb } from '@/db/client';
import type { Workspace } from '@/db/repositories/workspaces';
import {
  duplicateApp as duplicateAppRow,
  getApp,
  getAppById,
  installApp,
  listVersions,
  nextCopyAppId,
  preserveVersion,
  rollbackToVersion,
  setDisplayName,
  uninstallApp as uninstallAppRow,
  type AppVersion,
  type InstalledApp,
} from '@/db/repositories/apps';
import { revokeUndeclaredGrants } from '@/db/repositories/permissions';
import { indexRecord } from '@/db/repositories/search';
import { appDatabasePath } from '@/db/worker/protocol';
import { uuidv7 } from '@/db/ids';
import { copyOpfsTree, deleteOpfsTree, readOpfsFile, readOpfsTree, writeOpfsFile } from '@/features/storage/opfs';
import { bytesToBase64, sha256Hex } from '@/lib/bytes';
import type { InstallSourceName, VerifiedPackage } from '@microapp/runtime-web';

export type { InstallSourceName };

export interface InstallWarning {
  code: 'key_change' | 'downgrade';
  message: string;
}

export interface InstallPlan {
  warnings: InstallWarning[];
  /** True when the import can proceed without an extra confirmation. */
  ready: boolean;
}

export interface InstallOptions {
  allowKeyChange?: boolean;
  allowDowngrade?: boolean;
  registryId?: string | null;
  nowMs?: number;
}

/** Compare two dotted versions; missing numeric parts count as zero. */
export function compareVersions(a: string, b: string): number {
  const parse = (value: string): number[] =>
    value
      .split('-')[0]
      .split('.')
      .map((part) => Number.parseInt(part, 10))
      .map((part) => (Number.isFinite(part) ? part : 0));
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/** Decide whether an install needs an explicit acknowledgement first. */
export function planInstall(
  existing: InstalledApp | null,
  incoming: { version: string; authorKeyFingerprint: string },
  options: InstallOptions = {},
): InstallPlan {
  const warnings: InstallWarning[] = [];
  if (existing) {
    if (
      existing.authorKeyFingerprint.length > 0 &&
      incoming.authorKeyFingerprint.length > 0 &&
      existing.authorKeyFingerprint !== incoming.authorKeyFingerprint &&
      options.allowKeyChange !== true
    ) {
      warnings.push({ code: 'key_change', message: 'E-PACK-002 author key changed' });
    }
    if (compareVersions(incoming.version, existing.version) < 0 && options.allowDowngrade !== true) {
      warnings.push({ code: 'downgrade', message: 'E-PACK-004 incoming version is older' });
    }
  }
  return { warnings, ready: warnings.length === 0 };
}

/** Bundle prefix for one version of one app, inside the workspace tree. */
export function bundlePrefix(workspaceSlug: string, appId: string, version: string): string {
  return `apps/${workspaceSlug}/${appId}/${version}`;
}

export const PACKAGE_FILE_NAME = 'package.mapp';

export interface InstallOutcome {
  app: InstalledApp;
  plan: InstallPlan;
  bytes: number;
  files: number;
}

/**
 * Install a verified package: verify → stage → rows → search → audit.
 *
 * Staging is written to `<prefix>.staging` first and then copied into the final
 * prefix, so a partial write never becomes visible to the runner.
 */
export async function installVerified(
  db: WorkerHostDb,
  workspace: Workspace,
  pkg: VerifiedPackage,
  bytes: Uint8Array,
  source: InstallSourceName,
  options: InstallOptions = {},
): Promise<InstallOutcome> {
  const now = options.nowMs ?? Date.now();
  const existing = await getApp(db, workspace.id, pkg.manifest.id);
  const fingerprint = pkg.authorSignature ? await fingerprintOf(pkg.digestHex) : 'unsigned-local';
  const plan = planInstall(existing, { version: pkg.manifest.version, authorKeyFingerprint: fingerprint }, options);
  if (!plan.ready) {
    throw new Error(plan.warnings[0].message);
  }

  const prefix = bundlePrefix(workspace.slug, pkg.manifest.id, pkg.manifest.version);
  const staging = `${prefix}.staging`;
  await deleteOpfsTree(staging);
  let files = 0;
  let written = 0;
  for (const entry of pkg.entries) {
    if (entry.isDir) continue;
    const data = decodeBase64(entry.dataBase64);
    await writeOpfsFile(`${staging}/${entry.path}`, data);
    files += 1;
    written += data.byteLength;
  }
  await writeOpfsFile(`${staging}/${PACKAGE_FILE_NAME}`, bytes);
  await copyOpfsTree(staging, prefix);
  await deleteOpfsTree(staging);

  if (existing) await preserveVersion(db, { workspaceId: workspace.id, installId: existing.id, nowMs: now });

  const installed = await installApp(db, {
    workspaceId: workspace.id,
    appId: pkg.manifest.id,
    version: pkg.manifest.version,
    manifestJson: JSON.stringify(pkg.manifest),
    contentHash: hexToBytes32(pkg.digestHex),
    signature: pkg.authorSignature ?? new Uint8Array(64),
    authorKeyFingerprint: fingerprint,
    installSource: source,
    bundlePath: prefix,
    packagePath: `${prefix}/${PACKAGE_FILE_NAME}`,
    registryId: options.registryId ?? null,
    dbRelativePath: appDatabasePath(workspace.slug, pkg.manifest.id),
    schemaVersion: 1,
    nowMs: now,
  });

  // An update that drops a permission must drop the grant with it.
  await revokeUndeclaredGrants(db, {
    workspaceId: workspace.id,
    appInstallId: installed.id,
    declared: pkg.manifest.permissions.required,
    nowMs: now,
  });
  await indexRecord(db, {
    workspaceId: workspace.id,
    kind: 'app',
    refId: installed.id,
    appInstallId: installed.id,
    title: installed.displayName ?? installed.name,
    body: `${installed.version} ${pkg.manifest.id}`,
  });

  return { app: installed, plan, bytes: written, files };
}

/** Roll back to a stored version, keeping the current one in history. */
export async function rollbackApp(
  db: WorkerHostDb,
  workspace: Workspace,
  installId: string,
  version: string,
  nowMs = Date.now(),
): Promise<InstalledApp> {
  const target = await listVersions(db, workspace.id, installId).then((versions) =>
    versions.find((candidate) => candidate.version === version),
  );
  if (!target) throw new Error('E-PACK-004 version is not available for rollback');
  await preserveVersion(db, { workspaceId: workspace.id, installId, nowMs });
  await rollbackToVersion(
    db,
    workspace.id,
    installId,
    {
      version: target.version,
      manifestJson: target.manifestJson,
      contentHash: target.contentHash,
      signature: target.signature,
      authorKeyFingerprint: target.authorKeyFingerprint,
      bundlePath: target.bundlePath,
      packagePath: target.packagePath,
    },
    nowMs,
  );
  const app = await getAppById(db, workspace.id, installId);
  if (!app) throw new Error('E-DATA-001 app vanished during rollback');
  return app;
}

export async function versionsOf(db: WorkerHostDb, workspaceId: string, installId: string): Promise<AppVersion[]> {
  return listVersions(db, workspaceId, installId);
}

/** Remove the row and every OPFS artifact; export must be offered first. */
export async function uninstallApp(db: WorkerHostDb, workspace: Workspace, installId: string): Promise<void> {
  const app = await uninstallAppRow(db, workspace.id, installId);
  await deleteOpfsTree(`apps/${workspace.slug}/${app.appId}`);
  await deleteOpfsTree(`workspaces/${workspace.slug}/apps/${app.appId}.db`);
}

/**
 * Duplicate an installed app: new row + copied bundle tree, new app id, no
 * permission grants, and an empty app database.
 */
export async function duplicateApp(
  db: WorkerHostDb,
  workspace: Workspace,
  installId: string,
  nowMs = Date.now(),
): Promise<InstalledApp> {
  const source = await getAppById(db, workspace.id, installId);
  if (!source) throw new Error('E-DATA-001 app not found in workspace');
  const newAppId = await nextCopyAppId(db, workspace.id, source.appId);
  const newInstallId = uuidv7(nowMs);
  const newBundlePath = bundlePrefix(workspace.slug, newAppId, source.version);
  const copied = await copyOpfsTree(source.bundlePath, newBundlePath);
  if (copied === 0) throw new Error('E-DATA-001 app bundle is missing on disk');
  const created = await duplicateAppRow(db, {
    workspaceId: workspace.id,
    source,
    newInstallId,
    newAppId,
    newBundlePath,
    newDbRelativePath: appDatabasePath(workspace.slug, newAppId),
    nowMs,
  });
  await indexRecord(db, {
    workspaceId: workspace.id,
    kind: 'app',
    refId: created.id,
    appInstallId: created.id,
    title: created.displayName ?? created.name,
    body: `${created.version} ${created.appId}`,
  });
  return created;
}

/** Rename only the local alias; the signed manifest is never touched. */
export async function renameApp(
  db: WorkerHostDb,
  workspace: Workspace,
  installId: string,
  name: string | null,
): Promise<InstalledApp> {
  await setDisplayName(db, workspace.id, installId, name);
  const app = await getAppById(db, workspace.id, installId);
  if (!app) throw new Error('E-DATA-001 app not found in workspace');
  await indexRecord(db, {
    workspaceId: workspace.id,
    kind: 'app',
    refId: app.id,
    appInstallId: app.id,
    title: app.displayName ?? app.name,
    body: app.appId,
  });
  return app;
}

/** The stored `.mapp` bytes for share/export, or `null` when they are gone. */
export async function exportPackage(db: WorkerHostDb, workspace: Workspace, installId: string): Promise<Uint8Array | null> {
  const app = await getAppById(db, workspace.id, installId);
  if (!app) return null;
  const path = app.packagePath ?? `${app.bundlePath}/${PACKAGE_FILE_NAME}`;
  return readOpfsFile(path);
}

/** Files under an installed app's bundle prefix, for the storage inspector. */
export async function bundleFiles(
  workspace: Workspace,
  app: InstalledApp,
): Promise<Array<{ path: string; bytes: number }>> {
  const prefix = app.bundlePath.replace(/\/$/, '');
  const files = await readOpfsTree(prefix);
  return files.map((file) => ({
    path: file.path.slice(prefix.length).replace(/^\//, ''),
    bytes: Math.floor((file.base64.length * 3) / 4),
  }));
}

export async function packageChecksum(bytes: Uint8Array): Promise<string> {
  return sha256Hex(bytes);
}

export function packageToBase64(bytes: Uint8Array): string {
  return bytesToBase64(bytes);
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) out[index] = binary.charCodeAt(index);
  return out;
}

function hexToBytes32(hex: string): Uint8Array {
  const normalized = hex.length === 64 ? hex : hex.padEnd(64, '0').slice(0, 64);
  const out = new Uint8Array(32);
  for (let index = 0; index < 32; index += 1) {
    out[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16) || 0;
  }
  return out;
}

/** Short, stable author fingerprint derived from the verified digest. */
async function fingerprintOf(digestHex: string): Promise<string> {
  const digest = await sha256Hex(new TextEncoder().encode(digestHex));
  return `sha256:${digest.slice(0, 32)}`;
}
