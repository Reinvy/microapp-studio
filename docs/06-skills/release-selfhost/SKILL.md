---
id: SKILL-RELEASE-SELFHOST
title: Merilis Server Self-Host
status: accepted
owner: dx
prd_refs: ["§3 Modul 7"]
name: release-selfhost
description: "Menerbitkan rilis server self-host multi-arsitektur yang bertanda tangan, dengan SBOM, checksum, bundle air-gap, dan smoke test 512 MB."
when_to_use: "Dipakai saat menerbitkan versi baru server Lite, Standard, atau Cluster ke kanal rilis."
required_docs: ["docs/03-specs/07-selfhost.md", "docs/01-architecture/selfhost.md", "docs/03-specs/nfr.md", "docs/01-architecture/monorepo.md", "docs/09-operations/selfhost-runbook.md", "docs/08-quality/release-gates.md"]
---

# Merilis Server Self-Host

## Kapan Digunakan

Dipakai ketika server self-host akan dirilis: binary Lite, image Docker Standard, Helm chart Cluster, atau bundle air-gap. Rilis hanya sah bila artefak dapat diverifikasi, berjalan pada anggaran 1 vCPU/512 MB untuk Lite, dan prosedur upgrade serta rollback terbukti.

Di luar cakupan: menerbitkan paket micro-app ke registry (gunakan alur publish di [05-registry.md](../../03-specs/05-registry.md)) dan merilis paket npm SDK/CLI.

## Prasyarat

- [03-specs/07-selfhost.md](../../03-specs/07-selfhost.md) bagian 3, 7, dan 8 dibaca; [01-architecture/selfhost.md](../../01-architecture/selfhost.md) dipahami termasuk port 8080/8443 dan endpoint `/healthz` serta `/readyz`.
- [03-specs/nfr.md](../../03-specs/nfr.md) dibaca: `NFR-SUPPLY-001`, `NFR-SUPPLY-002`, `NFR-SIZE-003`, `NFR-PERF-006`.
- Kunci rilis Ed25519 tersedia dan dilindungi; tidak pernah masuk repo.
- Lingkungan uji dengan Docker buildx, Helm, dan batas memori 512 MB tersedia.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Versi rilis | ya | `1.4.0` |
| Catatan perubahan | ya | Entri pada `CHANGELOG.md` |
| Target platform | ya | `linux/amd64`, `linux/arm64` |
| Artefak | ya | Binary, image Docker, Helm chart, bundle air-gap |
| Bukti smoke | ya | Health/ready lulus pada 512 MB |

## Prosedur

1. Baca [03-specs/07-selfhost.md](../../03-specs/07-selfhost.md) dan [selfhost-runbook.md](../../09-operations/selfhost-runbook.md); pastikan seluruh perubahan yang masuk sudah memiliki spec dan flow yang sesuai.
2. Tetapkan versi semver dan tag `v1.4.0`. Tambahkan entri rilis pada `CHANGELOG.md` yang merangkum perubahan, migrasi database, dan tindakan operator.
3. Jalankan test dan pemeriksaan statis server sebelum membangun apa pun: `go test ./...` dan `go vet ./...` dari `apps/selfhost-server`.
4. Bangun binary Lite multi-arsitektur dengan `-trimpath` dan `-ldflags="-s -w"` untuk `linux/amd64` dan `linux/arm64`, lalu periksa ukuran binary memenuhi `NFR-SIZE-003` (< 30 MB).
5. Bangun image multi-arsitektur dari `deploy/docker/Dockerfile` dengan `docker buildx build --platform linux/amd64,linux/arm64`, dan jalankan `helm lint` serta `helm package` untuk chart di `deploy/helm/`.
6. Hasilkan SBOM CycloneDX atau SPDX, checksum SHA-256 untuk setiap artefak, dan signature detached Ed25519 atas checksum memakai kunci rilis. Tanpa ketiganya, rilis MUST NOT dipublikasikan.
7. Bangun bundle air-gap di `deploy/airgap/` yang memuat binary/image, chart, SBOM, checksum, signature, font, ikon, Monaco/LSP, mirror registry, dan model AI yang didukung.
8. Jalankan smoke test Lite dengan batas 1 vCPU dan 512 MB, ukur waktu deploy (harus < 2 menit), dan periksa `/healthz` serta `/readyz` melaporkan status dependency tanpa membocorkan kredensial.
9. Uji upgrade dan rollback: jalankan migrasi database, verifikasi startup menolak schema yang tidak kompatibel, lalu kembalikan ke versi sebelumnya dan pastikan data utuh.
10. Uji backup dan restore database, object storage, serta konfigurasi; verifikasi checksum dan tampilkan ringkasan hasil.
11. Uji instalasi air-gap dengan egress diblokir, lalu konfirmasi tidak ada panggilan keluar selama operasi dasar.
12. Perbarui catatan rilis, [implementation-status.md](../../00-foundation/implementation-status.md), dan [prd-compliance-matrix.md](../../00-foundation/prd-compliance-matrix.md) hanya untuk requirement yang benar-benar terverifikasi.
13. Jalankan blok verifikasi dan publikasikan artefak hanya setelah seluruh langkah lulus.

## Verifikasi

```bash
cd apps/selfhost-server && go test ./... && go vet ./...
docker buildx build --platform linux/amd64,linux/arm64 -f deploy/docker/Dockerfile -t microapp-server:1.4.0 apps/selfhost-server
helm lint deploy/helm/microapp-server
sha256sum -c dist/microapp-server-SHA256SUMS
docker run -d --rm --name microapp-smoke --memory=512m --cpus=1 -p 8080:8080 microapp-server:1.4.0
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:8080/readyz
docker stop microapp-smoke
npm run docs:check
```

Seluruh perintah harus exit `0`. Simpan keluaran `curl` dan `docker stats` sebagai bukti rilis; RSS yang melebihi 512 MB tanpa penurunan fungsi dianggap regresi.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Menerbitkan artefak tanpa signature atau checksum | Hasilkan SBOM, checksum, dan signature Ed25519 sebelum publikasi |
| Hanya membangun `linux/amd64` | Bangun `linux/amd64` dan `linux/arm64` dengan buildx |
| Melewati smoke test 512 MB | Jalankan container dengan `--memory=512m --cpus=1` dan catat RSS |
| Tidak menguji upgrade dan rollback | Uji migrasi naik, penolakan schema tidak kompatibel, dan rollback |
| Menulis catatan rilis yang mengklaim fitur belum terverifikasi | Catat hanya yang lulus gate; status tetap `partial` bila belum |
| Menyimpan kunci rilis di repo atau CI log | Simpan di vault rilis dan gunakan hanya saat signing |

## Definition of Done

- Versi semver, tag, dan catatan rilis tersedia.
- Binary, image, chart, dan bundle air-gap dibangun untuk amd64 dan arm64.
- SBOM, checksum SHA-256, dan signature Ed25519 tersedia serta terverifikasi.
- Smoke test Lite lulus pada 1 vCPU/512 MB dengan waktu deploy < 2 menit.
- Upgrade, rollback, backup, restore, dan instalasi air-gap terbukti.
- Status implementasi dan matriks diperbarui sesuai bukti; `npm run docs:check` bersih.
