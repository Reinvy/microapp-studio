---
id: QA-RELEASE
title: Gate Rilis
status: accepted
owner: qa
prd_refs: ["§8"]
---

# Gate Rilis

Dokumen ini menetapkan gate yang MUST dilewati sebelum perubahan masuk cabang utama, sebelum fase roadmap dinyatakan selesai, dan sebelum artefak dipublikasikan. Gate bersifat biner: tidak ada "lulus dengan catatan" tanpa pengecualian tertulis yang disetujui sesuai §6.

## 1. Tujuan dan Ruang Lingkup

- Menghubungkan setiap fase PRD §8 dengan bukti yang dapat diperiksa.
- Mencegah rilis tanpa test, keamanan, aksesibilitas, performa, dokumentasi, dan rollback yang memadai.
- Memastikan status implementasi hanya naik setelah verifikasi nyata.

Gate berlaku untuk Host web/native, Studio, Rust core, server Go, CLI/SDK, registry, dan dokumentasi. Gate tidak menggantikan review manusia; gate memastikan bukti minimum tersedia.

## 2. Gate per PR

| # | Gate | Bukti | Gagal bila |
|---|---|---|---|
| G-PR-01 | Spec-first | PR menyebut path spec dan ID FR/NFR/SEC, atau alasan `docs-not-needed` | Tidak ada rujukan spec untuk perubahan perilaku |
| G-PR-02 | Docs check | `node scripts/check-docs.mjs --strict` hijau | Ada error/warning, link mati, ID tak terdefinisi |
| G-PR-03 | Typecheck dan lint | `npx tsc --noEmit`, `npm run lint`, clippy/analyzer sesuai bahasa | Error baru |
| G-PR-04 | Unit dan contract | Test modul yang berubah + schema/contract test | Gagal atau coverage turun > 0,5 pp tanpa alasan |
| G-PR-05 | Integration | Test DB/bridge/sync/server untuk area yang berubah | Gagal |
| G-PR-06 | Smoke E2E | Alur utama area yang berubah | Gagal |
| G-PR-07 | Keamanan | SCA, secret scan, suite keamanan area terkait | Temuan critical/high baru |
| G-PR-08 | A11y | axe tanpa pelanggaran serius untuk perubahan UI; keyboard path | Pelanggaran baru |
| G-PR-09 | i18n | Tidak ada string hardcoded baru; kunci `id-ID` dan `en-US` lengkap | Kunci hilang atau hardcoded |
| G-PR-10 | Kontrak | Perubahan manifest/bridge/sync/permission/crypto/registry melalui RFC | Perubahan kontrak tanpa RFC |
| G-PR-11 | Review | Minimal satu reviewer di luar penulis; dua untuk kontrak/keamanan | Belum direview |
| G-PR-12 | Commit order | `docs:` mendahului `feat/fix:`; status diperbarui setelah verifikasi | Urutan salah atau status diklaim tanpa bukti |

Aturan tambahan:

- PR MUST kecil dan fokus; PR yang mencampur refactor besar dengan perubahan perilaku ditolak.
- Perubahan database MUST menyertakan migrasi forward dan rollback serta test fixture versi lama.
- Perubahan sandbox, crypto, permission, atau signature MUST menyertakan test negatif, bukan hanya test happy path.
- Merge memakai squash; branch dan commit mengikuti [05-agents/workflow.md](../05-agents/workflow.md) setelah dokumen tersebut tersedia.

## 3. Gate per Fase

Setiap fase PRD §8 hanya boleh dinyatakan selesai bila seluruh bukti di bawah tersedia dan disetujui `qa` serta pemilik modul.

