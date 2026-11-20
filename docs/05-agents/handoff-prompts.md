---
id: AGENT-HANDOFF
title: Prompt Handoff
status: accepted
owner: governance
prd_refs: ["§7.2"]
---

# Prompt Handoff

Dokumen ini menyediakan format context package dan prompt siap pakai untuk menyerahkan pekerjaan antar agen, antar peran, atau dari agen ke manusia. Prompt MUST dapat dijalankan tanpa akses ke percakapan sebelumnya.

## 1. Prinsip

1. **Mandiri.** Penerima MUST dapat menyelesaikan tugas hanya dari prompt dan berkas yang ditunjuk.
2. **Berbasis path.** Semua rujukan memakai path repo; kutipan isi berkas hanya bila berkas tidak dapat diakses.
3. **Dapat diverifikasi.** Acceptance ditulis sebagai hasil yang dapat diamati dan perintah yang harus dijalankan.
4. **Minimal.** Context package SHOULD muat dalam satu halaman; detail dipindahkan ke dokumen hulu yang ditautkan.
5. **Tanpa keputusan terbuka tersembunyi.** Pertanyaan yang belum terjawab ditulis eksplisit, bukan diserahkan pada tebakan penerima.

## 2. Context Package

Setiap handoff MUST memuat field berikut.

| Field | Isi | Aturan |
|---|---|---|
| Tujuan | Satu kalimat hasil akhir yang diinginkan | Menggunakan kata kerja dan objek yang terukur |
| Path | Berkas yang boleh diubah dan yang hanya dibaca | Path relatif dari root repo; sebut path terlarang bila perlu |
| Kontrak | Requirement, acceptance, dan interface yang mengikat | Tautkan spec dan flow; sebut ID requirement |
| Acceptance | Kondisi lulus yang dapat diamati | Minimal satu, ditulis Given/When/Then atau daftar periksa |
| Larangan | Batas yang tidak boleh dilanggar | Sebut invariant yang relevan dari [AGENTS.md](AGENTS.md) |
| Status | Keadaan sekarang: apa yang sudah ada dan apa yang belum | Merujuk `00-foundation/implementation-status.md`, bukan ingatan |
| Artefak | Berkas, branch, PR, atau hasil yang sudah dibuat | Path atau nomor PR; tanpa artefak berarti tulis "belum ada" |
| Pertanyaan terbuka | Hal yang butuh keputusan manusia | Setiap pertanyaan menyebut pemilik keputusan |
| Verifikasi | Perintah yang harus dijalankan dan bukti yang dikembalikan | Perintah nyata dari [AGENTS.md](AGENTS.md) §4 |

## 3. Template

```text
# Context Package

## Tujuan
<hasil akhir dalam satu kalimat>

## Path
Boleh diubah: <path>
Hanya dibaca: <path>

## Kontrak
Spec: <docs/path.md> — <ID requirement>
Flow: <docs/04-flows/path.md>
ADR terkait: <docs/01-architecture/adr/NNNN-*.md atau "tidak ada">
Aturan kode: <docs/07-rules/*.md>
Skill: <docs/06-skills/<nama>/SKILL.md>

## Acceptance
- <kondisi lulus 1, dapat diamati>
- <kondisi lulus 2, dapat diamati>

## Larangan
- <larangan 1, mis. tanpa new Function, tanpa dependency baru>
- <larangan 2, mis. jangan mengubah spec di PR ini>

## Status
Sudah ada: <fakta terverifikasi>
Belum ada: <gap>

## Artefak
- Branch: <nama atau "belum ada">
- PR: <nomor atau "belum ada">
- Berkas terkait: <path>

## Pertanyaan terbuka
- <pertanyaan> → pemilik keputusan: <peran>

## Verifikasi
Jalankan: <perintah>
Kembalikan: <bukti yang diminta, mis. exit code dan ringkasan>
```

## 4. Aturan Penulisan Prompt

- Prompt MUST menyebut peran yang dijalankan dan reviewer yang akan menilai hasil.
- Prompt MUST menyebut kelas perubahan (docs-only, perilaku, kontrak) agar penerima tahu apakah RFC diperlukan.
- Acceptance MUST NOT berbunyi "berfungsi dengan baik" atau "sesuai harapan"; ganti dengan kondisi yang dapat diuji.
- Larangan MUST menyebut API dan pola terlarang yang relevan: `new Function`, `eval`, `innerHTML` tanpa sanitasi, secret di client, telemetry default.
- Prompt MUST NOT meminta penerima membaca seluruh PRD; sebut `§` atau bagian spec yang relevan.
- Prompt MUST NOT menyertakan isi rahasia, kredensial, atau data pengguna nyata pada contoh.
- Prompt MUST NOT merujuk percakapan, nama sesi, atau keputusan lisan; keputusan yang belum tertulis harus menjadi pertanyaan terbuka.

## 5. Prompt Siap Pakai

### 5.1 Implementasi

