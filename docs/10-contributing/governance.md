---
id: GOV-GOVERNANCE
title: Tata Kelola
status: accepted
owner: governance
prd_refs: ["§7.2"]
---

# Tata Kelola

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menetapkan model tata kelola proyek MicroApp Studio: struktur keputusan, konsensus, rilis, kurasi registry, pengungkapan keamanan, lisensi, pendanaan, dan jalur menjadi maintainer. Tujuannya adalah menjaga proyek tetap terbuka, netral, dan bebas dari model open-core.

Kontrak produk yang mengikat ada di [03-specs/07-selfhost.md](../03-specs/07-selfhost.md); keputusan lisensi ada di [ADR-0009](../01-architecture/adr/0009-license-governance.md); proses perubahan kontrak ada di [rfc-process.md](rfc-process.md); kebijakan konten registry ada di [registry-policy.md](registry-policy.md).

## 2. Prinsip

| Prinsip | Konsekuensi |
|---|---|
| Tanpa open-core | Tidak ada edisi Enterprise terpisah; seluruh fitur ada di repositori publik |
| Gratis penuh | Tidak ada paywall, seat limit, lisensi berbayar, atau fitur yang dikunci |
| Terbuka | Diskusi teknis, RFC, dan keputusan dicatat publik |
| Docs-first | Perubahan perilaku mengikuti [00-foundation/sdd-workflow.md](../00-foundation/sdd-workflow.md) |
| Keamanan bertanggung jawab | Kerentanan ditangani privat sampai perbaikan tersedia |
| Netral | Tidak ada peringkat registry berbayar atau perlakuan istimewa komersial |
| Dapat diganti | Maintainer dan keputusan dapat diganti melalui proses yang tertulis |

## 3. Struktur Keputusan

### 3.1 Maintainer Council

- Council terdiri dari **minimal 3** dan maksimal 7 maintainer aktif.
- Masa jabatan 12 bulan dan dapat diperpanjang; komposisi diperbarui setiap tahun.
- Council **MUST** mencakup setidaknya satu maintainer dengan fokus keamanan dan satu dengan fokus rilis.
- Kuorum keputusan adalah mayoritas sederhana dari council aktif; keputusan biasa memakai **lazy consensus**.
- Keputusan struktural memerlukan **2/3** suara council aktif.

### 3.2 Peran

| Peran | Tanggung jawab | Batas |
|---|---|---|
| Maintainer | Review, merge, rilis, keputusan tata kelola | Tidak dapat mengubah dokumen ini tanpa proses |
| Reviewer area | Review teknis pada area tertentu (runtime, data, server, desain) | Tidak memiliki hak merge kecuali juga maintainer |
| Release manager | Menandatangani dan menerbitkan rilis | Rotasi per rilis; tidak menyetujui kode sendiri |
| Security team | Triage kerentanan, koordinasi perbaikan dan advisori | Tidak mempublikasikan detail sebelum perbaikan |
| Registry curator | Review publish, delisting, banding | Tidak boleh mengurasi paket miliknya sendiri |
| Contributor | Mengajukan issue, RFC, dan PR | Mengikuti aturan review dan lisensi |

### 3.3 Lazy Consensus

Usulan dianggap diterima bila tidak ada keberatan yang beralasan dalam **7 hari** kalender sejak usulan dipublikasikan dan seluruh pemeriksaan wajib tersedia.

| Jenis keputusan | Mekanisme | Tenggat |
|---|---|---|
| Perbaikan docs, typo, test | Lazy consensus reviewer area | 3 hari |
| Perubahan non-kontrak dalam spec yang berlaku | Lazy consensus 2 maintainer | 7 hari |
| Perubahan kontrak (manifest, bridge, MUIP, sync/CRDT, permission, crypto, registry) | RFC + 2 maintainer + lazy consensus | 14 hari |
| Perubahan lisensi atau tata kelola | RFC + 2/3 council | 14 hari |
| Penghapusan maintainer | 2/3 council dengan alasan tertulis | 7 hari |

Keberatan **MUST** menyebut risiko teknis atau dampak nyata, bukan preferensi pribadi. Bila keberatan tidak selesai, keputusan dibawa ke voting council.

