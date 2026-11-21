---
id: RULE-UI
title: Rules UI/UX Clay
status: accepted
owner: design
prd_refs: ["§6"]
---

# Rules UI/UX Clay

Aturan ini mengikat seluruh permukaan visual di `apps/studio-web` dan `packages/ui-kit` pada design system claymorphism MADS v3. Sumber visual kanonik ada di [DESIGN.md](../../DESIGN.md); kontrak token dan implementasi ada di [design-system.md](../02-design/design-system.md). Bila nilai visual berbeda, `DESIGN.md` menang.

## 1. Tujuan dan Ruang Lingkup

| Aspek | Kontrak |
|---|---|
| Bahasa visual | Claymorphism: radius besar, highlight dalam, bayangan hangat, tint pastel. |
| Token | Hanya variabel `--mads-*`; tidak ada nilai visual mentah di komponen. |
| Tema | Light, dark, dan high-contrast dengan struktur token yang sama. |
| Platform | Satu layout responsif untuk desktop, tablet, dan mobile browser. |

Di luar cakupan: katalog anatomi komponen (lihat [component-catalog.md](../02-design/component-catalog.md)), pola interaksi rinci (lihat [interaction-patterns.md](../02-design/interaction-patterns.md)), dan kriteria WCAG per layar (lihat [accessibility.md](../02-design/accessibility.md)).

## 2. Prinsip

1. **Clay, bukan kaca.** Permukaan terasa seperti tanah liat: radius besar, tepi terang di atas, bayangan dalam di bawah. Tidak ada glassmorphism sebagai bahasa utama.
2. **Tenang.** Satu aksi utama per layar; warna pekat hanya untuk aksi, pastel untuk area.
3. **Taktil.** Hover mengangkat, tekan menurunkan, lepas memantul kembali. Gerakan tidak pernah memblokir input.
4. **Jujur.** Tidak ada pola gelap, urgensi palsu, atau consent yang sudah tercentang.

## 3. Aturan

| ID | Level | Aturan | Verifikasi |
|---|---|---|---|
| RULE-UI-001 | MUST | Semua warna, radius, bayangan, spasi, dan tipografi memakai token `--mads-*`. Hex, `box-shadow`, `border-radius`, dan `font-size` mentah dilarang di komponen. | Lint token, review |
| RULE-UI-002 | MUST | Bayangan memakai `--mads-clay-shadow-1` sampai `--mads-clay-shadow-3`; state tekan memakai `--mads-clay-shadow-pressed`. Bayangan ganda buatan sendiri dilarang. | Screenshot review |
| RULE-UI-003 | MUST | Radius hanya dari `--mads-radius-clay-sm` (14 px), `md` (20 px), `lg` (28 px), `xl` (36 px), atau `full`. | Review |
| RULE-UI-004 | MUST | Tipografi memakai skala 12/14/16/18/22/28/36/48 px dengan line-height token; font dibundel lokal sebagai WOFF2, tanpa CDN. | Review, audit jaringan |
| RULE-UI-005 | MUST | Durasi gerak hanya 120, 180, 240, atau 320 ms; easing memakai `--mads-ease-clay` atau `--mads-ease-standard`. Nilai easing baru dilarang. | Review |
| RULE-UI-006 | MUST | Setiap komponen mendefinisikan state `default`, `hover`, `focus-visible`, `pressed`, `disabled`, `loading`, `error`, dan `empty` bila relevan. State yang tidak relevan didokumentasikan alasannya di katalog. | Katalog, visual test |
| RULE-UI-007 | MUST | Efek hover hanya aktif pada `@media (pointer: fine)`; perangkat sentuh tidak memakai state hover. | Test device emulation |
| RULE-UI-008 | MUST | Umpan balik tekan: 90 ms, `scale(.97)`, `translateY(1px)`, bayangan pressed. Lepas kembali dengan spring `--mads-ease-clay` ≤ 180 ms dan overshoot ≤ 2%. | Visual test |
| RULE-UI-009 | MUST | Fokus keyboard memakai ring 3 px `--mads-color-focus`, offset 2 px, dan halo putih 2 px pada tema gelap. `outline: none` tanpa pengganti dilarang. | axe, review |
| RULE-UI-010 | MUST | Kontras teks normal ≥ 4.5:1, teks besar ≥ 3:1, batas kontrol dan focus ring ≥ 3:1. `--mads-color-muted` hanya untuk teks besar di atas `bg`. | Kontras checker, NFR-A11Y-001 |
| RULE-UI-011 | MUST | Target sentuh minimal 44×44 px; kontrol sekunder minimal 24×24 px dengan padding yang memperluas area tekan. | axe, review |
| RULE-UI-012 | MUST | Pada `prefers-reduced-motion: reduce`, semua durasi menjadi 0 ms, transform dihapus, blob dan confetti berhenti. | Emulasi media, NFR-A11Y-003 |
| RULE-UI-013 | MUST | Satu aksi utama per layar, ditandai tombol filled `--mads-color-primary`. Aksi sekunder memakai outline atau teks. | Screen spec review |
| RULE-UI-014 | MUST | Consent permission default `Deny`, fokus awal pada **Tolak**, dan `Esc` sama dengan menolak. Tidak ada consent yang sudah tercentang. | E2E consent, review |
| RULE-UI-015 | MUST | Pola gelap dilarang: hitung mundur palsu, biaya tersembunyi, confirm-shaming, tombol tutup yang menipu, dan langganan paksa. | Review |
| RULE-UI-016 | MUST | Empty state menjelaskan kondisi, menampilkan satu aksi utama, dan tidak memakai ilustrasi yang menutupi konten. | Screen spec review |
| RULE-UI-017 | MUST | Pesan error memakai bahasa biasa, menyebut tindakan pemulihan, dan tidak menyalahkan pengguna; kode error ditampilkan kecil dan dapat disalin. | Review, test error surface |
| RULE-UI-018 | MUST | Loading di atas 400 ms memakai skeleton berukuran sama dengan konten akhir; spinner tunggal tanpa placeholder dilarang karena memicu layout shift. | Visual test, CLS |
| RULE-UI-019 | MUST | Setiap interaksi drag/drop memiliki jalur keyboard setara (pindah atas/bawah, masukkan, hapus) dan drop indicator 2 px primary. | E2E keyboard |
| RULE-UI-020 | MUST | Layout memakai `CSS Grid`/`Flex` responsif dan properti logis (`margin-inline`, `padding-block`) agar RTL aman; navigasi mengikuti breakpoint 640/1024/1440 px tanpa scroll horizontal. | Screenshot matrix, NFR-I18N-002 |

