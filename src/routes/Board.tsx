import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { createBoard } from '../lib/yjs'
import type { YBoard } from '../lib/yjs'
import { upsertBoard } from '../lib/db'
import { useUserStore } from '../store/useUserStore'
import { Canvas } from '../components/Canvas'
import { Toolbar } from '../components/Toolbar'
import { BoardHeader } from '../components/BoardHeader'
import { usePresence } from '../components/PresenceLayer'

export default function BoardRoute() {
  const { roomId } = useParams<{ roomId: string }>()
  const me = useUserStore()
  const [board, setBoard] = useState<YBoard | null>(null)
  const [title, setTitle] = useState('Papan Baru')

  const room = useMemo(() => roomId ?? 'default', [roomId])

  useEffect(() => {
    const b = createBoard(room)
    setBoard(b)
    upsertBoard(room, 'Papan Baru')

    const observe = () => {
      const t = b.settings.get('title')
      if (t) setTitle(t)
    }
    observe()
    b.settings.observe(observe)

    return () => {
      b.settings.unobserve(observe)
      b.destroy()
    }
  }, [room])

  useEffect(() => {
    if (!board) return
    if (title && title !== board.settings.get('title')) {
      board.settings.set('title', title)
      upsertBoard(room, title)
    }
  }, [title, board, room])

  // Keyboard shortcuts: ctrl+z/y for undo/redo
  useEffect(() => {
    if (!board) return
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        board!.undoManager.undo()
      } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault()
        board!.undoManager.redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [board])

  const { remotes, updateCursor } = usePresence(board)

  if (!board) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Menyiapkan papan...</p>
      </div>
    )
  }

  return (
    <div className="absolute inset-0">
      <Canvas
        board={board}
        remotes={remotes}
        onCursor={updateCursor}
      />

      <BoardHeader
        roomId={room}
        title={title}
        setTitle={setTitle}
        board={board}
        remotes={remotes}
      />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <Toolbar board={board} />
      </div>

      <div className="absolute bottom-3 right-3 z-10 text-[10px] text-muted-foreground opacity-60 pointer-events-none">
        kamu: <span className="font-semibold" style={{ color: me.color }}>{me.name}</span>
      </div>
    </div>
  )
}
