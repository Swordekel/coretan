import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  isDark: boolean
  toggle: () => void
  setDark: (dark: boolean) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,
      toggle: () => set((s) => ({ isDark: !s.isDark })),
      setDark: (isDark) => set({ isDark }),
    }),
    { name: 'coretan-theme' },
  ),
)

export function useApplyTheme() {
  const isDark = useThemeStore((s) => s.isDark)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])
}
