---
id: DESIGN-COMPONENTS
title: Katalog Komponen
status: accepted
owner: design
prd_refs: ["§5 F3", "§6 UX dan Design"]
---

# Katalog Komponen

Katalog ini menetapkan 120 komponen MicroApp Design System (MADS) yang boleh dipakai Studio, shell, dan micro-app. Nama komponen adalah **nama tipe MUIP yang sama persis** dengan `componentType` pada [ui-node.v1.schema.json](../03-specs/schemas/ui-node.v1.schema.json) dan daftar tipe di [ui-protocol.md](../03-specs/ui-protocol.md). Nama di luar daftar ini MUST ditolak renderer, bukan dipetakan diam-diam.

Katalog adalah sumber kebenaran visual dan perilaku. Setiap komponen web MUST tersedia di `packages/ui-kit` (host) atau dirender MUIP (micro-app) dengan anatomi, state, dan semantik aksesibilitas yang sama. Token warna, tipografi, spacing, radius, shadow, dan motion mengikuti [design-system.md](design-system.md); nilai visual hardcoded MUST NOT ada.

**48 komponen core clay** dispesifikasikan penuh dan menjadi default palette builder. **72 komponen advanced** tetap terdaftar, dapat diaktifkan lewat toggle Advanced, dan memiliki use case serta token utama. Jumlah, ID, nama, kategori, dan urutan tabel tidak boleh berubah tanpa memperbarui `scripts/generate-catalog.mjs` dan `packages/runtime-web/src/muip/catalog.generated.ts`.

## 1. Konvensi

| Kode | Kategori | Jumlah | Core | Rentang ID |
|---|---|---|---|---|
| `LAY` | Layout | 12 | 7 | `MADS-LAY-01`..`MADS-LAY-12` |
| `NAV` | Navigation | 10 | 6 | `MADS-NAV-01`..`MADS-NAV-10` |
| `INP` | Input | 20 | 11 | `MADS-INP-01`..`MADS-INP-20` |
| `DATA` | Data | 18 | 9 | `MADS-DATA-01`..`MADS-DATA-18` |
| `FBK` | Feedback | 10 | 7 | `MADS-FBK-01`..`MADS-FBK-10` |
| `MED` | Media | 10 | 0 | `MADS-MED-01`..`MADS-MED-10` |
| `DOM` | Domain | 20 | 0 | `MADS-DOM-01`..`MADS-DOM-20` |
| `PLT` | Platform | 10 | 4 | `MADS-PLT-01`..`MADS-PLT-10` |
| `AI` | AI | 10 | 4 | `MADS-AI-01`..`MADS-AI-10` |

Aturan ID: `MADS-<CAT>-<NN>`. ID stabil; mengganti nama tampilan tidak mengubah ID. Setiap komponen wajib memiliki entri di tabel §2 sebelum dipakai layar mana pun.

## 2. Ringkasan 120 Komponen

