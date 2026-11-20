---
id: SPEC-ERR
title: Katalog Error
status: accepted
owner: dx
prd_refs: ["§3 Modul 3", "§5.2"]
---

# Katalog Error

## 1. Tujuan dan Ruang Lingkup

Dokumen ini mendaftar seluruh kode error yang dipakai spec dan flow. Kode yang dipakai tetapi tidak terdaftar adalah bug. Pesan pengguna diambil dari kunci locale, bukan dari string di kode.

Format: `E-<DOMAIN>-<NNN>` dengan domain `HOST`, `STU`, `SBX`, `DATA`, `REG`, `SYNC`, `SRV`, `DEV`, `AUTH`, `CRYPTO`, `NET`, `CLI`.

Di luar lingkup: strategi test keamanan (lihat [security-test-plan.md](../08-quality/security-test-plan.md)), copywriting detail (lihat [content-i18n.md](../02-design/content-i18n.md)).

## 2. Aktor dan Prasyarat

| Aktor | Prasyarat |
|---|---|
| Developer | Kode error baru harus ditambahkan di sini sebelum dipakai |
| QA | Matriks pemetaan kode ke skenario uji |
| Support | Pesan pengguna dan langkah pemulihan |

## 3. Requirement

| Aturan | Level | Ketentuan | Verifikasi |
|---|---|---|---|
| R-01 | MUST | Setiap kode yang muncul di spec/flow MUST terdaftar di tabel §4; kode terdaftar MUST dipakai minimal satu spec/flow. | `docs:check` memvalidasi referensi; audit manual memvalidasi pemakaian. |
| R-02 | MUST | Nomor dialokasikan berurutan per domain tanpa gap. | Pemeriksaan urutan pada tabel. |
| R-03 | MUST | Setiap kode MUST memiliki severity, kunci pesan, penyebab, recovery, retryable, dan log level. | Tidak ada sel kosong. |
| R-04 | MUST | Pesan pengguna MUST mengikuti formula `[apa yang terjadi] + [mengapa] + [langkah berikut]` dan MUST NOT memuat PII, token, path internal, atau stack trace. | Review copy + pemindaian pola sensitif pada log. |
| R-05 | MUST | `retryable: true` hanya untuk operasi idempoten; retry MUST memakai backoff dan tidak boleh otomatis untuk aksi destruktif. | Test retry pada kode terkait. |
| R-06 | MUST | Error boundary menampilkan kode, pesan, dan aksi (retry/restart/rollback/export) sesuai kode; kode yang tidak dikenali menampilkan fallback generik. | Snapshot UI per kategori kode. |
| R-07 | MUST | Crash report lokal memuat kode, versi app, versi host, dan jejak teredaksi; tidak dikirim keluar tanpa opt-in. | Inspeksi berkas crash report. |

## 4. Model Data dan State

Tingkat severity: `info`, `warning`, `error`, `critical`. Log level: `debug`, `info`, `warn`, `error`.

