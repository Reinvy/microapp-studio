---
id: DESIGN-SCREENS
title: Spesifikasi Layar
status: accepted
owner: design
prd_refs: ["§3 Modul 1", "§3 Modul 2"]
---

# Spesifikasi Layar

Dokumen ini menetapkan 22 layar kanonik Host Shell dan Studio: tujuan, wireframe ASCII, komponen MADS, state wajib, interaksi, keyboard, aksesibilitas, copy key, acceptance criteria, dan traceability requirement. Wireframe ASCII adalah artefak kanonik karena dapat ditinjau di Git; tidak ada gambar bitmap, sehingga setiap perubahan layout terlihat sebagai diff teks.

## Konvensi Dokumen

### Notasi wireframe

| Notasi | Arti |
|---|---|
| `┌ ─ ┐ │ └ ┘` | Batas region layout, bukan komponen visual final. |
| `[ Teks ]` | Tombol atau kontrol yang dapat difokus. |
| `( Teks )` | Kontrol pilihan tunggal atau status read-only. |
| `[x]` / `[ ]` | Checkbox aktif / tidak aktif. |
| `▸` / `▾` | Disclosure tertutup / terbuka. |
| `▤` | Placeholder konten daftar atau grid. |
| `⋯` | Menu konteks atau aksi sekunder. |
| `▓▒░` | Skeleton loading. |
| `*` | Fokus awal saat layar dibuka. |
| `…` | Teks terpotong dengan ellipsis, nama lengkap tersedia via tooltip. |

Lebar kanonik wireframe adalah 78 kolom untuk desktop; varian compact ditandai pada baris `Compact:` di dalam blok wireframe. Wireframe tidak menyiratkan warna, bayangan, atau token; nilai visual diambil dari `02-design/design-system.md`.

### Route dan surface

| Route | Surface | Catatan |
|---|---|---|
| `/` | Host Shell | Home, folder, widget board, dan first-run memakai route yang sama dengan state turunan. |
| `/app/:id` | Host Shell | Runner micro-app; satu instance state per `app_id`. |
| `/studio/:id` | Studio | Panel Studio dipilih melalui query `panel` (`visual`, `code`, `data`, `workflow`, `ai`). |
| `/registry` | Host Shell | Peramban registry; detail app adalah state terpilih, bukan route terpisah. |
| `/settings/*` | Host Shell | Sub-route: `permissions`, `sync`, `vault`, `storage`, dan bagian umum. |
| `/dev/*` | Host Shell | DevTools lokal; tidak tersedia di build produksi tanpa flag developer. |
| `/admin/*` | Host Shell | Konsol admin server self-host; memerlukan koneksi dan sesi server. |
| Overlay global | Host Shell | Command Palette, crash recovery, dan dialog consent muncul di atas route mana pun. |

### Konvensi state

Setiap layar mendokumentasikan lima bucket state: `loading`, `empty`, `error`, `offline`, dan `permission`. Layar yang tidak memiliki kondisi bermakna untuk sebuah bucket menuliskannya eksplisit sebagai tidak berlaku, bukan mengosongkan baris. Semua state error MUST memakai kode dari `03-specs/error-codes.md` dan menyediakan satu aksi pemulihan yang aman.

### Copy key

Semua string UI berasal dari katalog locale dengan namespace `screen.<scr>.<key>`; string lintas layar memakai `common.*`, dan pesan error memakai `error.*` yang dipetakan dari kode error. Kunci pada tabel copy keys adalah contoh minimum, bukan daftar lengkap; penambahan kunci MUST mengikuti aturan `02-design/content-i18n.md`. Tidak ada string hardcoded di komponen.

### Traceability

Baris traceability setiap layar hanya merujuk FR yang didefinisikan pada `03-specs/01-host-shell.md` sampai `03-specs/08-devtools-cli-sdk.md`. Referensi SEC pada bagian izin merujuk `03-specs/permissions.md`. Layar MUST NOT menjadi sumber requirement baru; perubahan perilaku dimulai dari spec.

### Matriks layar

| SCR | Layar | Route / panel | Surface | Spec utama |
|---|---|---|---|---|
| SCR-01 | FirstRun/Identity | `/` state first-run | Host Shell | `03-specs/01-host-shell.md` |
| SCR-02 | Home | `/` | Host Shell | `03-specs/01-host-shell.md` |
| SCR-03 | Folder | `/?folder=<id>` | Host Shell | `03-specs/01-host-shell.md` |
| SCR-04 | WidgetBoard | `/?view=widgets` | Host Shell | `03-specs/01-host-shell.md` |
| SCR-05 | CommandPalette | Overlay semua route | Host Shell | `03-specs/01-host-shell.md` |
| SCR-06 | AppRunner | `/app/:id` | Host Shell | `03-specs/03-sandbox-runtime.md` |
| SCR-07 | StudioDashboard | `/studio/:id` | Studio | `03-specs/02-studio-ide.md` |
| SCR-08 | VisualBuilder | `/studio/:id?panel=visual` | Studio | `03-specs/02-studio-ide.md` |
| SCR-09 | CodeEditor | `/studio/:id?panel=code` | Studio | `03-specs/02-studio-ide.md` |
| SCR-10 | DataDesigner | `/studio/:id?panel=data` | Studio | `03-specs/04-data-automation.md` |
| SCR-11 | WorkflowEditor | `/studio/:id?panel=workflow` | Studio | `03-specs/04-data-automation.md` |
| SCR-12 | AICopilot | `/studio/:id?panel=ai` | Studio | `03-specs/02-studio-ide.md` |
| SCR-13 | RegistryBrowser | `/registry` | Host Shell | `03-specs/05-registry.md` |
| SCR-14 | AppDetailInstall | `/registry?app=<id>` | Host Shell | `03-specs/05-registry.md` |
| SCR-15 | Permissions | `/settings/permissions?app=<id>` | Host Shell | `03-specs/permissions.md` |
| SCR-16 | SyncPeers | `/settings/sync` | Host Shell | `03-specs/06-sync-backup.md` |
| SCR-17 | Vault | `/settings/vault` | Host Shell | `03-specs/01-host-shell.md` |
| SCR-18 | Settings | `/settings/general` (indeks `/settings`) | Host Shell | `03-specs/01-host-shell.md` |
| SCR-19 | StorageManager | `/settings/storage` | Host Shell | `03-specs/01-host-shell.md` |
| SCR-20 | DevTools | `/dev/tools` | Host Shell | `03-specs/08-devtools-cli-sdk.md` |
| SCR-21 | AdminConsole | `/admin` dan sub-tab | Host Shell | `03-specs/07-selfhost.md` |
| SCR-22 | CrashRecovery | Overlay global | Host Shell | `03-specs/03-sandbox-runtime.md` |

## SCR-01 — FirstRun/Identity

| Atribut | Nilai |
|---|---|
| Route | `/` dengan state `first-run` |
| Surface | Host Shell |
| Spec utama | `03-specs/01-host-shell.md` |
| Flow terkait | `04-flows/01-first-run.md` |

### Tujuan

Membuat Local Identity tanpa akun dan tanpa jaringan sebelum Home dirender, menampilkan Recovery Phrase 24 kata satu kali, mengonfirmasi tiga kata acak, lalu membuat workspace default. Layar MUST selesai tanpa satu pun request keluar dan MUST menolak melanjutkan bila material kunci tidak dapat disimpan secara aman.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│  MicroApp Studio                                          [ ? ]│
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   Identitas lokal                                              │
│   Dibuat di perangkat ini. Tanpa akun, tanpa server.           │
│                                                                │
│   (1) Kunci ──── (2) Recovery Phrase ──── (3) Workspace         │
│                                                                │
│   ┌──────────────────────────────────────────────────────┐     │
│   │  Membuat kunci Ed25519 + X25519                      │     │
│   │  ██████████████████████████░░░░░░░░  72%             │     │
│   │  Menyimpan ke WebCrypto non-extractable…             │     │
│   └──────────────────────────────────────────────────────┘     │
│                                                                │
│   Penyimpanan kunci: *( terdeteksi )                           │
│                                                                │
│   [ Lanjutkan ]   nonaktif sampai kunci siap                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

Langkah 2 menampilkan frasa dalam grup 6×4 kata dengan tombol `[ Tampilkan ]`; langkah 3 menampilkan tiga kolom isian kata ke-3, ke-11, dan ke-19 serta kolom nama workspace.

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| AppShell | MADS-LAY-01 | Kerangka layar penuh tanpa sidebar. |
| Stepper | MADS-NAV-06 | Indikator tiga langkah pembuatan identitas. |
| Card | MADS-LAY-05 | Wadah status pembuatan kunci. |
| Progress | MADS-DATA-16 | Progres pembuatan dan penyimpanan kunci. |
| Button | MADS-INP-01 | Aksi lanjut, tampilkan frasa, dan salin. |
| TextField | MADS-INP-03 | Isian tiga kata konfirmasi dan nama workspace. |
| Checkbox | MADS-INP-10 | Konfirmasi "Saya sudah menyimpan frasa". |
| Alert | MADS-FBK-01 | Peringatan frasa hanya tampil sekali. |
| MarkdownView | MADS-MED-09 | Instruksi penyimpanan frasa yang dibundel lokal. |
| Toast | MADS-FBK-02 | Konfirmasi salin dan kegagalan penyimpanan. |

### State

| State | Perilaku |
|---|---|
| loading | Stepper terkunci; progress menampilkan tahap pembuatan kunci; tidak ada tombol lanjut yang aktif. |
| empty | Kondisi awal: belum ada `local_identity`; layar menampilkan penjelasan tanpa formulir akun. |
| error | Penyimpanan aman gagal: tampilkan fallback passphrase lokal dengan penjelasan risiko dan tombol `[ Coba lagi ]`; identitas tidak dibuat setengah jadi. |
| offline | Kondisi normal dan diharapkan; badge "Offline" tidak ditampilkan sebagai peringatan karena tidak ada operasi jaringan. |
| permission | Prompt biometrik opsional untuk mengunci akses ke kunci; penolakan tidak memblokir pembuatan identitas. |

### Interaksi

- Pembuatan kunci berjalan otomatis saat layar dibuka; pengguna tidak dapat menutup layar sebelum identitas tersimpan atau memilih keluar dengan konfirmasi eksplisit.
- Frasa ditampilkan hanya setelah pengguna menekan `[ Tampilkan ]`; setelah konfirmasi berhasil, frasa dihapus dari memori UI dan tidak dapat ditampilkan ulang.
- Konfirmasi tiga kata divalidasi per field; kesalahan menandai field terkait dan tidak mengunci form.
- Nama workspace default diusulkan (`Personal`) dan dapat diubah; pembuatan workspace memakai data lokal saja.
- Tombol `[ Salin frasa ]` menyalin ke clipboard dengan peringatan bahwa clipboard dapat dibaca aplikasi lain; MAY ditonaktifkan oleh kebijakan perangkat.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Tab` / `Shift+Tab` | Berpindah antar kontrol sesuai urutan baca. |
| `Enter` | Mengaktifkan tombol utama langkah aktif. |
| `Space` | Menandai checkbox konfirmasi penyimpanan frasa. |
| `Esc` | Membuka dialog konfirmasi keluar; tidak menutup layar secara langsung. |
| `Ctrl/Cmd+C` | Menyalin frasa hanya saat fokus berada pada grup frasa dan sudah ditampilkan. |

### Aksesibilitas

- Progress pembuatan kunci diumumkan melalui live region `polite` pada awal dan akhir, bukan setiap persentase.
- Grup frasa memakai `role="group"` dengan `aria-label` jumlah kata; pembaca layar tidak diarahkan membaca seluruh frasa otomatis.
- Field konfirmasi memiliki label eksplisit ("Kata ke-3"), `autocomplete="off"`, dan `spellcheck="false"`.
- Fokus awal berada pada judul layar; setelah langkah berganti, fokus dipindahkan ke heading langkah dan diumumkan.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.firstRun.title` | Identitas lokal | Judul H1 layar. |
| `screen.firstRun.generateBody` | Kunci dibuat dan disimpan di perangkat ini. Tidak ada data yang dikirim keluar. | Menegaskan sifat offline. |
| `screen.firstRun.recoveryWarning` | Frasa ini hanya ditampilkan sekali. Simpan offline di tempat aman. | Wajib pada langkah 2. |
| `screen.firstRun.confirmError` | Kata tidak cocok. Periksa kembali frasa yang tersimpan. | Pesan field error. |
| `screen.firstRun.storageFallback` | Penyimpanan aman tidak tersedia. Gunakan passphrase lokal. | Judul state error. |

### Acceptance Criteria

- Given perangkat tanpa identitas, when layar dibuka, then `local_identity` berisi kunci Ed25519 dan X25519 tersimpan sebelum Home dirender dan tidak ada request jaringan (FR-HOST-001).
- Given material kunci, when penyimpanan non-extractable gagal, then layar menampilkan fallback passphrase dan tidak menulis private key ke storage biasa (FR-HOST-002).
- Given frasa 24 kata ditampilkan, when pengguna memasukkan tiga kata yang salah, then pembuatan Vault ditolak sampai konfirmasi benar (FR-HOST-003).
- Given frasa dikonfirmasi dan workspace dibuat, when pengguna menekan `Enter` pada langkah 3, then Home tampil dengan workspace aktif dan tanpa dialog tambahan.

### Traceability

FR-HOST-001, FR-HOST-002, FR-HOST-003, FR-HOST-004, FR-SYNC-002.

## SCR-02 — Home

| Atribut | Nilai |
|---|---|
| Route | `/` |
| Surface | Host Shell |
| Spec utama | `03-specs/01-host-shell.md` |
| Flow terkait | `04-flows/01-first-run.md`, `04-flows/11-permission-consent.md` |

### Tujuan

Menjadi launcher utama: grid micro-app terpasang, folder, dock ter-pin, pencarian omni, workspace switcher, indikator offline dan antrean, serta pintu masuk ke Registry, Studio, dan Settings. Home MUST tetap dapat dipakai penuh saat offline dan MUST memulihkan launcher state setelah cold start.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ ☰  MicroApp Studio   ( Personal ▾ )   [ Cari atau Ctrl+K    ]  │
├──────────┬─────────────────────────────────────────────────────┤
│ ▶ Home   │  ▸ Folder: Keuangan (3)        ▸ Folder: Kerja (5)  │
│   Studio │                                                     │
│   Regist │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │
│   Settin │  │ ▣ Kasir│ │ ▣ Notes│ │ ▣ Task │ │ + Baru │         │
│          │  │ v2.1.0 │ │ v1.4.2 │ │ v0.9.0 │ │        │         │
│  ▤ Dock  │  └────────┘ └────────┘ └────────┘ └────────┘         │
│  [Kasir] │                                                     │
│  [Notes] │  ▤ Widget Board                       [ Atur ]      │
│          │  ┌──────────────────┐ ┌──────────────────┐           │
│          │  │ Saldo  Rp 1,2 jt │ │ Tugas hari ini 4 │           │
│          │  └──────────────────┘ └──────────────────┘           │
├──────────┴─────────────────────────────────────────────────────┤
│ ⚠ Offline — 3 operasi menunggu            ⟳ Sync terakhir 2 mnt │
└────────────────────────────────────────────────────────────────┘
```

Compact: sidebar berubah menjadi tab bar bawah; grid menjadi dua kolom; widget board menjadi satu kolom.

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| AppShell | MADS-LAY-01 | Kerangka sidebar, konten, dan status bar. |
| Sidebar | MADS-NAV-01 | Navigasi Home, Studio, Registry, Settings. |
| Dock | MADS-NAV-08 | Micro-app ter-pin yang selalu terlihat. |
| WorkspaceSwitcher | MADS-NAV-09 | Pergantian workspace dengan isolasi data. |
| SearchField | MADS-INP-06 | Pemicu omni-search. |
| Grid | MADS-LAY-03 | Grid micro-app dan widget yang responsif. |
| AppIcon | MADS-PLT-01 | Ikon app dengan badge versi dan update. |
| WidgetFrame | MADS-PLT-02 | Bingkai widget live dengan batas query. |
| OfflineBanner | MADS-FBK-08 | Indikator offline dan jumlah operasi tertunda. |
| SyncStatus | MADS-FBK-09 | Status sync ringkas dan waktu terakhir. |
| EmptyState | MADS-DATA-18 | Kondisi workspace kosong. |
| Skeleton | MADS-DATA-17 | Placeholder saat memuat grid. |
| ContextMenu | MADS-PLT-04 | Rename, pin, pindah folder, hapus. |
| Toast | MADS-FBK-02 | Konfirmasi aksi dan undo. |

### State

| State | Perilaku |
|---|---|
| loading | Grid menampilkan skeleton tanpa layout shift; pencarian dan dock tetap dapat difokus sampai data siap. |
| empty | Empty state menjelaskan workspace kosong dengan aksi `[ Buka Registry ]` dan `[ Buat micro-app ]`, plus tautan impor `.mapp`. |
| error | Kegagalan DB worker menampilkan error surface global dengan kode error, `[ Restart ]`, dan jaminan data utuh; grid terakhir yang tersimpan tetap terlihat read-only. |
| offline | Banner offline menampilkan jumlah operasi tertunda; navigasi, peluncuran app, pencarian FTS5, dan widget tetap berfungsi. |
| permission | Kartu izin notifikasi muncul satu kali bila belum diputuskan; penolakan tidak menghalangi Home. |

### Interaksi

- Menekan ikon app membuka `/app/:id`; menekan lama atau `⋯` membuka menu konteks (pin, pindah folder, detail, hapus).
- Drag ikon ke folder memindahkan keanggotaan; drag ke dock mem-pin; urutan disimpan segera dan dipulihkan setelah restart.
- Pencarian memakai debounce 150 ms dan menampilkan hasil dari seluruh workspace aktif; `Enter` membuka hasil teratas.
- Workspace switcher menampilkan workspace terakhir dan meminta konfirmasi hanya bila ada operasi tertunda yang belum selesai.
- `[ + Baru ]` membuka pilihan: buat di Studio, impor `.mapp`, atau buka Registry.
- Hapus app menampilkan dialog dengan opsi ekspor data sebelum konfirmasi.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Ctrl/Cmd+K` | Membuka Command Palette. |
| `Arrow` | Berpindah fokus antar ikon dalam grid (roving tabindex). |
| `Enter` | Membuka app atau folder yang difokus. |
| `F2` | Mengganti nama item terpilih. |
| `Delete` | Membuka dialog hapus dengan opsi ekspor. |
| `Shift+F10` | Membuka menu konteks item terpilih. |

