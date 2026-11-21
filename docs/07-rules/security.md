---
id: RULE-SEC
title: Rules Keamanan Web
status: accepted
owner: security
prd_refs: ["§5", "§11"]
---

# Rules Keamanan Web

Aturan ini mengikat seluruh kode yang menangani identitas, sandbox, package, permission, backup, dan integrasi AI. Model ancaman lengkap ada di [threat-model.md](../01-architecture/threat-model.md); kontrak permission ada di [permissions.md](../03-specs/permissions.md). Aturan keamanan menang atas aturan lain saat terjadi konflik.

## 1. Tujuan dan Ruang Lingkup

| Aset | Perlindungan |
|---|---|
| Data lokal pengguna | SQLite WASM/OPFS, hanya diakses worker. |
| Kunci identitas dan backup | WebCrypto non-extractable, backup terenkripsi. |
| Package `.mapp` | Signature Ed25519, digest, verifikasi sebelum install. |
| Vault BYOK | Terenkripsi, tidak pernah masuk log atau source. |
| Origin host | CSP ketat, sandbox opaque origin, tanpa eksekusi string. |

Di luar cakupan: kode micro-app pihak ketiga (dibatasi manifest dan broker), serta infrastruktur hosting (lihat [deployment.md](../09-operations/deployment.md)).

## 2. Prinsip

1. **Zero trust.** Micro-app adalah kode tidak tepercaya; host memvalidasi setiap pesan, argumen, dan manifest.
2. **Least privilege.** Tidak ada permission default; setiap akses melewati consent dan audit.
3. **Fail closed.** Bila verifikasi, sandbox, atau CSP tidak tersedia, operasi ditolak; tidak ada jalur eksekusi alternatif.
4. **Tanpa telemetry.** Tidak ada data keluar tanpa aksi eksplisit pengguna.

## 3. Aturan

| ID | Level | Aturan | Verifikasi |
|---|---|---|---|
| RULE-SEC-001 | MUST | Micro-app berjalan tanpa privilege sampai permission diberikan. Host MUST NOT mempercayai `postMessage` tanpa validasi origin, namespace, method, dan schema parameter. | Test bridge, review |
| RULE-SEC-002 | MUST | Setiap permission dideklarasikan di manifest dengan alasan; permission yang tidak dideklarasikan tidak dapat diminta saat runtime. | Validasi manifest, SEC-002 |
| RULE-SEC-003 | MUST | Consent JIT tampil sebelum akses pertama, dengan opsi izinkan sekali, selalu izinkan, dan tolak. Fokus awal pada tolak. | E2E consent, SEC-003 |
| RULE-SEC-004 | MUST | Offline Cage aktif secara default: permintaan jaringan micro-app ditolak kecuali permission jaringan diberikan. | Test runtime, SEC-004 |
| RULE-SEC-005 | MUST | Package hanya dipasang setelah signature Ed25519 dan digest terverifikasi. Verifikasi gagal berarti install dibatalkan. | Test package, SEC-005 |
| RULE-SEC-006 | MUST | Perubahan public key untuk app yang sama memicu peringatan keras dan memerlukan konfirmasi eksplisit; tidak ada auto-trust. | Test, SEC-006 |
| RULE-SEC-007 | MUST | Tidak ada secret, kunci, token, atau passphrase di source, fixture, log, pesan error, atau dokumen. Fixture memakai nilai sintetis. | Secret scan, SEC-007 |
| RULE-SEC-008 | MUST | Kunci BYOK hanya disimpan di vault lokal dan dibaca saat permintaan; dilarang di `localStorage`, URL, cookie, atau state global. | Review, FR-SET-004 |
| RULE-SEC-009 | MUST | Dilarang `eval`, `new Function`, HTML mentah, dan skrip inline. Render micro-app hanya lewat MUIP. | Grep CI, review |
| RULE-SEC-010 | MUST | Respons memakai CSP `default-src 'none'` dengan nonce untuk bootstrap, ditambah COOP dan COEP. `unsafe-inline` dan `unsafe-eval` dilarang. | Header check, SEC-010 |
| RULE-SEC-011 | MUST | Iframe micro-app memakai `sandbox="allow-scripts"` tanpa `allow-same-origin` sehingga origin opaque; akses ke DOM host dilarang. | Test sandbox, SEC-011 |
| RULE-SEC-012 | MUST | Backup memakai AES-256-GCM dengan kunci turunan Argon2id; passphrase tidak pernah disimpan dan checksum per section diverifikasi saat restore. | Test backup, SEC-012 |
| RULE-SEC-013 | MUST | Tidak ada telemetry, analytics pihak ketiga, atau beacon default. Penambahan apa pun memerlukan RFC dan opt-in eksplisit. | Audit jaringan, SEC-013 |
| RULE-SEC-014 | MUST | Aksi sensitif (grant, revoke, install, ekspor, restore) dicatat pada audit lokal dengan hash chain dan redaksi data. | Test audit, SEC-014 |
| RULE-SEC-015 | MUST | Kerentanan dilaporkan melalui jalur privat di [SECURITY.md](../../SECURITY.md) dan ditangani sesuai [incident-response.md](../09-operations/incident-response.md); detail tidak dipublikasikan sebelum perbaikan. | Prosedur insiden |
| RULE-SEC-016 | MUST | Bila iframe sandbox, verifikasi signature, atau WebCrypto tidak tersedia, aplikasi menolak menjalankan atau memasang package dan menampilkan alasan; tidak ada fallback. | Test fail-closed, FR-RUN-013 |

## 4. Pemeriksaan Wajib per Perubahan

| Perubahan | Pemeriksaan minimal |
|---|---|
| Bridge atau permission | Test bypass, schema validation, rate limit, audit. |
| Sandbox atau CSP | Uji escape, pelanggaran CSP, dan origin opaque. |
| Package atau manifest | Signature tamper, digest mismatch, key mismatch. |
| Crypto atau backup | Vektor uji, review `security`, dokumentasi format. |
| AI atau vault | Tidak ada kunci di log, request hanya ke endpoint pengguna. |

## 5. Anti-pola

| Anti-pola | Risiko |
|---|---|
| Mempercayai `event.origin` tanpa allowlist | Pesan palsu dari frame lain. |
| Menyimpan kunci di `sessionStorage` | Dapat dibaca skrip di origin yang sama. |
| Menampilkan stack trace ke pengguna | Membocorkan path dan struktur internal. |
| Menambahkan CDN font atau skrip | Memperluas permukaan pasokan dan melanggar CSP. |
| Menonaktifkan sandbox untuk memperbaiki bug | Membuka akses DOM host. |

## 6. Verifikasi

| Langkah | Perintah | Lulus bila |
|---|---|---|
| Unit dan integrasi | `npm test` | Test sandbox, bridge, package, dan backup lulus. |
| Uji keamanan | Skenario di [security-test-plan.md](../08-quality/security-test-plan.md) | Tidak ada bypass yang ditemukan. |
| Header | Pemeriksaan header build | CSP, COOP, COEP sesuai kontrak. |
| Secret | Secret scan pada diff | Tidak ada kandidat secret. |

## 7. Pengecualian

Pengecualian pada RULE-SEC MUST disetujui reviewer `security`, dicatat di PR, dan tidak boleh menyentuh RULE-SEC-005, RULE-SEC-009, RULE-SEC-010, RULE-SEC-011, atau RULE-SEC-016. Pelanggaran lama dicatat di [implementation-status.md](../00-foundation/implementation-status.md).