| Kode | Severity | Message key | Cause | Recovery | Retryable | Log |
|---|---|---|---|---|---|---|
| E-HOST-001 | error | `error.host.keychain_unavailable` | Keychain/Keystore tidak tersedia | Gunakan passphrase, blokir data sensitif | Ya | error |
| E-HOST-002 | warning | `error.host.opfs_unavailable` | OPFS tidak tersedia | Mode ephemeral, ekspor saja | Tidak | warn |
| E-HOST-003 | warning | `error.host.deeplink_unresolved` | Route/app tidak dikenal | Tawarkan instalasi atau kembali ke Home | Tidak | info |
| E-HOST-004 | error | `error.host.vault_locked` | Vault terkunci atau gagal unlock | Unlock ulang, gunakan recovery phrase | Ya | warn |
| E-HOST-005 | warning | `error.host.storage_cleanup_partial` | Sebagian cache gagal dibersihkan | Laporkan kategori, retry | Ya | warn |
| E-HOST-006 | critical | `error.host.audit_chain_invalid` | Rantai audit tidak valid: celah `seq_id`, urutan salah, atau hash tidak cocok | Hentikan aksi sensitif, tawarkan ekspor audit dan verifikasi ulang | Tidak | error |
| E-HOST-007 | critical | `error.host.workspace_isolation` | Query atau grant melintasi `workspace_id` | Tolak operasi, audit, tampilkan error generik | Tidak | error |
| E-STU-001 | error | `error.studio.parse_failed` | Kode gagal diparse | Tampilkan lokasi, pulihkan revisi valid | Tidak | error |
| E-STU-002 | error | `error.studio.ai_unavailable` | Provider AI tidak tersedia | Pilih provider lain secara manual | Ya | warn |
| E-STU-003 | error | `error.studio.byok_missing` | Kunci BYOK tidak ada/ditolak | Arahkan ke Vault | Tidak | warn |
| E-STU-004 | warning | `error.studio.merge_conflict` | Konflik multiplayer | Tampilkan diff, minta merge | Tidak | info |
| E-STU-005 | error | `error.studio.pack_invalid` | Validasi pack gagal | Blokir export, tampilkan daftar | Tidak | error |
| E-SBX-001 | critical | `error.sandbox.unavailable` | Isolate tidak dapat dibuat | Fail closed, retry | Ya | error |
| E-SBX-002 | critical | `error.sandbox.memory_exceeded` | Kuota memori terlampaui | Hentikan isolate, error boundary | Ya | error |
| E-SBX-003 | critical | `error.sandbox.frozen` | Freeze/infinite loop | Hentikan setelah 5 detik | Ya | error |
| E-SBX-004 | error | `error.sandbox.startup_timeout` | Watchdog startup timeout | Batalkan mount, restart/rollback | Ya | error |
| E-SBX-005 | warning | `error.sandbox.bridge_denied` | Permission/channel ditolak | Kembalikan error, buka Pengaturan | Ya | warn |
| E-SBX-006 | warning | `error.sandbox.cancelled` | Operasi dibatalkan lewat `bridge.cancel` atau background | Tidak mengirim hasil; app menerima status cancelled | Tidak | info |
| E-SBX-007 | error | `error.sandbox.transfer_incomplete` | Transfer biner tidak lengkap atau SHA-256 tidak cocok | Buang chunk, minta ulang berkas | Ya | warn |
| E-SBX-008 | warning | `error.sandbox.duplicate_request` | `id` request dipakai ulang dalam satu sesi | Tolak request, audit | Tidak | warn |
| E-SBX-009 | warning | `error.sandbox.invalid_intent` | Intent tidak dideklarasikan target atau payload melebihi 64 KiB | Tolak transfer, audit | Tidak | warn |
| E-DATA-001 | critical | `error.data.open_failed` | Database tidak dapat dibuka | Restore snapshot, jangan buat kosong | Ya | error |
| E-DATA-002 | error | `error.data.migration_failed` | Migrasi gagal | Rollback snapshot dan versi | Tidak | error |
| E-DATA-003 | warning | `error.data.schema_staged` | Skema lebih baru | Simpan staging, beri tahu | Tidak | info |
| E-DATA-004 | error | `error.data.outbox_exhausted` | Outbox gagal permanen | Tandai failed, retry manual | Ya | error |
| E-DATA-005 | warning | `error.data.ssrf_blocked` | Target diblokir SSRF guard | Tolak, audit | Tidak | warn |
| E-DATA-006 | warning | `error.data.quota_exceeded` | Kuota storage app (`permissions.quotas.storageMb`) terlampaui | Tolak penulisan, tawarkan pembersihan cache | Ya | warn |
| E-REG-001 | critical | `error.registry.signature_invalid` | Signature tidak valid | Blokir instalasi | Tidak | error |
| E-REG-002 | critical | `error.registry.key_changed` | Kunci author berubah | Blokir sampai persetujuan | Tidak | error |
| E-REG-003 | error | `error.registry.hash_mismatch` | Hash artefak tidak cocok | Tolak dan hapus unduhan | Tidak | error |
| E-REG-004 | error | `error.registry.scanner_rejected` | Scanner menolak | Blokir, tampilkan temuan | Tidak | error |
| E-REG-005 | warning | `error.registry.delta_failed` | Delta patch gagal | Unduh penuh atau batalkan | Ya | warn |
| E-SYNC-001 | error | `error.sync.version_mismatch` | Versi protokol tidak cocok | Tampilkan versi, minta update | Tidak | warn |
| E-SYNC-002 | warning | `error.sync.batch_rejected` | Batch ditolak | Kirim ulang dari cursor | Ya | warn |
| E-SYNC-003 | warning | `error.sync.conflict_unmerged` | Konflik tidak otomatis | Simpan conflict history | Tidak | info |
| E-SYNC-004 | error | `error.sync.restore_verify_failed` | Restore gagal verifikasi | Batalkan restore | Tidak | error |
| E-SYNC-005 | warning | `error.sync.device_revoked` | Perangkat dicabut | Hentikan sesi, pairing ulang | Tidak | warn |
| E-AUTH-001 | critical | `error.auth.device_cert_invalid` | Sertifikat perangkat tidak valid | Tolak, pairing ulang | Tidak | error |
| E-AUTH-002 | warning | `error.auth.recovery_phrase_invalid` | Frasa salah | Batasi percobaan, tawarkan bantuan | Ya | warn |
| E-AUTH-003 | error | `error.auth.session_revoked` | Sesi dicabut | Hentikan sync, pairing ulang | Tidak | warn |
| E-AUTH-004 | error | `error.auth.git_credential_invalid` | Kredensial Git tidak valid | Minta ulang, hapus dari memori | Ya | warn |
| E-AUTH-005 | critical | `error.auth.device_key_mismatch` | Kunci perangkat tidak cocok | Tolak sesi, pairing ulang | Tidak | error |
| E-AUTH-006 | warning | `error.auth.recovery_mismatch` | Frasa pemulihan tidak menurunkan `identity_pubkey` yang sama | Batasi 10 percobaan/menit, tampilkan kegagalan generik | Ya | warn |
| E-CRYPTO-001 | critical | `error.crypto.envelope_corrupt` | Envelope rusak/tag gagal | Tolak payload, audit | Tidak | error |
| E-CRYPTO-002 | error | `error.crypto.unknown_key_id` | Key ID tidak dikenal | Minta kunci benar | Tidak | error |
| E-CRYPTO-003 | critical | `error.crypto.nonce_reuse` | Nonce reuse | Hentikan enkripsi, insiden | Tidak | error |
| E-CRYPTO-004 | error | `error.crypto.decrypt_failed` | Kunci tidak dapat mendekripsi | Tolak, tawarkan pemulihan | Ya | warn |
| E-CRYPTO-005 | critical | `error.crypto.signature_invalid` | Signature manifest/backup tidak valid | Tolak artefak | Tidak | error |
| E-NET-001 | warning | `error.net.peer_not_found` | Peer tidak ditemukan | Fallback transport | Ya | info |
| E-NET-002 | error | `error.net.tls_pinning_failed` | TLS pinning gagal | Batalkan koneksi | Tidak | error |
| E-NET-003 | warning | `error.net.server_unreachable` | Server tidak terjangkau | Antre dan backoff | Ya | warn |
| E-NET-004 | error | `error.net.byos_auth_failed` | Kredensial BYOS ditolak | Minta ulang dari Vault | Ya | warn |
| E-NET-005 | warning | `error.net.rate_limited` | Kuota/rate limit | Backoff, kecilkan batch | Ya | warn |
| E-SRV-001 | critical | `error.server.migration_failed` | Migrasi DB gagal | Rollback, jangan melayani | Tidak | error |
| E-SRV-002 | error | `error.server.idp_unreachable` | IdP tidak terjangkau | Status, sesi aktif tetap | Ya | warn |
| E-SRV-003 | error | `error.server.storage_unavailable` | Object storage tidak tersedia | Degraded, antre unggahan | Ya | error |
| E-SRV-004 | error | `error.server.queue_unavailable` | Queue gagal | Degraded, retry | Ya | error |
| E-SRV-005 | critical | `error.server.audit_chain_invalid` | Audit chain tidak valid | Hentikan aksi sensitif | Tidak | error |
| E-DEV-001 | warning | `error.devtools.runtime_unavailable` | DevTools tidak dapat akses runtime | Tampilkan status | Ya | warn |
| E-DEV-002 | warning | `error.devtools.query_inspector_failed` | Inspector query gagal | Tampilkan error, lanjutkan app | Ya | warn |
| E-DEV-003 | error | `error.devtools.plugin_load_failed` | Plugin gagal dimuat | Nonaktifkan plugin | Tidak | error |
| E-DEV-004 | warning | `error.devtools.plugin_permission_denied` | Capability di luar izin | Tolak, minta consent | Tidak | warn |
| E-DEV-005 | warning | `error.devtools.analytics_optin_failed` | Opt-in analytics gagal | Matikan pengumpulan | Ya | warn |
| E-CLI-001 | error | `error.cli.validation_failed` | Validasi manifest gagal | Exit 1, tampilkan field | Tidak | error |
| E-CLI-002 | error | `error.cli.network_unavailable` | Jaringan tidak tersedia | Exit 2, saran dry-run | Ya | error |
| E-CLI-003 | error | `error.cli.signature_invalid` | Signature/permission tidak valid | Exit 3, jangan publish | Tidak | error |
| E-CLI-004 | error | `error.cli.template_missing` | Template tidak ditemukan | Exit 1, daftar template | Tidak | error |
| E-CLI-005 | error | `error.cli.not_reproducible` | Pack tidak reproducible | Exit 1, tampilkan hash | Tidak | error |

