---
id: DESIGN-A11Y
title: Aksesibilitas
status: accepted
owner: design
prd_refs: ["§6"]
---

# Aksesibilitas

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menetapkan cara Host Shell, Studio, dan micro-app memenuhi WCAG 2.2 Level AA di web (PWA) dan native (Flutter). Target rujukan normatif ada di [nfr.md](../03-specs/nfr.md) pada NFR-A11Y-001 sampai NFR-A11Y-005; dokumen ini menjelaskan penerapan per kriteria, jalur keyboard per layar, pemetaan screen reader per komponen, kontras, serta matriks uji.

Cakupan: 22 layar `SCR-01`…`SCR-22` ([screen-specs.md](screen-specs.md)), 120 komponen MADS ([component-catalog.md](component-catalog.md)), dialog consent ([permissions.md](../03-specs/permissions.md)), renderer MUIP ([ui-protocol.md](../03-specs/ui-protocol.md)), dan design token ([design-system.md](design-system.md)).

Di luar cakupan: kepatuhan hukum per yurisdiksi dan audit pihak ketiga; keduanya memakai dokumen ini sebagai bukti dasar.

## 2. Prinsip

| Prinsip | Ketentuan | Konsekuensi desain |
|---|---|---|
| Setara fungsi | Setiap aksi yang dapat dilakukan dengan pointer MUST dapat dilakukan dengan keyboard dan screen reader. | Tidak ada aksi khusus hover, drag-only, atau gesture-only. |
| Bebas perangkap | Fokus MUST selalu dapat keluar dari komponen mana pun tanpa pointer. | Modal, drawer, dan palette memakai focus trap yang dapat ditutup dengan `Esc`. |
| Dapat diprediksi | Fokus tidak berpindah otomatis kecuali setelah aksi eksplisit pengguna. | Tidak ada autofocus pada layar masuk; fokus dipindah hanya setelah submit/dialog. |
| Informasi tidak bergantung warna | Warna MUST NOT menjadi satu-satunya pembeda state. | State wajib memakai ikon, teks, atau pola selain warna. |
| Pengguna mengendalikan gerak | Animasi MUST menghormati `prefers-reduced-motion` dan pengaturan Flutter `disableAnimations`. | Tidak ada informasi yang hanya muncul lewat animasi. |
| Offline setara | Kemampuan aksesibilitas MUST tetap berfungsi offline. | Font, ikon, dan string dibundel lokal; tidak ada CDN. |

## 3. Checklist WCAG 2.2 Level A dan AA

Kolom **Bukti uji** merujuk lapisan pada §12. Seluruh baris MUST; tidak ada pengecualian per platform tanpa ADR.

### 3.1 Prinsip 1 — Perceivable

| Kriteria | Level | Ketentuan penerapan | Bukti uji |
|---|---|---|---|
| 1.1.1 Non-text Content | A | Ikon dekoratif `aria-hidden`/`ExcludeSemantics`; ikon aksi memiliki label teks; grafik punya ringkasan teks dan tabel data alternatif. | axe + inspeksi semantics |
| 1.2.1 Audio-only and Video-only | A | `AudioPlayer` dan `VideoPlayer` menyediakan transkrip atau deskripsi teks. | Manual media |
| 1.2.2 Captions (Prerecorded) | A | Video dengan ucapan MUST menyertakan track caption WebVTT atau subtitle Flutter. | Manual media |
| 1.2.3 Audio Description or Media Alternative | A | Video instruksional menyertakan deskripsi audio atau transkrip lengkap. | Manual media |
| 1.2.4 Captions (Live) | AA | Tidak ada fitur siaran langsung pada rilis; bila ditambahkan, caption live wajib. | Review fitur |
| 1.2.5 Audio Description (Prerecorded) | AA | Konten video fitur wajib menyertakan deskripsi audio. | Manual media |
| 1.3.1 Info and Relationships | A | Struktur heading hierarkis, tabel semantik, `fieldset`/`legend`, dan grup radio bermakna. | axe + pohon aksesibilitas |
| 1.3.2 Meaningful Sequence | A | Urutan DOM/Semantics sama dengan urutan visual; urutan baca didefinisikan per layar. | Manual screen reader |
| 1.3.3 Sensory Characteristics | A | Instruksi MUST NOT hanya merujuk bentuk, warna, ukuran, atau posisi. | Review copy |
| 1.3.4 Orientation | AA | Layout portrait dan landscape setara; tidak ada kunci orientasi kecuali media fullscreen. | Uji rotasi |
| 1.3.5 Identify Input Purpose | AA | Field identitas memakai `autocomplete`/`autofillHints` yang sesuai (`email`, `tel`, `postal-code`). | axe + inspeksi |
| 1.4.1 Use of Color | A | Status sinkronisasi, error, dan permission memakai ikon dan teks selain warna. | Review visual |
| 1.4.3 Contrast (Minimum) | AA | Teks ≥ 4,5:1; teks besar ≥ 3:1; lihat tabel §4. | Alat kontras |
| 1.4.4 Resize Text | AA | Teks dapat diperbesar 200% tanpa kehilangan konten; Flutter `textScaler` hingga 2.0. | Uji zoom |
| 1.4.5 Images of Text | AA | Tidak ada teks di dalam gambar kecuali logo dan screenshot kanonik. | Review visual |
| 1.4.10 Reflow | AA | Konten reflow pada lebar 320 CSS px tanpa scroll horizontal, kecuali tabel dan canvas yang memang berdimensi. | Uji viewport |
| 1.4.11 Non-text Contrast | AA | Border kontrol, ikon state, focus ring, dan grafik ≥ 3:1 terhadap latar bersebelahan. | Alat kontras |
| 1.4.12 Text Spacing | AA | Spasi teks dapat dinaikkan (line-height 1,5; letter 0,12em; word 0,16em; paragraf 2em) tanpa kliping. | Override CSS |
| 1.4.13 Content on Hover or Focus | AA | Tooltip dapat ditutup dengan `Esc`, tidak menutupi konten lain, dan bertahan selama hover/focus. | Manual keyboard |

