---
id: QA-TEST-STRATEGY
title: Strategi Test
status: accepted
owner: qa
prd_refs: ["§6", "§8"]
---

# Strategi Test

Dokumen ini menetapkan strategi pengujian normatif untuk seluruh ekosistem MicroApp Studio: Host Shell, Studio IDE, sandbox runtime, data layer, sync/CRDT, registry, server self-host, serta DevTools/CLI/SDK. Setiap requirement di [03-specs](../03-specs/nfr.md) wajib memiliki bukti uji yang dapat dijalankan ulang; test yang tidak deterministik dianggap gagal.

## 1. Tujuan dan Prinsip

1. **Acceptance adalah kontrak.** Test diturunkan dari kolom `Acceptance` pada tabel requirement, bukan dari implementasi. Test yang tidak memetakan ke FR/NFR/SEC tidak menambah keyakinan dan SHOULD dihapus.
2. **Deterministik.** Test MUST NOT bergantung pada waktu nyata, jaringan publik, urutan eksekusi paralel, atau data produksi. Waktu memakai fake clock; randomness memakai seed yang dicatat.
3. **Offline-first diuji sebagai mode utama.** Jaringan dimatikan secara default pada suite integrasi; test yang membutuhkan jaringan MUST memakai mock server lokal dan diberi tag `network-mock`.
4. **Fail closed.** Bila isolasi sandbox atau verifikasi signature tidak tersedia, test MUST memastikan runtime berhenti, bukan fallback ke mode tidak aman.
5. **Piramida, bukan es krim.** Mayoritas cakupan ada di unit dan contract test; E2E dipakai untuk alur kritis yang tidak dapat dibuktikan lebih murah.
6. **Satu sumber fixture.** Fixture manifest, arsip `.mapp`, database lama, dan vektor kriptografi dipakai bersama lintas bahasa agar tidak ada dua definisi kebenaran.

## 2. Lapisan Test

| Lapisan | Cakupan | Alat | Lingkungan | Gate |
|---|---|---|---|---|
| Unit | Fungsi murni, reducer, parser, validator, kriptografi | Vitest, `cargo test`, `go test`, `flutter test` | Lokal + CI, tanpa I/O | Setiap PR |
| Contract | Host bridge, MUIP, manifest schema, registry index, sync envelope | JSON Schema validator + test konsumen | CI | Setiap PR yang menyentuh kontrak |
| Integration | SQLite/OPFS, Rust core via WASM/FFI, server dengan DB nyata, registry fetch lokal | Vitest + testcontainers/Go `httptest` | CI, service lokal | Setiap PR |
| E2E | First run, install/update/rollback, build with AI, sync dua peer, publish, self-host | Playwright (web), `flutter_test` integration, Go e2e | Nightly + release | Nightly dan release |
| Chaos | Mati listrik, kill isolate, jaringan putus, server restart, disk penuh | Fault injector internal | Nightly | Nightly |
| Security | Escape sandbox, bypass capability, crypto misuse, SSRF, signature mismatch | Lihat [security-test-plan.md](security-test-plan.md) | CI + nightly fuzz | Setiap PR keamanan + release |
| Performance | Cold/warm start, FPS, memori, ukuran artefak, latensi sync | Lihat [performance-budgets.md](performance-budgets.md) | Perangkat referensi | Nightly + release |
| A11y | Keyboard-only, screen reader, kontras, reduced motion, zoom 200% | axe-core, audit manual | CI (axe) + manual | Setiap PR UI + release |
| i18n | Kelengkapan kunci, pluralisasi, RTL, pseudo-locale, format tanggal/angka | Locale lint + snapshot | CI | Setiap PR UI + release |

## 3. Matriks Platform

| Platform | Unit | Contract | Integration | E2E | Chaos | Performance |
|---|---|---|---|---|---|---|
| Web (`apps/studio-web`, `packages/*`) | Wajib | Wajib | Wajib (SQLite WASM/OPFS, Worker) | Wajib (Playwright) | Wajib | Wajib (Chromium referensi) |
| Flutter (`apps/host-flutter`) | Wajib | Wajib (bridge FFI) | Wajib (QuickJS/Wasmtime) | Wajib (integration test) | Wajib | Wajib (Android mid-range) |
| Rust (`packages/core-rust`) | Wajib | Wajib (serde/JSON Schema) | Wajib (WASM + FFI target) | — | Wajib (fuzz) | Opsional (benchmark core) |
| Go (`apps/selfhost-server`) | Wajib | Wajib (API + registry) | Wajib (SQLite + PostgreSQL) | Wajib (Lite e2e) | Wajib (restart/DB failure) | Wajib (1 vCPU/512 MB) |

Aturan tambahan:

- Logika kriptografi, parsing `.mapp`, CRDT/HLC, dan verifikasi signature MUST diuji di Rust core dan MUST NOT diduplikasi menjadi implementasi test di TS/Dart.
- Perbedaan perilaku web dan native MUST diuji terhadap kontrak yang sama; test web tidak boleh menjadi satu-satunya bukti untuk klaim native.

## 4. Fixture dan Data Uji

