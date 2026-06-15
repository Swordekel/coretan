import { useRef, useState } from 'react'
import {
  Eraser,
  Hand,
  Pen,
  Plus,
  Redo2,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import { useUiStore } from '../store/useUiStore'
import { PEN_COLORS } from '../lib/colors'
import { IconBtn } from './shared/Buttons'
import type { YBoard } from '../lib/yjs'
import { useThemeStore } from '../store/useThemeStore'

interface ToolbarProps {
  board: YBoard
}

const PEN_SIZE_RANGE = { min: 1, max: 40 }
const PEN_PRESETS = [2, 6, 12, 20, 32]
const ERASER_SIZE_RANGE = { min: 4, max: 80 }
const ERASER_PRESETS = [10, 24, 40, 60]

export function Toolbar({ board }: ToolbarProps) {
  const tool = useUiStore((s) => s.tool)
  const color = useUiStore((s) => s.color)
  const penSize = useUiStore((s) => s.penSize)
  const eraserSize = useUiStore((s) => s.eraserSize)
  const customColors = useUiStore((s) => s.customColors)
  const setTool = useUiStore((s) => s.setTool)
  const setColor = useUiStore((s) => s.setColor)
  const setPenSize = useUiStore((s) => s.setPenSize)
  const setEraserSize = useUiStore((s) => s.setEraserSize)
  const addCustomColor = useUiStore((s) => s.addCustomColor)
  const removeCustomColor = useUiStore((s) => s.removeCustomColor)
  const isDark = useThemeStore((s) => s.isDark)

  const [showSizes, setShowSizes] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const colorInputRef = useRef<HTMLInputElement>(null)

  // Tool-aware size config
  const isEraser = tool === 'eraser'
  const sizeValue = isEraser ? eraserSize : penSize
  const setSize = isEraser ? setEraserSize : setPenSize
  const sizeRange = isEraser ? ERASER_SIZE_RANGE : PEN_SIZE_RANGE
  const sizePresets = isEraser ? ERASER_PRESETS : PEN_PRESETS

  function handleClear() {
    if (
      !confirm(
        'Hapus SEMUA coretan di papan ini? Aksi ini tidak bisa diundo dari user lain.',
      )
    )
      return
    board.doc.transact(() => {
      board.strokes.delete(0, board.strokes.length)
    })
  }

  function openColorPicker() {
    colorInputRef.current?.click()
  }

  function handleCustomColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const c = e.target.value
    setColor(c)
    addCustomColor(c)
  }

  return (
    <div
      className="rounded-2xl p-1.5 flex items-center gap-1 backdrop-blur-md animate-slide-up"
      style={{
        background: isDark
          ? 'rgba(42, 31, 23, 0.92)'
          : 'rgba(255, 255, 255, 0.92)',
        border: '1px solid var(--border-soft)',
        boxShadow: '0 8px 32px rgba(43, 24, 16, 0.18)',
      }}
    >
      {/* Tools */}
      <IconBtn
        active={tool === 'pen'}
        onClick={() => setTool('pen')}
        title="Pena (P)"
      >
        <Pen size={18} strokeWidth={2.2} />
      </IconBtn>
      <IconBtn
        active={tool === 'eraser'}
        onClick={() => setTool('eraser')}
        title="Penghapus (E)"
      >
        <Eraser size={18} strokeWidth={2.2} />
      </IconBtn>
      <IconBtn
        active={tool === 'pan'}
        onClick={() => setTool('pan')}
        title="Geser kanvas (H)"
      >
        <Hand size={18} strokeWidth={2.2} />
      </IconBtn>

      <div className="w-px h-7 mx-1" style={{ background: 'var(--border-medium)' }} />

      {/* Color picker */}
      <div className="relative">
        <button
          onClick={() => {
            setShowColors((s) => !s)
            setShowSizes(false)
          }}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95"
          style={{ background: 'transparent' }}
          title="Pilih warna"
          aria-label="Pilih warna"
          disabled={tool === 'eraser' || tool === 'pan'}
        >
          <div
            className="w-7 h-7 rounded-full transition-transform"
            style={{
              background: color,
              border: '2px solid var(--bg-surface)',
              outline: '1.5px solid var(--border-strong)',
              transform: showColors ? 'scale(1.1)' : 'scale(1)',
              opacity: tool === 'eraser' || tool === 'pan' ? 0.4 : 1,
            }}
          />
        </button>
        {showColors && (
          <ColorPopover
            color={color}
            customColors={customColors}
            onPick={(c) => {
              setColor(c)
              setShowColors(false)
            }}
            onAddCustom={openColorPicker}
            onRemoveCustom={removeCustomColor}
            isDark={isDark}
          />
        )}
        <input
          ref={colorInputRef}
          type="color"
          value={color}
          onChange={handleCustomColorChange}
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          tabIndex={-1}
        />
      </div>

      {/* Size picker */}
      <div className="relative">
        <button
          onClick={() => {
            setShowSizes((s) => !s)
            setShowColors(false)
          }}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40"
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
          }}
          title={isEraser ? 'Ukuran penghapus' : 'Ukuran pena'}
          aria-label="Pilih ukuran"
          disabled={tool === 'pan'}
        >
          {isEraser ? (
            <div
              className="rounded-full border-2"
              style={{
                width: Math.min(sizeValue, 18),
                height: Math.min(sizeValue, 18),
                borderColor: 'var(--text-secondary)',
              }}
            />
          ) : (
            <div
              className="rounded-full"
              style={{
                width: Math.min(sizeValue, 18),
                height: Math.min(sizeValue, 18),
                background: color,
              }}
            />
          )}
        </button>
        {showSizes && (
          <SizePopover
            value={sizeValue}
            min={sizeRange.min}
            max={sizeRange.max}
            presets={sizePresets}
            color={isEraser ? 'var(--text-secondary)' : color}
            label={isEraser ? 'Ukuran Penghapus' : 'Ukuran Pena'}
            isEraser={isEraser}
            onChange={(v) => setSize(v)}
            isDark={isDark}
          />
        )}
      </div>

      <div className="w-px h-7 mx-1" style={{ background: 'var(--border-medium)' }} />

      {/* Undo / Redo */}
      <IconBtn onClick={() => board.undoManager.undo()} title="Undo (Ctrl+Z)">
        <Undo2 size={18} strokeWidth={2.2} />
      </IconBtn>
      <IconBtn onClick={() => board.undoManager.redo()} title="Redo (Ctrl+Y)">
        <Redo2 size={18} strokeWidth={2.2} />
      </IconBtn>

      {/* Clear */}
      <IconBtn onClick={handleClear} title="Hapus semua">
        <Trash2 size={18} strokeWidth={2.2} />
      </IconBtn>
    </div>
  )
}

