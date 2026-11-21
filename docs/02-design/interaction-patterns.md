---
id: DESIGN-INTERACTION
title: Pola Interaksi
status: accepted
owner: design
prd_refs: ["§4", "§6"]
---

# Pola Interaksi

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menetapkan perilaku interaksi yang konsisten di seluruh layar: gerak clay, drag-and-drop, command palette, edit inline, autosave, undo/redo, lapisan, toast, consent, aksi destruktif, confetti, dan coachmark. Layar yang memakai pola ini ada di [screen-specs.md](screen-specs.md); token gerak dan bayangan ada di [design-system.md](design-system.md), dengan `DESIGN.md` di root repo sebagai sumber visual kanonik.

Di luar: perilaku network dan sandbox ([03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md)), aturan aksesibilitas menyeluruh ([accessibility.md](accessibility.md)), dan copy ([content-i18n.md](content-i18n.md)).

## 2. Prinsip

| Prinsip | Konsekuensi |
|---|---|
| Umpan balik sebelum hasil | Setiap kontrol memberi respons visual dalam ≤ 120 ms, tanpa menunggu data. |
| Gerak tidak memblokir | Animasi maksimum 320 ms dan tidak pernah menahan input; aksi sudah berlaku saat tombol dilepas. |
| Spring, bukan bounce | Gerak kembali memakai `--mads-ease-clay` dengan overshoot ≤ 2%. |
| Satu lapisan fokus | Hanya satu modal/sheet aktif; lapisan baru menutup atau menumpuk secara eksplisit. |
| Dapat dibatalkan | Aksi yang berjalan > 400 ms memiliki jalur batal atau undo. |
| Default aman | Consent dan aksi destruktif memilih opsi paling tidak berisiko. |

## 3. Skala Gerak

| Token | Durasi | Penggunaan |
|---|---|---|
| `--mads-duration-micro` | 120 ms | Micro feedback: hover ikon, command palette terbuka, ripple |
| `--mads-duration-control` | 180 ms | Kontrol: hover lift, release, toast, switch |
| `--mads-duration-panel` | 240 ms | Panel: modal, sheet, inspector, dropdown |
| `--mads-duration-page` | 320 ms | Transisi halaman dan masuknya layar |

| Easing | Nilai | Penggunaan |
|---|---|---|
| `--mads-ease-standard` | `cubic-bezier(.2,0,0,1)` | Gerak masuk, opacity, slide |
| `--mads-ease-clay` | `cubic-bezier(.34,1.56,.64,1)` | Release spring, hover lift kembali |

Aturan: durasi `0` dipaksa saat `prefers-reduced-motion: reduce`; transform dihapus, hanya opacity ≤ 120 ms yang tersisa (NFR-A11Y-003).

## 4. Hover, Press, dan Release

| State | Properti | Nilai | Durasi |
|---|---|---|---|
| Hover | `transform` | `translateY(-2px)` | 180 ms |
| Hover | `box-shadow` | `--mads-clay-shadow-1` → `--mads-clay-shadow-2` | 180 ms |
| Press | `transform` | `scale(.97) translateY(1px)` | 90 ms `ease-out` |
| Press | `box-shadow` | `--mads-clay-shadow-pressed` | 90 ms |
| Release | `transform` | kembali ke `none` | 180 ms `--mads-ease-clay` |
| Focus-visible | `outline` | 3 px `--mads-color-focus`, offset 2 px | 0 ms |

```css
.clay-button {
  border-radius: var(--mads-radius-clay-md);
  background: var(--mads-color-primary);
  color: var(--mads-color-on-primary);
  box-shadow: var(--mads-clay-shadow-1);
  transition:
    transform var(--mads-duration-control) var(--mads-ease-standard),
    box-shadow var(--mads-duration-control) var(--mads-ease-standard);
}

.clay-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--mads-clay-shadow-2);
}

.clay-button:active {
  transform: scale(.97) translateY(1px);
  box-shadow: var(--mads-clay-shadow-pressed);
  transition-duration: 90ms;
}

@media (hover: none) {
  .clay-button:hover { transform: none; box-shadow: var(--mads-clay-shadow-1); }
}
```

Hover lift tidak berlaku pada perangkat sentuh. Press selalu berlaku. Kartu yang dapat diklik memakai pola yang sama; kartu statis hanya mengubah `box-shadow` 1 → 2 tanpa transform.

## 5. Drag and Drop

| Tahap | Perilaku |
|---|---|
| Ambil | Setelah gerak 4 px, item menjadi ghost dengan `rotate(1.5deg) scale(1.02)`, `--mads-clay-shadow-3`, opacity 0.9. |
| Seret | Item asli memakai placeholder setinggi item dengan border putus-putus `--mads-color-border`. |
| Target valid | Drop indicator 2 px `--mads-color-primary` muncul di antara node; label "Lepas di sini" untuk pembaca layar. |
| Target invalid | Drop indicator hilang, kursor `not-allowed`, dan pelepasan memicu `E-STUDIO-003`. |
| Lepas | Ghost menghilang 120 ms, node masuk dengan fade 180 ms; undo tersedia. |
| Batal | `Esc` mengembalikan item ke posisi awal tanpa perubahan dokumen. |

