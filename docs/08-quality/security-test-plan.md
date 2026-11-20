---
id: QA-SECURITY
title: Rencana Test Keamanan
status: accepted
owner: security
prd_refs: ["§5.1", "§5.2"]
---

# Rencana Test Keamanan

Dokumen ini menetapkan suite pengujian keamanan yang diturunkan langsung dari [threat model](../01-architecture/threat-model.md). Setiap baris register risiko R-01 sampai R-20 MUST memiliki suite yang dapat dijalankan ulang; klaim mitigasi tanpa test dianggap belum terverifikasi.

## 1. Tujuan dan Ruang Lingkup

- Membuktikan bahwa kontrol pada threat model benar-benar menahan ancaman yang dinyatakan, bukan hanya terdokumentasi.
- Menjaga agar perubahan manifest, host bridge, sync/CRDT, permission, crypto, dan registry tidak menurunkan postur keamanan.
- Menetapkan severity, SLA perbaikan, dan bukti yang wajib ada sebelum rilis.

Cakupan: Host Shell web/native, sandbox runtime, capability broker, host bridge/MUIP, penyimpanan lokal dan vault, sync E2EE, registry dan supply chain, server self-host, pipeline AI/workflow, plugin, serta pipeline rilis.

## 2. Metode

1. Ambil aset, aktor, trust boundary, dan register risiko dari threat model.
2. Petakan setiap risiko ke satu suite utama dan minimal satu assertion yang gagal bila kontrol dihapus.
3. Otomasikan sebanyak mungkin; test manual hanya untuk properti yang tidak dapat disimulasikan (mis. audit visual dialog consent, uji perangkat fisik).
4. Jalankan suite keamanan pada setiap PR yang menyentuh area terkait dan seluruhnya pada release candidate.
5. Temuan baru MUST masuk register risiko dengan pemilik, severity, dan tenggat; temuan tidak boleh ditutup tanpa test regresi.

Prinsip pengujian: uji dari sisi penyerang (untrusted input, urutan tidak wajar, state rusak), bukan hanya happy path. Test MUST memastikan sistem **fail closed**.

## 3. Matriks Suite per Risiko

Nama suite dan rumusan ancaman mengikuti register risiko threat model agar dapat diaudit baris per baris.

