---
id: SPEC-PERM
title: Permission dan Consent
status: accepted
owner: security
prd_refs: ["§3 Modul 3", "§5.1"]
---

# Permission dan Consent

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menetapkan katalog permission, risk tier, alur consent, grant/revoke, mock/spoof, Offline Cage, semantik allowlist, dan audit. Micro-app berjalan dengan zero privilege; setiap akses harus dideklarasikan dan disetujui.

Di luar lingkup: mekanisme bridge (lihat [host-bridge.md](host-bridge.md)), threat model (lihat [threat-model.md](../01-architecture/threat-model.md)).

## 2. Aktor dan Prasyarat

| Aktor | Prasyarat |
|---|---|
| Micro-app | Manifest memuat permission required/optional |
| Pengguna | Dapat melihat detail risiko dan mencabut grant |
| Host | Broker, audit, dan UI consent |

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| SEC-001 | MUST | Permission `storage.local` (risk **low**) MUST mengizinkan baca/tulis key-value milik app sendiri, terbatas pada kuota `permissions.quotas.storageMb` (default 10 MB bila manifest tidak mengisi), tanpa akses ke database micro-app lain. Penulisan yang melewati kuota MUST ditolak dengan `E-DATA-006`. | App hanya membaca key miliknya; key app lain tidak terlihat; penulisan melewati kuota gagal `E-DATA-006`. |
| SEC-002 | MUST | Permission `storage.local.sqlite` (risk **low**) MUST mengizinkan query pada database SQLite milik `app_id` di workspace aktif, tanpa ATTACH atau akses lintas app. | `ATTACH` ditolak; query ke DB app lain gagal. |
| SEC-003 | MUST | Permission `camera` (risk **medium**) MUST mengizinkan pengambilan foto/video melalui kamera dengan indikator aktif dan tanpa akses ke galeri. | Kamera aktif menampilkan indikator; akses galeri tidak tersedia. |
| SEC-004 | MUST | Permission `camera.qr` (risk **medium**) MUST mengizinkan pemindaian QR/barcode melalui kamera dan MUST NOT menyimpan frame mentah setelah hasil dikembalikan. | Frame tidak tersimpan; hanya hasil decode yang diterima app. |
| SEC-005 | MUST | Permission `microphone` (risk **medium**) MUST mengizinkan perekaman audio dengan indikator aktif dan penghentian otomatis saat app background. | Background menghentikan rekaman; indikator hilang. |
| SEC-006 | MUST | Permission `location` (risk **medium**) MUST mengizinkan lokasi dengan pilihan presisi kasar/halus dan tanpa akses riwayat. | Memilih kasar mengembalikan koordinat terkuantisasi; riwayat tidak tersedia. |
| SEC-007 | MUST | Permission `biometrics` (risk **medium**) MUST mengizinkan verifikasi biometrik lokal melalui OS dan MUST NOT memberikan akses ke data biometrik. | Hanya hasil verifikasi boolean yang diterima; template biometrik tidak pernah keluar dari OS. |
| SEC-008 | MUST | Permission `filesystem.picker` (risk **medium**) MUST mengizinkan baca/tulis hanya pada berkas yang dipilih pengguna melalui picker, dengan grant per berkas. | Path di luar pilihan ditolak; grant berkas lain tidak berlaku. |
| SEC-009 | MUST | Permission `bluetooth` (risk **medium**) MUST mengizinkan pemindaian dan koneksi perangkat dengan daftar layanan yang dideklarasikan. | Hanya layanan terdaftar yang dapat diakses; lainnya ditolak. |
| SEC-010 | MUST | Permission `nfc` (risk **medium**) MUST mengizinkan baca/tulis tag NFC saat app di foreground, tanpa background scanning. | Background tidak memicu scan; foreground berfungsi. |
| SEC-011 | MUST | Permission `notifications.local` (risk **low**) MUST mengizinkan penjadwalan notifikasi lokal dan MUST NOT memberi akses ke notifikasi app lain. | Notifikasi app lain tidak terbaca; jadwal milik app berfungsi. |
| SEC-012 | MUST | Permission `local_ai.inference` (risk **medium**) MUST mengizinkan inferensi pada model lokal yang tersedia, dengan batas waktu 120 detik dan tanpa mengirim data keluar perangkat. | Inferensi berjalan offline; trafik keluar nihil. |
| SEC-013 | MUST | Permission `network.allowlist` (risk **high**) MUST mengizinkan koneksi hanya ke domain pada allowlist manifest, dengan pemblokiran IP privat dan metadata endpoint secara default. | Domain di luar allowlist ditolak; `10.0.0.1` ditolak; `169.254.169.254` ditolak. |
| SEC-014 | MUST | Permission broker MUST menerapkan zero-privilege default: tanpa grant aktif, seluruh panggilan yang membutuhkan permission MUST ditolak sebelum validasi parameter. | App tanpa grant tidak dapat memicu dialog maupun akses. |
| SEC-015 | MUST | Dialog consent MUST menampilkan nama app, permission ID, risk tier, alasan yang diminta manifest, dan opsi `Allow once`, `Allow`, atau `Deny`; `Allow once` hanya berlaku untuk sesi berjalan. | Tiga opsi tampil; `Allow once` hilang setelah app ditutup. |
| SEC-016 | MUST | Grant MUST berlaku sampai dicabut dan MUST dapat dicabut kapan saja dari Pengaturan dan dari detail app; pencabutan MUST berlaku segera tanpa restart. | Cabut grant saat app berjalan; panggilan berikutnya gagal. |
| SEC-017 | SHOULD | Host MUST menyediakan mock/spoof untuk tepat `camera`, `camera.qr`, `microphone`, `location`, dan `biometrics` yang mengembalikan data sintetis, ditandai di UI, dan dicatat di audit; permission lain MUST NOT dapat di-mock. | Mock aktif menampilkan badge; data sintetis diterima; audit mencatat mock; permission di luar daftar tidak menyediakan opsi mock. |
| SEC-018 | MUST | Offline Cage MUST aktif secara default per app (`app_policy.offline_cage = 1`), MUST memblokir seluruh jaringan meskipun `network.allowlist` berisi domain, MUST menampilkan status permanen di UI app, dan MUST dapat dimatikan pengguna secara eksplisit dari Pengaturan. | Cage default aktif memblokir request ke domain allowlist; badge tampil; mematikan cage mengembalikan akses allowlist. |
| SEC-019 | MUST | Setiap grant, deny, revoke, mock, dan penolakan akses MUST dicatat di audit lokal dengan `app_id`, `permission`, `decision`, `actor`, dan timestamp, tanpa data sensitif. | Audit memuat kelima jenis kejadian; tidak ada isi payload. |
| SEC-020 | MUST | Perubahan permission saat update MUST memerlukan consent ulang untuk permission baru atau naiknya risk tier; penurunan izin MUST mencabut grant yang tidak lagi dideklarasikan. | Update menambah `location` memunculkan consent baru; menghapus `camera` mencabut grant. |

