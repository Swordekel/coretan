import { getStroke } from 'perfect-freehand'
import type { Stroke } from '../types'

const FREEHAND_OPTIONS = {
  size: 8,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  easing: (t: number) => t,
  start: { taper: 0, cap: true },
  end: { taper: 0, cap: true },
}

/** Convert array of points to SVG path string menggunakan perfect-freehand */
export function strokeToPath(stroke: Stroke): string {
  const inputPoints: [number, number, number][] = stroke.points.map((p) => [
    p.x,
    p.y,
    p.p ?? 0.5,
  ])

  const outlinePoints = getStroke(inputPoints, {
    ...FREEHAND_OPTIONS,
    size: stroke.size,
  })

  if (outlinePoints.length === 0) return ''

  return outlinePointsToSvgPath(outlinePoints)
}

function outlinePointsToSvgPath(points: number[][]): string {
  if (points.length < 2) return ''
  const d = points.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', points[0][0], points[0][1], 'Q'] as (string | number)[],
  )
  d.push('Z')
  return d.join(' ')
}

/** Hit-test sederhana: cek apakah point (x,y) berada di sekitar stroke (untuk eraser) */
export function strokeHit(stroke: Stroke, x: number, y: number, radius: number): boolean {
  const r = radius + stroke.size / 2
  const r2 = r * r
  for (const p of stroke.points) {
    const dx = p.x - x
    const dy = p.y - y
    if (dx * dx + dy * dy <= r2) return true
  }
  return false
}

/**
 * Split stroke menjadi beberapa segment berdasarkan eraser circle.
 * Return:
 * - [stroke] jika eraser tidak menyentuh stroke (no-op)
 * - [] jika seluruh stroke terhapus
 * - [seg1, seg2, ...] jika stroke terpotong jadi beberapa bagian
 *
 * Each segment is a new Stroke object (first keeps original id, lainnya pakai uuid baru).
 */
export function splitStrokeByEraser(
  stroke: Stroke,
  ex: number,
  ey: number,
  eraserRadius: number,
  newIdFor: () => string,
): Stroke[] {
  const hitR = eraserRadius + stroke.size / 2
  const r2 = hitR * hitR

  // Quick reject: kalau gak ada point yang kena, return original
  let anyHit = false
  for (const p of stroke.points) {
    const dx = p.x - ex
    const dy = p.y - ey
    if (dx * dx + dy * dy <= r2) {
      anyHit = true
      break
    }
  }
  if (!anyHit) return [stroke]

  // Split: collect contiguous segments dari point yang OUTSIDE eraser
  const segments: typeof stroke.points[] = []
  let current: typeof stroke.points = []

  for (const p of stroke.points) {
    const dx = p.x - ex
    const dy = p.y - ey
    if (dx * dx + dy * dy <= r2) {
      if (current.length >= 2) segments.push(current)
      current = []
    } else {
      current.push(p)
    }
  }
  if (current.length >= 2) segments.push(current)

  if (segments.length === 0) return []

  return segments.map((points, i) => ({
    ...stroke,
    id: i === 0 ? stroke.id : newIdFor(),
    points: points.slice(),
  }))
}