```text
Kamu adalah agen implementasi pada repo microapp-studio. Jalankan peran <peran>.

Tujuan: <hasil akhir satu kalimat>.

Baca berurutan: docs/README.md, docs/00-foundation/sdd-workflow.md,
docs/01-architecture/system-overview.md, <spec>, <flow>, <rules>, <skill>.

Path yang boleh diubah: <path>.
Path yang hanya dibaca: <path>.

Kontrak: spec <path> bagian <nomor> (requirement <ID>), flow <path>,
ADR <nomor bila ada>. Acceptance: <daftar acceptance>.

Larangan: jangan menebak perilaku di luar spec; jangan mengubah kontrak;
jangan memakai new Function/eval; jangan menambah dependency; jangan menulis
secret; jangan mengubah berkas di luar path yang diberikan.

Langkah: 1) pastikan spec dan acceptance ada; 2) tulis atau perbarui test yang
gagal; 3) implementasikan perubahan minimal; 4) jalankan verifikasi; 5) laporkan
perubahan, hasil perintah, dan pertanyaan terbuka.

Verifikasi: npm run lint, npm test, npm run build, node scripts/check-docs.mjs --strict
(bila docs berubah). Kembalikan exit code dan ringkasan tiap perintah.
```

### 5.2 Review Kode

```text
Kamu adalah reviewer untuk repo microapp-studio. Nilai PR <nomor> pada branch
<nama> terhadap spec <path> (requirement <ID>).

Baca: spec bagian 3, 7, 8; flow terkait; rules <bahasa>; diff PR.

Periksa: kepatuhan requirement dan acceptance; perubahan perilaku tanpa spec;
secret atau kredensial di diff; new Function/eval/innerHTML tanpa sanitasi;
penanganan error dan kode error yang terdaftar; migrasi data dan rollback;
test yang deterministik dan tidak skip; aksesibilitas dan key i18n; dampak
performa; klaim status yang belum diverifikasi; tautan dan ID dokumen.

Keluaran: daftar temuan dengan tingkat blocking atau non-blocking, path dan
baris, alasan berbasis spec, serta saran perbaikan. Akhiri dengan keputusan
"approve" atau "request changes" dan alasan satu paragraf.
```

### 5.3 Test dan Verifikasi

```text
Kamu adalah agen QA untuk repo microapp-studio. Tugas: membuktikan acceptance
pada spec <path> bagian 7 untuk perubahan <deskripsi> pada branch <nama>.

Baca: spec bagian 7 dan 8; flow <path>; docs/07-rules/testing.md;
docs/00-foundation/implementation-status.md untuk mengetahui apa yang belum ada.

Tulis test pada <path test>. Cakup: happy path; cabang gagal yang disebut flow;
perilaku offline; isolasi permission; determinisme (tanpa jaringan, tanpa waktu
nyata, tanpa urutan acak yang tidak di-seed).

Larangan: jangan mengubah kode produksi untuk membuat test lulus; jangan
menandai skip; jangan mengunci perilaku yang bertentangan dengan spec.

Jalankan: npm test dan perintah verifikasi lain pada spec bagian 8.
Kembalikan: daftar acceptance beserta test yang membuktikannya, hasil perintah,
dan acceptance yang belum dapat dibuktikan beserta alasannya.
```

### 5.4 Security Review

```text
Kamu adalah security reviewer untuk repo microapp-studio. Lingkup: <modul,
mis. sandbox, crypto, registry, server>.

Baca: docs/01-architecture/threat-model.md, docs/01-architecture/identity-crypto.md,
docs/01-architecture/sandbox-capabilities.md, docs/03-specs/permissions.md,
docs/07-rules/security.md, diff PR.

Periksa: sandbox escape dan bypass capability; validasi input bridge; path
traversal dan zip bomb pada paket; replay dan nonce; penanganan kunci dan
zeroize; SSRF pada workflow dan connector; otorisasi dan RBAC pada server;
kebocoran secret pada log, test, dan bundle; signature dan TOFU registry;
dependency baru dan asal-usulnya; redaksi log.

Keluaran: temuan dengan severity (critical/high/medium/low), bukti path dan
baris, dampak, mitigasi yang disarankan, dan test keamanan yang harus
ditambahkan ke docs/08-quality/security-test-plan.md. Jangan membuka issue publik;
laporkan lewat SECURITY.md untuk kerentanan nyata.
```

### 5.5 Design Review

```text
Kamu adalah design reviewer untuk repo microapp-studio. Lingkup: <layar atau
komponen MADS>.

Baca: docs/02-design/design-system.md, docs/02-design/component-catalog.md,
docs/02-design/screen-specs.md, docs/02-design/interaction-patterns.md,
docs/02-design/accessibility.md, docs/02-design/content-i18n.md, dan perubahan UI
pada branch <nama>.

Periksa: hanya token MADS yang dipakai; state wajib (loading, empty, error,
offline, permission) tersedia; jalur keyboard dan urutan fokus; label dan role
screen reader; kontras dan ukuran target; reduced motion; RTL; key i18n tanpa
string hardcoded; pola destruktif memakai konfirmasi dan undo; tidak ada dark
pattern.

Keluaran: temuan dengan tingkat blocking atau non-blocking, referensi token dan
kriteria a11y yang dilanggar, serta daftar perbaikan yang dapat langsung
dikerjakan.
```

