---
id: RULE-TEST
title: Aturan Testing
status: accepted
owner: dx
prd_refs: ["§6", "§7.2"]
---

# Aturan Testing

Aturan ini menetapkan cara menulis, menjalankan, dan menilai test. Strategi lengkap ada di [test-strategy.md](../08-quality/test-strategy.md); aturan di sini mengikat keputusan harian yang harus dipatuhi setiap PR.

## 1. Cakupan

| Area | Kewajiban utama |
|---|---|
| Piramida | Unit dan contract dominan; E2E hanya untuk alur kritis |
| Determinisme | Tanpa waktu nyata, jaringan publik, atau data produksi |
| Offline/chaos | Offline adalah mode utama yang diuji |
| CRDT | Property test dan konvergensi |
| Sandbox/kripto | Escape suite dan known-answer vector |
| Kontrak | JSON Schema, bridge, MUAP |
| UI | a11y, i18n, performa |
| Gate | Coverage dan larangan flaky |

## 2. Aturan

### 2.1 Struktur dan Determinisme

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-TEST-001 | MUST | Test MUST diturunkan dari kolom `Acceptance` pada requirement; test yang tidak memetakan ke FR/NFR/SEC MUST dihapus atau dilengkapi alasannya. | Cakupan tidak dapat diaudit; reviewer menolak test dekoratif. |
| RULE-TEST-002 | MUST | Mayoritas cakupan MUST berada di unit dan contract test; E2E hanya untuk alur yang tidak dapat dibuktikan lebih murah, dan setiap E2E MUST menunjuk flow terkait. | Suite lambat dan rapuh; PR ditolak bila mengandalkan E2E untuk logika murni. |
| RULE-TEST-003 | MUST | Test MUST deterministik: tanpa `sleep`, waktu nyata, random tanpa seed, jaringan publik, atau urutan eksekusi yang diasumsikan; waktu memakai fake clock dan randomness memakai seed yang dicatat. | Test flaky; gate gagal dan PR diblokir. |
| RULE-TEST-004 | MUST | Test paralel MUST mengisolasi state: database per test, port acak dari OS, direktori sementara unik, dan tanpa variabel global yang dimutasi. | Test saling mengganggu; hasil berbeda saat dijalankan ulang. |
| RULE-TEST-005 | MUST | Test MUST NOT memakai data pengguna nyata atau PII; seluruh fixture MUST sintetis dan tidak dapat dilacak ke individu. | Pelanggaran privasi; test diblokir. |
| RULE-TEST-006 | MUST | Bug regresi MUST menambahkan test yang gagal sebelum perbaikan dan lulus setelahnya; perbaikan tanpa test regresi ditolak kecuali dibuktikan tidak dapat diuji. | Bug yang sama berulang; PR ditolak. |

### 2.2 Offline, Chaos, dan Data

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-TEST-007 | MUST | Suite integrasi MUST berjalan dengan jaringan mati secara default; test yang membutuhkan jaringan MUST memakai mock server lokal dan diberi tag `network-mock`. | Ketergantungan jaringan tersembunyi; offline regression lolos. |
| RULE-TEST-008 | MUST | Setiap fitur sync, workflow, atau registry MUST memiliki test offline, putus di tengah operasi, dan resume dari cursor/idempotency key. | Duplikasi efek atau kehilangan mutasi; acceptance tidak terpenuhi. |
| RULE-TEST-009 | MUST | Skenario chaos (kill isolate, restart server, disk penuh, jam mundur) MUST diuji untuk jalur yang menyentuh data persisten. | Data korup saat kegagalan; gate chaos gagal. |
| RULE-TEST-010 | MUST | CRDT MUST diuji dengan property-based test untuk convergence, commutativity, idempotency, monotonic HLC, column LWW, cursor resumability, dan schema staging; minimal 5.000 kasus per PR dan 100.000 pada nightly. | Konflik tidak konvergen; gate sync gagal. |

