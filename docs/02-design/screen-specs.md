---
id: DESIGN-SCREENS
title: Spesifikasi Layar
status: accepted
owner: design
prd_refs: ["§4", "§6"]
---

# Spesifikasi Layar

## 1. Konvensi

Dokumen ini merinci 12 layar `SCR-01` sampai `SCR-12` beserta wireframe, state, interaksi, aksesibilitas, dan acceptance. Peta route dan navigasi ada di [information-architecture.md](information-architecture.md); token visual dan komponen mengikuti [design-system.md](design-system.md) dan [component-catalog.md](component-catalog.md).

Notasi wireframe:

| Simbol | Arti |
|---|---|
| `[ Label ]` | Tombol atau kontrol yang dapat difokus |
| `[x]` / `[ ]` | Checkbox aktif / tidak aktif |
| `(o)` | Avatar atau status |
| `~ teks ~` | Placeholder input |
| `*` | Penanda item menu aktif |
| `[v]` | Menu dropdown |
| `#` | Isi meter atau progress |

Aturan umum:

- Setiap layar MUST punya state `loading`, `empty`, `error`, dan `offline`; layar yang tidak memiliki data menjelaskan mengapa state itu tidak berlaku.
- Satu layar hanya memiliki satu tombol `primary`.
- Semua teks memakai token tipografi dan semua permukaan memakai token clay; tidak ada nilai visual hardcoded.
- Breakpoint: dock bawah di bawah 768 px (termasuk `sm` ≥ 640 px), rail tablet 768–1023 px, sidebar desktop 1024–1279 px, dan konten maksimum 1200 px pada `xl` ≥ 1280 px ([design-system.md](design-system.md)).
- Target sentuh minimum 44 × 44 px dan focus ring 3 px ([accessibility.md](accessibility.md)).
- Setiap acceptance harus dapat diuji tanpa membaca kode.

## 2. Matriks Layar

| ID | Layar | Route | Aksi utama | Flow |
|---|---|---|---|---|
| SCR-01 | Welcome/First Run | Overlay di `/` | Mulai dari template | FLOW-01 |
| SCR-02 | Home/Library | `/` | Buka app atau buat baru | FLOW-01, FLOW-02 |
| SCR-03 | Templates | `/templates` | Pakai template | FLOW-02 |
| SCR-04 | Create | `/create?mode=ai\|blank` | Buat draft | FLOW-02 |
| SCR-05 | Builder | `/studio/[projectId]` | Preview | FLOW-03 |
| SCR-06 | Preview | `/studio/[projectId]?preview=1` | Kembali edit | FLOW-03 |
| SCR-07 | App Runner | `/app/[appId]` | Gunakan app | FLOW-06, FLOW-07 |
| SCR-08 | Packages/Share | `/packages` | Ekspor `.mapp` | FLOW-04 |
| SCR-09 | Import/Install | `/packages/import` | Pasang | FLOW-04 |
| SCR-10 | Backup/Restore | `/settings/data` | Buat backup | FLOW-05 |
| SCR-11 | Settings | `/settings` dan subroute | Simpan preferensi | FLOW-05 |
| SCR-12 | Permission Consent | Overlay global | Tolak | FLOW-06 |

## 3. SCR-01 — Welcome/First Run

### Route

`/` sebagai overlay. Tidak ada route terpisah dan tidak ada redirect. Overlay tampil sekali pada first load setelah identitas lokal dibuat, lalu tidak muncul lagi kecuali data lokal direset.

### Tujuan

Menyambut pengguna baru, menegaskan bahwa identitas lokal sudah siap tanpa akun, dan menawarkan tiga jalur create tanpa memblokir Home.

### Wireframe

```text
+------------------------------------------------------------------+
|  Home di belakang overlay, tetap terlihat dan tidak diblokir     |
|                                                                  |
|        +----------------------------------------------+          |
|        |  ( blob clay )                               |          |
|        |  MicroApp Studio                             |          |
|        |  Bangun micro-app langsung di browser.       |          |
|        |                                              |          |
|        |  (o) Identitas lokal siap - tanpa akun       |          |
|        |                                              |          |
|        |  [ Mulai dari template ]        primary      |          |
|        |  [ Buat kosong ]                secondary    |          |
|        |  Coba Magic Create                           |          |
|        |                                              |          |
|        |  Lewati untuk sekarang                  [x]  |          |
|        +----------------------------------------------+          |
|                                                                  |
+------------------------------------------------------------------+
```

### State

| State | Perilaku |
|---|---|
| Loading | Overlay tidak dirender sebelum identity worker selesai; Home menampilkan skeleton kartu. Tidak ada spinner layar penuh. |
| Empty | Tidak berlaku; overlay selalu memiliki tiga aksi create. |
| Error | Identity gagal: overlay diganti banner `ephemeral` dengan kode `E-SHELL-002`, aksi retry dan ekspor; Home tetap tampil. |
| Offline | Tidak ada perubahan; alur tidak memanggil jaringan dan identitas dibuat lokal. |

### Interaksi Utama

- **Mulai dari template** menuju SCR-03; **Buat kosong** menuju `/create?mode=blank`; **Coba Magic Create** menuju `/create?mode=ai`.
- **Lewati untuk sekarang** menutup overlay dan menyimpan flag lokal; overlay tidak tampil lagi pada kunjungan berikutnya.
- `Esc` sama dengan **Lewati**.
- Fokus awal berada pada **Mulai dari template**; karena overlay tidak memblokir, `Tab` dapat meninggalkan kartu menuju Home; menutup overlay mengembalikan fokus ke tombol **Buat**.
- Recovery phrase tidak pernah muncul di layar ini (FLOW-01, ADR-0022).

### Aksesibilitas

