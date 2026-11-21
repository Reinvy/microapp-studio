/**
 * In-memory handoff for a dropped `.mapp` file.
 *
 * A `File` cannot survive a route change through the URL, so the drop zone
 * stores the file here and navigates; the import screen takes it exactly once.
 * Nothing is serialized to storage.
 */

let pending: File | null = null;

export function setPendingImport(file: File): void {
  pending = file;
}

/** Remove and return the pending file; a second call returns `null`. */
export function takePendingImport(): File | null {
  const file = pending;
  pending = null;
  return file;
}
