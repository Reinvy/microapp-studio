---
id: RULE-TS
title: Rules TypeScript dan Next.js
status: accepted
owner: runtime
prd_refs: ["§7"]
---

# Rules TypeScript dan Next.js

Aturan ini mengikat seluruh kode TypeScript di `apps/studio-web`, `packages/runtime-web`, dan `packages/ui-kit`: Next.js 16 App Router, React 19, TypeScript strict, dan Tailwind v4. Tujuannya menjaga batas server/client, mencegah eksekusi kode arbitrer, dan memastikan aplikasi tetap cepat di browser.

## 1. Tujuan dan Ruang Lingkup

| Aspek | Kontrak |
|---|---|
| Bahasa | TypeScript strict, tanpa JavaScript sumber baru. |
| Framework | Next.js 16 App Router, React 19, client-first. |
| Rendering micro-app | Hanya lewat iframe sandbox dan renderer MUIP; lihat [03-sandbox-runtime.md](../03-specs/03-sandbox-runtime.md). |
| Target | Browser desktop, tablet, dan mobile; tidak ada bundel di luar web. |

Di luar cakupan: format dokumen, aturan visual (lihat [ui-ux.md](ui-ux.md)), dan data (lihat [data-migrations.md](data-migrations.md)).

## 2. Prinsip

1. **Tipe adalah kontrak.** Batas antar modul, worker, dan package harus eksplisit dan divalidasi saat runtime.
2. **Default ke server, klien hanya bila perlu.** Komponen client memperbesar bundel dan memperluas permukaan serangan.
3. **Tidak ada eksekusi string.** HTML, CSS, dan JavaScript dari package tidak pernah dieksekusi oleh host.
4. **Gagal dengan pesan yang bisa ditindaklanjuti.** Error pengguna memakai kode dan langkah pemulihan, bukan stack trace.

## 3. Aturan

| ID | Level | Aturan | Verifikasi |
|---|---|---|---|
| RULE-TS-001 | MUST | `tsconfig` memakai `strict`, `noUncheckedIndexedAccess`, dan `exactOptionalPropertyTypes`. Penekanan tipe (`@ts-expect-error`) hanya dengan komentar alasan dan nomor issue. | `npm run typecheck` |
| RULE-TS-002 | MUST | Tidak ada `any` eksplisit pada kode baru. Gunakan `unknown` lalu narrowing, parser schema, atau tipe union diskriminatif. | ESLint `no-explicit-any` |
| RULE-TS-003 | MUST | Server Component adalah default. `"use client"` hanya pada subtree terkecil yang membutuhkan hook, event, atau API browser. | Review dan analisis bundel |
| RULE-TS-004 | MUST | Modul khusus server (`node:*`, `fs`, `process`, secret) MUST NOT diimpor ke komponen client. Kriptografi browser memakai WebCrypto. | Review; lint batas impor |
| RULE-TS-005 | MUST | Setiap input dari luar (route handler, server action, pesan worker, manifest, respons AI) divalidasi schema sebelum dipakai dan mengembalikan error bertipe. | Unit test validasi |
| RULE-TS-006 | MUST | Dilarang `eval`, `new Function`, `innerHTML`, dan `dangerouslySetInnerHTML`. Render micro-app hanya melalui renderer MUIP. | Grep CI dan review |
| RULE-TS-007 | MUST | Setiap `await` berada dalam `try/catch` atau mengembalikan `Result`. Promise menggantung dilarang; `void promise` hanya dengan `.catch` eksplisit. | ESLint `no-floating-promises` |
| RULE-TS-008 | MUST | Akses SQLite WASM dan OPFS hanya dari worker melalui RPC bertipe. Tidak ada operasi sinkron blocking di main thread. | Review dan profil INP |
| RULE-TS-009 | MUST | Efek React membersihkan langganan, timer, `AbortController`, dan worker saat unmount; dependency array lengkap. | ESLint hooks, test |
| RULE-TS-010 | MUST | State dimulai lokal. Store global baru hanya dengan ADR; state turunan dihitung, bukan disalin ke state lain. | Review |
| RULE-TS-011 | MUST | Props dan state tidak dimutasi langsung; pembaruan memakai salinan immutable atau helper reducer. | Review, test regresi |
| RULE-TS-012 | MUST | API yang diekspor memiliki return type eksplisit dan parameter `readonly`; tipe boolean/opsional ganda dihindari agar tidak ambigu. | `tsc --noEmit` |
| RULE-TS-013 | MUST | Route di-split per halaman; editor, tabel besar, dan panel berat dimuat dengan `dynamic import`. Budget JS awal < 250 KB gzip. | Analisis bundel, NFR-PERF-004 |
| RULE-TS-014 | MUST | Impor memakai entry point package, bukan path internal. Barrel import yang merusak tree shaking dilarang di bundle client. | Bundle analyzer |
| RULE-TS-015 | MUST | TSX memakai elemen semantik dengan label dan atribut ARIA; elemen non-interaktif tidak diberi handler klik. Target sentuh ≥ 44 px. | axe, review, NFR-A11Y-002 |
| RULE-TS-016 | MUST | Tidak ada string yang dilihat pengguna di dalam kode; semua lewat katalog pesan `id-ID`/`en-US`, dan format angka/tanggal memakai `Intl`. | Lint string, review, NFR-I18N-001 |
| RULE-TS-017 | MUST | Tidak ada secret di source, variabel `NEXT_PUBLIC_*`, log, atau fixture. Kunci BYOK hanya dibaca dari vault saat dipakai. | Secret scan, review |
| RULE-TS-018 | MUST | ID baru memakai helper UUIDv7; waktu diambil dari clock yang dapat diinjeksi agar test deterministik. `Date.now()` di render dilarang. | Unit test |
| RULE-TS-019 | MUST | Error yang tampil ke pengguna memakai kode dari [error-codes.md](../03-specs/error-codes.md) dan pesan i18n; stack hanya untuk log dev yang teredaksi. | Review, test error surface |
| RULE-TS-020 | MUST | Dependensi runtime baru memerlukan review lisensi, ukuran, provenance, dan skrip `postinstall`. Lockfile di-commit; versi tidak memakai rentang terbuka. | Review dependensi |

