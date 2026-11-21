# Checklist Pull Request

## Spec

- [ ] `Spec: docs/<path>.md#<ID>` untuk setiap requirement yang terdampak
- [ ] Atau alasan `docs-not-needed`: ...

## Perubahan

<!-- Ringkasan perilaku, bukan daftar file. -->

## Verifikasi

| Perintah/prosedur | Hasil |
|---|---|
| `node scripts/check-docs.mjs --strict` | |
| `node scripts/generate-catalog.mjs --check` | |
| `npm test` | |
| `npm run typecheck` | |
| `npm run lint` | |
| `npm run build` | |
| Skenario manual | |

## Risiko dan Rollback

<!-- Dampak, data yang tersentuh, cara membalik. -->

## Checklist Web-Only

- [ ] Dokumen diubah lebih dulu (`docs:` commit sebelum `feat:`/`fix:`)
- [ ] Requirement dan acceptance diperbarui bila perilaku berubah
- [ ] Baris matriks kepatuhan diperbarui
- [ ] Status implementasi tidak diklaim tanpa bukti di `docs/08-quality/evidence/`
- [ ] Tidak ada `new Function`, `eval`, atau HTML mentah pada runtime
- [ ] Tidak ada account, telemetry, cloud sync, atau backend wajib baru
- [ ] Tidak ada Flutter/native/server/CRDT/P2P/CLI/SDK yang dikembalikan
- [ ] Tidak ada secret, token, atau data pengguna pada diff

## Checklist UI dan Aksesibilitas

- [ ] Hanya token `--mads-*`; tidak ada hex, shadow, atau radius literal
- [ ] State lengkap: default, hover, focus-visible, pressed, disabled, loading, error, empty
- [ ] Fokus terlihat, keyboard-only berfungsi, target sentuh 44 px
- [ ] `prefers-reduced-motion` menghapus transform
- [ ] i18n `id-ID`/`en-US`; tidak ada string hardcoded
- [ ] Kontras teks ≥ 4.5:1 dan status memakai ikon + label

## Checklist Keamanan dan Package

- [ ] Permission dideklarasikan manifest dan diuji consent-nya
- [ ] `.mapp` diverifikasi signature dan digest sebelum instalasi
- [ ] CSP/COOP/COEP tidak dilonggarkan
- [ ] Perubahan kontrak menyertakan RFC/ADR yang diterima
- [ ] Test baru menangkap bug yang mungkin terlihat pengguna
- [ ] Risiko dan rollback dijelaskan