- Overlay memakai `role="dialog"` dengan `aria-modal="false"` dan `aria-labelledby` pada judul; karena tidak memblokir, fokus tidak terperangkap dan latar tetap dapat difokus.
- Tombol **Lewati** memiliki `aria-label="Lewati perkenalan"`.
- Tidak ada informasi yang disampaikan hanya lewat warna atau blob dekoratif.
- `prefers-reduced-motion` menonaktifkan animasi masuk blob.

### Acceptance

- [ ] Overlay tampil sekali pada first load dan tidak tampil setelah **Lewati** atau reload berikutnya.
- [ ] Home terlihat di belakang overlay; tidak ada layar penuh yang menghalangi.
- [ ] Ketiga jalur create dapat dimulai dari overlay dengan maksimal dua klik menuju builder.
- [ ] Tidak ada kata recovery phrase atau mnemonic sebelum pengguna membuka backup.
- [ ] Tidak ada request jaringan yang dipicu oleh layar ini.

## 4. SCR-02 — Home/Library

### Route

`/`.

### Tujuan

Menjadi pusat kerja: membuka app, mencari lintas app dan record, melihat draft terbaru, serta masuk ke impor package.

### Wireframe

```text
+-------------+----------------------------------------------------+
| MicroApp    |  [ Cari app, project, record...            ]  (o)  |
| Studio      |  Offline - data lokal siap                         |
|             +----------------------------------------------------+
| Home      * |  Draft terbaru                                     |
| Templates   |  +-------------------+  +-------------------+      |
| Packages    |  | Kasir Warung      |  | Tugas Harian       |      |
| Settings    |  | 3 menit lalu      |  | kemarin           |      |
|             |  +-------------------+  +-------------------+      |
| [ + Buat ]  |                                                    |
|             |  Semua app                 [grid|list]  [Filter v] |
|             |  +----------+ +----------+ +----------+            |
|             |  | [ikon]   | | [ikon]   | | [ikon]   |            |
|             |  | Kasir    | | Tugas    | | Survey   |            |
|             |  | v1.2.0   | | v1.0.1   | | v2.0.0   |            |
|             |  | Aktif    | | Aktif    | | Aktif    |            |
|             |  +----------+ +----------+ +----------+            |
| 42% storage |  [ Impor .mapp ]                                   |
+-------------+----------------------------------------------------+
```

### State

| State | Perilaku |
|---|---|
| Loading | Skeleton kartu dengan jumlah dan ukuran sama seperti grid final; search aktif setelah data siap. |
| Empty | Hero "Buat micro-app pertamamu" dan tiga kartu: **Template**, **Magic Create**, **Mulai kosong**; ketiganya terlihat tanpa scroll pada 360 × 640. |
| Error | Bila host DB gagal dibuka, tampil `E-SHELL-001` dengan aksi retry dan ekspor; app terpasang yang sudah dimuat tetap dapat dibuka. |
| Offline | Banner tipis "Offline - data lokal" dan badge cache; grid, search, dan peluncuran app tetap berfungsi (FR-SHELL-003). |

### Interaksi Utama

- Klik kartu app membuka SCR-07 tanpa reload penuh; `Enter` pada kartu terfokus melakukan hal yang sama.
- Tombol **Buat** membuka SCR-04 dengan mode terakhir; di mobile tombol ini menjadi FAB.
- Context menu (klik kanan atau tombol menu) berisi buka, rename, duplikat, ekspor, pin, dan uninstall.
- Filter dan sort: terbaru, nama, tipe, favorit; pilihan disimpan dan dipulihkan setelah reload (FR-SHELL-006, FR-SHELL-016).
- **Impor .mapp** dan drag-drop file menuju SCR-09.
- Search menampilkan hasil terkelompok App, Project, Record, dan Aksi; `Cmd/Ctrl+K` membuka command palette.

### Aksesibilitas

- Grid memakai `role="list"` dengan setiap kartu sebagai `listitem` yang dapat difokus.
- Search memakai `role="searchbox"` dengan label "Cari app, project, record".
- Badge penyimpanan dan offline memiliki teks, bukan hanya warna.
- Hasil pencarian dan status pemuatan diumumkan melalui live region `polite`.
- Kartu app memiliki `aria-label` berisi nama, versi, dan status.

### Acceptance

- [ ] Empty state menampilkan tiga jalur create dan dapat dijangkau dengan keyboard.
- [ ] Pencarian satu kata mengembalikan hasil App, Project, dan Record yang dikelompokkan.
- [ ] Membuka app dari Home memuat `/app/[appId]` tanpa reload shell.
- [ ] Filter dan sort bertahan setelah reload.
- [ ] Home dapat dibuka dan dipakai saat offline.

## 5. SCR-03 — Templates

### Route

`/templates`.

### Tujuan

Menjelajah template per kategori, melihat isi template, dan memakainya untuk membuat draft dalam satu alur.

### Wireframe

```text
+-------------+----------------------------------------------------+
| Sidebar     |  Templates                          [ Cari... ]   |
|             |  [Semua] [Kasir] [Produktivitas] [Inventaris]      |
|             |                                                    |
|             |  +----------------+  +----------------+            |
|             |  | [preview]      |  | [preview]      |            |
|             |  | Kasir Sederhana|  | Daftar Tugas   |            |
|             |  | 1 layar - 1 DB |  | 2 layar        |            |
|             |  +----------------+  +----------------+            |
|             |                                                    |
|             |  +----------------------------------------------+  |
|             |  | Kasir Sederhana                    v1.0.0     |  |
|             |  | Layar: Daftar Produk, Kasir                  |  |
|             |  | Data: produk, transaksi                      |  |
|             |  | Permission: penyimpanan lokal                |  |
|             |  | [ Pakai template ]                           |  |
|             |  +----------------------------------------------+  |
+-------------+----------------------------------------------------+
```

### State

