import type { Stroke } from '../types'
import { strokeToPath } from './strokes'

interface ExportOptions {
  width: number
  height: number
  background: string
  padding?: number
}

/** Compute bounding box of all strokes */
function computeBounds(strokes: Stroke[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const s of strokes) {
    const r = s.size / 2
    for (const p of s.points) {
      if (p.x - r < minX) minX = p.x - r
      if (p.y - r < minY) minY = p.y - r
      if (p.x + r > maxX) maxX = p.x + r
      if (p.y + r > maxY) maxY = p.y + r
    }
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  return { minX, minY, maxX, maxY }
}

export async function exportAsPng(
  strokes: Stroke[],
  opts: ExportOptions,
): Promise<Blob> {
  const padding = opts.padding ?? 32
  const bounds = computeBounds(strokes)
  const w = Math.max(opts.width, bounds.maxX - bounds.minX + padding * 2)
  const h = Math.max(opts.height, bounds.maxY - bounds.minY + padding * 2)

  const offsetX = padding - bounds.minX
  const offsetY = padding - bounds.minY

  // Build SVG with all stroke paths
  const paths = strokes
    .map((s) => {
      const d = strokeToPath(s)
      if (!d) return ''
      return `<path d="${d}" fill="${s.color}" transform="translate(${offsetX} ${offsetY})" />`
    })
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${opts.background}" />${paths}</svg>`

  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)

  try {
    const img = new Image()
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error('Image load failed'))
      img.src = url
    })

    const canvas = document.createElement('canvas')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.fillStyle = opts.background
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)

    return await new Promise<Blob>((res, rej) => {
      canvas.toBlob(
        (b) => (b ? res(b) : rej(new Error('toBlob failed'))),
        'image/png',
      )
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
