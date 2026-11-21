---
id: TPL-COMPONENT
title: "{{MADS_ID}} {{NAMA KOMPONEN}}"
status: draft
owner: design
prd_refs: ["§6 UX dan Design"]
---

# {{MADS_ID}} {{NAMA KOMPONEN}}

Ganti setiap placeholder `{{...}}` dan hapus baris panduan ini. Spesifikasi ini hanya untuk komponen yang **sudah terdaftar** di katalog 120 komponen (`docs/02-design/component-catalog.md`) dan di `packages/runtime-web/src/muip/catalog.generated.ts`. ID, nama, kategori, dan urutan tidak boleh ditambah, diganti, atau dihapus secara ad hoc; perubahan katalog wajib lewat generator `node scripts/generate-catalog.mjs`. 48 komponen core dispesifikasikan penuh, 72 sisanya cukup satu baris katalog.

## Anatomi

```text
{{MADS_ID}}
├── {{BAGIAN_UTAMA}}
│   ├── {{BAGIAN_ANAK}}
│   └── {{BAGIAN_ANAK}}
└── {{SLOT_OPSIONAL}}
```

{{Peran setiap bagian, elemen yang boleh dikosongkan, dan elemen yang wajib ada. Semua permukaan memakai radius clay dan shadow clay, bukan nilai mentah.}}

## Props dan Varian

| Prop | Tipe | Default | Wajib | Deskripsi |
|---|---|---|---|---|
| `{{PROP}}` | `{{TIPE}}` | `{{DEFAULT}}` | {{ya/tidak}} | {{perilaku}} |

| Varian | Perbedaan visual | Kapan dipakai |
|---|---|---|
| `{{VARIAN}}` | {{perbedaan token/clay}} | {{konteks}} |

## State

Delapan state berikut wajib didefinisikan; tulis `tidak berlaku` hanya bila state itu memang tidak mungkin terjadi dan jelaskan alasannya.

| State | Perubahan visual | Catatan |
|---|---|---|
| `default` | {{tampilan dasar, clay shadow 1}} | {{catatan}} |
| `hover` | {{translateY(-2px), shadow 1→2, 180 ms}} | Tidak berlaku pada perangkat sentuh. |
| `focus-visible` | {{ring 3 px `--mads-color-focus`, offset 2 px}} | {{catatan}} |
| `pressed` | {{scale(.97), translateY(1px), shadow pressed, 90 ms}} | {{catatan}} |
| `disabled` | {{opacity dan kontras yang tetap terbaca, tanpa pointer}} | {{catatan}} |
| `loading` | {{spinner/skeleton, lebar stabil, `aria-busy`}} | {{catatan}} |
| `error` | {{border/ikon `--mads-color-error`, teks error}} | {{catatan}} |
| `empty` | {{ilustrasi clay + satu aksi utama}} | {{catatan}} |

## Token

| Token | Pemakaian |
|---|---|
| `--mads-color-surface` / `--mads-color-surface-raised` | {{latar komponen}} |
| `--mads-color-fg` / `--mads-color-muted` | {{teks utama/sekunder}} |
| `--mads-color-primary` / `--mads-color-on-primary` | {{aksi utama}} |
| `--mads-color-error` | {{state error}} |
| `--mads-clay-shadow-1` / `--mads-clay-shadow-2` / `--mads-clay-shadow-pressed` | {{elevasi dan press}} |
| `--mads-radius-clay-sm` / `--mads-radius-clay-md` / `--mads-radius-clay-lg` / `--mads-radius-clay-xl` / `--mads-radius-full` | {{radius}} |
| `--mads-space-{{N}}` | {{padding/gap; N adalah langkah skala 1–16}} |
| `--mads-duration-micro` / `--mads-duration-control` / `--mads-duration-panel` | {{motion sesuai state}} |
| `--mads-ease-clay` | {{spring press/release}} |

Dilarang menulis `box-shadow`, `border-radius`, atau hex langsung di komponen; hanya token. Status surface dihitung dengan `color-mix(in srgb, var(--mads-color-<status>) 12%, var(--mads-color-surface))`.

## Keyboard

| Tombol | Aksi |
|---|---|
| `Tab` / `Shift+Tab` | {{urutan fokus}} |
| `Enter` / `Space` | {{aksi utama}} |
| `Esc` | {{menutup lapisan atau membatalkan}} |
| `Arrow*` | {{navigasi dalam grup, bila ada}} |

## ARIA

{{Role, `aria-label`/`aria-labelledby`, `aria-describedby`, `aria-live`, `aria-busy`, `aria-disabled`, dan hubungan antar elemen. Warna tidak boleh menjadi satu-satunya pembeda; setiap status memakai ikon atau teks.}}

## Copy

| Konteks | Teks |
|---|---|
| Label | {{teks label}} |
| Aksi utama | {{teks aksi}} |
| Empty state | {{teks empty}} |
| Error | {{teks error yang menyebut langkah pemulihan}} |

## Visual Regression

{{Screenshot baseline untuk light, dark, dan high-contrast pada state `default`, `hover`, `focus-visible`, dan `error`. Test Playwright memakai viewport mobile 390 px dan desktop 1280 px; ambang diff mengikuti `docs/08-quality/test-strategy.md`. Perubahan visual yang disengaja wajib memperbarui baseline pada PR yang sama.}}

## Do / Don't

| Do | Don't |
|---|---|
| {{pola benar dengan token clay}} | {{pola salah: nilai hardcoded, glassmorphism, atau shadow ganda}} |
| {{pola benar untuk aksesibilitas}} | {{pola salah yang mengandalkan warna saja}} |
