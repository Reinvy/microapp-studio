/**
 * Permission catalog.
 *
 * One entry per permission declared by a manifest. `PermissionDialog`, the
 * Settings permission list, and the import preview all read this map, so the
 * label, the plain-language reason, and the risk tier can never drift between
 * surfaces.
 *
 * `consent: false` marks a permission that is granted implicitly once declared
 * (`storage.app` owns the app's own database and nothing else).
 */

import type { Locale } from '@/i18n';

export type PermissionRisk = 'low' | 'medium' | 'high';

export interface PermissionDefinition {
  id: string;
  label: string;
  reason: string;
  risk: PermissionRisk;
  /** True when the first use needs an explicit user decision. */
  consent: boolean;
}

const CATALOG: Record<string, Record<Locale, Omit<PermissionDefinition, 'id' | 'risk' | 'consent'>>> = {
  'storage.app': {
    'id-ID': { label: 'Penyimpanan app', reason: 'Menyimpan data app ini di perangkat Anda.' },
    'en-US': { label: 'App storage', reason: 'Stores this app’s data on your device.' },
  },
  'clipboard.read': {
    'id-ID': { label: 'Baca papan klip', reason: 'Membaca teks yang Anda salin saat app aktif.' },
    'en-US': { label: 'Read clipboard', reason: 'Reads text you copied while the app is active.' },
  },
  'clipboard.write': {
    'id-ID': { label: 'Tulis papan klip', reason: 'Menyalin teks ke papan klip atas tindakan Anda.' },
    'en-US': { label: 'Write clipboard', reason: 'Copies text to the clipboard when you ask it to.' },
  },
  'notifications.local': {
    'id-ID': { label: 'Notifikasi lokal', reason: 'Menampilkan pengingat di perangkat ini.' },
    'en-US': { label: 'Local notifications', reason: 'Shows reminders on this device.' },
  },
  'files.pick': {
    'id-ID': { label: 'Pilih berkas', reason: 'Membuka pemilih berkas dan membaca berkas yang Anda pilih.' },
    'en-US': { label: 'Pick files', reason: 'Opens the file picker and reads the file you choose.' },
  },
  'network.fetch': {
    'id-ID': {
      label: 'Akses jaringan',
      reason: 'Menghubungi origin yang dideklarasikan app. Diblokir saat Offline Cage aktif.',
    },
    'en-US': {
      label: 'Network access',
      reason: 'Contacts the origins the app declares. Blocked while Offline Cage is on.',
    },
  },
  'vault.read': {
    'id-ID': { label: 'Baca item vault', reason: 'Membaca item vault yang Anda izinkan untuk app ini.' },
    'en-US': { label: 'Read vault item', reason: 'Reads the vault item you allow for this app.' },
  },
  'share.export': {
    'id-ID': { label: 'Ekspor paket', reason: 'Menyimpan berkas .mapp atas tindakan Anda.' },
    'en-US': { label: 'Export package', reason: 'Saves a .mapp file when you ask it to.' },
  },
};

const RISK: Record<string, PermissionRisk> = {
  'storage.app': 'low',
  'clipboard.read': 'low',
  'clipboard.write': 'low',
  'notifications.local': 'medium',
  'files.pick': 'medium',
  'network.fetch': 'high',
  'vault.read': 'high',
  'share.export': 'low',
};

/** `storage.app` is declared-and-granted, never consented (SEC-006). */
const NO_CONSENT = new Set(['storage.app']);

export const PERMISSION_IDS = Object.keys(CATALOG);

export function permissionDefinition(id: string, locale: Locale): PermissionDefinition {
  const entry = CATALOG[id];
  const risk = RISK[id] ?? 'medium';
  const consent = !NO_CONSENT.has(id);
  if (!entry) {
    // Unknown permissions must still render a usable label instead of throwing.
    return { id, label: id, reason: '', risk, consent };
  }
  const copy = entry[locale] ?? entry['id-ID'];
  return { id, label: copy.label, reason: copy.reason, risk, consent };
}

export function allPermissions(locale: Locale): PermissionDefinition[] {
  return PERMISSION_IDS.map((id) => permissionDefinition(id, locale));
}

export function requiresConsent(id: string): boolean {
  return !NO_CONSENT.has(id);
}

export function isKnownPermission(id: string): boolean {
  return id in CATALOG;
}

/** Risk label used by badges; never colour-only. */
export function riskLabel(risk: PermissionRisk, locale: Locale): string {
  const labels: Record<PermissionRisk, Record<Locale, string>> = {
    low: { 'id-ID': 'Risiko rendah', 'en-US': 'Low risk' },
    medium: { 'id-ID': 'Risiko sedang', 'en-US': 'Medium risk' },
    high: { 'id-ID': 'Risiko tinggi', 'en-US': 'High risk' },
  };
  return labels[risk][locale];
}