| State | Perilaku |
|---|---|
| Loading | Skeleton kartu 3 kolom dengan tinggi tetap; filter kategori sudah tampil. |
| Empty | Pesan "Tidak ada template di kategori ini" dengan aksi **Lihat semua** dan **Buat kosong**. |
| Error | Katalog template gagal dimuat: `E-DATA-001` dengan retry; jalur **Buat kosong** tetap tersedia. |
| Offline | Seluruh template dibundel lokal; tidak ada perubahan dan tidak ada fetch. |

### Interaksi Utama

- Memilih kartu menampilkan preview di panel kanan (desktop) atau sheet (mobile/tablet) berisi layar contoh, data contoh, dan permission (FR-CREATE-002).
- **Pakai template** membuat draft dengan nama otomatis dari nama template, mengisi sample data, lalu membuka SCR-05 (FR-CREATE-003).
- Nama draft dapat diubah inline di builder; tidak ada modal penamaan.
- Kategori dan query pencarian disimpan dalam URL agar tombol kembali mempertahankan state.
- `Esc` menutup preview tanpa meninggalkan halaman.

### Aksesibilitas

- Daftar kategori memakai `role="tablist"`; setiap kategori `role="tab"` dengan `aria-selected`.
- Preview diumumkan dengan `role="region"` dan `aria-label` "Preview template <nama>".
- Kartu template dapat difokus dan diaktifkan dengan `Enter` atau `Space`.
- Tidak ada auto-rotate pada preview; animasi hanya saat pengguna memilih.

### Acceptance

- [ ] Preview menampilkan layar contoh, data contoh, dan permission sebelum **Pakai template**.
- [ ] **Pakai template** menghasilkan draft tersimpan dengan sample data terlihat di kanvas.
- [ ] Pencarian dan filter kategori menyaring kartu tanpa reload.
- [ ] Dari Home ke builder lewat template selesai dalam maksimal tiga klik.
- [ ] Halaman tetap berfungsi penuh saat offline.

## 6. SCR-04 — Create

### Route

`/create?mode=ai` dan `/create?mode=blank`.

### Tujuan

Membuat draft baru dari satu prompt AI atau dari layout kosong, tanpa wizard multi-langkah.

### Wireframe

```text
+------------------------------------------------------------------+
|  < Kembali                Buat micro-app                         |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | Ceritakan app yang kamu butuhkan                           |  |
|  | ~ kasir untuk warung, bisa tambah produk dan cetak struk ~ |  |
|  |                                                    0 / 600 |  |
|  +------------------------------------------------------------+  |
|  [ kasir ] [ tugas ] [ inventaris ] [ survey ]                    |
|                                                                  |
|  AI: belum dikonfigurasi                        [ Atur AI ]      |
|                                                                  |
|  [ Buat ]  primary                        [ Gunakan template ]   |
|                                                                  |
|  --------------------------------------------------------------  |
|  Rencana (muncul setelah Buat)                                   |
|  1 layar - data: produk, transaksi - aksi: tambah, bayar         |
|  [ Buat aplikasi ]                              [ Ubah ]         |
+------------------------------------------------------------------+
```

Mode kosong:

```text
+------------------------------------------------------------------+
|  < Kembali                Buat micro-app                         |
|                                                                  |
|  Pilih titik awal                                                |
|  +----------------+  +----------------+  +----------------+      |
|  | Form           |  | List           |  | Dashboard      |      |
|  | [preview]      |  | [preview]      |  | [preview]      |      |
|  | [ Pilih ]      |  | [ Pilih ]      |  | [ Pilih ]      |      |
|  +----------------+  +----------------+  +----------------+      |
|                                                                  |
|  Draft langsung dibuat dengan nama otomatis.                     |
+------------------------------------------------------------------+
```

### State

| State | Perilaku |
|---|---|
| Loading | Mode AI menampilkan status "Menyiapkan rencana..." pada area rencana; tombol **Buat** berubah menjadi `loading` dan tidak dapat diklik ganda. |
| Empty | Textarea kosong dengan chip contoh; tombol **Buat** tetap aktif, dan submit tanpa isi memicu `E-CREATE-001` serta memfokuskan textarea. |
| Error | `E-CREATE-001` untuk prompt kosong/terlalu panjang; `E-CREATE-002` tanpa provider; `E-CREATE-003` saat generate gagal. Semua error menampilkan fallback template dan kosong. |
| Offline | AI tidak tersedia; tampilkan catatan "AI butuh koneksi" dan dua jalur offline: **Gunakan template** dan **Buat kosong**. |

### Interaksi Utama

- Chip contoh mengisi textarea dengan prompt siap pakai; `Cmd/Ctrl+Enter` memicu **Buat** (FR-CREATE-004).
- Tanpa API key, tampil dua aksi **Atur AI** dan **Gunakan template**; jalur offline tidak pernah diblokir (FR-CREATE-005).
- Rencana AI berupa ringkasan layar, data, dan aksi; **Buat aplikasi** membuat draft yang dapat diedit, **Ubah** mengembalikan fokus ke prompt (FR-CREATE-006, FR-CREATE-007).
- Mode kosong membuat satu layar contoh sesuai layout yang dipilih (FR-CREATE-008).
- `Esc` kembali ke Home; bila draft sudah dibuat, draft tetap tersimpan (FR-CREATE-011).

### Aksesibilitas

- Textarea memiliki label terlihat dan `aria-describedby` untuk batas karakter dan pesan error.
- Status AI diumumkan lewat live region `polite`; kegagalan memakai `role="alert"`.
- Kartu layout kosong memakai `role="radiogroup"` dengan `role="radio"` dan `aria-checked`.
- Fokus dipindahkan ke ringkasan rencana setelah generate selesai, lalu ke **Buat aplikasi**.

### Acceptance

