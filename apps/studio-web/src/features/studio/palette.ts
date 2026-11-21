/**
 * Builder palette.
 *
 * The default palette is the 48 core clay components; the 72 advanced ones stay
 * reachable behind the Advanced toggle but are never offered as defaults. The
 * same module answers "can this parent take children?" and "what props should a
 * fresh node start with?" so drag-and-drop, click-to-add, and the inspector all
 * agree.
 */

import {
  COMPONENT_CATALOG,
  canContainChildren,
  type CatalogComponent,
} from '@microapp/runtime-web';
import { createNode, nextNodeId } from './document';
import type { MuipNode } from '@microapp/runtime-web';

export interface PaletteItem extends CatalogComponent {
  allowsChildren: boolean;
  defaultProps: Record<string, unknown>;
}

/** Sensible, valid starting props per component family. */
const DEFAULT_PROPS: Readonly<Record<string, Record<string, unknown>>> = {
  Stack: { direction: 'column', gap: 'md' },
  Grid: { gridColumns: 2, gap: 'sm' },
  Card: { title: 'Kartu', padding: 'md' },
  Button: { label: 'Tombol', variant: 'primary' },
  IconButton: { label: 'Aksi', name: 'plus' },
  TextField: { label: 'Teks', placeholder: 'Teks', name: 'field' },
  TextArea: { label: 'Catatan', lineCount: 4 },
  SearchField: { label: 'Cari', placeholder: 'Cari', name: 'q' },
  Select: { label: 'Pilih', options: [{ label: 'Pilihan', value: 'a' }] },
  Combobox: { label: 'Pilih', options: [{ label: 'Pilihan', value: 'a' }] },
  Checkbox: { label: 'Setuju', checked: false },
  RadioGroup: { label: 'Pilihan', options: [{ label: 'A', value: 'a' }] },
  Switch: { label: 'Aktif', checked: false },
  Slider: { label: 'Nilai', min: 0, max: 100, step: 1, value: 50 },
  DataTable: {
    caption: 'Daftar',
    columns: [
      { key: 'nama', label: 'Nama' },
      { key: 'status', label: 'Status' },
    ],
    rows: [{ nama: 'Contoh', status: 'baru' }],
  },
  StatCard: { label: 'Metrik', value: '0' },
  Badge: { text: 'Label', tone: 'default' },
  Avatar: { label: 'Pengguna', initials: 'PG' },
  Progress: { label: 'Progres', percent: 40 },
  EmptyState: { title: 'Belum ada data', description: 'Tambahkan data pertama.' },
  Alert: { title: 'Perhatian', text: 'Detail pesan.', tone: 'info' },
  Toast: { text: 'Tersimpan' },
  Banner: { title: 'Informasi', tone: 'info' },
  FieldError: { message: 'Wajib diisi' },
  AppIcon: { label: 'App', initials: 'AP' },
  PromptInput: { label: 'Prompt', maxLength: 2000, submitLabel: 'Kirim' },
  AIStatus: { state: 'idle' },
  SuggestionChip: { label: 'Saran', suggestions: [] },
  AIError: { text: 'Gagal menghasilkan', retryLabel: 'Coba lagi' },
  PermissionBadge: { permission: 'storage.app', granted: 'declared' },
  StorageMeter: { label: 'Penyimpanan', usedBytes: 0, quotaBytes: 0 },
  ShareSheet: { title: 'Bagikan', fileName: 'app.mapp' },
  TabBar: { activeId: 'tab-1' },
  Sidebar: { activeId: 'nav-1' },
  Dock: { activeId: 'nav-1' },
  Breadcrumb: { items: [{ label: 'Beranda', href: '/' }] },
  Stepper: { activeStep: 0, steps: [{ label: 'Langkah 1' }] },
  ScrollArea: { axis: 'vertical' },
};

export function defaultPropsFor(type: string): Record<string, unknown> {
  return { ...(DEFAULT_PROPS[type] ?? {}) };
}

function toItem(component: CatalogComponent): PaletteItem {
  return {
    ...component,
    allowsChildren: canContainChildren(component.name),
    defaultProps: defaultPropsFor(component.name),
  };
}

const ITEMS: PaletteItem[] = COMPONENT_CATALOG.map(toItem);
const BY_NAME = new Map(ITEMS.map((item) => [item.name, item]));

/** Palette contents: core only by default, everything when advanced is on. */
export function paletteItems(options: { advanced: boolean; category?: string; query?: string } = { advanced: false }): PaletteItem[] {
  const needle = options.query?.trim().toLowerCase() ?? '';
  return ITEMS.filter((item) => {
    if (!options.advanced && item.level !== 'core') return false;
    if (options.category && options.category !== 'all' && item.category !== options.category) return false;
    if (needle.length === 0) return true;
    return item.name.toLowerCase().includes(needle);
  });
}

export function paletteItem(type: string): PaletteItem | undefined {
  return BY_NAME.get(type);
}

/** A new node with its default props and a document-unique id. */
export function nodeFromPalette(type: string, root: MuipNode): MuipNode | null {
  const item = BY_NAME.get(type);
  if (!item) return null;
  const props = item.defaultProps;
  return {
    ...createNode(type, root),
    id: nextNodeId(type, root),
    ...(Object.keys(props).length > 0 ? { props } : {}),
  };
}
