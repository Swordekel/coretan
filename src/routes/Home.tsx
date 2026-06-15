import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Moon,
  Pen,
  Sun,
  Trash2,
  Users,
  Zap,
  Lock,
} from 'lucide-react'
import { deleteBoard, listBoards } from '../lib/db'
import { generateRoomId } from '../lib/yjs'
import { useThemeStore } from '../store/useThemeStore'
import { useUserStore } from '../store/useUserStore'
import type { BoardMeta } from '../types'
import { PrimaryBtn } from '../components/shared/Buttons'

export default function Home() {
  const navigate = useNavigate()
  const isDark = useThemeStore((s) => s.isDark)
  const toggleTheme = useThemeStore((s) => s.toggle)
  const me = useUserStore()
  const [name, setName] = useState(me.name)
  const [boards, setBoards] = useState<BoardMeta[]>([])
  const [joinId, setJoinId] = useState('')

  useEffect(() => {
    listBoards().then(setBoards)
  }, [])

  function handleCreate() {
    if (name.trim() && name !== me.name) me.setName(name.trim())
    const id = generateRoomId()
    navigate(`/board/${id}`)
  }

  function handleJoin() {
    const slug = joinId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!slug) return
    if (name.trim() && name !== me.name) me.setName(name.trim())
    navigate(`/board/${slug}`)
  }

  async function handleDelete(e: React.MouseEvent, roomId: string) {
    e.stopPropagation()
    if (!confirm('Hapus papan dari riwayat?')) return
    await deleteBoard(roomId)
    setBoards(await listBoards())
  }

  return (
    <div
      className="absolute inset-0 overflow-auto paper-texture"
      style={{ background: 'var(--bg-base)' }}
    >
      <ScribbleBg />

      <div className="relative max-w-6xl mx-auto px-5 lg:px-10 py-5 lg:py-8 min-h-full flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between mb-4 lg:mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-tertiary) 100%)',
                boxShadow: '0 6px 16px rgba(139,90,60,0.25)',
              }}
            >
              <Pen size={18} strokeWidth={2.4} color="#fff" />
            </div>
            <span
              className="font-extrabold text-xl"
              style={{ letterSpacing: '-0.03em' }}
            >
              Coretan
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{
                backgroundColor: isDark
                  ? 'rgba(212,163,115,0.1)'
                  : 'rgba(43,24,16,0.06)',
              }}
              title="Toggle tema"
            >
              {isDark ? (
                <Sun size={17} style={{ color: 'var(--accent-primary)' }} />
              ) : (
                <Moon size={17} style={{ color: 'var(--accent-primary)' }} />
              )}
            </button>
          </div>
        </header>

        {/* Hero — 2 col desktop, stacked mobile */}
        <div className="flex-1 grid lg:grid-cols-2 gap-8 lg:gap-16 items-center py-6 lg:py-10">
          {/* Left: illustration + headline */}
          <div className="text-center lg:text-left order-1">
            <div className="lg:hidden mx-auto">
              <HeroDoodle />
            </div>
            <h1
              className="font-extrabold tracking-tight leading-[1.02] mb-4"
              style={{
                fontSize: 'clamp(2rem, 5.5vw, 4rem)',
                letterSpacing: '-0.035em',
              }}
            >
              Gambar bareng,
              <br />
              <span
                style={{
                  background:
                    'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-tertiary) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                real-time
              </span>{' '}
              tanpa server.
            </h1>
            <p
              className="text-base lg:text-lg text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0"
              style={{ color: 'var(--text-secondary)' }}
            >
              Whiteboard kolaboratif peer-to-peer. Bikin papan, share link,
              langsung gambar bareng teman. Tidak ada login, tidak ada langganan.
            </p>

            {/* Features pills under headline on desktop */}
            <div className="hidden lg:flex items-center gap-2 mt-8 flex-wrap">
              <Pill icon={<Zap size={13} />} label="Real-time" />
              <Pill icon={<Lock size={13} />} label="End-to-end P2P" />
              <Pill icon={<Users size={13} />} label="Multi-user" />
              <Pill icon={<Pen size={13} />} label="Smooth strokes" />
            </div>
          </div>

          {/* Right: action panel */}
          <div className="order-2 w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
            <div
              className="rounded-3xl p-5 lg:p-6"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-soft)',
                boxShadow: '0 24px 64px rgba(43, 24, 16, 0.12)',
              }}
            >
              <h2
                className="font-bold text-base mb-4"
                style={{
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                }}
              >
                Mulai gambar
              </h2>

              {/* Name input */}
              <div
                className="rounded-2xl p-3 mb-3 flex items-center gap-3"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-soft)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: me.color }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama kamu"
                  className="flex-1 bg-transparent border-none outline-none text-sm font-semibold min-w-0"
                  style={{ color: 'var(--text-primary)' }}
                  maxLength={20}
                />
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  tampil di kursor
                </span>
              </div>

              {/* CTA */}
              <PrimaryBtn full onClick={handleCreate} className="mb-3">
                <Pen size={18} /> Buat Papan Baru
                <ArrowRight size={16} className="ml-1 opacity-80" />
              </PrimaryBtn>

              {/* Divider with "atau" */}
              <div className="flex items-center gap-3 my-4">
                <div
                  className="flex-1 h-px"
                  style={{ background: 'var(--border-medium)' }}
                />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  atau gabung
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ background: 'var(--border-medium)' }}
                />
              </div>

              {/* Join existing */}
              <div className="flex gap-2">
                <input
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  placeholder="Kode papan..."
                  className="flex-1 h-11 rounded-xl px-3 text-sm outline-none tnum"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1.5px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <button
                  onClick={handleJoin}
                  disabled={!joinId.trim()}
                  className="h-11 px-5 rounded-xl font-semibold text-sm border transition-colors disabled:opacity-50 hover:bg-muted/40"
                  style={{
                    borderColor: 'var(--border-medium)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Gabung
                </button>
              </div>
            </div>

            {/* Features grid — mobile only (desktop shows pills above) */}
            <div className="lg:hidden grid grid-cols-3 gap-2 mt-5">
              <Feature icon={<Zap size={14} />} label="Real-time" />
              <Feature icon={<Lock size={14} />} label="P2P privat" />
              <Feature icon={<Users size={14} />} label="Multi-user" />
            </div>
          </div>
        </div>

        {/* Riwayat — full width below */}
        {boards.length > 0 && (
          <div className="mt-2 mb-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2
                className="font-bold text-lg"
                style={{ letterSpacing: '-0.02em' }}
              >
                Riwayat Papan
              </h2>
              <span className="text-xs text-muted-foreground">
                {boards.length} papan tersimpan
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {boards.map((b) => (
                <button
                  key={b.id}
                  onClick={() => navigate(`/board/${b.roomId}`)}
                  className="text-left rounded-2xl p-4 flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99]"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                    boxShadow: '0 4px 12px rgba(43, 24, 16, 0.06)',
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(139,90,60,0.12) 0%, rgba(212,163,115,0.08) 100%)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <Pen size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-semibold text-sm truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {b.title}
                    </p>
                    <p
                      className="text-xs text-muted-foreground tnum truncate"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {b.roomId}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, b.roomId)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}

        <footer className="text-center text-xs text-muted-foreground py-5 mt-auto leading-relaxed">
          Sinkronisasi langsung peer-to-peer via WebRTC.
          <br />
          Tidak ada server. Tidak ada login. 100% open source &amp; gratis.
        </footer>
      </div>
    </div>
  )
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 h-8 rounded-full"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-soft)',
        color: 'var(--text-secondary)',
      }}
    >
      <span style={{ color: 'var(--accent-primary)' }}>{icon}</span>
      <span className="text-xs font-semibold">{label}</span>
    </div>
  )
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col items-center gap-1.5"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-soft)',
      }}
    >
      <div style={{ color: 'var(--accent-primary)' }}>{icon}</div>
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
    </div>
  )
}