- [ ] Satu prompt menghasilkan rencana yang dapat ditinjau sebelum apply.
- [ ] Tanpa API key, pengguna tetap dapat membuat app lewat template atau kosong.
- [ ] Prompt kosong menampilkan `E-CREATE-001` dan memfokuskan textarea.
- [ ] Mode kosong membuat draft dengan satu layar contoh dan nama otomatis.
- [ ] Create mencapai builder dalam maksimal tiga klik dari Home.

## 7. SCR-05 — Builder

### Route

`/studio/[projectId]`.

### Tujuan

Menyusun UI secara visual dengan palette, kanvas device frame, dan inspector berbasis token, dengan autosave dan undo/redo.

### Wireframe

```text
+------------------------------------------------------------------+
| <  Kasir Warung *  Tersimpan  [undo] [redo]  [M] [T] [D]         |
|                                        [ Preview ]  [ Bagikan ]  |
+-------------+----------------------------------+-----------------+
| Cari...     |  +----------------------------+  | Content         |
| [48 core]   |  |  Device frame: Mobile      |  | Nama [Kasir ]   |
| Advanced  o |  |  +----------------------+  |  |                 |
|             |  |  | Daftar Produk        |  |  | Style           |
| Layout      |  |  |----------------------|  |  | Fill   [tint]   |
|  Card       |  |  | Kopi        Rp 10.000|  |  | Radius [clay-lg]|
|  Stack      |  |  | Roti        Rp 8.000 |  |  | Shadow [clay-1] |
| Input       |  |  +----------------------+  |  | Spacing [16]    |
|  Button     |  |  [ + Tambah komponen ]     |  |                 |
|  TextField  |  +----------------------------+  | Layout          |
|             |                                  | Behavior        |
+-------------+----------------------------------+-----------------+
```

Mobile:

```text
+--------------------------------------+
| < Kasir Warung   Tersimpan   [ ... ] |
+--------------------------------------+
|                                      |
|   +------------------------------+   |
|   |  Kanvas penuh                |   |
|   |  Daftar Produk               |   |
|   |  Kopi        Rp 10.000       |   |
|   +------------------------------+   |
|                                      |
+--------------------------------------+
|  [ Tambah ]   [ Layer ]   [ Atur ]   |
+--------------------------------------+
```

### State

| State | Perilaku |
|---|---|
| Loading | Kerangka top bar, palette skeleton, dan kanvas kosong berukuran final; inspector menampilkan placeholder. |
| Empty | Kanvas kosong menampilkan ajakan "Tambah komponen pertama" dengan tombol yang memfokuskan palette (FR-STUDIO-018). |
| Error | `E-STUDIO-001` untuk dokumen rusak dengan tawaran muat versi valid dan ekspor; `E-STUDIO-002` untuk autosave gagal dengan banner retry dan salinan lokal. |
| Offline | Builder berfungsi penuh; status "Tersimpan lokal" dan tidak ada percobaan sinkronisasi. |

### Interaksi Utama

- Palette default menampilkan 48 komponen core dengan pencarian dan kategori; toggle **Advanced** menampilkan 120 komponen (FR-STUDIO-003).
- Klik atau drag dari palette menambah komponen; drop indicator 2 px `--mads-color-primary`; drop tidak valid memicu `E-STUDIO-003` dan toast (FR-STUDIO-004).
- Reorder, nest, dan hapus dapat dilakukan dari kanvas atau tab Layer; hapus dapat di-undo (FR-STUDIO-005).
- Inline edit teks: `Enter` commit, `Esc` cancel (FR-STUDIO-006).
- Inspector memiliki tab Content, Style, Layout, Behavior; semua nilai style berasal dari token clay dan tidak ada input CSS mentah (FR-STUDIO-007, FR-STUDIO-008).
- Autosave 500 ms dengan status **Menyimpan...** lalu **Tersimpan**; tidak ada tombol Save wajib (FR-STUDIO-011).
- **Preview** membuka SCR-06; **Bagikan** membuka sheet share; tab **JSON** hanya tersedia sebagai read-only kecuali flag advanced aktif (FR-STUDIO-014, FR-STUDIO-015).

### Aksesibilitas

- Kanvas memakai `role="application"` dengan `aria-label` "Kanvas <nama project>" dan petunjuk keyboard yang dapat dibuka.
- Setiap node memiliki `aria-label` berisi tipe dan teks; drag handle memiliki `aria-grabbed` dan dapat dipindah dengan `Alt+Panah`.
- Palette dan inspector adalah landmark terpisah dengan heading yang jelas (FR-STUDIO-017).
- Status simpan diumumkan lewat live region `polite`, tidak setiap ketikan.
- `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`, dan `Cmd/Ctrl+Enter` berfungsi di seluruh builder (FR-STUDIO-016).

### Acceptance

- [ ] Reload mengembalikan node, nama, dan device frame terakhir.
- [ ] Palette menampilkan 48 komponen secara default dan 120 setelah **Advanced** diaktifkan.
- [ ] Perubahan tersimpan otomatis 500 ms setelah edit tanpa menekan tombol Save.
- [ ] Undo/redo bekerja 100 langkah dan menyebut aksi di toast.
- [ ] Drop tidak valid tidak menghilangkan draft dan menampilkan `E-STUDIO-003`.

## 8. SCR-06 — Preview

### Route

`/studio/[projectId]?preview=1`.

### Tujuan

Menguji draft di sandbox yang sama dengan runtime produksi, dengan device switcher dan consent JIT.

### Wireframe

```text
+------------------------------------------------------------------+
| <  Preview: Kasir Warung          [ M ] [ T ] [ D ]  [ Edit ]    |
+------------------------------------------------------------------+
|                                                                  |
|          +----------------------------------------+              |
|          |  iframe sandbox - chrome dimatikan     |              |
|          |  Daftar Produk                         |              |
|          |  Kopi                    Rp 10.000     |              |
|          |  Roti                    Rp  8.000     |              |
|          |  [ + Tambah ]                          |              |
|          +----------------------------------------+              |
|                                                                  |
|  Consent muncul sebagai sheet saat app meminta permission.       |
+------------------------------------------------------------------+
```