## 4. Pola yang Dianjurkan

```ts
type BridgeResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

export async function requestPermission(
  name: PermissionName,
  signal: AbortSignal,
): Promise<BridgeResult<Grant>> {
  try {
    const value = await broker.request(name, { signal });
    return { ok: true, value };
  } catch (error) {
    return { ok: false, code: 'E-NET-001', message: toSafeMessage(error) };
  }
}
```

- Letakkan validasi schema tepat di batas, bukan di tengah komponen.
- Pisahkan tipe publik package ke `types.ts` agar boundary mudah diaudit.
- Gunakan `satisfies` untuk objek konfigurasi, bukan cast.

## 5. Anti-pola

| Anti-pola | Alasan dilarang |
|---|---|
| `as unknown as T` pada data eksternal | Melewati validasi runtime. |
| `useEffect` untuk menyalin props ke state | Menambah render dan menyembunyikan sumber kebenaran. |
| `dangerouslySetInnerHTML` untuk markdown | Membuka XSS di origin host. |
| `JSON.parse` respons AI lalu langsung dipakai | Rencana AI tidak tepercaya sebelum divalidasi. |
| `localStorage` untuk kunci atau token | Dapat dibaca skrip lain dan tidak non-extractable. |

## 6. Verifikasi

| Langkah | Perintah | Lulus bila |
|---|---|---|
| Tipe | `npm run typecheck` | Exit 0, tanpa error baru. |
| Lint | `npm run lint` | Tanpa warning baru pada file yang berubah. |
| Test | `npm test` | Seluruh test workspace terkait lulus. |
| Bundel | `npm run build` dan analisis ukuran | JS awal < 250 KB gzip. |

## 7. Pengecualian

Pengecualian MUST mengikuti proses di [README.md](README.md). Pengecualian RULE-TS-004, RULE-TS-006, dan RULE-TS-017 memerlukan persetujuan reviewer `security` dan tidak boleh permanen.