### 3.2 Prinsip 2 — Operable

| Kriteria | Level | Ketentuan penerapan | Bukti uji |
|---|---|---|---|
| 2.1.1 Keyboard | A | Semua fungsi dapat dijalankan dengan keyboard; canvas Studio menyediakan navigasi panah dan panel alternatif. | Audit keyboard-only |
| 2.1.2 No Keyboard Trap | A | Palette, modal, dan editor melepas fokus dengan `Esc` atau `Tab` keluar. | Audit keyboard-only |
| 2.1.4 Character Key Shortcuts | A | Shortcut satu karakter hanya aktif saat fokus di area kanvas/editor dan dapat dimatikan di Pengaturan. | Review shortcut |
| 2.2.1 Timing Adjustable | A | Batas waktu yang dapat diperpanjang (mis. sesi Vault 5 menit) memberi peringatan dan opsi perpanjang. | Simulasi timeout |
| 2.2.2 Pause, Stop, Hide | A | Animasi berulang (skeleton, indikator sinkronisasi) dapat dijeda atau dihentikan. | Review motion |
| 2.3.1 Three Flashes | A | Tidak ada kilatan lebih dari tiga kali per detik; transisi memakai fade ≤ 3 kedipan. | Review motion |
| 2.4.1 Bypass Blocks | A | Skip link "Lewati ke konten" tersedia di setiap layar dengan navigasi berulang. | axe + keyboard |
| 2.4.2 Page Titled | A | Judul layar unik dan deskriptif; web memakai `document.title`, native memakai `Semantics(header: true)` dan judul route. | axe + manual |
| 2.4.3 Focus Order | A | Urutan fokus mengikuti urutan visual; lihat §5. | Audit keyboard-only |
| 2.4.4 Link Purpose (In Context) | A | Label tautan menjelaskan tujuan tanpa konteks sekitarnya. | Review copy |
| 2.4.5 Multiple Ways | AA | Home, command palette, dan pencarian menyediakan lebih dari satu jalur ke setiap layar. | Manual |
| 2.4.6 Headings and Labels | AA | Heading dan label menjelaskan topik; tidak ada label generik "OK" tanpa konteks. | axe + review copy |
| 2.4.7 Focus Visible | AA | Fokus selalu terlihat dengan ring 2 px; lihat §5. | Audit keyboard-only |
| 2.4.11 Focus Not Obscured (Minimum) | AA | Fokus tidak tertutup sticky header, dock, atau snackbar; konten digulir otomatis. | Audit keyboard-only |
| 2.5.1 Pointer Gestures | A | Pinch, swipe, dan long-press memiliki alternatif tombol atau menu. | Manual sentuh |
| 2.5.2 Pointer Cancellation | A | Aksi dipicu pada `pointerup`/`pointercancel`, bukan `pointerdown`. | Manual |
| 2.5.3 Label in Name | A | Nama aksesibel memuat teks yang terlihat. | axe |
| 2.5.4 Motion Actuation | A | Tidak ada fungsi yang hanya dipicu gerakan perangkat; kamera dan QR memakai tombol. | Manual |
| 2.5.7 Dragging Movements | AA | DnD palette→canvas dan reorder memiliki alternatif keyboard (potong/tempel, pindah atas/bawah). | Audit keyboard-only |
| 2.5.8 Target Size (Minimum) | AA | Target pointer ≥ 24×24 CSS px dengan jarak ≥ 8 px; rekomendasi 44×44. | Alat ukur + review token |

### 3.3 Prinsip 3 — Understandable

| Kriteria | Level | Ketentuan penerapan | Bukti uji |
|---|---|---|---|
| 3.1.1 Language of Page | A | `lang`/`Locale` diisi locale aktif (`id-ID` atau `en-US`) di root dokumen dan root Flutter. | axe + manual |
| 3.1.2 Language of Parts | AA | Kutipan atau nama berbahasa lain memakai penanda bahasa lokal. | Manual |
| 3.2.1 On Focus | A | Fokus tidak memicu perubahan konteks (navigasi, submit, dialog tak diminta). | Audit keyboard-only |
| 3.2.2 On Input | A | Perubahan nilai field tidak mengirim atau menavigasi tanpa konfirmasi. | Audit keyboard-only |
| 3.2.3 Consistent Navigation | AA | Navigasi utama berada pada urutan dan posisi yang sama di seluruh layar. | Review visual |
| 3.2.4 Consistent Identification | AA | Komponen dengan fungsi sama memakai label dan ikon yang sama. | Review katalog |
| 3.2.6 Consistent Help | A | Bantuan dan pemulihan selalu berada di posisi yang sama (menu bantuan di header). | Manual |
| 3.3.1 Error Identification | A | Error dijelaskan dalam teks, ditautkan ke field, dan difokuskan; lihat §11. | Form test |
| 3.3.2 Labels or Instructions | A | Setiap input memiliki label persisten dan petunjuk format bila perlu. | axe + manual |
| 3.3.3 Error Suggestion | AA | Pesan error memuat saran perbaikan konkret sesuai formula di [content-i18n.md](content-i18n.md). | Review copy |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | Aksi destruktif memakai konfirmasi dan undo 10 detik sebelum final. | Manual alur |
| 3.3.7 Redundant Entry | A | Data yang sudah diisi tidak diminta ulang dalam proses yang sama; opsi isi otomatis disediakan. | Manual alur |
| 3.3.8 Accessible Authentication | AA | Login memakai passkey, Local Identity, atau Recovery Phrase; tidak ada tes kognitif atau CAPTCHA visual. | Manual alur |

