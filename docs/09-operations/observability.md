---
id: OPS-OBS
title: Observability
status: accepted
owner: ops
prd_refs: ["§3 Modul 7", "§3 Modul 8"]
---

# Observability

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menetapkan log, metrik, trace, audit, retensi, redaksi, dan alert untuk Host, Studio, server self-host, serta DevTools. Prinsip utamanya: **tidak ada telemetry keluar secara default**. Data observability dimiliki operator dan tinggal di infrastruktur operator.

Kontrak yang mengikat: audit server di [03-specs/07-selfhost.md](../03-specs/07-selfhost.md), DevTools di [03-specs/08-devtools-cli-sdk.md](../03-specs/08-devtools-cli-sdk.md), dan target reliabilitas di [03-specs/nfr.md](../03-specs/nfr.md). Prosedur insiden ada di [incident-response.md](incident-response.md).

## 2. Prinsip

| Prinsip | Aturan |
|---|---|
| Default privat | Tidak ada pengiriman log, metrik, atau trace ke pihak ketiga tanpa opt-in eksplisit |
| Data minimization | Field yang tidak dibutuhkan untuk operasi tidak dicatat |
| No plaintext secrets | Token, kunci, passphrase, recovery phrase, dan payload E2EE tidak pernah masuk log |
| Audit terpisah | Audit keamanan bukan log aplikasi; audit append-only dan berantai hash |
| Operator memiliki data | Ekspor, retensi, dan penghapusan ditentukan operator |
| Tanpa korelasi identitas berlebih | Actor dicatat sebagai hash, bukan email atau nama |

## 3. Tiga Sinyal

| Sinyal | Sumber | Format | Tujuan default | Retensi default |
|---|---|---|---|---|
| Log aplikasi | Server, sync hub, workflow, plugin | JSON satu baris | File lokal + rotasi | 14 hari |
| Metrik | Server dan proses | Prometheus text/OTLP | Scrape lokal | 15 hari raw, 13 bulan downsampled |
| Trace | Request HTTP, sync batch, workflow, bridge | OTLP | Collector lokal | 7 hari |
| Audit | Aksi sensitif server | Event berantai hash | Database audit + SIEM opsional | 365 hari, dapat dikonfigurasi |

## 4. Log Aplikasi

### 4.1 Skema

```json
{
  "ts_ms": 1763625600000,
  "level": "warn",
  "component": "sync",
  "event": "batch_rejected",
  "request_id": "01JC0M6S8Y4Q2W9K3T7V5B1N0R",
  "actor": "sha256:6f1c...",
  "result": "retry",
  "error_code": "E-SYNC-002",
  "duration_ms": 42
}
```

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `ts_ms` | integer | Ya | Unix epoch milidetik UTC |
| `level` | string | Ya | `debug`, `info`, `warn`, `error`, `critical` |
| `component` | string | Ya | `http`, `sync`, `auth`, `registry`, `workflow`, `storage`, `plugin`, `audit` |
| `event` | string | Ya | Nama stabil snake_case, bukan kalimat bebas |
| `request_id` | string | Tidak | ID korelasi per request |
| `actor` | string | Tidak | Hash aktor; bukan email, nama, atau ID mentah |
| `result` | string | Tidak | `ok`, `denied`, `retry`, `failed` |
| `error_code` | string | Tidak | Kode dari [03-specs/error-codes.md](../03-specs/error-codes.md) bila ada |
| `duration_ms` | integer | Tidak | Durasi operasi |
| `target` | string | Tidak | Resource yang disentuh, tanpa isi data |

Aturan:

- Log **MUST** satu baris JSON valid tanpa ANSI dan tanpa newline di dalam string.
- `event` **MUST** stabil dan terdokumentasi; perubahan nama event dianggap perubahan kontrak observability.
- Log **MUST NOT** memuat isi payload E2EE, token, cookie, header `Authorization`, kredensial, atau query string yang memuat rahasia.
- Log level `debug` **MUST** dimatikan secara default pada produksi.

### 4.2 Redaksi

| Kategori | Perlakuan |
|---|---|
| Access/refresh token, session ID | Hapus total; ganti `[redacted]` bila perlu penanda |
| Password, passphrase, recovery phrase | Hapus total; tidak boleh ada hash pendek yang dapat di-brute-force |
| Private key, seed, subkey | Hapus total; pelanggaran adalah insiden SEV-1 |
| Header `Authorization`, `Cookie`, `Set-Cookie` | Hapus total |
| Payload micro-app dan isi database | Tidak dicatat; hanya ukuran dan jumlah |
| Email, nama, nomor telepon | Hash dengan salt per instance atau hilangkan |
| Alamat IP klien | Truncate /24 (IPv4) atau /48 (IPv6) kecuali kebutuhan keamanan |
| URL | Simpan path; hapus query dan fragment |

Redaksi **MUST** diterapkan di logger, bukan hanya di pipeline, sehingga log mentah di disk sudah aman. Uji redaksi wajib memakai fixture yang berisi setiap kategori di atas.

## 5. Metrik