| Risiko | Ancaman | Suite | Pengujian inti | Spec terkait | Otomasi |
|---|---|---|---|---|---|
| R-01 | Micro-app jahat mencoba escape sandbox dan membaca data host | sandbox escape | Payload mencoba `parent`, `top`, `window.opener`, akses DOM induk, `localStorage`, cookie, dan API ambient; pastikan seluruhnya gagal dan isolate dihentikan | [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md) | Wajib CI |
| R-02 | Registry hijacking: index atau blob diganti penyerang | registry signature | Ganti index/blob setelah signing; signature registry dan author diperiksa ulang; TOFU menolak kunci berubah | [05-registry.md](../03-specs/05-registry.md) | Wajib CI |
| R-03 | Kompromi server self-host | server compromise | Beri penyerang akses DB dan disk server; pastikan hanya ciphertext dan metadata minimal terlihat, RBAC menolak eskalasi, audit chain valid | [07-selfhost.md](../03-specs/07-selfhost.md) | Integration |
| R-04 | Evil twin/LAN attacker menyamar sebagai peer atau server | LAN adversary | Peer tanpa pairing, SAS salah, sertifikat salah, dan ARP spoof ditolak; TLS pinning gagal menutup koneksi | [06-sync-backup.md](../03-specs/06-sync-backup.md) | Integration + manual |
| R-05 | SSRF melalui node workflow HTTP | SSRF | Target `127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`, `::1`, DNS rebinding, redirect ke IP privat harus diblokir | [04-data-automation.md](../03-specs/04-data-automation.md) | Wajib CI |
| R-06 | XSS/MUIP injection: node atau props berisi HTML/JS mentah | MUIP injection | Kirim `script`, `onerror`, `javascript:`, SVG berbahaya, dan string raksasa; renderer hanya menerima tipe whitelist | [03-specs/ui-protocol.md](../03-specs/ui-protocol.md) | Wajib CI |
| R-07 | Path traversal atau zip bomb pada `.mapp` | archive parsing | Entry `../`, path absolut, symlink, entry > batas, total > batas, rasio dekompresi ekstrem, ZIP bersarang | [03-specs/manifest-v2.md](../03-specs/manifest-v2.md) | Wajib CI + fuzz |
| R-08 | Bridge method confusion: memanggil method namespace lain dengan parameter yang salah | bridge fuzzing | Method lintas namespace, parameter tambahan, `app_id` palsu, tipe salah, dan payload besar harus ditolak sebelum eksekusi | [03-specs/host-bridge.md](../03-specs/host-bridge.md) | Wajib CI + fuzz |
| R-09 | Replay/nonce reuse pada sync atau bridge | replay | Kirim ulang envelope identik, nonce sama, cursor lama, dan batch duplikat; hanya satu efek yang boleh terjadi | [03-specs/host-bridge.md](../03-specs/host-bridge.md) | Wajib CI |
| R-10 | Key exfiltration dari penyimpanan | key handling | Pastikan kunci non-extractable, tidak muncul di log/serialisasi, dan signing hanya terjadi di Rust core; uji zeroize | [01-architecture/identity-crypto.md](../01-architecture/identity-crypto.md) | Wajib CI |
| R-11 | Brute force backup terenkripsi | backup crypto | Uji KDF memory-hard, rate limit percobaan, passphrase salah, dan tidak ada verifier offline yang membocorkan kunci | [06-sync-backup.md](../03-specs/06-sync-backup.md) | Wajib CI |
| R-12 | Admin takeover pada self-host | authz matrix | Matriks peran × aksi; pastikan `viewer`, `member`, `maintainer`, `admin`, `owner` tidak dapat melewati batas; session revoke berlaku | [07-selfhost.md](../03-specs/07-selfhost.md) | Integration |
| R-13 | Audit tampering | audit integrity | Ubah/hapus baris audit; verifikasi hash chain mendeteksi dan menghentikan aksi sensitif (E-SRV-005) | [07-selfhost.md](../03-specs/07-selfhost.md) | Integration |
| R-14 | Plugin/driver supply chain | dependency scan | Plugin tanpa signature, permission berlebih, dan dependency rentan harus ditolak atau ditandai | [03-specs/08-devtools-cli-sdk.md](../03-specs/08-devtools-cli-sdk.md) | CI |
| R-15 | DoS via payload, loop, atau request flood | resource exhaustion | MUIP 10.000 node/1 MiB, string 64 KiB, loop tak terbatas, dan flood request harus dibatasi watchdog/rate limit | [03-specs/ui-protocol.md](../03-specs/ui-protocol.md) | Wajib CI |
| R-16 | Prompt injection dari konten micro-app ke AI | AI pipeline | Konten jahat yang menyuruh mengabaikan aturan harus diperlakukan sebagai data; output divalidasi, di-lint, dan di-preview | [01-architecture/ai-workflow.md](../01-architecture/ai-workflow.md) | Integration + manual |
| R-17 | Dependency confusion pada paket npm/crate/Go | supply chain | Lockfile, registry internal, signature artefak, dan SBOM harus menolak paket dari sumber tidak sah | [01-architecture/monorepo.md](../01-architecture/monorepo.md) | CI |
| R-18 | Rollback/stale cache menyajikan versi rentan | update integrity | Downgrade tanpa consent, cache lama, dan delta yang dipalsukan harus ditolak; signature diverifikasi setiap load | [05-registry.md](../03-specs/05-registry.md) | Wajib CI |
| R-19 | Kebocoran metadata sync | metadata leak | Periksa field yang dikirim ke server; tidak ada nama tabel, nilai kolom, atau identitas plaintext di luar ciphertext | [01-architecture/sync-crdt.md](../01-architecture/sync-crdt.md) | Integration |
| R-20 | Data lokal dibaca malware setelah perangkat terbuka | at-rest encryption | Baca file DB/vault tanpa kunci; pastikan field sensitif dan vault tidak dapat didekripsi; auto-lock 5 menit bekerja | [01-architecture/data-model.md](../01-architecture/data-model.md) | Wajib CI |

## 4. Detail Suite

### 4.1 Sandbox escape dan capability bypass

- Uji web: iframe tanpa `allow-same-origin`, CSP `default-src 'none'`, tidak ada akses `parent.document`, `localStorage`, `indexedDB` host, atau `fetch` langsung.
- Uji native: QuickJS tanpa binding ambient; Wasmtime tanpa preopen direktori; percobaan `import` modul terlarang gagal.
- Uji broker: panggilan tanpa grant ditolak sebelum validasi parameter (SEC-014); grant `Allow once` hilang setelah app ditutup (SEC-015); revoke berlaku segera (SEC-016).
- Uji Offline Cage: meskipun domain ada di `network.allowlist`, seluruh request diblokir dan badge tampil (SEC-018).
- Uji fail closed: bila isolate tidak dapat dibuat, runtime menampilkan E-SBX-001 dan MUST NOT menjalankan kode di konteks host.

