---
id: DESIGN-INTERACTION
title: Pola Interaksi
status: accepted
owner: design
prd_refs: ["§3 Modul 1", "§6"]
---

# Pola Interaksi

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menetapkan pola interaksi kanonik yang dipakai ulang di seluruh layar: drag-and-drop, command palette, peta shortcut, manajemen fokus, gesture mobile, split view/PiP, notification center, dialog consent, aksi destruktif, status offline/sync, pemulihan error, context menu, drag file, dan durasi toast. Setiap pola MUST memiliki padanan keyboard dan MUST dapat dibatalkan.

Di luar lingkup: tata letak layar ([information-architecture.md](information-architecture.md)), nilai token ([design-system.md](design-system.md)), dan anatomi komponen ([component-catalog.md](component-catalog.md)).

## 2. Prinsip

| Prinsip | Aturan operasional |
|---|---|
| Direct manipulation | Objek mengikuti pointer tanpa jeda; pratinjau setara hasil akhir. |
| Predictable | Aksi yang sama menghasilkan hasil sama di web dan native. |
| Reversible | Setiap aksi non-kritis dapat dibatalkan selama 10 detik; aksi kritis memerlukan konfirmasi. |
| Keyboard parity | Setiap pola pointer memiliki jalur keyboard yang terdokumentasi (NFR-A11Y-002). |
| No dark patterns | Tidak ada auto-focus pada aksi destruktif, pre-checked consent, atau tombol menipu. |
| Interruptible | Animasi dan operasi panjang dapat dibatalkan tanpa kehilangan data. |

## 3. Drag-and-Drop

### 3.1 Palette ke Canvas (Studio)

| Aspek | Ketentuan |
|---|---|
| Aktivasi | Pointer down + gerak ≥ 6 px; klik tanpa gerak memilih komponen, bukan menyeret |
| Pratinjau | Ghost 40% opacity mengikuti pointer; insertion line 2 px memakai `--mads-color-primary` |
| Target | Hanya container yang menerima children; target tidak valid menampilkan kursor `not-allowed` dan ghost merah |
| Auto-scroll | Tepi 24 px dari viewport kanvas, kecepatan proporsional jarak |
| Drop | Menyisipkan node + patch AST dalam < 100 ms (FR-STU-011); satu langkah undo |
| Batal | `Esc` atau drop di luar target mengembalikan state tanpa perubahan |
| Keyboard | Fokus palette → `Enter` menambah ke container terpilih; `Alt+Arrow` memindahkan node antar-sibling; `Tab` berpindah target |
| A11y | Live region mengumumkan "Menambahkan Button ke Container, posisi 3 dari 5" |

### 3.2 Reorder dan Resize

| Aspek | Ketentuan |
|---|---|
| Reorder pointer | Aktivasi 6 px; item lain bergeser dengan durasi 180 ms; placeholder mempertahankan tinggi |
| Reorder sentuh | Long-press 300 ms + getar ringan; tanpa long-press, gesture diperlakukan sebagai scroll |
| Resize | Handle 8 px visual dengan area sentuh 24 × 24 px; `Shift` mengunci rasio; `Alt` dari pusat |
| Grid | Snap ke 4 px; menampilkan garis bantu saat dalam 4 px |
| Batas | Lebar/tinggi minimum 16 px; melewati batas menampilkan nilai minimum, bukan error |
| Keyboard reorder | `Alt+Arrow` memindahkan 1 posisi; `Alt+Shift+Arrow` memindahkan 8 px pada resize |
| Undo | Setiap drop/reorder/resize adalah satu entri undo berlabel ("Pindahkan Card") |

Kanban memakai pola reorder yang sama; drop antar-kolom MUST memperbarui field status dalam satu mutasi. Tabel MUST NOT memakai drag untuk seleksi baris.

## 4. Command Palette

| Aspek | Ketentuan |
|---|---|
| Buka/tutup | `Mod+K` membuka dalam < 100 ms; `Esc` menutup; klik backdrop menutup (FR-HOST-011) |
| Isi awal | Aksi kontekstual layar aktif, app terakhir, dan 5 perintah terakhir |
| Prefiks | `>` aksi, `@` micro-app, `#` record, `:` registry, `/` berkas |
| Navigasi | `ArrowUp`/`ArrowDown`, `Home`/`End`, `Enter` menjalankan, `Mod+Enter` menjalankan aksi utama konteks (buka hasil di pane baru bila split tersedia) |
| Grup | Aksi, Navigasi, App, Record, Registry; maksimum 5 hasil per grup |
| Empty | Menampilkan 5 saran; ketikan tanpa hasil menawarkan pencarian seluruh record dengan query tersebut |
| Fokus | Fokus masuk ke input; saat ditutup, fokus kembali ke elemen pemicu |
| A11y | Combobox + listbox dengan `aria-activedescendant`; hasil diumumkan jumlahnya, bukan seluruh isi |
| Offline | Perintah registry yang butuh jaringan ditandai "butuh jaringan" dan dinonaktifkan, bukan disembunyikan |

