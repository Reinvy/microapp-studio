---
id: GOV-RFC
title: Proses RFC
status: accepted
owner: governance
prd_refs: ["§10", "§11"]
---

# Proses RFC

Dokumen ini menetapkan kapan RFC (Request for Comments) wajib, bagaimana usul ditulis dan direview, berapa lama periode review, dan bagaimana keputusan dihubungkan ke ADR. RFC adalah satu-satunya jalur yang sah untuk mengubah kontrak yang dipakai paket `.mapp`, runtime sandbox, dan desain.

## 1. Tujuan dan Ruang Lingkup

- Mencegah perubahan kontrak yang memutus kompatibilitas tanpa review terbuka.
- Menjaga jejak keputusan yang dapat diaudit: usul, diskusi, keputusan, ADR, implementasi.
- Menetapkan sinkronisasi antara RFC, spec, schema, dan rules.

RFC mengatur perubahan dokumen dan kontrak. RFC tidak menggantikan review kode atau gate rilis; keduanya tetap berlaku.

## 2. Kapan RFC Wajib

| Area | Contoh perubahan | Dokumen terkait |
|---|---|---|
| Manifest `.mapp` | Field baru/wajib, perubahan arti field, versi schema | [manifest](../03-specs/manifest.md) |
| Bridge host | Method baru, perubahan parameter/error, timeout, consent | [host bridge](../03-specs/host-bridge.md) |
| Permission | Permission baru, perubahan risk tier, perubahan default cage | [permissions](../03-specs/permissions.md) |
| Token desain | Nama, nilai, atau semantik token `--mads-*` | [design system](../02-design/design-system.md) |
| Format paket/index | Layout ZIP, signature, digest, schema index statis | [package distribution](../01-architecture/package-distribution.md) |
| Data | Skema migration yang tidak kompatibel mundur, format ekspor | [data spec](../03-specs/04-data.md) |

RFC juga **WAJIB** untuk perubahan cakupan platform, penambahan backend, atau perubahan model privasi, karena semuanya mengubah PRD.

Tidak perlu RFC untuk: perbaikan bug yang memulihkan perilaku sesuai spec, penambahan test, perbaikan copy yang tidak mengubah makna, peningkatan dependency patch yang tidak mengubah kontrak, dan perubahan internal komponen yang tidak mengubah API publik.

## 3. Status RFC

| Status | Arti |
|---|---|
| `draft` | Penulis masih melengkapi; belum direview |
| `review` | Terbuka untuk komentar; periode review berjalan |
| `accepted` | Disetujui; ADR dan pekerjaan implementasi boleh dimulai |
| `rejected` | Ditolak dengan alasan tertulis; tidak ada implementasi |
| `withdrawn` | Ditarik penulis |
| `superseded` | Digantikan RFC/ADR yang lebih baru |

Status **MUST** terlihat pada judul atau frontmatter berkas RFC. RFC `draft` tidak boleh dipakai sebagai dasar implementasi.

## 4. Langkah

1. **Cek duplikasi.** Cari RFC, issue, dan ADR yang sudah ada; tautkan konteksnya.
2. **Tulis usul** dengan kerangka §6. Sertakan contoh manifest/bridge/token yang konkret, bukan deskripsi abstrak.
3. **Ajukan PR** berlabel `rfc` yang hanya memuat berkas RFC; jangan mencampur kode.
4. **Buka periode review** minimal 7 hari kalender; 14 hari bila menyentuh keamanan, kriptografi, signature, atau permission.
5. **Bahasa dan kompatibilitas.** Jelaskan dampak ke paket lama, versi minimum host, dan rencana migrasi/deprecation.
6. **Putuskan** sesuai [governance](governance.md): lazy consensus untuk perubahan kecil, 2/3 council untuk struktural.
7. **Catat ADR** bila keputusan mengubah arsitektur atau kontrak jangka panjang; tautkan RFC dan ADR dua arah.
8. **Perbarui spec/schema** dalam PR terpisah yang menautkan RFC `accepted`; implementasi menyusul setelah spec diperbarui.

Urutan yang mengikat: RFC `accepted` → spec/schema diperbarui → implementasi → verifikasi. Implementasi sebelum spec adalah pelanggaran proses dan **MUST** ditolak pada review.