### 3.4 Prinsip 4 — Robust

| Kriteria | Level | Ketentuan penerapan | Bukti uji |
|---|---|---|---|
| 4.1.2 Name, Role, Value | A | Setiap kontrol memakai elemen native atau role ARIA yang benar dengan nama, state, dan nilai terbaru. | axe + NVDA + VoiceOver |
| 4.1.3 Status Messages | AA | Toast, hasil sinkronisasi, dan progres diumumkan lewat `role="status"`/`aria-live="polite"` atau `SemanticsService.announce`. | Screen reader |

## 4. Kontras dan Target Sentuh

Ambang: teks normal ≥ 4,5:1; teks besar (≥ 24 px atau ≥ 19 px bold) ≥ 3:1; komponen non-teks dan focus ring ≥ 3:1. Nilai di bawah dihitung dari token [design-system.md](design-system.md); pasangan yang tidak lolos MUST NOT dipakai.

| Pasangan | Rasio | Status | Penggunaan yang diizinkan |
|---|---|---|---|
| `#1C1917` di `#F8F7F4` | 16,32:1 | Lolos AA/AAA | Teks utama terang |
| `#1C1917` di `#FFFFFF` | 17,49:1 | Lolos AA/AAA | Teks utama di surface |
| `#78716C` di `#FFFFFF` | 4,80:1 | Lolos AA (batas) | Teks muted hanya di atas surface |
| `#78716C` di `#F8F7F4` | 4,48:1 | Tidak lolos | Teks muted MUST memakai `fg` atau nilai muted yang digelapkan hingga ≥ 4,5:1 |
| `#0F766E` di `#FFFFFF` | 5,47:1 | Lolos AA | Tautan dan label primer |
| `#0F766E` di `#F8F7F4` | 5,11:1 | Lolos AA | Ikon dan teks primer di atas bg |
| `#FFFFFF` di `#0F766E` | 5,47:1 | Lolos AA | Teks tombol primer |
| `#D97706` di `#FFFFFF` | 3,19:1 | Non-teks saja | Border, indikator, dan grafik; MUST NOT untuk teks normal |
| `#1C1917` di `#D97706` | 5,49:1 | Lolos AA | Teks di atas tombol/badge accent |
| `#15803D` di `#F8F7F4` | 4,68:1 | Lolos AA | Teks sukses |
| `#B45309` di `#F8F7F4` | 4,69:1 | Lolos AA | Teks peringatan |
| `#B91C1C` di `#F8F7F4` | 6,04:1 | Lolos AA | Teks error |
| `#0369A1` di `#F8F7F4` | 5,54:1 | Lolos AA | Teks info |
| `#FAFAF9` di `#0C0A09` | 18,92:1 | Lolos AA/AAA | Teks utama gelap |
| `#FAFAF9` di `#1C1917` | 16,74:1 | Lolos AA/AAA | Teks utama di surface gelap |
| `#2DD4BF` di `#0C0A09` | 10,61:1 | Lolos AA/AAA | Teks dan ikon primer gelap |
| `#2DD4BF` di `#1C1917` | 9,39:1 | Lolos AA/AAA | Tautan di surface gelap |
| `#A8A29E` di `#0C0A09` | 7,83:1 | Lolos AA | Teks muted gelap |
| `#E7E5E4` di `#FFFFFF` | 1,26:1 | Non-teks dekoratif | Garis pemisah pasif; border kontrol MUST memakai `#78716C` (4,80:1) |
| `#44403C` di `#0C0A09` | 1,92:1 | Non-teks dekoratif | Pemisah gelap; border kontrol gelap MUST ≥ 3:1 |
| `#0F766E` focus ring di `#F8F7F4` | 5,11:1 | Lolos non-teks | Focus ring tema terang |
| `#0000EE` di `#FFFFFF` | 9,40:1 | Lolos | Fokus high-contrast |

Aturan turunan:

1. Setiap pasangan token baru MUST dihitung dan dicatat di [design-system.md](design-system.md) sebelum dipakai.
2. Grafik MUST memakai pola atau label langsung selain warna; legenda tidak boleh menjadi satu-satunya pemetaan.
3. Teks di atas citra memakai overlay `fg`/`bg` dengan rasio terukur, atau scrim minimal 60% opasitas.
4. Target pointer minimum 24×24 CSS px (WCAG 2.5.8) dan 48×48 dp di Flutter; tombol ikon memakai padding token, bukan memperbesar ikon.

## 5. Fokus: Urutan, Visibilitas, dan Perangkap