Drag pada keyboard: fokus node, `Alt+Panah` memindah urutan, `Alt+Shift+Panah` memindah antar-container. Setiap perpindahan diumumkan dengan posisi baru ("Kartu dipindah ke posisi 2 dari 5").

## 6. Command Palette

- Dibuka dengan `Cmd/Ctrl+K` dari layar mana pun, termasuk builder dan runner.
- Terbuka dalam 120 ms; input langsung fokus; hasil fuzzy dikelompokkan: Navigasi, Aksi, App, Project.
- `Panah` memindah pilihan, `Enter` menjalankan, `Esc` menutup, `Tab` tidak keluar dari palette.
- Aksi yang tidak tersedia ditampilkan `disabled` dengan alasan, bukan disembunyikan tanpa penjelasan.
- Setiap aksi memiliki shortcut yang terlihat; konflik shortcut diselesaikan di dokumen ini.
- Palette tidak menampilkan data rahasia; item Vault terkunci tidak masuk hasil.

## 7. Inline Edit dan Autosave

| Perilaku | Aturan |
|---|---|
| Masuk edit | Klik teks atau `Enter` pada node terpilih; input menggantikan teks di tempat, tanpa panel baru. |
| Commit | `Enter` atau blur menyimpan nilai; `Esc` membatalkan dan mengembalikan nilai lama. |
| Autosave | 500 ms setelah perubahan terakhir (debounce); status **Menyimpan...** lalu **Tersimpan**. |
| Status gagal | `E-STUDIO-002` dengan banner retry; antrean lokal dipertahankan. |
| Nama project | Rename inline di top bar; tidak ada modal penamaan (FR-CREATE-010). |
| Guard keluar | Jika autosave belum selesai, tampilkan konfirmasi; draft tidak pernah dibuang otomatis. |

Autosave tidak diumumkan setiap ketikan; live region hanya mengumumkan transisi ke **Tersimpan** atau **Gagal menyimpan**.

## 8. Undo dan Redo

- Riwayat menyimpan 100 langkah per dokumen builder (FR-STUDIO-010).
- `Cmd/Ctrl+Z` undo, `Cmd/Ctrl+Shift+Z` redo; tombol toolbar memakai ikon yang sama.
- Setiap entri memiliki label aksi ("Tambah Kartu", "Ubah Radius", "Hapus Tombol") dan ditampilkan di toast setelah undo/redo.
- Perubahan nama dan urutan node ikut dalam riwayat; perubahan preferensi tampilan tidak.
- Riwayat dibersihkan saat project ditutup; tidak disimpan ke disk.
- Undo setelah autosave tetap berlaku pada sesi yang sama.

## 9. Lapisan: Modal, Sheet, dan Popover

| Lapisan | Masuk | Keluar | Fokus |
|---|---|---|---|
| Modal | Backdrop fade 180 ms; panel `scale(.96) → 1` 240 ms | `Esc`, tombol tutup, atau aksi selesai; fade 180 ms | Terperangkap; kembali ke pemicu |
| Sheet bawah | Slide up 240 ms dari bawah | `Esc`, drag handle ke bawah, backdrop | Terperangkap; kembali ke pemicu |
| Sheet samping | Slide in 240 ms dari kanan (tablet/desktop) | `Esc`, backdrop | Terperangkap bila modal; tidak bila non-modal |
| Popover | Fade + `translateY(-4px)` 180 ms | Klik luar, `Esc` | Fokus tetap di pemicu kecuali berisi input |
| Toast | Slide/fade 180 ms | Otomatis atau tombol tutup | Tidak menangkap fokus |

Aturan: backdrop memakai `backdrop-filter: blur(8px)` plus overlay 24% `--mads-color-fg`; hanya satu backdrop aktif. Modal kedua menutup modal pertama atau menggantikannya, tidak menumpuk dua backdrop.

## 10. Toast, Banner, dan Live Region

| Elemen | Durasi | Perilaku |
|---|---|---|
| Toast sukses | 4 detik | Pause saat hover atau fokus; tombol tutup selalu ada; maksimum 3 toast terlihat. |
| Toast error | Persisten sampai ditutup | Memuat kode `E-*`, ringkasan, dan satu aksi. |
| Banner | Persisten selama kondisi | Offline, storage > 80%, atau restore berjalan; tidak menutupi konten. |
| Live region | — | `polite` untuk status simpan/pencarian; `assertive` hanya untuk crash dan kehilangan data. |

