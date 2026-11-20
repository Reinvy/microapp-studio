# Keamanan

## 1. Cakupan

Laporan keamanan mencakup seluruh artefak resmi:

- Host Shell web/PWA dan Flutter (Android, iOS, Linux, Windows, macOS).
- Sandbox runtime dan capability broker.
- `core-rust`: kriptografi, signature, parser `.mapp`, CRDT/HLC, sandbox guard.
- Studio IDE, CLI, dan SDK.
- Server self-host, sync hub, registry internal, auth, RBAC/ABAC, audit chain.
- Registry publik dan pipeline reproducible build.

## 2. Versi yang Didukung

| Versi | Dukungan keamanan |
|---|---|
| Rilis stabil terbaru | Ya |
| Satu minor sebelumnya | Ya, perbaikan kritis |
| Lebih lama | Tidak; pengguna diminta upgrade |

## 3. Cara Melaporkan

**Jangan** membuka issue publik untuk kerentanan.

Gunakan GitHub private advisory:

```text
https://github.com/Reinvy/microapp-studio/security/advisories/new
```

Sertakan bila tersedia: versi, platform, langkah reproduksi, dampak, dan bukti konsep minimal. Jangan menyertakan data pengguna nyata atau kunci privat.

## 4. SLA

| Tahap | Target |
|---|---|
| Konfirmasi penerimaan | ≤ 48 jam |
| Triase dan severity | ≤ 5 hari kerja |
| Perbaikan critical (sandbox escape, kebocoran kunci, RCE, auth bypass) | ≤ 7 hari |
| Perbaikan high | ≤ 30 hari |
| Perbaikan medium | ≤ 90 hari |
| Disclosure publik | Setelah perbaikan tersedia dan pengguna diberi waktu upgrade |

Severity mengikuti CVSS 3.1 dengan penyesuaian: sandbox escape, signing key compromise, dan kegagalan E2EE selalu minimal `high`.

## 5. Safe Harbor

Aktivitas berikut dianggap penelitian keamanan yang diizinkan selama tidak merusak data, tidak mengakses data pengguna lain, dan tidak menguji pada instance produksi milik pihak lain tanpa izin:

- Pengujian pada instance self-host milik sendiri.
- Fuzzing parser `.mapp`, MUIP, dan bridge pada build lokal.
- Analisis statis dan dinamis terhadap artefak rilis.

## 6. Yang Tidak Termasuk

- Kerentanan pada dependency tanpa dampak yang dapat ditunjukkan ke MicroApp Studio.
- Laporan hasil scanner otomatis tanpa reproduksi.
- Serangan sosial terhadap kontributor.
- Kelemahan yang memerlukan akses fisik penuh dan perangkat sudah di-root/jailbreak, kecuali melewati batas kriptografi.

## 7. Setelah Perbaikan

Maintainer akan:

1. Menerbitkan advisory dengan kredit pelapor (kecuali meminta anonim).
2. Menandatangani rilis perbaikan dan menyertakan SBOM serta checksum.
3. Mencatat pelajaran pada [incident response](docs/09-operations/incident-response.md).
4. Merotasi kunci bila ada indikasi kompromi.

## 8. Kontak

- Kerentanan: GitHub private advisory di atas.
- Pertanyaan kebijakan keamanan: issue dengan label `security-question` tanpa detail eksploitasi.
