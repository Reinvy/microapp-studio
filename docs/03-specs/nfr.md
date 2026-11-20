---
id: SPEC-NFR
title: Non-Functional Requirements
status: accepted
owner: qa
prd_refs: ["§1.3", "§6"]
---

# Non-Functional Requirements

## 1. Tujuan dan Ruang Lingkup

Dokumen ini mengubah target PRD §1.3 dan §6 menjadi requirement terukur dengan metode ukur, perangkat referensi, dan gate. Angka pada dokumen ini adalah kontrak; perubahan target wajib melalui RFC.

Di luar lingkup: prosedur profiling lengkap (lihat [performance-budgets.md](../08-quality/performance-budgets.md)), gate rilis (lihat [release-gates.md](../08-quality/release-gates.md)).

## 2. Aktor dan Prasyarat

| Aktor | Prasyarat |
|---|---|
| QA | Perangkat referensi dan alat ukur terpasang |
| Developer | Profiler lokal dan build production |
| Release manager | Hasil ukur per kandidat rilis |

Perangkat referensi: Android mid-range 4 GB RAM (mobile), laptop 8 GB RAM 4 core (desktop), web Chromium stabil terbaru pada laptop yang sama, VPS 1 vCPU/512 MB (server).

## 3. Requirement

| ID | Level | Requirement | Acceptance |
|---|---|---|---|
| NFR-PERF-001 | MUST | Cold start micro-app dari cache lokal MUST < 150 ms pada perangkat referensi, diukur dari tap ikon sampai frame pertama. | 20 pengukuran berturut-turut, p95 < 150 ms. |
| NFR-PERF-002 | MUST | Warm switch antar micro-app MUST < 50 ms, termasuk restore state. | p95 < 50 ms pada 20 perpindahan. |
| NFR-PERF-003 | MUST | Render pertama Host Shell MUST < 500 ms dari launch sampai frame Home. | p95 < 500 ms pada 20 launch. |
| NFR-PERF-004 | MUST | Host dan transisi micro-app MUST mempertahankan 60–120 FPS; tidak ada frame drop > 32 ms pada interaksi umum. | Profiler menunjukkan p99 frame < 16,7 ms (60 FPS) atau < 8,3 ms (120 FPS) pada perangkat yang mendukung. |
| NFR-PERF-005 | MUST | Latensi delta sync per mutasi CRDT MUST < 100 ms pada LAN dan self-host. | p95 < 100 ms untuk 1.000 mutasi. |
| NFR-PERF-006 | MUST | Profil Lite MUST beroperasi pada 1 vCPU dan 512 MB RAM untuk 1–20 pengguna aktif tanpa OOM. | Uji beban 20 pengguna selama 1 jam; RSS < 512 MB. |
| NFR-SIZE-001 | MUST | Installer Host mobile MUST < 35 MB per arsitektur. | Ukuran artefak rilis < 35 MB untuk `arm64-v8a` dan `armeabi-v7a`. |
| NFR-SIZE-002 | MUST | Installer Host desktop MUST < 45 MB per platform. | Ukuran artefak Linux/Windows/macOS < 45 MB. |
| NFR-SIZE-003 | MUST | Binary server MUST < 30 MB. | Ukuran binary Go terkompilasi < 30 MB. |
| NFR-A11Y-001 | MUST | Host dan Studio MUST memenuhi WCAG 2.2 Level AA. | Audit axe tanpa pelanggaran serius/kritis; checklist manual lulus. |
| NFR-A11Y-002 | MUST | Seluruh alur inti MUST dapat diselesaikan hanya dengan keyboard. | Audit keyboard-only menyelesaikan 10 tugas inti di Host dan 5 di Studio. |
| NFR-A11Y-003 | MUST | Setiap kontrol MUST memiliki nama, role, dan state yang terbaca screen reader; perubahan status diumumkan melalui live region. | Uji NVDA dan VoiceOver pada 22 layar; tidak ada kontrol tanpa nama. |
| NFR-A11Y-004 | MUST | Rasio kontras teks MUST ≥ 4,5:1 dan komponen non-teks ≥ 3:1 pada seluruh tema, termasuk high-contrast. | Alat kontras lulus pada semua pasangan token yang dipakai. |
| NFR-A11Y-005 | MUST | Animasi MUST menghormati `prefers-reduced-motion` dan MUST dapat dimatikan tanpa kehilangan informasi. | Dengan reduced motion, durasi animasi 0 dan alur tetap dapat diselesaikan. |
| NFR-I18N-001 | MUST | `id-ID` dan `en-US` MUST first-class: seluruh string UI, pesan error, dan dokumen bantuan tersedia di keduanya. | Tidak ada string hardcoded pada UI; kunci locale lengkap 100%. |
| NFR-I18N-002 | MUST | Layout MUST mendukung RTL tanpa pemotongan teks atau kontrol, dengan mirroring ikon arah. | Uji locale RTL pada 22 layar; tidak ada overflow. |
| NFR-SUPPLY-001 | MUST | Setiap rilis resmi MUST menyertakan SBOM CycloneDX atau SPDX. | SBOM tersedia dan memuat seluruh dependency runtime. |
| NFR-SUPPLY-002 | MUST | Setiap artefak rilis MUST menyertakan checksum SHA-256 dan SLSA build provenance yang dapat diverifikasi. | Verifikasi checksum dan provenance berhasil untuk setiap artefak. |
| NFR-SUPPLY-003 | MUST | Host MUST NOT memuat aset runtime eksternal (font CDN, analytics, skrip pihak ketiga); seluruh aset UI inti dibundel lokal. | Audit jaringan pada mode air-gap tidak menemukan request keluar. |
| NFR-REL-001 | MUST | Crash-free session rate Host Shell MUST ≥ 99,98% pada build stabil. | Data crash opt-in/uji internal menunjukkan ≥ 99,98% selama 30 hari. |