| ID | Nama | Kategori | Tingkat | Use case | Token utama |
|---|---|---|---|---|---|
| MADS-LAY-01 | AppShell | Layout | core | Kerangka layar dengan navigasi, header, konten, dan slot overlay. | `--mads-color-bg` |
| MADS-LAY-02 | Stack | Layout | core | Menyusun anak secara vertikal atau horizontal dengan gap token. | `--mads-space-4` |
| MADS-LAY-03 | Grid | Layout | core | Grid 12 kolom responsif untuk konten dan kartu. | `--mads-space-6` |
| MADS-LAY-04 | SplitPane | Layout | advanced | Dua panel yang dapat diubah ukurannya untuk inspeksi. | `--mads-color-border` |
| MADS-LAY-05 | Card | Layout | core | Permukaan clay untuk mengelompokkan konten terkait. | `--mads-clay-shadow-1` |
| MADS-LAY-06 | Sheet | Layout | core | Panel bawah dengan drag handle untuk aksi dan detail. | `--mads-radius-clay-xl` |
| MADS-LAY-07 | Drawer | Layout | advanced | Panel samping sementara untuk navigasi sekunder. | `--mads-clay-shadow-3` |
| MADS-LAY-08 | Modal | Layout | core | Dialog terpusat dengan backdrop untuk keputusan fokus. | `--mads-clay-shadow-3` |
| MADS-LAY-09 | Popover | Layout | advanced | Konten melayang yang ditambatkan ke pemicu. | `--mads-clay-shadow-2` |
| MADS-LAY-10 | Toolbar | Layout | advanced | Deret aksi kontekstual di atas konten. | `--mads-color-surface` |
| MADS-LAY-11 | SafeArea | Layout | advanced | Padding aman untuk notch dan home indicator. | `--mads-space-4` |
| MADS-LAY-12 | ScrollArea | Layout | core | Area scroll dengan scrollbar tipis dan fade tepi. | `--mads-color-border` |
| MADS-NAV-01 | Sidebar | Navigation | core | Navigasi utama desktop selebar 264 px. | `--mads-color-surface` |
| MADS-NAV-02 | TabBar | Navigation | core | Tab horizontal untuk berpindah subview. | `--mads-color-border` |
| MADS-NAV-03 | Breadcrumb | Navigation | core | Jejak lokasi hierarkis dengan tautan. | `--mads-color-muted` |
| MADS-NAV-04 | CommandPalette | Navigation | core | Pencarian aksi dan konten dengan Cmd/Ctrl+K. | `--mads-clay-shadow-3` |
| MADS-NAV-05 | Pagination | Navigation | advanced | Navigasi halaman untuk daftar panjang. | `--mads-color-border` |
| MADS-NAV-06 | Stepper | Navigation | core | Progres langkah linier dengan status per langkah. | `--mads-color-primary` |
| MADS-NAV-07 | Menu | Navigation | advanced | Daftar aksi kontekstual. | `--mads-color-surface-raised` |
| MADS-NAV-08 | Dock | Navigation | core | Navigasi bawah mobile dengan empat item dan FAB. | `--mads-clay-shadow-2` |
| MADS-NAV-09 | WorkspaceSwitcher | Navigation | advanced | Berpindah workspace saat pengguna memiliki lebih dari satu. | `--mads-color-primary` |
| MADS-NAV-10 | BackButton | Navigation | advanced | Kembali ke layar sebelumnya dengan label konteks. | `--mads-color-fg` |
| MADS-INP-01 | Button | Input | core | Aksi utama atau sekunder dengan state lengkap. | `--mads-color-primary` |
| MADS-INP-02 | IconButton | Input | core | Aksi ikon dengan label aksesibel wajib. | `--mads-radius-clay-md` |
| MADS-INP-03 | TextField | Input | core | Input teks satu baris dengan label dan error. | `--mads-color-surface-raised` |
| MADS-INP-04 | TextArea | Input | core | Input teks multi-baris dengan hitungan karakter. | `--mads-color-surface-raised` |
| MADS-INP-05 | NumberField | Input | advanced | Input angka dengan stepper dan validasi rentang. | `--mads-color-surface-raised` |
| MADS-INP-06 | SearchField | Input | core | Input pencarian dengan clear dan debounce. | `--mads-color-surface-raised` |
| MADS-INP-07 | Select | Input | core | Pemilihan satu opsi dari daftar tertutup. | `--mads-color-surface-raised` |
| MADS-INP-08 | Combobox | Input | core | Input dengan saran dan pencarian fuzzy. | `--mads-color-surface-raised` |
| MADS-INP-09 | MultiSelect | Input | advanced | Pemilihan beberapa opsi dengan chip ringkasan. | `--mads-color-surface-raised` |
| MADS-INP-10 | Checkbox | Input | core | Pilihan boolean tunggal atau grup. | `--mads-color-primary` |
| MADS-INP-11 | RadioGroup | Input | core | Pilihan tunggal dari beberapa opsi yang terlihat. | `--mads-color-primary` |
| MADS-INP-12 | Switch | Input | core | Toggle on/off yang langsung berlaku. | `--mads-color-primary` |
| MADS-INP-13 | Slider | Input | core | Pemilihan nilai numerik dalam rentang. | `--mads-color-primary` |
| MADS-INP-14 | RangeSlider | Input | advanced | Pemilihan rentang bawah dan atas. | `--mads-color-primary` |
| MADS-INP-15 | DatePicker | Input | advanced | Pemilihan tanggal dengan kalender. | `--mads-color-surface-raised` |
| MADS-INP-16 | TimePicker | Input | advanced | Pemilihan waktu dengan input terpisah. | `--mads-color-surface-raised` |
| MADS-INP-17 | ColorPicker | Input | advanced | Pemilihan warna dari token yang diizinkan. | `--mads-color-primary` |
| MADS-INP-18 | FilePicker | Input | advanced | Pemilihan file lokal dengan batas tipe dan ukuran. | `--mads-color-border-strong` |
| MADS-INP-19 | SignaturePad | Input | advanced | Gambar tanda tangan dengan kanvas dan clear. | `--mads-color-fg` |
| MADS-INP-20 | OTPInput | Input | advanced | Input kode sekali pakai dengan auto-advance. | `--mads-color-surface-raised` |
| MADS-DATA-01 | DataTable | Data | core | Tabel data dengan sort, filter, dan seleksi baris. | `--mads-color-surface` |
| MADS-DATA-02 | VirtualList | Data | core | Daftar panjang dengan virtualisasi baris. | `--mads-color-surface` |
| MADS-DATA-03 | TreeView | Data | advanced | Struktur hierarkis yang dapat dibuka-tutup. | `--mads-color-fg` |
| MADS-DATA-04 | KanbanBoard | Data | advanced | Kolom status dengan kartu yang dapat dipindah. | `--mads-color-surface` |
| MADS-DATA-05 | Calendar | Data | core | Tampilan bulan dengan event dan pemilihan tanggal. | `--mads-color-primary` |
| MADS-DATA-06 | Timeline | Data | advanced | Urutan kejadian kronologis. | `--mads-color-border` |
| MADS-DATA-07 | LineChart | Data | advanced | Tren metrik dari waktu ke waktu. | `--mads-color-info` |
| MADS-DATA-08 | BarChart | Data | advanced | Perbandingan kategori. | `--mads-color-primary` |
| MADS-DATA-09 | PieChart | Data | advanced | Komposisi proporsi. | `--mads-color-accent` |
| MADS-DATA-10 | AreaChart | Data | advanced | Tren dengan area terisi. | `--mads-color-info` |
| MADS-DATA-11 | StatCard | Data | core | Angka ringkas dengan label dan tren. | `--mads-clay-shadow-1` |
| MADS-DATA-12 | Badge | Data | core | Label status kecil dengan ikon dan teks. | `--mads-color-surface-raised` |
| MADS-DATA-13 | Tag | Data | advanced | Penanda kategori yang dapat dihapus. | `--mads-color-border` |
| MADS-DATA-14 | Avatar | Data | core | Representasi pengguna atau app. | `--mads-radius-full` |
| MADS-DATA-15 | Tooltip | Data | core | Keterangan singkat saat hover atau fokus. | `--mads-color-fg` |
| MADS-DATA-16 | Progress | Data | core | Progres determinat atau indeterminat. | `--mads-color-primary` |
| MADS-DATA-17 | Skeleton | Data | advanced | Placeholder loading tanpa layout shift. | `--mads-color-border` |
| MADS-DATA-18 | EmptyState | Data | core | Keadaan kosong dengan penjelasan dan aksi. | `--mads-color-muted` |
| MADS-FBK-01 | Alert | Feedback | core | Pesan status yang menetap sampai ditutup. | `--mads-color-warning` |
| MADS-FBK-02 | Toast | Feedback | core | Notifikasi singkat yang dapat dibatalkan. | `--mads-clay-shadow-2` |
| MADS-FBK-03 | Banner | Feedback | core | Pesan kontekstual di atas konten. | `--mads-color-info` |
| MADS-FBK-04 | FieldError | Feedback | core | Pesan validasi yang terhubung ke field. | `--mads-color-error` |
| MADS-FBK-05 | ConfirmDialog | Feedback | core | Konfirmasi aksi destruktif dengan fokus aman. | `--mads-color-error` |
| MADS-FBK-06 | PermissionDialog | Feedback | advanced | Consent JIT dengan pilihan sekali, selalu, tolak. | `--mads-color-primary` |
| MADS-FBK-07 | ErrorBoundary | Feedback | core | Kartu pemulihan saat app crash. | `--mads-color-error` |
| MADS-FBK-08 | OfflineBanner | Feedback | core | Status offline dan cache yang tersedia. | `--mads-color-warning` |
| MADS-FBK-09 | SyncStatus | Feedback | advanced | Status operasi lokal yang tertunda. | `--mads-color-muted` |
| MADS-FBK-10 | LoadingOverlay | Feedback | advanced | Menutupi area selama operasi yang tidak dapat dibatalkan. | `--mads-color-surface` |
| MADS-MED-01 | Image | Media | advanced | Menampilkan gambar dengan rasio dan placeholder. | `--mads-radius-clay-md` |
| MADS-MED-02 | VideoPlayer | Media | advanced | Memutar video lokal atau URL yang diizinkan. | `--mads-color-fg` |
| MADS-MED-03 | AudioPlayer | Media | advanced | Memutar audio dengan kontrol minimal. | `--mads-color-primary` |
| MADS-MED-04 | CameraCapture | Media | advanced | Mengambil foto lewat kamera dengan izin. | `--mads-color-fg` |
| MADS-MED-05 | QRScanner | Media | advanced | Memindai kode QR lewat kamera. | `--mads-color-fg` |
| MADS-MED-06 | BarcodeScanner | Media | advanced | Memindai barcode dengan kamera. | `--mads-color-fg` |
| MADS-MED-07 | MapView | Media | advanced | Menampilkan peta statis atau tautan eksternal. | `--mads-color-info` |
| MADS-MED-08 | PDFViewer | Media | advanced | Membaca PDF tanpa eksekusi skrip. | `--mads-color-surface` |
| MADS-MED-09 | MarkdownView | Media | advanced | Merender Markdown yang disanitasi. | `--mads-color-fg` |
| MADS-MED-10 | RichTextEditor | Media | advanced | Editor teks terbatas tanpa HTML arbitrer. | `--mads-color-surface-raised` |
| MADS-DOM-01 | FormBuilder | Domain | advanced | Menyusun form dari field yang tersedia. | `--mads-color-surface` |
| MADS-DOM-02 | SchemaForm | Domain | advanced | Membuat form dari schema data app. | `--mads-color-surface` |
| MADS-DOM-03 | WorkflowNode | Domain | advanced | Node deklaratif untuk otomasi milik app. | `--mads-color-border` |
| MADS-DOM-04 | CodeEditor | Domain | advanced | Editor kode read-only untuk inspeksi. | `--mads-font-mono` |
| MADS-DOM-05 | DiffViewer | Domain | advanced | Membandingkan dua versi teks. | `--mads-color-success` |
| MADS-DOM-06 | Terminal | Domain | advanced | Menampilkan output teks bergaya terminal. | `--mads-font-mono` |
| MADS-DOM-07 | LogViewer | Domain | advanced | Menampilkan log terfilter dan teredaksi. | `--mads-color-surface` |
| MADS-DOM-08 | ChatThread | Domain | advanced | Daftar pesan percakapan. | `--mads-color-surface` |
| MADS-DOM-09 | MessageBubble | Domain | advanced | Satu pesan dengan pengirim dan waktu. | `--mads-color-surface-raised` |
| MADS-DOM-10 | ReceiptView | Domain | advanced | Struk ringkas untuk transaksi. | `--mads-color-surface` |
| MADS-DOM-11 | InvoiceView | Domain | advanced | Faktur dengan item dan total. | `--mads-color-surface` |
| MADS-DOM-12 | ContactPicker | Domain | advanced | Memilih kontak dari data app sendiri. | `--mads-color-surface-raised` |
| MADS-DOM-13 | FileTree | Domain | advanced | Pohon file untuk aset app. | `--mads-color-fg` |
| MADS-DOM-14 | RecordDetail | Domain | advanced | Detail satu record dengan field dan aksi. | `--mads-color-surface` |
| MADS-DOM-15 | FilterBar | Domain | advanced | Deret filter untuk daftar data. | `--mads-color-border` |
| MADS-DOM-16 | SavedView | Domain | advanced | Tampilan filter yang disimpan lokal. | `--mads-color-primary` |
| MADS-DOM-17 | ImportWizard | Domain | advanced | Impor data bertahap dengan validasi. | `--mads-color-info` |
| MADS-DOM-18 | ExportDialog | Domain | advanced | Ekspor data dengan pilihan format. | `--mads-color-primary` |
| MADS-DOM-19 | VaultItem | Domain | advanced | Satu item vault dengan nilai tersembunyi. | `--mads-color-border-strong` |
| MADS-DOM-20 | DeviceCard | Domain | advanced | Ringkasan perangkat atau sesi lokal. | `--mads-color-surface` |
| MADS-PLT-01 | AppIcon | Platform | core | Ikon app dengan fallback inisial. | `--mads-radius-clay-sm` |
| MADS-PLT-02 | WidgetFrame | Platform | advanced | Bingkai widget untuk konten ringkas. | `--mads-clay-shadow-1` |
| MADS-PLT-03 | WindowChrome | Platform | advanced | Bilah jendela dekoratif untuk preview. | `--mads-color-surface-raised` |
| MADS-PLT-04 | ContextMenu | Platform | advanced | Menu klik kanan dengan aksi kontekstual. | `--mads-clay-shadow-2` |
| MADS-PLT-05 | NotificationItem | Platform | advanced | Satu notifikasi lokal dengan status baca. | `--mads-color-surface-raised` |
| MADS-PLT-06 | ShareSheet | Platform | core | Sheet berbagi dengan ekspor dan salin tautan. | `--mads-clay-shadow-3` |
| MADS-PLT-07 | IntentPicker | Platform | advanced | Memilih app tujuan untuk intent. | `--mads-color-primary` |
| MADS-PLT-08 | PermissionBadge | Platform | core | Ringkasan permission dengan risk tier. | `--mads-color-warning` |
| MADS-PLT-09 | StorageMeter | Platform | core | Pemakaian storage dan sisa kuota. | `--mads-color-info` |
| MADS-PLT-10 | UpdateCard | Platform | advanced | Kartu versi baru dengan aksi tinjau. | `--mads-color-info` |
| MADS-AI-01 | PromptInput | AI | core | Textarea prompt dengan chip contoh dan submit. | `--mads-color-surface-raised` |
| MADS-AI-02 | ModelPicker | AI | advanced | Memilih model dari endpoint BYOK. | `--mads-color-border-strong` |
| MADS-AI-03 | AIStatus | AI | core | Status provider dan generasi. | `--mads-color-info` |
| MADS-AI-04 | SuggestionChip | AI | core | Saran cepat yang dapat diklik. | `--mads-color-border` |
| MADS-AI-05 | DiffSuggestion | AI | advanced | Usulan perubahan dengan diff. | `--mads-color-success` |
| MADS-AI-06 | GenerationProgress | AI | advanced | Progres generasi bertahap. | `--mads-color-primary` |
| MADS-AI-07 | SourceCitation | AI | advanced | Rujukan sumber untuk keluaran AI. | `--mads-color-muted` |
| MADS-AI-08 | AIError | AI | core | Kegagalan AI dengan fallback yang jelas. | `--mads-color-error` |
| MADS-AI-09 | TokenMeter | AI | advanced | Pemakaian token per permintaan. | `--mads-color-info` |
| MADS-AI-10 | AgentStep | AI | advanced | Satu langkah rencana AI dengan status. | `--mads-color-primary` |

