---
id: ARCH-THREAT
title: Threat Model
status: accepted
owner: security
prd_refs: ["§8", "§11"]
---

# Threat Model

## 1. Tujuan

Dokumen ini menetapkan ancaman yang relevan untuk produk web-only dan kontrol yang mengikat. Fokusnya adalah data lokal pengguna, identitas, vault, package, dan batas sandbox. Tidak ada server aplikasi, P2P, atau LAN, sehingga ancaman terhadap komponen tersebut tidak berlaku.

Kontrol yang disebut di sini harus tercermin di [03-specs/permissions.md](../03-specs/permissions.md), [03-specs/03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md), dan [08-quality/security-test-plan.md](../08-quality/security-test-plan.md).

## 2. Aset

| Aset | Lokasi | Dampak bila bocor atau rusak |
|---|---|---|
| Data app dan draft | OPFS | Kehilangan pekerjaan, kebocoran data pribadi |
| Kunci identitas | Worker + IndexedDB | Pemalsuan package, kehilangan kepercayaan |
| Frasa pemulihan | IndexedDB terenkripsi | Pengambilalihan identitas dan backup |
| Vault dan BYOK | `vault_items` terenkripsi | Biaya API, akses ke layanan pihak ketiga |
| Package `.mapp` | OPFS dan file unduhan | Eksekusi kode berbahaya, suplai malware |
| Audit lokal | `audit_log_chain` | Hilangnya bukti insiden |
| Ketersediaan shell | Service worker dan cache | Kehilangan akses ke app terpasang |
| Integritas build | npm dan pipeline deploy | Backdoor pada seluruh pengguna |

## 3. Aktor

| Aktor | Kepercayaan | Kemampuan |
|---|---|---|
| Pengguna | Dipercaya untuk perangkatnya | Membuka file, memberi consent, mencabut izin |
| Penulis app pihak ketiga | Tidak dipercaya | Mengirim kode dan manifest |
| Penyedia package/index | Tidak dipercaya | Menyajikan file dan metadata |
| Dependensi npm | Tidak dipercaya sampai ditinjau | Menjalankan kode saat build atau runtime |
| Jaringan | Tidak dipercaya | Menyadap atau mengubah respons tanpa HTTPS |
| Ekstensi browser atau malware lokal | Di luar kendali | Membaca halaman, mencuri storage |
| Endpoint AI BYOK | Tidak dipercaya | Menerima prompt, mengembalikan output |
| Operator hosting | Tidak dipercaya untuk data | Menyajikan aset; tidak menerima data pengguna |

## 4. STRIDE

| Kategori | Ancaman konkret | Kontrol utama | Residual |
|---|---|---|---|
| Spoofing | Package mengaku dari penulis lain; deep link menyamar sebagai app resmi | Signature Ed25519, fingerprint, peringatan perubahan key, konfirmasi deep link | Pengguna tetap dapat menyetujui key baru yang salah |
| Tampering | Byte package diubah; backup dimodifikasi; audit dihapus | Digest per file, content hash, AES-GCM, rantai hash audit | Serangan dengan akses penuh ke perangkat dapat menulis ulang seluruh storage |
| Repudiation | Pengguna menyangkal memberi consent | Audit lokal dengan waktu dan hasil | Audit hanya lokal, tidak dapat menjadi bukti pihak ketiga |
| Information disclosure | XSS membaca token; app membaca data app lain; log membocorkan BYOK | React escaping, CSP, iframe opaque origin, isolasi DB, redaksi log | Bug browser atau ekstensi berbahaya tetap dapat membaca halaman |
| Denial of service | Loop tak terbatas; storage penuh; cache diusir | Watchdog, restart budget, kuota, peringatan 80%, ekspor | Browser dapat mengusir data kapan saja |
| Elevation of privilege | App memanggil method tanpa grant; sandbox escape | Zero privilege, consent JIT, allowlist bridge, fail closed | Kerentanan browser di luar kendali produk |
| Supply chain | Dependensi npm berbahaya; service worker dimodifikasi | Lockfile, review dependency, CSP, cakupan cache terbatas | Build host tetap dapat dikompromikan |
| AI-specific | Prompt berisi rahasia terkirim; endpoint mengembalikan instruksi berbahaya | Aksi eksplisit, minimisasi prompt, kunci di vault, output divalidasi | Endpoint pengguna dapat menyimpan prompt |

## 5. Skenario dan Mitigasi

### 5.1 XSS di shell

Jika shell memiliki XSS, penyerang dapat membaca seluruh data dan kunci yang dapat diakses halaman. Mitigasi:

- Tidak ada `dangerouslySetInnerHTML`, `innerHTML`, `eval`, atau `new Function` di jalur render.
- CSP membatasi script ke origin sendiri dan nonce; tidak ada `unsafe-eval`.
- Input pengguna dirender sebagai teks; markdown, bila ada, melalui renderer yang menghasilkan node MUIP, bukan HTML.
- Dependency yang menyentuh HTML ditinjau dan dipin.
- Cookie tidak dipakai untuk identitas, sehingga tidak ada sesi yang dapat dicuri.

XSS tetap dianggap sebagai kegagalan total untuk origin tersebut. Tidak ada klaim bahwa CSP menggantikan sanitasi.

### 5.2 Sandbox escape

Iframe opaque origin mencegah akses DOM dan storage host, tetapi app tetap berbagi renderer process. Mitigasi:

