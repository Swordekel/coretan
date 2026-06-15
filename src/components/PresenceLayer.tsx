import { useEffect, useState } from 'react'
import type { YBoard } from '../lib/yjs'
import { useUserStore } from '../store/useUserStore'

export interface RemoteUser {
  clientId: number
  id: string
  name: string
  color: string
  cursor?: { x: number; y: number }
}

export function usePresence(board: YBoard | null): {
  remotes: RemoteUser[]
  updateCursor: (x: number | null, y: number | null) => void
} {
  const [remotes, setRemotes] = useState<RemoteUser[]>([])
  const me = useUserStore()

  useEffect(() => {
    if (!board) return
    const awareness = board.provider.awareness
    awareness.setLocalStateField('user', {
      id: me.id,
      name: me.name,
      color: me.color,
    })

    function update() {
      const list: RemoteUser[] = []
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return
        const u = state.user as { id: string; name: string; color: string } | undefined
        const cursor = state.cursor as { x: number; y: number } | undefined
        if (u) list.push({ ...u, cursor, clientId })
      })
      setRemotes(list)
    }

    update()
    awareness.on('change', update)
    return () => {
      awareness.off('change', update)
    }
  }, [board, me.id, me.name, me.color])

  function updateCursor(x: number | null, y: number | null) {
    if (!board) return
    if (x === null || y === null) {
      board.provider.awareness.setLocalStateField('cursor', null)
    } else {
      board.provider.awareness.setLocalStateField('cursor', { x, y })
    }
  }

  return { remotes, updateCursor }
}
