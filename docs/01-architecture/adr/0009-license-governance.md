---
id: ADR-0009
title: ADR-0009 Lisensi dan Tata Kelola
status: accepted
owner: architecture
prd_refs: ["§1.2", "§7.2"]
---

# ADR-0009 Lisensi dan Tata Kelola

## Konteks

PRD menawarkan dua opsi lisensi untuk core: Apache 2.0 atau AGPLv3, ditambah MIT untuk SDK, CLI, UI kit, dan template. PRD juga melarang open-core trap dan paywall.

## Keputusan

1. **Apache-2.0** untuk core platform, Host, Studio, server, runtime, dan `core-rust`. Root `LICENSE` berisi teks Apache-2.0 lengkap.
2. **MIT** untuk `@microapp/sdk`, `@microapp/cli`, `@microapp/ui-kit`, `@microapp/ai-bridge` (permukaan SDK), dan seluruh `templates/*`. Setiap paket MIT membawa `LICENSE` sendiri saat scaffold dibuat.
3. **Tidak ada edisi enterprise.** Seluruh fitur berada di repositori publik yang sama.
4. **Kontribusi** memakai Developer Certificate of Origin (DCO) `Signed-off-by`; tidak ada CLA yang mengambil hak cipta.
5. **Rilis ditandatangani**; artefak menyertakan SBOM CycloneDX, checksum SHA-256, dan SLSA provenance.
6. **Pendanaan** hanya sukarela (sponsor/donasi/konsultasi) dan tidak boleh mengunci fitur.

## Konsekuensi

- Apache-2.0 memberi perlindungan paten eksplisit tanpa memaksa disclosure seperti AGPLv3.
- Pihak yang ingin menawarkan layanan hosted tetap dapat melakukannya; proyek bersaing pada kualitas, bukan pada kunci lisensi.
- Dua lisensi menuntut kejelasan header per paket dan pemeriksaan otomatis pada release.
- DCO menambah langkah pada kontributor tetapi menurunkan gesekan hukum.

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| AGPLv3 untuk core | Lebih restriktif bagi integrator dan tidak diperlukan untuk mencegah open-core. |
| MIT untuk semua | Tidak ada perlindungan paten eksplisit untuk core. |
| BSL/SSPL | Bertentangan dengan FOSS dan prinsip tanpa paywall. |
| Open-core | Dilarang PRD §7.2. |
| CLA | Menambah hambatan kontribusi tanpa manfaat yang sebanding. |

## Status

`accepted`. Perubahan lisensi wajib melalui RFC dan persetujuan maintainer council.