### Aksesibilitas

- Grid memakai `role="grid"` dengan `aria-rowcount` dan `aria-colcount`; setiap ikon memiliki nama app, versi, dan status update.
- Banner offline dan jumlah antrean diumumkan melalui live region `polite` saat berubah, tanpa mengulang pengumuman setiap mutasi.
- Fokus terlihat pada semua elemen; target sentuh minimum 44×44 px pada compact.
- Urutan tab mengikuti: sidebar → workspace switcher → pencarian → isi grid → dock → status bar.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.home.emptyTitle` | Workspace ini masih kosong | Judul empty state. |
| `screen.home.openRegistry` | Buka Registry | Aksi utama empty state. |
| `screen.home.createMicroApp` | Buat micro-app | Aksi sekunder empty state. |
| `common.offline` | Offline | Label banner global. |
| `common.pendingOperations` | {count} operasi menunggu | Pluralisasi ICU. |

### Acceptance Criteria

- Given workspace dengan tiga level folder, when pengguna memindahkan app lalu me-restart, then urutan dan keanggotaan folder identik (FR-HOST-005).
- Given 100.000 record, when pengguna mengetik dua kata pada pencarian, then hasil gabungan dari beberapa micro-app muncul di bawah 100 ms pada perangkat referensi (FR-HOST-009).
- Given cold start, when Home dirender, then workspace aktif, posisi scroll, dan filter terakhir dipulihkan (FR-HOST-024).
- Given workspace kosong, when Home tampil, then empty state menyediakan aksi Registry dan buat micro-app (FR-HOST-025).
- Given mode pesawat dan tiga job tertunda, when Home tampil, then banner offline menampilkan angka 3 tanpa menutupi konten (FR-HOST-026).

### Traceability

FR-HOST-005, FR-HOST-007, FR-HOST-009, FR-HOST-011, FR-HOST-024, FR-HOST-025, FR-HOST-026, FR-HOST-028, FR-HOST-029.

## SCR-03 — Folder

| Atribut | Nilai |
|---|---|
| Route | `/?folder=<id>` |
| Surface | Host Shell |
| Spec utama | `03-specs/01-host-shell.md` |
| Flow terkait | `04-flows/01-first-run.md` |

### Tujuan

Mengelola folder bertingkat hingga tiga level: melihat isi, membuat subfolder, mengganti nama, memindahkan micro-app, dan menghapus folder tanpa kehilangan data. Folder MUST menjadi bagian dari model launcher yang persisten, bukan filter sementara.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Home ▸ Keuangan ▸ Pajak                              [ ⋯ ]      │
├────────────────────────────────────────────────────────────────┤
│  Keuangan / Pajak                                              │
│  4 micro-app · 2 subfolder                                     │
│                                                                │
│  ▸ Subfolder: 2025 (2)     ▸ Subfolder: Arsip (0)              │
│                                                                │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                   │
│  │ ▣ PPN  │ │ ▣ SPT  │ │ ▣ Bukti│ │ + Baru │                   │
│  └────────┘ └────────┘ └────────┘ └────────┘                   │
│                                                                │
│  [ Pilih ]  [ Pindahkan ]  [ Ganti nama ]  [ Hapus folder ]    │
│                                                                │
│  ℹ Menghapus folder tidak menghapus micro-app atau datanya.     │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| Breadcrumb | MADS-NAV-03 | Jalur folder hingga level tiga. |
| Grid | MADS-LAY-03 | Isi folder dan subfolder. |
| Button | MADS-INP-01 | Aksi buat, pindah, ganti nama, hapus. |
| IconButton | MADS-INP-02 | Menu aksi tambahan per item. |
| ContextMenu | MADS-PLT-04 | Aksi cepat per micro-app. |
| Modal | MADS-LAY-08 | Form ganti nama dan pilih tujuan pindah. |
| ConfirmDialog | MADS-FBK-05 | Konfirmasi hapus folder. |
| EmptyState | MADS-DATA-18 | Folder tanpa isi. |
| Toast | MADS-FBK-02 | Konfirmasi dan undo penghapusan. |

### State

| State | Perilaku |
|---|---|
| loading | Breadcrumb tampil dari cache; isi folder memakai skeleton. |
| empty | Empty state "Folder ini kosong" dengan aksi `[ Pindahkan micro-app ]` dan `[ Buat subfolder ]`. |
| error | Folder yang dirujuk tidak ditemukan menampilkan pesan dan tautan kembali ke Home; tidak ada data yang diubah. |
| offline | Semua operasi folder berfungsi offline; tidak ada indikator khusus selain banner global. |
| permission | Tidak berlaku; operasi folder tidak memerlukan permission micro-app. |

### Interaksi

- Drag micro-app ke breadcrumb memindahkan ke folder induk; drag ke subfolder memindahkan ke level berikutnya.
- Pembuatan subfolder pada level tiga dinonaktifkan dengan penjelasan batas kedalaman.
- Menghapus folder memindahkan isinya ke Home, bukan menghapus micro-app; dialog menjelaskan hasil tersebut.
- Ganti nama memvalidasi panjang dan karakter, lalu menyimpan tanpa menutup breadcrumb.
- Menu `⋯` menyediakan pin folder, pindah folder, dan salin tautan internal.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Arrow` | Navigasi grid dan breadcrumb. |
| `Enter` | Membuka folder atau item. |
| `Backspace` | Kembali ke folder induk tanpa mengubah data. |
| `F2` | Mengganti nama item terpilih. |
| `Delete` | Menghapus folder dengan konfirmasi. |

### Aksesibilitas

- Breadcrumb memakai `nav` dengan `aria-label="Breadcrumb"` dan menandai item terakhir sebagai `aria-current="page"`.
- Batas kedalaman folder dijelaskan melalui teks bantuan yang terhubung ke tombol dengan `aria-describedby`.
- Perubahan isi folder diumumkan melalui live region setelah operasi pindah atau hapus.
- Fokus kembali ke item asal setelah dialog ditutup atau dibatalkan.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.folder.emptyTitle` | Folder ini kosong | Judul empty state. |
| `screen.folder.deleteTitle` | Hapus folder? | Judul dialog konfirmasi. |
| `screen.folder.deleteBody` | Micro-app di dalamnya dipindahkan ke Home, bukan dihapus. | Menjelaskan konsekuensi. |
| `screen.folder.depthLimit` | Folder tidak dapat dibuat lebih dari tiga level. | Pesan batas. |

### Acceptance Criteria

- Given folder level tiga, when pengguna menyeret app ke dalamnya dan me-restart, then keanggotaan folder tetap sama (FR-HOST-005).
- Given folder berisi tiga app, when pengguna menghapus folder dan mengonfirmasi, then app muncul di Home dan datanya tidak berubah (FR-HOST-025).
- Given folder kosong, when layar dibuka, then empty state menampilkan aksi pindah app dan buat subfolder.

### Traceability

FR-HOST-005, FR-HOST-024, FR-HOST-025, FR-HOST-028, FR-HOST-029.

## SCR-04 — WidgetBoard

| Atribut | Nilai |
|---|---|
| Route | `/?view=widgets` |
| Surface | Host Shell |
| Spec utama | `03-specs/01-host-shell.md` |
| Flow terkait | `04-flows/13-phase0-migration.md` |

### Tujuan

Menampilkan live widget yang membaca database lokal micro-app secara offline, dengan batas satu query per widget per lima detik, penanda kuota, dan error boundary per widget. Widget adalah permukaan baca; aksi tulis tetap dilakukan di dalam micro-app.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Widget Board                              [ Tambah widget ]    │
├────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌───────────────────────────────┐  │
│ │ Saldo Dompet      ⋯     │ │ Tugas Hari Ini           ⋯    │  │
│ │ Rp 1.240.000            │ │ ● 4 terbuka · 1 lewat         │  │
│ │ ▁▂▃▅▄▆▇ 7 hari          │ │ [x] Bayar listrik             │  │
│ │ Diperbarui 12:04        │ │ [ ] Kirim laporan             │  │
│ └─────────────────────────┘ └───────────────────────────────┘  │
│ ┌─────────────────────────┐ ┌───────────────────────────────┐  │
│ │ Kebiasaan         ⋯     │ │ ▓▓ Skeleton widget            │  │
│ │ ████████░░ 80%          │ │ memuat database…              │  │
│ └─────────────────────────┘ └───────────────────────────────┘  │
│                                                                │
│  + Tambah widget dari micro-app terpasang                      │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| Grid | MADS-LAY-03 | Tata letak widget dengan ukuran 1×1, 2×1, dan 2×2. |
| WidgetFrame | MADS-PLT-02 | Bingkai widget, menu, dan status pembaruan. |
| StatCard | MADS-DATA-11 | Angka utama dan tren. |
| LineChart | MADS-DATA-07 | Tren tujuh hari dengan data lokal. |
| Progress | MADS-DATA-16 | Progres kebiasaan dan kuota. |
| ErrorBoundary | MADS-FBK-07 | Kegagalan widget terisolasi. |
| Skeleton | MADS-DATA-17 | Placeholder saat query berjalan. |
| EmptyState | MADS-DATA-18 | Belum ada widget. |
| PermissionBadge | MADS-PLT-08 | Widget membutuhkan permission yang belum diberikan. |
| Toolbar | MADS-LAY-10 | Aksi tambah dan atur widget. |

### State

| State | Perilaku |
|---|---|
| loading | Setiap widget menampilkan skeleton independen; widget lain yang sudah siap tetap tampil. |
| empty | Empty state menjelaskan widget board kosong dengan aksi `[ Tambah widget ]` dan tautan ke micro-app terpasang. |
| error | Widget yang gagal menampilkan pesan ringkas dan `[ Coba lagi ]`; kegagalan satu widget MUST NOT menghentikan widget lain. |
| offline | Nilai tetap tampil dari database lokal; label "Diperbarui" menunjukkan waktu data, bukan waktu jaringan. |
| permission | Widget yang memerlukan permission menampilkan badge dan aksi `[ Tinjau izin ]` menuju layar Permissions; data tidak dimuat sebelum grant. |

### Interaksi

- `[ Tambah widget ]` membuka pemilih widget yang dikelompokkan per micro-app, dengan pratinjau dan deskripsi query.
- Mengubah ukuran widget dilakukan melalui menu `⋯` → `[ Ukuran ]`, bukan drag bebas, agar grid tetap rapi.
- Refresh manual menghormati batas satu query per lima detik; tombol menampilkan sisa waktu tunggu.
- Menghapus widget hanya menghapus tampilan, bukan data micro-app.
- Widget dengan error menyediakan tautan langsung ke log widget di DevTools.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Arrow` | Berpindah antar widget. |
| `Enter` | Membuka aksi utama widget. |
| `Shift+F10` | Menu widget (ukuran, sembunyikan, log). |
| `Ctrl/Cmd+R` | Refresh manual bila batas waktu sudah lewat. |

### Aksesibilitas

- Setiap widget adalah `article` dengan `aria-labelledby` judul widget; nilai penting tidak hanya disampaikan lewat warna.
- Grafik menyediakan ringkasan teks (nilai terakhir, arah tren) yang dapat dibaca screen reader.
- Status "Diperbarui" memakai `time` dengan format lokal; perubahan nilai tidak diumumkan terus-menerus.
- Target sentuh tombol widget minimum 44×44 px pada compact.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.widgets.emptyTitle` | Belum ada widget | Judul empty state. |
| `screen.widgets.addWidget` | Tambah widget | Aksi utama. |
| `screen.widgets.refreshCooldown` | Tunggu {seconds} detik sebelum memperbarui lagi. | Pesan batas query. |
| `screen.widgets.permissionRequired` | Widget ini memerlukan izin {permission}. | Badge permission. |
| `screen.widgets.widgetError` | Widget tidak dapat dimuat. | Judul error widget. |

### Acceptance Criteria

- Given widget saldo dan record berubah, when widget di-refresh, then nilai terbaru tampil tanpa jaringan dan query tercatat tidak lebih dari 12 per menit (FR-HOST-006).
- Given satu widget gagal, when error terjadi, then widget lain tetap menampilkan data dan error boundary hanya mencakup widget tersebut.
- Given widget membutuhkan permission yang belum diberikan, when board dibuka, then badge izin tampil dan data tidak dimuat (FR-HOST-025).

### Traceability

FR-HOST-006, FR-HOST-009, FR-HOST-025, FR-HOST-026, FR-HOST-029.

## SCR-05 — CommandPalette

| Atribut | Nilai |
|---|---|
| Route | Overlay di semua route |
| Surface | Host Shell |
| Spec utama | `03-specs/01-host-shell.md` |
| Flow terkait | `04-flows/01-first-run.md` |

### Tujuan

Menyediakan akses keyboard-first ke navigasi, pencarian, pembuatan micro-app, dan pengaturan dalam satu palette yang terbuka di bawah 100 ms. Palette MUST mengembalikan fokus ke elemen sebelumnya saat ditutup dan MUST tetap berfungsi offline untuk aksi lokal.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🔍 kasir                                            Esc  │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ AKSI                                                     │  │
│  │ * Buka micro-app Kasir                          ⌘↵      │  │
│  │   Buat micro-app baru                           ⌘N      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ MICRO-APP                                                │  │
│  │   Kasir Harian            Personal · v2.1.0             │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ RECORD                                                   │  │
│  │   Transaksi #1042         Kasir · 12 Nov 2026           │  │
│  │   … 8 hasil lainnya                                      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ ↑↓ pilih · ↵ buka · ⇥ kelompok · ^K tutup               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| CommandPalette | MADS-NAV-04 | Wadah overlay dan input pencarian. |
| SearchField | MADS-INP-06 | Input query dengan fokus otomatis. |
| VirtualList | MADS-DATA-02 | Daftar hasil tervirtualisasi. |
| Badge | MADS-DATA-12 | Label kelompok hasil (aksi, app, record). |
| Tag | MADS-DATA-13 | Workspace dan versi pada hasil. |
| Tooltip | MADS-DATA-15 | Pratinjau shortcut. |
| EmptyState | MADS-DATA-18 | Tidak ada hasil. |
| Skeleton | MADS-DATA-17 | Indeks pencarian sedang dimuat. |

### State

| State | Perilaku |
|---|---|
| loading | Query kosong menampilkan aksi cepat dan riwayat; saat indeks dimuat, daftar memakai skeleton dan aksi navigasi tetap dapat dijalankan. |
| empty | Query kosong menampilkan "Aksi cepat" dan item terakhir; bukan layar kosong. |
| error | Pencarian gagal menampilkan pesan singkat dan aksi lokal tetap tersedia; kode error ditampilkan pada baris bantuan. |
| offline | Pencarian FTS5 lokal dan semua aksi lokal berfungsi; aksi yang memerlukan server ditandai tidak tersedia dengan alasan. |
| permission | Tidak berlaku; palette hanya menampilkan aksi yang boleh dijalankan peran pengguna saat ini. |

### Interaksi

- `Ctrl/Cmd+K` membuka palette; menekan lagi menutupnya.
- Query di-debounce 120 ms; hasil dikelompokkan Aksi, Micro-app, Record, Pengaturan, dan dibatasi 50 item per kelompok.
- `Tab`/`Shift+Tab` berpindah kelompok; `Arrow` berpindah item; `Enter` menjalankan item terpilih.
- Item yang tidak tersedia tetap terlihat dengan alasan (mis. "Perlu koneksi server") dan tidak dapat dijalankan.
- Menutup palette mengembalikan fokus ke elemen yang aktif sebelum palette dibuka.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Ctrl/Cmd+K` | Buka atau tutup palette. |
| `Esc` | Tutup palette dan pulihkan fokus. |
| `ArrowUp` / `ArrowDown` | Pindah item aktif. |
| `Tab` / `Shift+Tab` | Pindah kelompok hasil. |
| `Enter` | Jalankan item aktif. |
| `Home` / `End` | Item pertama atau terakhir. |

### Aksesibilitas

