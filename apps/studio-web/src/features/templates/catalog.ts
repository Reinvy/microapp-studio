/**
 * Bundled template catalog.
 *
 * Eight templates across four categories, shipped in the bundle — no network
 * fetch, no index. Each definition carries a complete root MUIP node so the
 * gallery can render a real preview and "Pakai template" can create a draft with
 * one click.
 *
 * Every `nodes` array holds exactly one `Stack` root (`direction: 'column'`,
 * `gap: 'md'`) whose children are the template layout. Only catalog components
 * and documented props are used; `features/templates/__tests__/catalog.test.ts`
 * validates every template with the MUIP validator at module test time.
 */

import type { MuipNode } from '@microapp/runtime-web';

export type TemplateCategory = 'kasir' | 'produktivitas' | 'inventaris' | 'survey';

export const TEMPLATE_CATEGORIES: readonly { id: TemplateCategory; label: string }[] = [
  { id: 'kasir', label: 'Kasir' },
  { id: 'produktivitas', label: 'Produktivitas' },
  { id: 'inventaris', label: 'Inventaris' },
  { id: 'survey', label: 'Survey' },
];

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  tags: string[];
  permissions: string[];
  sampleData: Record<string, unknown>;
  /** Exactly one root node. */
  nodes: [MuipNode];
}

const i18nName = (id: string): string => `templates.item.${id}.name`;
const i18nDescription = (id: string): string => `templates.item.${id}.description`;

/** Translation keys for a template's copy; the UI resolves them through `t`. */
export function templateCopyKeys(id: string): { name: string; description: string } {
  return { name: i18nName(id), description: i18nDescription(id) };
}