## 4. RFC dan Perubahan Kontrak

Perubahan berikut **MUST** melalui [rfc-process.md](rfc-process.md) sebelum implementasi:

- Skema `microapp.manifest.json` dan format `.mapp`.
- Protokol Host Bridge dan MUIP.
- Protokol sync, CRDT, dan format snapshot.
- ID permission, risk tier, dan semantik consent.
- Algoritma kriptografi, envelope, dan hierarki kunci.
- Format indeks registry, trust level, dan mekanisme pencabutan kunci.
- Kontrak CLI/SDK yang dapat memutus kompatibilitas.

RFC yang diterima **MUST** tercermin di spec sebelum kode diubah. Bila RFC mengubah keputusan arsitektur, ADR terkait **MUST** disupersede, bukan diabaikan.

## 5. Rilis

| Kewajiban | Detail |
|---|---|
| Review | Rilis hanya dari commit yang sudah melalui review dan docs check |
| Tanda tangan | Tag dan artefak rilis ditandatangani Ed25519 oleh release manager |
| SBOM | CycloneDX atau SPDX disertakan (`NFR-SUPPLY-001`) |
| Checksum | SHA-256 untuk setiap artefak (`NFR-SUPPLY-002`) |
| Provenance | SLSA build provenance tersedia dan dapat diverifikasi |
| Catatan rilis | Perubahan, migrasi, dan rollback dijelaskan |
| Rotasi | Release manager berganti minimal setiap dua rilis minor |

- Rilis **MUST NOT** memuat artefak yang dibangun dari working tree kotor.
- Rilis **MUST NOT** menaikkan versi mayor kontrak tanpa RFC yang diterima.
- Kebijakan dukungan: host mendukung mayor kontrak saat ini dan mayor sebelumnya selama **12 bulan**.
- Rilis darurat keamanan **MAY** memotong proses normal dengan persetujuan dua maintainer dan security team; dokumen tetap diperbarui dalam 24 jam.

## 6. Registry dan Kurasi

- Registry resmi dikurasi melalui review publik; keputusan dan alasannya dicatat.
- Trust level `official`, `community`, `internal`, dan `local` **MUST NOT** dinaikkan otomatis oleh popularitas atau pembayaran.
- Kurator **MUST** menolak paket yang melanggar [registry-policy.md](registry-policy.md).
- Malware aktif **MUST** di-delisting sementara dalam **24 jam**; banding tersedia dalam **7 hari**.
- Delisting **MUST NOT** menghapus data pengguna; hanya instalasi baru dan update yang diblokir (`FR-REG-024`).
- Tidak ada slot, peringkat, atau badge berbayar di registry.

## 7. Keamanan dan Pengungkapan

| Tahap | Kewajiban |
|---|---|
| Pelaporan | Kanal privat (security advisory) atau kontak maintainer; bukan issue publik |
| Acknowledgment | Maksimal **48 jam** |
| Perbaikan critical | Maksimal **7 hari** |
| Perbaikan high | Maksimal **30 hari** |
| Advisori | Setelah perbaikan tersedia; memuat versi terdampak dan mitigasi |
| Kredit | Diberikan bila peneliti setuju; anonim bila diminta |
| CVE | Diajukan bila relevan dan perbaikan sudah tersedia |

- Kerentanan **MUST NOT** dibahas di issue publik, diskusi, atau media sosial sebelum perbaikan.
- Maintainer yang menemukan kerentanan **MUST** mengikuti jalur privat yang sama; tidak ada pengecualian untuk "sudah diketahui".
- Detail eksploit **MUST NOT** dimasukkan ke advisori publik sebelum mayoritas pengguna dapat memperbarui.

## 8. Lisensi dan Kontribusi

| Komponen | Lisensi |
|---|---|
| Core, platform, Host, server | Apache-2.0 |
| SDK, CLI, UI kit, template micro-app | MIT |