### State

| State | Perilaku |
|---|---|
| Loading | Bingkai device tampil segera dengan skeleton di dalam iframe; tombol device tetap aktif. |
| Empty | Bila draft tidak memiliki node, tampil pesan "Draft belum memiliki layar" dan tombol **Kembali edit**. |
| Error | Error runtime memakai boundary di dalam area preview (`E-RUN-004`); shell dan editor tidak ikut gagal. |
| Offline | Preview berjalan penuh; app yang meminta network ditolak dengan `E-NET-001` dan dijelaskan di sheet. |

### Interaksi Utama

- Device switcher mengganti lebar frame antara mobile 390 px, tablet 834 px, dan desktop 1280 px; pilihan disimpan per project (FR-STUDIO-002).
- Toggle `?preview=1` menghapus chrome builder dan memakai iframe `sandbox="allow-scripts"` yang sama dengan SCR-07 (FR-STUDIO-013).
- Permission yang diminta draft memunculkan SCR-12 just-in-time; hasil consent berlaku untuk sesi preview.
- **Edit** atau `Esc` kembali ke builder; state kanvas tidak berubah.
- Interaksi di dalam iframe tidak boleh mengubah dokumen; preview bersifat read-only terhadap draft.

### Aksesibilitas

- Device switcher memakai `role="radiogroup"` dengan label "Ukuran perangkat".
- Iframe memiliki `title` berisi nama app dan mode preview.
- Boundary preview dapat difokus dan memiliki tiga aksi yang sama dengan runtime.
- `Esc` tidak menutup preview saat fokus berada di dalam iframe sampai pengguna menekan tombol **Edit**; petunjuk ini ditampilkan di top bar.

### Acceptance

- [ ] Preview memakai iframe sandbox yang sama dengan runner.
- [ ] Device switcher mengubah lebar frame dan bertahan setelah reload.
- [ ] Consent muncul saat permission pertama diminta, bukan sebelumnya.
- [ ] Error runtime hanya menggagalkan area preview.
- [ ] Kembali ke editor mempertahankan node dan posisi scroll.

## 9. SCR-07 — App Runner

### Route

`/app/[appId]`.

### Tujuan

Menjalankan app terpasang secara terisolasi, menampilkan permission dan status offline, serta menyediakan pemulihan saat crash.

### Wireframe

```text
+------------------------------------------------------------------+
| < Home   Kasir Warung   [Lokal] [Offline cage]          [ menu ] |
+------------------------------------------------------------------+
|                                                                  |
|          +----------------------------------------+              |
|          |  App berjalan di iframe sandbox        |              |
|          |  Daftar Produk                         |              |
|          |  Kopi                    Rp 10.000     |              |
|          |  Roti                    Rp  8.000     |              |
|          |  [ + Tambah ]                          |              |
|          +----------------------------------------+              |
|                                                                  |
|  Saat crash, area ini diganti boundary dengan tiga aksi.         |
+------------------------------------------------------------------+
```

Boundary:

```text
+------------------------------------------------------------------+
|  Aplikasi berhenti                                    E-RUN-001  |
|  Kasir Warung berhenti merespons. Data tersimpan tetap aman.     |
|  [ Muat ulang app ]  [ Ekspor data ]  [ Kembali ke Home ]        |
+------------------------------------------------------------------+
```

### State

| State | Perilaku |
|---|---|
| Loading | Header tampil segera; iframe menampilkan skeleton app; watchdog mulai setelah `onMount`. |
| Empty | App tanpa layar menampilkan pesan dari manifest dan aksi **Kembali ke Home**; bukan area kosong. |
| Error | `E-RUN-001` watchdog, `E-RUN-002` sandbox tidak tersedia, `E-RUN-003` pelanggaran bridge, `E-RUN-004` renderer crash; semua memakai boundary dengan tiga aksi (FR-RUN-009). |
| Offline | App tetap berjalan dari cache; jika meminta network, `E-NET-001` dan badge **Offline cage** menyala. |

### Interaksi Utama

- App dirender dalam iframe `sandbox="allow-scripts"` dengan opaque origin; tidak ada akses DOM Host (FR-RUN-001, SEC-011).
- **Muat ulang app** membuat iframe baru dan memulihkan state; restart dibatasi tiga kali per 5 menit (FR-RUN-010).
- **Ekspor data** mengunduh data app sebagai JSON/CSV; gagal ekspor menampilkan `E-DATA-002` (FR-DATA-008).
- Menu berisi **Permissions**, **Storage**, **Reload**, dan **Kembali ke Home**; revoke permission berlaku pada panggilan berikutnya.
- App di background dihentikan atau dihibernasi setelah 30 detik (FR-RUN-012).

### Aksesibilitas

- Header runner adalah landmark `banner` dengan tombol kembali berlabel "Kembali ke Home".
- Boundary memakai `role="alertdialog"` dengan fokus awal pada **Muat ulang app**; `Esc` setara **Kembali ke Home** dengan konfirmasi bila app memiliki pekerjaan berjalan.
- Badge status memiliki teks lengkap, bukan hanya ikon berwarna.
- Perubahan status app diumumkan lewat live region `assertive` hanya untuk crash.

### Acceptance

- [ ] App berjalan di iframe tanpa `allow-same-origin`.
- [ ] Freeze terdeteksi dalam ≤ 8 detik dan boundary muncul.
- [ ] Tiga aksi boundary berfungsi dan draft builder tidak terpengaruh.
- [ ] Restart keempat dalam 5 menit ditolak dengan penjelasan.
- [ ] Permission yang belum di-grant memicu SCR-12 sebelum akses.

## 10. SCR-08 — Packages/Share

### Route

`/packages`, dengan sheet **Bagikan** yang juga dibuka dari builder.

