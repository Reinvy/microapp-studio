---
id: SKILL-SEC
title: Security Review
status: accepted
owner: security
prd_refs: ["§11", "§8"]
name: security-review
description: "Meninjau perubahan web-only terhadap threat model: CSP, sandbox escape, signature package, vault BYOK, dependency, dan kebocoran secret."
when_to_use: "Dipakai sebelum merge untuk perubahan yang menyentuh sandbox, bridge, permission, kripto, package, headers, storage, atau dependency baru."
required_docs: ["docs/01-architecture/threat-model.md", "docs/07-rules/security.md", "docs/08-quality/security-test-plan.md", "docs/03-specs/permissions.md", "docs/03-specs/03-sandbox-runtime.md", "docs/01-architecture/identity-crypto.md"]
---

# Security Review

## Kapan Digunakan

Dipakai pada setiap PR yang menyentuh salah satu area: iframe sandbox dan bootstrap, bridge broker, permission dan consent, WebCrypto dan vault, signature serta format `.mapp`, header CSP/COOP/COEP, service worker, penyimpanan OPFS/IndexedDB, BYOK, dan dependency baru.

Di luar cakupan: audit performa (gunakan [performance-budgets.md](../../08-quality/performance-budgets.md)) dan review desain visual (gunakan [add-ui-component](../add-ui-component/SKILL.md)).

## Prasyarat

- [threat-model.md](../../01-architecture/threat-model.md) dibaca: aset, STRIDE web, dan mitigasi.
- [security.md](../../07-rules/security.md) dibaca: aturan `RULE-SEC-*` yang berlaku.
- [security-test-plan.md](../../08-quality/security-test-plan.md) dibaca: skenario uji yang harus ada.
- Diff PR dipahami; tidak ada perubahan tanpa deskripsi dampak keamanan.
- Baseline test runtime dan E2E lulus sebelum review.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Diff PR | ya | Perubahan broker dan iframe bootstrap |
| Aset terdampak | ya | Data app, kunci identitas, vault BYOK |
| Ancaman terkait | ya | Sandbox escape, signature tamper, XSS |
| Test keamanan | ya | Test negatif permission dan CSP |

## Prosedur

1. Petakan diff ke aset di threat model: data lokal, kunci identitas, package, vault, BYOK, dan shell. Tuliskan jalur serang yang mungkin berubah.
2. Periksa eksekusi dinamis: tidak boleh ada `eval`, `new Function`, `innerHTML`, `document.write`, atau penyisipan HTML mentah. Renderer MUST memakai `textContent` dan node MUIP tervalidasi.
3. Periksa sandbox: iframe memakai `sandbox="allow-scripts"` tanpa `allow-same-origin`; CSP `default-src 'none'` dengan nonce untuk bootstrap; tidak ada akses DOM host dari dalam iframe.
4. Periksa bridge: setiap method ada di allowlist, permission diperiksa sebelum parameter, timeout dan rate limit berlaku, dan payload divalidasi. Kegagalan MUST menutup panggilan, bukan melanjutkan.
5. Periksa header di `apps/studio-web/next.config.ts`: CSP ketat, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, dan tidak ada `unsafe-eval`.
6. Periksa package: manifest divalidasi, digest dan signature Ed25519 diverifikasi lokal, path traversal ditolak, dan perubahan public key diblokir.
7. Periksa kripto: `CryptoKey` non-extractable, tidak ada kunci di `localStorage`, log, atau ekspor settings. BYOK hanya di vault dan tidak pernah dikirim ke selain endpoint pengguna.
8. Periksa telemetry: tidak ada analytics, beacon, atau request otomatis pada build produksi.
9. Jalankan pemindaian secret pada diff dan seluruh repo; periksa juga fixture agar hanya memakai nilai dummy yang ditandai.
10. Tinjau dependency baru: sumber, lisensi, ukuran, dan izin script. Tolak dependency yang menambah kemampuan jaringan atau evaluasi kode tanpa justifikasi tertulis.
11. Minta test negatif untuk setiap perubahan keamanan; tanpa test negatif, review tidak lulus.

## Verifikasi

```bash
git grep -nE '(BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})' -- . ':!*.lock' ':!node_modules'
git grep -nE '\b(eval|new Function|innerHTML|document\.write)\b' -- apps packages ':!*.test.*'
npm test -w @microapp/runtime-web
npm test -w @microapp/studio-web
npm run e2e
npm audit --audit-level=high
node scripts/check-docs.mjs --strict
```

Pemindaian secret harus kosong kecuali nilai dummy yang ditandai. `npm audit` tidak boleh menemukan kerentanan high atau critical yang belum dimitigasi.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Sandbox memakai `allow-same-origin` | Hapus; opaque origin wajib |
| CSP memuat `unsafe-eval` atau `unsafe-inline` untuk script | Gunakan nonce dan hash |
| Permission diperiksa setelah parameter diproses | Pindahkan pemeriksaan ke awal broker |
| Kunci disimpan di `localStorage` | Simpan sebagai `CryptoKey` non-extractable atau di vault |
| Menambah dependency tanpa meninjau izinnya | Tinjau sumber dan kemampuan, catat di PR |

## Definition of Done

- Setiap temuan memiliki perbaikan atau pengecualian tertulis yang disetujui.
- Test negatif tersedia untuk area yang berubah.
- Pemindaian secret bersih dan dependency high/critical tertangani.
- Header dan sandbox diverifikasi pada respons nyata.