export const TEMPLATES: readonly TemplateDefinition[] = [
  {
    id: 'kasir-sederhana',
    name: 'Kasir Sederhana',
    description: 'Catat transaksi harian dengan total dan daftar item.',
    category: 'kasir',
    icon: 'receipt',
    tags: ['kasir', 'transaksi', 'harian'],
    permissions: ['storage.app'],
    sampleData: {
      total: 187500,
      items: [
        { nama: 'Kopi susu', jumlah: 2, harga: 18000 },
        { nama: 'Roti bakar', jumlah: 1, harga: 25000 },
      ],
    },
    nodes: [
      {
        type: 'Stack',
        id: 'root',
        props: { direction: 'column', gap: 'md' },
        children: [
          { type: 'Badge', id: 'status', props: { text: 'Kasir siap', tone: 'success', dot: true } },
          {
            type: 'StatCard',
            id: 'total',
            props: { label: 'Total hari ini', value: 'Rp187.500', delta: '+12%', deltaDirection: 'up' },
          },
          {
            type: 'DataTable',
            id: 'items',
            props: {
              caption: 'Item transaksi',
              columns: [
                { key: 'nama', label: 'Nama' },
                { key: 'jumlah', label: 'Jumlah', align: 'end' },
                { key: 'harga', label: 'Harga', align: 'end' },
              ],
              rows: [
                { nama: 'Kopi susu', jumlah: 2, harga: 18000 },
                { nama: 'Roti bakar', jumlah: 1, harga: 25000 },
              ],
              emptyLabel: 'Belum ada transaksi.',
            },
          },
          { type: 'Button', id: 'add', props: { label: 'Tambah transaksi', variant: 'primary' } },
        ],
      },
    ],
  },
  {
    id: 'kasir-warung',
    name: 'Kasir Warung',
    description: 'Input barang cepat dengan harga dan stok.',
    category: 'kasir',
    icon: 'store',
    tags: ['kasir', 'warung', 'stok'],
    permissions: ['storage.app'],
    sampleData: { nama: 'Beras 1 kg', harga: 14000 },
    nodes: [
      {
        type: 'Stack',
        id: 'root',
        props: { direction: 'column', gap: 'md' },
        children: [
          {
            type: 'Card',
            id: 'form',
            props: { title: 'Barang baru', description: 'Isi nama dan harga jual.', padding: 'md' },
            children: [
              { type: 'TextField', id: 'nama', props: { label: 'Nama barang', placeholder: 'Beras 1 kg', name: 'nama' } },
              {
                type: 'TextField',
                id: 'harga',
                props: { label: 'Harga jual', placeholder: '14000', name: 'harga', inputMode: 'numeric' },
              },
              { type: 'Switch', id: 'stok', props: { label: 'Stok tersedia', checked: true } },
            ],
          },
          { type: 'Button', id: 'save', props: { label: 'Simpan barang', variant: 'primary' } },
          {
            type: 'DataTable',
            id: 'list',
            props: {
              caption: 'Barang terdaftar',
              columns: [
                { key: 'nama', label: 'Nama' },
                { key: 'harga', label: 'Harga', align: 'end' },
              ],
              rows: [{ nama: 'Beras 1 kg', harga: 14000 }],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'daftar-tugas',
    name: 'Daftar Tugas',
    description: 'Kelola tugas harian dengan status dan prioritas.',
    category: 'produktivitas',
    icon: 'checklist',
    tags: ['tugas', 'todo', 'harian'],
    permissions: ['storage.app'],
    sampleData: { open: 3, done: 5 },
    nodes: [
      {
        type: 'Stack',
        id: 'root',
        props: { direction: 'column', gap: 'md' },
        children: [
          {
            type: 'Grid',
            id: 'stats',
            props: { gridColumns: 2, gap: 'sm' },
            children: [
              { type: 'StatCard', id: 'open', props: { label: 'Terbuka', value: '3' } },
              { type: 'StatCard', id: 'done', props: { label: 'Selesai', value: '5' } },
            ],
          },
          {
            type: 'TextField',
            id: 'new-task',
            props: { label: 'Tugas baru', placeholder: 'Tulis tugas', name: 'task' },
          },
          { type: 'Button', id: 'add', props: { label: 'Tambah tugas', variant: 'primary' } },
          {
            type: 'DataTable',
            id: 'tasks',
            props: {
              caption: 'Daftar tugas',
              columns: [
                { key: 'tugas', label: 'Tugas' },
                { key: 'prioritas', label: 'Prioritas' },
                { key: 'status', label: 'Status' },
              ],
              rows: [
                { tugas: 'Rekap penjualan', prioritas: 'tinggi', status: 'terbuka' },
                { tugas: 'Hubungi pemasok', prioritas: 'rendah', status: 'selesai' },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'catatan-harian',
    name: 'Catatan Harian',
    description: 'Simpan catatan singkat dengan tanggal lokal.',
    category: 'produktivitas',
    icon: 'note',
    tags: ['catatan', 'jurnal'],
    permissions: ['storage.app'],
    sampleData: { catatan: 'Stok gula tinggal 2 kg.' },
    nodes: [
      {
        type: 'Stack',
        id: 'root',
        props: { direction: 'column', gap: 'md' },
        children: [
          {
            type: 'TextArea',
            id: 'note',
            props: { label: 'Catatan hari ini', placeholder: 'Tulis catatan', lineCount: 6 },
          },
          { type: 'Button', id: 'save', props: { label: 'Simpan catatan', variant: 'primary' } },
          {
            type: 'Card',
            id: 'latest',
            props: { title: 'Catatan terakhir', padding: 'md' },
            children: [{ type: 'Alert', id: 'body', props: { text: 'Stok gula tinggal 2 kg.', tone: 'info' } }],
          },
        ],
      },
    ],
  },
  {
    id: 'absensi',
    name: 'Absensi',
    description: 'Catat kehadiran harian dengan ringkasan.',
    category: 'produktivitas',
    icon: 'calendar',
    tags: ['absensi', 'kehadiran'],
    permissions: ['storage.app'],
    sampleData: { hadir: 8, izin: 1 },
    nodes: [
      {
        type: 'Stack',
        id: 'root',
        props: { direction: 'column', gap: 'md' },
        children: [
          {
            type: 'Grid',
            id: 'stats',
            props: { gridColumns: 2, gap: 'sm' },
            children: [
              { type: 'StatCard', id: 'hadir', props: { label: 'Hadir', value: '8' } },
              { type: 'StatCard', id: 'izin', props: { label: 'Izin', value: '1' } },
            ],
          },
          { type: 'SearchField', id: 'search', props: { label: 'Cari nama', placeholder: 'Cari nama', name: 'nama' } },
          {
            type: 'DataTable',
            id: 'people',
            props: {
              caption: 'Kehadiran hari ini',
              columns: [
                { key: 'nama', label: 'Nama' },
                { key: 'status', label: 'Status' },
              ],
              rows: [
                { nama: 'Siti', status: 'hadir' },
                { nama: 'Budi', status: 'izin' },
              ],
            },
          },
          { type: 'Button', id: 'mark', props: { label: 'Tandai hadir', variant: 'primary' } },
        ],
      },
    ],
  },
  {
    id: 'inventaris-gudang',
    name: 'Inventaris Gudang',
    description: 'Pantau stok gudang dengan pencarian cepat.',
    category: 'inventaris',
    icon: 'box',
    tags: ['inventaris', 'gudang', 'stok'],
    permissions: ['storage.app'],
    sampleData: { sku: 42 },
    nodes: [
      {
        type: 'Stack',
        id: 'root',
        props: { direction: 'column', gap: 'md' },
        children: [
          { type: 'StatCard', id: 'sku-count', props: { label: 'SKU aktif', value: '42' } },
          { type: 'SearchField', id: 'search', props: { label: 'Cari barang', placeholder: 'Cari barang', name: 'q' } },
          {
            type: 'DataTable',
            id: 'stock',
            props: {
              caption: 'Stok gudang',
              columns: [
                { key: 'barang', label: 'Barang' },
                { key: 'jumlah', label: 'Jumlah', align: 'end' },
                { key: 'lokasi', label: 'Lokasi' },
              ],
              rows: [
                { barang: 'Beras', jumlah: 120, lokasi: 'Rak A' },
                { barang: 'Minyak', jumlah: 36, lokasi: 'Rak B' },
              ],
            },
          },
          { type: 'Button', id: 'add', props: { label: 'Tambah barang', variant: 'primary' } },
        ],
      },
    ],
  },
  {
    id: 'stok-minimum',
    name: 'Stok Minimum',
    description: 'Peringatan barang yang mendekati batas minimum.',
    category: 'inventaris',
    icon: 'alert',
    tags: ['stok', 'peringatan'],
    permissions: ['storage.app'],
    sampleData: { below: 2 },
    nodes: [
      {
        type: 'Stack',
        id: 'root',
        props: { direction: 'column', gap: 'md' },
        children: [
          {
            type: 'Alert',
            id: 'warning',
            props: { title: '2 barang di bawah minimum', text: 'Segera lakukan pemesanan ulang.', tone: 'warning' },
          },
          { type: 'Progress', id: 'coverage', props: { label: 'Cakupan stok', percent: 68 } },
          {
            type: 'DataTable',
            id: 'low',
            props: {
              caption: 'Barang di bawah minimum',
              columns: [
                { key: 'barang', label: 'Barang' },
                { key: 'sisa', label: 'Sisa', align: 'end' },
                { key: 'minimum', label: 'Minimum', align: 'end' },
              ],
              rows: [
                { barang: 'Gula', sisa: 2, minimum: 10 },
                { barang: 'Kopi', sisa: 4, minimum: 12 },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'survey-warga',
    name: 'Survey Warga',
    description: 'Kumpulkan jawaban warga dengan pilihan sederhana.',
    category: 'survey',
    icon: 'survey',
    tags: ['survey', 'warga', 'data'],
    permissions: ['storage.app'],
    sampleData: { responden: 24 },
    nodes: [
      {
        type: 'Stack',
        id: 'root',
        props: { direction: 'column', gap: 'md' },
        children: [
          { type: 'StatCard', id: 'responden', props: { label: 'Responden', value: '24' } },
          { type: 'TextField', id: 'name', props: { label: 'Nama warga', placeholder: 'Nama lengkap', name: 'nama' } },
          {
            type: 'RadioGroup',
            id: 'satisfaction',
            props: {
              label: 'Kepuasan layanan',
              options: [
                { label: 'Puas', value: 'puas' },
                { label: 'Cukup', value: 'cukup' },
                { label: 'Kurang', value: 'kurang' },
              ],
              checked: 'puas',
            },
          },
          { type: 'Button', id: 'submit', props: { label: 'Kirim jawaban', variant: 'primary' } },
        ],
      },
    ],
  },
];

export function templateById(id: string): TemplateDefinition | undefined {
  return TEMPLATES.find((template) => template.id === id);
}

export function templatesByCategory(category: TemplateCategory | 'all'): TemplateDefinition[] {
  if (category === 'all') return [...TEMPLATES];
  return TEMPLATES.filter((template) => template.category === category);
}

/** Case-insensitive match over name, description, and tags. */
export function searchTemplates(term: string): TemplateDefinition[] {
  const needle = term.trim().toLowerCase();
  if (needle.length === 0) return [...TEMPLATES];
  return TEMPLATES.filter((template) =>
    [template.name, template.description, ...template.tags].some((value) =>
      value.toLowerCase().includes(needle),
    ),
  );
}

/** The single root node a template contributes to a new draft. */
export function templateRoot(template: TemplateDefinition): MuipNode {
  return structuredClone(template.nodes[0]);
}

/** Category of a bundled template id, or `null` when it does not exist. */
export function templateCategory(id: string): TemplateCategory | null {
  return templateById(id)?.category ?? null;
}
