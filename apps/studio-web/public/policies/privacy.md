# Kebijakan Privasi / Privacy Policy

MicroApp Studio berjalan sepenuhnya di browser Anda.

- Tidak ada akun, tidak ada server aplikasi, dan tidak ada telemetry atau analytics.
- Identitas lokal, app terpasang, data app, dan preferensi disimpan di perangkat Anda (SQLite WASM + OPFS, IndexedDB, localStorage).
- Frasa pemulihan 24 kata disimpan terenkripsi dengan kunci yang tidak dapat diekspor. Frasa tidak pernah dikirim ke mana pun dan tidak pernah ditulis ke log.
- Kunci BYOK disimpan di vault lokal dan hanya dikirim ke endpoint yang Anda konfigurasi sendiri saat Anda meminta AI.
- `network.fetch` micro-app dibatasi origin di manifest dan diblokir saat Offline Cage aktif.
- Menghapus data peramban, membersihkan site data, atau menekan Reset di Pengaturan akan menghapus data lokal. Ekspor backup lebih dulu bila Anda ingin menyimpannya.

Pertanyaan: buka issue di repositori proyek.