## 3. Spesifikasi Komponen Core Clay

Setiap komponen core memuat tujuan, anatomi, props/varian, state, token, keyboard, ARIA, dan contoh copy. State wajib yang tidak relevan untuk komponen tertentu ditandai pada kolom State.

### 3.1 Layout

#### MADS-LAY-01 AppShell

- **Tujuan.** Kerangka layar dengan navigasi, header, konten, dan slot overlay.
- **Anatomi.** Root grid dengan slot navigasi, header, main, dan portal overlay.
- **Props/varian.** variant sidebar/rail/dock; `dense` boolean; `maxWidth` token.
- **State.** default, loading, offline, ephemeral
- **Token.** `--mads-color-bg`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tab mencapai landmark; skip link ke main.
- **ARIA.** `<nav>` untuk navigasi, `<main>` untuk konten, `aria-current` pada item aktif.
- **Copy.** "Buat micro-app pertamamu"

#### MADS-LAY-02 Stack

- **Tujuan.** Menyusun anak secara vertikal atau horizontal dengan gap token.
- **Anatomi.** Container flex dengan arah, gap, align, dan wrap.
- **Props/varian.** direction row/column; gap token; align; justify; wrap.
- **State.** default, empty
- **Token.** `--mads-space-4`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tidak ada; container non-interaktif.
- **ARIA.** Tidak ada role khusus; gunakan elemen semantik anak.
- **Copy.** "Tiga kartu tersusun vertikal di mobile"

