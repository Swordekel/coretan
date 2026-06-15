import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'
import type { Stroke } from '../types'

export interface YBoard {
  doc: Y.Doc
  strokes: Y.Array<Stroke>
  settings: Y.Map<string>
  provider: WebrtcProvider
  persistence: IndexeddbPersistence
  undoManager: Y.UndoManager
  destroy: () => void
}

const SIGNALING_SERVERS = [
  'wss://signaling.yjs.dev',
  'wss://y-webrtc-signaling-eu.fly.dev',
  'wss://y-webrtc-signaling-us.fly.dev',
]

// STUN servers untuk NAT traversal — semua free & always-on
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
]

export function createBoard(roomId: string): YBoard {
  const doc = new Y.Doc()
  const strokes = doc.getArray<Stroke>('strokes')
  const settings = doc.getMap<string>('settings')

  // Persist locally so refresh = same content
  const persistence = new IndexeddbPersistence(`coretan-${roomId}`, doc)

  // P2P sync via WebRTC
  const provider = new WebrtcProvider(`coretan-${roomId}`, doc, {
    signaling: SIGNALING_SERVERS,
    maxConns: 20,
    filterBcConns: false, // allow BroadcastChannel (sama browser tabs)
    peerOpts: {
      config: {
        iceServers: ICE_SERVERS,
      },
    },
  })

  const undoManager = new Y.UndoManager(strokes, {
    captureTimeout: 300,
  })

  return {
    doc,
    strokes,
    settings,
    provider,
    persistence,
    undoManager,
    destroy: () => {
      undoManager.destroy()
      provider.destroy()
      persistence.destroy()
      doc.destroy()
    },
  }
}

/** Hitung jumlah peer yang aktif terhubung via WebRTC + BroadcastChannel */
export function getPeerCount(board: YBoard): number {
  const room = (board.provider as unknown as {
    room?: { webrtcConns?: Map<string, unknown>; bcConns?: Set<string> }
  }).room
  if (!room) return 0
  const rtc = room.webrtcConns?.size ?? 0
  const bc = room.bcConns?.size ?? 0
  return rtc + bc
}

export function generateRoomId(): string {
  // Format: 3-3-3 kata coffee + angka kecil → mudah disebut & dibaca
  const adjectives = ['kopi', 'susu', 'gula', 'krim', 'madu', 'arang']
  const nouns = ['biji', 'bubuk', 'rasa', 'tetes', 'aroma', 'aren']
  const a = adjectives[Math.floor(Math.random() * adjectives.length)]
  const n = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(100 + Math.random() * 900)
  return `${a}-${n}-${num}`
}
