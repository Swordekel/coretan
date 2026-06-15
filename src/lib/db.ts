import Dexie, { type Table } from 'dexie'
import type { BoardMeta } from '../types'

class CoretanDB extends Dexie {
  boards!: Table<BoardMeta, number>

  constructor() {
    super('coretan')
    this.version(1).stores({
      boards: '++id, roomId, lastOpenedAt',
    })
  }
}

export const db = new CoretanDB()

export async function upsertBoard(
  roomId: string,
  title: string,
): Promise<void> {
  const existing = await db.boards.where({ roomId }).first()
  const now = new Date()
  if (existing) {
    await db.boards.update(existing.id!, { lastOpenedAt: now, title })
  } else {
    await db.boards.add({
      roomId,
      title,
      createdAt: now,
      lastOpenedAt: now,
    })
  }
}

export async function listBoards(): Promise<BoardMeta[]> {
  return await db.boards.orderBy('lastOpenedAt').reverse().toArray()
}

export async function deleteBoard(roomId: string): Promise<void> {
  await db.boards.where({ roomId }).delete()
}
