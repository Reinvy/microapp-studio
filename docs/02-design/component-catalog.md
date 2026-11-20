---
id: DESIGN-COMPONENTS
title: Katalog Komponen
status: accepted
owner: design
prd_refs: ["§3 Modul 2", "§6"]
---

# Katalog Komponen

Katalog ini menetapkan 120 komponen MicroApp Design System (MADS) yang boleh dipakai Studio, Host Shell, dan micro-app. Setiap nama komponen di kolom `Nama` adalah **nama tipe MUIP yang sama persis** dengan enum `componentType` pada [ui-node.v1.schema.json](../03-specs/schemas/ui-node.v1.schema.json) dan daftar tipe di [ui-protocol.md](../03-specs/ui-protocol.md). Nama tipe di luar daftar ini MUST ditolak renderer, bukan dipetakan diam-diam.

Katalog adalah sumber kebenaran visual dan perilaku. Implementasi web dan Flutter MUST disediakan di `packages/ui-kit` (TypeScript + Flutter) dan MUST memiliki anatomi, state, dan semantik aksesibilitas yang sama; perbedaan hanya boleh pada detail platform (mis. scrollbar, gesture, chrome jendela). Token warna, tipografi, spacing, radius, shadow, dan motion mengikuti [design-system.md](design-system.md); nilai visual hardcoded di komponen MUST NOT ada.

## 1. Tujuan dan Ruang Lingkup

Ruang lingkup katalog:

- Menjadi daftar tertutup komponen yang dapat dirender MUIP, sehingga micro-app tidak pernah menyuntik HTML atau widget arbitrer.
- Menetapkan state wajib per komponen agar implementasi web dan Flutter tidak menyimpang.
- Menetapkan catatan aksesibilitas minimum yang wajib diverifikasi terhadap [accessibility.md](accessibility.md).
- Menjadi rujukan ID `MADS-<CAT>-<NN>` yang dipakai [screen-specs.md](screen-specs.md), flow, dan kode.

Di luar ruang lingkup: nilai token rinci (lihat design system), tata letak layar (lihat screen specs), dan kontrak event MUIP (lihat ui-protocol). Katalog tidak menambah komponen baru untuk kebutuhan satu layar; layar MUST disusun dari 120 komponen yang tercantum di katalog ini.

## 2. Konvensi

### 2.1 Skema ID

| Kode | Kategori | Jumlah | Rentang ID |
|---|---|---|---|
| `LAY` | Layout | 12 | `MADS-LAY-01`..`MADS-LAY-12` |
| `NAV` | Navigation | 10 | `MADS-NAV-01`..`MADS-NAV-10` |
| `INP` | Input | 20 | `MADS-INP-01`..`MADS-INP-20` |
| `DATA` | Data | 18 | `MADS-DATA-01`..`MADS-DATA-18` |
| `FBK` | Feedback | 10 | `MADS-FBK-01`..`MADS-FBK-10` |
| `MED` | Media | 10 | `MADS-MED-01`..`MADS-MED-10` |
| `DOM` | Domain | 20 | `MADS-DOM-01`..`MADS-DOM-20` |
| `PLT` | Platform | 10 | `MADS-PLT-01`..`MADS-PLT-10` |
| `AI` | AI | 10 | `MADS-AI-01`..`MADS-AI-10` |

Total 120 komponen. ID MUST stabil: mengganti nama komponen tidak mengubah ID; menghapus komponen wajib menandainya deprecated minimal satu major version sebelum dihapus dari enum MUIP.

### 2.2 Arti kolom

| Kolom | Ketentuan |
|---|---|
| `ID` | ID MADS unik, format `MADS-<CAT>-<NN>`. |
| `Nama` | Nama tipe MUIP, PascalCase, identik dengan enum schema. |
| `Kategori` | Salah satu dari sembilan kategori pada §2.1. |
| `Guna` | Satu kalimat tujuan komponen; bukan duplikasi dokumentasi API. |
| `Web` | Nama komponen React 19 yang MUST disediakan `packages/ui-kit`; `Berbasis <elemen>` bila memakai elemen native. |
| `Flutter` | Nama widget Flutter yang MUST disediakan `packages/ui-kit`; `Berbasis <widget>` bila memakai widget framework. |
| `Varian` | Varian visual atau perilaku resmi. Varian di luar daftar MUST NOT ditambahkan tanpa memperbarui katalog. |
| `State wajib` | State yang MUST diimplementasikan dan diuji; state tambahan diperbolehkan selama tidak mengubah semantik. |
| `Token` | Token MADS utama yang dipakai; daftar token dipisah koma. |
| `Catatan a11y` | Perilaku aksesibilitas minimum yang diverifikasi otomatis atau manual. |

### 2.3 Aturan normatif

- Setiap komponen MUST punya implementasi web dan Flutter. Komponen yang hanya tersedia di satu platform MUST dirender sebagai placeholder berlabel oleh renderer lain (MUIP U-12), bukan dihilangkan.
- Setiap komponen MUST menyatakan minimal satu state wajib, satu varian, satu token, dan satu catatan a11y pada tabel §3.
- Setiap komponen MUST menerima properti aksesibilitas umum MUIP (`label`, `description`, `role`, `live`, `disabled`, `required`) dan memetakannya ke ARIA di web serta `Semantics` di Flutter.
- Komponen interaktif MUST memiliki target sentuh minimum 24×24 px dan SHOULD 44×44 px untuk aksi utama.
- Warna MUST NOT menjadi satu-satunya pembawa makna; status selalu disertai teks atau ikon berlabel.
- Menambah, mengganti nama, atau menghapus komponen MUST melalui RFC dan pembaruan [design-system.md](design-system.md) serta schema MUIP; katalog tidak boleh menyimpang dari enum schema.
- Setiap komponen inti pada §4 MUST memiliki spesifikasi anatomi lengkap sebelum diimplementasikan; komponen non-inti memakai tabel §3 sebagai spesifikasi minimum.

## 3. Matriks Katalog

### 3.1 Layout (12)

