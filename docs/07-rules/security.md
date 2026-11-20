---
id: RULE-SEC
title: Aturan Keamanan
status: accepted
owner: security
prd_refs: ["§5.1", "§6"]
---

# Aturan Keamanan

Aturan ini mengikat seluruh kode, konfigurasi, pipeline rilis, dan infrastruktur. Pelanggaran yang tidak dapat dimitigasi adalah blocker merge tanpa pengecualian. ID pada tabel adalah nomor aturan `RULE-SEC-*`; requirement keamanan `SEC-001` sampai `SEC-020` tetap didefinisikan di [permissions.md](../03-specs/permissions.md). Model ancaman dan mitigasi rinci ada di [threat-model.md](../01-architecture/threat-model.md); rencana uji ada di [security-test-plan.md](../08-quality/security-test-plan.md).

## 1. Cakupan

| Aset | Aturan kunci |
|---|---|
| Identitas dan kunci | Hanya `microapp-core`; non-extractable; zeroize |
| Data pengguna | Enkripsi, AAD, tanpa plaintext di jaringan/log |
| Sandbox | Zero privilege, CSP ketat, tanpa `eval` |
| Jaringan keluar | SSRF guard, allowlist, DNS rebinding |
| Supply chain | Signature, SBOM, checksum, dependency policy |
| Server | Auth fail closed, RBAC, audit, sesi |
| Operasi | Redaksi log, tanpa telemetry default, insiden |

## 2. Aturan

### 2.1 Prinsip dan Kriptografi

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-SEC-001 | MUST | Micro-app, registry, jaringan, dan server MUST dianggap tidak tepercaya; zero privilege adalah default sehingga tanpa grant aktif seluruh panggilan capability MUST ditolak sebelum validasi parameter, dan manifest bukan grant. | Trust boundary dilanggar atau akses tanpa consent; blocker keamanan. |
| RULE-SEC-002 | MUST | Kriptografi MUST diimplementasikan hanya di `microapp-core` dengan primitive yang disetujui: Ed25519, X25519, AES-256-GCM, SHA-256, HKDF-SHA256, dan PBKDF2-HMAC-SHA512; kriptografi buatan sendiri, mode alternatif, dan `Math.random()` untuk material rahasia dilarang, dan CSPRNG platform MUST dipakai. | Implementasi kedua, algoritma baru tanpa ADR/RFC, atau kunci yang dapat diprediksi adalah blocker. |
| RULE-SEC-003 | MUST | Nonce AES-GCM 96 bit MUST unik per (key, plaintext) dan MUST dibuat acak kriptografis; kunci MUST dirotasi sebelum 2^32 pesan, dan deteksi nonce reuse MUST menghentikan enkripsi serta memicu insiden. | Nonce reuse membocorkan plaintext; insiden SEV-1. |
| RULE-SEC-004 | MUST | Kunci privat dan seed MUST disimpan di Keychain/Keystore/WebCrypto non-extractable atau Vault, MUST di-zeroize setelah dipakai, dan MUST NOT muncul di log, crash report, atau pesan error. | Ekstraksi kunci; blocker keamanan. |
| RULE-SEC-005 | MUST | Envelope MUST memakai format `version(1)|key_id(16)|nonce(12)|ciphertext|tag(16)` dengan AAD kanonik yang mengikat `site_id`, `record_type`, `record_id`, dan `schema_version`; `key_id` tidak dikenal MUST gagal tertutup. | Ciphertext dapat dipindah antar-record; test kripto gagal. |

### 2.2 Identitas, Signature, dan Supply Chain

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-SEC-006 | MUST | Signature manifest, registry index, dan paket MUST diverifikasi sebelum parsing, instalasi, atau eksekusi; kegagalan MUST memblokir operasi tanpa fallback. | Artefak palsu dapat dieksekusi; instalasi ditolak. |
| RULE-SEC-007 | MUST | Kunci registry dan kunci author MUST terpisah; TOFU per author MUST dipin, dan perubahan kunci MUST memicu peringatan keras serta blokir sampai pengguna menyetujui. | Registry hijacking tidak terdeteksi; PR registry ditolak. |
| RULE-SEC-008 | MUST | Rilis MUST menyertakan SBOM, checksum SHA-256, signature, dan provenance yang dapat diverifikasi; artefak tanpa bukti ini MUST NOT dipublikasikan. | Supply chain tidak dapat diaudit; release gate gagal. |
| RULE-SEC-009 | MUST | Dependency MUST dipatok dengan lockfile, melewati audit advisory dan kebijakan lisensi, serta MUST NOT menjalankan skrip install yang tidak diperlukan pada pipeline rilis; kerentanan MUST ditangani sesuai SLA acknowledge 48 jam, critical fix 7 hari, dan high 30 hari di [SECURITY.md](../../SECURITY.md). | Risiko supply chain atau SLA dilanggar; build dan rilis diblokir. |

