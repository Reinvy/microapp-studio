---
id: SPEC-REG
title: Registry dan Distribusi
status: accepted
owner: registry
prd_refs: ["§3 Modul 5", "§4.3", "§5.1"]
---

# 05. Registry dan Distribusi

## 1. Tujuan dan Ruang Lingkup

Registry mendistribusikan micro-app secara terfederasi tanpa gatekeeper: indeks statis bertanda tangan, cache offline, empat jalur instalasi, verifikasi signature, scanner, delta update, pinning, dan rollback. Client MUST dapat memverifikasi seluruh artefak secara lokal.

Di luar lingkup: pembangunan paket (spec 02/08), sinkronisasi data (spec 06), kebijakan konten (dokumen governance).

## 2. Aktor dan Prasyarat

| Aktor | Prasyarat |
|---|---|
| Pengguna | Local Identity; akses ke registry atau berkas `.mapp` |
| Registry maintainer | Kunci registry; indeks bertanda tangan |
| Author | Kunci author; reproducible build |
| Admin organisasi | Server self-host dan kebijakan internal |

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| FR-REG-001 | MUST | Pengguna MUST dapat menambah, menghapus, menonaktifkan, dan memprioritaskan beberapa sumber registry; urutan prioritas menentukan sumber yang dipilih saat id sama muncul. | Dua registry menyediakan versi berbeda; sumber prioritas lebih tinggi yang dipakai; menghapus sumber tidak menghapus app terpasang. |
| FR-REG-002 | MUST | Registry MUST berupa indeks JSON statis yang dapat di-host di GitHub Pages, GitLab, MinIO, Nginx statis, atau server MicroApp Studio, tanpa API proprietary. | Indeks dari keempat host dapat dibaca dan diverifikasi. |
| FR-REG-003 | MUST | Indeks registry MUST di-cache 24 jam, tetap dapat dipakai tanpa batas waktu saat offline, dan signature MUST diverifikasi pada setiap pemuatan dari cache. | Offline 30 hari tetap menampilkan katalog; cache yang dimodifikasi gagal verifikasi. |
| FR-REG-004 | MUST | Setiap indeks MUST menyertakan `schemaVersion`, `name`, `url`, `publicKey`, `updatedAt`, dan `apps[]` sesuai JSON Schema registry index v1. | Indeks yang tidak sesuai schema ditolak dengan daftar field bermasalah. |
| FR-REG-005 | MUST | Trust level MUST dibedakan menjadi `official`, `community`, `internal`, dan `local`, dan UI MUST menampilkan level serta sumber sebelum instalasi. | Badge trust tampil pada detail app; app lokal tidak diberi label official. |
| FR-REG-006 | MUST | Pencarian MUST mencakup seluruh registry aktif dan cache lokal, dengan filter kategori, trust level, dan status terpasang. | Query lintas tiga registry menampilkan hasil gabungan tanpa duplikat id. |
| FR-REG-007 | MUST | Instalasi dari registry MUST memverifikasi manifest, signature author, signature registry, dan `contentHash` sebelum menampilkan consent permission. | Artefak yang diubah gagal sebelum dialog consent muncul. |
| FR-REG-008 | MUST | Pengguna MUST dapat memasang langsung dari URL repositori Git atau Git tag, dengan verifikasi manifest dan signature bila tersedia. | Instal dari tag menghasilkan versi yang sama dengan registry; repo tanpa signature menampilkan peringatan. |
| FR-REG-009 | MUST | Pengguna MUST dapat memasang berkas `.mapp` lokal sepenuhnya offline melalui file picker, dengan verifikasi signature dan hash yang sama seperti registry. | Mode pesawat: `.mapp` valid terpasang; berkas rusak ditolak. |
| FR-REG-010 | SHOULD | Admin organisasi MUST dapat mengonfigurasi auto-install paket internal ke perangkat tim saat terhubung ke server kantor, dengan opt-out perangkat. | Kebijakan push memasang app internal; perangkat dengan opt-out tidak memasang. |
| FR-REG-011 | MUST | Manifest MUST divalidasi terhadap JSON Schema dan aturan `manifest-v2.md` sebelum instalasi, termasuk regex `id`, semver, dan path relatif tanpa `..`. | Manifest dengan `id` invalid atau path traversal ditolak. |
| FR-REG-012 | MUST | Registry key dan author key MUST terpisah; keduanya MUST diverifikasi dan tidak boleh berasal dari kunci yang sama. | Indeks dengan kunci registry sama dengan author ditolak. |
| FR-REG-013 | MUST | Client MUST menerapkan TOFU: kunci author di-pin pada instalasi pertama dan dibandingkan pada setiap update; perubahan kunci MUST memicu peringatan keras dan memblokir update sampai pengguna menyetujui secara eksplisit. | Update dengan kunci berbeda diblokir; menyetujui sekali memperbarui pin dan mencatat audit. |
| FR-REG-014 | MUST | Reproducible build MUST dapat diverifikasi client: hash artefak dibandingkan dengan hash hasil build ulang dari commit dan builder image yang dicatat di manifest. | Build ulang menghasilkan `contentHash` identik; ketidakcocokan memblokir instalasi. |
| FR-REG-015 | MUST | Scanner MUST menjalankan SAST, SCA/CVE, deteksi obfuscation, dan audit permission sebelum instalasi, serta MUST menampilkan temuan dengan severity. | Artefak dengan pola `eval` atau permission berisiko tinggi menampilkan temuan dan memerlukan konfirmasi tambahan. |
| FR-REG-016 | MUST | Dialog consent MUST menampilkan permission required/optional, risk tier, ukuran unduhan, sumber, trust level, dan konsekuensi Offline Cage. | Consent memuat semua field; menolak membatalkan instalasi tanpa efek samping. |
| FR-REG-017 | MUST | Update MUST menggunakan delta diff bila tersedia, dengan verifikasi hash artefak akhir setelah patch. | Update delta menghasilkan hash sama dengan unduhan penuh; patch rusak ditolak. |
| FR-REG-018 | MUST | Pengguna MUST dapat memilih mode update `auto`, `notify`, atau `pin`, dan pilihan MUST bertahan per app. | Mode `pin` tidak mengubah versi meski ada rilis baru; `notify` hanya memberi tahu. |
| FR-REG-019 | MUST | Pin versi MUST mengunci versi tertentu dan mencegah update otomatis maupun delta, sampai pengguna melepas pin. | Pin aktif menahan update; melepas pin mengizinkan update berikutnya. |
| FR-REG-020 | MUST | Rollback satu klik MUST tersedia ke versi sebelumnya yang masih diarsipkan, dengan snapshot database sebelum rollback dan verifikasi signature versi lama. | Rollback mengembalikan bundle dan skema; snapshot dibuat; signature diverifikasi. |
| FR-REG-021 | MUST | Host MUST menyimpan arsip minimal satu versi sebelumnya per app selama batas penyimpanan belum terlampaui, dan MUST memberi tahu sebelum menghapus arsip. | Setelah update, versi lama tersedia untuk rollback; penghapusan arsip memerlukan konfirmasi. |
| FR-REG-022 | MUST | Registry internal MUST dapat di-host oleh server self-host dan diprioritaskan untuk perangkat organisasi tanpa mengubah format indeks. | Server menyajikan indeks yang sama; perangkat organisasi memakainya lebih dulu. |
| FR-REG-023 | MUST | Rotasi dan pencabutan kunci MUST didukung: indeks memuat `revokedKeys`, dan client MUST menolak artefak yang ditandatangani kunci dicabut. | Artefak dengan kunci dicabut ditolak meski signature valid. |
| FR-REG-024 | SHOULD | Client MUST mematuhi sinyal delisting registry (mis. malware) dengan menonaktifkan instalasi baru dan menampilkan peringatan, tanpa menghapus data pengguna secara otomatis. | App terdelisting tidak dapat diinstal baru; data tetap ada dan dapat diekspor. |
| FR-REG-025 | MUST | Semua operasi registry (fetch, verifikasi, install, update, rollback, penolakan) MUST dicatat di audit lokal dengan sumber, versi, dan hasil. | Audit memuat setiap operasi dengan hasil; tidak ada payload sensitif. |

