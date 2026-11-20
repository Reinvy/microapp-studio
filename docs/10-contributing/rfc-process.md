---
id: GOV-RFC
title: Proses RFC
status: accepted
owner: governance
prd_refs: ["§7.2"]
---

# Proses RFC

## 1. Tujuan dan Ruang Lingkup

RFC (Request for Comments) adalah mekanisme publik untuk mengubah kontrak yang dipakai lintas komponen: manifest, Host Bridge, MUIP, sync/CRDT, permission, crypto, registry, CLI/SDK, serta tata kelola dan lisensi. RFC memastikan perubahan kontrak tidak diputuskan sepihak dan kompatibilitas ekosistem terjaga.

Dokumen ini melengkapi [governance.md](governance.md) dan [00-foundation/sdd-workflow.md](../00-foundation/sdd-workflow.md). Kerangka dokumen ada di [templates/rfc.md](../templates/rfc.md).

## 2. Kapan RFC Wajib

| Area | Contoh perubahan | RFC |
|---|---|---|
| Manifest | Field baru, enum baru, perubahan validasi, kenaikan `schemaVersion` | Wajib |
| `.mapp` | Layout arsip, aturan signature, format deterministik | Wajib |
| Host Bridge | Namespace, method, envelope, error shape, timeout | Wajib |
| MUIP | Node type, event, batas validasi, negosiasi versi | Wajib |
| Sync/CRDT | Handshake, transport baru, format batch, resolusi konflik | Wajib |
| Permission | ID baru, perubahan risk tier, semantik consent | Wajib |
| Crypto | Algoritma, envelope, hierarki kunci, rotasi | Wajib |
| Registry | Format indeks, trust level, pencabutan kunci, delta | Wajib |
| CLI/SDK | Perubahan breaking, exit code, output `--json` | Wajib bila breaking |
| Tata kelola/lisensi | Perubahan dokumen governance atau lisensi | Wajib |

RFC **TIDAK** diperlukan untuk: typo, perbaikan dokumentasi yang tidak mengubah kontrak, refactor internal tanpa perubahan perilaku, perbaikan bug yang mempertahankan kontrak, pembaruan dependency patch, dan penambahan test.

Bila ragu, ajukan RFC. Menunda RFC untuk perubahan kontrak dianggap pelanggaran SDD dan PR **MUST** ditolak.

## 3. Status RFC

| Status | Arti | Pindah ke |
|---|---|---|
| `draft` | Usulan ditulis, belum dibuka untuk komentar luas | `review` |
| `review` | Periode komentar publik berjalan | `accepted`, `rejected` |
| `accepted` | Disetujui; spec dan implementasi boleh dimulai | `implemented` |
| `implemented` | Spec, kode, dan verifikasi selesai | `superseded` |
| `rejected` | Ditolak dengan alasan tertulis | `draft` (revisi baru) |
| `superseded` | Digantikan RFC atau ADR yang lebih baru | — |

Aturan transisi:

- Perpindahan `draft → review` dilakukan author setelah dokumen lengkap.
- Perpindahan `review → accepted` memerlukan dua persetujuan maintainer dan tidak ada keberatan yang belum diselesaikan.
- Perpindahan `accepted → implemented` hanya setelah spec diperbarui, kode di-merge, dan verifikasi dijalankan.
- RFC yang ditolak **MUST** menyimpan alasan dan tidak dihapus.
- RFC yang digantikan **MUST** menautkan penggantinya dan tetap tersimpan untuk sejarah.

## 4. Format dan Lokasi

RFC disimpan sebagai berkas `RFC-<NNNN>-<slug>.md` di `docs/rfcs/`, ditautkan dari [docs/README.md](../README.md), dan mengikuti [templates/rfc.md](../templates/rfc.md). Nomor diberikan berurutan saat RFC dibuka; nomor tidak dipakai ulang.

Bagian wajib:

| Bagian | Isi |
|---|---|
| Ringkasan | Masalah dan usulan dalam satu paragraf |
| Motivasi | Mengapa kontrak saat ini tidak cukup |
| Spesifikasi | Perubahan normatif, termasuk skema dan contoh |
| Kompatibilitas | Dampak ke manifest, bridge, sync, dan versi host |
| Keamanan | Ancaman baru, mitigasi, dan dampak permission |
| Migrasi | Langkah bagi author, host, dan server |
| Alternatif | Opsi yang dipertimbangkan dan alasan ditolak |
| Rencana verifikasi | Test, fixture, dan bukti yang akan dijalankan |
| Status | Status saat ini dan riwayat keputusan |

- Contoh kode dan JSON **MUST** valid dan konsisten dengan [03-specs/manifest-v2.md](../03-specs/manifest-v2.md).
- Klaim kompatibilitas **MUST** merujuk versi kontrak, bukan versi produk.
- RFC **MUST NOT** memuat rahasia, kunci, atau data pengguna nyata.

## 5. Prosedur

1. Buat issue ringkas yang menjelaskan masalah dan dampak; tautkan ke RFC saat tersedia.
2. Tulis RFC dengan status `draft` pada branch `docs/rfc-<nnnn>-<slug>`.
3. Buka PR dokumen; sertakan `Spec: docs/rfcs/RFC-<NNNN>-<slug>.md` pada deskripsi.
4. Setelah dokumen lengkap, ubah status ke `review` dan umumkan kanal diskusi.
5. Jalankan periode komentar minimal **14 hari** kalender.
6. Kumpulkan keberatan; setiap keberatan **MUST** dijawab dengan perubahan, penjelasan, atau penolakan beralasan.
7. Minta review minimal **2 maintainer**, salah satunya dari area yang terdampak.
8. Bila disetujui, ubah status ke `accepted` dan merge PR dokumen.
9. Perbarui spec/ADR terkait dalam PR terpisah sebelum kode.
10. Implementasikan, jalankan verifikasi, lalu ubah status ke `implemented` dan perbarui catatan rilis.