- Palette memakai `role="dialog"` dengan `aria-modal="true"`, `aria-label`, dan fokus terperangkap sampai ditutup.
- Input memakai `role="combobox"` dengan `aria-expanded`, `aria-controls`, dan `aria-activedescendant` yang menunjuk item aktif.
- Jumlah hasil diumumkan melalui live region `polite` setelah query berhenti.
- Ikon kelompok memiliki teks tersembunyi; tidak ada informasi yang hanya bergantung pada ikon.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.palette.placeholder` | Cari app, record, atau aksi… | Placeholder input. |
| `screen.palette.groupActions` | Aksi | Label kelompok. |
| `screen.palette.noResults` | Tidak ada hasil untuk "{query}". | Empty result. |
| `screen.palette.unavailableOffline` | Perlu koneksi server | Alasan item nonaktif. |
| `screen.palette.resultCount` | {count} hasil | Live region. |

### Acceptance Criteria

- Given palette tertutup, when pengguna menekan `Ctrl/Cmd+K`, then palette terbuka di bawah 100 ms dan fokus berada pada input (FR-HOST-011).
- Given palette terbuka, when pengguna menekan `Esc`, then palette menutup dan fokus kembali ke elemen sebelumnya (FR-HOST-011).
- Given query dua kata, when hasil tersedia, then item dapat dijalankan penuh dengan keyboard tanpa mouse (FR-HOST-028).
- Given mode pesawat, when palette dibuka, then pencarian lokal menghasilkan record dan aksi server ditandai tidak tersedia.

### Traceability

FR-HOST-009, FR-HOST-011, FR-HOST-028, FR-HOST-029.

## SCR-06 — AppRunner

| Atribut | Nilai |
|---|---|
| Route | `/app/:id` |
| Surface | Host Shell |
| Spec utama | `03-specs/03-sandbox-runtime.md` |
| Flow terkait | `04-flows/11-permission-consent.md`, `04-flows/12-crash-recovery.md` |

### Tujuan

Menjalankan satu micro-app terpasang di dalam sandbox dengan chrome Host yang konsisten: judul, menu app, status sync, badge Offline Cage, indikator memori, dan error boundary. Runner MUST mempertahankan state saat berpindah app dan MUST mengisolasi crash pada satu app.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ ‹ Kasir Harian        ⟳ Sync · 2 mnt   ( Cage: mati )    [ ⋯ ] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌────────────────────────────────────────────────────────┐   │
│   │                                                        │   │
│   │              KONTEN MICRO-APP (iframe)                 │   │
│   │              dirender via MUIP v1                      │   │
│   │                                                        │   │
│   │   [ Transaksi Baru ]   [ Riwayat ]                     │   │
│   │                                                        │   │
│   └────────────────────────────────────────────────────────┘   │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  RAM 96/128 MB ████████░░   ·   Sandbox aktif   ·   Offline     │
└────────────────────────────────────────────────────────────────┘
```

Error boundary menggantikan area konten:

```text
┌────────────────────────────────────────────────────────────────┐
│  Micro-app berhenti                                            │
│  Kode: dari katalog error                                      │
│  Isolate dihentikan setelah freeze terdeteksi. Data aman.       │
│  [ Restart ]  [ Lihat log ]  [ Rollback ]  [ Ekspor data ]      │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| WindowChrome | MADS-PLT-03 | Judul app, tombol kembali, dan menu. |
| Toolbar | MADS-LAY-10 | Status sync, cage, dan aksi. |
| SyncStatus | MADS-FBK-09 | Peer dan antrean ringkas. |
| PermissionBadge | MADS-PLT-08 | Indikator izin aktif dan Offline Cage. |
| ErrorBoundary | MADS-FBK-07 | Fallback crash dengan aksi pemulihan. |
| PermissionDialog | MADS-FBK-06 | Consent izin saat runtime. |
| IntentPicker | MADS-PLT-07 | Pemilihan tujuan pengiriman intent. |
| OfflineBanner | MADS-FBK-08 | Indikator offline dan antrean. |
| LoadingOverlay | MADS-FBK-10 | Verifikasi bundle dan inisialisasi isolate. |
| SplitPane | MADS-LAY-04 | Mode dua app berdampingan di desktop. |
| Menu | MADS-NAV-07 | Menu app: muat ulang, devtools, tutup. |

### State

| State | Perilaku |
|---|---|
| loading | Overlay menampilkan tahap verifikasi hash, inisialisasi isolate, dan `onMount`; tombol kembali tetap aktif. |
| empty | App tanpa route awal menampilkan pesan dari app dan tombol `[ Muat ulang ]`; bukan error Host. |
| error | Error boundary menampilkan kode, ringkasan aman, restart, log, rollback, dan ekspor data; Host dan app lain tetap berjalan. |
| offline | Konten tetap berjalan; banner menampilkan antrean; panggilan jaringan yang diblokir dicatat ke audit. |
| permission | Dialog consent muncul di atas konten dengan nama app, permission, risk tier, dan alasan; penolakan tidak menutup app. |

### Interaksi

- `[ ⋯ ]` membuka menu: muat ulang, DevTools, Offline Cage, ukuran jendela, dan tutup.
- Berpindah ke app lain menyimpan state (route, form, scroll) dan mengembalikannya saat app dibuka lagi.
- Aktivasi Offline Cage langsung memblokir jaringan dan menampilkan badge permanen sampai dimatikan.
- Penghentian isolate karena kuota memori menampilkan indikator dan tombol restart; data persisten tidak berubah.
- Intent keluar memakai dialog consent yang menampilkan pengirim, tujuan, dan tipe payload.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Esc` | Menutup dialog atau overlay; tidak menutup app. |
| `Ctrl/Cmd+W` | Menutup app dan kembali ke Home. |
| `Ctrl/Cmd+R` | Memuat ulang app setelah konfirmasi. |
| `Alt+Left` | Kembali ke Home. |
| `Ctrl/Cmd+Shift+D` | Membuka DevTools untuk app aktif. |

### Aksesibilitas

- Judul app menjadi heading level 1 layar dan diumumkan saat berpindah app.
- Status sandbox, memori, dan offline memakai live region `polite`; peringatan memori 80% diumumkan sekali per siklus.
- Error boundary memindahkan fokus ke judul error dan menyediakan `role="alert"`.
- Dialog consent menangkap fokus, memiliki `aria-modal`, dan mengembalikan fokus ke pemicu setelah ditutup.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.runner.loading` | Menyiapkan micro-app… | Overlay loading. |
| `screen.runner.crashTitle` | Micro-app berhenti | Judul error boundary. |
| `screen.runner.restart` | Mulai ulang | Aksi utama pemulihan. |
| `screen.runner.memoryWarning` | Pemakaian memori mencapai 80% dari kuota. | Peringatan satu kali. |
| `screen.runner.offlineCageOn` | Offline Cage aktif — jaringan diblokir. | Badge permanen. |

### Acceptance Criteria

- Given app A dan B terbuka, when pengguna berpindah A→B→A, then posisi scroll dan isi form yang belum disimpan pulih dan waktu switch di bawah 50 ms (FR-HOST-012).
- Given loop tak terbatas, when watchdog mendeteksi freeze, then isolate dihentikan dalam 5 detik dan error boundary tampil tanpa membekukan UI (FR-SBX-016).
- Given isolate mati, when pengguna memilih `[ Ekspor data ]`, then ekspor database berhasil tanpa menjalankan app (FR-SBX-020).
- Given app meminta kamera di luar manifest, when panggilan terjadi, then permintaan ditolak tanpa dialog (FR-SBX-009).
- Given Offline Cage aktif, when app memanggil domain allowlist, then koneksi diblokir dan status terlihat permanen (FR-SBX-012).

### Traceability

FR-HOST-012, FR-HOST-013, FR-HOST-014, FR-HOST-026, FR-HOST-027, FR-SBX-012, FR-SBX-016, FR-SBX-017, FR-SBX-018, FR-SBX-019, FR-SBX-020, FR-SBX-021, FR-SBX-022, FR-SBX-023, FR-SBX-024, FR-SBX-025.

## SCR-07 — StudioDashboard

| Atribut | Nilai |
|---|---|
| Route | `/studio/:id` tanpa query panel |
| Surface | Studio |
| Spec utama | `03-specs/02-studio-ide.md` |
| Flow terkait | `04-flows/04-visual-code-sync.md` |

### Tujuan

Menjadi pintu masuk Studio: daftar project draft lokal, pembuatan project baru, impor `.mapp`/repo Git sebagai draft, status validasi, dan shortcut ke panel visual, kode, data, workflow, dan AI. Semua operasi MUST berjalan tanpa server dan tanpa akun.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Studio   Project: Kasir Harian           [ Preview ] [ Pack ]   │
├──────────┬─────────────────────────────────────────────────────┤
│ ▸ Ringkas│  Draft lokal · tidak ada perubahan belum disimpan   │
│   Visual │                                                     │
│   Kode   │  ┌───────────────────────────────────────────────┐  │
│   Data   │  │ Project terakhir                              │  │
│   Workflow│ │ Kasir Harian       v0.4.0   3 file berubah    │  │
│   AI     │  │ [ Lanjutkan ]  [ Ekspor .mapp ]               │  │
│          │  └───────────────────────────────────────────────┘  │
│          │                                                     │
│          │  Semua project                                    │
│          │  ┌───────────────────────────────────────────────┐  │
│          │  │ Nama        Panel   Diubah     Validasi       │  │
│          │  │ Kasir       visual  2 mnt      ✓ lulus        │  │
│          │  │ Inventaris  kode    1 jam      ⚠ 2 warning    │  │
│          │  └───────────────────────────────────────────────┘  │
│          │  [ + Project baru ]  [ Impor .mapp ]  [ Impor Git ] │
└──────────┴─────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| Sidebar | MADS-NAV-01 | Navigasi panel Studio. |
| Breadcrumb | MADS-NAV-03 | Jalur project dan panel aktif. |
| Card | MADS-LAY-05 | Ringkasan project terakhir. |
| DataTable | MADS-DATA-01 | Daftar project dengan sortir. |
| Button | MADS-INP-01 | Buat, impor, lanjutkan, pack. |
| Menu | MADS-NAV-07 | Aksi project sekunder. |
| ImportWizard | MADS-DOM-17 | Impor `.mapp` atau repo sebagai draft. |
| Badge | MADS-DATA-12 | Status validasi dan perubahan. |
| EmptyState | MADS-DATA-18 | Belum ada project. |
| Skeleton | MADS-DATA-17 | Memuat daftar project. |
| Toast | MADS-FBK-02 | Hasil impor dan pack. |
| Alert | MADS-FBK-01 | Peringatan linter sebelum pack. |

### State

| State | Perilaku |
|---|---|
| loading | Tabel project memakai skeleton; tombol buat dan impor aktif setelah registry project lokal siap. |
| empty | Empty state menjelaskan belum ada project dengan aksi `[ Project baru ]`, `[ Impor .mapp ]`, dan `[ Impor Git ]`. |
| error | Project gagal diparse ditandai pada baris dengan alasan dan aksi `[ Buka sebagai teks ]`; project lain tetap dapat dibuka. |
| offline | Semua operasi lokal berfungsi; impor Git dan push ditandai memerlukan koneksi. |
| permission | Impor dan ekspor berkas memakai `filesystem.picker`; dialog sistem muncul saat memilih berkas. |

### Interaksi

- `[ Preview ]` membuka pratinjau di sandbox tanpa memasang app ke Home.
- `[ Pack ]` menjalankan validasi manifest dan security linter lebih dulu; kegagalan menampilkan daftar temuan dan memblokir pack.
- Impor `.mapp` membuka project draft; tidak ada instalasi otomatis ke Home.
- Baris project memakai menu `⋯` untuk ganti nama, duplikat, arsipkan, dan hapus dengan konfirmasi.
- Status validasi dihitung ulang saat project dibuka dan setelah perubahan tersimpan.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Ctrl/Cmd+N` | Project baru. |
| `Ctrl/Cmd+O` | Impor `.mapp`. |
| `Arrow` | Navigasi tabel project. |
| `Enter` | Buka project pada panel terakhir. |
| `Ctrl/Cmd+Shift+P` | Pack dengan validasi. |

### Aksesibilitas

- Tabel project memakai `role="grid"` dengan header yang dapat difokus dan `aria-sort`.
- Status validasi memiliki teks, bukan hanya ikon; peringatan dihubungkan ke baris dengan `aria-describedby`.
- Panel sidebar menandai item aktif dengan `aria-current="page"`.
- Toast hasil pack diumumkan melalui live region dan tidak menutupi tombol utama.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.studio.emptyTitle` | Belum ada project | Judul empty state. |
| `screen.studio.newProject` | Project baru | Aksi utama. |
| `screen.studio.importMapp` | Impor .mapp | Aksi impor. |
| `screen.studio.validationFailed` | Pack diblokir: {count} temuan linter. | Pesan sebelum pack. |
| `screen.studio.draftNote` | Draft lokal — belum dipublikasikan | Label status. |

### Acceptance Criteria

- Given jaringan dimatikan, when pengguna membuat, mengedit, menyimpan, dan membuka kembali project, then seluruh alur berhasil tanpa server (FR-STU-001).
- Given project dengan `new Function`, when pengguna menekan `[ Pack ]`, then pack diblokir dan temuan linter ditampilkan (FR-STU-020).
- Given berkas `.mapp` valid, when diimpor, then project draft terbuka dan tidak ada app yang terpasang otomatis di Home (FR-STU-028).
- Given project valid, when pack selesai, then `.mapp` bertanda tangan lolos verifikasi signature sebelum instalasi lokal (FR-STU-027).

### Traceability

FR-STU-001, FR-STU-020, FR-STU-027, FR-STU-028, FR-STU-030.

## SCR-08 — VisualBuilder

| Atribut | Nilai |
|---|---|
| Route | `/studio/:id?panel=visual` |
| Surface | Studio |
| Spec utama | `03-specs/02-studio-ide.md` |
| Flow terkait | `04-flows/04-visual-code-sync.md` |

### Tujuan

Menyediakan canvas visual tiga panel: component palette, canvas Flexbox/Grid dengan breakpoint, dan properties panel berbasis skema. Setiap perubahan visual MUST menghasilkan patch AST dan source code yang bersih, serta tercatat dalam satu riwayat undo bersama editor kode.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Kasir › Visual   [ Mobile ][ Tablet ][*Desktop][ Widget ]  ↩ ↪  │
├──────────────┬───────────────────────────────┬─────────────────┤
│ Cari komponen│  Canvas 1440×900              │ Properti        │
│ ▾ Layout     │  ┌─────────────────────────┐  │ Button          │
│   Stack      │  │ Header                  │  │ Label  [ Bayar ]│
│   Grid       │  ├─────────────────────────┤  │ Varian ( Primer )│
│ ▾ Data       │  │ *[ Total  Rp 12.000 ]   │  │ Ukuran ( M )    │
│   DataTable  │  │                         │  │ Padding  ▸ 16   │
│   StatCard   │  │ [ Bayar ]  [ Batal ]    │  │ Warisan: desktop│
│ ▾ AI         │  └─────────────────────────┘  │ [ Reset field ] │
│   PromptInput│                               │                 │
│              │  Drop komponen di sini        │                 │
│ [ 120 total ]│                               │                 │
├──────────────┴───────────────────────────────┴─────────────────┤
│ AST: Screen › Stack › Button#bayar      Undo 24 langkah        │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| SplitPane | MADS-LAY-04 | Tiga panel yang dapat di-resize. |
| TabBar | MADS-NAV-02 | Pemilih breakpoint. |
| SearchField | MADS-INP-06 | Pencarian komponen palette. |
| VirtualList | MADS-DATA-02 | Daftar 120 komponen. |
| TreeView | MADS-DATA-03 | Struktur node canvas dan AST inspector. |
| Grid | MADS-LAY-03 | Kanvas dan snap grid. |
| Stack | MADS-LAY-02 | Wadah layout Flexbox. |
| ContextMenu | MADS-PLT-04 | Duplikat, bungkus, hapus node. |
| Select | MADS-INP-07 | Enum props dan alignment. |
| NumberField | MADS-INP-05 | Spacing, ukuran, radius. |
| ColorPicker | MADS-INP-17 | Token warna yang diizinkan. |
| Switch | MADS-INP-12 | Boolean props. |
| FieldError | MADS-FBK-04 | Kesalahan validasi props. |
| Tooltip | MADS-DATA-15 | Nama komponen dan shortcut. |
| EmptyState | MADS-DATA-18 | Canvas kosong. |

### State

| State | Perilaku |
|---|---|
| loading | Panel menampilkan skeleton; canvas menampilkan kerangka halaman kosong sampai project siap. |
| empty | Canvas kosong menampilkan area drop dengan hint "Seret komponen atau tekan A". |
| error | Props tidak valid menampilkan FieldError dan mempertahankan nilai sebelumnya; error parse kode menampilkan banner dan canvas tetap pada versi valid terakhir. |
| offline | Seluruh editing berfungsi; palette menandai komponen yang memerlukan modul tambahan tidak tersedia. |
| permission | Tidak berlaku; canvas tidak mengakses resource perangkat. |

### Interaksi

- Drag dari palette ke canvas menyisipkan node pada posisi drop; drop di luar area valid dibatalkan dengan animasi kembali.
- Reorder dan nest dilakukan dengan drag atau `Alt+Arrow`; struktur tersimpan sebagai model layout kanonik, bukan CSS arbitrer.
- Breakpoint mengubah override properti; properti yang diwarisi menampilkan indikator dan aksi `[ Reset field ]` hanya pada breakpoint aktif.
- Palette menolak komponen di luar katalog 120 dengan pesan validasi.
- Setiap perubahan visual menghasilkan patch AST di bawah 100 ms untuk 200 node dan masuk ke riwayat undo yang sama dengan edit kode.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` | Undo / redo gabungan visual dan kode. |
| `Alt+Arrow` | Memindahkan node terpilih di dalam parent. |
| `Ctrl/Cmd+D` | Menduplikasi node terpilih. |
| `Delete` | Menghapus node dengan konfirmasi bila memiliki children. |
| `Ctrl/Cmd+1..4` | Beralih breakpoint mobile, tablet, desktop, widget. |
| `Tab` | Berpindah panel palette → canvas → properties. |

### Aksesibilitas