## 4. Model Data dan State

| Entitas | Field kunci | Invariant |
|---|---|---|
| `registries` | `id`, `name`, `url`, `public_signing_key`, `cached_index_json`, `last_fetched_at`, `trust_level`, `priority` | `url` unik; `trust_level` ∈ empat nilai |
| `installed_microapps` | `app_id`, `version`, `previous_version`, `bundle_path`, `manifest_json`, `granted_permissions`, `offline_cage_enabled`, `pinned_version`, `update_mode` | Satu baris per app per workspace |
| `registry_pins` | `author_key_id`, `app_id`, `first_seen_at`, `approved_at` | Pin unik per author+app |

State instalasi: `available → verifying → consent → downloading → migrating → installed`, dan `installed → updating → installed` atau `updating → rolled_back`. Kegagalan pada `verifying` MUST NOT membuat app terpasang.

## 5. Error dan Recovery

| Kode | Kondisi | Recovery |
|---|---|---|
| E-REG-001 | Signature registry/author tidak valid | Blokir instalasi, tampilkan kunci yang gagal, catat audit |
| E-REG-002 | Kunci author berubah (TOFU mismatch) | Blokir update, tampilkan perbandingan fingerprint, minta persetujuan eksplisit |
| E-REG-003 | Hash artefak tidak cocok dengan manifest | Tolak artefak, hapus unduhan sementara |
| E-REG-004 | Scanner menolak artefak | Blokir instalasi, tampilkan temuan dan kanal banding |
| E-REG-005 | Delta patch gagal diterapkan | Jatuh ke unduhan penuh setelah verifikasi, atau batalkan update |

