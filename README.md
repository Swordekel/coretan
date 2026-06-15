# 🖌️ Coretan

**Whiteboard kolaboratif real-time. Tanpa server. Tanpa login.**

Bikin papan, share link, langsung gambar bareng teman. Sinkronisasi langsung peer-to-peer via WebRTC. Tidak ada backend yang perlu di-host — bahkan kalau 1000 orang pakai sekaligus, biayanya tetap nol.

## ✨ Fitur

- **🎨 Pen tool** dengan smooth strokes via `perfect-freehand`
- **🧹 Eraser** dengan radius indicator
- **🖐 Pan & zoom** infinite canvas (wheel/trackpad/pinch)
- **🌈 8 warna coffee-palette** + 3 stroke sizes
- **👥 Multi-user real-time** via Yjs + y-webrtc (P2P)
- **🖱 Live cursor presence** dengan nama tiap user
- **↩️ Undo/Redo** per-user via `Y.UndoManager`
- **💾 Auto-save lokal** dengan IndexedDB (`y-indexeddb`)
- **🔗 Share via URL** room code yang mudah diingat (`kopi-biji-471`)
- **📥 Export PNG** dengan transparent/colored background
- **🌗 Dark mode** dengan tema coffee bean (cream + chocolate)
- **📱 PWA** — installable, offline-capable

## 🔒 Privasi

- Data gambar **tidak pernah lewat server** — sync langsung peer-to-peer via WebRTC
- Hanya **signaling** (untuk koneksi awal) yang lewat server publik (`signaling.yjs.dev`)
- Riwayat papan disimpan di IndexedDB device kamu

## 🛠 Stack

| Layer | Tech |
|---|---|
| Framework | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| State | Zustand |
| Routing | React Router |
| CRDT | Yjs |
| Transport | y-webrtc (P2P) |
| Persistence | y-indexeddb |
| Drawing | perfect-freehand |
| DB lokal | Dexie.js (riwayat papan) |
| PWA | vite-plugin-pwa |

## 🚀 Setup Lokal

```bash
npm install
npm run dev
```

Buka [http://localhost:5173](http://localhost:5173).

## 📦 Build Production

```bash
npm run build
npm run preview
```

Output di `dist/` — bisa langsung di-deploy ke Cloudflare Pages, Vercel, Netlify, atau GitHub Pages.

## 🏗 Arsitektur

```
src/
├── lib/
│   ├── yjs.ts          # Y.Doc setup + WebrtcProvider + UndoManager
│   ├── strokes.ts      # perfect-freehand wrapper + SVG path gen
│   ├── colors.ts       # palette + nama random generator
│   ├── db.ts           # Dexie untuk riwayat papan
│   └── export.ts       # SVG → PNG export via Canvas
├── store/
│   ├── useThemeStore.ts
│   ├── useUiStore.ts   # tool, color, size
│   └── useUserStore.ts # id, name, color (untuk presence)
├── components/
│   ├── Canvas.tsx          # SVG canvas + drawing + presence overlay
│   ├── Toolbar.tsx         # tools, colors, sizes, undo/redo
│   ├── BoardHeader.tsx     # title, share, export, theme toggle
│   └── PresenceLayer.tsx   # usePresence hook (awareness)
└── routes/
    ├── Home.tsx        # landing + recent boards
    └── Board.tsx       # canvas + toolbar + header
```

## 🌐 Cara Kerja Sync P2P

1. User A buat papan baru → dapat room code (`kopi-biji-471`)
2. User A copy link → kirim ke teman via WhatsApp
3. User B buka link → browser-nya buat WebRTC connection ke User A via signaling server
4. Setelah connect, semua perubahan (stroke baru, erase, cursor) di-sync **langsung antar browser** — tidak ada data yang lewat server
5. Yjs CRDT memastikan tidak ada konflik bahkan kalau dua user gambar bersamaan

## 📝 Limitasi

- **Signaling server**: pakai public `signaling.yjs.dev` — kalau down, koneksi pertama tidak terbentuk (tapi yang sudah connect tetap jalan)
- **WebRTC behind NAT**: kadang butuh TURN server untuk koneksi lewat firewall ketat — saat ini hanya pakai STUN bawaan
- **Bukan untuk arsip**: data hilang kalau semua peer offline & IndexedDB di-clear

## 🗺 Roadmap

- [ ] Shapes (rect, ellipse, line, arrow)
- [ ] Text annotation
- [ ] Selection & move strokes
- [ ] Sticky notes
- [ ] Image upload
- [ ] Custom signaling server (Cloudflare Durable Objects)
- [ ] Cursor presence animation smoothing

## 📄 Lisensi

MIT
