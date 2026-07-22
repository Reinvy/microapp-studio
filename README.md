# MicroApp Studio 🚀

**AI-powered local-first platform untuk membuat mini web apps hanya dengan teks atau drag-and-drop.**

MicroApp Studio adalah platform web yang memungkinkan siapa pun — dari non-teknis hingga developer — untuk membuat, menjalankan, dan berbagi micro-apps kecil seperti kalkulator custom, pengolah CSV, form validator, dan lainnya. Semua berjalan di browser, tanpa server backend.

![Architecture](docs/architecture.html)

## ✨ Fitur Utama

### 🤖 AI Prompt → Micro App
Tulis prompt seperti *"Buat kalkulator diskon 3 input"* atau *"Form survey kepuasan 5 pertanyaan"* → langsung jadi app yang bisa dijalankan.

Cara kerja:
1. Ketik deskripsi app di dialog "New App"
2. **Prompt Parser** mengenali pola: calculator, form, survey, todo, budget, counter, validator
3. **Schema Engine** menghasilkan JSON Schema → app siap diedit atau di-run

### 🎨 Visual Drag-and-Drop Builder
- **Canvas** — Susun field dengan drag-and-drop (via @dnd-kit)
- **Component Palette** — 9 tipe field: Text, Number, Select, Checkbox, Textarea, Date, Slider, Toggle
- **Properties Panel** — Edit properti tiap field: label, placeholder, validasi, opsi
- **Toolbar** — Simpan, preview, edit nama app

### 🏃 App Runner
- Render form interaktif dari schema
- Validasi input realtime (required, pattern, min/max, dll)
- Compute output via schema engine + custom JS nodes
- Hasil komputasi ditampilkan di panel output

### 💻 Dev Playground (Custom JS Nodes)
- **Monaco Editor** — Editor kode JavaScript profesional (syntax highlighting, minimap)
- Buat custom logic nodes yang bisa digunakan ulang
- Test dengan input JSON, lihat output langsung
- Simpan node untuk digunakan di builder

### 💾 Local-First (IndexedDB)
Semua data disimpan di browser via Dexie.js. Tidak perlu server, tidak perlu login. App tetap ada meskipun offline.

## 🏗️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) + TypeScript |
| **Styling** | Tailwind CSS v4 + shadcn/ui + Lucide Icons |
| **State** | Zustand |
| **Drag & Drop** | @dnd-kit/core, @dnd-kit/sortable |
| **Code Editor** | Monaco Editor (@monaco-editor/react) |
| **Storage** | Dexie.js (IndexedDB) |
| **Engine** | Prompt-to-Schema Parser + Schema Executor + Sandboxed Evaluator |
| **Deploy** | Vercel (Edge Network) |

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout + dark theme
│   ├── page.tsx            # Dashboard Gallery
│   ├── builder/page.tsx    # Visual Builder (Canvas + Palette + Props)
│   ├── run/[id]/page.tsx   # App Runner
│   └── dev/page.tsx        # Dev Playground (Monaco Editor)
├── components/
│   ├── dashboard/          # Gallery, AppCard
│   ├── builder/            # Canvas, Toolbar, ComponentPalette, PropertiesPanel
│   ├── runner/             # AppRunner, RenderField
│   ├── dev/                # MonacoEditor
│   └── ui/                 # shadcn-style primitives (Button, Card, Dialog, etc.)
├── engine/
│   ├── promptToSchema.ts   # NLP pattern recognition → JSON Schema
│   ├── schemaEngine.ts     # Schema validation + execution
│   └── evaluator.ts        # Sandboxed JS evaluator
├── db/
│   ├── db.ts               # Dexie.js setup
│   └── microAppRepo.ts     # CRUD operations
├── store/
│   └── appStore.ts         # Zustand store
├── types/
│   └── schema.ts           # TypeScript type definitions
└── lib/
    └── utils.ts            # Helpers (cn, generateId, formatDate, debounce)
```

## 🚀 Cara Penggunaan

### 1. Buka Dashboard
Buka [microapp-studio.vercel.app](https://microapp-studio.vercel.app)

### 2. Buat App Baru
Klik **"New App"** → masukkan nama + prompt:
- *"Kalkulator diskon dengan input harga, diskon persen, dan pajak"*
- *"Form registrasi dengan nama, email, password, dan konfirmasi password"*
- *"Survey kepuasan dengan 5 pilihan rating"*

### 3. Edit di Builder
- Seret field dari palette ke canvas
- Klik field untuk edit properti
- Tambah custom JS node untuk logic kustom

### 4. Run & Share
Klik **Run** untuk menjalankan app. Copy URL untuk berbagi.

## 🧪 Pengembangan Lokal

```bash
# Clone
git clone https://github.com/Reinvy/microapp-studio.git
cd microapp-studio

# Install dependencies
npm install

# Dev server
npm run dev

# Build
npm run build
```

## 🌐 Deployment

Deployed to Vercel. Auto-deploy on push to `main` branch via GitHub integration.

**Live URL:** [https://microapp-studio.vercel.app](https://microapp-studio.vercel.app)

## 📄 Lisensi

MIT — built with ❤️ by [Reinvy](https://github.com/Reinvy)
