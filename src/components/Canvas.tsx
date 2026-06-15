import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'
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

const MIN_ZOOM = 0.05
const MAX_ZOOM = 8

interface PointerInfo {
  x: number
  y: number
}

interface GestureState {
  initialDistance: number
  initialZoom: number
  initialCenterWorld: { x: number; y: number }
}

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
  const pointersRef = useRef<Map<number, PointerInfo>>(new Map())
  const gestureRef = useRef<GestureState | null>(null)
  const autoFittedRef = useRef(false)
  const viewportRef = useRef(viewport)

  // Keep viewport ref in sync (avoid stale closures)
  useEffect(() => {
    viewportRef.current = viewport
  }, [viewport])

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

  // Auto-fit ke konten saat first load (kalau ada existing strokes saat join)
  useEffect(() => {
    if (autoFittedRef.current) return
    if (strokes.length === 0) return
    // Only auto-fit kalau viewport masih default (user belum interact)
    const v = viewportRef.current
    if (v.x !== 0 || v.y !== 0 || v.zoom !== 1) return
    autoFittedRef.current = true
    setTimeout(() => fitToContent(strokes), 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes.length])

  const fitToContent = useCallback((items: Stroke[]) => {
    if (items.length === 0) {
      setViewport({ x: 0, y: 0, zoom: 1 })
      return
    }
    const wrapper = wrapperRef.current
    if (!wrapper) return
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const s of items) {
      const r = s.size / 2
      for (const p of s.points) {
        if (p.x - r < minX) minX = p.x - r
        if (p.y - r < minY) minY = p.y - r
        if (p.x + r > maxX) maxX = p.x + r
        if (p.y + r > maxY) maxY = p.y + r
      }
    }
    if (!isFinite(minX)) return
    const rect = wrapper.getBoundingClientRect()
    const padding = 48
    const w = Math.max(1, maxX - minX)
    const h = Math.max(1, maxY - minY)
    const zoomX = (rect.width - padding * 2) / w
    const zoomY = (rect.height - padding * 2) / h
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(zoomX, zoomY, 1.5)))
    const cw = (rect.width - w * newZoom) / 2
    const ch = (rect.height - h * newZoom) / 2
    setViewport({
      x: minX - cw / newZoom,
      y: minY - ch / newZoom,
      zoom: newZoom,
    })
  }, [])

  const screenToWorld = useCallback(
    (clientX: number, clientY: number): Point => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const rect = svg.getBoundingClientRect()
      const v = viewportRef.current
      return {
        x: (clientX - rect.left) / v.zoom + v.x,
        y: (clientY - rect.top) / v.zoom + v.y,
      }
    },
    [],
  )

  const eraseAt = useCallback(
    (x: number, y: number) => {
      const radius = eraserSize / 2 / viewport.zoom
      board.doc.transact(() => {
        for (let i = board.strokes.length - 1; i >= 0; i--) {
          const s = board.strokes.get(i)
          const replacement = splitStrokeByEraser(s, x, y, radius, () => uuid())
          if (replacement.length === 1 && replacement[0] === s) continue
          board.strokes.delete(i, 1)
          if (replacement.length > 0) {
            board.strokes.insert(i, replacement)
          }
        }
      })
    },
    [board, viewport.zoom, eraserSize],
  )

  // ─── Gesture (pinch zoom + two-finger pan) ──────────────────────────────────

  function startGesture() {
    const pts = Array.from(pointersRef.current.values())
    if (pts.length < 2) return
    const [a, b] = pts
    const dx = a.x - b.x
    const dy = a.y - b.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const cx = (a.x + b.x) / 2
    const cy = (a.y + b.y) / 2
    gestureRef.current = {
      initialDistance: distance,
      initialZoom: viewportRef.current.zoom,
      initialCenterWorld: screenToWorld(cx, cy),
    }
    // Cancel in-progress draw / pan
    if (drawingRef.current) {
      drawingRef.current = null
      setDrawing(null)
    }
    isPanningRef.current = false
    lastPointerRef.current = null
  }

  function updateGesture() {
    const g = gestureRef.current
    if (!g) return
    const pts = Array.from(pointersRef.current.values())
    if (pts.length < 2) return
    const [a, b] = pts
    const dx = a.x - b.x
    const dy = a.y - b.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const cx = (a.x + b.x) / 2
    const cy = (a.y + b.y) / 2

    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const screenCx = cx - rect.left
    const screenCy = cy - rect.top

    const newZoom = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, g.initialZoom * (distance / g.initialDistance)),
    )

    setViewport({
      x: g.initialCenterWorld.x - screenCx / newZoom,
      y: g.initialCenterWorld.y - screenCy / newZoom,
      zoom: newZoom,
    })
  }

  // ─── Pointer handlers ───────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current
      if (!svg) return

      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      // Multi-touch → start/continue gesture
      if (pointersRef.current.size >= 2) {
        startGesture()
        return
      }

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

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      }

      // Gesture mode (2+ active pointers)
      if (gestureRef.current && pointersRef.current.size >= 2) {
        updateGesture()
        return
      }

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

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current
      if (svg && svg.hasPointerCapture(e.pointerId)) {
        svg.releasePointerCapture(e.pointerId)
      }

      pointersRef.current.delete(e.pointerId)

      // Exit gesture saat finger lifted ke <2
      if (gestureRef.current && pointersRef.current.size < 2) {
        gestureRef.current = null
        // Don't auto-resume drawing — wait for fresh pointerdown
        return
      }

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

  const handlePointerLeave = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      pointersRef.current.delete(e.pointerId)
      if (gestureRef.current && pointersRef.current.size < 2) {
        gestureRef.current = null
      }
      onCursor?.(null, null)
      setEraserCursor(null)
    },
    [onCursor],
  )

  // ─── Wheel zoom & pan (desktop) ─────────────────────────────────────────────

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const rect = svg!.getBoundingClientRect()
        const v = viewportRef.current
        const pivotX = (e.clientX - rect.left) / v.zoom + v.x
        const pivotY = (e.clientY - rect.top) / v.zoom + v.y
        const factor = e.deltaY > 0 ? 0.92 : 1.08
        setViewport((vp) => {
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, vp.zoom * factor))
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
  }, [])

  // ─── Programmatic zoom (untuk button) ───────────────────────────────────────

  const zoomBy = useCallback((factor: number) => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    setViewport((v) => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom * factor))
      const worldX = cx / v.zoom + v.x
      const worldY = cy / v.zoom + v.y
      return {
        x: worldX - cx / newZoom,
        y: worldY - cy / newZoom,
        zoom: newZoom,
      }
    })
  }, [])

  const handleFit = useCallback(() => {
    fitToContent(strokes)
  }, [strokes, fitToContent])

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

      {/* Presence cursors */}
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

      {/* Zoom controls — floating bottom-left */}
      <ZoomControls
        zoom={viewport.zoom}
        onZoomIn={() => zoomBy(1.25)}
        onZoomOut={() => zoomBy(0.8)}
        onFit={handleFit}
        isDark={isDark}
      />
    </div>
  )
}