#### MADS-LAY-03 Grid

- **Tujuan.** Grid 12 kolom responsif untuk konten dan kartu.
- **Anatomi.** Grid 12 kolom dengan span per breakpoint.
- **Props/varian.** columns 1..12; gap token; spanSm/Md/Lg.
- **State.** default, empty
- **Token.** `--mads-space-6`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tidak ada.
- **ARIA.** Tidak ada role khusus.
- **Copy.** "Galeri template dua kolom di tablet"

#### MADS-LAY-05 Card

- **Tujuan.** Permukaan clay untuk mengelompokkan konten terkait.
- **Anatomi.** Permukaan clay dengan header, body, footer opsional.
- **Props/varian.** tone surface/raised/tint; padding sm/md/lg; interactive boolean; selected boolean.
- **State.** default, hover, focus-visible, pressed, selected, disabled, loading
- **Token.** `--mads-clay-shadow-1`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Enter/Space saat interactive.
- **ARIA.** `role=group` atau `article`; `aria-pressed` bila dapat dipilih.
- **Copy.** "Template Kasir"

#### MADS-LAY-06 Sheet

- **Tujuan.** Panel bawah dengan drag handle untuk aksi dan detail.
- **Anatomi.** Panel bawah dengan drag handle, judul, isi, aksi.
- **Props/varian.** side bottom/right; size sm/md/lg; dismissible boolean.
- **State.** closed, opening, open, closing
- **Token.** `--mads-radius-clay-xl`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Esc menutup; Tab terperangkap; fokus kembali ke pemicu.
- **ARIA.** `role=dialog`, `aria-modal=true`, `aria-labelledby`.
- **Copy.** "Bagikan micro-app"

#### MADS-LAY-08 Modal

- **Tujuan.** Dialog terpusat dengan backdrop untuk keputusan fokus.
- **Anatomi.** Dialog terpusat dengan backdrop dan aksi.
- **Props/varian.** size sm/md/lg; dismissible; destructive boolean.
- **State.** closed, opening, open, closing
- **Token.** `--mads-clay-shadow-3`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Esc menutup; Enter mengaktifkan aksi utama; fokus terperangkap.
- **ARIA.** `role=dialog`, `aria-modal=true`, `aria-describedby`.
- **Copy.** "Hapus micro-app ini?"

#### MADS-LAY-12 ScrollArea