- `sandbox="allow-scripts"` tanpa `allow-same-origin`.
- CSP `default-src 'none'` dan `connect-src 'none'`.
- Hanya MUIP yang dirender; tidak ada HTML mentah.
- Bridge memeriksa asal pesan dan `event.source`.
- Bila sandbox tidak tersedia, app tidak dijalankan.

Kerentanan browser yang memungkinkan escape adalah residual risk yang harus diperbaiki melalui pembaruan browser dan tidak dapat diselesaikan sepenuhnya oleh aplikasi.

### 5.3 Package berbahaya

Signature hanya membuktikan asal, bukan niat baik. Mitigasi:

- Verifikasi manifest, digest, dan signature sebelum ekstraksi.
- Preview permission dan risk tier sebelum instalasi.
- Zero privilege setelah instalasi; consent JIT tetap berlaku.
- Offline cage default aktif.
- Package yang meminta permission critical ditolak karena tidak ada permission tersebut.

### 5.4 Pencurian storage

App tidak boleh membaca OPFS secara langsung. Mitigasi:

- Hanya worker host yang membuka SQLite; app memanggil bridge.
- Query app dibatasi ke DB app sendiri dan workspace aktif.
- Tabel host (`local_identity`, `vault_items`, `audit_log_chain`) tidak dapat di-query app.
- Nama file app deterministik tetapi tidak dapat diakses dari iframe.

### 5.5 Kebocoran BYOK

Mitigasi:

- Kunci disimpan di vault dengan AES-GCM dan hanya empat karakter terakhir ditampilkan.
- Kunci tidak masuk log, ekspor settings, backup plaintext, atau pesan error.
- Prompt dikirim hanya setelah aksi eksplisit dan hanya ke endpoint yang dikonfigurasi pengguna.
- Tidak ada telemetry prompt atau hasil.

### 5.6 Supply chain npm dan service worker

Mitigasi:

- Satu lockfile dengan versi terpin; dependency baru ditinjau.
- Build memakai `npm ci` di CI, bukan instalasi bebas.
- Service worker hanya mencache aset dari origin sendiri dengan daftar yang dibatasi; tidak mencache respons pihak ketiga.
- Header keamanan dan CSP diverifikasi pada deployment.
- Perubahan dependency yang menyentuh kripto, sandbox, atau HTML memerlukan review keamanan.

## 6. Kepercayaan dan Batas

| Batas | Yang dilindungi | Yang tidak dilindungi |
|---|---|---|
| Origin shell | Data dan kunci dari app pihak ketiga | XSS di shell, ekstensi, malware lokal |
| Iframe app | DOM dan storage host | Kerentanan browser, serangan hardware |
| Signature package | Integritas dan asal byte | Niat jahat penulis yang memegang kunci |
| Vault | Rahasia saat disimpan | Perangkat yang sudah dikompromikan saat vault terbuka |
| Backup | Kerahasiaan file di disk | Passphrase lemah atau bocor |

## 7. Ancaman yang Tidak Berlaku

Tidak ada ancaman server-side request forgery pada backend produk, eskalasi RBAC server, serangan sync peer, evil twin LAN, atau kompromi registry terfederasi karena komponen tersebut tidak ada. Permintaan jaringan hanya berasal dari browser ke endpoint yang dipilih pengguna dan ke origin yang dideklarasikan package.

## 8. Verifikasi Keamanan

| Uji | Harapan |
|---|---|
| Sandbox escape | `allow-same-origin` tidak ada; akses `parent.document` gagal |
| CSP | Script tanpa nonce diblokir; `fetch` dari iframe gagal |
| Permission bypass | Method tanpa grant ditolak; revoke langsung berlaku |
| Signature tamper | Satu byte berubah menggagalkan impor |
| Key mismatch | Public key baru memblokir sampai konfirmasi |
| XSS | Payload teks tidak menjadi elemen atau atribut aktif |
| Storage isolation | Query lintas app/workspace ditolak |
| BYOK leak | Kunci tidak muncul di log, ekspor, atau pesan error |
| Service worker | Hanya aset origin sendiri yang masuk cache |

Rencana uji rinci ada di [08-quality/security-test-plan.md](../08-quality/security-test-plan.md). Temuan dengan severity tinggi memblokir rilis sesuai [08-quality/release-gates.md](../08-quality/release-gates.md).

## 9. Risiko Residual

| Risiko | Penerimaan |
|---|---|
| Browser 0-day yang melewati iframe | Tidak dapat dimitigasi aplikasi; patch browser |
| Ekstensi berbahaya | Di luar batas produk; pengguna mengendalikan ekstensi |
| Pengguna menyetujui key atau permission berbahaya | Dikurangi dengan copy jelas dan fokus default Tolak |
| Passphrase lemah | Dikurangi dengan Argon2id dan panjang minimum, tidak dihilangkan |
| Storage eviction | Dikurangi dengan persist request dan pengingat backup, tidak dijamin |
| Hosting menyajikan bundle yang dimodifikasi | Dikurangi dengan kontrol deploy dan integritas build, tidak dijamin untuk semua pengguna |

## 10. Status Implementasi

Iframe opaque origin, CSP, broker dengan permission check, watchdog, signature package, vault terenkripsi, dan audit chain sudah ada. Uji eksploitasi sandbox dan audit menyeluruh belum menjadi gate CI. Daftar bukti ada di [00-foundation/implementation-status.md](../00-foundation/implementation-status.md).
