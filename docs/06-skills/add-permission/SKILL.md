---
id: SKILL-PERM
title: Menambah Permission
status: accepted
owner: security
prd_refs: ["§5 F7", "§8"]
name: add-permission
description: "Menambahkan atau mengubah permission micro-app dari deklarasi manifest sampai broker, consent JIT, audit, dan test negatif."
when_to_use: "Dipakai saat micro-app membutuhkan akses baru, risk tier berubah, atau perilaku consent, revoke, dan audit perlu disesuaikan."
required_docs: ["docs/03-specs/permissions.md", "docs/03-specs/host-bridge.md", "docs/03-specs/manifest.md", "docs/01-architecture/sandbox-runtime.md", "docs/07-rules/security.md", "docs/04-flows/06-permission-consent.md"]
---

# Menambah Permission

## Kapan Digunakan

Dipakai ketika sebuah kemampuan baru memerlukan akses dari micro-app ke host: clipboard, notifikasi, file picker, network, vault, atau data app. Juga dipakai saat risk tier, alasan consent, atau cakupan permission yang ada berubah.

Di luar cakupan: menambah method bridge tanpa permission (tetap memerlukan perubahan `host-bridge.md`), perubahan sandbox (gunakan [security-review](../security-review/SKILL.md) setelahnya), dan perubahan manifest di luar field `permissions` (gunakan [extend-manifest](../extend-manifest/SKILL.md)).

## Prasyarat

- [permissions.md](../../03-specs/permissions.md) dibaca: daftar permission, risk tier, consent, revoke, offline cage, audit.
- [host-bridge.md](../../03-specs/host-bridge.md) dibaca: namespace, method, error, timeout, rate limit.
- [manifest.md](../../03-specs/manifest.md) dibaca: permission hanya boleh berasal dari daftar tertutup.
- [FLOW-06](../../04-flows/06-permission-consent.md) dipahami sebagai alur referensi consent.
- Baseline `npm test -w @microapp/runtime-web` lulus.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Permission | ya | `clipboard.read` |
| Risk tier | ya | `low` |
| Method bridge | ya | `clipboard.readText` |
| Alasan plain-language | ya | "Menempel teks yang Anda salin" |
| Test negatif | ya | Panggilan tanpa grant ditolak |

## Prosedur

1. Tentukan apakah permission benar-benar diperlukan. Default adalah menolak: jika data bisa diperoleh dari DB app sendiri, gunakan `storage.app` dan jangan menambah permission.
2. Tambahkan permission ke tabel daftar di `03-specs/permissions.md` beserta risk tier, cakupan, dan catatan. Permission di luar daftar ini MUST ditolak broker.
3. Deklarasikan di `03-specs/manifest.md` sebagai bagian array `permissions` dan pastikan schema [microapp.manifest.v2.schema.json](../../03-specs/schemas/microapp.manifest.v2.schema.json) menerima enum tersebut.
4. Daftarkan method di allowlist `packages/runtime-web/src/bridge/protocol.ts` dengan `permission` yang sesuai. Method tanpa entri allowlist tidak boleh dieksekusi.
5. Implementasikan pemeriksaan di `packages/runtime-web/src/bridge/broker.ts` sebelum validasi parameter: manifest → grant → consent. Urutan ini tidak boleh dibalik.
6. Implementasikan consent JIT sesuai [FLOW-06](../../04-flows/06-permission-consent.md): sheet memuat nama app, permission, alasan, dan risk tier; fokus default **Tolak**; `Esc` = Tolak.
7. Simpan grant beserta scope dan waktu; revoke dari Settings harus langsung berlaku dan memicu consent lagi pada panggilan berikutnya.
8. Hormati Offline Cage: saat cage aktif, `network.fetch` ditolak dengan `E-NET-001` sebelum keluar dari browser.
9. Catat grant, revoke, dan penolakan pada audit lokal dengan rantai hash; audit tidak boleh memuat nilai record, token, atau passphrase.
10. Tambahkan test positif dan negatif: tanpa deklarasi, tanpa grant, deny, allow once, allow always, revoke, dan cage aktif.

## Verifikasi

```bash
npm test -w @microapp/runtime-web
npm test -w @microapp/studio-web
npm run typecheck
npm run lint
npm run e2e
node scripts/check-docs.mjs --strict
```

Test negatif wajib membuktikan bahwa panggilan tanpa grant gagal sebelum efek samping apa pun. Periksa juga bahwa log audit tidak memuat nilai sensitif.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Menambah method bridge tanpa permission | Daftarkan permission dan entri protocol bersamaan |
| Consent muncul setelah efek samping | Pindahkan pemeriksaan ke awal broker |
| Grant disimpan tanpa scope | Simpan scope, waktu, dan app id |
| Revoke hanya menyembunyikan UI | Hapus grant sehingga panggilan berikutnya meminta consent |
| Audit memuat isi clipboard | Catat metadata dan hasil, bukan nilai |

## Definition of Done

- Permission terdaftar di spec, manifest, schema, dan allowlist broker.
- Consent JIT sesuai FLOW-06 dan default menolak.
- Revoke dan Offline Cage teruji.
- Audit mencatat aksi tanpa data sensitif.
- Test positif dan negatif lulus.
