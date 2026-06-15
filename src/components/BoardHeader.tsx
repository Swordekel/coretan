import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  Check,
  Download,
  Link2,
  Moon,
  Palette,
  Plus,
  RotateCcw,
  Sun,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { YBoard } from '../lib/yjs'
import type { RemoteUser } from './PresenceLayer'
import { useUserStore } from '../store/useUserStore'
import { useThemeStore } from '../store/useThemeStore'
import { exportAsPng, downloadBlob } from '../lib/export'
import type { Stroke } from '../types'

interface BoardHeaderProps {
  roomId: string
  title: string
  setTitle: (t: string) => void
  board: YBoard
  remotes: RemoteUser[]
}

const BG_PRESETS_LIGHT = [
  { name: 'Cream', value: '#F5EBE0' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Sand', value: '#FEF3E2' },
  { name: 'Mint', value: '#E8F5E8' },
  { name: 'Sky', value: '#E6EEF8' },
  { name: 'Lavender', value: '#EDE7F5' },
  { name: 'Rose', value: '#F8E7EC' },
  { name: 'Grid', value: '#F3F4F6' },
]

const BG_PRESETS_DARK = [
  { name: 'Espresso', value: '#1F1610' },
  { name: 'Black', value: '#0A0A0A' },
  { name: 'Forest', value: '#0F1F18' },
  { name: 'Ocean', value: '#0B1A2C' },
  { name: 'Plum', value: '#1F0F1F' },
  { name: 'Slate', value: '#1E293B' },
]

export function BoardHeader({
  roomId,
  title,
  setTitle,
  board,
  remotes,
}: BoardHeaderProps) {
  const navigate = useNavigate()
  const me = useUserStore()
  const isDark = useThemeStore((s) => s.isDark)
  const toggleTheme = useThemeStore((s) => s.toggle)
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [bgColor, setBgColor] = useState<string | null>(null)
  const [connStatus, setConnStatus] = useState<'connecting' | 'connected' | 'offline'>(
    'connecting',
  )
  const bgInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function update() {
      if (board.provider.connected) setConnStatus('connected')
      else setConnStatus('offline')
    }
    update()
    board.provider.on('status', update)
    board.provider.on('synced', update)
    const t = setTimeout(update, 3000)
    return () => {
      board.provider.off('status', update)
      board.provider.off('synced', update)
      clearTimeout(t)
    }
  }, [board])

  useEffect(() => {
    function updateBg() {
      const bg = board.settings.get('bgColor')
      setBgColor(bg ?? null)
    }
    updateBg()
    board.settings.observe(updateBg)
    return () => {
      board.settings.unobserve(updateBg)
    }
  }, [board])

  async function handleShare() {
    const url = `${window.location.origin}/board/${roomId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const strokes = board.strokes.toArray() as Stroke[]
      const themeBg = isDark ? '#1F1610' : '#FAF3E7'
      const bg = bgColor || themeBg
      const blob = await exportAsPng(strokes, {
        width: 1200,
        height: 800,
        background: bg,
      })
      downloadBlob(blob, `${title.replace(/\s+/g, '-').toLowerCase()}.png`)
    } finally {
      setExporting(false)
    }
  }

  function setBg(value: string | null) {
    board.doc.transact(() => {
      if (value === null) {
        board.settings.delete('bgColor')
      } else {
        board.settings.set('bgColor', value)
      }
    })
  }

  function handleBgInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBg(e.target.value)
  }

  const allUsers = [
    { ...me, clientId: -1, cursor: undefined } as RemoteUser,
    ...remotes,
  ]

  const bgPresets = isDark ? BG_PRESETS_DARK : BG_PRESETS_LIGHT

  return (
    <div
      className="absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-3 py-3 backdrop-blur-md"
      style={{
        background: isDark
          ? 'rgba(26, 20, 16, 0.7)'
          : 'rgba(245, 235, 224, 0.7)',
        borderBottom: '1px solid var(--border-soft)',
      }}
    >
      <button
        onClick={() => navigate('/')}
        className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/40 transition-colors"
        title="Beranda"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="flex-1 flex flex-col min-w-0">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="font-bold text-sm bg-transparent border-none outline-none truncate"
          style={{
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        />
        <div className="flex items-center gap-1.5 text-[10px]">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background:
                connStatus === 'connected'
                  ? '#10b981'
                  : connStatus === 'connecting'
                    ? '#f59e0b'
                    : '#a89580',
            }}
          />
          <span
            className="text-muted-foreground tnum"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {roomId}
          </span>
        </div>
      </div>

      {/* Active users avatars */}
      <div className="flex -space-x-1.5 mr-1">
        {allUsers.slice(0, 4).map((u) => (
          <div
            key={u.clientId}
            title={u.name}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{
              background: u.color,
              border: `2px solid ${isDark ? '#1A1410' : '#F5EBE0'}`,
            }}
          >
            {u.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {allUsers.length > 4 && (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-muted-foreground"
            style={{
              background: 'var(--bg-muted)',
              border: `2px solid ${isDark ? '#1A1410' : '#F5EBE0'}`,
            }}
          >
            +{allUsers.length - 4}
          </div>
        )}
      </div>

      <button
        onClick={handleShare}
        className="h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold text-white transition-transform active:scale-95"
        style={{
          background:
            'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-tertiary) 100%)',
          boxShadow: '0 4px 12px rgba(139,90,60,0.25)',
        }}
        title="Salin link untuk diundang"
      >
        {copied ? <Check size={14} /> : <Link2 size={14} />}
        <span className="hidden sm:inline">{copied ? 'Tersalin' : 'Bagikan'}</span>
      </button>

      {/* Background color */}
      <div className="relative">
        <button
          onClick={() => setShowBgPicker((s) => !s)}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/40 transition-colors"
          title="Warna kanvas"
        >
          <Palette size={16} />
        </button>
        {showBgPicker && (
          <div
            className="absolute right-0 top-12 rounded-2xl p-3 animate-fade-in z-20"
            style={{
              background: isDark
                ? 'rgba(42, 31, 23, 0.96)'
                : 'rgba(255, 255, 255, 0.96)',
              border: '1px solid var(--border-soft)',
              boxShadow: '0 12px 32px rgba(43, 24, 16, 0.22)',
              backdropFilter: 'blur(12px)',
              minWidth: '15rem',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Warna Kanvas
              </span>
              {bgColor && (
                <button
                  onClick={() => setBg(null)}
                  className="text-[10px] font-semibold flex items-center gap-1 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--accent-primary)' }}
                  title="Kembali ke default tema"
                >
                  <RotateCcw size={10} /> Default
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {bgPresets.map((p) => {
                const active = bgColor === p.value
                return (
                  <button
                    key={p.name}
                    onClick={() => setBg(p.value)}
                    title={p.name}
                    aria-label={`Background ${p.name}`}
                    className="w-9 h-9 rounded-xl transition-transform active:scale-90 hover:scale-110"
                    style={{
                      background: p.value,
                      border: active
                        ? '2px solid var(--accent-primary)'
                        : '1px solid var(--border-soft)',
                      outline: active ? '2px solid var(--bg-surface)' : 'none',
                      outlineOffset: '-4px',
                      transform: active ? 'scale(1.08)' : 'scale(1)',
                    }}
                  />
                )
              })}
              <button
                onClick={() => bgInputRef.current?.click()}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform active:scale-90 hover:scale-110"
                style={{
                  border: '2px dashed var(--border-strong)',
                  color: 'var(--accent-primary)',
                  background: 'transparent',
                }}
                title="Warna bebas"
              >
                <Plus size={14} strokeWidth={2.4} />
              </button>
            </div>
            <input
              ref={bgInputRef}
              type="color"
              value={bgColor || (isDark ? '#1F1610' : '#FAF3E7')}
              onChange={handleBgInputChange}
              className="absolute opacity-0 pointer-events-none w-0 h-0"
              tabIndex={-1}
            />
            <p className="text-[10px] text-muted-foreground leading-relaxed pt-1">
              Warna kanvas sinkron untuk semua user di papan ini.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/40 transition-colors disabled:opacity-50"
        title="Export PNG"
      >
        <Download size={16} />
      </button>

      <button
        onClick={toggleTheme}
        className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted/40 transition-colors"
        title="Toggle tema"
      >
        {isDark ? (
          <Sun size={16} style={{ color: 'var(--accent-primary)' }} />
        ) : (
          <Moon size={16} style={{ color: 'var(--accent-primary)' }} />
        )}
      </button>
    </div>
  )
}