## 5. Error dan Recovery

| Kategori | Perilaku UI | Aksi |
|---|---|---|
| `warning` | Toast/banner, alur berlanjut | Retry, abaikan, buka detail |
| `error` | Panel error pada area terkait | Retry, ubah pengaturan, ekspor |
| `critical` | Error boundary layar penuh | Restart, rollback, ekspor, laporkan lokal |

Error yang tidak dikenali MUST dipetakan ke `E-HOST-005`-style fallback generik dengan kode asli disertakan pada detail teknis yang dapat disalin pengguna.

## 6. Keamanan dan Privasi

- Pesan tidak memuat path absolut, nama pengguna, token, atau isi data.
- Detail teknis disimpan lokal dan hanya dikirim bila pengguna memilih ekspor.
- Kode kriptografi tidak membocorkan apakah kunci ada; hanya status gagal.
- Audit mencatat kode dan konteks minimal, bukan payload.

## 7. Acceptance Criteria

- **Given** kode error pada spec **When** `docs:check` dijalankan **Then** kode terdaftar dan referensi valid.
- **Given** error `critical` **When** terjadi **Then** error boundary tampil dengan aksi restart/rollback/export.
- **Given** pesan error **When** diperiksa **Then** tidak ada PII, token, atau stack trace.
- **Given** error `retryable: true` **When** retry otomatis **Then** backoff diterapkan dan aksi destruktif tidak diulang.

## 8. Verifikasi

| Bukti | Perintah/Prosedur |
|---|---|
| Registry kode | `npm run docs:check` memvalidasi referensi dan duplikasi |
| Urutan | Skrip memeriksa nomor berurutan per domain |
| Copy | Review locale `id-ID` dan `en-US` untuk 60 kode |
| UI | Snapshot error boundary per severity |
| Redaksi | Fixture log dengan token/PII; pastikan tersaring |

## 9. Referensi

- [03-specs/error-codes.md](error-codes.md), [02-design/content-i18n.md](../02-design/content-i18n.md)
- [08-quality/security-test-plan.md](../08-quality/security-test-plan.md)