| Fixture | Isi minimal | Dipakai oleh |
|---|---|---|
| Manifest corpus | Contoh valid, field hilang, enum salah, `id` tidak sesuai regex, path `..`, signature salah | Contract, registry, CLI |
| `.mapp` archive | ZIP deterministik valid, urutan entry salah, timestamp berubah, zip bomb, path traversal, entry terlalu besar | Rust parser, registry install |
| Database lama | Snapshot skema versi sebelumnya untuk setiap migrasi yang pernah dirilis | Data migration, restore |
| Crypto vectors | Ed25519 (RFC 8032), BIP-39, HKDF-SHA256, AES-256-GCM, envelope dengan AAD | Rust core, sync, vault |
| Sync corpus | Batch 500 mutation/8 MiB, batch batas lewat, cursor duplikat, payload versi lebih baru | Sync engine, staging |
| Log redaction | Baris log sintetis berisi token, kunci, path absolut, email | Security, observability |
| Locale corpus | `id-ID`, `en-US`, pseudo-locale, `ar` (RTL) | i18n, a11y |

Aturan fixture:

- Data pengguna nyata MUST NOT dipakai; seluruh PII MUST sintetis dan tidak dapat dilacak ke individu.
- Fixture biner MUST disimpan di repositori dengan checksum dan lisensi yang jelas; fixture besar (> 5 MiB) MAY diunduh dari artefak build bertanda tangan.
- Setiap bug regresi MUST menambahkan fixture atau test yang gagal sebelum perbaikan dan lulus setelahnya.

## 5. Simulasi Offline, Jaringan, dan Waktu

| Skenario | Cara simulasi | Ekspektasi |
|---|---|---|
| Offline total | Matikan koneksi proses; tolak seluruh socket keluar | Aplikasi tetap berfungsi dari cache; tidak ada request keluar (NFR-SUPPLY-003) |
| Latensi dan packet loss | Proxy lokal dengan delay 50–500 ms dan loss 1–10% | Retry/backoff sesuai default; tidak ada duplikasi efek |
| Putus saat batch sync | Terminasi koneksi di tengah batch | Resume dari cursor; idempotency key mencegah duplikasi |
| DNS gagal | Resolver mock mengembalikan NXDOMAIN | Fallback transport deterministik, bukan crash |
| Server restart | Kill proses server saat workflow berjalan | Job dilanjutkan dari checkpoint; tidak ada job hilang |
| Jam mundur/maju | Fake clock | HLC tetap monotonik; tidak ada konflik palsu |
| App background | Simulasi lifecycle OS | Hibernasi 30 detik; timer dan rekaman berhenti |
| Disk penuh | Filesystem quota | Fail closed dengan kode error terdaftar, data lama utuh |

## 6. Test Konvergensi CRDT

Suite ini membuktikan properti, bukan hanya contoh:

1. **Convergence** — dua replika yang menerima himpunan mutasi sama MUST memiliki state identik tanpa memandang urutan.
2. **Commutativity** — pertukaran urutan mutasi independen MUST menghasilkan state yang sama.
3. **Idempotency** — penerapan mutasi yang sama dua kali MUST NOT mengubah state atau menambah baris konflik.
4. **Monotonic HLC** — HLC yang dihasilkan MUST selalu naik; clock mundur MUST dikoreksi.
5. **Column-level LWW** — hanya kolom yang bertabrakan yang menghasilkan `conflict_history`; kolom lain tidak tersentuh.
6. **Cursor resumability** — batch yang ditolak atau diputus MUST dapat dikirim ulang dari cursor tanpa kehilangan mutasi.
7. **Schema staging** — mutasi dengan schema version lebih baru MUST tersimpan di staging dan tidak diterapkan sampai upgrade.

Pelaksanaan: property-based test dengan generator operasi acak; minimal 5.000 kasus per PR dan 100.000 kasus pada nightly. Seed yang gagal MUST dicetak dan disimpan sebagai test regresi.

## 7. Sandbox Escape dan Crypto Vectors

- Suite escape sandbox, bypass capability, dan injeksi MUIP dijalankan pada setiap PR yang menyentuh `packages/runtime-web`, `apps/host-flutter`, atau `packages/core-rust`; detail di [security-test-plan.md](security-test-plan.md).
- Kriptografi MUST diuji terhadap vektor standar dan implementasi referensi. Dilarang membuat vektor sendiri untuk klaim kompatibilitas.
- Test envelope MUST mencakup tag gagal, AAD diubah, `key_id` tidak dikenal, nonce reuse, dan ciphertext terpotong; ekspektasi adalah penolakan, bukan dekripsi parsial.
- Test signature `.mapp` MUST mencakup kunci benar, kunci salah, kunci berubah (TOFU), signature terpotong, dan payload diubah setelah signing.

## 8. Lingkungan dan Perangkat

