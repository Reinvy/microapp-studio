---
id: DOC-SECURITY
title: Security Policy
status: accepted
owner: security
prd_refs: ["§8 Data dan Privasi", "§11 Risiko"]
---

# Security Policy

## Ruang Lingkup

Berlaku untuk aplikasi web, package `.mapp`, backup, identitas lokal, dan tooling di repo ini. Tidak ada server produksi milik proyek yang menyimpan data pengguna; data berada di perangkat.

## Melaporkan Kerentanan

Jangan membuka issue publik untuk kerentanan yang belum diperbaiki. Kirim laporan privat ke maintainer melalui kanal yang tercantum di profil organisasi, dengan:

- Deskripsi dampak dan komponen terdampak.
- Langkah reproduksi minimal.
- Versi/commit.
- Bukti konsep bila ada, tanpa data pengguna nyata.

Kami mengakui laporan dalam 3 hari kerja dan menargetkan perbaikan untuk kerentanan kritis dalam 14 hari.

## Prioritas

| Tingkat | Contoh | Target |
|---|---|---|
| Kritis | Sandbox escape, eksekusi kode di host, pencurian kunci | 72 jam untuk mitigasi, 14 hari perbaikan |
| Tinggi | Permission bypass, signature package dilewati, backup dapat didekripsi tanpa passphrase | 7 hari |
| Sedang | XSS terbatas, kebocoran log, CSP melemah | 30 hari |
| Rendah | Hardening, pesan error informatif | Rilis berikutnya |

## Cakupan

Di dalam cakupan: `apps/studio-web`, `packages/runtime-web`, `packages/ui-kit`, `packages/core-rust`, format `.mapp`, `.mapp-backup`, bridge, permission, audit, dan dokumentasi.

Di luar cakupan: serangan yang memerlukan kontrol perangkat fisik, browser yang sudah tidak didukung, social engineering, dan layanan pihak ketiga yang tidak dikendalikan proyek.

## Prinsip

- Zero privilege untuk micro-app.
- Signature dan digest diverifikasi sebelum instalasi.
- CSP ketat dan iframe opaque origin.
- Tidak ada `eval`, `new Function`, atau HTML mentah.
- Secret tidak boleh masuk log, fixture, atau dokumen.

## Setelah Perbaikan

Kami dapat mempublikasikan advisori tanpa detail eksploitasi yang membahayakan pengguna. Kredit diberikan bila diminta.

## Referensi

- [Threat model](docs/01-architecture/threat-model.md)
- [Security test plan](docs/08-quality/security-test-plan.md)
- [Incident response](docs/09-operations/incident-response.md)