### Tujuan

Melihat package terpasang, mengekspor `.mapp`, dan mengelola sumber index statis read-only.

### Wireframe

```text
+-------------+----------------------------------------------------+
| Sidebar     |  Packages                          [ Impor .mapp ] |
|             |  [ Terpasang ]  [ Sumber ]                         |
|             |  +----------------------------------------------+  |
|             |  | Kasir Warung     v1.2.0   1.4 MB   [ detail ] |  |
|             |  | Tugas Harian      v1.0.1   0.6 MB   [ detail ] |  |
|             |  | Survey Warga     v2.0.0   1.1 MB   [ detail ] |  |
|             |  +----------------------------------------------+  |
|             |                                                    |
|             |  Sumber index (opsional)                           |
|             |  https://contoh.id/index.json          [Perbarui]  |
|             |  Kunci publik ed25519:7f3a...             [Hapus]  |
+-------------+----------------------------------------------------+
```

Share sheet:

```text
+--------------------------------------------------------------+
|  Bagikan Kasir Warung                              [x]       |
|  Versi 1.2.0 - 1.4 MB                                        |
|  Permission: penyimpanan lokal                               |
|  Checksum: 9c1e4b...                                         |
|                                                              |
|  [ Unduh .mapp ]  primary                                    |
|  [ Salin link index ]   [ Ekspor JSON data ]                 |
+--------------------------------------------------------------+
```

### State

| State | Perilaku |
|---|---|
| Loading | Skeleton tiga baris; tombol **Impor** tetap aktif. |
| Empty | "Belum ada package terpasang" dengan aksi **Buat micro-app** dan **Impor .mapp**. |
| Error | `E-PACK-002` saat signing key tidak tersedia; `E-PACK-004` saat versi tidak valid; detail menampilkan penyebab dan aksi. |
| Offline | Library dan ekspor berfungsi; **Perbarui** index dinonaktifkan dengan alasan. |

### Interaksi Utama

- **Impor .mapp** membuka SCR-09; drag-drop file di area daftar juga diterima (FR-PACK-005).
- Memilih detail menampilkan manifest, signature, permission, versi, dan riwayat versi; rollback tersedia bila versi lama masih tersimpan (FR-PACK-009).
- **Unduh .mapp** memaketkan project dengan manifest v2, ZIP deterministik, dan signature Ed25519; tanpa key, arahkan ke Settings identitas (FR-PACK-002, FR-PACK-003).
- **Salin link index** hanya tersedia bila sumber index dikonfigurasi; tidak ada upload atau publish otomatis.
- Sumber index menampilkan status verifikasi kunci; perubahan public key memicu peringatan keras (FR-PACK-011).

### Aksesibilitas

- Tab memakai `role="tablist"` dan panel `role="tabpanel"`.
- Daftar package adalah tabel semantik dengan header kolom; setiap baris dapat difokus.
- Sheet share memakai `role="dialog"`, fokus terperangkap, dan `Esc` menutup.
- Status verifikasi signature memiliki ikon dan teks "Valid" atau "Tidak valid", bukan hanya warna.

### Acceptance

- [ ] Package terpasang tampil dengan nama, versi, ukuran, dan aksi detail.
- [ ] Ekspor `.mapp` menghasilkan file dengan signature valid dan checksum yang ditampilkan.
- [ ] Tanpa signing key, `E-PACK-002` muncul dan pengguna diarahkan ke identitas.
- [ ] Perubahan public key index menampilkan peringatan sebelum sumber dipercaya.
- [ ] Tidak ada aksi upload ke host mana pun.

## 11. SCR-09 — Import/Install

### Route

`/packages/import`, dirender sebagai modal di atas `/packages`; muat langsung menampilkan halaman penuh dengan konten yang sama.

### Tujuan

Memverifikasi file `.mapp` sebelum instalasi, menampilkan permission, dan menangani kegagalan signature dengan jelas.

### Wireframe

```text
+------------------------------------------------------------------+
|  Impor package                                         [x]       |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |      Tarik file .mapp ke sini, atau [ Pilih file ]         |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  Verifikasi                                                      |
|  [ok] Manifest v2 valid                                          |
|  [ok] Signature Ed25519 cocok                                    |
|  [ok] Digest sha256 cocok                                        |
|                                                                  |
|  Kasir Warung   v1.2.0   Penulis ed25519:7f3a...                 |
|  Permission: storage.local (baca, tulis)                         |
|  Ukuran 1.4 MB   Checksum 9c1e4b...                              |
|                                                                  |
|  [ Pasang ]  primary                             [ Batal ]        |
+------------------------------------------------------------------+
```

### State

| State | Perilaku |
|---|---|
| Loading | Setiap baris verifikasi berubah dari `pending` ke `ok` atau `fail`; tombol **Pasang** nonaktif sampai manifest dan signature valid. |
| Empty | Dropzone dengan penjelasan format `.mapp` dan tautan bantuan; tidak ada tombol pasang. |
| Error | `E-PACK-001` layout/manifest, `E-PACK-002` signature/key, `E-PACK-003` digest, `E-PACK-004` versi; file ditolak dan tetap di disk pengguna. |
| Offline | Impor file lokal berfungsi penuh; impor dari URL index dinonaktifkan dengan penjelasan. |

### Interaksi Utama

- File dipilih lewat dialog, drag-drop, atau input dari Home; verifikasi berjalan lokal (FR-PACK-005).
- Ringkasan permission wajib tampil sebelum **Pasang** (FR-PACK-006, SEC-002).
- **Pasang** menulis package ke OPFS dan menambahkan app ke Home; hasil menampilkan tombol **Buka app** (FR-PACK-007).
- Signature tidak valid atau public key berubah memblokir pemasangan sampai pengguna meninjau peringatan (SEC-006).
- **Batal** atau `Esc` menutup modal dan membuang hasil verifikasi yang belum dipasang.