Periode komentar **MUST** dihitung dari publikasi RFC yang lengkap, bukan dari pembukaan draft PR.

## 6. Pengecualian Keamanan

- Perbaikan kerentanan aktif **MAY** memakai periode komentar diperpendek menjadi **72 jam**.
- Pengecualian **MUST** disetujui oleh security team dan dua maintainer.
- Detail eksploit **MUST NOT** dipublikasikan sebelum perbaikan tersedia.
- RFC tetap ditulis dan di-merge; hanya periode komentarnya yang diperpendek.
- Bila perubahan menyentuh kriptografi atau sandbox, security review **MUST** terjadi sebelum implementasi.

## 7. Review

| Pemeriksaan | Kriteria |
|---|---|
| Kelengkapan | Semua bagian wajib terisi; contoh valid |
| Kompatibilitas | Dampak ke versi lama dijelaskan; jalur migrasi ada |
| Keamanan | Ancaman baru, permission, dan sandbox dinilai |
| Data | Migrasi, rollback, dan retensi dijelaskan |
| Konsistensi | Selaras dengan ADR accepted dan spec |
| Verifikasi | Test dan fixture konkret, bukan pernyataan umum |
| Operasional | Dampak ke self-host, air-gap, dan backup dinilai |

Reviewer **MUST** menolak RFC yang menambah field atau enum tanpa menjelaskan validasi, default, dan kompatibilitas mundur.

## 8. Kompatibilitas Kontrak

| Kontrak | Aturan |
|---|---|
| Manifest | Semver; kenaikan mayor untuk perubahan breaking; host mendukung mayor saat ini dan mayor sebelumnya selama 12 bulan |
| Host Bridge | Versi protokol eksplisit; negosiasi saat handshake; breaking change menaikkan versi mayor |
| MUIP | Versi protokol eksplisit; renderer web dan Flutter wajib setara semantik |
| Registry index | Versi skema eksplisit; field baru opsional sampai mayor berikutnya |
| Sync/CRDT | Version header; peer dengan versi tidak kompatibel menolak dengan `E-SYNC-001` |
| CLI/SDK | Breaking change menaikkan mayor dan melalui RFC (`FR-DEV-020`) |

- Penambahan nilai enum **MUST** dianggap breaking bila klien lama menolak nilai tak dikenal.
- Field baru **MUST** memiliki default dan perilaku eksplisit saat tidak ada.
- Host **MUST NOT** menurunkan format data untuk berkomunikasi dengan versi lama; gunakan staging atau tolak dengan pesan jelas.
- Migrasi **MUST** menyediakan rollback atau snapshot pra-migrasi.

## 9. Keputusan dan Supersede ADR

- Keputusan RFC dicatat pada berkas RFC: tanggal keputusan, reviewer, dan ringkasan alasan.
- Bila RFC mengubah keputusan arsitektur, ADR baru **MUST** dibuat dan ADR lama ditandai `superseded` sesuai [ADR README](../01-architecture/adr/README.md).
- Bila RFC bertentangan dengan ADR accepted dan ADR belum disupersede, ADR menang sampai proses supersede selesai.
- Bila RFC bertentangan dengan PRD, PRD menang; RFC **MUST** direvisi atau ditolak.
- Keputusan yang ditolak **MUST** tetap dapat dilacak untuk mencegah usulan berulang tanpa informasi baru.

## 10. Implementasi dan Penutupan

- Spec **MUST** diperbarui sebelum kode; urutan commit `docs:` → `feat/fix:` → `docs(status):`.
- Status `implemented` hanya boleh diberikan setelah acceptance criteria di spec lulus dan bukti dicatat.
- RFC yang diimplementasikan **MUST** menautkan PR spec, PR kode, dan hasil verifikasi.
- Bila implementasi menyimpang dari RFC, RFC **MUST** diperbarui lebih dulu; implementasi tidak boleh menjadi sumber kebenaran.
- RFC yang tidak diimplementasikan dalam 12 bulan dapat ditutup sebagai `rejected` dengan alasan, kecuali masih memiliki pemilik aktif.

## 11. Verifikasi

| Bukti | Prosedur |
|---|---|
| RFC wajib | PR yang mengubah manifest/bridge/sync tanpa RFC ditolak |
| Periode komentar | Catat tanggal publikasi dan tanggal keputusan; minimal 14 hari |
| Review | Dua maintainer tercatat, satu dari area terdampak |
| Keamanan | Uji jalur diperpendek 72 jam dengan persetujuan security team |
| Kompatibilitas | Fixture manifest lama dan baru divalidasi terhadap schema |
| Supersede | ADR lama bertanda `superseded` dan menautkan pengganti |
| Implementasi | Spec, kode, dan verifikasi tertaut pada RFC |

## 12. Referensi

- [governance.md](governance.md), [registry-policy.md](registry-policy.md)
- [00-foundation/sdd-workflow.md](../00-foundation/sdd-workflow.md)
- [templates/rfc.md](../templates/rfc.md)
- [03-specs/manifest-v2.md](../03-specs/manifest-v2.md), [03-specs/host-bridge.md](../03-specs/host-bridge.md), [03-specs/ui-protocol.md](../03-specs/ui-protocol.md)
- [03-specs/06-sync-backup.md](../03-specs/06-sync-backup.md), [03-specs/08-devtools-cli-sdk.md](../03-specs/08-devtools-cli-sdk.md)
- [01-architecture/adr/README.md](../01-architecture/adr/README.md)