- Canvas menyediakan representasi pohon (`TreeView`) yang setara agar seluruh struktur dapat diedit tanpa drag.
- Node terpilih diumumkan dengan tipe, id, dan induknya melalui live region.
- Setiap field properti memiliki label, unit, dan pesan error yang terhubung via `aria-describedby`.
- Drag and drop memiliki alternatif keyboard penuh; tidak ada aksi yang hanya tersedia via pointer.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.visual.emptyCanvas` | Seret komponen ke sini untuk memulai. | Hint canvas kosong. |
| `screen.visual.searchComponent` | Cari 120 komponen MADS… | Placeholder palette. |
| `screen.visual.inherited` | Diwarisi dari {breakpoint} | Indikator properti. |
| `screen.visual.resetField` | Reset field | Aksi override. |
| `screen.visual.unknownComponent` | Komponen tidak ada di katalog MADS. | Pesan validasi. |

### Acceptance Criteria

- Given tiga container bersarang, when project disimpan dan dimuat ulang, then model layout kanonik menghasilkan render identik (FR-STU-002).
- Given container Flex dengan children, when dikonversi ke Grid, then seluruh children dan urutannya dipertahankan (FR-STU-003).
- Given nilai enum tidak valid pada properties panel, when disimpan, then field menolak nilai dan field lain tidak berubah (FR-STU-006).
- Given 200 node, when pengguna menambah satu node, then source berubah dengan diff minimal di bawah 100 ms (FR-STU-011).
- Given edit visual lalu edit kode, when undo dua kali, then kedua perubahan dikembalikan dalam urutan benar (FR-STU-014).

### Traceability

FR-STU-002, FR-STU-003, FR-STU-004, FR-STU-005, FR-STU-006, FR-STU-007, FR-STU-011, FR-STU-012, FR-STU-013, FR-STU-014, FR-STU-030.

## SCR-09 — CodeEditor

| Atribut | Nilai |
|---|---|
| Route | `/studio/:id?panel=code` |
| Surface | Studio |
| Spec utama | `03-specs/02-studio-ide.md` |
| Flow terkait | `04-flows/04-visual-code-sync.md`, `04-flows/05-lan-hot-reload.md` |

### Tujuan

Menyediakan editor kode offline berbasis Monaco dengan diagnostik TypeScript strict, lint dan format on save, sinkronisasi dua arah ke canvas, panel masalah, integrasi Git, dan QR LAN hot reload. Editor MUST dibundel lokal tanpa request CDN.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Kasir › Kode   src/screens/Checkout.tsx ×   [ QR ]  [ Git ]     │
├──────────────┬─────────────────────────────────────────────────┤
│ ▾ src        │  1  export function Checkout() {                │
│   ▾ screens  │  2    const total = useTotal();                 │
│     Checkout │  3    return (                                  │
│   ▸ db       │  4      <Stack direction="column">              │
│   ▸ assets   │  5        <Button id="bayar" label="Bayar" />   │
│              │  6      </Stack>                                │
│              │  7    );                                        │
│              │  8  }                                           │
│              ├─────────────────────────────────────────────────┤
│              │ Masalah (2)   ⚠ any implisit · baris 12         │
│              │               ⚠ props tidak sesuai skema       │
├──────────────┴─────────────────────────────────────────────────┤
│ ✓ Tersimpan · Format on save · TS strict · 42 ms              │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| FileTree | MADS-DOM-13 | Navigasi berkas project. |
| CodeEditor | MADS-DOM-04 | Editor Monaco dengan diagnostik. |
| DiffViewer | MADS-DOM-05 | Diff perubahan sebelum commit. |
| Terminal | MADS-DOM-06 | Output lint, format, dan Git. |
| LogViewer | MADS-DOM-07 | Log diagnostik dan hot reload. |
| TabBar | MADS-NAV-02 | Tab berkas terbuka. |
| Toolbar | MADS-LAY-10 | Simpan, format, Git, QR. |
| Menu | MADS-NAV-07 | Aksi Git dan sesi kolaborasi. |
| Modal | MADS-LAY-08 | QR LAN dan konfirmasi Git. |
| Banner | MADS-FBK-03 | Error parse atau konflik sinkronisasi. |

### State

| State | Perilaku |
|---|---|
| loading | Editor menampilkan placeholder dan status "Memuat bahasa TypeScript"; file tree tetap dapat dinavigasi. |
| empty | Project tanpa berkas menampilkan empty state dengan aksi `[ Buat berkas ]` dan `[ Impor dari template ]`. |
| error | Kode tidak valid menampilkan marker gutter, panel masalah, dan banner; canvas dan source tersimpan tetap pada versi valid terakhir. |
| offline | Editor, diagnostik, lint, format, dan Git lokal berfungsi; push/pull ditandai memerlukan koneksi. |
| permission | Kredensial Git berasal dari Vault; membuka Vault memerlukan biometrik/PIN dan grant per item. |

### Interaksi

- Menyimpan menjalankan lint dan format; hasil format deterministik dan tidak mengubah isi jika tidak ada perubahan.
- Perubahan kode yang valid memperbarui canvas tanpa menghapus formatting; error parse tidak mengubah canvas.
- Klik node di canvas menyorot baris; klik baris menyorot node, dengan posisi scroll dipertahankan.
- `[ QR ]` menampilkan QR berbatas waktu 120 detik untuk hot reload LAN; sesi berakhir otomatis saat waktu habis.
- Panel Git menampilkan diff, branch, commit, push, dan pull; kredensial tidak pernah ditulis ke config project.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Ctrl/Cmd+S` | Simpan, lint, dan format. |
| `Shift+Alt+F` | Format dokumen. |
| `Ctrl/Cmd+Shift+F` | Cari di seluruh project. |
| `Ctrl/Cmd+P` | Pindah berkas cepat. |
| `F8` | Masalah berikutnya. |
| `Ctrl/Cmd+Shift+G` | Buka panel Git. |
| `Ctrl/Cmd+B` | Toggle file tree. |

### Aksesibilitas

- Editor memiliki `aria-label` per berkas dan mendukung mode pembaca untuk panel masalah.
- Panel masalah berupa daftar dengan `role="list"`; setiap item memuat berkas, baris, tingkat, dan pesan.
- Perubahan status simpan dan hasil lint diumumkan melalui live region tanpa mengganggu pengetikan.
- Semua aksi Git tersedia melalui menu keyboard; dialog konfirmasi mengembalikan fokus.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.code.saved` | Tersimpan · {time} | Status simpan. |
| `screen.code.problems` | Masalah ({count}) | Judul panel. |
| `screen.code.parseError` | Kode tidak valid. Canvas tetap pada versi terakhir yang valid. | Banner error. |
| `screen.code.qrTitle` | Hot reload LAN | Judul modal QR. |
| `screen.code.gitOffline` | Push dan pull memerlukan koneksi. | Alasan nonaktif. |

### Acceptance Criteria

- Given mode pesawat, when editor dibuka, then Monaco siap di bawah 1 detik dan fitur dasar berfungsi tanpa request CDN (FR-STU-008).
- Given kode dengan tipe salah, when disimpan, then diagnostik muncul pada gutter dan panel masalah (FR-STU-009).
- Given dua kali format, when dijalankan berturut-turut, then output identik (FR-STU-010).
- Given sintaks rusak, when pengguna mengetik, then error tampil dan canvas tetap pada versi valid terakhir (FR-STU-012).
- Given QR LAN, when 120 detik berlalu, then QR kedaluwarsa dan koneksi ditolak (FR-STU-025).

### Traceability

FR-STU-008, FR-STU-009, FR-STU-010, FR-STU-012, FR-STU-013, FR-STU-021, FR-STU-022, FR-STU-025, FR-STU-026, FR-STU-030.

## SCR-10 — DataDesigner

| Atribut | Nilai |
|---|---|
| Route | `/studio/:id?panel=data` |
| Surface | Studio |
| Spec utama | `03-specs/04-data-automation.md` |
| Flow terkait | `04-flows/02-install-update-rollback.md` |

### Tujuan

Mendesain skema database micro-app: tabel, kolom, relasi, indeks, kolom sensitif, FTS5, dan kolom vektor bila tersedia. Setiap perubahan MUST menghasilkan DDL, tipe TypeScript, serta migrasi forward dan rollback dengan snapshot sebelum penerapan.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Kasir › Data      Skema v4 · 6 tabel      [ Pratinjau DDL ]     │
├──────────────┬───────────────────────────────┬─────────────────┤
│ ▾ Tabel      │  transactions                 │ Kolom           │
│   products   │  ┌─────────────────────────┐  │ total           │
│ * transactions│ │ Kolom    Tipe    Null FK │  │ Tipe  integer   │
│   customers  │ │ id       uuid    ✗   —  │  │ Null  [ ]       │
│   settings   │ │ total    integer ✗   —  │  │ Sensitif [ ]    │
│   audit      │ │ note     text    ✓   —  │  │ FTS5  [x]       │
│              │ │ customer uuid    ✗   →  │  │ Default 0       │
│ + Tabel      │ └─────────────────────────┘  │ [ Simpan kolom ]│
│              │  Indeks: idx_total · FTS5: note│                 │
│              │  Migrasi: 004_add_note ✓       │                 │
├──────────────┴───────────────────────────────┴─────────────────┤
│ Snapshot terakhir 12:04 · hash terverifikasi · Rollback siap    │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| TreeView | MADS-DATA-03 | Daftar tabel dan relasi. |
| DataTable | MADS-DATA-01 | Pratinjau kolom dan indeks. |
| SchemaForm | MADS-DOM-02 | Editor properti kolom. |
| Checkbox | MADS-INP-10 | Nullable, sensitif, FTS5. |
| Select | MADS-INP-07 | Tipe kolom dan aksi relasi. |
| NumberField | MADS-INP-05 | Presisi dan panjang. |
| Badge | MADS-DATA-12 | Status migrasi dan indeks. |
| Banner | MADS-FBK-03 | Snapshot dan rollback. |
| DiffViewer | MADS-DOM-05 | DDL dan tipe sebelum diterapkan. |
| ConfirmDialog | MADS-FBK-05 | Konfirmasi migrasi destruktif. |
| Toast | MADS-FBK-02 | Hasil migrasi. |
| EmptyState | MADS-DATA-18 | Belum ada tabel. |

### State

| State | Perilaku |
|---|---|
| loading | Panel menampilkan skeleton dan status "Membaca skema"; aksi tulis dinonaktifkan sampai skema siap. |
| empty | Project tanpa tabel menampilkan empty state dengan aksi `[ Buat tabel ]` dan `[ Impor skema ]`. |
| error | Migrasi gagal menampilkan banner yang menyatakan rollback otomatis dan snapshot yang dipakai; editor tetap dapat dibuka read-only. |
| offline | Seluruh desain skema dan migrasi berfungsi offline. |
| permission | Kolom sensitif memerlukan kunci dari master key; bila Vault terkunci, pratinjau nilai ditolak sampai unlock. |

### Interaksi

- Menambah kolom langsung menghasilkan draf migrasi; penerapan meminta konfirmasi yang menyebut dampak dan snapshot.
- Kolom destruktif (drop/rename) memerlukan konfirmasi tambahan dan menawarkan ekspor data terlebih dahulu.
- `[ Pratinjau DDL ]` menampilkan DDL dan tipe TypeScript berdampingan dengan diff.
- FTS5 dan kolom vektor hanya dapat diaktifkan bila ekstensi tersedia; jika tidak, kontrol menampilkan status tidak tersedia.
- Rollback manual tersedia dari riwayat migrasi dan selalu membuat snapshot baru sebelum eksekusi.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Ctrl/Cmd+N` | Tabel baru pada konteks tabel. |
| `Enter` | Membuka editor kolom terpilih. |
| `Ctrl/Cmd+Shift+P` | Pratinjau DDL. |
| `Ctrl/Cmd+Enter` | Terapkan migrasi dengan konfirmasi. |
| `Esc` | Menutup editor kolom tanpa menyimpan. |

### Aksesibilitas

- Tabel kolom memakai header semantik dan `aria-rowindex`; relasi dijelaskan dengan teks, bukan hanya panah.
- Status migrasi dan snapshot diumumkan melalui live region setelah penerapan.
- Dialog konfirmasi destruktif menyebut nama kolom dan jumlah baris terdampak.
- Seluruh operasi editor kolom dapat diselesaikan dengan keyboard.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.data.emptyTitle` | Belum ada tabel | Judul empty state. |
| `screen.data.sensitiveColumn` | Kolom sensitif dienkripsi AES-256-GCM. | Bantuan kolom. |
| `screen.data.snapshotReady` | Snapshot dibuat sebelum migrasi. | Banner. |
| `screen.data.migrationFailed` | Migrasi gagal. Database dikembalikan ke snapshot. | Error. |
| `screen.data.vectorUnavailable` | Pencarian vektor tidak tersedia di perangkat ini. | Status ekstensi. |

### Acceptance Criteria

- Given penambahan kolom, when disimpan, then DDL dan tipe TypeScript dihasilkan dan DDL berjalan pada database uji (FR-DATA-008).
- Given migrasi `001`, when diterapkan, then pasangan rollback tersimpan di `db/migrations/` dan hanya diterapkan sekali (FR-DATA-009).
- Given migrasi akan dijalankan, when pengguna mengonfirmasi, then snapshot atomik dan hash tercatat sebelum eksekusi (FR-DATA-010).
- Given migrasi rusak, when penerapan gagal, then database dan versi app kembali ke snapshot tanpa kehilangan record (FR-DATA-011).
- Given perubahan skema, when disimpan, then migrasi dan tipe TypeScript sinkron (FR-STU-029).

### Traceability

FR-DATA-008, FR-DATA-009, FR-DATA-010, FR-DATA-011, FR-DATA-012, FR-STU-029, FR-STU-030.

## SCR-11 — WorkflowEditor

| Atribut | Nilai |
|---|---|
| Route | `/studio/:id?panel=workflow` |
| Surface | Studio |
| Spec utama | `03-specs/04-data-automation.md` |
| Flow terkait | `04-flows/08-workflow-outbox.md` |

### Tujuan

Menyusun workflow graph dengan trigger, node aksi, cabang kondisional, dan node AI agent; memvalidasi koneksi dan siklus; serta menampilkan outbox, riwayat run, retry, dan approval human-in-the-loop. Outbox MUST bertahan setelah restart dan setiap job memiliki idempotency key.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Kasir › Workflow     [ Uji ]  [ Aktifkan ]   Outbox: 3          │
├──────────────────────────────────────────┬─────────────────────┤
│  ┌──────────┐     ┌──────────┐           │ Node                │
│  │ Trigger  │────▶│ HTTP     │           │ HTTP Request        │
│  │ DB insert│     │ /api/... │           │ URL  /api/receipt   │
│  └──────────┘     └────┬─────┘           │ Method ( POST )     │
│                        │                 │ Timeout  10 s       │
│              ┌─────────▼────────┐        │ Retry    ( 8 )      │
│              │ Kondisi stok < 5 │        │ Idempoten  ✓        │
│              └───┬──────────┬───┘        │                     │
│            ya    │          │ tidak      │ [ Hapus node ]      │
│        ┌─────────▼──┐  ┌────▼───────┐    │                     │
│        │ Notifikasi │  │ Approval   │    ├─────────────────────┤
│        │ lokal      │  │ HITL       │    │ Run terakhir        │
│        └────────────┘  └────────────┘    │ ✓ 12:04 · 240 ms    │
│                                          │ ⚠ 11:58 waiting     │
├──────────────────────────────────────────┴─────────────────────┤
│ Validasi: 0 siklus · 0 edge tidak sah · 12 node                │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| WorkflowNode | MADS-DOM-03 | Node graph dengan port input/output. |
| SplitPane | MADS-LAY-04 | Canvas dan inspector. |
| VirtualList | MADS-DATA-02 | Daftar node yang tersedia. |
| Menu | MADS-NAV-07 | Tambah node dan trigger. |
| Toolbar | MADS-LAY-10 | Uji, aktifkan, dan filter outbox. |
| Badge | MADS-DATA-12 | Status run dan retry. |
| Timeline | MADS-DATA-06 | Riwayat run berurutan. |
| DataTable | MADS-DATA-01 | Daftar outbox dan attempt. |
| LogViewer | MADS-DOM-07 | Log run dan payload teredaksi. |
| Banner | MADS-FBK-03 | Outbox menunggu jaringan. |
| ConfirmDialog | MADS-FBK-05 | Hapus node atau nonaktifkan workflow. |
| EmptyState | MADS-DATA-18 | Graph kosong. |

### State

| State | Perilaku |
|---|---|
| loading | Canvas menampilkan kerangka dan status memuat definisi workflow. |
| empty | Graph kosong menampilkan pilihan trigger dengan penjelasan singkat tiap trigger. |
| error | Edge tidak valid atau siklus ditolak dengan penanda pada node dan pesan; run gagal menampilkan alasan di inspector. |
| offline | Workflow lokal berjalan; job HTTP masuk `waiting_network` dan ditampilkan pada outbox; webhook ditandai hanya tersedia di self-host. |
| permission | Node connector memakai kredensial Vault; membuka kredensial memerlukan unlock Vault dan grant per item. |

### Interaksi

- Menarik edge ke port yang tidak kompatibel ditolak dengan pesan tipe; siklus tak sah dideteksi sebelum aktivasi.
- Pratinjau data per node menampilkan payload sampel yang sudah diredaksi.
- Outbox menampilkan status `queued`, `waiting_network`, `running`, `failed`, `done`; retry manual hanya untuk `failed`.
- Approval HITL muncul sebagai notifikasi lokal dengan aksi setuju/tolak dan timeout eksplisit.
- `[ Uji ]` menjalankan graph dengan data sintetis tanpa mengaktifkan trigger produksi.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Ctrl/Cmd+Enter` | Menguji workflow. |
| `Arrow` | Berpindah node; `Shift+Arrow` memindahkan node. |
| `Tab` | Berpindah port dan inspector. |
| `Delete` | Menghapus node terpilih dengan konfirmasi. |
| `Ctrl/Cmd+Shift+O` | Membuka panel outbox. |

### Aksesibilitas