| Aturan | Ketentuan |
|---|---|
| Urutan | Urutan fokus mengikuti urutan visual kiri-ke-kanan lalu atas-ke-bawah, tanpa `tabindex` positif. |
| Titik masuk | Fokus awal berada di heading layar; tidak ada autofocus ke field input saat layar dibuka. |
| Ring | Focus ring 2 px `color.primary` dengan offset 2 px dan garis luar 1 px `color.bg`; tidak pernah dihilangkan dengan `outline: none`. |
| Mode fokus | `:focus-visible` untuk pointer, `:focus` untuk keyboard; Flutter memakai `FocusableActionDetector` dengan `FocusHighlightMode.traditional`. |
| Perangkap | Focus trap hanya di modal, drawer, dan command palette; `Esc` menutup dan mengembalikan fokus ke pemicu. |
| Perpindahan paksa | Setelah dialog ditutup atau submit gagal, fokus dipindah ke heading dialog atau field error pertama, bukan ke awal dokumen. |
| Tertutup | Fokus yang masuk ke elemen di balik sticky header, dock, atau keyboard virtual digulir ke area pandang dengan padding 16 px. |
| Skip link | Elemen pertama setiap layar adalah "Lewati ke konten"; tersembunyi secara visual sampai difokus. |
| Announcement | Perubahan halaman mengumumkan judul layar; perubahan state non-navigasi memakai live region `polite`. |

## 6. Jalur Keyboard-Only per Layar

Setiap layar MUST menyelesaikan tugas intinya tanpa pointer. Kolom **Jalur** adalah urutan `Tab` ringkas; panah dipakai di dalam grup.

| SCR | Layar | Tugas inti keyboard | Jalur fokus ringkas | Shortcut |
|---|---|---|---|---|
| SCR-01 | FirstRun/Identity | Buat Local Identity, simpan Recovery Phrase | Heading → tombol buat → daftar 24 kata → checkbox konfirmasi → lanjut | `Enter` konfirmasi, `Space` toggle |
| SCR-02 | Home | Buka micro-app, ganti workspace | Skip link → rail → grid app → dock → workspace switcher | `Cmd/Ctrl+K`, panah grid, `Enter` buka |
| SCR-03 | Folder | Telusuri dan buka isi folder | Breadcrumb → daftar item → aksi item | `Alt+ArrowUp` naik level, `Enter` buka |
| SCR-04 | WidgetBoard | Pindah dan ubah ukuran widget | Toolbar → widget (panah) → panel properti | `Alt+Arrow` pindah, `Alt+Shift+Arrow` ukuran |
| SCR-05 | CommandPalette | Menjalankan aksi atau navigasi | Input → daftar hasil → aksi sekunder | `Cmd/Ctrl+K` buka, panah pilih, `Enter` jalankan, `Esc` tutup |
| SCR-06 | AppRunner | Mengoperasikan micro-app | Frame app → kontrol MUIP → panel error bila gagal | `Esc` keluar sandbox, `Tab` antar node |
| SCR-07 | StudioDashboard | Membuat atau membuka project | Daftar project → aksi buat/impor | `N` project baru, `Enter` buka |
| SCR-08 | VisualBuilder | Menambah komponen, mengedit props | Palette → canvas → panel properties → toolbar preview | `Tab` pindah panel, `Enter` sisip, `Cmd/Ctrl+Z` undo |
| SCR-09 | CodeEditor | Menyunting kode dan menyimpan | File tree → editor → masalah/lint → terminal | `Cmd/Ctrl+S`, `Cmd/Ctrl+P` file, `F8` masalah berikutnya |
| SCR-10 | DataDesigner | Membuat tabel dan migrasi | Daftar tabel → kolom → panel migrasi | `Enter` edit sel, `Cmd/Ctrl+Enter` jalankan |
| SCR-11 | WorkflowEditor | Menyusun node dan koneksi | Palette node → graph → inspector | `Tab` node, `Enter` sambung, `Delete` hapus |
| SCR-12 | AICopilot | Mengirim prompt dan menerima hasil | Input prompt → model picker → hasil → aksi terima/tolak | `Cmd/Ctrl+Enter` kirim, `Esc` batalkan |
| SCR-13 | RegistryBrowser | Menelusuri dan memfilter registry | Search → filter → daftar app → detail | `/` fokus search, panah daftar |
| SCR-14 | AppDetailInstall | Meninjau dan memasang app | Ringkasan → permission list → tombol pasang | `Enter` pasang setelah consent |
| SCR-15 | Permissions | Meninjau dan mencabut izin | Daftar app → daftar izin → aksi cabut | `Delete` cabut dengan konfirmasi |
| SCR-16 | SyncPeers | Pairing dan mencabut perangkat | Daftar peer → tombol pairing → kode SAS | `Enter` konfirmasi SAS |
| SCR-17 | Vault | Membuka dan mengelola item | Unlock → daftar item → detail | `Esc` kunci vault |
| SCR-18 | Settings | Mengubah preferensi | Navigasi kategori → daftar setting → kontrol | `Cmd/Ctrl+F` cari setting |
| SCR-19 | StorageManager | Membersihkan cache dan mengekspor | Ringkasan → daftar kategori → aksi | `Enter` konfirmasi hapus |
| SCR-20 | DevTools | Membaca profil dan log | Tab panel → tabel metrik → detail | `Cmd/Ctrl+Shift+D` buka, `Esc` tutup |
| SCR-21 | AdminConsole | Mengelola pengguna dan audit | Navigasi admin → tabel → detail | `Cmd/Ctrl+K` aksi admin |
| SCR-22 | CrashRecovery | Restart, rollback, atau ekspor | Ringkasan error → aksi pemulihan | `Enter` aksi utama, `Esc` kembali ke Home |

Aturan tambahan:

1. Di dalam frame micro-app, MUIP MUST mengekspos node fokusable sesuai urutan `children`; Host menyediakan tombol keluar sandbox yang selalu dapat difokus.
2. Canvas Studio MUST memiliki mode "navigasi struktur" berbasis pohon, karena drag-only dilarang (2.5.7).
3. Setiap tabel data MUST mendukung panah baris, `Home`/`End`, dan `PageUp`/`PageDown`.
4. Shortcut satu karakter hanya aktif saat fokus berada di area yang dideklarasikan dan MUST dapat dimatikan.

