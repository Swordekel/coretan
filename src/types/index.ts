export type Tool = 'pen' | 'eraser' | 'pan'

export interface Point {
  x: number
  y: number
  p?: number // pressure 0..1
}

export interface Stroke {
  id: string
  color: string
  size: number
  points: Point[]
  createdBy: string
  createdAt: number
}

export interface UserPresence {
  id: string
  name: string
  color: string
  cursor?: { x: number; y: number }
  tool: Tool
}

export interface BoardMeta {
  id?: number
  roomId: string
  title: string
  createdAt: Date
  lastOpenedAt: Date
}