| ID | Nama | Kategori | Guna | Web | Flutter | Varian | State wajib | Token | Catatan a11y |
|---|---|---|---|---|---|---|---|---|---|
| MADS-LAY-01 | AppShell | Layout | Kerangka utama aplikasi dengan slot header, navigasi, konten, dan status. | `AppShell` | `MadsAppShell` | desktop, mobile, embedded-host | default, nav-collapsed, offline, loading | `--mads-color-bg`, `--mads-color-surface`, `--mads-color-border`, `--mads-space-16` | Landmark `banner`, `navigation`, `main`; sediakan skip-link ke konten; urutan fokus mengikuti urutan visual. |
| MADS-LAY-02 | Stack | Layout | Menyusun anak satu arah dengan gap dan perataan konsisten. | `Stack` | `MadsStack` | vertical, horizontal | default, empty | `--mads-space-8`, `--mads-space-16`, `--mads-space-24` | Tanpa role; urutan baca mengikuti urutan node di DOM; jangan membalik urutan visual tanpa membalik DOM. |
| MADS-LAY-03 | Grid | Layout | Grid responsif 1–12 kolom untuk konten dan galeri. | `Grid` | `MadsGrid` | fixed-columns, auto-fill, dashboard | default, empty | `--mads-space-8`, `--mads-space-16`, `--mads-space-24` | Tanpa role; pada compact MUST turun ke satu kolom; urutan DOM menentukan urutan baca. |
| MADS-LAY-04 | SplitPane | Layout | Dua panel bersebelahan atau bertumpuk yang dapat diubah ukurannya. | `SplitPane` | `MadsSplitPane` | horizontal, vertical, collapsible | default, dragging, collapsed, focus-within | `--mads-color-border`, `--mads-space-4`, `--mads-motion-180` | Pemisah `role="separator"` dengan `aria-valuenow`, `aria-valuemin`, `aria-valuemax`; ArrowKeys mengubah ukuran; panel dapat dicapai keyboard. |
| MADS-LAY-05 | Card | Layout | Wadah konten berkelompok dengan batas visual. | `Card` | `MadsCard` | elevated, outlined, filled, interactive | default, hover, focus-visible, pressed, disabled, selected | `--mads-color-surface`, `--mads-shadow-1`, `--mads-radius-12`, `--mads-space-16` | Bila interaktif memakai `role="button"` dan label aksi; jangan menaruh kontrol interaktif di dalam card yang seluruhnya tombol. |
| MADS-LAY-06 | Sheet | Layout | Panel yang muncul dari tepi layar untuk tugas sekunder. | `Sheet` | `MadsSheet` | bottom, side, modal, non-modal, snap-points | closed, opening, open, dragging, dismissed | `--mads-shadow-2`, `--mads-radius-16`, `--mads-motion-240` | Modal sheet memakai `role="dialog"` dan focus trap; Esc menutup; fokus kembali ke pemicu. |
| MADS-LAY-07 | Drawer | Layout | Panel navigasi sisi yang dapat dibuka dan ditutup. | `Drawer` | `MadsDrawer` | start, end, modal, persistent | closed, open, scrim-visible | `--mads-color-surface`, `--mads-shadow-2`, `--mads-space-16` | `aria-modal="true"` saat modal; focus trap; tombol tutup berlabel; `aria-expanded` pada pemicu. |
| MADS-LAY-08 | Modal | Layout | Dialog blocking untuk keputusan atau formulir terfokus. | `Modal` | `MadsModal` | dialog, confirm, fullscreen, sm, md, lg | closed, open, busy, error | `--mads-shadow-3`, `--mads-radius-16`, `--mads-motion-180` | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` dan `aria-describedby`; Esc menutup; fokus awal pada kontrol pertama atau judul. |
| MADS-LAY-09 | Popover | Layout | Konten mengambang yang terikat pada elemen pemicu. | `Popover` | `MadsPopover` | auto-placement, manual-placement, with-arrow | closed, open, hover-open, focus-open | `--mads-shadow-2`, `--mads-radius-8`, `--mads-space-8` | Pemicu memakai `aria-expanded` dan `aria-controls`; Esc menutup; klik luar menutup; fokus masuk ke konten bila interaktif. |
| MADS-LAY-10 | Toolbar | Layout | Deret aksi dan kontrol untuk konteks tertentu. | `Toolbar` | `MadsToolbar` | horizontal, vertical, overflow-menu | default, overflow-open, disabled | `--mads-space-8`, `--mads-color-border`, `--mads-radius-8` | `role="toolbar"` dengan roving tabindex; ArrowLeft/Right berpindah; setiap tombol ikon berlabel. |
| MADS-LAY-11 | SafeArea | Layout | Menjaga konten dari notch, status bar, dan keyboard. | `SafeArea` | `MadsSafeArea` | top, bottom, all, keyboard-aware | default, keyboard-open | `--mads-space-16`, `--mads-space-24` | Insets tidak boleh menutupi focus ring; jangan memakai SafeArea sebagai pengganti padding desain. |
| MADS-LAY-12 | ScrollArea | Layout | Area gulir dengan scrollbar dan fade tepi. | `ScrollArea` | `MadsScrollArea` | vertical, horizontal, both, fade-edges | default, scrolling, at-start, at-end | `--mads-color-border`, `--mads-space-4`, `--mads-motion-120` | Beri `tabindex="0"` dan `role="region"` berlabel bila isi tidak fokusabel; keyboard PageUp/PageDown/Home/End. |

### 3.2 Navigation (10)

| ID | Nama | Kategori | Guna | Web | Flutter | Varian | State wajib | Token | Catatan a11y |
|---|---|---|---|---|---|---|---|---|---|
| MADS-NAV-01 | Sidebar | Navigation | Navigasi utama desktop dengan bagian dan item aktif. | `Sidebar` | `MadsSidebar` | expanded-280, collapsed-72, sectioned | expanded, collapsed, active-item, hover | `--mads-color-surface`, `--mads-color-border`, `--mads-space-12` | Landmark `nav` berlabel; item aktif `aria-current="page"`; rail collapsed tetap memiliki tooltip dan label aksesibel. |
| MADS-NAV-02 | TabBar | Navigation | Berpindah antar panel dalam satu konteks. | `TabBar` | `MadsTabBar` | underline, pill, scrollable | active, hover, focus, disabled, overflow | `--mads-color-primary`, `--mads-space-8`, `--mads-motion-120` | `role="tablist"`, `aria-selected`, `aria-controls`; ArrowLeft/Right, Home/End; panel memakai `role="tabpanel"`. |
| MADS-NAV-03 | Breadcrumb | Navigation | Menunjukkan posisi hierarki dan jalan kembali. | `Breadcrumb` | `MadsBreadcrumb` | with-home, collapsed | default, truncated, current-page | `--mads-font-size-12`, `--mads-color-muted`, `--mads-space-4` | Landmark `nav` berlabel Breadcrumb; item terakhir `aria-current="page"`; elipsis dapat dibuka keyboard. |
| MADS-NAV-04 | CommandPalette | Navigation | Pencarian dan eksekusi perintah global. | `CommandPalette` | `MadsCommandPalette` | command-only, command-search, scope-tabs | empty-query, results, no-results, loading, error | `--mads-shadow-3`, `--mads-radius-16`, `--mads-space-12` | `role="dialog"` berisi combobox dan listbox; `aria-activedescendant`; ArrowKeys, Enter, Esc; hasil diumumkan `aria-live="polite"`. |
| MADS-NAV-05 | Pagination | Navigation | Berpindah halaman pada daftar panjang. | `Pagination` | `MadsPagination` | numbered, compact, load-more | page, prev-disabled, next-disabled, loading | `--mads-space-8`, `--mads-radius-8`, `--mads-color-border` | Landmark `nav` berlabel; halaman aktif `aria-current="page"`; target minimal 44×44 px. |
| MADS-NAV-06 | Stepper | Navigation | Menunjukkan progres langkah dan posisi saat ini. | `Stepper` | `MadsStepper` | horizontal, vertical, linear, non-linear | upcoming, current, complete, error, disabled | `--mads-color-primary`, `--mads-color-success`, `--mads-space-8` | Daftar terurut; langkah aktif `aria-current="step"`; status disampaikan dengan teks, bukan warna saja. |
| MADS-NAV-07 | Menu | Navigation | Daftar aksi dropdown atau kontekstual. | `Menu` | `MadsMenu` | dropdown, context, submenu, checkbox-item | closed, open, item-hover, item-disabled, checked | `--mads-shadow-2`, `--mads-radius-8`, `--mads-space-4` | `role="menu"` dan `role="menuitem"`; ArrowKeys, Home/End, Esc, typeahead; item checkbox memakai `aria-checked`. |
| MADS-NAV-08 | Dock | Navigation | Akses cepat ke aplikasi dan aksi utama di tepi layar. | `Dock` | `MadsDock` | mobile-tab-dock, desktop-launcher, badge | default, active, badge, overflow | `--mads-color-surface`, `--mads-shadow-2`, `--mads-radius-16`, `--mads-space-8` | Landmark `nav`; item aktif `aria-current="page"`; label terlihat di mobile; badge dibacakan sebagai bagian nama. |
| MADS-NAV-09 | WorkspaceSwitcher | Navigation | Berpindah workspace dengan isolasi data yang jelas. | `WorkspaceSwitcher` | `MadsWorkspaceSwitcher` | dropdown, side-sheet, searchable | closed, open, empty, loading | `--mads-color-surface`, `--mads-radius-12`, `--mads-space-8` | Tombol `aria-haspopup="listbox"` dan `aria-expanded`; nama workspace aktif terbaca; perpindahan lintas workspace dikonfirmasi. |
| MADS-NAV-10 | BackButton | Navigation | Kembali ke layar atau konteks sebelumnya. | `BackButton` | `MadsBackButton` | header, inline, with-label | default, disabled, loading | `--mads-space-8`, `--mads-radius-8`, `--mads-color-fg` | `aria-label` eksplisit (mis. Kembali ke Beranda); target 44×44 px; jangan menimpa gestur back sistem. |

### 3.3 Input (20)

| ID | Nama | Kategori | Guna | Web | Flutter | Varian | State wajib | Token | Catatan a11y |
|---|---|---|---|---|---|---|---|---|---|
| MADS-INP-01 | Button | Input | Memicu aksi dengan label teks dan hierarki visual jelas. | `Button` | `MadsButton` | primary, secondary, ghost, danger, sm-32, md-40, lg-48, icon-left, icon-right | default, hover, focus-visible, pressed, loading, disabled | `--mads-color-primary`, `--mads-radius-8`, `--mads-font-size-14`, `--mads-space-16`, `--mads-motion-120` | Elemen `button` native dengan `type` eksplisit; `aria-busy` saat loading; label teks tidak boleh hilang saat ikon ditambahkan. |
| MADS-INP-02 | IconButton | Input | Aksi ikon tunggal dengan area sentuh memadai. | `IconButton` | `MadsIconButton` | ghost, tonal, filled, sm-32, md-40 | default, hover, focus-visible, pressed, selected, disabled | `--mads-color-fg`, `--mads-radius-8`, `--mads-space-8` | `aria-label` wajib dan deskriptif; tooltip hanya pelengkap; target minimum 44×44 px untuk aksi utama. |
| MADS-INP-03 | TextField | Input | Input teks satu baris untuk data pendek. | `TextField` | `MadsTextField` | text, email, password, number, prefix, suffix, clearable | default, focus, filled, error, disabled, readonly | `--mads-color-border`, `--mads-color-error`, `--mads-radius-8`, `--mads-font-size-16` | Label eksplisit dan persisten; `aria-describedby` untuk hint dan error; atribut `autocomplete` sesuai tujuan. |
| MADS-INP-04 | TextArea | Input | Input teks multiline untuk catatan dan deskripsi. | `TextArea` | `MadsTextArea` | auto-grow, fixed, with-counter | default, focus, error, max-length, disabled | `--mads-color-surface`, `--mads-radius-8`, `--mads-font-size-16` | Label terasosiasi; hitung karakter diumumkan tanpa mengganggu setiap ketikan; error dijelaskan teks. |
| MADS-INP-05 | NumberField | Input | Input angka dengan batas, langkah, dan format. | `NumberField` | `MadsNumberField` | integer, decimal, currency, percent, stepper | default, focus, error, min-clamped, max-clamped, disabled | `--mads-space-8`, `--mads-radius-8`, `--mads-font-size-16` | `inputmode` numerik; `aria-valuemin`, `aria-valuemax`, `aria-valuenow` pada kontrol stepper; ArrowUp/Down menyesuaikan nilai. |
| MADS-INP-06 | SearchField | Input | Mencari dan menyaring konten dengan hasil langsung. | `SearchField` | `MadsSearchField` | inline, expanded, with-filter | empty, typing, loading, results, no-results | `--mads-radius-full`, `--mads-color-muted`, `--mads-space-12` | `role="searchbox"` berlabel; Esc membersihkan; jumlah hasil diumumkan `aria-live="polite"`. |
| MADS-INP-07 | Select | Input | Memilih satu opsi dari daftar tertutup. | `Select` | `MadsSelect` | native, custom, grouped, clearable | closed, open, selected, disabled, error, empty | `--mads-shadow-2`, `--mads-radius-8`, `--mads-space-8` | Combobox dengan `aria-expanded` dan `aria-controls`; ArrowKeys, Home/End, typeahead; opsi kosong dijelaskan. |
| MADS-INP-08 | Combobox | Input | Input dengan saran dinamis, tunggal atau banyak. | `Combobox` | `MadsCombobox` | single, multi, async, creatable | idle, typing, loading, open, no-results, error | `--mads-shadow-2`, `--mads-radius-8`, `--mads-space-8` | `aria-autocomplete="list"`, `aria-activedescendant`; Esc menutup tanpa menghapus nilai; saran asinkron tidak memindahkan fokus. |
| MADS-INP-09 | MultiSelect | Input | Memilih beberapa nilai dengan chip ringkas. | `MultiSelect` | `MadsMultiSelect` | chips, counter, searchable, max-values | default, focus, open, max-reached, error | `--mads-radius-full`, `--mads-space-4`, `--mads-color-border` | `role="listbox"` multiselect; Space memilih; tombol hapus chip berlabel; batas maksimum dijelaskan sebelum tercapai. |
| MADS-INP-10 | Checkbox | Input | Pilihan boolean tunggal atau bagian dari grup. | `Checkbox` | `MadsCheckbox` | single, group, indeterminate | unchecked, checked, indeterminate, focus, disabled, error | `--mads-color-primary`, `--mads-radius-4`, `--mads-space-8` | Input native dengan label terasosiasi; Space mengubah nilai; state indeterminate diumumkan `aria-checked="mixed"`. |
| MADS-INP-11 | RadioGroup | Input | Memilih tepat satu opsi yang selalu terlihat. | `RadioGroup` | `MadsRadioGroup` | stacked, inline, card | selected, unselected, focus, disabled, error | `--mads-color-primary`, `--mads-space-8`, `--mads-radius-8` | `fieldset` dan `legend`; ArrowKeys berpindah dan memilih; satu tab stop (roving tabindex). |
| MADS-INP-12 | Switch | Input | Mengubah pengaturan yang langsung berlaku. | `Switch` | `MadsSwitch` | trailing-label, leading-label, sm, md | on, off, focus, disabled, pending | `--mads-color-primary`, `--mads-color-muted`, `--mads-motion-180` | `role="switch"` dengan `aria-checked`; perubahan langsung diumumkan; jangan memakai switch untuk aksi yang butuh tombol simpan. |
| MADS-INP-13 | Slider | Input | Memilih nilai numerik dalam rentang menerus. | `Slider` | `MadsSlider` | continuous, stepped, with-input, marks | default, dragging, focus, disabled, error | `--mads-color-primary`, `--mads-space-8`, `--mads-motion-120` | `role="slider"` dengan `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`; ArrowKeys mengubah per langkah. |
| MADS-INP-14 | RangeSlider | Input | Memilih rentang minimum dan maksimum. | `RangeSlider` | `MadsRangeSlider` | min-max, marks, histogram | default, dragging, focus, invalid-range, disabled | `--mads-color-primary`, `--mads-space-8` | Dua thumb dengan label dan nilai masing-masing; ArrowKeys mengubah thumb aktif; rentang terbalik ditolak dengan pesan. |
| MADS-INP-15 | DatePicker | Input | Memilih satu tanggal atau rentang kalender. | `DatePicker` | `MadsDatePicker` | input, calendar-popover, range | closed, open, selected, today, disabled-date, error | `--mads-color-surface`, `--mads-radius-8`, `--mads-space-8` | Dialog kalender dengan grid dan `aria-selected`; ArrowKeys antar hari, PageUp/PageDown antar bulan; format tanggal lokal terbaca. |
| MADS-INP-16 | TimePicker | Input | Memilih waktu dengan format 12 atau 24 jam. | `TimePicker` | `MadsTimePicker` | 12-hour, 24-hour, spinner, text-input | default, open, error, disabled | `--mads-color-surface`, `--mads-space-8`, `--mads-font-size-16` | Spinbutton atau listbox berlabel jam dan menit; ArrowKeys menyesuaikan; nilai dibacakan dalam format 24 jam. |
| MADS-INP-17 | ColorPicker | Input | Memilih warna tema dari palet atau nilai hex. | `ColorPicker` | `MadsColorPicker` | swatch, hex-input, alpha | default, open, invalid-hex, disabled | `--mads-color-primary`, `--mads-radius-8`, `--mads-space-8` | Jangan mengandalkan warna saja: tampilkan kode hex dan nama warna; kontras pratinjau diumumkan. |
| MADS-INP-18 | FilePicker | Input | Memilih file atau folder dari perangkat. | `FilePicker` | `MadsFilePicker` | button, dropzone, multi-file, accept-filter | idle, drag-over, uploading, error, disabled | `--mads-color-border`, `--mads-radius-12`, `--mads-space-16` | Tombol memicu input file berlabel; daftar file terpilih terbaca; drag-and-drop memiliki alternatif keyboard. |
| MADS-INP-19 | SignaturePad | Input | Mengambil tanda tangan gambar atau ketik. | `SignaturePad` | `MadsSignaturePad` | draw, type, clearable | empty, drawing, signed, disabled, error | `--mads-color-fg`, `--mads-color-surface`, `--mads-radius-8` | Sediakan alternatif mengetik nama; instruksi terbaca; hasil disimpan sebagai data plus representasi teks. |
| MADS-INP-20 | OTPInput | Input | Memasukkan kode sekali pakai dari pesan. | `OTPInput` | `MadsOTPInput` | 4-digit, 6-digit, 8-digit, paste-fill, resend | empty, partial, complete, error, expired, disabled | `--mads-font-size-24`, `--mads-space-8`, `--mads-color-border` | Kontrol tunggal berlabel dengan `autocomplete="one-time-code"`; tempel kode mengisi seluruh slot; status kedaluwarsa diumumkan. |

### 3.4 Data (18)

| ID | Nama | Kategori | Guna | Web | Flutter | Varian | State wajib | Token | Catatan a11y |
|---|---|---|---|---|---|---|---|---|---|
| MADS-DATA-01 | DataTable | Data | Menampilkan data tabular dengan urutan dan seleksi. | `DataTable` | `MadsDataTable` | compact, comfortable, sortable, selectable, sticky-header | loading, empty, error, sorted, selected, filtered | `--mads-color-border`, `--mads-space-8`, `--mads-font-size-14` | Tabel semantik dengan `th scope`, `caption`, `aria-sort`; seleksi baris diumumkan; header lengket tidak boleh menutupi fokus. |
| MADS-DATA-02 | VirtualList | Data | Merender daftar sangat panjang tanpa memuat semua item. | `VirtualList` | `MadsVirtualList` | fixed-height, variable-height, horizontal | loading, ready, end-reached, error | `--mads-space-8`, `--mads-motion-120` | `list` dan `listitem`; `aria-setsize` dan `aria-posinset`; fokus item bertahan saat daftar bergulir. |
| MADS-DATA-03 | TreeView | Data | Menjelajah struktur hierarkis berlapis. | `TreeView` | `MadsTreeView` | single-select, multi-select, lazy-load | expanded, collapsed, selected, loading-children, error | `--mads-space-4`, `--mads-radius-4`, `--mads-font-size-14` | `role="tree"` dan `role="treeitem"` dengan `aria-expanded` serta `aria-level`; ArrowKeys, Home/End, Right/Left. |
| MADS-DATA-04 | KanbanBoard | Data | Mengelola kartu dalam kolom status yang dapat diubah. | `KanbanBoard` | `MadsKanbanBoard` | draggable, fixed-columns, swimlanes | default, dragging, drop-target, empty-column, loading | `--mads-color-bg`, `--mads-radius-12`, `--mads-space-12` | Pemindahan via keyboard (Ctrl+Arrow) mengumumkan kolom tujuan; setiap kolom berlabel dan dapat difokus; drag bukan satu-satunya jalan. |
| MADS-DATA-05 | Calendar | Data | Menampilkan jadwal harian, mingguan, atau bulanan. | `Calendar` | `MadsCalendar` | month, week, day, agenda | default, today, selected, event-overflow, loading | `--mads-color-surface`, `--mads-radius-8`, `--mads-space-8` | Grid dengan `aria-selected` dan nama hari; PageUp/PageDown berpindah periode; agenda menyediakan alternatif daftar. |
| MADS-DATA-06 | Timeline | Data | Menyusun kejadian kronologis dengan waktu. | `Timeline` | `MadsTimeline` | vertical, horizontal, grouped | default, loading, empty, error | `--mads-color-border`, `--mads-space-12`, `--mads-font-size-12` | Daftar terurut dengan waktu tekstual; urutan tidak boleh hanya disampaikan lewat posisi visual. |
| MADS-DATA-07 | LineChart | Data | Menunjukkan tren nilai dari waktu ke waktu. | `LineChart` | `MadsLineChart` | single-series, multi-series, area-fill, brush | loading, empty, hover-tooltip, error | `--mads-color-primary`, `--mads-color-muted`, `--mads-space-8` | Ringkasan teks dan tabel data alternatif; `aria-label` menjelaskan tren; seri dibedakan pola, bukan hanya warna. |
| MADS-DATA-08 | BarChart | Data | Membandingkan nilai antar kategori. | `BarChart` | `MadsBarChart` | grouped, stacked, horizontal | loading, empty, hover, negative-values | `--mads-color-primary`, `--mads-color-accent`, `--mads-space-8` | Tabel alternatif dengan nilai per kategori; label sumbu terbaca; nilai negatif dijelaskan arah dan angkanya. |
| MADS-DATA-09 | PieChart | Data | Menunjukkan proporsi bagian terhadap keseluruhan. | `PieChart` | `MadsPieChart` | donut, full, with-labels | loading, empty, hover, many-slices | `--mads-color-primary`, `--mads-color-accent`, `--mads-color-info` | Legenda berlabel dengan nilai dan persentase; maksimum tujuh irisan utama, sisanya digabung dan dijelaskan. |
| MADS-DATA-10 | AreaChart | Data | Menunjukkan volume kumulatif atau tumpang tindih. | `AreaChart` | `MadsAreaChart` | stacked, overlap, gradient | loading, empty, hover, error | `--mads-color-primary`, `--mads-color-success`, `--mads-space-8` | Tabel alternatif; area berbeda pola; kontras garis minimum 3:1 terhadap latar. |
| MADS-DATA-11 | StatCard | Data | Menampilkan satu metrik kunci beserta perubahan. | `StatCard` | `MadsStatCard` | delta-up, delta-down, sparkline, neutral | default, loading, error, stale | `--mads-color-surface`, `--mads-font-size-24`, `--mads-shadow-1` | Label, nilai, dan satuan dibaca berurutan; perubahan arah dijelaskan teks (naik/turun), bukan ikon saja. |
| MADS-DATA-12 | Badge | Data | Menandai status atau jumlah kecil pada elemen. | `Badge` | `MadsBadge` | dot, count, label, five-tones | default, muted, success, warning, error | `--mads-radius-full`, `--mads-font-size-12`, `--mads-space-4` | Badge titik menyertakan teks tersembunyi; jumlah dibacakan; makna status disertai teks di konteks terdekat. |
| MADS-DATA-13 | Tag | Data | Melabeli atau mengategorikan konten, dapat dihapus. | `Tag` | `MadsTag` | filled, outlined, removable, selectable | default, hover, selected, disabled | `--mads-radius-4`, `--mads-font-size-12`, `--mads-space-8` | Grup memakai `role="list"`; tombol hapus berlabel (mis. Hapus tag Laporan); status terpilih memakai `aria-pressed`. |
| MADS-DATA-14 | Avatar | Data | Mewakili pengguna atau entitas dengan gambar atau inisial. | `Avatar` | `MadsAvatar` | image, initials, icon, size-24-64, presence | loaded, fallback, error, presence | `--mads-radius-full`, `--mads-color-muted`, `--mads-font-size-14` | Nama entitas tersedia sebagai alt atau `aria-label`; status kehadiran dijelaskan teks, bukan hanya titik warna. |
| MADS-DATA-15 | Tooltip | Data | Memberi bantuan singkat pada elemen yang difokus. | `Tooltip` | `MadsTooltip` | hover, focus, four-placements | hidden, visible, delayed | `--mads-shadow-2`, `--mads-radius-4`, `--mads-font-size-12` | Dihubungkan dengan `aria-describedby`; Esc menutup; tooltip MUST NOT memuat aksi atau informasi wajib satu-satunya. |
| MADS-DATA-16 | Progress | Data | Menunjukkan kemajuan tugas determinate atau indeterminate. | `Progress` | `MadsProgress` | linear, circular, with-label | 0-100, indeterminate, success, error | `--mads-color-primary`, `--mads-radius-full`, `--mads-motion-240` | `role="progressbar"` dengan `aria-valuenow` dan label; animasi indeterminate berhenti saat reduced-motion. |
| MADS-DATA-17 | Skeleton | Data | Placeholder selama konten dimuat. | `Skeleton` | `MadsSkeleton` | text, circle, rect, shimmer | animating, static-reduced-motion | `--mads-color-border`, `--mads-motion-240` | `aria-hidden="true"`; status memuat diumumkan sekali oleh region induk; hormati `prefers-reduced-motion`. |
| MADS-DATA-18 | EmptyState | Data | Menjelaskan kondisi kosong dan langkah berikutnya. | `EmptyState` | `MadsEmptyState` | first-use, no-results, error, permission-denied | empty, filtered-empty, error, permission-denied | `--mads-color-muted`, `--mads-space-24`, `--mads-font-size-16` | Judul dan deskripsi teks plus aksi nyata; ilustrasi dekoratif `aria-hidden`; sebut alasan kosong secara spesifik. |

### 3.5 Feedback (10)

| ID | Nama | Kategori | Guna | Web | Flutter | Varian | State wajib | Token | Catatan a11y |
|---|---|---|---|---|---|---|---|---|---|
| MADS-FBK-01 | Alert | Feedback | Menyampaikan pesan inline yang terkait konteks. | `Alert` | `MadsAlert` | info, success, warning, error, dismissible | visible, dismissed, with-action | `--mads-color-info`, `--mads-color-error`, `--mads-radius-8`, `--mads-space-12` | Error memakai `role="alert"`; info memakai `aria-live="polite"`; ikon status disertai teks; tombol tutup berlabel. |
| MADS-FBK-02 | Toast | Feedback | Notifikasi singkat yang tidak memblokir pekerjaan. | `Toast` | `MadsToast` | info, success, error, undo, sm, md | entering, visible, with-action, dismissed | `--mads-shadow-2`, `--mads-radius-8`, `--mads-motion-180` | `aria-live="polite"`; durasi berhenti saat hover atau fokus; aksi undo dapat dijangkau keyboard dalam 10 detik. |
| MADS-FBK-03 | Banner | Feedback | Pesan persisten tingkat halaman atau aplikasi. | `Banner` | `MadsBanner` | offline, update, permission, security | visible, dismissed, with-action | `--mads-color-warning`, `--mads-radius-4`, `--mads-space-12` | Region berlabel yang dapat dilewati; jangan menutupi konten atau fokus; dismiss berlabel dan tidak menghapus informasi keamanan. |
| MADS-FBK-04 | FieldError | Feedback | Menjelaskan kesalahan validasi pada satu field. | `FieldError` | `MadsFieldError` | inline, form-summary | hidden, visible, resolved | `--mads-color-error`, `--mads-font-size-12`, `--mads-space-4` | Dihubungkan via `aria-describedby`; field memakai `aria-invalid="true"`; pesan menyebut nilai atau aturan yang salah. |
| MADS-FBK-05 | ConfirmDialog | Feedback | Meminta konfirmasi aksi berisiko atau destruktif. | `ConfirmDialog` | `MadsConfirmDialog` | default, destructive, typed-confirm | open, busy, error | `--mads-shadow-3`, `--mads-radius-16`, `--mads-color-error` | `role="alertdialog"`; fokus awal pada tombol batal; Esc membatalkan; aksi destruktif tidak menjadi default Enter. |
| MADS-FBK-06 | PermissionDialog | Feedback | Meminta izin capability dengan penjelasan risiko. | `PermissionDialog` | `MadsPermissionDialog` | low-risk, medium-risk, high-risk, allow-once | closed, open, granted, denied, error | `--mads-color-warning`, `--mads-color-error`, `--mads-radius-16` | `role="dialog"` berlabel; fokus pada judul; alasan dan cakupan izin terbaca; tolak setara dengan izinkan. |
| MADS-FBK-07 | ErrorBoundary | Feedback | Membatasi kerusakan UI saat komponen gagal. | `ErrorBoundary` | `MadsErrorBoundary` | app-level, panel-level, micro-app-crash | idle, error, recovered, crashed | `--mads-color-error`, `--mads-radius-12`, `--mads-space-16` | Judul, penjelasan, dan aksi pemulihan; fokus dipindah ke judul; detail teknis dapat dibuka tetapi tidak wajib dibacakan. |
| MADS-FBK-08 | OfflineBanner | Feedback | Menandai status offline atau koneksi terdegradasi. | `OfflineBanner` | `MadsOfflineBanner` | offline, degraded, reconnecting | offline, reconnecting, synced | `--mads-color-warning`, `--mads-font-size-12`, `--mads-space-8` | `role="status"`; perubahan koneksi diumumkan sekali; banner tidak boleh memblokir tindakan offline-first. |
| MADS-FBK-09 | SyncStatus | Feedback | Menunjukkan status sinkronisasi dan konflik. | `SyncStatus` | `MadsSyncStatus` | icon-only, with-label, detail-panel | synced, syncing, queued, conflict, error, paused | `--mads-color-success`, `--mads-color-warning`, `--mads-color-error` | Label teks plus waktu sinkron terakhir; status konflik berupa tombol yang dapat difokus; icon-only wajib punya nama aksesibel. |
| MADS-FBK-10 | LoadingOverlay | Feedback | Menutup area selama operasi yang perlu ditunggu. | `LoadingOverlay` | `MadsLoadingOverlay` | blocking, non-blocking, determinate | visible, progress, error, timeout | `--mads-color-surface`, `--mads-shadow-1`, `--mads-motion-180` | Region induk memakai `aria-busy="true"`; teks status tersedia; jangan menangkap fokus tanpa alasan; timeout menampilkan aksi. |

### 3.6 Media (10)

| ID | Nama | Kategori | Guna | Web | Flutter | Varian | State wajib | Token | Catatan a11y |
|---|---|---|---|---|---|---|---|---|---|
| MADS-MED-01 | Image | Media | Menampilkan gambar dengan rasio dan fallback jelas. | `Image` | `MadsImage` | cover, contain, fixed-ratio, with-caption | loading, loaded, error, offline-cache | `--mads-radius-8`, `--mads-color-border`, `--mads-space-8` | `alt` wajib; dekoratif memakai `alt=""`; caption opsional terhubung; gambar gagal menampilkan teks alternatif. |
| MADS-MED-02 | VideoPlayer | Media | Memutar video dengan kontrol dan caption. | `VideoPlayer` | `MadsVideoPlayer` | inline, fullscreen, captions, poster | idle, playing, paused, buffering, error | `--mads-color-surface`, `--mads-radius-8`, `--mads-space-8` | Kontrol dapat dioperasikan keyboard; caption tersedia; tidak autoplay bersuara; transkrip disarankan. |
| MADS-MED-03 | AudioPlayer | Media | Memutar audio dengan kontrol ringkas. | `AudioPlayer` | `MadsAudioPlayer` | compact, waveform, speed-control | idle, loading, playing, paused, error | `--mads-color-primary`, `--mads-space-8`, `--mads-font-size-12` | Label media dan durasi terbaca; kontrol keyboard; audio tidak menjadi satu-satunya penyampai informasi. |
| MADS-MED-04 | CameraCapture | Media | Mengambil foto atau video dari kamera perangkat. | `CameraCapture` | `MadsCameraCapture` | photo, video, document-scan | idle, requesting-permission, streaming, capturing, denied, error | `--mads-radius-12`, `--mads-color-surface`, `--mads-space-16` | Tombol rana berlabel; izin ditolak menampilkan alasan dan alternatif unggah file; kamera bukan satu-satunya jalur. |
| MADS-MED-05 | QRScanner | Media | Memindai kode QR untuk pairing atau tautan. | `QRScanner` | `MadsQRScanner` | camera, upload-image, torch | idle, scanning, detected, invalid, denied | `--mads-color-fg`, `--mads-radius-12`, `--mads-space-16` | Instruksi teks posisi kode; input kode manual tersedia; hasil valid diumumkan; torch berlabel. |
| MADS-MED-06 | BarcodeScanner | Media | Memindai barcode produk atau aset. | `BarcodeScanner` | `MadsBarcodeScanner` | 1D, 2D, continuous | idle, scanning, detected, not-found, denied | `--mads-color-fg`, `--mads-radius-12`, `--mads-space-16` | Input manual tersedia; umpan balik sukses berupa teks dan suara opsional, bukan getaran saja. |
| MADS-MED-07 | MapView | Media | Menampilkan lokasi dan marker pada peta. | `MapView` | `MadsMapView` | static, interactive, markers, cluster | loading, ready, offline-tiles, error | `--mads-color-surface`, `--mads-radius-12`, `--mads-space-8` | Daftar lokasi alternatif tersedia; zoom dan pan keyboard; status tile offline dijelaskan; marker memiliki label. |
| MADS-MED-08 | PDFViewer | Media | Membaca dokumen PDF dengan navigasi halaman. | `PDFViewer` | `MadsPdfViewer` | single-page, continuous, search | loading, ready, encrypted, error | `--mads-color-bg`, `--mads-radius-4`, `--mads-space-8` | Navigasi halaman keyboard; ukuran teks dapat diperbesar 200%; dokumen terenkripsi meminta kata sandi dengan pesan jelas. |
| MADS-MED-09 | MarkdownView | Media | Merender Markdown tersanitasi menjadi konten terbaca. | `MarkdownView` | `MadsMarkdownView` | readonly, with-toc, compact | default, empty, error | `--mads-font-size-16`, `--mads-space-16`, `--mads-color-border` | Hierarki heading benar dan tidak melompat; tabel memakai header; tautan deskriptif; HTML mentah tidak dirender. |
| MADS-MED-10 | RichTextEditor | Media | Menyunting teks berformat dengan toolbar terbatas. | `RichTextEditor` | `MadsRichTextEditor` | comment, full, with-mentions | default, focus, saving, conflict, error | `--mads-color-surface`, `--mads-radius-8`, `--mads-font-size-16` | Toolbar `role="toolbar"` dengan shortcut; area konten berlabel; status simpan dan konflik diumumkan. |

### 3.7 Domain (20)

| ID | Nama | Kategori | Guna | Web | Flutter | Varian | State wajib | Token | Catatan a11y |
|---|---|---|---|---|---|---|---|---|---|
| MADS-DOM-01 | FormBuilder | Domain | Menyusun form dari field dengan pratinjau langsung. | `FormBuilder` | `MadsFormBuilder` | blank, template, multi-step | draft, dirty, valid, invalid, saving, error | `--mads-color-surface`, `--mads-radius-12`, `--mads-space-16` | Struktur fieldset dan legend; urutan fokus logis; ringkasan error di atas form dan terhubung ke field. |
| MADS-DOM-02 | SchemaForm | Domain | Merender form langsung dari JSON Schema. | `SchemaForm` | `MadsSchemaForm` | create, edit, readonly, wizard | idle, validating, invalid, submitting, submitted, error | `--mads-space-16`, `--mads-radius-8`, `--mads-color-border` | Label diambil dari schema; field wajib ditandai teks; error per field dan ringkasan; tipe field tak dikenal ditampilkan sebagai teks. |
| MADS-DOM-03 | WorkflowNode | Domain | Merepresentasikan satu langkah dalam graf workflow. | `WorkflowNode` | `MadsWorkflowNode` | trigger, action, condition, human-approval | idle, selected, running, success, failed, waiting-network | `--mads-radius-12`, `--mads-color-success`, `--mads-color-error`, `--mads-space-8` | Node fokusabel dengan nama, tipe, dan status terbaca; ArrowKeys memindahkan fokus antar node; editor daftar menjadi alternatif kanvas. |
| MADS-DOM-04 | CodeEditor | Domain | Menyunting kode dengan highlight dan diagnostik. | `CodeEditor` | `MadsCodeEditor` | typescript, json, sql, markdown, diff-mode | default, focus, error-marker, readonly, offline-lsp | `JetBrains Mono`, `--mads-font-size-14`, `--mads-color-surface` | Area editor berlabel; baris dan kolom diumumkan; mode baca dengan navigasi keyboard; kontras token minimum 4.5:1. |
| MADS-DOM-05 | DiffViewer | Domain | Membandingkan dua versi teks atau data. | `DiffViewer` | `MadsDiffViewer` | unified, split, with-comments | default, no-changes, conflict, large-collapsed | `--mads-color-success`, `--mads-color-error`, `--mads-font-size-14` | Perubahan ditandai tanda plus dan minus, bukan warna saja; struktur tabel baris terbaca; komentar fokusabel. |
| MADS-DOM-06 | Terminal | Domain | Menjalankan perintah dan menampilkan keluaran. | `Terminal` | `MadsTerminal` | readonly, interactive | idle, running, exited, error, disconnected | `--mads-color-bg`, `JetBrains Mono`, `--mads-font-size-14` | Keluaran live diumumkan terbatas via `aria-live="polite"`; riwayat dapat dibaca ulang; kontras teks memenuhi 4.5:1. |
| MADS-DOM-07 | LogViewer | Domain | Menelusuri log dengan filter level dan waktu. | `LogViewer` | `MadsLogViewer` | live, static, level-filter | streaming, paused, empty, error | `JetBrains Mono`, `--mads-font-size-12`, `--mads-color-muted` | Level ditampilkan sebagai teks; pause menghentikan pengumuman live; pencarian dan filter dapat dioperasikan keyboard. |
| MADS-DOM-08 | ChatThread | Domain | Menampilkan percakapan dengan AI atau kolaborator. | `ChatThread` | `MadsChatThread` | assistant, user-group, streaming | empty, streaming, complete, error, retry | `--mads-space-12`, `--mads-radius-12`, `--mads-color-surface` | `role="log"`; pesan baru diumumkan `aria-live="polite"`; fokus input stabil saat pesan bertambah; tombol berhenti tersedia. |
| MADS-DOM-09 | MessageBubble | Domain | Menampilkan satu pesan beserta status kirim. | `MessageBubble` | `MadsMessageBubble` | user, assistant, system, with-attachment | sending, sent, failed, streaming | `--mads-radius-16`, `--mads-color-surface`, `--mads-font-size-14` | Pengirim dan waktu terbaca; status gagal memiliki aksi kirim ulang; lampiran memiliki nama file. |
| MADS-DOM-10 | ReceiptView | Domain | Menampilkan struk transaksi siap cetak. | `ReceiptView` | `MadsReceiptView` | thermal, a4, with-tax-breakdown | default, loading, error, voided | `JetBrains Mono`, `--mads-font-size-12`, `--mads-color-border` | Total dan subtotal ditekankan secara tekstual; struktur tabel berheader; status void terbaca eksplisit. |
| MADS-DOM-11 | InvoiceView | Domain | Menampilkan faktur dengan status pembayaran. | `InvoiceView` | `MadsInvoiceView` | draft, sent, paid, overdue, void | draft, sent, paid, overdue, void | `--mads-color-surface`, `--mads-radius-8`, `--mads-space-16` | Heading hierarkis; tabel item berheader; status pembayaran berupa teks plus warna; mata uang selalu ditampilkan. |
| MADS-DOM-12 | ContactPicker | Domain | Memilih kontak dari address book perangkat. | `ContactPicker` | `MadsContactPicker` | single, multi, permission-aware | loading, ready, empty, denied, search | `--mads-space-8`, `--mads-radius-8`, `--mads-color-surface` | Listbox dengan pencarian; izin ditolak menampilkan alasan dan jalur pengaturan; kontak terpilih terbaca. |
| MADS-DOM-13 | FileTree | Domain | Menjelajah file proyek dan statusnya. | `FileTree` | `MadsFileTree` | project, export, context-actions | expanded, selected, loading, error, readonly | `--mads-space-4`, `JetBrains Mono`, `--mads-font-size-14` | `role="tree"` dengan `aria-expanded`; ArrowKeys; nama file dan tipe terbaca; aksi konteks tersedia via keyboard. |
| MADS-DOM-14 | RecordDetail | Domain | Menampilkan dan menyunting satu record data. | `RecordDetail` | `MadsRecordDetail` | readonly, edit, tabbed-sections | loading, ready, dirty, saving, error, deleted | `--mads-color-surface`, `--mads-radius-12`, `--mads-space-16` | Heading per bagian; setiap field berlabel; hasil simpan diumumkan; perubahan belum tersimpan ditandai teks. |
| MADS-DOM-15 | FilterBar | Domain | Menyaring daftar dengan filter aktif yang terlihat. | `FilterBar` | `MadsFilterBar` | inline, sheet, chips, saved-filters | default, active-filters, empty-result, error | `--mads-space-8`, `--mads-radius-full`, `--mads-color-border` | Tombol filter `aria-expanded`; chip filter dapat dihapus dan berlabel; jumlah hasil diumumkan setelah filter berubah. |
| MADS-DOM-16 | SavedView | Domain | Menyimpan dan memuat kombinasi filter dan tata letak. | `SavedView` | `MadsSavedView` | personal, shared, default-view | list, empty, syncing, conflict | `--mads-radius-8`, `--mads-color-surface`, `--mads-space-8` | Nama view terbaca; aksi ganti nama dan hapus berlabel; view bersama menampilkan pemilik. |
| MADS-DOM-17 | ImportWizard | Domain | Mengimpor data dari CSV, JSON, atau SQLite. | `ImportWizard` | `MadsImportWizard` | csv, json, sqlite, dexie-migration | idle, mapping, validating, importing, done, error | `--mads-space-16`, `--mads-radius-12`, `--mads-color-info` | Stepper berlabel; error per baris dengan nomor baris; progres diumumkan; pratinjau dapat dinavigasi keyboard. |
| MADS-DOM-18 | ExportDialog | Domain | Menyiapkan ekspor data dalam format terpilih. | `ExportDialog` | `MadsExportDialog` | sqlite, jsonl, csv, markdown, encrypted-snapshot | idle, configuring, exporting, done, error | `--mads-color-surface`, `--mads-radius-12`, `--mads-space-16` | Format sebagai radio berlabel; peringatan enkripsi terbaca; path dan nama file ditampilkan sebelum ekspor. |
| MADS-DOM-19 | VaultItem | Domain | Menampilkan item rahasia dengan nilai tersembunyi. | `VaultItem` | `MadsVaultItem` | credential, secure-note, key | locked, unlocked, revealed, copied, error | `--mads-color-surface`, `--mads-radius-8`, `--mads-space-12` | Nilai tidak dirender ke DOM saat terkunci; tombol reveal berlabel; auto-hide setelah 30 detik; salin diumumkan. |
| MADS-DOM-20 | DeviceCard | Domain | Menampilkan perangkat terhubung dan status kepercayaan. | `DeviceCard` | `MadsDeviceCard` | current-device, trusted, pending, revoke | active, idle, pending, revoked, key-mismatch | `--mads-radius-12`, `--mads-color-success`, `--mads-color-warning` | Status sebagai teks; fingerprint kunci terbaca; pencabutan memerlukan konfirmasi dan diumumkan. |

### 3.8 Platform (10)

| ID | Nama | Kategori | Guna | Web | Flutter | Varian | State wajib | Token | Catatan a11y |
|---|---|---|---|---|---|---|---|---|---|
| MADS-PLT-01 | AppIcon | Platform | Menampilkan identitas visual micro-app di launcher dan daftar. | `AppIcon` | `MadsAppIcon` | squircle, circle, size-24-96, with-badge | default, active, updating, error, missing | `--mads-radius-16`, `--mads-shadow-1`, `--mads-space-4` | Nama aplikasi menjadi label aksesibel; badge dibacakan; ikon placeholder tetap memiliki nama. |
| MADS-PLT-02 | WidgetFrame | Platform | Membungkus widget home yang menampilkan data micro-app. | `WidgetFrame` | `MadsWidgetFrame` | small, medium, large, live, static | loading, ready, stale, error, hibernated | `--mads-color-surface`, `--mads-radius-16`, `--mads-shadow-2` | Label widget dan waktu pembaruan terbaca; aksi refresh berlabel; konten interaktif fokusabel; state basi dijelaskan teks. |
| MADS-PLT-03 | WindowChrome | Platform | Menyediakan kontrol jendela pada host desktop. | `WindowChrome` | `MadsWindowChrome` | native, custom, traffic-light | focused, blurred, maximized, fullscreen | `--mads-color-bg`, `--mads-space-8`, `--mads-shadow-1` | Tombol minimize, maximize, close berlabel; area drag memiliki alternatif menu jendela; state fokus tidak hanya warna. |
| MADS-PLT-04 | ContextMenu | Platform | Menampilkan aksi untuk elemen yang diklik kanan atau ditekan lama. | `ContextMenu` | `MadsContextMenu` | single-level, submenu | closed, open, item-disabled | `--mads-shadow-2`, `--mads-radius-8`, `--mads-space-4` | Dapat dibuka via Shift+F10 atau tombol Menu; `role="menu"`; Esc menutup dan fokus kembali ke elemen asal. |
| MADS-PLT-05 | NotificationItem | Platform | Menampilkan satu notifikasi di pusat notifikasi. | `NotificationItem` | `MadsNotificationItem` | info, action-required, error, grouped | unread, read, actioned, dismissed | `--mads-color-surface`, `--mads-space-12`, `--mads-font-size-14` | Waktu relatif terbaca; status belum dibaca disampaikan teks; aksi notifikasi fokusabel. |
| MADS-PLT-06 | ShareSheet | Platform | Membagikan konten ke target berbagi sistem. | `ShareSheet` | `MadsShareSheet` | system-targets, custom-targets | closed, open, preparing, error | `--mads-radius-16`, `--mads-shadow-2`, `--mads-space-16` | Daftar target berlabel; Esc atau tombol tutup; fokus kembali ke pemicu setelah ditutup. |
| MADS-PLT-07 | IntentPicker | Platform | Memilih micro-app yang menangani intent atau deep link. | `IntentPicker` | `MadsIntentPicker` | default, remember-choice | open, empty, loading, error | `--mads-color-surface`, `--mads-radius-12`, `--mads-space-12` | Dialog berlabel; perbedaan pilihan sekali dan selalu dijelaskan; jika tidak ada handler, tampilkan alasan. |
| MADS-PLT-08 | PermissionBadge | Platform | Merangkum tingkat izin yang diminta micro-app. | `PermissionBadge` | `MadsPermissionBadge` | count, detail, risk-color | safe, medium, high, revoked | `--mads-color-warning`, `--mads-color-error`, `--mads-radius-full` | Jumlah izin dan tingkat risiko dibacakan sebagai teks; klik membuka daftar izin; warna bukan satu-satunya penanda. |
| MADS-PLT-09 | StorageMeter | Platform | Menunjukkan pemakaian penyimpanan lokal atau server. | `StorageMeter` | `MadsStorageMeter` | bar, detail, per-app | normal, warning-80, full, loading | `--mads-color-primary`, `--mads-color-warning`, `--mads-color-error` | Nilai numerik dan satuan terbaca; ambang 80 persen dan penuh dijelaskan teks; aksi bersihkan berlabel. |
| MADS-PLT-10 | UpdateCard | Platform | Menawarkan pembaruan micro-app atau host. | `UpdateCard` | `MadsUpdateCard` | available, required, delta-size | available, downloading, ready, failed, pinned | `--mads-color-info`, `--mads-radius-12`, `--mads-space-12` | Versi lama dan baru terbaca; ukuran unduhan sebagai teks; tombol tunda setara dengan perbarui; status pin dijelaskan. |

### 3.9 AI (10)

| ID | Nama | Kategori | Guna | Web | Flutter | Varian | State wajib | Token | Catatan a11y |
|---|---|---|---|---|---|---|---|---|---|
| MADS-AI-01 | PromptInput | AI | Menerima prompt untuk generasi atau percakapan AI. | `PromptInput` | `MadsPromptInput` | single-line, expanded, attachments, provider-chip | empty, typing, submitting, streaming, error | `--mads-radius-12`, `--mads-color-surface`, `--mads-space-12` | Area teks berlabel; Enter mengirim dan Shift+Enter menambah baris; status streaming dan tombol berhenti diumumkan. |
| MADS-AI-02 | ModelPicker | AI | Memilih provider dan model AI secara eksplisit. | `ModelPicker` | `MadsModelPicker` | local, byok, capability-tags | closed, open, selected, unavailable, loading | `--mads-shadow-2`, `--mads-radius-8`, `--mads-space-8` | Combobox dengan status ketersediaan teks; tidak ada perpindahan provider diam-diam; alasan tidak tersedia terbaca. |
| MADS-AI-03 | AIStatus | AI | Menunjukkan kesiapan mesin AI dan provider aktif. | `AIStatus` | `MadsAIStatus` | inline, panel, offline, loading-model | idle, loading-model, ready, offline, error | `--mads-color-muted`, `--mads-color-warning`, `--mads-color-success` | `role="status"`; waktu muat model dan alasan gagal terbaca; status tidak hanya ikon warna. |
| MADS-AI-04 | SuggestionChip | AI | Menawarkan prompt atau aksi lanjutan yang relevan. | `SuggestionChip` | `MadsSuggestionChip` | prompt, action, refine | default, hover, focus, disabled, used | `--mads-radius-full`, `--mads-space-8`, `--mads-font-size-12` | Label berupa aksi utuh yang dapat dipahami di luar konteks; target 44×44 px; status sudah dipakai dijelaskan. |
| MADS-AI-05 | DiffSuggestion | AI | Menampilkan usulan perubahan kode atau UI untuk disetujui. | `DiffSuggestion` | `MadsDiffSuggestion` | inline, panel, accept-reject | pending, accepted, rejected, stale | `--mads-color-success`, `--mads-color-error`, `--mads-font-size-14` | Ringkasan perubahan terbaca sebelum detail; tombol terima dan tolak berlabel; diff tidak hanya dibedakan warna. |
| MADS-AI-06 | GenerationProgress | AI | Menunjukkan tahapan generasi dan opsi membatalkan. | `GenerationProgress` | `MadsGenerationProgress` | steps, indeterminate, cancellable | running, waiting-model, done, cancelled, error | `--mads-color-primary`, `--mads-motion-240`, `--mads-space-8` | `role="progressbar"` atau status; tahap aktif diumumkan sekali; tombol batal fokusabel dan tidak auto-retry setelah dibatalkan. |
| MADS-AI-07 | SourceCitation | AI | Menautkan klaim ke sumber lokal atau web. | `SourceCitation` | `MadsSourceCitation` | inline, list, local, web | default, loading, unavailable | `--mads-font-size-12`, `--mads-color-info`, `--mads-radius-4` | Tautan berlabel deskriptif; nomor sitasi terbaca; tautan eksternal ditandai dan sumber tidak tersedia dijelaskan. |
| MADS-AI-08 | AIError | AI | Menjelaskan kegagalan AI dan langkah pemulihan. | `AIError` | `MadsAIError` | model-missing, timeout, quota, cancelled | error, retry-available, resolved | `--mads-color-error`, `--mads-radius-8`, `--mads-space-12` | Pesan memuat sebab dan langkah berikut; retry hanya manual; tidak ada auto-retry setelah pengguna membatalkan. |
| MADS-AI-09 | TokenMeter | AI | Menunjukkan pemakaian token atau konteks model. | `TokenMeter` | `MadsTokenMeter` | inline, panel, budget | normal, near-limit, exceeded | `--mads-color-warning`, `--mads-color-error`, `--mads-font-size-12` | Angka dan ambang dibacakan; peringatan disampaikan teks; angka teknis memakai `tabular-nums`. |
| MADS-AI-10 | AgentStep | AI | Menampilkan satu langkah rencana atau pemanggilan tool agen. | `AgentStep` | `MadsAgentStep` | plan, tool-call, observation, final | pending, running, done, failed, skipped | `--mads-color-muted`, `--mads-color-success`, `--mads-radius-8` | Urutan langkah terbaca berurutan; status berupa teks; hasil panjang dapat diciutkan dengan label yang jelas. |

## 4. Spesifikasi Komponen Inti

Dua puluh komponen berikut adalah komponen inti yang dipakai lintas layar. Spesifikasi di bawah bersifat normatif untuk implementasi web dan Flutter: anatomi, ukuran, state, keyboard, ARIA, dan token MUST sama; hanya detail platform yang boleh berbeda. Setiap perubahan pada bagian ini MUST disertai pembaruan baris terkait di §3 serta pengujian kontrak MUIP dan aksesibilitas.

### 4.1 MADS-INP-01 Button

Anatomi: `container` → `[leading-icon]` + `label` + `[trailing-icon]` + `[spinner saat loading]`.

| Aspek | Ketentuan |
|---|---|
| Varian | primary, secondary, ghost, danger; ikon kiri atau kanan; lebar mengikuti konten atau penuh |
| Ukuran | sm 32 px, md 40 px, lg 48 px; padding horizontal 12, 16, dan 20 px; target sentuh minimum 44×44 px |
| State | default, hover, focus-visible, pressed, loading, disabled |
| Keyboard | Enter dan Space memicu aksi; Tab masuk dan keluar; saat loading fokus tetap di tombol dan aksi tidak terpicu ulang |
| ARIA | Elemen `button` dengan `type` eksplisit; `aria-busy="true"` saat loading; `disabled` untuk nonaktif; ikon dekoratif `aria-hidden` |
| Token | `--mads-color-primary`, `--mads-color-on-primary`, `--mads-radius-8`, `--mads-font-size-14`, `--mads-space-16`, `--mads-motion-120` |

Do:

- Gunakan satu tombol primary per area aksi dan letakkan aksi utama paling kanan atau paling bawah sesuai platform.
- Pertahankan label teks yang sama saat loading dan tampilkan spinner di samping label.
- Beri jarak minimum `--mads-space-8` antar tombol yang berdampingan.

Don't:

- Jangan memakai Button untuk navigasi yang tidak mengubah state; gunakan tautan dengan gaya yang sesuai.
- Jangan menonaktifkan tombol tanpa menjelaskan alasan yang dapat ditemukan pengguna.
- Jangan menghilangkan label saat tombol menyusut menjadi ikon; gunakan IconButton berlabel.

### 4.2 MADS-INP-03 TextField

Anatomi: `field` → `label` + `input` + `[prefix]` + `[suffix]` + `[clear]` + `hint` + `error`.

| Aspek | Ketentuan |
|---|---|
| Varian | text, email, password, number; prefix atau suffix; clearable; ukuran mengikuti lebar container |
| Ukuran | tinggi 40 px (desktop) dan 44 px (sentuh); padding horizontal `--mads-space-12`; radius 8 px |
| State | default, hover, focus, filled, error, disabled, readonly |
| Keyboard | Tab memindahkan fokus; Enter mengirim form bila berada dalam form; Esc membersihkan pencarian hanya pada varian search |
| ARIA | `label` terasosiasi eksplisit; hint dan error dihubungkan dengan `aria-describedby`; `aria-invalid="true"` saat error; `autocomplete` sesuai tujuan |
| Token | `--mads-color-border`, `--mads-color-border-strong`, `--mads-color-error`, `--mads-radius-8`, `--mads-font-size-16` |

Do:

- Tampilkan error setelah field disentuh atau form dikirim, dengan pesan yang menyebut aturan yang dilanggar.
- Gunakan `inputmode` yang tepat untuk email, telepon, dan angka.
- Sediakan tombol reveal berlabel pada field password.

Don't:

- Jangan memakai placeholder sebagai satu-satunya label.
- Jangan memvalidasi sambil mengetik tanpa jeda hingga pengguna berhenti.
- Jangan mengosongkan nilai saat terjadi error validasi.

### 4.3 MADS-DATA-01 DataTable

Anatomi: `table` → `caption` + `thead` (kolom, sort, seleksi) + `tbody` (baris, sel) + `tfoot` (total) + `[empty-state]`.

| Aspek | Ketentuan |
|---|---|
| Varian | compact dan comfortable; sortable; selectable; sticky header; kolom dapat disembunyikan |
| Ukuran | tinggi baris compact 32 px dan comfortable 44 px; padding sel `--mads-space-8`; header lengket maksimum 48 px |
| State | loading, empty, error, sorted, selected, filtered |
| Keyboard | Tab masuk ke tabel; ArrowKeys berpindah sel; Space memilih baris; Enter membuka detail; sort dapat dipicu dari header |
| ARIA | Tabel semantik dengan `th scope="col"` dan `caption`; `aria-sort` pada kolom aktif; seleksi baris memakai `aria-selected`; jumlah hasil diumumkan |
| Token | `--mads-color-border`, `--mads-color-surface`, `--mads-space-8`, `--mads-font-size-14`, `--mads-shadow-1` |

Do:

- Tetapkan lebar kolom minimum dan biarkan tabel menggulir horizontal pada compact.
- Tampilkan unit dan format angka secara konsisten, dengan `tabular-nums` untuk kolom angka.
- Sediakan EmptyState yang menjelaskan filter aktif bila hasil kosong.

Don't:

- Jangan menyembunyikan kolom penting pada layar kecil tanpa jalan melihatnya.
- Jangan memakai warna baris sebagai satu-satunya penanda status.
- Jangan mengurutkan ulang baris secara visual tanpa memperbarui state dan pengumuman.

### 4.4 MADS-DOM-02 SchemaForm

Anatomi: `form` → `[summary]` + daftar `field-group` (label, kontrol, hint, error) + `actions`.

| Aspek | Ketentuan |
|---|---|
| Varian | create, edit, readonly, wizard; tata letak satu kolom dan dua kolom pada expanded |
| Ukuran | jarak antar field `--mads-space-16`; kontrol mengikuti komponen input yang dipetakan; lebar maksimum mengikuti kontainer |
| State | idle, validating, invalid, submitting, submitted, error |
| Keyboard | Tab mengikuti urutan field; Enter mengirim dari field terakhir; error summary dapat difokus dan menautkan ke field |
| ARIA | Setiap field memiliki label dari schema; field wajib ditandai teks; error dihubungkan `aria-describedby`; ringkasan error memakai heading dan daftar tautan |
| Token | `--mads-space-16`, `--mads-radius-8`, `--mads-color-border`, `--mads-color-error` |

Do:

- Petakan tipe schema ke komponen input yang sesuai dan tampilkan tipe tak dikenal sebagai field teks readonly dengan penjelasan.
- Validasi di klien dan server dengan pesan yang sama untuk aturan yang sama.
- Simpan draft secara lokal saat pengguna berpindah langkah wizard.

Don't:

- Jangan membuat field baru hanya karena schema memuat properti yang tidak didukung; gunakan fallback eksplisit.
- Jangan menyembunyikan field wajib yang gagal validasi.
- Jangan mengirim form secara otomatis saat field terakhir valid.

### 4.5 MADS-LAY-08 Modal

Anatomi: `backdrop` + `dialog` → `header` (judul, tombol tutup) + `body` + `footer` (aksi).

| Aspek | Ketentuan |
|---|---|
| Varian | dialog, confirm, fullscreen; lebar sm 480 px, md 640 px, lg 800 px |
| Ukuran | padding `--mads-space-24`; jarak aksi `--mads-space-8`; tinggi maksimum 90 persen viewport dengan body menggulir |
| State | closed, opening, open, busy, error |
| Keyboard | Esc menutup kecuali busy; Tab terperangkap di dalam dialog; Enter memicu aksi default hanya bila bukan aksi destruktif |
| ARIA | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pada judul, `aria-describedby` pada deskripsi; fokus awal pada kontrol pertama atau judul |
| Token | `--mads-shadow-3`, `--mads-radius-16`, `--mads-color-surface`, `--mads-motion-180` |

Do:

- Kembalikan fokus ke elemen pemicu setelah dialog ditutup.
- Gunakan ConfirmDialog untuk aksi destruktif, bukan Modal biasa.
- Pertahankan judul yang menjelaskan keputusan, bukan kata umum seperti Konfirmasi.

Don't:

- Jangan menumpuk lebih dari satu modal pada satu waktu.
- Jangan menutup modal saat klik backdrop untuk formulir yang belum tersimpan tanpa konfirmasi.
- Jangan memindahkan fokus ke belakang dialog saat terbuka.

### 4.6 MADS-NAV-04 CommandPalette

Anatomi: `overlay` + `dialog` → `search-input` + `[scope-tabs]` + `result-list` (grup, item, shortcut) + `footer-hint`.

| Aspek | Ketentuan |
|---|---|
| Varian | command-only, command-search, scope-tabs; hasil dikelompokkan per kategori |
| Ukuran | lebar 640 px pada expanded dan penuh pada compact; tinggi maksimum 60 persen viewport; item setinggi 40 px |
| State | empty-query, results, no-results, loading, error |
| Keyboard | Cmd/Ctrl+K membuka; ArrowKeys berpindah hasil; Enter menjalankan; Esc menutup; Tab berpindah antar zona; fokus selalu kembali ke pemicu |
| ARIA | `role="dialog"` berlabel; input `role="combobox"` dengan `aria-controls` dan `aria-activedescendant`; daftar `role="listbox"`; hasil asinkron diumumkan `aria-live="polite"` |
| Token | `--mads-shadow-3`, `--mads-radius-16`, `--mads-space-12`, `--mads-color-surface`, `--mads-motion-180` |

Do:

- Tampilkan perintah yang paling relevan lebih dulu dan sertakan shortcut pada item.
- Batasi hasil yang dirender dan gunakan pengumuman jumlah hasil.
- Sediakan aksi default yang aman saat Enter ditekan pada kueri kosong.

Don't:

- Jangan menjalankan aksi destruktif langsung dari palette tanpa konfirmasi.
- Jangan memuat data sensitif ke dalam indeks pencarian.
- Jangan membiarkan palette kehilangan fokus saat hasil diperbarui.

### 4.7 MADS-NAV-01 Sidebar

Anatomi: `nav` → `brand` + `section` (label, item, badge) + `footer` (workspace, pengaturan).

| Aspek | Ketentuan |
|---|---|
| Varian | expanded 280 px, collapsed rail 72 px, sectioned; item dengan ikon dan label |
| Ukuran | tinggi item 40 px; padding horizontal `--mads-space-12`; indentasi sub-item `--mads-space-16` |
| State | expanded, collapsed, active-item, hover, focus-visible, badge |
| Keyboard | Tab antar item; Enter membuka; ArrowKeys dapat berpindah dalam kelompok; tombol collapse dapat difokus |
| ARIA | Landmark `nav` berlabel; item aktif `aria-current="page"`; rail collapsed tetap memiliki nama aksesibel; badge dibacakan sebagai bagian nama |
| Token | `--mads-color-surface`, `--mads-color-border`, `--mads-space-12`, `--mads-font-size-14`, `--mads-radius-8` |

Do:

- Urutkan item berdasarkan frekuensi penggunaan dan kelompokkan dengan heading yang jelas.
- Sediakan tombol collapse yang mengingat pilihan pengguna.
- Tampilkan badge hanya bila bermakna dan dapat dijelaskan.

Don't:

- Jangan menaruh lebih dari satu tingkat sub-navigasi tanpa jalur kembali.
- Jangan menyembunyikan label pada rail tanpa tooltip dan nama aksesibel.
- Jangan mengubah urutan item secara dinamis tanpa alasan yang terlihat.

### 4.8 MADS-FBK-02 Toast

Anatomi: `region` → `toast` → `[icon]` + `message` + `[action]` + `[dismiss]`.

| Aspek | Ketentuan |
|---|---|
| Varian | info, success, error, undo; sm dan md; aksi tunggal |
| Ukuran | lebar maksimum 400 px; padding `--mads-space-12`; jarak antar toast `--mads-space-8` |
| State | entering, visible, with-action, paused, dismissed |
| Keyboard | Aksi dan tutup dapat difokus; fokus tidak dipindahkan otomatis; Esc menutup toast yang sedang difokus |
| ARIA | Wadah `aria-live="polite"` dan `aria-atomic="false"`; error kritis memakai `role="alert"`; tombol aksi berlabel jelas |
| Token | `--mads-shadow-2`, `--mads-radius-8`, `--mads-motion-180`, `--mads-color-surface` |

Do:

- Hentikan timer saat hover atau fokus dan beri durasi 10 detik untuk aksi undo.
- Batasi maksimum tiga toast terlihat dan antrekan sisanya.
- Gunakan pesan singkat yang menyebut objek dan hasil aksi.

Don't:

- Jangan memakai toast untuk informasi yang harus dibaca atau diakses kembali.
- Jangan menutup toast otomatis saat berisi aksi yang belum dijalankan.
- Jangan menumpuk toast di atas kontrol utama atau keyboard virtual.

### 4.9 MADS-DATA-07 LineChart

Anatomi: `figure` → `title` + `plot` (sumbu, grid, garis seri, titik, tooltip) + `legend` + `data-table-alternatif`.

| Aspek | Ketentuan |
|---|---|
| Varian | single-series, multi-series, area-fill, brush; orientasi waktu horizontal |
| Ukuran | tinggi minimum 160 px; padding plot `--mads-space-16`; tooltip maksimum 240 px |
| State | loading, empty, hover-tooltip, focus-point, error |
| Keyboard | Tab masuk ke chart; ArrowLeft/Right berpindah titik data; Home/End ke ujung; Escape menutup tooltip |
| ARIA | `figure` dengan `aria-label` yang merangkum tren; titik aktif memiliki `aria-describedby` nilai; tabel data alternatif tersedia dan dapat diperluas |
| Token | `--mads-color-primary`, `--mads-color-muted`, `--mads-color-border`, `--mads-space-8`, `--mads-font-size-12` |

Do:

- Sediakan tabel data atau ringkasan tekstual untuk pembaca layar dan ekspor.
- Bedakan seri dengan pola garis atau penanda bentuk selain warna.
- Mulai sumbu Y dari nol untuk data yang tidak memiliki dasar perbandingan lain.

Don't:

- Jangan memotong sumbu Y tanpa memberi tahu bahwa skala dipotong.
- Jangan menampilkan lebih dari empat seri tanpa kontrol visibilitas.
- Jangan mengandalkan tooltip hover untuk informasi penting.

### 4.10 MADS-DATA-04 KanbanBoard

Anatomi: `board` → `column` (judul, jumlah, daftar kartu, drop zone) + `card` (judul, metadata, avatar).

| Aspek | Ketentuan |
|---|---|
| Varian | draggable, fixed-columns, swimlanes; kolom menggulir horizontal pada compact |
| Ukuran | lebar kolom 280 px; tinggi kartu minimum 48 px; jarak kartu `--mads-space-8`; padding kolom `--mads-space-12` |
| State | default, dragging, drop-target, empty-column, loading, error |
| Keyboard | Fokus kartu; Ctrl+ArrowLeft/Right memindahkan antar kolom; Ctrl+ArrowUp/Down mengubah urutan; Enter membuka detail |
| ARIA | Kolom berlabel dengan heading; kartu fokusabel dengan nama dan kolom saat ini; pemindahan diumumkan lewat live region |
| Token | `--mads-color-bg`, `--mads-color-surface`, `--mads-radius-12`, `--mads-space-12`, `--mads-shadow-1` |

Do:

- Sediakan jalur keyboard penuh untuk memindahkan kartu dan mengubah urutan.
- Tampilkan jumlah kartu per kolom dan batas WIP bila ada.
- Beri tempat drop yang jelas dan tidak menutupi kartu lain.

Don't:

- Jangan menjadikan drag-and-drop satu-satunya cara memindahkan kartu.
- Jangan memindahkan kartu secara optimistis tanpa indikator kegagalan yang jelas.
- Jangan menyembunyikan kolom kosong; tampilkan empty-column dengan aksi.

### 4.11 MADS-DATA-05 Calendar

Anatomi: `calendar` → `header` (judul periode, navigasi) + `weekday-row` + `grid` (sel tanggal, penanda event) + `[agenda]`.

| Aspek | Ketentuan |
|---|---|
| Varian | month, week, day, agenda; minggu dimulai sesuai locale |
| Ukuran | sel bulan minimum 40×40 px; tinggi baris agenda 56 px; padding `--mads-space-8` |
| State | default, today, selected, event-overflow, loading |
| Keyboard | ArrowKeys berpindah hari; PageUp/PageDown berpindah bulan; Home/End ke awal dan akhir minggu; Enter memilih tanggal |
| ARIA | Grid dengan `role="grid"` dan `aria-selected`; tanggal hari ini dijelaskan teks; event berlebih diwakili tombol yang dapat difokus |
| Token | `--mads-color-surface`, `--mads-color-border`, `--mads-radius-8`, `--mads-space-8`, `--mads-font-size-14` |

Do:

- Tampilkan nama hari dan bulan secara tekstual, bukan hanya angka.
- Sediakan tampilan agenda sebagai alternatif daftar yang mudah dibaca pembaca layar.
- Tandai hari ini dengan teks tersembunyi atau `aria-current="date"`.

Don't:

- Jangan mengandalkan warna untuk membedakan event dan hari ini.
- Jangan memotong event tanpa indikator jumlah tersembunyi.
- Jangan mengubah minggu awal tanpa mengikuti locale pengguna.

### 4.12 MADS-INP-18 FilePicker

Anatomi: `picker` → `[dropzone]` + `button` (pilih file) + `file-list` (nama, ukuran, hapus) + `error`.

| Aspek | Ketentuan |
|---|---|
| Varian | button, dropzone, multi-file, accept-filter |
| Ukuran | dropzone tinggi minimum 120 px; baris file 40 px; padding `--mads-space-16` |
| State | idle, drag-over, selected, uploading, error, disabled |
| Keyboard | Enter atau Space membuka dialog file; Tab ke daftar file; Delete menghapus file terpilih setelah konfirmasi |
| ARIA | Tombol berlabel dengan `aria-describedby` untuk format dan batas ukuran; daftar file memakai `list`; kesalahan file dibacakan |
| Token | `--mads-color-border`, `--mads-color-border-strong`, `--mads-radius-12`, `--mads-space-16` |

Do:

- Sebutkan format yang diterima dan ukuran maksimum sebelum pengguna memilih.
- Validasi tipe dan ukuran lagi setelah pemilihan serta tampilkan alasan penolakan.
- Sediakan hapus per file dan hapus semua dengan label yang jelas.

Don't:

- Jangan menjadikan dropzone satu-satunya cara memilih file.
- Jangan mengunggah otomatis tanpa konfirmasi bila file berisi data sensitif.
- Jangan menampilkan nama file tanpa jalur atau ukuran yang membedakan duplikat.

### 4.13 MADS-MED-04 CameraCapture

Anatomi: `capture` → `preview` (kamera) + `overlay` (panduan) + `controls` (rana, ganti kamera, torch) + `permission-state`.

| Aspek | Ketentuan |
|---|---|
| Varian | photo, video, document-scan; kamera depan dan belakang |
| Ukuran | preview mengisi area yang tersedia; tombol rana 64 px; kontrol lain 44 px |
| State | idle, requesting-permission, streaming, capturing, denied, error |
| Keyboard | Space atau Enter memicu rana; tombol ganti kamera dan torch dapat difokus; Esc membatalkan |
| ARIA | Tombol rana berlabel; status perekaman diumumkan; alternatif unggah file selalu tersedia dan berlabel |
| Token | `--mads-color-surface`, `--mads-radius-12`, `--mads-space-16`, `--mads-color-fg` |

Do:

- Jelaskan alasan permintaan izin kamera sebelum dialog sistem muncul.
- Hentikan stream kamera saat komponen tidak terlihat atau aplikasi ke background.
- Tampilkan hasil jepretan dengan aksi ulangi dan gunakan.

Don't:

- Jangan memulai kamera otomatis tanpa aksi pengguna.
- Jangan menyimpan atau mengunggah hasil tanpa persetujuan eksplisit.
- Jangan menutupi panduan bingkai dengan kontrol yang tidak perlu.

### 4.14 MADS-MED-07 MapView

Anatomi: `map` → `tile-layer` + `marker-layer` + `controls` (zoom, lokasi) + `attribution` + `[offline-notice]`.

| Aspek | Ketentuan |
|---|---|
| Varian | static, interactive, markers, cluster; penyedia tile dapat dikonfigurasi host |
| Ukuran | tinggi minimum 240 px; tombol zoom 44 px; marker 24 px dengan area sentuh 44 px |
| State | loading, ready, offline-tiles, error |
| Keyboard | ArrowKeys menggeser peta; Plus/Minus zoom; Tab ke marker; Enter membuka detail marker |
| ARIA | Peta memiliki nama; marker memakai label lokasi; daftar lokasi alternatif disediakan; atribusi terbaca |
| Token | `--mads-color-surface`, `--mads-radius-12`, `--mads-space-8`, `--mads-shadow-1` |

Do:

- Sediakan daftar lokasi tekstual yang setara dengan marker.
- Tampilkan status tile offline dan arahkan ke peta statis atau koordinat.
- Hormati preferensi pengguna untuk tidak memuat tile pihak ketiga.

Don't:

- Jangan memuat tile dari jaringan saat mode offline atau air-gapped.
- Jangan menampilkan lokasi presisi tanpa izin lokasi yang jelas.
- Jangan mengandalkan gestur pinch sebagai satu-satunya kontrol zoom.

### 4.15 MADS-MED-09 MarkdownView

Anatomi: `article` → `[toc]` + blok konten (heading, paragraf, daftar, tabel, kode, tautan) + `[footer]`.

| Aspek | Ketentuan |
|---|---|
| Varian | readonly, with-toc, compact; konten tersanitasi |
| Ukuran | lebar baca maksimum 720 px; jarak blok `--mads-space-16`; kode `JetBrains Mono` 14/20 |
| State | default, empty, error |
| Keyboard | Tab ke tautan dan kontrol; heading dapat dinavigasi dengan screen reader; TOC dapat difokus dan dioperasikan |
| ARIA | Heading hierarkis tanpa melompat; tabel memiliki header; tautan deskriptif; HTML mentah tidak dirender; gambar memiliki alt |
| Token | `--mads-font-size-16`, `--mads-line-24`, `--mads-space-16`, `--mads-color-border` |

Do:

- Sanitasi Markdown dan tolak HTML mentah serta `javascript:` URL.
- Beri `id` stabil pada heading agar TOC dan deep link bekerja.
- Tampilkan blok kode dengan label bahasa dan tombol salin berlabel.

Don't:

- Jangan merender tabel lebar tanpa jalur gulir horizontal.
- Jangan membuka tautan eksternal di dalam sandbox tanpa konfirmasi.
- Jangan memakai heading untuk menata ukuran teks.

### 4.16 MADS-DOM-03 WorkflowNode

Anatomi: `node` → `header` (ikon tipe, nama, menu) + `body` (ringkasan konfigurasi) + `ports` (input, output, success, failure).

| Aspek | Ketentuan |
|---|---|
| Varian | trigger, action, condition, human-approval; node ringkas dan detail |
| Ukuran | lebar node 240 px; tinggi minimum 72 px; port 12 px dengan area interaksi 44 px |
| State | idle, selected, running, success, failed, waiting-network, disabled |
| Keyboard | Tab memfokus node; ArrowKeys berpindah antar node terhubung; Enter membuka editor; Ctrl+D menggandakan; Delete menghapus setelah konfirmasi |
| ARIA | Node memakai `role="button"` atau `treeitem` sesuai konteks graf; nama, tipe, dan status terbaca; editor daftar langkah menjadi alternatif setara |
| Token | `--mads-color-surface`, `--mads-radius-12`, `--mads-color-success`, `--mads-color-error`, `--mads-space-8` |

Do:

- Tampilkan status eksekusi terakhir beserta waktu dan aksi coba lagi.
- Beri label pada setiap port dan jelaskan arti cabang gagal.
- Sediakan tampilan daftar yang dapat diedit tanpa kanvas.

Don't:

- Jangan menjadikan drag pada kanvas satu-satunya cara menyusun alur.
- Jangan menyembunyikan konfigurasi wajib di balik menu tanpa indikator.
- Jangan menampilkan data sensitif pada ringkasan node.

### 4.17 MADS-DOM-04 CodeEditor

Anatomi: `editor` → `gutter` (nomor baris, marker) + `code-surface` (highlight, diagnostik, kursor) + `[status-bar]` (baris, kolom, bahasa).

| Aspek | Ketentuan |
|---|---|
| Varian | typescript, json, sql, markdown, diff-mode; readonly dan editable |
| Ukuran | tinggi baris 20 px; font `JetBrains Mono` 14/20; padding kode `--mads-space-12`; gutter 48 px |
| State | default, focus, error-marker, warning-marker, readonly, offline-lsp |
| Keyboard | Tab menyisipkan indentasi atau memindahkan fokus sesuai pengaturan; Cmd/Ctrl+F mencari; Cmd/Ctrl+G ke baris; Esc keluar dari mode pencarian |
| ARIA | Area teks berlabel; posisi baris dan kolom diumumkan saat berubah; diagnostik dihubungkan ke baris; mode readonly tetap dapat dibaca dan dinavigasi |
| Token | `JetBrains Mono`, `--mads-font-size-14`, `--mads-line-20`, `--mads-color-surface`, `--mads-color-border` |

Do:

- Jalankan language service secara lokal dan tampilkan status offline bila tidak tersedia.
- Tandai error dengan ikon dan teks, bukan hanya garis berwarna.
- Simpan posisi kursor dan undo history saat panel ditutup dan dibuka kembali.

Don't:

- Jangan mengeksekusi kode yang sedang diedit di luar sandbox.
- Jangan memuat grammar atau LSP dari CDN.
- Jangan menghapus undo history saat file diformat otomatis.

### 4.18 MADS-DOM-08 ChatThread

Anatomi: `thread` → `message-list` + `[day-divider]` + `composer` (input, lampiran, kirim, berhenti) + `[error-retry]`.

| Aspek | Ketentuan |
|---|---|
| Varian | assistant, user-group, streaming; dengan lampiran dan sitasi |
| Ukuran | lebar pesan maksimum 720 px; jarak pesan `--mads-space-12`; composer tinggi minimum 56 px |
| State | empty, streaming, complete, error, retry |
| Keyboard | Enter mengirim; Shift+Enter menambah baris; ArrowUp pada composer kosong membuka riwayat; Esc menghentikan streaming |
| ARIA | Daftar pesan memakai `role="log"` dan `aria-live="polite"`; pengirim dan waktu terbaca; tombol berhenti berlabel; fokus composer tidak berpindah saat pesan masuk |
| Token | `--mads-space-12`, `--mads-radius-12`, `--mads-color-surface`, `--mads-font-size-16` |

Do:

- Tampilkan status streaming dan aksi berhenti selama generasi berjalan.
- Simpan draft composer per percakapan.
- Tandai pesan gagal dengan aksi kirim ulang dan alasan singkat.

Don't:

- Jangan mengumumkan setiap token streaming ke pembaca layar; umumkan per kalimat atau saat selesai.
- Jangan menggulir paksa ke bawah saat pengguna membaca pesan lama.
- Jangan menghapus riwayat lokal tanpa aksi eksplisit pengguna.

### 4.19 MADS-FBK-06 PermissionDialog

Anatomi: `dialog` → `header` (nama micro-app, judul izin) + `body` (capability, alasan, cakupan, risiko) + `footer` (izinkan, izinkan sekali, tolak).

| Aspek | Ketentuan |
|---|---|
| Varian | low-risk, medium-risk, high-risk, allow-once |
| Ukuran | lebar md 640 px; padding `--mads-space-24`; daftar capability maksimum lima terlihat dengan tautan semua |
| State | closed, open, granted, denied, error |
| Keyboard | Fokus awal pada judul atau tombol tolak; Tab antar aksi; Esc menolak tanpa efek samping; Enter hanya pada aksi non-destruktif |
| ARIA | `role="dialog"` dengan `aria-labelledby` dan `aria-describedby`; daftar capability memakai list; tingkat risiko disampaikan teks, bukan hanya warna |
| Token | `--mads-color-warning`, `--mads-color-error`, `--mads-radius-16`, `--mads-space-24`, `--mads-shadow-3` |

Do:

- Sebut capability, alasan permintaan, dan cakupan datanya dalam bahasa pengguna.
- Tampilkan opsi izinkan sekali hanya untuk sesi berjalan dan jelaskan masa berlakunya.
- Catat keputusan ke audit log dengan ID capability dan hasil.

Don't:

- Jangan menyamarkan tombol tolak atau membuatnya lebih kecil dari izinkan.
- Jangan meminta izin yang tidak tercantum di manifest.
- Jangan mengulang dialog otomatis setelah penolakan; arahkan ke pengaturan.

### 4.20 MADS-PLT-02 WidgetFrame

Anatomi: `frame` → `header` (nama widget, status, menu) + `content` (render micro-app) + `[footer-updated]`.

| Aspek | Ketentuan |
|---|---|
| Varian | small, medium, large, live, static; hibernated |
| Ukuran | small 2×2, medium 4×2, large 4×4 satuan grid; padding `--mads-space-12`; radius 16 px |
| State | loading, ready, stale, error, hibernated |
| Keyboard | Tab masuk ke widget; Enter membuka micro-app; konten interaktif memiliki tab stop sendiri; menu widget dapat difokus |
| ARIA | Widget memiliki label dan waktu pembaruan; status basi atau hibernasi dijelaskan teks; konten interaktif memakai peran MUIP yang sesuai |
| Token | `--mads-color-surface`, `--mads-radius-16`, `--mads-shadow-2`, `--mads-space-12` |

Do:

- Tampilkan waktu pembaruan terakhir dan tombol refresh berlabel.
- Batasi jumlah widget live berdasarkan kuota dan status baterai.
- Hentikan pembaruan saat widget tidak terlihat dan pulihkan saat fokus.

Don't:

- Jangan menjalankan micro-app di dalam widget tanpa sandbox dan watchdog.
- Jangan menampilkan data pribadi pada widget layar kunci tanpa pengaturan eksplisit.
- Jangan membiarkan widget menampilkan data basi tanpa penanda.

## 5. Verifikasi

Verifikasi katalog dijalankan sebelum PR desain atau perubahan komponen:

| Pemeriksaan | Metode | Kriteria lulus |
|---|---|---|
| Jumlah dan keunikan | `npm run docs:check` dan tinjauan tabel §3 | Tepat 120 baris data, ID unik, 9 kategori sesuai §2.1 |
| Kesamaan dengan MUIP | Bandingkan kolom `Nama` dengan enum `componentType` pada schema ui-node v1 | 120 nama identik, tidak ada tambahan atau kekurangan |
| Kelengkapan kolom | Tinjauan otomatis minimal satu nilai per kolom | Tidak ada sel kosong pada Guna, Web, Flutter, Varian, State wajib, Token, Catatan a11y |
| Spesifikasi inti | Tinjauan §4 | 20 komponen inti memiliki anatomi, varian, ukuran, state, keyboard, ARIA, token, dan do/don't |
| Aksesibilitas | Uji axe pada web dan `Semantics` pada Flutter untuk komponen inti | Tidak ada pelanggaran kritis; nama aksesibel tersedia |
| Token | Pemeriksaan lint desain | Tidak ada warna, ukuran font, radius, shadow, atau durasi hardcoded |
| Paritas renderer | Test kontrak MUIP yang sama pada web dan Flutter | Tipe, props, event, dan a11y berperilaku sama |

## 6. Referensi

- [design-system.md](design-system.md) — token, tema, breakpoint, dan aturan MADS.
- [accessibility.md](accessibility.md) — checklist WCAG 2.2 AA dan matriks pengujian.
- [screen-specs.md](screen-specs.md) — penggunaan komponen per layar.
- [ui-protocol.md](../03-specs/ui-protocol.md) — kontrak MUIP v1 dan validasi node.
- [ui-node.v1.schema.json](../03-specs/schemas/ui-node.v1.schema.json) — enum tipe komponen.
- [component-spec.md](../templates/component-spec.md) — kerangka spesifikasi komponen baru.