- Graph memiliki tampilan daftar alternatif yang memuat node, edge, dan urutan eksekusi agar dapat diedit tanpa pointer.
- Status validasi graph diumumkan melalui live region saat berubah.
- Warna status selalu disertai ikon dan teks; retry count terbaca sebagai "3 dari 8".
- Panel outbox memakai tabel dengan header dan status yang dapat dibaca screen reader.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.workflow.emptyTitle` | Mulai dengan trigger | Judul empty state. |
| `screen.workflow.invalidEdge` | Koneksi tidak valid: tipe data tidak cocok. | Validasi edge. |
| `screen.workflow.waitingNetwork` | Menunggu jaringan | Status outbox. |
| `screen.workflow.approvalTitle` | Persetujuan diperlukan | Judul HITL. |
| `screen.workflow.webhookSelfHostOnly` | Webhook hanya tersedia pada server self-host. | Alasan nonaktif. |

### Acceptance Criteria

- Given edge tidak valid, when pengguna menghubungkan node, then edge ditolak dan node ditandai (FR-DATA-019).
- Given job queued, when app dimatikan dan dinyalakan lagi, then job tetap ada dan dieksekusi (FR-DATA-021).
- Given retry gagal, when attempt mencapai delapan, then tidak ada attempt tambahan dan status `failed` tercatat (FR-DATA-022).
- Given job dengan idempotency key sama, when dieksekusi ulang, then endpoint uji tidak menerima efek ganda (FR-DATA-023).
- Given approval HITL aktif, when timeout tercapai, then job ditandai gagal dengan alasan dan audit tercatat (FR-DATA-024).

### Traceability

FR-DATA-019, FR-DATA-020, FR-DATA-021, FR-DATA-022, FR-DATA-023, FR-DATA-024, FR-DATA-025, FR-DATA-030, FR-SRV-028.

## SCR-12 — AICopilot

| Atribut | Nilai |
|---|---|
| Route | `/studio/:id?panel=ai` |
| Surface | Studio |
| Spec utama | `03-specs/02-studio-ide.md` |
| Flow terkait | `04-flows/03-build-with-ai.md` |

### Tujuan

Menyediakan copilot yang memilih provider secara eksplisit (lokal atau BYOK), menampilkan rencana prompt-to-micro-app sebelum diterapkan, mempratinjau diff patch, dan mengusulkan perbaikan error tanpa pernah menerapkan perubahan tanpa persetujuan. Tidak ada perpindahan otomatis antar provider dan tidak ada pengiriman kunci ke luar Vault.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Kasir › AI     Provider: ( Ollama · lokal ) ▾    ● siap        │
├────────────────────────────────────────────────────────────────┤
│ Rencana untuk: "kasir sederhana dengan total dan cetak struk"  │
│                                                                │
│ 1 Skema database    products, transactions, settings    ✓      │
│ 2 UI MUIP             3 layar, 14 node                  ✓      │
│ 3 Logika              hitung total, validasi bayar      ✓      │
│ 4 Dummy data          12 produk, 5 transaksi            ✓      │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Diff yang diusulkan                            +48 −6    │   │
│ │ src/db/schema.ts        + 22                             │   │
│ │ src/screens/Checkout.tsx + 26 − 6                        │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                │
│ [ Terapkan ]  [ Edit rencana ]  [ Tolak ]      Token 1.2k/8k   │
│                                                                │
│ ⓘ Provider lokal. Tidak ada data yang meninggalkan perangkat.  │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| PromptInput | MADS-AI-01 | Input prompt dengan riwayat dan lampiran referensi. |
| ModelPicker | MADS-AI-02 | Pemilihan provider dan model secara eksplisit. |
| AIStatus | MADS-AI-03 | Kesiapan provider, mode lokal, dan status unduhan model. |
| GenerationProgress | MADS-AI-06 | Tahap perencanaan dan generasi. |
| DiffSuggestion | MADS-AI-05 | Diff patch dengan aksi terapkan/tolak. |
| SourceCitation | MADS-AI-07 | Rujukan ke berkas dan baris yang diubah. |
| AIError | MADS-AI-08 | Kegagalan provider dengan langkah manual. |
| TokenMeter | MADS-AI-09 | Pemakaian token dan batas model. |
| AgentStep | MADS-AI-10 | Langkah agen yang dapat ditinjau. |
| ChatThread | MADS-DOM-08 | Percakapan dan riwayat permintaan. |
| MessageBubble | MADS-DOM-09 | Pesan pengguna dan asisten. |
| SuggestionChip | MADS-AI-04 | Saran prompt lanjutan. |
| Sheet | MADS-LAY-06 | Panel pengaturan provider. |

### State

| State | Perilaku |
|---|---|
| loading | AIStatus menampilkan tahap memuat model; prompt dinonaktifkan dengan alasan yang terlihat. |
| empty | Belum ada provider dikonfigurasi: empty state menawarkan `[ Konfigurasi provider lokal ]` dan `[ Hubungkan BYOK ]`. |
| error | Provider gagal atau timeout menampilkan AIError dengan aksi coba lagi manual dan pilihan provider; sistem MUST NOT beralih provider otomatis. |
| offline | Hanya provider lokal yang tersedia; provider cloud ditandai tidak tersedia tanpa menyembunyikan opsi. |
| permission | `local_ai.inference` memerlukan consent; BYOK memerlukan unlock Vault dan grant item per project. |

### Interaksi

- ModelPicker menampilkan provider terakhir yang berhasil sebagai default dan tidak pernah menggantinya tanpa aksi pengguna.
- Prompt menghasilkan rencana yang dapat ditinjau per langkah; `[ Terapkan ]` baru aktif setelah seluruh langkah valid.
- Diff menampilkan perubahan berkas dan baris; menolak diff tidak mengubah kode.
- Saat error build terdeteksi, tombol `[ Usulkan perbaikan ]` membuat patch dan menampilkannya sebagai diff.
- Kunci BYOK hanya dibaca dari Vault saat permintaan; tidak pernah ditulis ke project, log, atau source control.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Ctrl/Cmd+Enter` | Kirim prompt atau terapkan rencana yang difokus. |
| `Ctrl/Cmd+Shift+M` | Membuka ModelPicker. |
| `Alt+ArrowDown` | Berpindah langkah rencana. |
| `Ctrl/Cmd+Z` | Membatalkan penerapan terakhir selama sesi. |
| `Esc` | Menutup sheet provider. |

### Aksesibilitas

- AIStatus dan GenerationProgress diumumkan melalui live region `polite`; tidak ada pengumuman per token.
- Diff memiliki ringkasan teks jumlah baris ditambah/dihapus dan daftar berkas agar dapat dipahami tanpa warna.
- Setiap langkah rencana adalah item daftar dengan status teks ("valid", "perlu tinjauan").
- Tombol terapkan dan tolak memiliki nama aksesibel yang menyebut jumlah perubahan.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.ai.noProvider` | Belum ada provider AI | Judul empty state. |
| `screen.ai.localOnly` | Provider lokal — data tidak meninggalkan perangkat. | Catatan status. |
| `screen.ai.planTitle` | Rencana untuk "{prompt}" | Judul rencana. |
| `screen.ai.apply` | Terapkan {count} perubahan | Aksi diff. |
| `screen.ai.providerUnavailable` | Provider tidak tersedia. Pilih provider lain secara manual. | Error tanpa fallback. |

### Acceptance Criteria

- Given dua provider terdaftar, when provider lokal dimatikan, then error tampil dan sistem tidak beralih ke cloud (FR-STU-015).
- Given kunci BYOK disimpan di Vault, when pengguna mengirim prompt, then kunci tidak muncul di berkas project, log, atau Git (FR-STU-016).
- Given prompt "kasir sederhana", when generasi selesai, then rencana UI, skema, validasi, logika, dan dummy data dapat ditinjau dan ditolak sebelum diterapkan (FR-STU-017).
- Given error runtime, when pengguna memilih `[ Usulkan perbaikan ]`, then patch tampil sebagai diff dan hanya diterapkan setelah persetujuan (FR-STU-019).

### Traceability

FR-STU-015, FR-STU-016, FR-STU-017, FR-STU-018, FR-STU-019, FR-STU-020.

## SCR-13 — RegistryBrowser

| Atribut | Nilai |
|---|---|
| Route | `/registry` |
| Surface | Host Shell |
| Spec utama | `03-specs/05-registry.md` |
| Flow terkait | `04-flows/09-publish-verify.md` |

### Tujuan

Menjelajah beberapa sumber registry sekaligus dengan pencarian, filter kategori, trust level, dan status terpasang; menampilkan usia cache dan status offline; serta menolak indeks yang signature-nya tidak valid. Browser adalah permukaan baca; instalasi terjadi pada SCR-14.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Registry   [ Cari app…                    ]   [ Sumber: 3 ▾ ]  │
├──────────────┬─────────────────────────────────────────────────┤
│ ▾ Sumber     │ Filter: ( Semua ) Kategori ▾  Trust ▾  Terpasang│
│  ● Official  │                                                 │
│  ● Komunitas │ ┌─────────────────────────────────────────────┐ │
│  ● Internal  │ │ ▣ Kasir Harian        [official] v2.1.0     │ │
│  ○ Lokal     │ │   Kasir offline dengan struk dan stok       │ │
│              │ │   2,4 MB · diperbarui 3 hari lalu           │ │
│ + Tambah     │ ├─────────────────────────────────────────────┤ │
│   sumber     │ │ ▣ Catatan Tim         [community] v1.4.2    │ │
│              │ │   Catatan Markdown lokal dan tautan         │ │
│              │ │   1,1 MB · sudah terpasang                  │ │
│              │ └─────────────────────────────────────────────┘ │
│              │  Cache: 12 jam · signature diverifikasi        │
├──────────────┴─────────────────────────────────────────────────┤
│ ⓘ Offline — menampilkan cache terakhir, tanpa kedaluwarsa      │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| Sidebar | MADS-NAV-01 | Daftar sumber dan prioritas. |
| SearchField | MADS-INP-06 | Pencarian lintas registry. |
| FilterBar | MADS-DOM-15 | Filter kategori, trust, dan status. |
| Combobox | MADS-INP-08 | Pemilihan sumber aktif. |
| MultiSelect | MADS-INP-09 | Filter trust level. |
| Card | MADS-LAY-05 | Kartu hasil app. |
| AppIcon | MADS-PLT-01 | Ikon dan status update. |
| Badge | MADS-DATA-12 | Trust level dan status terpasang. |
| Tag | MADS-DATA-13 | Kategori dan versi. |
| Skeleton | MADS-DATA-17 | Memuat indeks. |
| EmptyState | MADS-DATA-18 | Tidak ada hasil atau sumber. |
| Alert | MADS-FBK-01 | Signature tidak valid atau sumber dinonaktifkan. |
| Banner | MADS-FBK-03 | Status offline dan usia cache. |

### State

| State | Perilaku |
|---|---|
| loading | Kartu hasil memakai skeleton; sumber yang sudah termuat tetap dapat difilter. |
| empty | Tanpa sumber: empty state menawarkan `[ Tambah sumber ]`. Dengan sumber tetapi tanpa hasil: pesan "Tidak ada app yang cocok" dan aksi reset filter. |
| error | Indeks dengan signature tidak valid ditandai pada sumber dan tidak dimasukkan ke hasil; cache yang dimodifikasi gagal verifikasi. |
| offline | Katalog cache tampil tanpa kedaluwarsa; label usia cache dan status offline terlihat; signature tetap diverifikasi setiap pemuatan. |
| permission | Tidak berlaku untuk menjelajah; instalasi memerlukan consent pada layar detail. |

### Interaksi

- Menambah sumber meminta URL indeks dan menampilkan fingerprint kunci registry sebelum menyimpan.
- Prioritas sumber diatur dengan drag atau tombol naik/turun; id yang sama memakai sumber berprioritas lebih tinggi dan hasil duplikat digabung.
- Menghapus atau menonaktifkan sumber tidak menghapus app yang sudah terpasang.
- Menekan kartu membuka detail pada SCR-14 dengan state terpilih.
- App terdelisting ditandai dan hanya menonaktifkan instalasi baru, bukan menghapus data.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Ctrl/Cmd+F` | Fokus ke pencarian. |
| `Arrow` | Navigasi daftar sumber dan kartu. |
| `Enter` | Membuka detail app. |
| `Ctrl/Cmd+Shift+F` | Membuka filter. |
| `Esc` | Menutup filter atau panel sumber. |

### Aksesibilitas

- Trust level selalu disertai teks; tidak ada perbedaan makna yang hanya bergantung pada warna badge.
- Jumlah hasil dan status verifikasi cache diumumkan melalui live region setelah pemuatan selesai.
- Daftar sumber memakai `role="list"` dengan tombol prioritas berlabel ("Naikkan prioritas Official").
- Kartu hasil dapat difokus dan dibuka dengan keyboard tanpa hover.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.registry.search` | Cari app di semua registry… | Placeholder. |
| `screen.registry.cacheAge` | Cache {hours} jam · signature diverifikasi | Status cache. |
| `screen.registry.installed` | Sudah terpasang | Badge. |
| `screen.registry.invalidSignature` | Signature indeks tidak valid. Sumber tidak dimuat. | Alert error. |
| `screen.registry.delisted` | Dinonaktifkan oleh registry | Badge delisting. |

### Acceptance Criteria

- Given dua registry menyediakan versi berbeda, when pencarian dilakukan, then sumber berprioritas lebih tinggi dipakai dan duplikat digabung (FR-REG-001).
- Given offline 30 hari, when browser dibuka, then katalog cache tetap tampil dan signature diverifikasi pada setiap pemuatan (FR-REG-003).
- Given indeks yang dimodifikasi, when dimuat, then verifikasi gagal dan sumber ditandai (FR-REG-004).
- Given filter trust level, when diterapkan, then hanya app pada level tersebut tampil dan label trust terlihat sebelum instalasi (FR-REG-005).
- Given app terdelisting, when dibuka, then instalasi baru dinonaktifkan dengan peringatan dan data lama tetap ada (FR-REG-024).

### Traceability

FR-REG-001, FR-REG-002, FR-REG-003, FR-REG-004, FR-REG-005, FR-REG-006, FR-REG-022, FR-REG-024, FR-REG-025.

## SCR-14 — AppDetailInstall

| Atribut | Nilai |
|---|---|
| Route | `/registry?app=<id>` |
| Surface | Host Shell |
| Spec utama | `03-specs/05-registry.md` |
| Flow terkait | `04-flows/02-install-update-rollback.md`, `04-flows/11-permission-consent.md` |

### Tujuan

Menampilkan detail app sebelum instalasi atau update: deskripsi, versi, ukuran, sumber, trust level, permission required/optional, temuan scanner, status TOFU, mode update, dan aksi rollback. Consent izin MUST muncul setelah seluruh verifikasi signature, hash, dan manifest lulus.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ ‹ Registry / Kasir Harian                     [official]        │
├────────────────────────────────────────────────────────────────┤
│ ▣ Kasir Harian          v2.1.0        Sumber: Official          │
│ Kasir offline dengan struk, stok, dan laporan harian.           │
│                                                                 │
│ Versi tersedia  2.1.0 · 2.0.3 (arsip)      Ukuran  2,4 MB       │
│ Diperbarui      3 hari lalu                Lisensi  MIT         │
│                                                                 │
│ Izin wajib      [storage.local.sqlite] [camera.qr]              │
│ Izin opsional   [notifications.local]                           │
│ Scanner         ✓ SAST  ✓ CVE  ✓ tanpa obfuscation              │
│ Signature       ✓ author  ✓ registry  ✓ contentHash             │
│                                                                 │
│ Mode update     ( auto )  ( notify )  ( pin )                   │
│                                                                 │
│ [ Pasang ]   [ Buka versi 2.0.3 ]   [ Lihat perubahan ]         │
├────────────────────────────────────────────────────────────────┤
│ ⓘ Kunci author dipin sejak instalasi pertama (TOFU).            │
└────────────────────────────────────────────────────────────────┘
```

Dialog consent menampilkan ringkasan permission, risk tier, alasan, dan tiga opsi `Allow once`, `Allow`, `Deny`.

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| SplitPane | MADS-LAY-04 | Detail dan panel samping verifikasi. |
| Image | MADS-MED-01 | Tangkapan layar lokal dari paket. |
| DataTable | MADS-DATA-01 | Daftar versi dan arsip. |
| PermissionBadge | MADS-PLT-08 | Permission dengan risk tier. |
| PermissionDialog | MADS-FBK-06 | Consent instalasi dan update. |
| Badge | MADS-DATA-12 | Trust level dan status verifikasi. |
| Tag | MADS-DATA-13 | Kategori dan lisensi. |
| Alert | MADS-FBK-01 | Key mismatch atau temuan scanner. |
| Banner | MADS-FBK-03 | Peringatan perubahan permission. |
| Select | MADS-INP-07 | Mode update per app. |
| Progress | MADS-DATA-16 | Unduh dan verifikasi delta. |
| UpdateCard | MADS-PLT-10 | Ringkasan update dan rollback. |

### State

| State | Perilaku |
|---|---|
| loading | Verifikasi manifest, signature, dan hash berjalan dengan progress; tombol pasang nonaktif. |
| empty | App tidak ditemukan pada sumber aktif menampilkan pesan dan aksi kembali ke Registry. |
| error | Signature, hash, atau manifest gagal menampilkan kode error dan memblokir dialog consent; key mismatch memblokir update sampai persetujuan eksplisit. |
| offline | Hanya `.mapp` lokal yang dapat dipasang; sumber registry jaringan ditandai tidak tersedia. |
| permission | Dialog consent menampilkan required/optional, risk tier, ukuran, sumber, trust level, dan konsekuensi Offline Cage. |

### Interaksi

