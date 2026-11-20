# Checklist Pull Request

## Spec

- [ ] `Spec: docs/<path>.md#<ID>` untuk setiap requirement yang terdampak
- [ ] Atau alasan `docs-not-needed`: ...

## Perubahan

<!-- Ringkasan perilaku, bukan daftar file. -->

## Verifikasi

| Perintah/prosedur | Hasil |
|---|---|
| `npm run docs:check` | |
| `npm test` | |
| Skenario manual | |

## Risiko dan Rollback

<!-- Dampak, data yang tersentuh, cara membalik. -->

## Checklist SDD

- [ ] Dokumen diubah lebih dulu (`docs:` commit sebelum `feat:`/`fix:`)
- [ ] Requirement dan acceptance diperbarui bila perilaku berubah
- [ ] Baris matriks kepatuhan diperbarui
- [ ] Status implementasi tidak diklaim tanpa verifikasi
- [ ] Tidak ada `new Function`, `eval`, atau HTML mentah pada runtime produksi
- [ ] Tidak ada secret, token, atau data pengguna pada diff
- [ ] Perubahan kontrak menyertakan RFC yang diterima
- [ ] a11y: fokus, label, keyboard, kontras (bila UI berubah)
- [ ] i18n: tidak ada string hardcoded (bila UI berubah)
- [ ] Test baru menangkap bug yang mungkin terlihat pengguna
- [ ] Risiko dan rollback dijelaskan