## 5. Peta Shortcut

`Mod` berarti `Cmd` pada macOS dan `Ctrl` pada Windows/Linux. Shortcut MUST NOT bertabrakan dengan shortcut OS; konflik ditampilkan di panel bantuan. Shortcut yang sama MAY memiliki arti berbeda per konteks selama konteksnya terlihat (mis. `Mod+N` pada Home versus DataDesigner) dan MUST tercantum di panel bantuan sesuai konteks aktif.

| Shortcut | Aksi | Cakupan |
|---|---|---|
| `Mod+K` | Buka/tutup command palette | Global |
| `Mod+S` | Simpan, lint, dan format | Studio, editor |
| `Mod+Z` | Undo | Global (dalam konteks editable) |
| `Mod+Shift+Z` | Redo | Global (dalam konteks editable) |
| `Esc` | Tutup lapisan teratas, batalkan drag, keluar dari mode | Global |
| `Tab` / `Shift+Tab` | Pindah fokus maju/mundur | Global |
| `Mod+P` | Quick open berkas | Studio |
| `Mod+Shift+F` | Cari di seluruh project | Studio |
| `Mod+B` | Toggle sidebar pada Host; toggle file tree pada editor | Host, Studio |
| `Mod+N` | Buat baru sesuai konteks: micro-app, project, atau tabel | Host, Studio, DataDesigner |
| `Mod+O` | Impor `.mapp` atau repo Git sebagai draft | StudioDashboard |
| `Mod+W` | Tutup micro-app/pane aktif | Host |
| `Mod+R` | Muat ulang micro-app setelah konfirmasi; refresh daftar setelah timeout | Host, list |
| `Mod+D` | Duplikasi node terpilih | Canvas |
| `Mod+1` … `Mod+4` | Beralih breakpoint mobile, tablet, desktop, widget | Canvas |
| `Mod+Shift+P` | Pack project; pratinjau DDL pada DataDesigner | StudioDashboard, DataDesigner |
| `Mod+Enter` | Jalankan aksi utama konteks: buka hasil palette, terapkan migrasi, uji workflow | Palette, DataDesigner, WorkflowEditor |
| `Mod+Alt+P` | Toggle panel properti | Studio |
| `Mod+/` | Panel daftar shortcut | Global |
| `Shift+F10` | Context menu pada elemen fokus | Global |
| `F6` | Pindah antar-region (sidebar, konten, panel) | Global |
| `Alt+Arrow` | Pindah fokus/node sesuai konteks | Canvas, list |
| `Space` | Aktifkan kontrol fokus; pada kanvas memasuki mode select | Global |

Aturan: shortcut MUST diabaikan saat fokus berada di input teks kecuali `Mod+K`, `Mod+S`, `Esc`, dan `Mod+/`. Shortcut yang tidak tersedia MUST muncul nonaktif dengan alasan di panel bantuan.

## 6. Fokus dan Keyboard

| Pola | Ketentuan |
|---|---|
| Focus ring | 2 px `--mads-color-focus` + offset 2 px; selalu terlihat, termasuk pada mouse |
| Focus trap | Modal, dialog consent, dan sheet menahan fokus sampai ditutup |
| Initial focus | Field pertama pada form; tombol netral (`Batal`/`Deny`) pada dialog destruktif |
| Focus restore | Fokus kembali ke pemicu setelah overlay ditutup; jika pemicu hilang, ke heading layar |
| Roving tabindex | Grid, tab, toolbar, dan menu memakai satu tab stop dengan panah |
| Skip link | "Lewati ke konten" adalah elemen fokus pertama |
| Esc | Menutup lapisan teratas; jika ada perubahan belum tersimpan, tampilkan konfirmasi simpan |
| Region | `F6` memindahkan fokus antar-region; urutan mengikuti layout visual |

## 7. Gesture Mobile