## 7. Screen Reader: Role, Label, dan State per Komponen

Setiap node MUIP memetakan properti aksesibilitas `label`, `description`, `role`, `live`, `disabled`, dan `required` ke ARIA di web serta `Semantics` di Flutter, sesuai [ui-protocol.md](../03-specs/ui-protocol.md). Aturan umum:

1. Nama aksesibel diambil dari label terlihat; bila tidak ada, `label` eksplisit wajib.
2. Role mengikuti elemen native lebih dahulu; role ARIA hanya dipakai bila tidak ada padanan native.
3. State (`checked`, `expanded`, `selected`, `busy`, `invalid`) dilaporkan dan diperbarui tanpa memindahkan fokus.
4. Ikon dekoratif disembunyikan; ikon aksi wajib punya nama sama dengan tooltip.
5. Grup (toolbar, tablist, radiogroup) memiliki nama dan mendukung panah sesuai pola WAI-ARIA.

### 7.1 Layout (12 komponen)

| Komponen | Role/elemen | Label wajib | State yang diumumkan |
|---|---|---|---|
| AppShell | `banner`/`main`/`navigation` landmark | Nama landmark per area | Tidak ada |
| Stack | `group` atau tanpa role | Label hanya jika mengelompokkan kontrol | Tidak ada |
| Grid | `list`/`grid` | Nama koleksi | Jumlah item |
| SplitPane | `separator` pada divider | "Pemisah panel" | `aria-valuenow` posisi |
| Card | `article` opsional | Judul kartu | `selected` bila dapat dipilih |
| Sheet | `dialog` non-modal | Judul sheet | `expanded` |
| Drawer | `dialog` modal | Judul drawer | `expanded`, fokus terperangkap |
| Modal | `dialog` + `aria-modal` | Judul modal | Fokus, `describedby` |
| Popover | `dialog` non-modal | Nama pemicu | `expanded` |
| Toolbar | `toolbar` | Nama toolbar | `disabled` per tombol |
| SafeArea | Tanpa role | Tidak ada | Tidak ada |
| ScrollArea | `region` bila perlu | Nama area | Posisi scroll tidak diumumkan |

### 7.2 Navigation (10 komponen)

| Komponen | Role/elemen | Label wajib | State yang diumumkan |
|---|---|---|---|
| Sidebar | `navigation` | "Navigasi utama" | `current` pada item aktif |
| TabBar | `tablist`/`tab` | Nama tab | `selected` |
| Breadcrumb | `navigation` + `list` | "Breadcrumb" | `current` pada halaman aktif |
| CommandPalette | `dialog` + `combobox`/`listbox` | Judul palette | `expanded`, jumlah hasil |
| Pagination | `navigation` | "Halaman" | `current` halaman |
| Stepper | `list`/`tablist` | Nama langkah | `current`, selesai/gagal |
| Menu | `menu`/`menuitem` | Nama menu | `expanded`, `disabled` |
| Dock | `toolbar` | "Dock aplikasi" | `current` app aktif |
| WorkspaceSwitcher | `button` + `listbox` | "Ganti workspace" | Workspace terpilih |
| BackButton | `button` | "Kembali" | `disabled` bila tidak ada riwayat |

### 7.3 Input (20 komponen)

| Komponen | Role/elemen | Label wajib | State yang diumumkan |
|---|---|---|---|
| Button | `button` | Teks aksi | `disabled`, `busy` |
| IconButton | `button` | Nama aksi (bukan nama ikon) | `pressed` bila toggle |
| TextField | `textbox` | Label field | `required`, `invalid`, `describedby` |
| TextArea | `textbox` multiline | Label field | `required`, `invalid` |
| NumberField | `spinbutton` | Label field | Nilai, min/max |
| SearchField | `searchbox` | "Cari" + cakupan | Jumlah hasil |
| Select | `combobox`/`listbox` | Label field | Nilai terpilih |
| Combobox | `combobox` | Label field | `expanded`, opsi aktif |
| MultiSelect | `combobox` multiselect | Label field | Jumlah terpilih |
| Checkbox | `checkbox` | Label opsi | `checked`, `mixed` |
| RadioGroup | `radiogroup`/`radio` | Nama grup | `checked` |
| Switch | `switch` | Label setting | `checked` |
| Slider | `slider` | Label nilai | `valuenow`, `valuetext` |
| RangeSlider | dua `slider` | Label rentang | Nilai bawah/atas |
| DatePicker | `dialog` + `grid` | Label tanggal | Tanggal terpilih |
| TimePicker | `combobox`/`spinbutton` | Label waktu | Nilai waktu |
| ColorPicker | `dialog` + `slider` | Label warna | Nilai hex |
| FilePicker | `button` + `dialog` OS | Nama aksi | Berkas terpilih |
| SignaturePad | `application` + alternatif `textbox` | "Tanda tangan" | Status kosong/terisi |
| OTPInput | `group` + `textbox` | "Kode verifikasi" | Jumlah digit terisi |

### 7.4 Data (18 komponen)