| Metrik | Tipe | Label | Kegunaan |
|---|---|---|---|
| `microapp_http_requests_total` | counter | `method`, `route`, `status` | Laju dan error rate |
| `microapp_http_request_duration_seconds` | histogram | `route` | Latensi p95/p99 |
| `microapp_sync_batches_total` | counter | `transport`, `result` | Throughput dan kegagalan sync |
| `microapp_sync_batch_bytes` | histogram | `transport` | Ukuran batch terhadap batas 8 MiB |
| `microapp_sync_cursor_lag_seconds` | gauge | `peer_transport` | Keterlambatan sinkronisasi |
| `microapp_workflow_runs_total` | counter | `status`, `trigger` | Keberhasilan workflow |
| `microapp_workflow_queue_depth` | gauge | `runner` | Backlog outbox |
| `microapp_db_query_duration_seconds` | histogram | `operation` | Query lambat |
| `microapp_storage_operations_total` | counter | `operation`, `result` | Kesehatan object storage |
| `microapp_audit_chain_valid` | gauge | — | 1 valid, 0 tidak valid |
| `microapp_process_resident_memory_bytes` | gauge | `profile` | Anggaran 512 MB Lite |
| `microapp_registry_fetch_total` | counter | `source`, `result` | Kesehatan registry |

Aturan:

- Label **MUST NOT** memuat ID pengguna, email, nama app, atau nilai tak terbatas; kardinalitas per metrik **MUST** dijaga di bawah 10.000 seri.
- Metrik **MUST** tersedia tanpa layanan eksternal pada Lite.
- Metrik performa Host dan micro-app (RAM, FPS, query lambat, bridge) berasal dari DevTools lokal dan **MUST NOT** dikirim keluar (`FR-DEV-001`, `FR-DEV-002`, `FR-DEV-003`, `FR-DEV-005`).
- Query lambat dicatat bila melebihi 50 ms, dengan nama tabel dan rencana query yang sudah disanitasi.

## 6. Trace

- Trace **MUST** memakai OTLP HTTP ke collector lokal pada port **4318**; tidak ada exporter ke endpoint publik.
- Sampling default 10% untuk request HTTP dan 100% untuk workflow gagal.
- Span **MUST NOT** memuat payload, header rahasia, atau SQL lengkap dengan nilai.
- `trace_id` **MAY** dikorelasikan dengan `request_id` pada log; korelasi tidak boleh menambah identitas pengguna.
- Pada Lite, trace **MAY** dimatikan untuk menghemat memori; log dan metrik tetap wajib.

## 7. Audit versus Observability

| Aspek | Audit | Log aplikasi |
|---|---|---|
| Tujuan | Bukti keamanan dan kepatuhan | Diagnosis operasional |
| Integritas | Rantai `prev_hash`/`entry_hash` | Tidak dijamin |
| Mutability | Append-only; tanpa edit/hapus | Rotasi dan hapus sesuai retensi |
| Isi | Aksi sensitif, aktor, target, hasil | Event teknis dan error |
| Ekspor | Loki, Elasticsearch, Wazuh, Syslog | Pipeline log operator |

Audit **MUST** mencatat login, perubahan role, perubahan konfigurasi, akses registry, publish, workflow manual, pencabutan device, perubahan kunci, dan penolakan SSRF (`FR-SRV-018`, `FR-SRV-030`). Verifikasi rantai **MUST** berjalan saat startup dan sebelum ekspor; kegagalan memicu `E-SRV-005` dan SEV-1.

Audit **MUST NOT** memuat rahasia atau payload pengguna. Ekspor audit **MUST** memakai format terstruktur yang diterima keempat tujuan SIEM (`FR-SRV-019`).

## 8. Analytics Self-Host Opsional

- Analytics **MUST** opt-in, mati secara default, dan disimpan di instance sendiri (`FR-DEV-007`).
- Saat aktif, hanya agregat yang dicatat: jumlah pengguna aktif, jumlah sync per transport, error rate per komponen. Tidak ada event per pengguna.
- Tidak ada SDK analytics pihak ketiga, cookie pelacak, atau identitas lintas situs.
- Mematikan analytics **MUST NOT** mengubah fitur apa pun.
- Data analytics **MUST** dapat dihapus operator kapan saja tanpa memengaruhi audit.

## 9. Dashboard

| Dashboard | Panel wajib | Pengguna |
|---|---|---|
| Overview | Request rate, error rate, latency p95, RSS, disk, audit valid | Semua operator |
| Sync | Batch per transport, cursor lag, konflik, error terakhir | Operator sync |
| Workflow | Queue depth, run sukses/gagal, retry, durasi | Operator workflow |
| Registry | Fetch sukses/gagal, signature invalid, cache hit | Admin registry |
| Security | Login gagal, penolakan RBAC/ABAC, SSRF blocked, rotasi kunci | Security/owner |
| Storage | Kapasitas, objek gagal, backup terakhir, sertifikat | Operator |

Dashboard **MUST** dapat diimpor dari berkas JSON di repositori dan **MUST NOT** bergantung pada layanan SaaS.