- **Tujuan.** Area scroll dengan scrollbar tipis dan fade tepi.
- **Anatomi.** Viewport scroll dengan scrollbar tipis dan fade tepi.
- **Props/varian.** axis vertical/horizontal/both; maxHeight token; fade boolean.
- **State.** default, scrolling, at-end
- **Token.** `--mads-color-border`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Panah dan PageUp/PageDown saat fokus.
- **ARIA.** `tabindex=0` dan `aria-label` bila area scroll independen.
- **Copy.** "Gulir untuk melihat 12 komponen lainnya"

### 3.2 Navigation

#### MADS-NAV-01 Sidebar

- **Tujuan.** Navigasi utama desktop selebar 264 px.
- **Anatomi.** Navigasi vertikal 264 px dengan item dan aksi utama.
- **Props/varian.** items; activeId; collapsed boolean.
- **State.** default, hover, focus-visible, active, collapsed
- **Token.** `--mads-color-surface`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tab antar item; Enter membuka; `[` menutup saat collapsed.
- **ARIA.** `<nav aria-label="Navigasi utama">`; `aria-current=page`.
- **Copy.** "Home, Templates, Packages, Settings"

#### MADS-NAV-02 TabBar

- **Tujuan.** Tab horizontal untuk berpindah subview.
- **Anatomi.** Deret tab dengan indikator aktif.
- **Props/varian.** tabs; activeId; variant underline/pill; scrollable boolean.
- **State.** default, hover, focus-visible, active, disabled
- **Token.** `--mads-color-border`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Panah kiri/kanan berpindah; Home/End ke ujung.
- **ARIA.** `role=tablist`, `role=tab`, `aria-selected`, `aria-controls`.
- **Copy.** "Tambah | Layer | Atur"

#### MADS-NAV-03 Breadcrumb

- **Tujuan.** Jejak lokasi hierarkis dengan tautan.
- **Anatomi.** Jejak lokasi dengan pemisah dan item terakhir non-tautan.
- **Props/varian.** items; maxItems; collapse boolean.
- **State.** default, collapsed
- **Token.** `--mads-color-muted`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tab antar tautan; Enter membuka.
- **ARIA.** `<nav aria-label="Breadcrumb">`, `aria-current=page`.
- **Copy.** "Home / Templates / Kasir"

#### MADS-NAV-04 CommandPalette

- **Tujuan.** Pencarian aksi dan konten dengan Cmd/Ctrl+K.
- **Anatomi.** Overlay pencarian dengan daftar hasil dan shortcut.
- **Props/varian.** open; query; groups; recentLimit.
- **State.** closed, open, loading, empty, error
- **Token.** `--mads-clay-shadow-3`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Cmd/Ctrl+K membuka; panah memilih; Enter menjalankan; Esc menutup.
- **ARIA.** `role=dialog`, `role=listbox`, `aria-activedescendant`.
- **Copy.** "Cari aksi atau app"

#### MADS-NAV-06 Stepper

- **Tujuan.** Progres langkah linier dengan status per langkah.
- **Anatomi.** Langkah horizontal atau vertikal dengan status.
- **Props/varian.** steps; current; orientation; clickable boolean.
- **State.** default, current, complete, error, disabled
- **Token.** `--mads-color-primary`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tab antar langkah yang dapat diklik; Enter memilih.
- **ARIA.** `role=list`, `aria-current=step`.
- **Copy.** "Langkah 2 dari 3: Permission"

#### MADS-NAV-08 Dock

- **Tujuan.** Navigasi bawah mobile dengan empat item dan FAB.
- **Anatomi.** Navigasi bawah dengan empat item dan FAB.
- **Props/varian.** items; activeId; fabLabel.
- **State.** default, hover, focus-visible, active
- **Token.** `--mads-clay-shadow-2`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tab antar item; Enter membuka; FAB Shift+Enter.
- **ARIA.** `<nav aria-label="Navigasi utama">`; FAB `aria-label`.
- **Copy.** "Buat"

### 3.3 Input

#### MADS-INP-01 Button

- **Tujuan.** Aksi utama atau sekunder dengan state lengkap.
- **Anatomi.** Tombol dengan label, ikon opsional, dan state.
- **Props/varian.** variant primary/secondary/ghost/destructive; size sm/md/lg; loading; iconOnly.
- **State.** default, hover, focus-visible, pressed, disabled, loading
- **Token.** `--mads-color-primary`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Enter/Space mengaktifkan; tidak dapat diaktifkan saat loading.
- **ARIA.** `<button>`; `aria-busy` saat loading; `aria-disabled` bila perlu.
- **Copy.** "Buat aplikasi"

#### MADS-INP-02 IconButton

- **Tujuan.** Aksi ikon dengan label aksesibel wajib.
- **Anatomi.** Tombol ikon dengan tooltip dan label wajib.
- **Props/varian.** icon; label; size; variant; pressed boolean.
- **State.** default, hover, focus-visible, pressed, disabled, loading
- **Token.** `--mads-radius-clay-md`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Enter/Space; tooltip muncul saat fokus.
- **ARIA.** `aria-label` wajib; `aria-pressed` untuk toggle.
- **Copy.** "Bagikan"

#### MADS-INP-03 TextField

- **Tujuan.** Input teks satu baris dengan label dan error.
- **Anatomi.** Label, input, hint, dan pesan error.
- **Props/varian.** label; value; placeholder; hint; error; required; maxLength; size.
- **State.** default, hover, focus-visible, filled, disabled, readonly, error
- **Token.** `--mads-color-surface-raised`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tab masuk; Esc membersihkan saran; Enter submit form.
- **ARIA.** `<label for>`; `aria-invalid`; `aria-describedby` untuk hint/error.
- **Copy.** "Nama micro-app"

#### MADS-INP-04 TextArea

- **Tujuan.** Input teks multi-baris dengan hitungan karakter.
- **Anatomi.** Label, textarea, hitungan karakter, error.
- **Props/varian.** label; rows; maxLength; autoResize; error.
- **State.** default, hover, focus-visible, filled, disabled, readonly, error
- **Token.** `--mads-color-surface-raised`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tab keluar; Shift+Enter baris baru.
- **ARIA.** `aria-describedby` untuk hitungan dan error.
- **Copy.** "Ceritakan app yang ingin kamu buat"