| Komponen | Role/elemen | Label wajib | State yang diumumkan |
|---|---|---|---|
| DataTable | `table`/`grid` | Judul tabel | Baris terpilih, urutan kolom |
| VirtualList | `list` | Nama daftar | Posisi item |
| TreeView | `tree`/`treeitem` | Nama pohon | `expanded`, `selected`, level |
| KanbanBoard | `list` per kolom + `button` | Nama kolom | Jumlah kartu, posisi |
| Calendar | `grid` | Nama bulan | Tanggal terpilih, agenda |
| Timeline | `list` | Nama linimasa | Jumlah kejadian |
| LineChart | `img`/figure + tabel alternatif | Ringkasan tren | Titik data terpilih |
| BarChart | sama seperti LineChart | Ringkasan perbandingan | Batang terpilih |
| PieChart | sama seperti LineChart | Ringkasan proporsi | Irisan terpilih |
| AreaChart | sama seperti LineChart | Ringkasan tren | Titik data terpilih |
| StatCard | `group` | Label metrik | Nilai dan satuan |
| Badge | Teks inline | Teks badge | Tidak ada |
| Tag | `listitem` bila dalam daftar | Teks tag | `removable` |
| Avatar | `img` atau inisial | Nama orang | Status online opsional |
| Tooltip | `tooltip` via `describedby` | Teks tooltip | Tidak ada |
| Progress | `progressbar` | Label proses | `valuenow`, indeterminate |
| Skeleton | `aria-busy` pada kontainer | "Memuat" | Selesai memuat |
| EmptyState | `status` | Judul dan aksi | Tidak ada |

### 7.5 Feedback (10 komponen)

| Komponen | Role/elemen | Label wajib | State yang diumumkan |
|---|---|---|---|
| Alert | `alert` untuk kritis, `status` untuk info | Judul alert | Kemunculan |
| Toast | `status` | Teks ringkas | Kemunculan, durasi 10 detik |
| Banner | `region` | Nama banner | `dismissible` |
| FieldError | `alert` + `describedby` | Nama field | Muncul/hilang |
| ConfirmDialog | `alertdialog` | Aksi dan konsekuensi | Fokus pada aksi aman |
| PermissionDialog | `alertdialog` | Nama capability dan risk tier | Grant/deny |
| ErrorBoundary | `alert` | Kode error dan ringkasan | Aksi pemulihan |
| OfflineBanner | `status` | "Mode offline" | Perubahan konektivitas |
| SyncStatus | `status` | Status sinkronisasi | Idle/syncing/error |
| LoadingOverlay | `progressbar` + `aria-busy` | Nama proses | Selesai |

### 7.6 Media (10 komponen)

| Komponen | Role/elemen | Label wajib | State yang diumumkan |
|---|---|---|---|
| Image | `img` | Alt deskriptif atau kosong bila dekoratif | Tidak ada |
| VideoPlayer | `group` + kontrol native | Judul video | Play/pause, caption |
| AudioPlayer | `group` + kontrol native | Judul audio | Play/pause, transkrip |
| CameraCapture | `application` + tombol | "Kamera" | Aktif/gagal |
| QRScanner | `application` + tombol | "Pindai kode QR" | Terdeteksi/gagal |
| BarcodeScanner | `application` + tombol | "Pindai barcode" | Terdeteksi/gagal |
| MapView | `application` + `list` alternatif | Nama peta | Lokasi terpilih |
| PDFViewer | `document` | Judul dokumen | Halaman saat ini |
| MarkdownView | `article` | Judul konten | Heading hierarkis |
| RichTextEditor | `textbox` multiline + `toolbar` | Label editor | Format aktif |

### 7.7 Domain (20 komponen)

| Komponen | Role/elemen | Label wajib | State yang diumumkan |
|---|---|---|---|
| FormBuilder | `form` | Nama form | Jumlah field, validasi |
| SchemaForm | `form` | Nama skema | Error per field |
| WorkflowNode | `button` dalam `list` | Nama node dan tipe | `selected`, koneksi |
| CodeEditor | `textbox` multiline + `application` | Nama berkas | Posisi kursor, error |
| DiffViewer | `table` atau `list` | Nama berkas | Baris berubah |
| Terminal | `log` | Nama sesi | Output baru |
| LogViewer | `log`/`list` | Nama log | Baris baru, filter |
| ChatThread | `log` | Nama percakapan | Pesan baru |
| MessageBubble | `article` | Pengirim dan waktu | Streaming selesai |
| ReceiptView | `article` + `table` | Nomor struk | Total |
| InvoiceView | `article` + `table` | Nomor invoice | Status pembayaran |
| ContactPicker | `dialog` + `listbox` | "Pilih kontak" | Kontak terpilih |
| FileTree | `tree` | Nama folder akar | `expanded`, `selected` |
| RecordDetail | `article` + `definitionlist` | Nama record | Mode edit |
| FilterBar | `group` | "Filter" | Jumlah filter aktif |
| SavedView | `tablist`/`option` | Nama view | View terpilih |
| ImportWizard | `dialog` multi-langkah | Nama langkah | Langkah saat ini |
| ExportDialog | `dialog` | Format dan cakupan | Proses ekspor |
| VaultItem | `listitem` + `button` | Nama item | Terkunci/terbuka |
| DeviceCard | `article` | Nama perangkat | Status pairing |

### 7.8 Platform (10 komponen)

| Komponen | Role/elemen | Label wajib | State yang diumumkan |
|---|---|---|---|
| AppIcon | `button`/`link` | Nama micro-app | `current` bila aktif |
| WidgetFrame | `figure` | Nama widget | `expanded` |
| WindowChrome | `banner` + tombol | Judul jendela | Maximize/restore |
| ContextMenu | `menu` | Konteks item | `expanded` |
| NotificationItem | `listitem` | Judul dan waktu | Belum dibaca |
| ShareSheet | `dialog` | "Bagikan" | Target terpilih |
| IntentPicker | `dialog` + `listbox` | Nama intent | App terpilih |
| PermissionBadge | Teks + ikon | Nama capability | Granted/denied |
| StorageMeter | `meter`/`progressbar` | Kategori penyimpanan | Nilai dan ambang |
| UpdateCard | `article` | Versi tersedia | Tersedia/mengunduh/siap |