| Gesture | Aksi | Batas dan konflik |
|---|---|---|
| Swipe dari tepi kiri | Kembali | Mengikuti gesture OS; tidak dipakai jika ada drawer |
| Swipe kiri pada baris | Tampilkan aksi (pin, hapus) | Hapus memerlukan konfirmasi atau undo 10 detik |
| Long-press 500 ms | Context menu / mode seleksi | Setelah 300 ms pada item draggable, long-press menjadi drag |
| Pull-to-refresh | Memicu sync atau cek update | Hanya pada daftar yang mendukung; bukan pada editor |
| Pinch | Zoom kanvas, gambar, peta | Dua jari; satu jari tetap pan |
| Double-tap | Zoom ke fit | Hanya pada kanvas dan media |
| Swipe bawah pada sheet | Tutup sheet | Dibatalkan jika sheet berisi perubahan belum tersimpan |

Gesture MUST NOT menjadi satu-satunya cara mencapai aksi; setiap gesture memiliki tombol atau item menu padanan.

## 8. Split View dan PiP

| Interaksi | Ketentuan |
|---|---|
| Membuat split | Seret tab/app ke tepi kiri/kanan melewati 64 px; preview 50/50 muncul sebelum drop |
| Divider | Dapat diseret; double-click mengembalikan 50/50; batas 360 px per pane |
| Menutup pane | Tombol tutup pane; app tetap hidup dan kembali ke tab |
| PiP | Seret keluar jendela atau pilih "Picture-in-Picture"; ukuran minimum 320 × 180 |
| PiP fokus | Klik memberi fokus input; di luar itu PiP read-only dan tetap diperbarui |
| State | Satu instance state per app (FR-HOST-013); membuka app yang sama di pane lain memfokuskan instance |
| Keyboard | `Mod+\` membagi pane; `Mod+Shift+\` menutup pane; `F6` berpindah pane |
| Mobile | Split dan PiP jendela tidak tersedia; PiP video dalam app tetap mengikuti pola yang sama |

## 9. Notification Center

| Aspek | Ketentuan |
|---|---|
| Struktur | Grup per app, urut terbaru; badge jumlah belum dibaca pada ikon lonceng |
| Item | Ikon app, judul, isi ringkas, waktu relatif, aksi utama maksimum dua |
| Aksi | Buka app pada route terkait, tandai dibaca, hapus; aksi tersedia via keyboard |
| Prioritas | Permission, keamanan, dan error sinkronisasi MUST NOT auto-dismiss |
| Retention | 30 hari atau 100 item terakhir; notifikasi keamanan disimpan di audit terpisah |
| Offline | Notifikasi lokal tetap dijadwalkan dan dibunyikan (FR-HOST-018) |
| A11y | Diumumkan melalui live region `polite`; `assertive` hanya untuk error keamanan |

## 10. Dialog Consent dan Permission

| Elemen | Ketentuan |
|---|---|
| Isi wajib | Nama app, permission ID, risk tier, alasan dari manifest, cakupan (sekali/selamanya) |
| Aksi | `Allow once`, `Allow`, `Deny`; `Deny` adalah fokus awal dan gaya netral (SEC-015) |
| Risk tinggi | `network.allowlist` menampilkan daftar domain dan peringatan IP privat; aksi `Allow` memerlukan klik kedua |
| Asal dialog | Hanya broker Host; micro-app MUST NOT merender dialog yang menyerupai consent Host |
| Penolakan | App menerima error terstruktur dan MUST menampilkan fallback, bukan dialog berulang |
| Pencabutan | Berlaku segera tanpa restart (SEC-016); app diberi notifikasi grant dicabut |
| Mock/offline cage | Badge permanen di UI app saat mock atau offline cage aktif |
| Audit | Setiap keputusan tercatat tanpa payload sensitif |

## 11. Aksi Destruktif

| Tingkat | Contoh | Pola |
|---|---|---|
| Reversible | Hapus catatan, keluarkan widget | Langsung eksekusi + toast undo 10 detik; setelah 10 detik final dan tercatat di audit |
| Konfirmasi | Hapus project, cabut grant, hapus peer | Dialog konfirmasi dengan ringkasan dampak dan tombol destruktif di kanan |
| Konfirmasi ganda | Hapus workspace, hapus Vault, rollback versi | Dialog + ketik nama resource; tombol aktif hanya setelah cocok |
| Tidak dapat dibatalkan | Hapus Recovery Phrase lama | Dijelaskan sebelum aksi; tidak ada undo; wajib konfirmasi ganda |

Aturan: tombol destruktif MUST NOT menjadi fokus awal; label MUST menyebut objek ("Hapus workspace Keluarga"), bukan "OK". Undo MUST memulihkan data dan referensi (folder, pin, grant), bukan hanya baris tabel. Aksi yang sudah melewati 10 detik MUST tercatat di audit lokal.

## 12. Status Offline dan Sync

| Elemen | Ketentuan |
|---|---|
| Offline banner | Tinggi 32 px di bawah header, teks + ikon, tidak menutupi konten; dapat ditutup per sesi |
| Indikator tertunda | Angka operasi `sync`/outbox pada banner dan ikon status (FR-HOST-026) |
| Status sync | Pill: `synced`, `syncing`, `pending`, `offline`, `degraded`; warna + label teks |
| Antrean | Daftar operasi tertunda dapat dibuka; item gagal menampilkan alasan dan retry manual |
| Konflik | Banner konflik dengan tautan ke resolusi; tidak memblokir app lain |
| Read-only | Banner terpisah; aksi tulis nonaktif dengan tooltip alasan |

Banner MUST NOT muncul untuk kegagalan sesaat < 2 detik; status berubah setelah dua percobaan gagal.

## 13. Pemulihan Error

| Konteks | Pola |
|---|---|
| Field | Pesan inline di bawah field, `aria-describedby`, fokus tetap di field |
| Panel/widget | Inline error dengan kode `E-*`, aksi `Coba lagi`, bagian lain tetap hidup |
| Micro-app crash | Error boundary di dalam frame app: kode, penyebab ringkas, `Restart`, `Rollback`, `Export data` |
| Shell fatal | Error surface layar penuh (FR-HOST-027), tanpa menghapus data; aksi `Restart` dan `Salin diagnostik` |
| Sync gagal | Status `degraded`, antrean dipertahankan, retry dengan backoff |
| AI gagal | Tampilkan penyebab dan opsi ganti model secara eksplisit; tanpa perpindahan provider diam-diam |

Retry MUST idempoten; menekan retry dua kali MUST NOT membuat duplikat record atau job. Diagnostik yang disalin MUST sudah diredaksi dari PII, path pengguna, dan token.

## 14. Context Menu

| Aspek | Ketentuan |
|---|---|
| Pemicu | Klik kanan, long-press 500 ms, `Shift+F10`, tombol Menu |
| Posisi | Di pointer; digeser agar tidak keluar viewport; tinggi maksimum 320 px dengan scroll |
| Isi | Aksi utama maksimum 7 item; item destruktif di akhir, dipisah divider |
| Submenu | Maksimum satu level; terbuka dengan `ArrowRight`, tutup dengan `ArrowLeft` |
| Keyboard | Panah navigasi, `Enter` eksekusi, `Esc` tutup, fokus kembali ke pemicu |
| Konteks | Menu menampilkan aksi yang valid untuk state saat ini; aksi tidak valid disembunyikan, bukan dinonaktifkan tanpa alasan |

## 15. Drag File

| Skenario | Perilaku |
|---|---|
| Seret file ke canvas | Menambahkan aset dan node media; tipe divalidasi sebelum menerima drop |
| Seret `.mapp` ke Home | Membuka SCR-14 dengan verifikasi signature dan consent permission; MUST NOT langsung mengeksekusi |
| Seret file ke editor | Menyisipkan path aset, bukan isi biner |
| Seret dari OS ke Vault | Membuat item Vault baru setelah konfirmasi |
| Target tidak valid | Overlay menolak dengan alasan tipe/ukuran |
| Ukuran besar | Menampilkan progres transfer dan opsi batal; timeout transfer 60 detik |
| Keyboard | Tombol "Pilih berkas" membuka file picker native; drop bukan satu-satunya jalur |

## 16. Toast dan Durasi

| Jenis | Durasi | Dismiss | Catatan |
|---|---|---|---|
| Info | 4 detik | Klik, `Esc` | Maksimum 3 toast bertumpuk |
| Sukses | 4 detik | Klik, `Esc` | Tidak berbunyi |
| Peringatan | 6 detik | Klik, `Esc` | Tetap terlihat saat hover/fokus |
| Error | Sampai ditutup | Klik, `Esc` | Fokus tidak dipindahkan otomatis |
| Undo | 10 detik | Klik "Undo" | Timer berhenti saat hover/fokus keyboard |
| Progres | Sampai selesai | Batal jika didukung | Menampilkan persentase jika diketahui |

Toast MUST NOT menutupi kontrol utama, MUST NOT menjadi satu-satunya tempat informasi penting, dan MUST diumumkan melalui live region. Maksimum satu toast undo aktif; aksi berikutnya menyelesaikan undo sebelumnya.

## 17. Referensi

- [design-system.md](design-system.md)
- [information-architecture.md](information-architecture.md)
- [screen-specs.md](screen-specs.md)
- [component-catalog.md](component-catalog.md)
- [01-host-shell.md](../03-specs/01-host-shell.md)
- [02-studio-ide.md](../03-specs/02-studio-ide.md)
- [permissions.md](../03-specs/permissions.md)
- [nfr.md](../03-specs/nfr.md)