#### MADS-INP-06 SearchField

- **Tujuan.** Input pencarian dengan clear dan debounce.
- **Anatomi.** Input pencarian dengan ikon, clear, dan debounce.
- **Props/varian.** value; placeholder; debounceMs; onQuery; shortcutHint.
- **State.** default, hover, focus-visible, filled, loading, empty
- **Token.** `--mads-color-surface-raised`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Esc membersihkan; Enter menjalankan; `/` fokus.
- **ARIA.** `role=searchbox`; `aria-label`; hasil diumumkan di live region.
- **Copy.** "Cari app, project, atau record"

#### MADS-INP-07 Select

- **Tujuan.** Pemilihan satu opsi dari daftar tertutup.
- **Anatomi.** Tombol pemicu dan daftar opsi.
- **Props/varian.** options; value; placeholder; size; disabled.
- **State.** default, hover, focus-visible, open, disabled, error
- **Token.** `--mads-color-surface-raised`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Enter/Space membuka; panah memilih; Esc menutup.
- **ARIA.** `role=combobox`, `aria-expanded`, `aria-controls`.
- **Copy.** "Pilih layout"

#### MADS-INP-08 Combobox

- **Tujuan.** Input dengan saran dan pencarian fuzzy.
- **Anatomi.** Input dengan daftar saran yang dapat difilter.
- **Props/varian.** options; value; query; allowCustom; loading.
- **State.** default, hover, focus-visible, open, loading, empty, error
- **Token.** `--mads-color-surface-raised`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Ketik memfilter; panah memilih; Enter menerima; Esc menutup.
- **ARIA.** `role=combobox`, `aria-autocomplete=list`, `aria-activedescendant`.
- **Copy.** "Cari kategori"

#### MADS-INP-10 Checkbox

- **Tujuan.** Pilihan boolean tunggal atau grup.
- **Anatomi.** Kotak centang dengan label dan deskripsi.
- **Props/varian.** checked; indeterminate; label; description; disabled.
- **State.** default, hover, focus-visible, checked, indeterminate, disabled, error
- **Token.** `--mads-color-primary`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Space mengubah; Tab berpindah.
- **ARIA.** `role=checkbox` atau `<input type=checkbox>`; `aria-checked=mixed`.
- **Copy.** "Sertakan data contoh"

#### MADS-INP-11 RadioGroup

- **Tujuan.** Pilihan tunggal dari beberapa opsi yang terlihat.
- **Anatomi.** Grup radio dengan label grup.
- **Props/varian.** options; value; orientation; disabled.
- **State.** default, hover, focus-visible, selected, disabled, error
- **Token.** `--mads-color-primary`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Panah berpindah dan memilih; Tab keluar grup.
- **ARIA.** `role=radiogroup`, `role=radio`, `aria-checked`.
- **Copy.** "Form / List / Dashboard"

#### MADS-INP-12 Switch

- **Tujuan.** Toggle on/off yang langsung berlaku.
- **Anatomi.** Toggle dengan label dan status.
- **Props/varian.** checked; label; description; disabled; loading.
- **State.** default, hover, focus-visible, checked, disabled, loading
- **Token.** `--mads-color-primary`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Space mengubah; Enter tidak.
- **ARIA.** `role=switch`, `aria-checked`.
- **Copy.** "Aktifkan Offline Cage"

#### MADS-INP-13 Slider

- **Tujuan.** Pemilihan nilai numerik dalam rentang.
- **Anatomi.** Track, thumb, nilai, dan label.
- **Props/varian.** min; max; step; value; showValue; disabled.
- **State.** default, hover, focus-visible, dragging, disabled, error
- **Token.** `--mads-color-primary`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Panah mengubah; PageUp/PageDown; Home/End.
- **ARIA.** `role=slider`, `aria-valuemin/max/now/text`.
- **Copy.** "Ukuran teks 16 px"

### 3.4 Data

#### MADS-DATA-01 DataTable

- **Tujuan.** Tabel data dengan sort, filter, dan seleksi baris.
- **Anatomi.** Header, baris, seleksi, empty state, pagination.
- **Props/varian.** columns; rows; sort; selection; loading; empty; error.
- **State.** default, loading, empty, error, selected, sorted
- **Token.** `--mads-color-surface`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tab ke header; Enter mengurutkan; Space memilih baris.
- **ARIA.** `role=table`; `aria-sort`; `aria-selected`.
- **Copy.** "12 record ditemukan"

#### MADS-DATA-02 VirtualList

- **Tujuan.** Daftar panjang dengan virtualisasi baris.
- **Anatomi.** Viewport dengan baris virtual dan pengukur tinggi.
- **Props/varian.** items; itemHeight; overscan; renderItem.
- **State.** default, loading, empty, error
- **Token.** `--mads-color-surface`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Panah dan PageUp/PageDown; Home/End.
- **ARIA.** `role=list`; `aria-setsize` dan `aria-posinset`.
- **Copy.** "Menampilkan 1–20 dari 1.240"

#### MADS-DATA-05 Calendar

- **Tujuan.** Tampilan bulan dengan event dan pemilihan tanggal.
- **Anatomi.** Grid bulan, header, dan event.
- **Props/varian.** month; selectedDate; events; min/max.
- **State.** default, hover, focus-visible, selected, disabled, loading
- **Token.** `--mads-color-primary`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Panah berpindah hari; PageUp/Down bulan; Enter memilih.
- **ARIA.** `role=grid`; `aria-selected`; label bulan.
- **Copy.** "Agustus 2026"

#### MADS-DATA-11 StatCard

- **Tujuan.** Angka ringkas dengan label dan tren.
- **Anatomi.** Label, angka, tren, dan konteks.
- **Props/varian.** label; value; delta; trend; tone.
- **State.** default, loading, error
- **Token.** `--mads-clay-shadow-1`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tidak ada kecuali kartu interaktif.
- **ARIA.** Angka memakai teks; tren diberi label arah.
- **Copy.** "Penjualan hari ini: 42"