### 7.9 AI (10 komponen)

| Komponen | Role/elemen | Label wajib | State yang diumumkan |
|---|---|---|---|
| PromptInput | `textbox` multiline | "Prompt" | `busy` |
| ModelPicker | `combobox` | "Model" | Model terpilih, lokal/BYOK |
| AIStatus | `status` | Status provider | Siap/offline/memuat |
| SuggestionChip | `button` | Teks saran | `disabled` |
| DiffSuggestion | `region` + `button` | Berkas dan ringkasan | Terima/tolak |
| GenerationProgress | `progressbar` | Tahap generasi | `valuenow`, tahap |
| SourceCitation | `link` | Judul sumber | Tidak ada |
| AIError | `alert` | Kode error | Aksi pemulihan |
| TokenMeter | `meter` | "Penggunaan token" | Nilai dan batas |
| AgentStep | `listitem` | Nama langkah | Berjalan/selesai/gagal |

## 8. Gerak, Zoom, dan Preferensi Pengguna

| Preferensi | Deteksi | Perilaku wajib |
|---|---|---|
| Reduced motion | `prefers-reduced-motion: reduce`, Flutter `MediaQuery.disableAnimations` | Durasi transisi 0 ms; tidak ada parallax, auto-scroll animasi, atau skeleton berdenyut; indikator progres statis dengan teks. |
| Reduced transparency | `prefers-reduced-transparency` (bila tersedia) | Permukaan menjadi opak; tidak ada blur yang menurunkan kontras. |
| Forced colors / high contrast | `forced-colors`, tema high-contrast MADS | Warna sistem dihormati; focus ring `#0000EE`; tidak ada informasi hilang. |
| Zoom 200% | Zoom browser dan Flutter `textScaler` 2.0 | Konten reflow tanpa scroll horizontal pada 320 CSS px; tabel lebar memakai scroll container berlabel. |
| Spasi teks | Override CSS sesuai 1.4.12 | Tidak ada kliping pada tombol, badge, dan sel tabel. |
| Ukuran target | Pengaturan "target sentuh besar" | Target minimum 44×44 CSS px dan 48×48 dp. |
| Kursor besar | Preferensi OS | Kursor kustom tidak menutupi teks dan tetap terlihat pada latar gelap. |

## 9. RTL dan Internasionalisasi Layout

| Aspek | Ketentuan |
|---|---|
| Arah dokumen | `dir="rtl"`/`Directionality.rtl` di root sesuai locale; tidak ada override per komponen tanpa alasan. |
| Properti layout | Wajib memakai properti logis (`margin-inline-start`, `padding-inline-end`, `start`/`end`, `text-align: start`); `left`/`right` fisik dilarang pada layout. |
| Mirroring ikon | Ikon arah (kembali, chevron, panah, indentasi) dicerminkan; logo, ikon merek, jam, dan tombol play tidak dicerminkan. |
| Angka dan kode | Angka, ID, hash, dan kode tetap LTR dengan isolasi bidi; tidak dicerminkan. |
| Grafik dan timeline | Sumbu waktu mengikuti arah baca locale, kecuali data yang memang berurutan waktu global. |
| Tabel | Kolom pertama tetap di sisi start; header dan sel mengikuti arah teks. |
| Scrollbar | Berada di sisi end; scroll horizontal dimulai dari kanan pada RTL. |
| Teks campuran | Nama micro-app, path, dan pesan error teknis dibungkus `bdi`/`Directionality.ltr` agar tidak merusak urutan. |
| Uji | Pseudo-locale RTL dan locale `ar` diuji pada 22 layar; tidak ada teks terpotong (NFR-I18N-002). |

## 10. Media: Caption, Transkrip, dan Alternatif

| Media | Ketentuan |
|---|---|
| Video | Caption WebVTT untuk seluruh ucapan; transkrip dapat dibuka; kontrol native dapat dioperasikan keyboard. |
| Audio | Transkrip tersedia; tidak ada autoplay audio; durasi dan posisi dapat dikendalikan. |
| Gambar | Alt deskriptif untuk konten; alt kosong untuk dekoratif; screenshot kanonik menyertakan deskripsi di caption. |
| Animasi fitur | Tanpa kilatan > 3 per detik; dapat dijeda. |
| Kamera dan QR | Selalu ada tombol pemicu dan alternatif input manual. |
| Grafik | Ringkasan teks, tabel data, dan nilai langsung pada titik penting. |

## 11. Identifikasi dan Pencegahan Error

| Aturan | Ketentuan |
|---|---|
| Pesan field | Error tampil di dekat field, dihubungkan `aria-describedby`, dan memuat penyebab serta langkah perbaikan. |
| Ringkasan | Form panjang menampilkan ringkasan error di atas form dengan tautan ke field; fokus dipindah ke ringkasan setelah submit gagal. |
| Ikon dan teks | Error memakai ikon, teks, dan warna; tidak hanya border merah. |
| Kode error | Setiap error sistem menampilkan kode `E-<DOMAIN>-<NNN>` dan aksi pemulihan sesuai [error-codes.md](../03-specs/error-codes.md). |
| Pencegahan | Aksi destruktif memakai konfirmasi dengan fokus pada aksi aman, ditambah undo 10 detik. |
| Pengumuman | Error kritis memakai `role="alert"`; error validasi form memakai live region `polite` agar tidak memotong pembacaan. |
| Fokus | Setelah error, fokus berpindah ke field pertama yang tidak valid, bukan ke field pertama form. |
| Bahasa | Pesan error mengikuti locale aktif dan formula di [content-i18n.md](content-i18n.md). |