### Aksesibilitas

- Dropzone memiliki label "Pilih atau tarik file .mapp" dan dapat diaktifkan dengan `Enter`.
- Progres verifikasi diumumkan lewat live region `polite`; kegagalan memakai `role="alert"`.
- Ringkasan permission memakai daftar semantik, bukan tabel visual saja.
- Tombol **Pasang** memiliki `aria-describedby` yang merangkum jumlah permission.

### Acceptance

- [ ] File tanpa signature ditolak dengan `E-PACK-002`.
- [ ] Permission tampil sebelum tombol **Pasang** dapat diaktifkan.
- [ ] Impor berhasil menambahkan app ke Home dan OPFS.
- [ ] Perubahan public key memblokir instalasi sampai disetujui.
- [ ] Membatalkan impor tidak meninggalkan package setengah terpasang.

## 12. SCR-10 — Backup/Restore

### Route

`/settings/data`.

### Tujuan

Membuat backup terenkripsi, memulihkan data dengan verifikasi, memantau storage, dan mereset data lokal secara eksplisit.

### Wireframe

```text
+-------------+----------------------------------------------------+
| Settings    |  Data dan backup                                   |
|             |  Penyimpanan                                       |
| General     |  [###############----------] 62% dari 2 GB         |
| Permissions |  App 820 MB   Cache 210 MB          [ Bersihkan ]  |
| AI          |                                                    |
| Data      * |  Backup                                            |
| About       |  Terakhir 3 hari lalu            [ Buat backup ]   |
| Dev         |  [x] Ingatkan setiap 7 hari                        |
|             |                                                    |
|             |  Restore                                           |
|             |  [ Pilih file .mapp-backup ]                       |
|             |                                                    |
|             |  Reset data lokal                                  |
|             |  [ Reset... ]  destruktif                          |
+-------------+----------------------------------------------------+
```

### State

| State | Perilaku |
|---|---|
| Loading | Meter storage menampilkan skeleton; tombol backup nonaktif selama estimasi dihitung. |
| Empty | Belum ada backup: teks "Belum ada backup" dan tombol **Buat backup** sebagai aksi utama. |
| Error | `E-BACKUP-001` passphrase salah, `E-BACKUP-002` checksum rusak, `E-DATA-002` kuota penuh; tidak ada detail kripto di pesan. |
| Offline | Backup dan restore file lokal berfungsi penuh; tidak ada cloud dan tidak ada antrean upload. |

### Interaksi Utama

- **Buat backup** membuka sheet passphrase minimal 12 karakter; bila recovery phrase belum ada, tawarkan **Buat frasa sekarang** atau **Lewati** dengan peringatan (FR-BACKUP-002, FR-BACKUP-006).
- Hasil backup diunduh sebagai `.mapp-backup` (header `MAPPBK01`, AES-256-GCM + Argon2id) dan checksum ditampilkan (FR-BACKUP-001, FR-BACKUP-003).
- Restore memverifikasi checksum lebih dulu, menampilkan preview isi, lalu meminta pilihan **Gabung** atau **Ganti** dengan konfirmasi (FR-BACKUP-004, FR-BACKUP-005).
- **Bersihkan cache** tidak menghapus data app (FR-SET-003).
- **Reset** meminta pengetikan kata konfirmasi dan menawarkan ekspor sebelum menghapus (FR-SET-008).

### Aksesibilitas