### 4.2 Crypto misuse dan test vector

| Properti | Assertion |
|---|---|
| Ed25519 | Vektor RFC 8032 lulus; signature invalid ditolak (E-CRYPTO-005) |
| BIP-39 + HKDF | Frasa 24 kata menghasilkan seed dan subkey yang sama lintas platform |
| AES-256-GCM | Nonce unik; AAD berubah menyebabkan tag gagal (E-CRYPTO-001); nonce reuse terdeteksi (E-CRYPTO-003) |
| Envelope | `key_id` tidak dikenal ditolak (E-CRYPTO-002); ciphertext terpotong tidak didekripsi parsial |
| Zeroize | Buffer kunci dibersihkan setelah dipakai; kunci tidak muncul di core dump/log |
| Perbandingan | Perbandingan signature/hash memakai constant-time |

Dilarang mengklaim kompatibilitas kriptografi tanpa vektor dari standar atau implementasi referensi.

### 4.3 Authz matrix

Matriks wajib mencakup minimal:

| Aksi | owner | admin | maintainer | member | viewer |
|---|---|---|---|---|---|
| Ubah branding | Ya | Ya | Tidak | Tidak | Tidak |
| Kelola user/role | Ya | Ya | Tidak | Tidak | Tidak |
| Publikasi registry internal | Ya | Ya | Ya | Tidak | Tidak |
| Jalankan workflow | Ya | Ya | Ya | Ya | Tidak |
| Baca audit | Ya | Ya | Ya | Tidak | Tidak |
| Revoke device | Ya | Ya | Ya | Ya (milik sendiri) | Tidak |

Setiap sel MUST memiliki test positif dan negatif. Eskalasi role, token kedaluwarsa, refresh yang dicabut, dan akses lintas tenant MUST diuji.

### 4.4 SSRF dan egress

- Blokir IP privat, loopback, link-local, metadata cloud, dan IPv6 setara secara default (FR-DATA-029, FR-SRV-030).
- Resolusi DNS dilakukan sekali dan hasilnya dipakai untuk koneksi; redirect ke host/IP terlarang ditolak.
- `security.allowPrivateEgress` hanya boleh mengaktifkan tujuan eksplisit, bukan seluruh CIDR, dan perubahan konfigurasi tercatat di audit.
- Uji DNS rebinding: nama domain sah yang berubah ke IP privat saat resolve tetap ditolak.

### 4.5 Registry, signature, dan update integrity

- Signature registry dan author terpisah (FR-REG-012); kunci yang sama untuk keduanya ditolak.
- TOFU: instalasi pertama mem-pin kunci; perubahan kunci memicu E-REG-002 dan memblokir sampai persetujuan.
- Hash artefak diverifikasi setelah unduhan dan setelah delta (E-REG-003); delta gagal jatuh ke unduhan penuh, bukan instalasi parsial.
- Reproducible build diverifikasi dengan membangun ulang dan membandingkan hash (FR-REG-014).
- Delisting dan revoked key harus menonaktifkan instalasi berikutnya tanpa menghapus data pengguna (FR-REG-023, FR-REG-024).

### 4.6 Fuzzing

| Target | Alat | Durasi |
|---|---|---|
| Parser `.mapp` dan manifest | `cargo-fuzz` | 24 jam nightly, 10 menit per PR terkait |
| Envelope sync dan handshake | `cargo-fuzz`/libFuzzer | 24 jam nightly |
| Validator bridge dan MUIP | fuzzer TS (node) | 24 jam nightly |
| SSRF guard dan parser registry | Go native fuzz | 24 jam nightly |
| Parser locale dan markdown | fuzzer TS/Dart | Nightly |

Aturan: crash, panic, atau alokasi tak terbatas adalah temuan keamanan; corpus disimpan dan dijalankan ulang. Fuzz target MUST menutup jalur input yang benar-benar dapat dicapai penyerang.

## 5. Dependency, Supply Chain, dan Scanning

- Setiap PR menjalankan pemindaian dependency (SCA) dan secret scanning; temuan `critical`/`high` menggagalkan gate.
- Rilis MUST menyertakan SBOM CycloneDX atau SPDX dan provenance SLSA (NFR-SUPPLY-001, NFR-SUPPLY-002).
- Dependency baru MUST melalui review lisensi, pemeliharaan, dan jumlah maintainer; paket tanpa lockfile ditolak.
- Artefak rilis MUST ditandatangani dan checksum-nya dapat diverifikasi.
- Plugin pihak ketiga MUST ditandatangani, mendeklarasikan permission, dan dijalankan terisolasi.

