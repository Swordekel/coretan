import type { ReactNode } from 'react'

export function PrimaryBtn({
  onClick,
  children,
  disabled,
  full,
  className,
}: {
  onClick?: () => void
  children: ReactNode
  disabled?: boolean
  full?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${full ? 'w-full' : ''} h-12 px-5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-transform active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ''}`}
      style={{
        background:
          'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-tertiary) 100%)',
        boxShadow: '0 8px 24px rgba(139,90,60,0.28)',
      }}
    >
      {children}
    </button>
  )
}

export function GhostBtn({
  onClick,
  children,
  full,
  className,
}: {
  onClick?: () => void
  children: ReactNode
  full?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${full ? 'w-full' : ''} h-11 px-5 rounded-2xl font-semibold text-sm border text-muted-foreground hover:bg-muted/40 transition-colors ${className ?? ''}`}
      style={{ borderColor: 'var(--border-medium, var(--border))' }}
    >
      {children}
    </button>
  )
}

export function IconBtn({
  onClick,
  children,
  active,
  disabled,
  title,
  size = 'md',
}: {
  onClick?: () => void
  children: ReactNode
  active?: boolean
  disabled?: boolean
  title?: string
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`${dim} rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`}
      style={
        active
          ? {
              background:
                'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-tertiary) 100%)',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(139,90,60,0.25)',
            }
          : {
              background: 'transparent',
              color: 'var(--text-secondary)',
            }
      }
    >
      {children}
    </button>
  )
}
