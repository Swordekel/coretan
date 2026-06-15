// 16 warna pen, organized by hue family (4×4 grid)
export const PEN_COLORS = [
  // Row 1 — Naturals (coffee tones)
  { name: 'espresso', value: '#2B1810' },
  { name: 'chocolate', value: '#8B5A3C' },
  { name: 'caramel', value: '#D4A373' },
  { name: 'cream', value: '#F5EBE0' },
  // Row 2 — Greens
  { name: 'matcha', value: '#5B7553' },
  { name: 'forest', value: '#1F4D2E' },
  { name: 'lime', value: '#84CC16' },
  { name: 'teal', value: '#0F766E' },
  // Row 3 — Blues
  { name: 'sky', value: '#3B82F6' },
  { name: 'navy', value: '#1E3A8A' },
  { name: 'indigo', value: '#6366F1' },
  { name: 'slate', value: '#475569' },
  // Row 4 — Warms & accents
  { name: 'rust', value: '#A0522D' },
  { name: 'amber', value: '#D97706' },
  { name: 'crimson', value: '#B91C1C' },
  { name: 'rose', value: '#C75B7A' },
] as const

export const PEN_SIZES = [
  { label: 'Halus', value: 3 },
  { label: 'Sedang', value: 6 },
  { label: 'Tebal', value: 12 },
] as const

// Warna untuk avatar/cursor user lain — saturated agar mudah dibedakan
export const USER_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
] as const

export function pickUserColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

const NAMES = [
  'Kopi',
  'Latte',
  'Mocha',
  'Susu',
  'Gula',
  'Krim',
  'Espresso',
  'Cappuccino',
  'Madu',
  'Karamel',
  'Coklat',
  'Vanila',
  'Sari',
  'Aren',
  'Pandan',
  'Jahe',
  'Kayu',
  'Manis',
]

export function randomName(): string {
  return NAMES[Math.floor(Math.random() * NAMES.length)]
}