| Lingkungan | Pemakaian | Aturan |
|---|---|---|
| Lokal | TDD, debugging | Boleh memakai subset suite; tidak menjadi bukti rilis |
| CI PR | Unit, contract, integration, smoke E2E, axe | Wajib hijau sebelum merge; tanpa akses internet |
| Nightly | E2E penuh, chaos, fuzz, performance, RTL | Hasil disimpan sebagai artefak 90 hari |
| Release candidate | Seluruh suite + perangkat referensi | Menjadi bukti gate rilis |
| Air-gap | Instalasi dan operasi tanpa egress | Tidak ada request keluar; dibuktikan dengan audit jaringan |

Perangkat referensi mengikuti [03-specs/nfr.md](../03-specs/nfr.md) §2: Android mid-range 4 GB RAM, laptop 8 GB RAM 4 core, Chromium stabil, VPS 1 vCPU/512 MB. Perangkat lain MAY diuji sebagai informasi, bukan gate.

## 9. Coverage, Mutasi, dan Fuzz

| Area | Ambang wajib | Tambahan |
|---|---|---|
| Rust core | 90% line coverage | Mutation testing minimal 80% mutation score untuk modul crypto, parser `.mapp`, CRDT/HLC |
| TypeScript (Studio, runtime-web, SDK) | 80% line coverage | Fuzz target untuk validator bridge dan parser MUIP |
| Go (server) | 80% line coverage | Fuzz target untuk SSRF guard dan parser registry index |
| Dart/Flutter (host) | 80% line coverage | Golden test untuk komponen kritis dan theme token |

Aturan:

- Coverage MUST dihitung dari build test dengan instrumentasi, bukan estimasi manual.
- Baris generated, binding FFI yang dihasilkan, dan kode `main` bootstrap MAY dikecualikan dengan daftar eksplisit di konfigurasi.
- Modul crypto dan sandbox MUST memiliki mutation atau fuzz target; coverage saja tidak cukup.
- Fuzz corpus yang menemukan crash MUST dikomit dan dijalankan ulang di CI.
- Penurunan coverage lebih dari 0,5 poin persen pada PR MUST dijelaskan di deskripsi PR atau ditolak.

## 10. Kepemilikan dan Triase

| Lapisan | Pemilik | Eskalasi |
|---|---|---|
| Unit/contract platform | Tim platform terkait (`runtime`, `data`, `sync`, `server`, `dx`) | Architect |
| Security suite | `security` | Insiden sesuai [security-test-plan.md](security-test-plan.md) |
| Performance | `qa` + pemilik modul | Architect |
| A11y/i18n | `design` + `qa` | Product |
| E2E lintas modul | `qa` | Maintainer council |

- Test flaky MUST dikarantina maksimal 24 jam dengan issue dan pemilik; setelah itu diperbaiki atau dihapus. Karantina tidak boleh dipakai untuk melewati gate rilis.
- Kegagalan test yang disebabkan bug produk MUST diperbaiki di produk, bukan dengan melonggarkan assertion.
- Test yang dihapus MUST disertai alasan dan penggantinya; penghapusan tanpa pengganti ditolak reviewer.

## 11. Perintah

```bash
npm test
npm run lint
npx tsc --noEmit
npx vitest run --coverage
npx playwright test
cargo test -p microapp-core
cargo clippy -p microapp-core -- -D warnings
cargo llvm-cov -p microapp-core --fail-under-lines 90
go test ./apps/selfhost-server/...
go test -cover ./apps/selfhost-server/...
flutter test
flutter test --coverage
microapp test --sandbox --coverage
node scripts/check-docs.mjs --strict
```

Perintah di atas adalah kontrak target monorepo; selama migrasi Phase 0, perintah yang belum tersedia MUST ditandai `partial` di [00-foundation/implementation-status.md](../00-foundation/implementation-status.md), bukan dianggap lulus.

## 12. Gate dan Bukti

- **Per PR:** unit + contract + integration untuk modul yang berubah, smoke E2E, axe untuk perubahan UI, locale lint, dan `docs:check --strict`.
- **Nightly:** seluruh suite, chaos, fuzz, performance, RTL, dan restore dari backup.
- **Per release:** seluruh suite pada perangkat referensi, bukti keamanan, bukti performa, dan SBOM/provenance; detail di [release-gates.md](release-gates.md).
- Bukti MUST disimpan sebagai artefak CI (log, laporan coverage, hasil benchmark, laporan axe) dan ditautkan di PR atau catatan rilis. Screenshot tanpa log bukan bukti.

## 13. Referensi

- [03-specs/nfr.md](../03-specs/nfr.md), [03-specs/error-codes.md](../03-specs/error-codes.md)
- [01-architecture/sandbox-capabilities.md](../01-architecture/sandbox-capabilities.md), [01-architecture/sync-crdt.md](../01-architecture/sync-crdt.md)
- [01-architecture/identity-crypto.md](../01-architecture/identity-crypto.md), [01-architecture/registry-supply-chain.md](../01-architecture/registry-supply-chain.md)
- [security-test-plan.md](security-test-plan.md), [performance-budgets.md](performance-budgets.md), [release-gates.md](release-gates.md), [definition-of-done.md](definition-of-done.md)
- [00-foundation/sdd-workflow.md](../00-foundation/sdd-workflow.md)