## 4. Pemetaan Token Wajib

| Kebutuhan | Token |
|---|---|
| Latar halaman | `--mads-color-bg` |
| Permukaan clay | `--mads-color-surface`, `--mads-color-surface-raised` |
| Teks | `--mads-color-fg`, `--mads-color-muted` |
| Aksi | `--mads-color-primary`, `--mads-color-on-primary` |
| Status | `--mads-color-success`, `--mads-color-warning`, `--mads-color-error`, `--mads-color-info` |
| Tint clay | `--mads-clay-mint`, `lilac`, `peach`, `butter`, `sky` |
| Elevasi | `--mads-clay-shadow-1`, `2`, `3`, `pressed` |
| Radius | `--mads-radius-clay-sm`, `md`, `lg`, `xl`, `full` |
| Gerak | `--mads-ease-clay`, `--mads-ease-standard` |

Status surface dihitung dengan `color-mix(in srgb, var(--mads-color-<status>) 12%, var(--mads-color-surface))`, bukan warna hardcoded. Pada high-contrast, status surface memakai `#E0E0E0` dengan teks `#000000`.

## 5. Contoh Implementasi

```css
.clay-button {
  border-radius: var(--mads-radius-clay-md);
  background: var(--mads-color-primary);
  color: var(--mads-color-on-primary);
  box-shadow: var(--mads-clay-shadow-1);
  transition:
    transform 180ms var(--mads-ease-clay),
    box-shadow 180ms var(--mads-ease-clay);
}

.clay-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--mads-clay-shadow-2);
}

.clay-button:active {
  transform: translateY(1px) scale(0.97);
  box-shadow: var(--mads-clay-shadow-pressed);
}

@media (prefers-reduced-motion: reduce) {
  .clay-button {
    transition: none;
    transform: none;
  }
}
```

## 6. Verifikasi

| Langkah | Perintah | Lulus bila |
|---|---|---|
| Audit token | Review diff `ui-kit` | Tidak ada nilai visual mentah. |
| Aksesibilitas | axe pada layar berubah + keyboard manual | Tanpa pelanggaran serius; fokus terlihat. |
| Visual | Snapshot light/dark/high-contrast | Tidak ada regresi tanpa persetujuan desain. |
| Reduced motion | Emulasi `prefers-reduced-motion` | Tidak ada transform atau animasi tersisa. |

## 7. Pengecualian

Pengecualian MUST mengikuti [README.md](README.md). Perubahan kontras, ukuran target sentuh, atau state consent memerlukan persetujuan reviewer `design` dan `security`, serta tidak boleh menurunkan NFR-A11Y.