### 5.6 Docs Update

```text
Kamu adalah agen dokumentasi untuk repo microapp-studio. Tugas: menyelaraskan
dokumen dengan perubahan <deskripsi> yang sudah diverifikasi pada PR <nomor>.

Baca: docs/README.md, docs/00-foundation/sdd-workflow.md, dokumen yang akan diubah,
dan diff PR.

Ubah hanya: <path>. Pastikan frontmatter valid, H1 sama dengan title, ID yang
dirujuk sudah terdefinisi, tautan relatif menuju berkas yang ada, tidak ada
placeholder, dan tidak ada klaim fitur yang belum terverifikasi.

Perbarui bila perlu: baris pada docs/00-foundation/prd-compliance-matrix.md, status
pada docs/00-foundation/implementation-status.md, dan bagian verifikasi spec.

Jalankan: node scripts/check-docs.mjs --strict. Kembalikan ringkasan perubahan
dan exit code checker. Jangan mengubah isi PRD dan jangan menaikkan status tanpa
bukti verifikasi.
```

## 6. Contoh Terisi

Context package untuk pekerjaan auto-lock Vault, diserahkan ke peran host-runtime.

```text
# Context Package

## Tujuan
Menerapkan auto-lock Vault setelah 5 menit tanpa interaksi dan mewajibkan
unlock sebelum item dapat dibaca.

## Path
Boleh diubah: apps/studio-web/src/app/vault/** (path target; struktur final ditetapkan pada PR scaffold), docs/03-specs/01-host-shell.md
Hanya dibaca: packages/core-rust/crypto/**, docs/03-specs/permissions.md

## Kontrak
Spec: docs/03-specs/01-host-shell.md — FR-HOST-016
Flow: docs/04-flows/01-first-run.md
ADR terkait: docs/01-architecture/adr/0008-identity-auth.md
Aturan kode: docs/07-rules/typescript.md
Skill: docs/06-skills/add-host-feature/SKILL.md

## Acceptance
- Setelah 5 menit tanpa interaksi, item Vault tidak dapat dibaca tanpa unlock.
- Ciphertext di penyimpanan tidak memuat plaintext.
- Unlock gagal tidak membocorkan item dan tercatat di audit lokal.

## Larangan
- Jangan menyimpan kunci atau plaintext di localStorage/IndexedDB.
- Jangan menambah dependency timer.
- Jangan mengubah spec selain mencatat status verifikasi.

## Status
Sudah ada: Vault belum diimplementasikan; antarmuka Settings belum memuat Vault.
Belum ada: penyimpanan terenkripsi, timer auto-lock, audit event.

## Artefak
- Branch: feat/host-vault-autolock
- PR: belum ada
- Berkas terkait: apps/studio-web/src/app/vault/

## Pertanyaan terbuka
- Apakah PIN dan biometrik wajib keduanya atau salah satu?
  Pemilik keputusan: security.

## Verifikasi
Jalankan: npm run lint, npm test, npm run build.
Kembalikan: exit code dan ringkasan; hasil test auto-lock setelah 5 menit idle.
```

## 7. Format Hasil Handoff

Penerima MUST mengembalikan ringkasan dengan field berikut.

| Field | Isi |
|---|---|
| Status | `selesai`, `sebagian`, atau `blocked` |
| Perubahan | Perilaku yang berubah, bukan daftar berkas |
| Verifikasi | Perintah yang dijalankan dan hasil |
| Acceptance | Setiap acceptance dengan status lulus atau belum |
| Temuan | Masalah baru, utang, atau risiko residual |
| Pertanyaan terbuka | Yang masih butuh keputusan dan pemiliknya |
| Artefak | Branch, PR, atau berkas yang dihasilkan |

Hasil `blocked` MUST menyebut apa yang sudah dicoba, hasilnya, dan prasyarat yang tidak tersedia. Hasil `selesai` MUST NOT memuat acceptance yang belum dijalankan.

## 8. Verifikasi

| Bukti | Prosedur |
|---|---|
| Context package lengkap | Periksa kesembilan field pada §2 terisi |
| Prompt dapat dijalankan mandiri | Berikan prompt ke penerima tanpa konteks lain; ia harus dapat menemukan spec dan perintah |
| Tidak ada rujukan percakapan | Pencarian frasa yang merujuk sesi, pembicaraan lisan, atau keputusan yang tidak tertulis pada prompt |
| Path valid | Setiap path pada handoff menunjuk berkas yang ada, atau ditandai "belum ada" |
| Acceptance terukur | Setiap acceptance dapat dipetakan ke test atau perintah |