### 2.3 Isolasi dan Eksekusi

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-SEC-010 | MUST | Web MUST menjalankan micro-app di `iframe` opaque origin dengan `sandbox="allow-scripts"` tanpa `allow-same-origin`, CSP `default-src 'none'`, dan tanpa `unsafe-eval`/`unsafe-inline`. | Escape sandbox; blocker keamanan. |
| RULE-SEC-011 | MUST | `eval`, `new Function`, WebView tanpa sandbox, dan eksekusi kode arbitrer MUST NOT dipakai di runtime produksi; bila isolate tidak tersedia, runtime MUST gagal tertutup. | Eksekusi kode Host; blocker keamanan. |
| RULE-SEC-012 | MUST | Bridge MUST memvalidasi `app_id`, namespace, method, skema parameter, dan permission pada setiap request; method confusion dan akses lintas app MUST ditolak. | Capability bypass; security test gagal. |
| RULE-SEC-013 | MUST | Ekstraksi arsip `.mapp` MUST menolak path traversal, symlink, entry absolut, zip bomb, dan rasio kompresi berlebih; batas ukuran dan jumlah entry MUST ditegakkan. | Penulisan file di luar direktori dan DoS; PR ditolak. |
| RULE-SEC-014 | MUST | Micro-app MUST NOT mengakses DOM induk, cookie Host, `localStorage` Host, atau API Host secara langsung; satu-satunya kanal adalah bridge. | Isolasi bocor; blocker keamanan. |

### 2.4 Jaringan dan SSRF

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-SEC-015 | MUST | Egress MUST memblokir IP privat, loopback, link-local, multicast, dan metadata endpoint secara default; pengecualian hanya melalui `security.allowPrivateEgress` yang diaudit. | SSRF ke jaringan internal; blocker keamanan. |
| RULE-SEC-016 | MUST | Redirect MUST divalidasi ulang, DNS MUST di-resolve dan IP-nya dipin pada dial, serta jumlah redirect dan ukuran respons MUST dibatasi. | DNS rebinding/redirect melewati guard; security test gagal. |
| RULE-SEC-017 | MUST | `network.allowlist` MUST hanya berisi domain exact atau wildcard subdomain HTTPS; IP literal, CIDR, dan skema non-HTTPS MUST ditolak. | Allowlist dapat dipakai memindai jaringan; PR ditolak. |

### 2.5 Server, Rahasia, dan Operasi

| ID | Level | Aturan | Konsekuensi |
|---|---|---|---|
| RULE-SEC-018 | MUST | Rahasia server MUST berasal dari environment variable atau secret file, MUST NOT ditulis di `microapp.yaml`, kode, image, atau log, dan rotasi MUST tersedia tanpa rebuild; sesi MUST memakai access token 15 menit dengan refresh/session 30 hari, rotasi, dan revoke per device, tanpa token di `localStorage`. | Kebocoran rahasia atau sesi panjang yang dapat dicuri; deploy dan PR auth diblokir. |
| RULE-SEC-019 | MUST | Otorisasi server MUST default deny, memakai RBAC/ABAC, dan setiap aksi sensitif MUST menghasilkan audit hash-chained yang tidak dapat dihapus diam-diam. | Privilege escalation tanpa jejak; blocker. |
| RULE-SEC-020 | MUST | Log, trace, dan crash report MUST meredaksi token, cookie, kunci, isi prompt, dan PII; telemetri MUST opt-in, default mati, tanpa pihak ketiga, dan tanpa device fingerprint. | Kebocoran data dan pelanggaran privasi; blocker. |

## 3. Pengecualian dan Penegakan

1. Tidak ada pengecualian untuk RULE-SEC-001, RULE-SEC-002, RULE-SEC-010, RULE-SEC-011, RULE-SEC-012, RULE-SEC-014, RULE-SEC-015, atau RULE-SEC-020.
2. Perubahan pada kriptografi, sandbox, permission, auth, signature, atau SSRF MUST melalui RFC dan review security sebelum implementasi.
3. Setiap temuan security MUST memiliki severity, bukti reproduksi, dan test regresi; temuan critical/high memblokir rilis.
4. Audit keamanan dijalankan pada setiap release menggunakan [security-review](../06-skills/security-review/SKILL.md).

## 4. Referensi

- [threat-model.md](../01-architecture/threat-model.md) — aset, aktor, STRIDE, residual risk.
- [identity-crypto.md](../01-architecture/identity-crypto.md) — hierarki kunci dan envelope.
- [sandbox-capabilities.md](../01-architecture/sandbox-capabilities.md) — isolasi dan broker.
- [permissions.md](../03-specs/permissions.md) — katalog permission dan consent.
- [registry-supply-chain.md](../01-architecture/registry-supply-chain.md) — signature dan TOFU.
- [security-test-plan.md](../08-quality/security-test-plan.md) — uji dan severity.