| Fase | Fokus | Kriteria lulus (PRD §8) | Bukti wajib |
|---|---|---|---|
| Fase 1 | Offline-first Host Shell, Rust core, sandbox runtime | Host berjalan 100% offline di web/desktop/mobile, memasang dan menjalankan `.mapp` lokal secara terisolasi, lolos audit sandbox escape | E2E first run + install `.mapp` offline; suite R-01, R-06, R-07, R-08 hijau; permission broker dan Offline Cage teruji; watchdog 5 detik; installer < 35/45 MB; cold start < 150 ms; tidak ada `new Function`/`eval` di runtime produksi |
| Fase 2 | Hybrid Studio IDE, SQLite, CLI | Pengguna teknis dan non-teknis membuat micro-app full-stack offline, mengekspor `.mapp`, mengujinya di ponsel tanpa internet | E2E build tanpa jaringan; 120 komponen tersedia; Monaco offline; migrasi SQLite forward/rollback teruji; `microapp pack` menghasilkan `.mapp` valid dan reproducible; test di perangkat mobile |
| Fase 3 | AI lokal/BYOK, workflow offline, P2P sync | Dua perangkat yang diedit terpisah saat offline sinkron otomatis via Wi-Fi lokal dengan E2EE tanpa konflik; AI dan otomasi berjalan penuh tanpa internet | E2E dua peer + konflik; property test konvergensi CRDT; outbox retry/idempotency; AI tanpa silent switch ke cloud; audit egress nol; suite R-04, R-09, R-19 hijau |
| Fase 4 | Registry terfederasi dan pipeline keamanan | Siapa pun dapat membuat registry, merilis via Git, pengguna memverifikasi signature dan memasang dalam satu klik | Install dari registry/Git/`.mapp`; signature author+registry, TOFU, hash, reproducible build; scanner menolak paket berbahaya; delta, pin, rollback teruji; suite R-02, R-18 hijau |
| Fase 5 | Self-host one-click, air-gap, governance | Instalasi < 2 menit pada VPS 512 MB maupun K8s; air-gap 100% tanpa koneksi keluar; SBOM dan dokumentasi publik lengkap | Uji install Lite 1 vCPU/512 MB; Docker Compose dan Helm; OIDC/SAML/LDAP; RBAC/ABAC; audit chain; `branding.yaml`; bundle air-gap terverifikasi; SBOM/provenance/checksum; suite R-03, R-12, R-13 hijau |

Fase tidak boleh ditandai selesai hanya karena fitur "ada". Setiap kriteria lulus MUST memiliki bukti yang dijalankan pada build kandidat dan dicatat di [00-foundation/implementation-status.md](../00-foundation/implementation-status.md) serta [00-foundation/prd-compliance-matrix.md](../00-foundation/prd-compliance-matrix.md).

### 3.1 Perintah Gate Fase

Gate fase dijalankan oleh skrip yang menulis evidence mesin dan ringkasan manusia:

```bash
node scripts/check-docs.mjs --strict
npm test && npm run typecheck && npm run lint && npm run build
cargo test --manifest-path packages/core-rust/Cargo.toml
cargo clippy --manifest-path packages/core-rust/Cargo.toml --all-targets -- -D warnings
node scripts/verify-phase-1.mjs
```

| Fase | Skrip | Evidence |
|---|---|---|
| 1 | `scripts/verify-phase-1.mjs` | [evidence/phase-1.md](evidence/phase-1.md) |
| 2 | `scripts/verify-phase-2.mjs` | [evidence/phase-2.md](evidence/phase-2.md) |
| 3 | `scripts/verify-phase-3.mjs` | [evidence/phase-3.md](evidence/phase-3.md) |
| 4 | `scripts/verify-phase-4.mjs` | [evidence/phase-4.md](evidence/phase-4.md) |
| 5 | `scripts/verify-phase-5.mjs` | [evidence/phase-5.md](evidence/phase-5.md) |

Skrip menulis `docs/08-quality/evidence/phase-<n>.json` dan `.md`. `scripts/apply-status.mjs` membaca JSON tersebut dan menjadi satu-satunya jalur perubahan kolom Status pada matriks. Skema dan aturan pengisian ada di [evidence/README.md](evidence/README.md).

## 4. Gate per Release