## 6. Keamanan dan Privasi

- Signature diverifikasi sebelum consent; tidak ada instalasi "trust on download".
- Kunci registry dan author tidak pernah disimpan sebagai private key di client.
- Indeks dan artefak di-cache tanpa data pengguna; tidak ada pelacakan unduhan.
- Nama app, ikon, dan deskripsi diperlakukan sebagai konten tidak tepercaya (tanpa HTML).
- Audit mencatat fingerprint kunci, bukan isi manifest sensitif.

## 7. Acceptance Criteria

- **Given** indeks yang dimodifikasi setelah signing **When** client memuat cache **Then** verifikasi gagal dan katalog tidak dipakai.
- **Given** update dengan kunci author berbeda **When** pengguna menjalankan update **Then** update diblokir sampai persetujuan eksplisit.
- **Given** perangkat offline dengan `.mapp` **When** pengguna memasang **Then** verifikasi dan instalasi berhasil tanpa jaringan.
- **Given** versi baru rusak **When** pengguna rollback **Then** versi lama berjalan dan snapshot database tersedia.
- **Given** app dengan `network.allowlist` kosong **When** detail ditampilkan **Then** badge 100% Offline Verified muncul sebelum instalasi.

## 8. Verifikasi

| Bukti | Perintah/Prosedur |
|---|---|
| Signature | Fixture signature valid, rusak, dan kunci dicabut |
| TOFU | Simulasi perubahan kunci author; verifikasi blokir dan audit |
| Reproducible | Build dua kali dari commit sama; bandingkan `contentHash` |
| Delta | Terapkan patch pada versi lama; bandingkan hash hasil |
| Offline | Install dari `.mapp` dengan seluruh jaringan diblokir |

## 9. Referensi

- [03-specs/manifest-v2.md](manifest-v2.md), [03-specs/schemas/registry-index.v1.schema.json](schemas/registry-index.v1.schema.json)
- [01-architecture/registry-supply-chain.md](../01-architecture/registry-supply-chain.md), [04-flows/02-install-update-rollback.md](../04-flows/02-install-update-rollback.md), [04-flows/09-publish-verify.md](../04-flows/09-publish-verify.md)