- Root [LICENSE](../../LICENSE) berisi Apache-2.0; lisensi MIT paket dinyatakan pada paket masing-masing saat scaffold dibuat.
- Kontribusi memakai model inbound = outbound: kontributor menyetujui lisensi yang sama dengan komponen yang disentuh.
- Proyek **MUST NOT** mensyaratkan penugasan hak cipta (CLA) atau lisensi eksklusif.
- Setiap commit **MUST** menyertakan sign-off DCO (`Signed-off-by`) yang menyatakan hak untuk menyumbangkan kode.
- Kode pihak ketiga **MUST** kompatibel dengan lisensi komponen dan dicatat di SBOM.
- Perubahan lisensi **MUST** melalui RFC dan persetujuan 2/3 council; perubahan tidak berlaku surut pada kontribusi yang sudah diterima.

## 9. Pendanaan

- Pendanaan bersifat sukarela melalui GitHub Sponsors, Open Collective, Saweria, atau dukungan teknis opsional.
- Donasi **MUST NOT** membeli fitur, prioritas review, peringkat registry, atau akses khusus.
- Tidak ada iklan di dalam produk, tidak ada penjualan data, dan tidak ada telemetry yang dimonetisasi.
- Laporan keuangan agregat **SHOULD** dipublikasikan setiap tahun, tanpa mengungkap data pribadi pendukung.
- Biaya operasional server publik ditanggung proyek atau sponsor infrastruktur; pengguna tetap dapat self-host gratis.

## 10. Menjadi Maintainer

| Tahap | Kriteria |
|---|---|
| Kontributor aktif | Minimal 10 PR yang di-merge dalam 3 bulan, mencakup lebih dari satu area |
| Nominasi | Dua maintainer aktif mengajukan nominasi tertulis |
| Review | Rekam jejak review, pemahaman threat model, dan kepatuhan docs-first |
| Konsensus | Lazy consensus council selama 14 hari tanpa keberatan beralasan |
| Onboarding | Akses repositori, kanal keamanan, dan peninjauan [00-foundation/sdd-workflow.md](../00-foundation/sdd-workflow.md) |

- Maintainer yang tidak aktif selama **6 bulan** tanpa pemberitahuan berpindah ke status emeritus; status dapat dipulihkan melalui nominasi sederhana.
- Maintainer **MUST** menyatakan konflik kepentingan (pekerjaan, sponsor, produk pesaing) dan mundur dari keputusan terkait.
- Penghapusan maintainer karena pelanggaran keamanan atau kode etik memerlukan 2/3 council dan alasan tertulis; maintainer yang bersangkutan berhak menanggapi.

## 11. Perubahan Tata Kelola

- Perubahan dokumen ini **MUST** melalui RFC dengan periode komentar minimal 14 hari.
- Persetujuan memerlukan 2/3 council aktif dan tidak ada keberatan keamanan yang belum diselesaikan.
- Perubahan **MUST** dicatat di riwayat dokumen dan diumumkan pada catatan rilis berikutnya.
- Bila terjadi konflik antara dokumen ini dan perilaku nyata, dokumen ini menang sampai diperbarui melalui proses di atas.

## 12. Verifikasi

| Bukti | Prosedur |
|---|---|
| Lazy consensus | Uji usulan tanpa keberatan; keputusan tercatat setelah 7 hari |
| Voting | Uji keputusan struktural; ambang 2/3 dihitung dari council aktif |
| RFC gate | PR kontrak tanpa RFC ditolak reviewer |
| Rilis | Periksa tag bertanda tangan, SBOM, checksum, dan provenance |
| Registry | Uji delisting 24 jam dan banding 7 hari pada lingkungan latihan |
| Lisensi | Audit paket: Apache-2.0 core, MIT SDK/CLI/UI kit/template |
| Pendanaan | Tidak ada fitur atau peringkat yang bergantung pada sponsor |
| Maintainer baru | Simulasi nominasi; seluruh tahap tercatat |

## 13. Referensi

- [00-foundation/sdd-workflow.md](../00-foundation/sdd-workflow.md), [00-foundation/product-foundation.md](../00-foundation/product-foundation.md)
- [ADR-0009](../01-architecture/adr/0009-license-governance.md)
- [rfc-process.md](rfc-process.md), [registry-policy.md](registry-policy.md)
- [03-specs/07-selfhost.md](../03-specs/07-selfhost.md), [03-specs/nfr.md](../03-specs/nfr.md)
