import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import type { Stroke } from '../types'

export interface YBoard {
  doc: Y.Doc
  strokes: Y.Array<Stroke>
  settings: Y.Map<string>
  provider: WebsocketProvider
  persistence: IndexeddbPersistence
  undoManager: Y.UndoManager
  destroy: () => void
}

// WebSocket relay host — Render free tier hosted y-websocket-server
// Format: wss://coretan-relay.onrender.com (sesuaikan setelah deploy)
const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ||
  'wss://coretan-relay.onrender.com'

export function createBoard(roomId: string): YBoard {
  const doc = new Y.Doc()
  const strokes = doc.getArray<Stroke>('strokes')
  const settings = doc.getMap<string>('settings')

  // Persist lokal supaya refresh = sama
  const persistence = new IndexeddbPersistence(`coretan-${roomId}`, doc)

  // WebSocket sync via Render-hosted y-websocket-server
  const provider = new WebsocketProvider(
    WS_URL,
    `coretan-${roomId}`,
    doc,
    { connect: true },
  )

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

/** Hitung jumlah user lain yang aktif terhubung */
export function getPeerCount(board: YBoard): number {
  const awareness = board.provider.awareness
  let count = 0
  awareness.getStates().forEach((_state, clientId) => {
    if (clientId !== awareness.clientID) count++
  })
  return count
}

/** Status koneksi ke server */
export function isConnected(board: YBoard): boolean {
  return board.provider.wsconnected
}

export function generateRoomId(): string {
  const adjectives = ['kopi', 'susu', 'gula', 'krim', 'madu', 'arang']
  const nouns = ['biji', 'bubuk', 'rasa', 'tetes', 'aroma', 'aren']
  const a = adjectives[Math.floor(Math.random() * adjectives.length)]
  const n = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(100 + Math.random() * 900)
  return `${a}-${n}-${num}`
}
