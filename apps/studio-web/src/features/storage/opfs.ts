/**
 * OPFS helpers for the host: reading app database files for backup and writing
 * them back on restore. Paths are relative to the OPFS root.
 */

export interface OpfsFile {
  path: string;
  base64: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) out[index] = binary.charCodeAt(index);
  return out;
}

interface DirectoryIterator {
  values(): AsyncIterableIterator<FileSystemHandle>;
}

async function walk(
  directory: FileSystemDirectoryHandle,
  prefix: string,
  out: OpfsFile[],
): Promise<void> {
  const iterator = (directory as unknown as DirectoryIterator).values();
  for await (const handle of iterator) {
    const name = handle.name;
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === 'directory') {
      await walk(handle as FileSystemDirectoryHandle, path, out);
      continue;
    }
    const file = await (handle as FileSystemFileHandle).getFile();
    out.push({ path, base64: toBase64(new Uint8Array(await file.arrayBuffer())) });
  }
}

/** Read every file under `workspaces/` (app databases and snapshots). */
export async function readWorkspaceFiles(): Promise<OpfsFile[]> {
  const root = await navigator.storage.getDirectory();
  const files: OpfsFile[] = [];
  try {
    const workspaces = await root.getDirectoryHandle('workspaces');
    await walk(workspaces, 'workspaces', files);
  } catch {
    return [];
  }
  return files;
}

/** Write backup files back under the OPFS root (used by restore). */
export async function writeOpfsFiles(files: OpfsFile[]): Promise<number> {
  const root = await navigator.storage.getDirectory();
  let written = 0;
  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean);
    let directory = root;
    for (const segment of segments.slice(0, -1)) {
      directory = await directory.getDirectoryHandle(segment, { create: true });
    }
    const name = segments.at(-1);
    if (!name) continue;
    const handle = await directory.getFileHandle(name, { create: true });
    const stream = await handle.createWritable();
    await stream.write(fromBase64(file.base64) as unknown as BufferSource);
    await stream.close();
    written += 1;
  }
  return written;
}

export function opfsFilesToMap(files: OpfsFile[]): Record<string, string> {
  return Object.fromEntries(files.map((file) => [file.path, file.base64]));
}

export function mapToOpfsFiles(map: Record<string, string>): OpfsFile[] {
  return Object.entries(map).map(([path, base64]) => ({ path, base64 }));
}

// ---------------------------------------------------------------------------
// Generic tree helpers used by install, uninstall, duplicate, and restore
// ---------------------------------------------------------------------------

async function rootDirectory(): Promise<FileSystemDirectoryHandle> {
  return navigator.storage.getDirectory();
}

/** Resolve a directory handle, creating intermediate segments when asked. */
async function directoryFor(
  segments: string[],
  create: boolean,
): Promise<FileSystemDirectoryHandle> {
  let directory = await rootDirectory();
  for (const segment of segments) {
    directory = await directory.getDirectoryHandle(segment, { create });
  }
  return directory;
}

/** Write one file at a path relative to the OPFS root. */
export async function writeOpfsFile(path: string, bytes: Uint8Array): Promise<void> {
  const segments = path.split('/').filter(Boolean);
  const name = segments.pop();
  if (!name) throw new Error('E-DATA-001 empty OPFS path');
  const directory = await directoryFor(segments, true);
  const handle = await directory.getFileHandle(name, { create: true });
  const stream = await handle.createWritable();
  await stream.write(bytes as unknown as BufferSource);
  await stream.close();
}

/** Read one file, or `null` when it does not exist. */
export async function readOpfsFile(path: string): Promise<Uint8Array | null> {
  const segments = path.split('/').filter(Boolean);
  const name = segments.pop();
  if (!name) return null;
  try {
    const directory = await directoryFor(segments, false);
    const handle = await directory.getFileHandle(name);
    const file = await handle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch {
    return null;
  }
}

export async function opfsFileExists(path: string): Promise<boolean> {
  return (await readOpfsFile(path)) !== null;
}

/** Delete a file or a whole subtree; missing paths are ignored. */
export async function deleteOpfsTree(path: string): Promise<void> {
  const segments = path.split('/').filter(Boolean);
  const name = segments.pop();
  if (!name) return;
  try {
    const directory = await directoryFor(segments, false);
    await directory.removeEntry(name, { recursive: true });
  } catch {
    // Already gone is success.
  }
}

/** Read every file under a path relative to the OPFS root. */
export async function readOpfsTree(path: string): Promise<OpfsFile[]> {
  const segments = path.split('/').filter(Boolean);
  const files: OpfsFile[] = [];
  try {
    const directory = await directoryFor(segments, false);
    await walk(directory, segments.join('/'), files);
  } catch {
    return [];
  }
  return files;
}

/** Copy a subtree; returns the number of files copied. */
export async function copyOpfsTree(from: string, to: string): Promise<number> {
  const files = await readOpfsTree(from);
  for (const file of files) {
    const suffix = file.path.slice(from.replace(/\/$/, '').length).replace(/^\//, '');
    await writeOpfsFile(`${to.replace(/\/$/, '')}/${suffix}`, fromBase64(file.base64));
  }
  return files.length;
}

/** Remove every file in a subtree and the directory itself. */
export async function removeOpfsDir(path: string): Promise<void> {
  await deleteOpfsTree(path);
}