- `[ Pasang ]` menjalankan verifikasi penuh, lalu consent, lalu snapshot database sebelum migrasi.
- Update memakai delta bila tersedia dan memverifikasi hash artefak akhir; kegagalan delta jatuh ke unduhan penuh hanya setelah pengguna menyetujui.
- Perubahan kunci author menampilkan peringatan keras; menyetujui sekali memperbarui pin dan mencatat audit.
- Mode `pin` mengunci versi dan mencegah update otomatis maupun delta sampai dilepas.
- `[ Buka versi 2.0.3 ]` menawarkan rollback dengan snapshot dan verifikasi signature versi lama.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Tab` | Berpindah antar bagian detail dan aksi. |
| `Enter` | Mengaktifkan aksi utama (pasang, update, rollback). |
| `Esc` | Menutup dialog consent tanpa efek samping. |
| `Alt+V` | Membuka daftar versi. |
| `Alt+R` | Membuka alur rollback. |

### Aksesibilitas

- Dialog consent memindahkan fokus ke judul, mengumumkan nama app, dan menangkap fokus sampai diputuskan.
- Setiap permission adalah item dengan nama, risk tier, dan alasan yang terbaca sebagai satu kalimat.
- Temuan scanner menyertakan severity dalam teks, bukan hanya warna.
- Tombol `Allow once` memiliki penjelasan tambahan melalui `aria-describedby` tentang durasi grant.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.detail.install` | Pasang | Aksi utama. |
| `screen.detail.verifyFailed` | Verifikasi gagal. Instalasi diblokir. | Error. |
| `screen.detail.keyChanged` | Kunci author berubah. Tinjau sebelum melanjutkan. | Peringatan TOFU. |
| `screen.detail.consentTitle` | Izinkan {app} mengakses: | Judul dialog consent. |
| `screen.detail.rollback` | Kembali ke versi {version} | Aksi rollback. |

### Acceptance Criteria

- Given artefak yang diubah, when verifikasi dijalankan, then instalasi gagal sebelum dialog consent muncul (FR-REG-007).
- Given `id` manifest tidak valid, when dipasang, then manifest ditolak dengan field bermasalah (FR-REG-011).
- Given kunci author berbeda dari pin, when update dijalankan, then update diblokir sampai pengguna menyetujui secara eksplisit dan audit tercatat (FR-REG-013).
- Given dialog consent, when pengguna menolak, then instalasi dibatalkan tanpa efek samping dan tidak ada grant yang dibuat (FR-REG-016).
- Given mode `pin`, when rilis baru tersedia, then versi tidak berubah sampai pin dilepas (FR-REG-019).

### Traceability

FR-REG-007, FR-REG-008, FR-REG-009, FR-REG-011, FR-REG-012, FR-REG-013, FR-REG-014, FR-REG-015, FR-REG-016, FR-REG-017, FR-REG-018, FR-REG-019, FR-REG-020, FR-REG-021, FR-REG-023, FR-REG-025.

## SCR-15 — Permissions

| Atribut | Nilai |
|---|---|
| Route | `/settings/permissions?app=<id>` |
| Surface | Host Shell |
| Spec utama | `03-specs/permissions.md` |
| Flow terkait | `04-flows/11-permission-consent.md` |

### Tujuan

Mengelola grant per micro-app: melihat permission yang dideklarasikan, risk tier, status grant, mencabut akses segera, mengaktifkan Offline Cage, dan mengaktifkan mock/spoof untuk pengujian. Setiap keputusan MUST tercatat di audit lokal dan pencabutan MUST berlaku tanpa restart.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Pengaturan › Izin                                              │
├────────────────────────────────────────────────────────────────┤
│ App: ( Kasir Harian ▾ )                    [ Offline Cage  ○ ] │
│                                                                │
│ Permission              Risk     Grant        Mock     Audit    │
│ storage.local.sqlite    low      ( Izinkan )  —        ▸        │
│ camera.qr               medium   ( Izinkan )  [ ]      ▸        │
│ notifications.local     low      ( Izinkan )  —        ▸        │
│ network.allowlist       high     ( Tolak  )   —        ▸        │
│   allowlist: api.contoh.id                                    │
│                                                                │
│ [ Cabut semua grant ]                                          │
│                                                                │
│ Riwayat terbaru                                                │
│ 12:04  camera.qr   deny    user       —                        │
│ 11:58  storage     grant   user       sesi aktif               │
├────────────────────────────────────────────────────────────────┤
│ ⓘ Perubahan berlaku segera. Tidak perlu memulai ulang app.     │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| DataTable | MADS-DATA-01 | Permission, risk, grant, mock, audit. |
| Select | MADS-INP-07 | Pemilihan app. |
| Switch | MADS-INP-12 | Offline Cage dan mock per permission. |
| Badge | MADS-DATA-12 | Risk tier dan status grant. |
| PermissionBadge | MADS-PLT-08 | Ringkasan izin aktif pada header. |
| ConfirmDialog | MADS-FBK-05 | Konfirmasi cabut semua grant. |
| Toast | MADS-FBK-02 | Konfirmasi perubahan. |
| EmptyState | MADS-DATA-18 | Belum ada app dengan permission. |
| Banner | MADS-FBK-03 | Penjelasan konsekuensi high risk. |
| LogViewer | MADS-DOM-07 | Riwayat audit terfilter. |

### State

| State | Perilaku |
|---|---|
| loading | Tabel menampilkan skeleton; header app dan cage tetap tampil. |
| empty | Tidak ada app dengan permission: empty state menjelaskan bahwa izin muncul setelah app dipasang. |
| error | Audit gagal dimuat: tabel grant tetap berfungsi dan panel audit menampilkan status error dengan retry. |
| offline | Seluruh pengelolaan grant berfungsi offline; tidak ada data yang dikirim keluar. |
| permission | Mengubah `network.allowlist` atau membuka audit terperinci memerlukan konfirmasi tambahan yang menyebut dampak. |

### Interaksi

- Mengubah grant memakai dialog konfirmasi yang menyebut app, permission, dan risk tier; hasil langsung berlaku.
- `Allow once` tidak muncul di layar ini karena hanya berlaku untuk sesi berjalan; grant permanen ditampilkan sebagai `Allow`.
- Offline Cage memblokir seluruh jaringan meskipun allowlist berisi domain dan menampilkan status permanen di app.
- Mock/spoof tersedia untuk kamera, lokasi, mikrofon, dan biometrik; badge mock tampil di app dan audit mencatatnya.
- `[ Cabut semua grant ]` meminta konfirmasi dan menghentikan akses segera.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Arrow` | Navigasi baris permission. |
| `Space` | Mengubah switch yang difokus. |
| `Enter` | Membuka detail audit permission. |
| `Ctrl/Cmd+Shift+X` | Cabut semua grant dengan konfirmasi. |

### Aksesibilitas

- Risk tier dibaca sebagai teks lengkap ("risiko tinggi") dan dihubungkan ke baris.
- Switch memiliki label yang menyebut app dan permission, bukan hanya "aktif".
- Perubahan grant diumumkan melalui live region `polite` dengan hasil akhir.
- Penjelasan konsekuensi high risk tersedia sebagai teks, bukan tooltip hover saja.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.permissions.title` | Izin | Judul layar. |
| `screen.permissions.revokeAll` | Cabut semua grant | Aksi destruktif. |
| `screen.permissions.cageOn` | Offline Cage aktif — semua jaringan diblokir. | Status. |
| `screen.permissions.mockBadge` | Mock aktif | Badge pengujian. |
| `screen.permissions.applied` | Perubahan berlaku segera. | Toast. |

### Acceptance Criteria

- Given grant `camera.qr` aktif pada app A, when pengguna mencabutnya, then panggilan berikutnya gagal tanpa restart dan app menerima notifikasi (FR-SBX-010).
- Given app tanpa grant, when meminta resource, then permintaan ditolak sebelum validasi parameter dan tanpa dialog (SEC-014).
- Given Offline Cage aktif, when app memanggil domain pada allowlist, then koneksi diblokir dan badge tampil permanen (SEC-018).
- Given mock kamera aktif, when app meminta frame, then data sintetis dikembalikan dan audit menandai mock (SEC-017).
- Given grant, deny, revoke, dan mock terjadi, when audit dibuka, then kelima jenis kejadian tercatat dengan app, permission, keputusan, aktor, dan waktu (SEC-019).

### Traceability

FR-SBX-008, FR-SBX-009, FR-SBX-010, FR-SBX-011, FR-SBX-012, FR-SBX-013, FR-SBX-024.

## SCR-16 — SyncPeers

| Atribut | Nilai |
|---|---|
| Route | `/settings/sync` |
| Surface | Host Shell |
| Spec utama | `03-specs/06-sync-backup.md` |
| Flow terkait | `04-flows/06-p2p-sync.md` |

### Tujuan

Menampilkan peer, transport aktif, cursor, antrean, dan error terakhir; memasangkan perangkat baru melalui QR dan SAS 6 digit; mencabut perangkat; serta menyediakan pintu masuk ke backup dan pemulihan. Layar MUST NOT menampilkan isi payload dan MUST memilih transport secara deterministik.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Pengaturan › Sinkronisasi                    [ Pasangkan ]     │
├────────────────────────────────────────────────────────────────┤
│ Transport aktif: ( LAN · mDNS + TLS )                          │
│ Peer: 2 · Antrean: 14 mutasi · Cursor: 12:04:18.220            │
│                                                                │
│ Perangkat                 Transport  Terakhir     Status       │
│ ▣ Ponsel Android          LAN        12:04        ● tersambung │
│ ▣ Laptop Kerja            WebRTC     11:52        ● tersambung │
│ ▣ Tablet Lama             —          3 hari       ○ dicabut    │
│                                                                │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ SAS:  4 8 2  9 1 6        Cocokkan di kedua perangkat    │   │
│ │ [  QR ]   Berlaku 118 detik                              │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                │
│ [ Cadangkan sekarang ]   [ Pulihkan dari backup ]              │
├────────────────────────────────────────────────────────────────┤
│ ⓘ Server hanya menyimpan ciphertext. Isi data tidak dibaca.    │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| DeviceCard | MADS-DOM-20 | Peer, transport, status, dan aksi cabut. |
| QRScanner | MADS-MED-05 | Pemindaian QR pairing lewat kamera. |
| Image | MADS-MED-01 | Render QR pairing di layar. |
| OTPInput | MADS-INP-20 | Konfirmasi SAS 6 digit. |
| Badge | MADS-DATA-12 | Status peer dan transport. |
| SyncStatus | MADS-FBK-09 | Ringkasan cursor dan antrean. |
| DataTable | MADS-DATA-01 | Daftar peer dan terakhir sync. |
| Timeline | MADS-DATA-06 | Riwayat percobaan dan fallback. |
| Banner | MADS-FBK-03 | Handshake gagal atau versi tidak cocok. |
| ConfirmDialog | MADS-FBK-05 | Pencabutan perangkat. |
| EmptyState | MADS-DATA-18 | Belum ada peer. |
| Toast | MADS-FBK-02 | Hasil pairing dan cabut. |
| PermissionDialog | MADS-FBK-06 | Consent `camera.qr` sebelum memindai. |

### State

| State | Perilaku |
|---|---|
| loading | Penemuan peer berjalan dengan indikator; daftar peer terakhir tetap tampil dari cache. |
| empty | Belum ada peer: empty state menjelaskan pairing QR dan menawarkan `[ Pasangkan perangkat ]`. |
| error | SAS tidak cocok membatalkan pairing; versi protokol tidak kompatibel menampilkan kode dan saran update tanpa meneruskan data. |
| offline | Tidak ada transport jaringan: status menunjukkan sync terakhir dan antrean tetap tersimpan sampai koneksi kembali. |
| permission | Memindai QR memerlukan `camera.qr`; menolak consent tetap memungkinkan input kode manual. |

### Interaksi

- `[ Pasangkan ]` membuat QR berbatas waktu dan SAS; kedua pihak MUST mengonfirmasi SAS sebelum kunci dipertukarkan.
- QR kedaluwarsa setelah 120 detik dan tidak dapat dipakai ulang; tombol memperbarui QR membuat sesi baru.
- Pemilihan transport otomatis mengikuti urutan LAN → WebRTC → self-host → BYOS, dengan fallback setelah 5 detik bila LAN/WebRTC gagal.
- Mencabut perangkat menghentikan sync dan menghapus kunci sesi perangkat tersebut; perangkat lain tidak terpengaruh.
- `[ Cadangkan sekarang ]` dan `[ Pulihkan dari backup ]` membuka alur backup pada SCR-19.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Tab` | Berpindah antar kartu peer dan aksi. |
| `Enter` | Membuka aksi peer terpilih. |
| `Ctrl/Cmd+Shift+N` | Membuka alur pairing. |
| `Esc` | Menutup QR atau dialog SAS. |
| `Arrow` | Berpindah digit SAS saat fokus pada OTP. |

### Aksesibilitas

- SAS ditampilkan sebagai enam digit yang dapat dibaca berurutan dengan pemisah; pengumuman menyebut "kode enam digit".
- Status peer disertai teks; warna tidak menjadi satu-satunya penanda.
- QR memiliki teks alternatif berisi instruksi dan kode sesi, bukan data kunci.
- Pembatalan pairing karena SAS berbeda diumumkan melalui live region `assertive`.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.sync.emptyTitle` | Belum ada perangkat tersambung | Empty state. |
| `screen.sync.sasHint` | Cocokkan kode ini di kedua perangkat. | Instruksi SAS. |
| `screen.sync.qrExpired` | Kode pairing sudah kedaluwarsa. | Status QR. |
| `screen.sync.revokeBody` | Perangkat ini akan berhenti menyinkronkan data. | Konfirmasi. |
| `screen.sync.zeroKnowledge` | Server hanya menyimpan ciphertext. | Catatan privasi. |

### Acceptance Criteria

- Given dua perangkat, when SAS berbeda pada salah satu pihak, then pairing dibatalkan dan kunci tidak dipertukarkan (FR-SYNC-016).
- Given LAN tersedia, when sync dimulai, then LAN dipilih dan peer belum dipasangkan ditolak (FR-SYNC-004, FR-SYNC-008).
- Given LAN gagal, when 5 detik berlalu, then client beralih ke self-host dan mencatat alasan fallback (FR-SYNC-009).
- Given perangkat dicabut, when peer mencoba sync, then koneksi ditolak dan perangkat lain tetap berfungsi (FR-SYNC-017).
- Given status sync, when layar dibuka, then peer, transport, cursor, antrean, dan error terakhir tampil tanpa isi payload (FR-SYNC-018).

### Traceability

FR-SYNC-004, FR-SYNC-005, FR-SYNC-008, FR-SYNC-009, FR-SYNC-010, FR-SYNC-013, FR-SYNC-016, FR-SYNC-017, FR-SYNC-018, FR-HOST-026.

## SCR-17 — Vault

| Atribut | Nilai |
|---|---|
| Route | `/settings/vault` |
| Surface | Host Shell |
| Spec utama | `03-specs/01-host-shell.md` |
| Flow terkait | `04-flows/07-backup-recovery.md`, `04-flows/11-permission-consent.md` |

### Tujuan

Menyimpan item sensitif (kunci API, kredensial, catatan rahasia) dengan AES-256-GCM, mengunci otomatis setelah lima menit tanpa interaksi, dan membagikan item ke micro-app hanya melalui grant eksplisit per item dan per app. Vault MUST NOT pernah menampilkan plaintext tanpa unlock yang sah.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Pengaturan › Vault                          Terkunci · 04:12 ↻  │
├────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ 🔒 Vault terkunci                                        │   │
│ │ [ Buka dengan biometrik ]  [ Gunakan PIN ]  [ Passphrase]│   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                │
│ Item (nama saja, nilai tersembunyi)                            │
│ ▸ api_key_openai        dipakai 1 app        [ Bagikan ]       │
│ ▸ git_token_kerja       dipakai 1 app        [ Bagikan ]       │
│ ▸ wifi_kantor           tidak dibagikan      [ Bagikan ]       │
│                                                                │
│ Akses aktif                                                    │
│ Kasir Harian  →  api_key_openai   [ Cabut ]                    │
│                                                                │
│ [ Tambah item ]                                                │
├────────────────────────────────────────────────────────────────┤
│ ⓘ Auto-lock 5 menit tanpa interaksi. Enkripsi AES-256-GCM.     │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| Sidebar | MADS-NAV-01 | Navigasi bagian pengaturan. |
| VaultItem | MADS-DOM-19 | Baris item dengan aksi bagikan. |
| VirtualList | MADS-DATA-02 | Daftar item tervirtualisasi. |
| TextField | MADS-INP-03 | Nama item dan input passphrase. |
| Button | MADS-INP-01 | Unlock, tambah, bagikan, cabut. |
| Switch | MADS-INP-12 | Visibilitas nilai sementara. |
| Progress | MADS-DATA-16 | Hitung mundur auto-lock. |
| Badge | MADS-DATA-12 | Status item dan jumlah app. |
| ConfirmDialog | MADS-FBK-05 | Konfirmasi cabut grant. |
| EmptyState | MADS-DATA-18 | Vault belum berisi item. |
| Toast | MADS-FBK-02 | Hasil simpan dan cabut. |
| Tooltip | MADS-DATA-15 | Penjelasan enkripsi per item. |

### State

| State | Perilaku |
|---|---|
| loading | Deriving key berjalan dengan indikator; daftar item tidak dirender sebelum status kunci diketahui. |
| empty | Vault kosong menampilkan empty state dengan aksi `[ Tambah item ]` dan penjelasan enkripsi. |
| error | Passphrase atau biometrik salah menampilkan pesan tanpa membocorkan detail; percobaan dibatasi dan alternatif recovery ditawarkan. |
| offline | Seluruh operasi Vault berfungsi offline; tidak ada sinkronisasi plaintext. |
| permission | Membuka Vault memerlukan biometrik, PIN, atau passphrase; membagikan item memerlukan grant per item dan per app. |

