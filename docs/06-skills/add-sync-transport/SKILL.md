---
id: SKILL-ADD-SYNC-TRANSPORT
title: Menambah Transport Sync
status: accepted
owner: dx
prd_refs: ["§3 Modul 6"]
name: add-sync-transport
description: "Menambahkan implementasi transport sinkronisasi yang memakai envelope E2EE dan handshake yang sama tanpa mengubah urutan prioritas."
when_to_use: "Dipakai saat menambah varian BYOS, menghubungkan server sync baru, atau memperbaiki implementasi transport LAN, WebRTC, atau self-host."
required_docs: ["docs/03-specs/06-sync-backup.md", "docs/01-architecture/sync-crdt.md", "docs/01-architecture/identity-crypto.md", "docs/01-architecture/monorepo.md", "docs/04-flows/06-p2p-sync.md", "docs/07-rules/testing.md"]
---

# Menambah Transport Sync

## Kapan Digunakan

Dipakai ketika sebuah kanal sinkronisasi baru perlu diimplementasikan, misalnya varian BYOS tambahan, endpoint server self-host baru, atau perbaikan perilaku LAN dan WebRTC. Transport hanya memindahkan ciphertext; ia tidak boleh memiliki aturan resolusi konflik atau format data sendiri.

Di luar cakupan: mengubah urutan prioritas transport (kontrak di [sync-crdt.md](../../01-architecture/sync-crdt.md) dan RFC), mengubah envelope E2EE, dan mengubah algoritma CRDT di `packages/core-rust`.

## Prasyarat

- [03-specs/06-sync-backup.md](../../03-specs/06-sync-backup.md) bagian 3–6 dibaca, termasuk requirement transport dan batas batch.
- [01-architecture/sync-crdt.md](../../01-architecture/sync-crdt.md) bagian 4–7 dipahami: handshake, batching, pemilihan transport, dan envelope.
- [01-architecture/identity-crypto.md](../../01-architecture/identity-crypto.md) dibaca: subkey `sync`, nonce, AAD, dan rotasi kunci.
- Dua instance Host dan satu instance server uji tersedia untuk pengujian end-to-end.

## Input

| Input | Wajib | Contoh |
|---|---|---|
| Transport target | ya | BYOS WebDAV, S3/MinIO, Git privat, atau Syncthing |
| Slot prioritas | ya | LAN, WebRTC, self-host, atau BYOS |
| Perilaku offline | ya | Status `waiting_network` dan retry setelah koneksi kembali |
| Server pendukung | tidak | `apps/selfhost-server/internal/sync` untuk transport self-host |
| Bukti dua peer | ya | Dua `site_id` berbeda bertukar mutasi hingga konvergen |

## Prosedur

1. Baca [03-specs/06-sync-backup.md](../../03-specs/06-sync-backup.md) dan [01-architecture/sync-crdt.md](../../01-architecture/sync-crdt.md); tentukan slot transport yang dipakai dan pastikan urutan prioritas `LAN → WebRTC → self-host → BYOS` tidak berubah.
2. Definisikan kontrak implementasi transport: `connect`, `sendBatch`, `receive`, `ack`, `close`, dan deklarasi `capabilities`. Kontrak ini dipakai bersama oleh web dan native; letakkan definisi protokol di `packages/core-rust/src/sync/`.
3. Implementasikan sisi klien web di `apps/studio-web/src/sync/transports/` dan padanan native di `apps/host-flutter/lib/sync/transports/`. Implementasi server, bila ada, berada di `apps/selfhost-server/internal/sync/`.
4. Pakai ulang envelope E2EE yang ada: `version(1) | key_id(16) | nonce(12) | ciphertext | tag(16)` dengan AAD header kanonik. Transport MUST NOT memegang plaintext, kunci konten, atau melakukan dekripsi.
5. Implementasikan handshake `HELLO`, `AUTH`, `MANIFEST`, `MUTATION_BATCH`, `ACK`, `CONFLICT`, dan `BYE` dengan header versi. Nonce hanya boleh dipakai sekali; `batch_id` dan `mutation_id` harus idempotent.
6. Terapkan batas batch 500 mutation atau 8 MiB ciphertext, cursor per `(peer_id, app_id)`, dan pengiriman ulang dengan `batch_id` yang sama setelah putus koneksi. Batch dianggap terkirim hanya setelah `ACK`.
7. Implementasikan pemilihan dan fallback: LAN atau WebRTC yang gagal dalam 5 detik beralih ke self-host dan mencatat alasannya; BYOS hanya dipakai bila tidak ada peer maupun server. Backoff reconnect 1/2/5/10/30/60 detik dengan jitter 20%.
8. Tangani kegagalan autentikasi sebagai `action_required` tanpa retry otomatis, dan tolak peer yang belum dipasangkan atau perangkat yang dicabut.
9. Tulis test dua peer untuk setiap transport: sinkronisasi normal, putus koneksi di tengah batch, batch duplikat, reconnect, schema staging, dan penolakan peer tak dikenal. Tambahkan property test konvergensi bila mutasi dihasilkan bersamaan.
10. Perbarui [03-specs/06-sync-backup.md](../../03-specs/06-sync-backup.md) pada requirement dan bagian data/state, perbarui flow [06-p2p-sync.md](../../04-flows/06-p2p-sync.md), lalu tambahkan atau sesuaikan baris [prd-compliance-matrix.md](../../00-foundation/prd-compliance-matrix.md).
11. Jalankan blok verifikasi dan perbarui [implementation-status.md](../../00-foundation/implementation-status.md) untuk modul sync setelah seluruh test lulus.

## Verifikasi

```bash
cargo test -p microapp-core sync
npm test
cd apps/selfhost-server && go test ./...
npm run docs:check
```

Uji manual dua perangkat: pasangkan peer, matikan jaringan di tengah batch, hidupkan kembali, lalu pastikan tidak ada duplikasi record dan `conflict_history` hanya berisi konflik kolom yang benar-benar bersamaan.

## Kesalahan Umum

| Kesalahan | Perbaikan |
|---|---|
| Mengenkripsi atau mendekripsi di dalam transport | Transport hanya memindahkan ciphertext; enkripsi ada di lapisan envelope `packages/core-rust` |
| Mengubah urutan prioritas transport | Urutan adalah kontrak `FR-SYNC-008`; perubahan memerlukan RFC |
| Mengirim `ACK` sebelum batch diterapkan | Kirim `ACK` hanya setelah apply atau `skipped` yang valid |
| Membuat format envelope baru secara diam-diam | Pakai envelope yang sama; perubahan format = RFC dan versi baru |
| Retry otomatis setelah kegagalan autentikasi | Set status `action_required` dan minta tindakan pengguna |
| Tidak menguji kondisi offline atau putus koneksi | Tambahkan test putus koneksi, duplikat batch, dan reconnect |

## Definition of Done

- Transport memenuhi kontrak interface dan hanya memindahkan ciphertext.
- Handshake, batching, cursor, dan idempotency sesuai [sync-crdt.md](../../01-architecture/sync-crdt.md).
- Fallback 5 detik, backoff, dan status `waiting_network` berfungsi serta tercatat.
- Test dua peer, offline, duplikat batch, reconnect, dan skema staging lulus.
- Spec sync, flow terkait, dan matriks diperbarui.
- `npm run docs:check` lulus tanpa warning.