function HeroDoodle() {
  return (
    <svg viewBox="0 0 200 140" fill="none" className="w-40 h-28 mx-auto mb-4">
      <defs>
        <linearGradient id="penGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent-primary)" />
          <stop offset="100%" stopColor="var(--accent-tertiary)" />
        </linearGradient>
      </defs>
      <path
        d="M30 90 C 40 60, 60 75, 75 55 S 110 80, 130 55"
        stroke="var(--accent-primary)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      <path
        d="M40 110 Q 60 95, 80 105 T 130 100"
        stroke="var(--accent-tertiary)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <circle cx="155" cy="60" r="6" fill="var(--accent-secondary)" opacity="0.7" />
      <g transform="translate(115 18) rotate(35)">
        <rect width="14" height="60" rx="4" fill="url(#penGrad)" />
        <path d="M0 60 L 7 75 L 14 60 Z" fill="var(--text-primary)" />
        <rect y="-4" width="14" height="4" rx="2" fill="var(--accent-tertiary)" />
      </g>
    </svg>
  )
}

function ScribbleBg() {
  // Ambient floating scribbles + coffee beans untuk desktop
  return (
    <svg
      className="hidden lg:block fixed inset-0 w-full h-full pointer-events-none opacity-50"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1440 900"
    >
      <g style={{ color: 'var(--accent-primary)' }}>
        {/* Floating scribble strokes */}
        <path
          d="M120 200 C 140 170, 170 190, 180 170 S 220 195, 240 175"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.12"
        />
        <path
          d="M1200 130 C 1220 110, 1250 125, 1265 110 S 1300 125, 1320 105"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          opacity="0.1"
        />
        <path
          d="M1290 750 Q 1320 720, 1350 740 T 1410 730"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.1"
        />
        <path
          d="M90 700 Q 130 680, 170 695 T 240 685"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          opacity="0.1"
        />
        {/* Coffee beans */}
        {[
          { x: 90, y: 460, rx: 18, ry: 11, rot: -30, op: 0.07 },
          { x: 1340, y: 480, rx: 22, ry: 14, rot: 20, op: 0.06 },
          { x: 1300, y: 300, rx: 14, ry: 8, rot: -10, op: 0.08 },
          { x: 130, y: 870, rx: 16, ry: 10, rot: 45, op: 0.05 },
        ].map((b, i) => (
          <g
            key={i}
            transform={`translate(${b.x},${b.y}) rotate(${b.rot})`}
            opacity={b.op}
          >
            <ellipse rx={b.rx} ry={b.ry} fill="currentColor" />
            <line
              x1={0}
              y1={-b.ry * 0.85}
              x2={0}
              y2={b.ry * 0.85}
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </g>
        ))}
        {/* Dots */}
        <circle cx="200" cy="350" r="4" fill="currentColor" opacity="0.15" />
        <circle cx="1280" cy="600" r="5" fill="currentColor" opacity="0.12" />
        <circle cx="350" cy="800" r="3" fill="currentColor" opacity="0.18" />
      </g>
    </svg>
  )
}
