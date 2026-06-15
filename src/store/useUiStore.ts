import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Tool } from '../types'
import { PEN_COLORS } from '../lib/colors'

interface UiState {
  tool: Tool
  color: string
  penSize: number
  eraserSize: number
  customColors: string[]

  setTool: (t: Tool) => void
  setColor: (c: string) => void
  setPenSize: (s: number) => void
  setEraserSize: (s: number) => void
  addCustomColor: (c: string) => void
  removeCustomColor: (c: string) => void
}

const MAX_CUSTOM_COLORS = 6

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      tool: 'pen',
      color: PEN_COLORS[1].value, // chocolate default
      penSize: 6,
      eraserSize: 24,
      customColors: [],

      setTool: (tool) => set({ tool }),
      setColor: (color) => set({ color, tool: 'pen' }),
      setPenSize: (penSize) => set({ penSize: Math.max(1, Math.min(80, penSize)) }),
      setEraserSize: (eraserSize) =>
        set({ eraserSize: Math.max(4, Math.min(120, eraserSize)) }),
      addCustomColor: (c) =>
        set((s) => {
          const normalized = c.toLowerCase()
          const presetSet = new Set(PEN_COLORS.map((p) => p.value.toLowerCase()))
          if (presetSet.has(normalized)) return s
          const filtered = s.customColors.filter((x) => x.toLowerCase() !== normalized)
          return {
            customColors: [normalized, ...filtered].slice(0, MAX_CUSTOM_COLORS),
          }
        }),
      removeCustomColor: (c) =>
        set((s) => ({
          customColors: s.customColors.filter(
            (x) => x.toLowerCase() !== c.toLowerCase(),
          ),
        })),
    }),
    { name: 'coretan-ui' },
  ),
)