Toast tidak boleh menjadi satu-satunya tempat informasi penting. Setiap pesan error juga tersedia di surface layar terkait.

## 11. Consent

- Dialog consent muncul hanya untuk permission yang dideklarasikan dan belum di-grant (SEC-002, SEC-003).
- Urutan aksi: **Tolak** (kiri, default fokus), **Izinkan sekali**, **Selalu izinkan**.
- `Esc`, klik backdrop, dan tombol tutup sama dengan **Tolak**; tidak ada grant tersimpan.
- Risk tier ditampilkan sebagai teks dan ikon: rendah, sedang, tinggi. Permission network selalu tinggi saat cage nonaktif.
- Penjelasan memakai bahasa pengguna, bukan nama method internal.
- Grant `always` tidak memunculkan dialog berulang; revoke berlaku pada panggilan berikutnya.
- Offline Cage aktif secara default; permintaan network ditolak dengan `E-NET-001` sebelum consent (SEC-004).

## 12. Aksi Destruktif

| Aksi | Konfirmasi | Perlindungan |
|---|---|---|
| Hapus komponen | Tidak ada dialog; undo 100 langkah | Toast dengan **Urungkan** |
| Uninstall app | Dialog konfirmasi | Opsi **Ekspor data** sebelum hapus; nama app disebut |
| Reset data lokal | `alertdialog` dengan pengetikan kata konfirmasi | Ekspor ditawarkan; tidak dapat dijalankan dengan `Enter` saja |
| Hapus package lama | Dialog konfirmasi | Menyebut versi; rollback tidak tersedia setelahnya |
| Revoke permission | Dialog konfirmasi ringan | Menjelaskan efek pada app yang sedang berjalan |

Tombol destruktif memakai `--mads-color-error` sebagai teks atau border, bukan sebagai satu-satunya penanda. Fokus awal berada pada **Batal**, dan tombol destruktif tidak pernah menjadi aksi default `Enter`.

## 13. Confetti dan Coachmark

| Pola | Aturan |
|---|---|
| Confetti | Hanya setelah micro-app pertama berhasil dibuat; 800 ms; tidak muncul lagi pada app berikutnya; `prefers-reduced-motion` meniadakannya sepenuhnya. |
| Coachmark | Maksimum 3 langkah, masing-masing satu kalimat; dapat ditutup kapan saja; tidak muncul lagi setelah selesai atau ditutup. |
| Highlight | Sorotan memakai ring `--mads-color-focus`, bukan overlay gelap penuh. |
| Penempatan | Coachmark tidak menutupi aksi utama; pada mobile muncul sebagai sheet bawah. |

Confetti dan coachmark tidak boleh menghalangi input, tidak memicu request, dan tidak disimpan sebagai state yang memblokir layar.

## 14. Peta Keyboard

| Shortcut | Aksi | Konteks |
|---|---|---|
| `Cmd/Ctrl+K` | Buka command palette | Global |
| `Esc` | Tutup lapisan teratas, batalkan edit, atau tolak consent | Global |
| `Enter` | Aktifkan kontrol atau commit inline edit | Global |
| `Space` | Aktifkan tombol/checkbox | Global |
| `Tab` / `Shift+Tab` | Pindah fokus | Global |
| `Cmd/Ctrl+Z` | Undo | Builder |
| `Cmd/Ctrl+Shift+Z` | Redo | Builder |
| `Cmd/Ctrl+Enter` | Buat dari prompt atau apply rencana | Create |
| `Alt+Panah` | Pindah urutan node | Builder |
| `Alt+Shift+Panah` | Pindah node antar-container | Builder |
| `?` | Buka daftar shortcut | Global |

Shortcut tidak boleh bentrok dengan pintasan browser yang tidak dapat dicegah. Setiap aksi juga tersedia lewat UI yang dapat diklik.

## 15. Reduced Motion

Saat `prefers-reduced-motion: reduce` aktif:

- Semua durasi transform menjadi 0 ms; hover lift, press scale, ghost drag, dan blob animation dihapus.
- Modal dan sheet muncul tanpa scale/slide; hanya opacity ≤ 120 ms.
- Confetti tidak dirender; coachmark tetap muncul tanpa animasi.
- Status tetap terbaca karena perubahan warna dan teks tidak bergantung pada gerak.
- Pengaturan **Kurangi animasi** di Settings memaksa perilaku yang sama tanpa mengubah preferensi OS.

## 16. Referensi

- [design-system.md](design-system.md)
- [screen-specs.md](screen-specs.md)
- [accessibility.md](accessibility.md)
- [content-i18n.md](content-i18n.md)
- [02-studio.md](../03-specs/02-studio.md)
- [permissions.md](../03-specs/permissions.md)
- [FLOW-03 Edit & Preview](../04-flows/03-edit-preview.md)
- [FLOW-06 Permission Consent](../04-flows/06-permission-consent.md)