- Meter storage memiliki `role="meter"` dengan `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, dan label teks.
- Passphrase tidak pernah diungkapkan; toggle tampil/sembunyi memiliki label yang berubah sesuai state.
- Dialog reset memakai `role="alertdialog"` dengan fokus awal pada **Batal**.
- Setiap hasil backup/restore diumumkan lewat live region.

### Acceptance

- [ ] Backup menghasilkan file `.mapp-backup` yang hanya dapat dibuka dengan passphrase yang benar.
- [ ] Passphrase salah menampilkan `E-BACKUP-001` tanpa membocorkan detail kripto.
- [ ] Restore menampilkan preview isi sebelum apply dan menawarkan gabung atau ganti.
- [ ] Reset tidak dapat dijalankan tanpa konfirmasi eksplisit dan menawarkan ekspor.
- [ ] Tidak ada request upload ke host mana pun.

## 13. SCR-11 — Settings

### Route

`/settings`, `/settings/general`, `/settings/permissions`, `/settings/ai`, `/settings/about`, dan `/settings/dev`.

### Tujuan

Mengubah preferensi tampilan dan bahasa, mengelola permission dan BYOK, menyiapkan recovery phrase, serta membuka DevTools lokal.

### Wireframe

```text
+-------------+----------------------------------------------------+
| Sidebar     |  Settings                                          |
|             |  +----------------------------------------------+  |
|             |  | General        Tema, locale, ukuran teks     |  |
|             |  | Permissions    3 app - 5 grant               |  |
|             |  | AI             Belum dikonfigurasi           |  |
|             |  | Data           Backup, restore, storage      |  |
|             |  | About          v3.0.0                        |  |
|             |  | DevTools       Nonaktif                      |  |
|             |  +----------------------------------------------+  |
+-------------+----------------------------------------------------+
```

Contoh subhalaman general:

```text
+-------------+----------------------------------------------------+
| Settings    |  General                                           |
|             |  Tema      (o) Light  ( ) Dark  ( ) High-contrast  |
|             |  Bahasa    [ Indonesia v ]                         |
|             |  Teks      [---o--------] 16 px                    |
|             |  Gerak     [x] Kurangi animasi                     |
|             |  Identitas Local identity siap - [ Amankan data ]  |
+-------------+----------------------------------------------------+
```

### State

| State | Perilaku |
|---|---|
| Loading | Daftar grup memakai skeleton; nilai preferensi dimuat dari penyimpanan lokal. |
| Empty | Tidak berlaku; setiap subbagian memiliki minimal satu kontrol atau penjelasan. |
| Error | `E-SET-001` nilai tidak valid mengembalikan nilai sebelumnya dan menandai field; `E-SET-002` gagal menyimpan preferensi dengan retry. |
| Offline | Semua preferensi lokal berfungsi; status koneksi AI menampilkan "Tidak dapat diperiksa" tanpa dianggap error. |

### Interaksi Utama

- Tema light/dark/high-contrast berlaku langsung tanpa reload (FR-SET-001).
- Locale `id-ID`/`en-US` mengubah string dan arah teks; pilihan disimpan (FR-SET-002).
- Permissions menampilkan app dan grant dengan aksi revoke; revoke berlaku pada panggilan berikutnya (FR-SET-006).
- AI menyimpan key BYOK di vault; setelah disimpan hanya empat karakter terakhir terlihat (FR-SET-004, SEC-008).
- **Amankan data** membuka alur recovery phrase: 24 kata, konfirmasi tiga kata, frasa tidak masuk log (FR-SET-005).
- DevTools hanya mengubah preferensi lokal dan membuka SCR-11 subroute `/settings/dev` (FR-SET-010, FR-DEV-001).

### Aksesibilitas

- Setiap grup adalah section dengan heading; navigasi Settings memakai daftar tautan, bukan tab tanpa label.
- Radio dan switch memiliki label yang terhubung; perubahan langsung diumumkan.
- Field yang gagal diberi `aria-invalid` dan `aria-describedby`.
- Halaman dapat diselesaikan dengan keyboard; tidak ada kontrol yang hanya merespons hover.

### Acceptance

- [ ] Perubahan tema dan locale terlihat langsung dan bertahan setelah reload.
- [ ] BYOK tidak pernah ditampilkan penuh setelah disimpan.
- [ ] Revoke permission langsung memengaruhi panggilan bridge berikutnya.
- [ ] Recovery phrase dikonfirmasi tiga kata dan tidak muncul di log.
- [ ] DevTools tidak mengaktifkan telemetry apa pun.

## 14. SCR-12 — Permission Consent

### Route

Overlay global tanpa perubahan URL; dapat muncul di SCR-06 dan SCR-07.

### Tujuan

Meminta consent just-in-time untuk satu permission, menjelaskan alasannya, dan memastikan default aman.

### Wireframe

```text
+------------------------------------------------------------------+
|  App tetap terlihat dan berjalan di belakang                     |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |  Kasir Warung meminta akses                                |  |
|  |  Penyimpanan lokal - baca dan tulis                        |  |
|  |  Untuk menyimpan daftar produk dan transaksi.              |  |
|  |  Risiko: sedang - data tetap di perangkat ini.             |  |
|  |                                                            |  |
|  |  [ Tolak ]   [ Izinkan sekali ]   [ Selalu izinkan ]       |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

### State

| State | Perilaku |
|---|---|
| Loading | Sheet tidak dirender sebelum broker selesai memvalidasi manifest dan rate limit. |
| Empty | Tidak berlaku; setiap sheet mewakili satu permintaan konkret. |
| Error | Permission tidak dideklarasikan atau rate limit terlampaui: `E-RUN-003` tanpa dialog; Offline Cage: `E-NET-001`. |
| Offline | Consent tetap berfungsi; permission network ditolak lebih dulu karena cage aktif secara default (SEC-004). |

### Interaksi Utama

- Sheet muncul hanya untuk permission yang dideklarasikan dan belum di-grant (SEC-002, SEC-003).
- Fokus awal pada **Tolak**; `Esc` dan klik backdrop sama dengan menolak (FLOW-06).
- **Izinkan sekali** menyimpan grant sekali pakai; **Selalu izinkan** menyimpan grant persisten; **Tolak** tidak menyimpan apa pun.
- Grant `always` tidak menampilkan dialog berulang; revoke di Settings memicu consent lagi pada panggilan berikutnya.
- Setiap grant, deny, dan revoke dicatat di audit lokal (SEC-014).
- Permintaan lain selama sheet terbuka antre; tidak ada dua sheet consent sekaligus.

### Aksesibilitas

- Sheet memakai `role="alertdialog"` dengan `aria-labelledby` pada nama app dan `aria-describedby` pada alasan.
- Fokus terperangkap di dalam sheet sampai pengguna memilih; fokus kembali ke pemicu setelah ditutup.
- Nama permission dan risk tier dibacakan sebagai teks, bukan hanya ikon.
- Tombol tidak boleh memiliki label yang menipu; urutan visual dan DOM sama.

### Acceptance

- [ ] Dialog hanya muncul untuk permission yang dideklarasikan dan belum granted.
- [ ] Fokus awal pada **Tolak** dan `Esc` menolak.
- [ ] Grant **Selalu izinkan** tidak memunculkan dialog berulang.
- [ ] Offline Cage memblokir network sebelum consent.
- [ ] Setiap grant, deny, dan revoke tercatat di audit lokal.

## 15. Referensi

- [information-architecture.md](information-architecture.md)
- [interaction-patterns.md](interaction-patterns.md)
- [accessibility.md](accessibility.md)
- [design-system.md](design-system.md)
- [component-catalog.md](component-catalog.md)
- [01-app-shell.md](../03-specs/01-app-shell.md)
- [02-studio.md](../03-specs/02-studio.md)
- [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md)
- [05-packages.md](../03-specs/05-packages.md)
- [06-backup.md](../03-specs/06-backup.md)
- [07-settings.md](../03-specs/07-settings.md)
- [permissions.md](../03-specs/permissions.md)
- [FLOW-01 First Run](../04-flows/01-first-run.md)
- [FLOW-06 Permission Consent](../04-flows/06-permission-consent.md)
- [FLOW-07 Crash Recovery](../04-flows/07-crash-recovery.md)