### 2.3 Keamanan, Kriptografi, dan Kontrak

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-TEST-011 | MUST | Setiap perubahan runtime web/native, core Rust, atau broker MUST menjalankan escape suite dan bypass capability; sandbox yang tidak dapat diuji MUST fail closed. | Escape tidak terdeteksi; rilis diblokir. |
| RULE-TEST-012 | MUST | Kriptografi MUST diuji dengan known-answer vector resmi (Ed25519 RFC 8032, X25519 RFC 7748, BIP39, HKDF, AES-256-GCM) dan envelope negative case: tag salah, AAD diubah, `key_id` asing, ciphertext terpotong. | Implementasi menyimpang dari standar; test kripto gagal. |
| RULE-TEST-013 | MUST | Kontrak manifest, registry index, MUIP, dan host bridge MUST memiliki test schema untuk contoh valid dan invalid, termasuk `additionalProperties`, enum, regex `id`, dan path traversal. | Payload invalid diterima; instalasi gagal di lapangan. |
| RULE-TEST-014 | MUST | Contract test MUST dijalankan terhadap produsen dan konsumen yang sebenarnya (Rust parser, TS validator, Dart binding), bukan hanya satu sisi. | Dua sisi menyimpang; integrasi gagal. |

### 2.4 UI, a11y, i18n, dan Performa

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-TEST-015 | MUST | Setiap PR UI MUST menjalankan axe dan keyboard-only check; temuan serius/kritis MUST diperbaiki sebelum merge. | NFR-A11Y-001/002 dilanggar; PR ditolak. |
| RULE-TEST-016 | MUST | UI MUST diuji dengan pseudo-locale, `id-ID`, `en-US`, dan satu locale RTL; string hardcoded dan overflow layout MUST gagal. | Terjemahan dan RTL rusak; gate i18n gagal. |
| RULE-TEST-017 | MUST | Perubahan yang menyentuh render, query, sync, atau startup MUST menjalankan benchmark dan MUST NOT melampaui anggaran di [performance-budgets.md](../08-quality/performance-budgets.md). | Regresi performa tidak terdeteksi; PR ditolak. |
| RULE-TEST-018 | MUST | Golden/visual test MUST menunjuk komponen MADS dan state yang diuji; memperbarui golden tanpa review perubahan visual dilarang. | Perubahan visual tidak disengaja lolos. |

### 2.5 Coverage, Penamaan, dan Gate

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-TEST-019 | MUST | Coverage minimum: Rust core 90% line (khususnya crypto, parser, sandbox guard), TypeScript/Go/Dart 80% line; modul crypto/sandbox MUST memiliki mutation atau fuzz target sebagai tambahan, bukan pengganti. | Coverage gate gagal; rilis ditahan. |
| RULE-TEST-020 | MUST | Nama test MUST menyatakan perilaku dan requirement: `it('menolak signature yang diubah (FR-REG-...)')`, `TestCreateRegistry_RejectsKeyChange`, `test('migration rollback restores rows')`; nama generik seperti `test1` dilarang. | Kegagalan tidak dapat dilacak ke requirement; review menolak. |
| RULE-TEST-021 | MUST | Test yang flaky MUST diperbaiki atau dihapus; retry otomatis MUST NOT dipakai untuk membuat suite lulus, dan `skip` tanpa alasan dan batas waktu dilarang. | Kepercayaan pada suite hilang; PR diblokir. |
| RULE-TEST-022 | MUST | Perintah test lokal dan gate rilis MUST sama; kegagalan test MUST memblokir merge, dan hasil perintah dilampirkan pada bagian Verifikasi PR. | “Lulus di mesin saya” tidak dapat diaudit; PR ditolak. |

## 3. Pengecualian dan Penegakan

1. Test yang membutuhkan perangkat fisik MUST mencatat perangkat, versi OS, dan hasil; ketiadaan perangkat bukan alasan untuk mengklaim lulus.
2. Fuzz dan property test MUST menyimpan seed yang gagal sebagai test regresi.
3. Perubahan kontrak MUST menambahkan fixture sebelum implementasi diubah.
4. Gate coverage dan fuzz dijalankan sebelum release; hasilnya dicatat di [release-gates.md](../08-quality/release-gates.md).

## 4. Referensi

- [test-strategy.md](../08-quality/test-strategy.md) — lapisan, matriks platform, fixture.
- [security-test-plan.md](../08-quality/security-test-plan.md) — uji keamanan dan severity.
- [performance-budgets.md](../08-quality/performance-budgets.md) — ambang performa.
- [definition-of-done.md](../08-quality/definition-of-done.md) — bukti yang harus ada.
- [data-migrations.md](data-migrations.md) — test migrasi dan restore.
