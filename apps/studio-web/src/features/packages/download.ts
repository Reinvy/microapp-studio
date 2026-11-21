/**
 * Download a package or export payload from a user action.
 *
 * Kept beside the packages feature so both the list page and the import screen
 * save files the same way (blob → object URL → temporary anchor).
 */

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Save the original `.mapp` bytes with the app id as the filename. */
export function downloadPackage(bytes: Uint8Array, appId: string): void {
  downloadBlob(new Blob([bytes as unknown as BlobPart], { type: 'application/zip' }), `${appId}.mapp`);
}

/** `abcdef…123456` — keeps long fingerprints readable in one line. */
export function truncateMiddle(value: string, head = 20, tail = 10): string {
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}