#### MADS-DATA-12 Badge

- **Tujuan.** Label status kecil dengan ikon dan teks.
- **Anatomi.** Ikon, teks, dan tone status.
- **Props/varian.** tone; label; icon; size.
- **State.** default, muted, success, warning, error, info
- **Token.** `--mads-color-surface-raised`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tidak ada.
- **ARIA.** Teks status terbaca; ikon `aria-hidden`.
- **Copy.** "Tersimpan"

#### MADS-DATA-14 Avatar

- **Tujuan.** Representasi pengguna atau app.
- **Anatomi.** Gambar atau inisial dengan ukuran.
- **Props/varian.** src; name; size; status.
- **State.** default, loading, error, fallback
- **Token.** `--mads-radius-full`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tidak ada.
- **ARIA.** `alt` atau `aria-label` berisi nama.
- **Copy.** "MW"

#### MADS-DATA-15 Tooltip

- **Tujuan.** Keterangan singkat saat hover atau fokus.
- **Anatomi.** Pemicu dan konten singkat.
- **Props/varian.** content; placement; delay; open.
- **State.** hidden, visible
- **Token.** `--mads-color-fg`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Muncul saat fokus/hover; Esc menutup.
- **ARIA.** `role=tooltip`; `aria-describedby` pada pemicu.
- **Copy.** "Unduh .mapp"

#### MADS-DATA-16 Progress

- **Tujuan.** Progres determinat atau indeterminat.
- **Anatomi.** Track dan nilai atau indeterminate.
- **Props/varian.** value; max; indeterminate; label; tone.
- **State.** default, indeterminate, complete, error
- **Token.** `--mads-color-primary`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tidak ada.
- **ARIA.** `role=progressbar`, `aria-valuenow`, `aria-label`.
- **Copy.** "Menyiapkan package 60%"

#### MADS-DATA-18 EmptyState

- **Tujuan.** Keadaan kosong dengan penjelasan dan aksi.
- **Anatomi.** Ilustrasi, judul, deskripsi, dan aksi.
- **Props/varian.** title; description; action; illustration; compact.
- **State.** default, compact
- **Token.** `--mads-color-muted`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tab ke aksi; Enter menjalankan.
- **ARIA.** Judul sebagai heading; aksi memiliki label jelas.
- **Copy.** "Belum ada micro-app"

### 3.5 Feedback

#### MADS-FBK-01 Alert

- **Tujuan.** Pesan status yang menetap sampai ditutup.
- **Anatomi.** Ikon, judul, deskripsi, aksi, dan dismiss.
- **Props/varian.** tone info/success/warning/error; title; dismissible; action.
- **State.** default, dismissed, action-loading
- **Token.** `--mads-color-warning`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tab ke aksi; Esc menutup bila dismissible.
- **ARIA.** `role=alert` untuk error; `role=status` untuk info.
- **Copy.** "Package ini meminta akses jaringan"

#### MADS-FBK-02 Toast

- **Tujuan.** Notifikasi singkat yang dapat dibatalkan.
- **Anatomi.** Pesan singkat, aksi opsional, dan dismiss.
- **Props/varian.** tone; message; action; duration; pauseOnHover.
- **State.** entering, visible, paused, exiting
- **Token.** `--mads-clay-shadow-2`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tab ke aksi; Esc menutup.
- **ARIA.** `role=status`, `aria-live=polite`; error memakai `assertive`.
- **Copy.** "Tersimpan"

#### MADS-FBK-03 Banner

- **Tujuan.** Pesan kontekstual di atas konten.
- **Anatomi.** Pesan kontekstual dengan aksi.
- **Props/varian.** tone; title; description; action; dismissible.
- **State.** default, dismissed
- **Token.** `--mads-color-info`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tab ke aksi; Enter menjalankan.
- **ARIA.** `role=region` dengan label; bukan alert kecuali mendesak.
- **Copy.** "Data lama ditemukan"

#### MADS-FBK-04 FieldError

- **Tujuan.** Pesan validasi yang terhubung ke field.
- **Anatomi.** Ikon dan pesan error yang terhubung ke field.
- **Props/varian.** message; fieldId; tone.
- **State.** default, visible
- **Token.** `--mads-color-error`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tidak ada.
- **ARIA.** `role=alert`; `id` dirujuk `aria-describedby`.
- **Copy.** "Nama wajib diisi"

#### MADS-FBK-05 ConfirmDialog

- **Tujuan.** Konfirmasi aksi destruktif dengan fokus aman.
- **Anatomi.** Judul, deskripsi konsekuensi, aksi batal dan konfirmasi.
- **Props/varian.** title; description; confirmLabel; destructive; requireTyping.
- **State.** closed, open, confirming, error
- **Token.** `--mads-color-error`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Fokus awal Batal; Esc membatalkan.
- **ARIA.** `role=alertdialog`, `aria-describedby`.
- **Copy.** "Hapus data app ini?"

#### MADS-FBK-07 ErrorBoundary

- **Tujuan.** Kartu pemulihan saat app crash.
- **Anatomi.** Kode, ringkasan, tiga aksi pemulihan.
- **Props/varian.** code; summary; onReload; onExport; onHome.
- **State.** error, reloading, export-error
- **Token.** `--mads-color-error`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Fokus ke aksi pertama; Esc ke Home.
- **ARIA.** `role=alert`; kode terbaca; aksi berlabel.
- **Copy.** "App berhenti merespons"

#### MADS-FBK-08 OfflineBanner

- **Tujuan.** Status offline dan cache yang tersedia.
- **Anatomi.** Status jaringan, cache, dan aksi retry.
- **Props/varian.** online; cached; lastSync; onRetry.
- **State.** online, offline, reconnecting
- **Token.** `--mads-color-warning`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tab ke retry; Enter mencoba.
- **ARIA.** `role=status`, `aria-live=polite`.
- **Copy.** "Kamu offline. Data lokal tetap tersedia."