### Interaksi

- Vault terkunci otomatis setelah lima menit tanpa interaksi; hitung mundur terlihat dan dipercepat setelah app background.
- Nilai item tersembunyi secara default; `[ Tampilkan ]` hanya berlaku selama fokus dan kembali tersembunyi setelah 15 detik.
- `[ Bagikan ]` memilih app tujuan dan menampilkan jenis akses yang diberikan; grant dapat dicabut kapan saja.
- Cabut grant berlaku segera; app yang sedang berjalan menerima kegagalan pada panggilan berikutnya.
- Menghapus item memutus seluruh grant dan mencatat audit.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Tab` | Berpindah antar item dan aksi. |
| `Enter` | Membuka item terpilih. |
| `Space` | Menampilkan nilai selama fokus pada tombol tampilkan. |
| `Ctrl/Cmd+Shift+L` | Mengunci Vault segera. |
| `Esc` | Menyembunyikan nilai atau menutup dialog. |

### Aksesibilitas

- Status terkunci diumumkan melalui live region dan fokus dipindahkan ke tombol unlock saat auto-lock terjadi.
- Nilai rahasia memakai `type="password"` dan `aria-describedby` yang menjelaskan durasi tampil.
- Hitung mundur auto-lock tidak diumumkan setiap detik; hanya pada 60 detik dan 10 detik terakhir.
- Grant dan cabut grant diumumkan dengan nama item dan nama app.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.vault.lockedTitle` | Vault terkunci | Judul state terkunci. |
| `screen.vault.unlockBiometric` | Buka dengan biometrik | Aksi utama. |
| `screen.vault.autoLock` | Terkunci otomatis dalam {time}. | Status hitung mundur. |
| `screen.vault.shareTitle` | Bagikan {item} ke micro-app | Judul dialog grant. |
| `screen.vault.revokeBody` | Akses akan berhenti segera setelah dicabut. | Konfirmasi. |

### Acceptance Criteria

- Given Vault tidak tersentuh selama lima menit, when waktu tercapai, then item tidak dapat dibaca tanpa unlock (FR-HOST-016).
- Given item dibagikan ke app A, when app B meminta item yang sama, then akses ditolak dan audit mencatatnya (FR-HOST-017).
- Given grant dicabut, when app memanggil item, then akses berhenti segera tanpa restart (FR-HOST-017).
- Given kunci BYOK di Vault, when project disimpan dan di-commit, then kunci tidak muncul di project, log, atau Git (FR-STU-016).

### Traceability

FR-HOST-016, FR-HOST-017, FR-STU-016.

## SCR-18 — Settings

| Atribut | Nilai |
|---|---|
| Route | `/settings/general` dengan indeks `/settings` |
| Surface | Host Shell |
| Spec utama | `03-specs/01-host-shell.md` |
| Flow terkait | `04-flows/01-first-run.md`, `04-flows/10-selfhost-airgap.md` |

### Tujuan

Menjadi pusat konfigurasi Host: workspace, tampilan dan tema, bahasa dan locale, notifikasi, sumber registry, mode update, provider AI, plugin, serta privasi yang menegaskan tidak ada telemetry default. Setiap perubahan MUST dipersistensi lokal dan MUST menjelaskan dampaknya sebelum diterapkan.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Pengaturan                                                     │
├──────────────────┬─────────────────────────────────────────────┤
│ ▸ Umum           │ Umum                                       │
│ ▸ Workspace      │ Bahasa        ( id-ID ▾ )  Ikuti sistem     │
│ ▸ Tampilan       │ Tema          ( Studio ▾ )  [ High contrast]│
│ ▸ Notifikasi     │ Teks besar    [ ]                          │
│ ▸ Registry       │ Kurangi animasi [ ]                        │
│ ▸ Update         │                                             │
│ ▸ AI             │ Notifikasi                                  │
│ ▸ Plugin         │ Pengingat lokal   [x]  Izin diberikan      │
│ ▸ Privasi        │ Push UnifiedPush  ( tidak tersedia )        │
│                  │                                             │
│                  │ Privasi                                     │
│                  │ Telemetri         ( Mati · permanen )       │
│                  │ Analytics server  ( hanya self-host opt-in )│
└──────────────────┴─────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| AppShell | MADS-LAY-01 | Kerangka pengaturan dua panel. |
| Sidebar | MADS-NAV-01 | Navigasi bagian pengaturan. |
| Stack | MADS-LAY-02 | Grup pengaturan vertikal. |
| Select | MADS-INP-07 | Bahasa, tema, dan mode update. |
| Switch | MADS-INP-12 | Notifikasi, animasi, dan telemetri. |
| RadioGroup | MADS-INP-11 | Pilihan mode update dan locale. |
| TextField | MADS-INP-03 | Nama workspace dan URL registry. |
| Slider | MADS-INP-13 | Ukuran teks dan skala UI. |
| ColorPicker | MADS-INP-17 | Token aksen pada tema kustom. |
| WorkspaceSwitcher | MADS-NAV-09 | Konteks workspace untuk pengaturan. |
| Badge | MADS-DATA-12 | Status izin dan ketersediaan fitur. |
| Banner | MADS-FBK-03 | Dampak perubahan dan status offline. |
| ConfirmDialog | MADS-FBK-05 | Hapus workspace dan reset pengaturan. |
| Toast | MADS-FBK-02 | Konfirmasi simpan. |
| UpdateCard | MADS-PLT-10 | Versi, kanal update, dan catatan rilis. |

### State

| State | Perilaku |
|---|---|
| loading | Panel pengaturan menampilkan skeleton per bagian; navigasi sidebar tetap aktif. |
| empty | Tidak berlaku; setiap bagian memiliki nilai default yang ditampilkan. |
| error | Nilai konfigurasi tidak valid ditampilkan pada field dan tidak disimpan; pengaturan lain tetap dapat diubah. |
| offline | Semua pengaturan lokal berfungsi; bagian registry dan update menampilkan status offline tanpa menghapus nilai. |
| permission | Mengaktifkan notifikasi memicu permintaan `notifications.local`; penolakan menampilkan status dan tautan ke pengaturan sistem. |

### Interaksi

- Perubahan disimpan segera dengan indikator "Tersimpan"; tidak ada tombol simpan global.
- Mengubah bahasa meminta konfirmasi restart-ui bila string belum dimuat; layout RTL langsung dicerminkan.
- Menghapus workspace menampilkan dialog dengan opsi ekspor dan tidak menghapus data tanpa konfirmasi eksplisit.
- Menambahkan sumber registry memvalidasi URL dan menampilkan fingerprint kunci sebelum disimpan.
- Bagian privasi menampilkan telemetri sebagai mati permanen; opsi analytics hanya muncul pada self-host dengan opt-in eksplisit.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Tab` | Berpindah antar kontrol dalam urutan baca. |
| `Arrow` | Berpindah bagian sidebar. |
| `Space` | Mengubah switch atau radio. |
| `Enter` | Membuka bagian atau menyimpan field teks. |
| `Ctrl/Cmd+F` | Mencari pengaturan. |

### Aksesibilitas

- Setiap grup pengaturan memakai `fieldset` dan `legend`; deskripsi dampak terhubung via `aria-describedby`.
- Perubahan switch diumumkan dengan nama pengaturan dan nilai baru.
- Bagian yang tidak tersedia menampilkan alasan sebagai teks, bukan hanya kontrol nonaktif.
- Layout RTL diuji tanpa pemotongan kontrol; ikon arah dicerminkan.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.settings.saved` | Tersimpan | Status simpan. |
| `screen.settings.telemetryOff` | Telemetri mati permanen | Label privasi. |
| `screen.settings.deleteWorkspace` | Hapus workspace | Aksi destruktif. |
| `screen.settings.restartForLanguage` | Muat ulang antarmuka untuk menerapkan bahasa? | Konfirmasi locale. |
| `screen.settings.notificationsDenied` | Izin notifikasi ditolak. Aktifkan dari pengaturan sistem. | Status izin. |

### Acceptance Criteria

- Given dua workspace, when pengguna mengganti workspace, then daftar app, registry, dan permission mengikuti workspace aktif dan terisolasi (FR-HOST-007).
- Given workspace berisi data, when pengguna memilih hapus, then dialog menawarkan ekspor dan pembatalan tidak mengubah data (FR-HOST-008).
- Given locale sistem `ar`, when pengaturan dibuka, then layout RTL tampil tanpa elemen terpotong pada 200% zoom (FR-HOST-030).
- Given mode update `notify`, when rilis baru tersedia, then hanya notifikasi yang muncul dan versi tidak berubah (FR-REG-018).
- Given instance self-host tanpa opt-in, when bagian privasi dibuka, then analytics tampil mati dan tidak ada pengumpulan data (FR-DEV-007).

### Traceability

FR-HOST-007, FR-HOST-008, FR-HOST-010, FR-HOST-019, FR-HOST-030, FR-REG-001, FR-REG-018, FR-DEV-007, FR-DEV-017.

## SCR-19 — StorageManager

| Atribut | Nilai |
|---|---|
| Route | `/settings/storage` |
| Surface | Host Shell |
| Spec utama | `03-specs/01-host-shell.md` |
| Flow terkait | `04-flows/07-backup-recovery.md`, `04-flows/02-install-update-rollback.md` |

### Tujuan

Menampilkan pemakaian penyimpanan per micro-app (bundle, database, cache media, total), ruang yang dapat direbut kembali, status pin, arsip versi, serta aksi export, backup, restore, dan pembersihan yang aman. Pembersihan MUST NOT menghapus database pengguna, Vault, atau aset yang di-pin.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Pengaturan › Penyimpanan        Terpakai 1,8 GB / 12 GB         │
├────────────────────────────────────────────────────────────────┤
│ ███████████████░░░░░░░░░░░░░░░░░░░░░  15%                      │
│ Dapat direbut kembali: 420 MB                                  │
│                                                                │
│ App              Bundle   Database   Cache   Pin    Arsip       │
│ Kasir Harian     2,4 MB   86 MB      120 MB  [x]    1 versi     │
│ Catatan Tim      1,1 MB   34 MB       12 MB  [ ]    1 versi     │
│ Galeri Foto      0,8 MB   52 MB      390 MB  [ ]    —           │
│                                                                │
│ [ Bersihkan cache ]   [ Kelola arsip versi ]                   │
│                                                                │
│ Backup & ekspor                                                │
│ [ Cadangkan workspace ]  [ Pulihkan ]  [ Ekspor SQLite ]        │
│ [ Ekspor JSONL ]  [ Ekspor CSV ]  [ Ekspor Markdown ]           │
├────────────────────────────────────────────────────────────────┤
│ ⓘ Pembersihan tidak menghapus database, Vault, atau aset pin.   │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| StorageMeter | MADS-PLT-09 | Pemakaian total dan ruang yang dapat direbut. |
| Progress | MADS-DATA-16 | Bar pemakaian per kategori. |
| DataTable | MADS-DATA-01 | Ukuran per app dan status pin. |
| BarChart | MADS-DATA-08 | Distribusi bundle, database, cache. |
| Switch | MADS-INP-12 | Pin forever per app. |
| Button | MADS-INP-01 | Bersihkan, cadangkan, pulihkan, ekspor. |
| ConfirmDialog | MADS-FBK-05 | Konfirmasi pembersihan dan hapus arsip. |
| ExportDialog | MADS-DOM-18 | Opsi format ekspor dan kolom sensitif. |
| ImportWizard | MADS-DOM-17 | Restore dari berkas lokal. |
| Banner | MADS-FBK-03 | Penjelasan dampak pembersihan. |
| EmptyState | MADS-DATA-18 | Belum ada data tersimpan. |
| Toast | MADS-FBK-02 | Hasil ekspor dan pembersihan. |

### State

| State | Perilaku |
|---|---|
| loading | Pemindaian ukuran berjalan dengan indikator; nilai terakhir tetap tampil dengan label "perkiraan". |
| empty | Instalasi baru tanpa data menampilkan empty state dengan tautan ke Registry. |
| error | Pemindaian gagal menampilkan status error dan mempertahankan aksi ekspor yang tidak bergantung pada hasil pindai. |
| offline | Seluruh pemindaian, pembersihan, ekspor, dan restore lokal berfungsi; cadangan ke BYOS ditandai memerlukan koneksi. |
| permission | Ekspor dan restore memakai `filesystem.picker`; berkas backup terenkripsi meminta passphrase. |

### Interaksi

- `[ Bersihkan cache ]` menampilkan rincian byte per kategori dan dampaknya sebelum eksekusi; konfirmasi menjalankan pembersihan parsial dengan laporan hasil.
- Pin forever mencegah pembersihan otomatis dan tetap berlaku setelah restart serta sinkronisasi.
- Menghapus arsip versi memerlukan konfirmasi dan memberi tahu bahwa rollback ke versi tersebut tidak lagi tersedia.
- Ekspor SQLite menawarkan menyertakan atau mengecualikan kolom sensitif; ekspor JSONL, CSV, dan Markdown tersedia per app atau seluruh workspace.
- Restore memverifikasi checksum dan signature manifest, lalu menampilkan ringkasan verifikasi jumlah record per tabel.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Arrow` | Navigasi baris app. |
| `Space` | Mengubah pin pada baris terpilih. |
| `Ctrl/Cmd+E` | Membuka dialog ekspor. |
| `Ctrl/Cmd+Shift+B` | Membuka alur backup. |
| `Enter` | Menjalankan aksi utama dialog. |

### Aksesibilitas

- Angka pemakaian disertai satuan yang terbaca ("86 megabita") dan persentase; grafik memiliki tabel alternatif.
- Dialog pembersihan menyebut kategori, ukuran, dan hal yang tidak dihapus.
- Hasil pembersihan diumumkan melalui live region dengan total byte yang dibebaskan.
- Seluruh aksi ekspor dapat diselesaikan dengan keyboard dan dialog mengembalikan fokus.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.storage.total` | Terpakai {used} dari {total} | Ringkasan. |
| `screen.storage.reclaimable` | Dapat direbut kembali: {size} | Label. |
| `screen.storage.cleanupTitle` | Bersihkan cache? | Konfirmasi. |
| `screen.storage.cleanupBody` | Database, Vault, dan aset yang di-pin tidak dihapus. | Penjelasan. |
| `screen.storage.pinForever` | Pin selamanya | Label switch. |

### Acceptance Criteria

- Given daftar app, when ukuran total dihitung, then angka sama dengan jumlah komponen dalam toleransi 1% dan diurutkan berdasarkan ukuran (FR-HOST-020).
- Given aset di-pin, when pembersihan cache dijalankan, then aset tetap ada dan status pin terlihat (FR-HOST-022).
- Given perangkat penuh, when pembersihan selesai, then jumlah record database tidak berubah dan laporan menunjukkan byte per kategori (FR-HOST-023).
- Given berkas `.mapp-backup`, when dibuka tanpa passphrase, then isi tidak dapat dibaca dan restore pada perangkat lain memulihkan jumlah record identik (FR-HOST-021).
- Given ekspor SQLite, when opsi kolom sensitif dikecualikan, then berkas dapat dibuka `sqlite3` tanpa kolom tersebut (FR-SYNC-019).

### Traceability

FR-HOST-020, FR-HOST-021, FR-HOST-022, FR-HOST-023, FR-REG-021, FR-SYNC-019, FR-SYNC-020, FR-SYNC-021, FR-SYNC-022, FR-SYNC-023, FR-SYNC-024.

## SCR-20 — DevTools

| Atribut | Nilai |
|---|---|
| Route | `/dev/tools` |
| Surface | Host Shell |
| Spec utama | `03-specs/08-devtools-cli-sdk.md` |
| Flow terkait | `04-flows/12-crash-recovery.md` |

### Tujuan

Menyediakan diagnostik lokal untuk developer: RAM per app, FPS, query lambat, antrean sync, panggilan Host Bridge, dan console log terisolasi per app. DevTools MUST NOT mengirim data keluar dan MUST meredaksi payload sensitif.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ DevTools   App: ( Kasir Harian ▾ )      [ Rekam ]  [ Ekspor ]  │
├────────────────────────────────────────────────────────────────┤
│ ( RAM ) ( FPS ) ( Query ) ( Sync ) ( Bridge ) ( Console )      │
├────────────────────────────────────────────────────────────────┤
│ RAM 96,4 MB / 128 MB     ▁▂▃▅▆▆▅▄▃▂  60 dtk     80% ▏         │
│ FPS 60 · frame drop 2 · p99 15,8 ms                            │
│                                                                │
│ Query lambat (> 50 ms)                                         │
│ Waktu    Durasi   Tabel          Rencana                       │
│ 12:04    128 ms   transactions   SCAN idx_total                │
│ 12:03     74 ms   products       SEARCH FTS5                   │
│                                                                │
│ Bridge calls                                                   │
│ db.query   42×  p95 3 ms   ✓                                   │
│ camera.qr   1×  12 ms      ⚠ ditolak                           │
├────────────────────────────────────────────────────────────────┤
│ ⓘ Data tetap di perangkat. Payload sensitif diredaksi.         │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| TabBar | MADS-NAV-02 | Tab RAM, FPS, Query, Sync, Bridge, Console. |
| LineChart | MADS-DATA-07 | Riwayat RAM 60 detik dan FPS. |
| AreaChart | MADS-DATA-10 | Distribusi frame time. |
| StatCard | MADS-DATA-11 | Angka kunci per tab. |
| DataTable | MADS-DATA-01 | Query lambat dan panggilan bridge. |
| VirtualList | MADS-DATA-02 | Console log terisolasi. |
| LogViewer | MADS-DOM-07 | Log dengan level dan timestamp. |
| Terminal | MADS-DOM-06 | Output perintah developer. |
| FilterBar | MADS-DOM-15 | Filter per app, level, dan namespace. |
| Badge | MADS-DATA-12 | Status penolakan dan durasi. |
| Alert | MADS-FBK-01 | Runtime tidak dapat diakses. |
| ExportDialog | MADS-DOM-18 | Ekspor log lokal. |

