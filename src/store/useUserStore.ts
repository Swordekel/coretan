import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import { pickUserColor, randomName } from '../lib/colors'

interface UserState {
  id: string
  name: string
  color: string
  setName: (name: string) => void
}

function defaultId(): string {
  return uuid()
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => {
      const id = defaultId()
      const name = randomName()
      return {
        id,
        name,
        color: pickUserColor(id),
        setName: (name) => set({ name }),
      }
    },
    { name: 'coretan-user' },
  ),
)