### 3.6 Platform

#### MADS-PLT-01 AppIcon

- **Tujuan.** Ikon app dengan fallback inisial.
- **Anatomi.** Ikon app dengan fallback inisial dan status.
- **Props/varian.** src; name; size; status; rounded.
- **State.** default, loading, error, fallback
- **Token.** `--mads-radius-clay-sm`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tidak ada.
- **ARIA.** `alt` berisi nama app.
- **Copy.** "Kasir Warung"

#### MADS-PLT-06 ShareSheet

- **Tujuan.** Sheet berbagi dengan ekspor dan salin tautan.
- **Anatomi.** Ringkasan package, permission, checksum, dan aksi.
- **Props/varian.** name; version; permissions; size; checksum; onDownload.
- **State.** open, preparing, ready, error
- **Token.** `--mads-clay-shadow-3`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tab antar aksi; Esc menutup.
- **ARIA.** `role=dialog`; permission dibacakan sebagai daftar.
- **Copy.** "Ukuran 84 KB · checksum 9f2c"

#### MADS-PLT-08 PermissionBadge

- **Tujuan.** Ringkasan permission dengan risk tier.
- **Anatomi.** Label permission dengan risk tier.
- **Props/varian.** permission; risk; granted.
- **State.** default, granted, denied, warning
- **Token.** `--mads-color-warning`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tidak ada.
- **ARIA.** Teks permission + risk; ikon `aria-hidden`.
- **Copy.** "Jaringan: risiko tinggi"

#### MADS-PLT-09 StorageMeter

- **Tujuan.** Pemakaian storage dan sisa kuota.
- **Anatomi.** Bar pemakaian dan label angka.
- **Props/varian.** used; quota; warnAt; label.
- **State.** default, warning, critical, loading
- **Token.** `--mads-color-info`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tidak ada.
- **ARIA.** `role=progressbar`; label teks angka.
- **Copy.** "Terpakai 62 MB dari 120 MB"

### 3.7 AI

#### MADS-AI-01 PromptInput

- **Tujuan.** Textarea prompt dengan chip contoh dan submit.
- **Anatomi.** Textarea prompt, chip contoh, dan submit.
- **Props/varian.** value; placeholder; chips; maxLength; submitting.
- **State.** default, focus-visible, filled, submitting, error
- **Token.** `--mads-color-surface-raised`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Cmd/Ctrl+Enter submit; Esc kembali.
- **ARIA.** `aria-describedby` untuk batas; status submit di live region.
- **Copy.** "Buat kasir sederhana untuk warung"

#### MADS-AI-03 AIStatus

- **Tujuan.** Status provider dan generasi.
- **Anatomi.** Status provider, model, dan progres.
- **Props/varian.** state; provider; model; message.
- **State.** idle, checking, ready, generating, error
- **Token.** `--mads-color-info`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tidak ada.
- **ARIA.** `role=status`, `aria-live=polite`.
- **Copy.** "AI siap · model pilihanmu"

#### MADS-AI-04 SuggestionChip

- **Tujuan.** Saran cepat yang dapat diklik.
- **Anatomi.** Chip saran yang dapat diklik.
- **Props/varian.** label; value; icon; disabled.
- **State.** default, hover, focus-visible, pressed, disabled
- **Token.** `--mads-color-border`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Enter/Space memilih; Tab berpindah.
- **ARIA.** `<button>` dengan label jelas.
- **Copy.** "inventaris"

#### MADS-AI-08 AIError

- **Tujuan.** Kegagalan AI dengan fallback yang jelas.
- **Anatomi.** Kode, pesan aman, dan fallback.
- **Props/varian.** code; message; retryable; onRetry; onFallback.
- **State.** error, retrying
- **Token.** `--mads-color-error`, `--mads-radius-clay-md`, `--mads-clay-shadow-1`, `--mads-duration-control`.
- **Keyboard.** Tab ke aksi; Enter menjalankan.
- **ARIA.** `role=alert`; fallback disebut eksplisit.
- **Copy.** "AI tidak tersedia. Gunakan template."

## 4. Komponen Advanced

72 komponen advanced memakai tabel §2 sebagai kontrak minimum: nama, kategori, use case, dan token utama. Komponen advanced MUST mengikuti state dan aturan aksesibilitas yang sama dengan core; palette menampilkannya hanya saat toggle Advanced aktif.

Komponen advanced tidak boleh dirender sebelum memiliki entri katalog dan implementasi yang lolos verifikasi visual serta axe.

## 5. Aturan Renderer

1. Renderer MUIP hanya menerima `type` yang ada di tabel §2. Tipe tidak dikenal menghasilkan error validasi, bukan fallback diam-diam.
2. Props divalidasi terhadap allowlist komponen; props asing ditolak.
3. Teks dirender dengan `textContent`; tidak ada HTML mentah.
4. Komponen tidak boleh mengimpor CSS eksternal atau menulis style inline di luar token.
5. Setiap komponen wajib memiliki state `focus-visible` yang terlihat dan target sentuh minimum 44 px untuk kontrol utama.

## 6. Acceptance Criteria

1. Tabel §2 berisi tepat 120 baris dengan ID dan nama yang sama seperti `catalog.generated.ts`, dalam urutan yang sama.
2. 48 komponen core memiliki delapan field spesifikasi lengkap.
3. Setiap komponen memiliki minimal satu use case dan token utama.
4. Tidak ada komponen yang dipakai layar tanpa entri katalog.
5. `node scripts/generate-catalog.mjs --check` lulus.

## 7. Verifikasi

| Pemeriksaan | Cara |
|---|---|
| Jumlah dan urutan | `node scripts/generate-catalog.mjs --check` |
| Nama unik | Generator menolak nama duplikat |
| State visual | Regression screenshot untuk 48 core di light, dark, high-contrast |
| Aksesibilitas | axe per komponen dan uji keyboard |
| Token | Review tidak ada hex, shadow, atau radius literal |