### State

| State | Perilaku |
|---|---|
| loading | Panel menampilkan status "Menghubungkan ke runtime"; tab lain nonaktif dengan alasan. |
| empty | Tidak ada app berjalan: empty state menawarkan membuka app atau memilih app dari daftar. |
| error | Runtime tidak dapat diakses menampilkan kode error dan status; app tetap berjalan dan tidak terpengaruh. |
| offline | Seluruh panel berfungsi offline karena data lokal; tidak ada request keluar. |
| permission | Analytics self-host hanya aktif setelah opt-in admin; panel lokal tidak memerlukan permission tambahan. |

### Interaksi

- Pemilihan app memfilter seluruh tab; log app A tidak pernah tercampur dengan app B.
- Retry manual pada tab Sync memicu pengiriman ulang dari cursor tanpa duplikasi mutasi.
- Payload pada tab Bridge diredaksi; detail penuh tidak tersedia bahkan untuk developer.
- `[ Rekam ]` membekukan tampilan 60 detik terakhir untuk analisis tanpa menghentikan app.
- Ekspor log menghasilkan berkas lokal dengan timestamp dan level, tanpa token atau PII.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Ctrl/Cmd+1..6` | Berpindah tab DevTools. |
| `Ctrl/Cmd+F` | Fokus filter log. |
| `Ctrl/Cmd+E` | Ekspor log tampilan aktif. |
| `Space` | Menjeda atau melanjutkan perekaman. |
| `Esc` | Menutup panel DevTools. |

### Aksesibilitas

- Grafik menyediakan ringkasan tekstual nilai terakhir, puncak, dan ambang kuota.
- Perubahan tab mengumumkan nama tab dan jumlah item melalui live region.
- Tabel query menyertakan kolom teks untuk rencana query; warna durasi bukan satu-satunya penanda.
- Log dapat dibaca baris demi baris dengan keyboard dan memiliki `aria-live="off"` agar tidak mengganggu.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.devtools.attachFailed` | DevTools tidak dapat mengakses runtime. | Alert. |
| `screen.devtools.slowQuery` | Query lambat (> 50 ms) | Judul tabel. |
| `screen.devtools.bridgeDenied` | Ditolak oleh broker | Status bridge. |
| `screen.devtools.exportLocal` | Ekspor log (lokal) | Aksi. |
| `screen.devtools.noApp` | Tidak ada micro-app berjalan | Empty state. |

### Acceptance Criteria

- Given dua app berjalan, when tab RAM dibuka, then angka terpisah ditampilkan dan penanda 80% muncul (FR-DEV-001).
- Given query 128 ms, when tab Query dibuka, then query tercatat dengan durasi dan tabel tanpa data sensitif (FR-DEV-003).
- Given tab Sync, when pengguna memilih retry, then pengiriman ulang terjadi tanpa duplikasi mutasi (FR-DEV-004).
- Given app A dan B menulis log, when tab Console dibuka, then log terisolasi per app dan ekspor menghasilkan berkas lokal (FR-DEV-006).
- Given panel dibuka, when audit jaringan dilakukan, then tidak ada request keluar dari panel (FR-DEV-002).

### Traceability

FR-DEV-001, FR-DEV-002, FR-DEV-003, FR-DEV-004, FR-DEV-005, FR-DEV-006, FR-DEV-007.

## SCR-21 — AdminConsole

| Atribut | Nilai |
|---|---|
| Route | `/admin`, `/admin/users`, `/admin/registry`, `/admin/audit`, `/admin/branding`, `/admin/health` |
| Surface | Host Shell |
| Spec utama | `03-specs/07-selfhost.md` |
| Flow terkait | `04-flows/10-selfhost-airgap.md` |

### Tujuan

Mengelola instance self-host: pengguna dan peran, policy ABAC, registry internal, branding, health dependency, workflow 24/7, plugin, dan verifikasi audit chain. Konsol MUST menegakkan RBAC/ABAC, MUST menolak aksi di luar izin, dan MUST mencatat setiap aksi sensitif pada audit berantai hash.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│ Admin · selfhost.kantor.local      ( owner )     [ Health ✓ ]   │
├──────────────────┬─────────────────────────────────────────────┤
│ ▸ Ringkasan      │ Pengguna & peran                            │
│ ▸ Pengguna       │ ┌─────────────────────────────────────────┐ │
│ ▸ Policy         │ │ Nama        Peran       Status   Terakhir│ │
│ ▸ Registry       │ │ Rina        owner       aktif    12:04   │ │
│ ▸ Branding       │ │ Budi        maintainer  aktif    11:52   │ │
│ ▸ Workflow       │ │ Sari        viewer      aktif    3 hari  │ │
│ ▸ Plugin         │ └─────────────────────────────────────────┘ │
│ ▸ Audit          │ [ Undang pengguna ]   [ Impor dari OIDC ]   │
│ ▸ Observability  │                                             │
│                  │ Kesehatan dependency                        │
│                  │ DB ✓   Storage ✓   Queue ⚠ degradasi        │
├──────────────────┴─────────────────────────────────────────────┤
│ Audit chain: 18.442 entri · ✓ terverifikasi · [ Ekspor SIEM ]  │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| AppShell | MADS-LAY-01 | Kerangka konsol admin. |
| Sidebar | MADS-NAV-01 | Navigasi modul admin. |
| DataTable | MADS-DATA-01 | Pengguna, peran, plugin, workflow run. |
| CodeEditor | MADS-DOM-04 | Editor policy JSON dan branding YAML. |
| TreeView | MADS-DATA-03 | Registry internal dan hierarki resource. |
| Switch | MADS-INP-12 | Feature flag dan plugin aktif. |
| StatCard | MADS-DATA-11 | Jumlah pengguna, run, dan error. |
| LineChart | MADS-DATA-07 | Tren error rate dan beban. |
| LogViewer | MADS-DOM-07 | Audit dan log terstruktur. |
| Badge | MADS-DATA-12 | Peran dan status dependency. |
| Alert | MADS-FBK-01 | Audit chain tidak valid atau akses ditolak. |
| Banner | MADS-FBK-03 | Mode degradasi. |
| ConfirmDialog | MADS-FBK-05 | Aksi sensitif: cabut sesi, hapus policy. |
| EmptyState | MADS-DATA-18 | Belum ada pengguna atau run. |

### State

| State | Perilaku |
|---|---|
| loading | Tabel dan health check menampilkan skeleton; navigasi modul tetap tersedia sesuai peran. |
| empty | Instance baru menampilkan empty state dengan undangan pengguna pertama dan tautan konfigurasi IdP. |
| error | Dependency gagal ditandai pada health; aksi yang membutuhkan dependency tersebut dinonaktifkan dengan alasan. |
| offline | Konsol memerlukan koneksi server; saat offline layar menampilkan status koneksi diperlukan dan tidak menyajikan data basi sebagai terkini. |
| permission | Aksi di luar peran ditolak dengan 403 dan pesan; tombol nonaktif disertai alasan, bukan disembunyikan tanpa penjelasan. |

### Interaksi

- Undangan pengguna memakai IdP OIDC/SAML/LDAP atau magic link; password lokal tidak dibuat.
- Editor policy memvalidasi JSON sebelum menyimpan dan menampilkan alasan penolakan ABAC pada audit.
- Registry internal menampilkan indeks dengan signature dan tombol sinkronisasi; format indeks sama dengan registry publik.
- Branding memvalidasi field `branding.yaml` dan menolak field tidak valid tanpa rebuild.
- Verifikasi audit chain menampilkan hasil; penghapusan entri membuat verifikasi gagal dan aksi sensitif dihentikan.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Ctrl/Cmd+K` | Command Palette admin. |
| `Arrow` | Navigasi sidebar dan tabel. |
| `Enter` | Membuka detail baris. |
| `Ctrl/Cmd+S` | Menyimpan policy atau branding yang valid. |
| `Ctrl/Cmd+Shift+A` | Membuka verifikasi audit chain. |

### Aksesibilitas

- Tabel pengguna menyertakan peran sebagai teks; status dependency dibaca sebagai "degradasi" atau "sehat".
- Aksi yang ditolak mengumumkan alasan melalui live region dan menghubungkan pesan ke tombol.
- Editor policy menyediakan pesan error dengan nomor baris dan karakter.
- Dialog aksi sensitif menyebut resource dan dampak, serta mengembalikan fokus setelah ditutup.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.admin.forbidden` | Anda tidak memiliki izin untuk aksi ini. | Pesan 403. |
| `screen.admin.degraded` | Sebagian layanan dalam mode degradasi. | Banner. |
| `screen.admin.auditVerified` | Audit chain terverifikasi ({count} entri). | Status. |
| `screen.admin.brandingInvalid` | Field branding tidak valid: {field}. | Error. |
| `screen.admin.offline` | Konsol admin memerlukan koneksi ke server. | State offline. |

### Acceptance Criteria

- Given peran `viewer`, when mencoba menghapus policy, then aksi ditolak 403 dan audit mencatat alasan (FR-SRV-016, FR-SRV-017).
- Given satu entri audit dihapus, when verifikasi dijalankan, then rantai gagal dan aksi sensitif dihentikan (FR-SRV-018).
- Given `branding.yaml` tidak valid, when disimpan, then field ditolak tanpa rebuild dan UI lama tetap berlaku (FR-SRV-020).
- Given health check, when Storage gagal, then status dependency menunjukkan degradasi tanpa membocorkan kredensial (FR-SRV-025).
- Given perangkat organisasi, when registry internal aktif, then indeks internal diprioritaskan tanpa perubahan format (FR-REG-022).

### Traceability

FR-SRV-016, FR-SRV-017, FR-SRV-018, FR-SRV-019, FR-SRV-020, FR-SRV-021, FR-SRV-025, FR-SRV-027, FR-SRV-028, FR-REG-010, FR-REG-022, FR-DEV-007.

## SCR-22 — CrashRecovery

| Atribut | Nilai |
|---|---|
| Route | Overlay global |
| Surface | Host Shell |
| Spec utama | `03-specs/03-sandbox-runtime.md` |
| Flow terkait | `04-flows/12-crash-recovery.md` |

### Tujuan

Menjadi permukaan pemulihan saat Host atau micro-app gagal: menampilkan kode error, ringkasan aman, diagnostik teredaksi, dan aksi restart, rollback, atau ekspor data. Layar MUST NOT kehilangan data pengguna dan MUST NOT menampilkan stack trace mentah yang memuat PII atau rahasia.

### Wireframe

```text
┌────────────────────────────────────────────────────────────────┐
│  Pemulihan                                                    │
├────────────────────────────────────────────────────────────────┤
│  Micro-app berhenti                                           │
│  Kode: E-SBX-003 · freeze terdeteksi setelah 5 detik          │
│                                                                │
│  Isolate dihentikan. Database dan berkas Anda tidak berubah.   │
│                                                                │
│  Diagnostik (teredaksi)                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ app_id       kasir.harian                                │  │
│  │ versi        2.1.0                                       │  │
│  │ terakhir ok  12:04:18                                    │  │
│  │ memori       96,4 MB / 128 MB                            │  │
│  │ jejak        stack trace tanpa token dan path pengguna   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  [ Mulai ulang ]  [ Rollback ]  [ Ekspor data ]  [ Lihat log ] │
│                                                                │
│  [ Salin diagnostik ]                                          │
└────────────────────────────────────────────────────────────────┘
```

### Komponen MADS

| Komponen | ID | Peran |
|---|---|---|
| ErrorBoundary | MADS-FBK-07 | Wadah permukaan pemulihan. |
| Alert | MADS-FBK-01 | Kode error dan ringkasan aman. |
| Card | MADS-LAY-05 | Blok diagnostik teredaksi. |
| LogViewer | MADS-DOM-07 | Stack trace teredaksi dan log. |
| Button | MADS-INP-01 | Restart, rollback, ekspor, salin. |
| ExportDialog | MADS-DOM-18 | Ekspor data lokal dan log. |
| Progress | MADS-DATA-16 | Progres restart atau rollback. |
| Banner | MADS-FBK-03 | Jaminan data utuh atau peringatan rollback. |
| Toast | MADS-FBK-02 | Hasil salin dan ekspor. |
| EmptyState | MADS-DATA-18 | Diagnostik tidak tersedia. |

### State

| State | Perilaku |
|---|---|
| loading | Diagnostik dikumpulkan dengan indikator; aksi restart sudah tersedia karena tidak bergantung pada diagnostik. |
| empty | Diagnostik tidak tersedia menampilkan penjelasan dan tetap menyediakan restart serta ekspor data. |
| error | Ekspor atau rollback gagal menampilkan kode error dan mempertahankan data; tidak ada percobaan ulang otomatis yang destruktif. |
| offline | Seluruh pemulihan berfungsi offline; tidak ada laporan crash yang dikirim otomatis. |
| permission | Rollback dan ekspor memerlukan konfirmasi; ekspor memakai `filesystem.picker`. |

### Interaksi

- `[ Mulai ulang ]` membuat isolate baru tanpa mengubah database; state persisten dipulihkan dan route terakhir dicoba dibuka.
- `[ Rollback ]` hanya aktif bila versi sebelumnya tersimpan; sistem membuat snapshot sebelum rollback.
- `[ Ekspor data ]` menghasilkan ekspor database dalam format terbuka meskipun isolate mati.
- `[ Lihat log ]` menampilkan stack trace teredaksi dan mengizinkan ekspor lokal.
- `[ Salin diagnostik ]` menyalin ringkasan tanpa token, kunci, atau path pengguna.

### Keyboard

| Tombol | Aksi |
|---|---|
| `Tab` | Berpindah antar tombol pemulihan. |
| `Enter` | Menjalankan aksi terpilih dengan konfirmasi bila destruktif. |
| `Esc` | Menutup tampilan log, bukan permukaan pemulihan. |
| `Ctrl/Cmd+C` | Menyalin diagnostik saat fokus pada blok diagnostik. |

### Aksesibilitas

- Permukaan memakai `role="alertdialog"` dengan fokus awal pada judul dan ringkasan kode error.
- Fokus terperangkap selama pemulihan wajib; setelah restart berhasil, fokus kembali ke app atau Home.
- Kode error dibaca sebagai teks, bukan hanya warna; tombol memiliki nama yang menjelaskan konsekuensi.
- Diagnostik panjang dapat dinavigasi per baris dan tidak diumumkan otomatis.

### Copy Keys

| Key | Contoh `id-ID` | Catatan |
|---|---|---|
| `screen.recovery.title` | Pemulihan | Judul permukaan. |
| `screen.recovery.dataSafe` | Database dan berkas Anda tidak berubah. | Jaminan. |
| `screen.recovery.restart` | Mulai ulang | Aksi utama. |
| `screen.recovery.rollbackConfirm` | Rollback ke versi {version}? Snapshot dibuat lebih dulu. | Konfirmasi. |
| `screen.recovery.exportHint` | Ekspor tetap berfungsi meski micro-app berhenti. | Bantuan ekspor. |

### Acceptance Criteria

- Given kegagalan DB worker, when permukaan tampil, then kode error, langkah pemulihan, dan tombol restart aman tersedia tanpa kehilangan data (FR-HOST-027).
- Given isolate dihentikan watchdog, when pengguna memilih restart, then isolate baru berjalan dan data SQLite tidak berubah (FR-SBX-017).
- Given log berisi token, when `[ Lihat log ]` dibuka, then token dan PII tidak tampil dan ekspor tetap lokal (FR-SBX-018).
- Given versi lama tersimpan, when rollback dijalankan, then snapshot dibuat sebelum eksekusi dan signature versi lama diverifikasi (FR-SBX-019).
- Given isolate mati, when ekspor dijalankan, then berkas database terbuka di SQLite tanpa menjalankan app (FR-SBX-020).

### Traceability

FR-HOST-027, FR-SBX-017, FR-SBX-018, FR-SBX-019, FR-SBX-020, FR-SBX-023, FR-SBX-025, FR-SYNC-023.

## Aturan Lintas Layar

### Shortcut global

| Shortcut | Aksi | Layar |
|---|---|---|
| `Ctrl/Cmd+K` | Buka Command Palette | Semua layar Host |
| `Ctrl/Cmd+,` | Buka Pengaturan | Semua layar Host |
| `Esc` | Tutup lapisan teratas (dialog, sheet, palette) | Semua layar |
| `Tab` / `Shift+Tab` | Pindah fokus dalam urutan baca | Semua layar |
| `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` | Undo / redo dalam konteks yang mendukung | Studio dan editor |
| `F6` | Pindah antar region utama | Layar dengan banyak panel |

### State global

- Banner offline global tampil di semua layar Host yang menampilkan data jaringan; Studio menampilkannya hanya pada operasi yang memerlukan jaringan.
- Indikator antrean sync dan outbox menggunakan angka yang sama di Home, AppRunner, dan DevTools; tidak ada penghitungan ganda.
- Error surface global memakai kode dari `03-specs/error-codes.md` dan tidak pernah menampilkan stack trace mentah.
- Dialog consent, permission, dan crash recovery selalu berada di lapisan teratas dengan fokus terperangkap.

### Batas kepemilikan

Layar pada dokumen ini adalah kontrak presentasi. Komponen dan token didefinisikan di `02-design/component-catalog.md` dan `02-design/design-system.md`; perilaku sistem didefinisikan di `03-specs/*`; urutan langkah rinci didefinisikan di `04-flows/*`. Perubahan pada salah satunya MUST disertai pembaruan acceptance criteria layar terkait agar traceability tetap utuh.
