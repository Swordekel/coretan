import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { v4 as uuid } from 'uuid'
import type { Point, Stroke } from '../types'
import { splitStrokeByEraser, strokeToPath } from '../lib/strokes'
import type { YBoard } from '../lib/yjs'
import { useUiStore } from '../store/useUiStore'
import { useUserStore } from '../store/useUserStore'
import { useThemeStore } from '../store/useThemeStore'
import type { RemoteUser } from './PresenceLayer'

interface Viewport {
  x: number
  y: number
  zoom: number
}

interface CanvasProps {
  board: YBoard
  remotes: RemoteUser[]
  onCursor?: (worldX: number | null, worldY: number | null) => void
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

export function Canvas({ board, remotes, onCursor }: CanvasProps) {
  const tool = useUiStore((s) => s.tool)
  const color = useUiStore((s) => s.color)
  const penSize = useUiStore((s) => s.penSize)
  const eraserSize = useUiStore((s) => s.eraserSize)
  const isDark = useThemeStore((s) => s.isDark)
  const userId = useUserStore((s) => s.id)

  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [drawing, setDrawing] = useState<Stroke | null>(null)
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const [eraserCursor, setEraserCursor] = useState<{ x: number; y: number } | null>(null)
  const [bgColor, setBgColor] = useState<string | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const drawingRef = useRef<Stroke | null>(null)
  const isPanningRef = useRef(false)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)

  // Subscribe to Yjs strokes
  useEffect(() => {
    const updateFromY = () => setStrokes(board.strokes.toArray())
    updateFromY()
    board.strokes.observe(updateFromY)
    return () => {
      board.strokes.unobserve(updateFromY)
    }
  }, [board])

  // Subscribe to board background color from settings
  useEffect(() => {
    const updateBg = () => {
      const bg = board.settings.get('bgColor')
      setBgColor(bg ?? null)
    }
    updateBg()
    board.settings.observe(updateBg)
    return () => {
      board.settings.unobserve(updateBg)
    }
  }, [board])