function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFit,
  isDark,
}: {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  isDark: boolean
}) {
  const containerStyle = {
    background: isDark
      ? 'rgba(42, 31, 23, 0.92)'
      : 'rgba(255, 255, 255, 0.92)',
    border: '1px solid var(--border-soft)',
    boxShadow: '0 6px 20px rgba(43, 24, 16, 0.15)',
  }
  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-2xl p-1 backdrop-blur-md animate-fade-in" style={containerStyle}>
      <button
        type="button"
        onClick={onZoomOut}
        className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/40 active:scale-95 transition-all"
        title="Zoom out"
        aria-label="Zoom out"
      >
        <Minus size={16} />
      </button>
      <button
        type="button"
        onClick={onFit}
        className="px-3 h-9 rounded-xl text-xs font-bold tnum hover:bg-muted/40 active:scale-95 transition-all min-w-[3.2rem]"
        title="Fit to content (reset view)"
        aria-label="Fit to content"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/40 active:scale-95 transition-all"
        title="Zoom in"
        aria-label="Zoom in"
      >
        <Plus size={16} />
      </button>
      <div className="w-px h-5 mx-0.5" style={{ background: 'var(--border-medium)' }} />
      <button
        type="button"
        onClick={onFit}
        className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/40 active:scale-95 transition-all"
        title="Fit to content"
        aria-label="Fit to content"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  )
}

export default Canvas