## 12. Matriks Uji

| Lapisan | Alat | Cakupan | Gate |
|---|---|---|---|
| Otomatis web | axe-core pada setiap route dan state (loading, empty, error, offline) | Pelanggaran serius/kritis = 0 | CI per PR |
| Otomatis native | `flutter test` dengan `SemanticsTester` dan golden test tema | Tidak ada kontrol tanpa label | CI per PR |
| Kontras | Alat kontras pada seluruh pasangan token tema terang, gelap, AMOLED, high-contrast | 4,5:1 teks, 3:1 non-teks | CI token |
| Keyboard-only | Skenario manual per layar | 10 tugas inti Host dan 5 tugas inti Studio | Release gate |
| Screen reader web | NVDA + Firefox/Chrome di Windows, VoiceOver + Safari di macOS | 22 layar, 20 komponen inti | Release gate |
| Screen reader native | VoiceOver iOS/macOS, TalkBack Android | 22 layar | Release gate |
| Zoom dan reflow | Zoom 200%, viewport 320 px, `textScaler` 2.0 | Tidak ada konten hilang atau scroll horizontal | Release gate |
| Reduced motion | Emulasi media query dan `disableAnimations` | Alur selesai tanpa animasi | Release gate |
| RTL dan pseudo-locale | Locale `ar` dan `en-XA` | Tidak ada overflow; string tidak terpotong | Release gate |
| Form dan error | Uji validasi, error sistem, konfirmasi destruktif | Pesan sesuai formula dan fokus benar | Per PR fitur |
| Regresi visual | Snapshot state wajib per tema | Tidak ada perubahan tak terdukung | CI per PR |

Kepemilikan: tim design menetapkan pola, QA mengeksekusi matriks, dan reviewer PR menolak perubahan UI tanpa bukti axe atau test semantics untuk state baru. Detail lapisan pengujian ada di [test-strategy.md](../08-quality/test-strategy.md).

## 13. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| AC-A11Y-01 | Pengguna keyboard-only | Menyelesaikan 10 tugas inti Host dan 5 tugas inti Studio | Semua tugas selesai tanpa pointer dan tanpa focus trap |
| AC-A11Y-02 | Pembaca layar NVDA atau VoiceOver | Menelusuri 22 layar | Tidak ada kontrol tanpa nama; status penting diumumkan |
| AC-A11Y-03 | Token tema terang, gelap, AMOLED, dan high-contrast | Diukur dengan alat kontras | Teks ≥ 4,5:1 dan non-teks ≥ 3:1; tidak ada pasangan terlarang |
| AC-A11Y-04 | Pengguna mengaktifkan reduced motion | Menjalankan alur inti | Alur selesai tanpa animasi dan tanpa kehilangan informasi |
| AC-A11Y-05 | Pengguna memperbesar teks 200% | Membuka 22 layar pada lebar 320 px | Tidak ada konten terpotong atau scroll horizontal yang tidak disengaja |
| AC-A11Y-06 | Locale RTL | Membuka 22 layar | Layout tercermin benar; teks dan kontrol tidak terpotong |
| AC-A11Y-07 | Form dengan field tidak valid | Submit dengan keyboard | Fokus pindah ke field pertama yang salah dan error terbaca |
| AC-A11Y-08 | Micro-app memakai komponen MUIP | Dirender di web dan Flutter | Role, label, dan state identik secara semantik |
| AC-A11Y-09 | Target pointer kecil | Diukur pada layar sentuh | Setiap target ≥ 24×24 CSS px/48×48 dp dengan jarak ≥ 8 px |

## 14. Verifikasi

1. Jalankan axe-core pada setiap route dan state; kegagalan serius atau kritis memblokir merge.
2. Jalankan audit keyboard-only pada 22 layar dengan skrip tugas pada §6 dan catat hasilnya di PR.
3. Jalankan uji screen reader pada 20 komponen inti dan 22 layar; simpan temuan dan perbaikan.
4. Ukur kontras seluruh pasangan token yang dipakai dan perbarui tabel §4 bila token berubah.
5. Uji zoom 200%, reflow 320 px, reduced motion, forced colors, RTL, dan pseudo-locale.
6. Perbarui [prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md) untuk NFR-* terkait bila cakupan uji berubah.

## 15. Referensi

- [nfr.md](../03-specs/nfr.md) — NFR-A11Y dan NFR-I18N
- [ui-protocol.md](../03-specs/ui-protocol.md) — properti aksesibilitas MUIP
- [permissions.md](../03-specs/permissions.md) — dialog consent dan risk tier
- [error-codes.md](../03-specs/error-codes.md) — kode dan pemulihan error
- [design-system.md](design-system.md) — token warna, tipografi, motion
- [component-catalog.md](component-catalog.md) — 120 komponen MADS
- [screen-specs.md](screen-specs.md) — SCR-01 sampai SCR-22
- [interaction-patterns.md](interaction-patterns.md) — shortcut dan gesture
- [content-i18n.md](content-i18n.md) — voice, tone, dan format pesan
- [test-strategy.md](../08-quality/test-strategy.md) — lapisan pengujian
- [glossary.md](../00-foundation/glossary.md) — istilah kanonik