## 10. Alert

| Alert | Kondisi | Severity | Tindakan |
|---|---|---|---|
| Audit chain invalid | `microapp_audit_chain_valid == 0` | SEV-1 | Hentikan aksi sensitif, ekspor bukti, buka insiden |
| Nonce reuse terdeteksi | Log `E-CRYPTO-003` | SEV-1 | Hentikan enkripsi, buka insiden |
| Sandbox escape dilaporkan | Log `E-SBX-*` kritikal berulang | SEV-1 | Nonaktifkan versi app, buka insiden |
| Database migration gagal | Log `E-SRV-001` | SEV-2 | Rollback, jangan melayani |
| Object storage gagal | `microapp_storage_operations_total{result="fail"}` naik | SEV-2 | Status degraded, perbaiki storage |
| Queue backlog | `microapp_workflow_queue_depth` melebihi 1.000 selama 15 menit | SEV-2 | Periksa runner/NATS, jangan hapus job |
| Sertifikat kedaluwarsa < 14 hari | Pemeriksaan harian | SEV-2 | Rotasi sertifikat |
| RSS Lite > 512 MB | 5 menit berturut-turut | SEV-2 | Catat regresi `FR-SRV-026`; kurangi concurrency |
| Login gagal berlebih | > 50 kegagalan per 5 menit per IP ter-truncate | SEV-3 | Rate limit, audit |
| Disk > 80% | Pemeriksaan per menit | SEV-3 | Bersihkan cache yang dapat diunduh ulang; jangan hapus data pengguna |
| Registry signature invalid | Log `E-REG-001` | SEV-2 | Blokir sumber, verifikasi kunci |
| Sync error rate > 5% | 10 menit | SEV-3 | Periksa transport dan konektivitas |

Severity mengikuti definisi di [incident-response.md](incident-response.md). Alert **MUST** memiliki tautan runbook dan **MUST NOT** memuat data pengguna.

## 11. Retensi

| Data | Default | Dapat dikonfigurasi | Catatan |
|---|---|---|---|
| Log aplikasi | 14 hari | Ya | Rotasi harian, kompresi setelah 2 hari |
| Log akses HTTP | 30 hari | Ya | Tanpa query string dan token |
| Metrik raw | 15 hari | Ya | Downsample setelah 15 hari |
| Metrik downsampled | 13 bulan | Ya | Untuk tren kapasitas |
| Trace | 7 hari | Ya | Sampling 10% |
| Audit | 365 hari | Ya | Penghapusan hanya oleh `owner` dengan event audit baru |
| Analytics opt-in | 90 hari | Ya | Agregat saja |
| Backup log | Mengikuti retensi backup | Ya | Lihat [backup-restore.md](backup-restore.md) |

Retensi **MUST** dihapus berdasarkan waktu, bukan berdasarkan ukuran yang memaksa penghapusan data audit lebih awal.

## 12. Ekspor dan Forwarding

- Log **MAY** dikirim ke Loki, Elasticsearch, atau Wazuh melalui pipeline lokal.
- Audit **MUST** mendukung ekspor real-time ke Loki, Elasticsearch, Wazuh, dan Syslog.
- Ekspor **MUST** memakai koneksi TLS ke endpoint yang dikonfigurasi operator.
- Ekspor **MUST NOT** menjadi default; endpoint kosong berarti tidak ada pengiriman.
- Kegagalan ekspor **MUST** di-buffer lokal dan di-retry; audit tidak boleh hilang karena SIEM tidak tersedia.

## 13. Verifikasi

| Bukti | Prosedur |
|---|---|
| Tanpa telemetry | Jalankan Host dan server dengan jaringan keluar diblokir; tidak ada request keluar |
| Redaksi | Kirim fixture berisi token, cookie, email, dan payload; periksa log mentah |
| Audit terpisah | Hapus satu entri audit pada salinan; verifikasi rantai gagal dan alert menyala |
| Kardinalitas | Jalankan 1.000 request dengan label berbeda; jumlah seri tetap terkendali |
| Retensi | Majukan waktu uji; log dan trace terhapus sesuai batas, audit tetap utuh |
| Ekspor SIEM | Kirim audit ke empat tujuan uji; tidak ada rahasia di payload |
| Dashboard | Impor JSON dashboard pada instance bersih; seluruh panel menampilkan data |
| Analytics opt-in | Aktifkan dan matikan; fitur lain tidak berubah; data agregat dapat dihapus |

## 14. Referensi

- [03-specs/07-selfhost.md](../03-specs/07-selfhost.md), [03-specs/08-devtools-cli-sdk.md](../03-specs/08-devtools-cli-sdk.md)
- [03-specs/error-codes.md](../03-specs/error-codes.md), [03-specs/nfr.md](../03-specs/nfr.md)
- [01-architecture/selfhost.md](../01-architecture/selfhost.md), [01-architecture/threat-model.md](../01-architecture/threat-model.md)
- [selfhost-runbook.md](selfhost-runbook.md), [incident-response.md](incident-response.md), [backup-restore.md](backup-restore.md)