## 4. Model Data dan State

### 4.1 Katalog permission

| Permission ID | Risk | Default | Dapat di-mock | Catatan |
|---|---|---|---|---|
| `storage.local` | low | deny | Tidak | `permissions.quotas.storageMb`, default 10 MB |
| `storage.local.sqlite` | low | deny | Tidak | Hanya DB milik app |
| `camera` | medium | deny | Ya | Indikator wajib |
| `camera.qr` | medium | deny | Ya | Tanpa penyimpanan frame |
| `microphone` | medium | deny | Ya | Berhenti saat background |
| `location` | medium | deny | Ya | Presisi dapat dipilih |
| `biometrics` | medium | deny | Ya | Hanya hasil verifikasi |
| `filesystem.picker` | medium | deny | Tidak | Grant per berkas |
| `bluetooth` | medium | deny | Tidak | Layanan terdaftar |
| `nfc` | medium | deny | Tidak | Foreground only |
| `notifications.local` | low | deny | Tidak | Hanya milik app |
| `local_ai.inference` | medium | deny | Tidak | Model lokal |
| `network.allowlist` | high | deny | Tidak | Domain exact/wildcard |

Kuota dan mock:

- `permissions.quotas.storageMb` berlaku untuk `storage.local` dan default 10 MB bila manifest tidak mengisi; penulisan yang melewati kuota ditolak `E-DATA-006` dan app menerima saran pembersihan.
- Himpunan permission yang dapat di-mock bersifat tertutup dan tepat: `camera`, `camera.qr`, `microphone`, `location`, `biometrics`. Permission lain tidak menampilkan opsi mock.
- Offline Cage adalah kebijakan per app pada `app_policy.offline_cage` dengan default `1` (aktif); nilai `0` hanya tersimpan setelah pengguna mematikannya secara eksplisit.