## 4. Model Data dan State

| Metrik | Sumber data | Retensi | Ambang gagal |
|---|---|---|---|
| Cold/warm start | Profiler lokal dan benchmark CI | 90 hari | p95 melebihi target |
| FPS | Profiler lokal | 30 hari | p99 frame melebihi target |
| Sync latency | Log sync lokal | 30 hari | p95 melebihi target |
| Ukuran artefak | Pipeline build | per rilis | melebihi target |
| Crash-free | Crash report lokal/opt-in | 90 hari | di bawah target |
| A11y | Audit otomatis + manual | per rilis | pelanggaran serius |

## 5. Error dan Recovery

| Kode | Kondisi | Recovery |
|---|---|---|
| E-HOST-005 | Pembersihan penyimpanan tidak cukup | Tampilkan rekomendasi, jangan hapus data pengguna |
| E-DATA-001 | Database gagal dibuka saat startup | Tampilkan error, tawarkan restore snapshot |
| E-SRV-003 | Storage penuh di server | Tandai degraded, tolak unggahan baru, pertahankan data |

## 6. Keamanan dan Privasi

- Pengukuran performa dan crash MUST NOT mengirim data keluar secara default.
- Metrik yang dikumpulkan opt-in MUST dianonimkan dan disimpan di instance sendiri.
- Profiler lokal MUST meredaksi nilai data pengguna.
- SBOM dan provenance tidak boleh memuat kredensial build.

## 7. Acceptance Criteria

- **Given** build kandidat **When** benchmark dijalankan **Then** seluruh metrik p95 memenuhi target dan hasil dicatat.
- **Given** audit axe pada 22 layar **When** dijalankan **Then** tidak ada pelanggaran serius/kritis.
- **Given** locale `ar` **When** 22 layar dibuka **Then** tidak ada overflow dan arah benar.
- **Given** mode air-gap **When** Host berjalan **Then** tidak ada request aset eksternal.
- **Given** rilis **When** artefak diperiksa **Then** SBOM, checksum, dan provenance tersedia.

## 8. Verifikasi

| Bukti | Perintah/Prosedur |
|---|---|
| Benchmark | Jalankan suite performa pada perangkat referensi; simpan hasil |
| Ukuran | Ukur artefak rilis per platform |
| A11y | axe + audit manual + keyboard-only |
| i18n | Pseudo-locale dan RTL sweep |
| Supply chain | Verifikasi SBOM, checksum, provenance |
| Server | Uji beban 20 pengguna pada 512 MB |

## 9. Referensi

- [08-quality/performance-budgets.md](../08-quality/performance-budgets.md), [08-quality/test-strategy.md](../08-quality/test-strategy.md), [08-quality/release-gates.md](../08-quality/release-gates.md)
- [00-foundation/product-foundation.md](../00-foundation/product-foundation.md)