## 6. Severity dan SLA

| Severity | Definisi | Acknowledge | Perbaikan | Contoh |
|---|---|---|---|---|
| Critical | Escape sandbox, kebocoran kunci, eksekusi kode jarak jauh, bypass signature | 48 jam | 7 hari | R-01, R-10, R-02 |
| High | Bypass permission/capability, SSRF ke metadata, authz escalation, data plaintext di server | 48 jam | 30 hari | R-05, R-12, R-03 |
| Medium | DoS terbatas, kebocoran metadata, kelemahan crypto non-eksploitatif | 5 hari kerja | 90 hari | R-15, R-19 |
| Low | Hardening, temuan informasional, dependensi tanpa jalur eksploitasi | 10 hari kerja | 180 hari | R-14 |

Aturan:

- SLA berlaku sejak laporan diterima, bukan sejak triase selesai.
- Temuan critical MUST memicu proses insiden dan rotasi kunci bila kunci terlibat.
- Perbaikan tanpa test regresi dianggap belum selesai.
- Perpanjangan SLA MUST disetujui `security` dan dicatat dengan alasan teknis.

## 7. Checklist Pen-test

Checklist minimum sebelum rilis besar:

1. **Recon:** inventaris endpoint, permission, dan jalur input yang dapat dijangkau micro-app.
2. **AuthN/AuthZ:** login, session, refresh, revoke, role matrix, tenant isolation.
3. **Sandbox:** escape web/native, akses storage host, bypass broker, payload MUIP.
4. **Bridge:** method confusion, parameter smuggling, rate limit, cancellation, replay.
5. **Crypto:** key storage, envelope, signature, nonce, zeroize, backup KDF.
6. **Sync:** pairing, SAS, TLS pinning, replay, cursor rollback, metadata.
7. **Registry:** signature, TOFU, hash, delta, rollback, delisting.
8. **Server:** SSRF, upload, path traversal, audit chain, plugin isolation, DoS.
9. **AI/workflow:** prompt injection, output validation, secret leakage ke log, egress.
10. **Client:** XSS, CSP, dependency, source map, debug endpoint, deep link.
11. **Privacy:** telemetry default-off, redaksi log, ekspor data.
12. **Air-gap:** tidak ada request keluar saat mode tanpa jaringan.

Checklist manual MUST dicatat sebagai bukti dengan langkah, hasil, dan pelaku.

## 8. Alur Temuan

1. Catat temuan dengan bukti reproduksi minimal dan klasifikasi severity.
2. Tentukan pemilik dan tenggat sesuai SLA.
3. Perbaiki di kode dan tambahkan test regresi yang gagal sebelum perbaikan.
4. Verifikasi perbaikan pada build release.
5. Perbarui register risiko threat model bila ada ancaman atau residual risk baru.
6. Umumkan melalui saluran keamanan yang sesuai; detail eksploitasi tidak dipublikasikan sebelum perbaikan tersedia.

## 9. Bukti dan Pelaporan

- Hasil suite keamanan MUST disimpan sebagai artefak CI (log, laporan fuzz, hasil SCA) dan ditautkan pada PR atau catatan rilis.
- Test manual MUST memuat langkah, perangkat, versi build, hasil, dan sign-off.
- Gate rilis MUST memverifikasi bahwa seluruh risiko R-01 sampai R-20 memiliki suite hijau atau pengecualian tertulis yang disetujui `security`.
- Laporan tidak boleh memuat kunci, token, data pengguna, atau detail eksploitasi yang dapat disalahgunakan.

## 10. Referensi

- [01-architecture/threat-model.md](../01-architecture/threat-model.md), [01-architecture/identity-crypto.md](../01-architecture/identity-crypto.md)
- [01-architecture/sandbox-capabilities.md](../01-architecture/sandbox-capabilities.md), [01-architecture/registry-supply-chain.md](../01-architecture/registry-supply-chain.md)
- [01-architecture/sync-crdt.md](../01-architecture/sync-crdt.md), [01-architecture/selfhost.md](../01-architecture/selfhost.md)
- [03-specs/permissions.md](../03-specs/permissions.md), [03-specs/error-codes.md](../03-specs/error-codes.md)
- [test-strategy.md](test-strategy.md), [release-gates.md](release-gates.md), [definition-of-done.md](definition-of-done.md)