## 5. Periode Review dan Keputusan

| Faktor | Dampak |
|---|---|
| Komentar substansial | Penulis **MUST** menjawab setiap komentar atau menyatakan tidak berlaku beserta alasan |
| Perubahan besar saat review | Periode review dimulai ulang; status kembali `draft` bila arah berubah |
| Tidak ada komentar sampai tenggat | Lazy consensus berlaku untuk perubahan non-struktural |
| Keberatan keamanan | Wajib diselesaikan oleh security maintainer sebelum `accepted` |
| Perubahan struktural | Butuh 2/3 suara council aktif |

Keputusan **MUST** dicatat di berkas RFC pada bagian **Keputusan** dengan tanggal, hasil, dan daftar approver.

## 6. Kerangka RFC

```markdown
# RFC-NNNN: <judul>

- Status: draft
- Penulis:
- Reviewer:
- Tanggal:
- ADR terkait:

## Ringkasan
Satu paragraf: apa yang berubah dan mengapa.

## Motivasi
Masalah nyata, dampak pengguna, dan alternatif yang sudah dipertimbangkan.

## Spesifikasi
Perubahan kontrak secara presisi: field, method, token, atau format.
Sertakan contoh valid dan contoh yang harus ditolak.

## Kompatibilitas
Versi host minimum, perilaku paket lama, rencana deprecation, dan migrasi.

## Keamanan dan Privasi
Risiko baru, permission yang terpengaruh, dan kontrol mitigasi.

## Alternatif
Opsi lain beserta alasan tidak dipilih.

## Rencana Implementasi
Urutan spec → schema → kode → test → dokumentasi, dengan pemilik.

## Keputusan
Tanggal, hasil, approver, dan tautan diskusi.
```

Nomor RFC berurutan dan tidak dipakai ulang. Judul berkas `rfc-NNNN-<slug>.md`; RFC yang ditolak tetap disimpan.

## 7. Hubungan dengan ADR

| Situasi | Tindakan |
|---|---|
| RFC mengubah kontrak teknis jangka panjang | Wajib ADR baru; RFC menautkan ADR, ADR menautkan RFC |
| RFC hanya menyempurnakan detail yang sudah diputuskan ADR | Cukup perbarui spec; ADR diberi catatan amandemen |
| RFC menggantikan keputusan lama | ADR baru berstatus menggantikan; ADR lama tidak dihapus dari riwayat |
| RFC ditolak | Tidak ada ADR; alasan cukup di berkas RFC |

ADR **MUST** mengikuti format di [ADR index](../01-architecture/adr/README.md) dan memuat Konteks, Keputusan, serta Konsekuensi.

## 8. Contoh Perubahan yang Sering Ditanyakan

| Usul | Perlu RFC? | Alasan |
|---|---|---|
| Menambah permission `storage.read` | Ya | Permission baru dan consent baru |
| Mengubah teks tombol consent | Tidak | Copy, bukan kontrak |
| Menambah method bridge `clipboard.write` | Ya | Kanal baru ke host dan audit baru |
| Mengubah nilai `--mads-color-primary` | Ya | Token visual adalah kontrak desain |
| Menambah 1 komponen advanced ke katalog | Ya, ringan | ID katalog dibaca generator |
| Memperbaiki bug drag yang menyimpang dari FR-STUDIO-004 | Tidak | Memulihkan perilaku sesuai spec |
| Mengganti library ZIP internal | Ya bila mengubah hash deterministik | Format paket berubah |

## 9. Verifikasi

| # | Pemeriksaan | Bukti |
|---|---|---|
| 1 | RFC menyebut area kontrak dan dokumen terkait | Berkas RFC |
| 2 | Periode review terpenuhi (7/14 hari) | Riwayat PR |
| 3 | Keputusan dan approver tercatat | Bagian Keputusan |
| 4 | ADR ada untuk perubahan struktural | Tautan dua arah |
| 5 | Spec/schema diperbarui sebelum implementasi | Urutan commit |
| 6 | Contoh valid dan contoh ditolak tersedia | Bagian Spesifikasi |