interface ColorPopoverProps {
  color: string
  customColors: string[]
  onPick: (c: string) => void
  onAddCustom: () => void
  onRemoveCustom: (c: string) => void
  isDark: boolean
}

function ColorPopover({
  color,
  customColors,
  onPick,
  onAddCustom,
  onRemoveCustom,
  isDark,
}: ColorPopoverProps) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 bottom-14 rounded-2xl p-3 animate-fade-in min-w-[14rem]"
      style={{
        background: isDark
          ? 'rgba(42, 31, 23, 0.96)'
          : 'rgba(255, 255, 255, 0.96)',
        border: '1px solid var(--border-soft)',
        boxShadow: '0 12px 32px rgba(43, 24, 16, 0.22)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Custom colors row */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <button
          onClick={onAddCustom}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 hover:scale-110"
          style={{
            border: '2px dashed var(--border-strong)',
            color: 'var(--accent-primary)',
            background: 'transparent',
          }}
          title="Warna bebas (color picker)"
        >
          <Plus size={14} strokeWidth={2.4} />
        </button>
        {customColors.map((c) => {
          const isActive = color.toLowerCase() === c.toLowerCase()
          return (
            <div key={c} className="relative group">
              <button
                onClick={() => onPick(c)}
                title={c}
                className="w-8 h-8 rounded-full transition-transform active:scale-90 hover:scale-110"
                style={{
                  background: c,
                  border: isActive
                    ? '2px solid var(--accent-primary)'
                    : '2px solid transparent',
                  outline: isActive ? '2px solid var(--bg-surface)' : 'none',
                  outlineOffset: '-4px',
                  transform: isActive ? 'scale(1.08)' : 'scale(1)',
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveCustom(c)
                }}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: isDark ? '#F5EBE0' : '#2B1810',
                  color: isDark ? '#2B1810' : '#F5EBE0',
                }}
                title="Hapus dari recent"
              >
                <X size={8} strokeWidth={3} />
              </button>
            </div>
          )
        })}
        {customColors.length === 0 && (
          <span className="text-[10px] text-muted-foreground ml-1">
            klik + untuk warna bebas
          </span>
        )}
      </div>

      <div
        className="h-px my-2"
        style={{ background: 'var(--border-soft)' }}
      />

      {/* Preset 4x4 grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {PEN_COLORS.map((c) => {
          const isActive = color.toLowerCase() === c.value.toLowerCase()
          return (
            <button
              key={c.name}
              onClick={() => onPick(c.value)}
              title={c.name}
              aria-label={`Warna ${c.name}`}
              className="w-9 h-9 rounded-full transition-transform active:scale-90 hover:scale-110"
              style={{
                background: c.value,
                border: isActive
                  ? '2px solid var(--accent-primary)'
                  : '2px solid transparent',
                outline: isActive ? '2px solid var(--bg-surface)' : 'none',
                outlineOffset: '-4px',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

interface SizePopoverProps {
  value: number
  min: number
  max: number
  presets: number[]
  color: string
  label: string
  isEraser: boolean
  onChange: (v: number) => void
  isDark: boolean
}

function SizePopover({
  value,
  min,
  max,
  presets,
  color,
  label,
  isEraser,
  onChange,
  isDark,
}: SizePopoverProps) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 bottom-14 rounded-2xl p-3 animate-fade-in"
      style={{
        background: isDark
          ? 'rgba(42, 31, 23, 0.96)'
          : 'rgba(255, 255, 255, 0.96)',
        border: '1px solid var(--border-soft)',
        boxShadow: '0 12px 32px rgba(43, 24, 16, 0.22)',
        backdropFilter: 'blur(12px)',
        minWidth: '14rem',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span
          className="text-xs font-bold tnum"
          style={{
            color: 'var(--accent-primary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {value}px
        </span>
      </div>

      {/* Preview circle */}
      <div
        className="flex items-center justify-center mb-3 rounded-xl py-3"
        style={{ background: 'var(--bg-muted)' }}
      >
        {isEraser ? (
          <div
            className="rounded-full border-2 border-dashed"
            style={{
              width: Math.min(value, 56),
              height: Math.min(value, 56),
              borderColor: color,
            }}
          />
        ) : (
          <div
            className="rounded-full"
            style={{
              width: Math.min(value, 56),
              height: Math.min(value, 56),
              background: color,
            }}
          />
        )}
      </div>

      {/* Slider */}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full coretan-slider"
        style={{
          accentColor: 'var(--accent-primary)',
        }}
      />

      {/* Preset chips */}
      <div className="flex gap-1.5 mt-3">
        {presets.map((p) => {
          const active = value === p
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className="flex-1 h-8 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background: active
                  ? 'var(--accent-primary)'
                  : 'var(--bg-elevated)',
                color: active ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border-soft)',
              }}
            >
              {p}
            </button>
          )
        })}
      </div>
    </div>
  )
}