| # | Gate | Bukti | Gagal bila |
|---|---|---|---|
| G-REL-01 | Build reproducible | Artefak dibangun dari commit bertanda, hash dicatat | Build tidak dapat direproduksi |
| G-REL-02 | Seluruh test | Unit, contract, integration, E2E, chaos hijau | Ada kegagalan atau test dikarantina melewati gate |
| G-REL-03 | Keamanan | Seluruh suite R-01 sampai R-20 hijau; SCA bersih dari critical/high | Temuan terbuka tanpa pengecualian |
| G-REL-04 | Performa | Seluruh budget [performance-budgets.md](performance-budgets.md) lulus di perangkat referensi | Melebihi target |
| G-REL-05 | A11y | axe + audit manual + keyboard-only + screen reader pada layar yang berubah | Pelanggaran serius/kritis |
| G-REL-06 | i18n | `id-ID`, `en-US`, pseudo-locale, RTL lulus | Kunci hilang, overflow, atau arah salah |
| G-REL-07 | Dokumentasi | `docs:check --strict` hijau; spec/flow/status diperbarui | Dokumen tertinggal dari perilaku |
| G-REL-08 | Supply chain | SBOM CycloneDX/SPDX, checksum SHA-256, provenance SLSA | Salah satu tidak ada |
| G-REL-09 | Signature | Artefak dan `.mapp` resmi ditandatangani dengan kunci rilis | Signature tidak valid |
| G-REL-10 | Migrasi | Migrasi DB forward+rollback diuji dari versi rilis sebelumnya | Rollback gagal |
| G-REL-11 | Rollback | Prosedur rollback per platform terdokumentasi dan diuji | Tidak ada prosedur atau gagal |
| G-REL-12 | Catatan rilis | Perubahan, risiko, dan langkah upgrade tertulis | Tidak ada catatan |
| G-REL-13 | Lisensi | Apache-2.0 core dan MIT paket konsisten; notifikasi lisensi dependency lengkap | Ada ketidaksesuaian |

Release candidate MUST dibekukan sebelum gate dijalankan; perubahan setelah pembekuan memerlukan rebuild dan pengulangan gate yang terdampak.

## 5. Checklist Bukti Rilis

Simpan sebagai artefak yang ditautkan dari catatan rilis:

- [ ] Commit SHA dan tag yang dirilis.
- [ ] Log build dan hash artefak per platform/arsitektur.
- [ ] Laporan test per lapisan dan coverage.
- [ ] Laporan keamanan: SCA, secret scan, fuzz, suite R-01 sampai R-20.
- [ ] Laporan performa per perangkat referensi.
- [ ] Laporan a11y dan i18n.
- [ ] `docs:check --strict` dan ringkasan status implementasi.
- [ ] SBOM, checksum, dan provenance.
- [ ] Signature artefak dan verifikasi signature.
- [ ] Hasil uji migrasi dan rollback.
- [ ] Catatan rilis dan pengumuman upgrade.

Checklist tanpa artefak yang dapat dibuka dianggap kosong.

## 6. Pengecualian dan Rollback

- **Tidak ada bypass gate secara diam-diam.** Pengecualian MUST tercatat di PR atau catatan rilis dengan alasan, dampak, pemilik, dan tenggat.
- Pengecualian keamanan MUST disetujui `security` dan memiliki issue perbaikan; pengecualian critical MUST NOT diberikan.
- Pengecualian performa MUST disetujui `qa` dan `architecture`, dengan baseline pengganti dan tanggal evaluasi.
- Hotfix insiden MAY melewati sebagian gate dengan persetujuan dua maintainer, tetapi wajib menyelesaikan dokumen retro dan gate yang tersisa dalam 24 jam.
- Rollback rilis MUST diuji pada lingkungan yang sama dengan produksi; rollback yang menghapus data pengguna MUST ditolak.
- Bila gate gagal setelah publikasi, rilis MUST ditarik atau di-pin, dan pengguna diberi tahu melalui saluran resmi.

## 7. Referensi

- [03-specs/nfr.md](../03-specs/nfr.md), [03-specs/error-codes.md](../03-specs/error-codes.md)
- [test-strategy.md](test-strategy.md), [performance-budgets.md](performance-budgets.md), [security-test-plan.md](security-test-plan.md)
- [definition-of-done.md](definition-of-done.md)
- [00-foundation/sdd-workflow.md](../00-foundation/sdd-workflow.md), [00-foundation/product-foundation.md](../00-foundation/product-foundation.md)
- [04-flows/08-workflow-outbox.md](../04-flows/08-workflow-outbox.md), [04-flows/09-publish-verify.md](../04-flows/09-publish-verify.md)