  const screenToWorld = useCallback(
    (clientX: number, clientY: number): Point => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const rect = svg.getBoundingClientRect()
      return {
        x: (clientX - rect.left) / viewport.zoom + viewport.x,
        y: (clientY - rect.top) / viewport.zoom + viewport.y,
      }
    },
    [viewport],
  )

  const eraseAt = useCallback(
    (x: number, y: number) => {
      // Eraser size dalam unit world (independent of zoom)
      const radius = eraserSize / 2 / viewport.zoom
      board.doc.transact(() => {
        // Iterate in reverse — split bisa ubah index
        for (let i = board.strokes.length - 1; i >= 0; i--) {
          const s = board.strokes.get(i)
          const replacement = splitStrokeByEraser(s, x, y, radius, () => uuid())
          if (replacement.length === 1 && replacement[0] === s) {
            // Tidak ada perubahan — skip
            continue
          }
          board.strokes.delete(i, 1)
          if (replacement.length > 0) {
            board.strokes.insert(i, replacement)
          }
        }
      })
    },
    [board, viewport.zoom, eraserSize],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const world = screenToWorld(e.clientX, e.clientY)
      const pressure = e.pressure > 0 ? e.pressure : 0.5

      onCursor?.(world.x, world.y)

      if (tool === 'eraser') {
        setEraserCursor({ x: world.x, y: world.y })
      }

      if (isPanningRef.current && lastPointerRef.current) {
        const dx = (e.clientX - lastPointerRef.current.x) / viewport.zoom
        const dy = (e.clientY - lastPointerRef.current.y) / viewport.zoom
        setViewport((v) => ({ ...v, x: v.x - dx, y: v.y - dy }))
        lastPointerRef.current = { x: e.clientX, y: e.clientY }
        return
      }

      if (drawingRef.current && tool === 'pen') {
        const newStroke: Stroke = {
          ...drawingRef.current,
          points: [...drawingRef.current.points, { ...world, p: pressure }],
        }
        drawingRef.current = newStroke
        setDrawing(newStroke)
        return
      }

      if (tool === 'eraser' && (e.buttons & 1) === 1) {
        eraseAt(world.x, world.y)
      }
    },
    [screenToWorld, tool, viewport.zoom, onCursor, eraseAt],
  )

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current
      if (!svg) return
      svg.setPointerCapture(e.pointerId)

      const isPan = tool === 'pan' || e.button === 1 || e.button === 2
      if (isPan) {
        isPanningRef.current = true
        lastPointerRef.current = { x: e.clientX, y: e.clientY }
        return
      }

      const world = screenToWorld(e.clientX, e.clientY)
      const pressure = e.pressure > 0 ? e.pressure : 0.5

      if (tool === 'pen') {
        const newStroke: Stroke = {
          id: uuid(),
          color,
          size: penSize,
          points: [{ ...world, p: pressure }],
          createdBy: userId,
          createdAt: Date.now(),
        }
        drawingRef.current = newStroke
        setDrawing(newStroke)
      } else if (tool === 'eraser') {
        eraseAt(world.x, world.y)
      }
    },
    [tool, color, penSize, userId, screenToWorld, eraseAt],
  )

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current
      if (svg) svg.releasePointerCapture(e.pointerId)

      if (isPanningRef.current) {
        isPanningRef.current = false
        lastPointerRef.current = null
        return
      }

      if (drawingRef.current && drawingRef.current.points.length > 0) {
        const finished = drawingRef.current
        board.doc.transact(() => {
          board.strokes.push([finished])
        })
        drawingRef.current = null
        setDrawing(null)
      }
    },
    [board],
  )

  const handlePointerLeave = useCallback(() => {
    onCursor?.(null, null)
    setEraserCursor(null)
  }, [onCursor])

  // Wheel zoom & pan
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const rect = svg!.getBoundingClientRect()
        const pivotX = (e.clientX - rect.left) / viewport.zoom + viewport.x
        const pivotY = (e.clientY - rect.top) / viewport.zoom + viewport.y
        const factor = e.deltaY > 0 ? 0.92 : 1.08
        setViewport((v) => {
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom * factor))
          return {
            x: pivotX - (e.clientX - rect.left) / newZoom,
            y: pivotY - (e.clientY - rect.top) / newZoom,
            zoom: newZoom,
          }
        })
      } else {
        setViewport((v) => ({
          ...v,
          x: v.x + e.deltaX / v.zoom,
          y: v.y + e.deltaY / v.zoom,
        }))
      }
    }

    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [viewport.x, viewport.y, viewport.zoom])

  const themeBg = isDark ? '#1F1610' : '#FAF3E7'
  const bg = bgColor || themeBg

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 paper-texture overflow-hidden"
      style={{ background: bg }}
    >
      <svg
        ref={svgRef}
        className="w-full h-full select-none block"
        style={{
          touchAction: 'none',
          cursor:
            tool === 'pan'
              ? isPanningRef.current
                ? 'grabbing'
                : 'grab'
              : tool === 'eraser'
                ? 'none'
                : 'crosshair',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onContextMenu={(e) => e.preventDefault()}
      >
        <g
          transform={`scale(${viewport.zoom}) translate(${-viewport.x} ${-viewport.y})`}
        >
          {strokes.map((s) => {
            const d = strokeToPath(s)
            if (!d) return null
            return <path key={s.id} d={d} fill={s.color} />
          })}

          {drawing && drawing.points.length > 0 && (
            <path d={strokeToPath(drawing)} fill={drawing.color} />
          )}

          {tool === 'eraser' && eraserCursor && (
            <circle
              cx={eraserCursor.x}
              cy={eraserCursor.y}
              r={eraserSize / 2 / viewport.zoom}
              fill="none"
              stroke={isDark ? '#F5EBE0' : '#2B1810'}
              strokeWidth={1.5 / viewport.zoom}
              strokeDasharray={`${4 / viewport.zoom} ${3 / viewport.zoom}`}
            />
          )}
        </g>
      </svg>

      {/* Presence cursors overlay — HTML positioned in screen space */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {remotes.map((u) => {
          if (!u.cursor) return null
          const screenX = (u.cursor.x - viewport.x) * viewport.zoom
          const screenY = (u.cursor.y - viewport.y) * viewport.zoom
          return (
            <div
              key={u.clientId}
              className="absolute will-change-transform"
              style={{
                transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
                transition: 'transform 75ms linear',
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
              >
                <path
                  d="M3 3 L 3 17 L 7 13 L 11 19 L 13 18 L 9 12 L 15 12 Z"
                  fill={u.color}
                  stroke={isDark ? '#1A1410' : '#FFFFFF'}
                  strokeWidth="1"
                />
              </svg>
              <div
                className="absolute top-5 left-5 px-2 py-0.5 rounded-md text-[10px] font-semibold text-white whitespace-nowrap"
                style={{
                  background: u.color,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
              >
                {u.name}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Canvas