### 4.2 Semantik allowlist

| Bentuk | Diizinkan | Contoh |
|---|---|---|
| Domain exact | Ya | `api.example.com` |
| Wildcard subdomain | Ya | `*.example.com` (tidak termasuk apex) |
| Apex + wildcard | Ya, dua entri | `example.com`, `*.example.com` |
| IP literal | Tidak | `10.0.0.1` |
| CIDR | Tidak | `10.0.0.0/8` |
| Skema selain HTTPS | Tidak | `http://example.com` |
| Metadata endpoint | Tidak pernah | `169.254.169.254` |

### 4.3 State grant

State kanonik:

```text
requested → granted | denied
granted   → revoked | mocked
```

- `requested` adalah state saat dialog consent ditampilkan; hasilnya hanya `granted` atau `denied`, tidak ada state antara.
- `granted` dapat berpindah ke `revoked` (oleh pengguna, update manifest, atau pencabutan sesi) atau ke `mocked` untuk permission yang dapat di-mock.
- `revoked` bersifat final untuk sesi tersebut; grant baru MUST membuat state baru, bukan menghidupkan kembali state `revoked`.
- `denied` juga final untuk sesi tersebut; permintaan berikutnya MUST membuat state baru.
- `Allow once` disimpan di `permission_sessions` dengan `expires_at_ms` = akhir sesi app; saat sesi ditutup, grant `once` berakhir dan tidak pernah menjadi grant persisten.
- Grant persisten disimpan di `permission_grants` dengan partial unique index grant aktif per `(workspace_id, app_install_id, permission_id)`. `permission_grants_json` pada `installed_microapps` bukan sumber kebenaran.

## 5. Error dan Recovery

| Kode | Kondisi | Recovery |
|---|---|---|
| E-SBX-005 | Permission tidak diberikan atau dicabut | Kembalikan error ke app; tawarkan buka Pengaturan |
| E-DATA-006 | Kuota `permissions.quotas.storageMb` terlampaui | Tolak penulisan; tawarkan pembersihan cache app |
| E-AUTH-006 | Frasa pemulihan tidak cocok saat membuka Vault | Kegagalan generik; batasi 10 percobaan/menit |
| E-HOST-004 | Vault terkunci saat permission sensitif dibutuhkan | Minta unlock; jangan gunakan kredensial tersimpan |
| E-CRYPTO-004 | Kunci tidak dapat didekripsi | Tolak akses; minta pemulihan |

## 6. Keamanan dan Privasi

- Zero privilege adalah default; manifest bukan grant.
- Permission high risk (`network.allowlist`) memerlukan konfirmasi tambahan dan menampilkan domain yang diminta.
- Mock ditandai jelas agar pengguna tidak mengira data nyata.
- Audit tidak menyimpan isi resource; hanya metadata keputusan.
- Perubahan permission saat update tidak boleh memperluas akses tanpa consent baru.

## 7. Acceptance Criteria

- **Given** manifest tanpa `camera` **When** app memanggil kamera **Then** ditolak tanpa dialog dan audit mencatat.
- **Given** dialog consent **When** pengguna memilih `Allow once` **Then** grant berlaku sampai app ditutup, lalu hilang.
- **Given** Offline Cage aktif **When** app memanggil domain allowlist **Then** request diblokir dan badge tampil.
- **Given** update menambah permission high risk **When** app diperbarui **Then** consent baru diminta sebelum permission aktif.
- **Given** grant dicabut **When** app berjalan **Then** panggilan berikutnya gagal tanpa restart.

## 8. Verifikasi

| Bukti | Perintah/Prosedur |
|---|---|
| Matrix | Test setiap permission: grant, deny, revoke, mock |
| Allowlist | Test domain exact, wildcard, IP, CIDR, metadata |
| Consent | Snapshot UI dan keyboard flow; `Allow once` expiry |
| Audit | Periksa field dan redaksi |
| Update | Test perubahan permission required/optional |

## 9. Referensi

- [03-specs/host-bridge.md](host-bridge.md), [03-specs/03-sandbox-runtime.md](03-sandbox-runtime.md), [03-specs/error-codes.md](error-codes.md)
- [04-flows/11-permission-consent.md](../04-flows/11-permission-consent.md), [01-architecture/threat-model.md](../01-architecture/threat-model.md)
