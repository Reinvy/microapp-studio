---
id: ADR-{{NNNN}}
title: "ADR-{{NNNN}}: {{JUDUL KEPUTUSAN}}"
status: draft
owner: architecture
prd_refs: ["§{{SECTION}}"]
---

# ADR-{{NNNN}}: {{JUDUL KEPUTUSAN}}

Ganti setiap placeholder `{{...}}` dan hapus baris panduan ini. Nama file: `docs/01-architecture/adr/{{NNNN}}-{{slug-keputusan}}.md`. Satu ADR memutuskan satu hal; jangan gabungkan dua keputusan yang dapat ditolak secara terpisah.

## Konteks

{{Masalah nyata, batasan web-only, dan kekuatan yang terlibat. Sebutkan route, paket, atau worker yang terdampak. Nyatakan apa yang sudah ada di kode dan apa yang belum, tanpa mengklaim fitur yang belum diimplementasikan.}}

Batasan yang selalu berlaku:

- Produk adalah PWA Next.js 16 + React 19 + TypeScript strict; berjalan di browser desktop, tablet, dan mobile.
- Tidak ada server wajib, akun, cloud sync, CRDT/P2P, aplikasi native, atau desktop bundle.
- Data lokal memakai SQLite WASM + OPFS; `CryptoKey` non-extractable disimpan di IndexedDB.
- Sandbox memakai iframe opaque origin (`sandbox="allow-scripts"`) dan MUIP.

## Keputusan

{{Keputusan yang mengikat dalam kalimat aktif: "Kami memakai ...", "Kami melarang ...". Sebutkan versi, default, dan nama API/field/token yang tepat. Bila keputusan mengubah kontrak, sebutkan file spec dan schema yang wajib diperbarui.}}

## Konsekuensi

| Jenis | Dampak |
|---|---|
| Positif | {{manfaat dan masalah yang hilang}} |
| Biaya | {{pekerjaan migrasi, ukuran bundle, atau kompleksitas baru}} |
| Risiko | {{risiko tersisa dan mitigasinya}} |
| Larangan | {{pola yang tidak boleh muncul lagi di dokumen, rules, atau kode}} |

## Alternatif

| Alternatif | Alasan ditolak |
|---|---|
| {{ALTERNATIF_SATU}} | {{alasan konkret: biaya, keamanan, aksesibilitas, atau batasan browser}} |
| {{ALTERNATIF_DUA}} | {{alasan konkret}} |

## Dampak Kontrak

| Kontrak | Perubahan | File yang diperbarui |
|---|---|---|
| Manifest | {{none / minor / major}} | `docs/03-specs/manifest.md` |
| Host Bridge | {{none / minor / major}} | `docs/03-specs/host-bridge.md` |
| Permission | {{none / minor / major}} | `docs/03-specs/permissions.md` |
| Token clay | {{none / minor / major}} | `docs/02-design/design-system.md` |
| Package `.mapp` | {{none / minor / major}} | `docs/03-specs/05-packages.md` |

## Status

`draft` → `accepted` | `rejected` | `superseded by ADR-{{NNNN}}`.

{{Pemilik review dan cara verifikasi bahwa ADR sudah tercermin di spec terkait.}}
