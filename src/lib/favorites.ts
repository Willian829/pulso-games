import { useSyncExternalStore } from 'react'

const KEY = 'pulso:favorites'
type Fav = { key: string; name: string; image?: string; addedAt: number }

let state: Fav[] = read()
const listeners = new Set<() => void>()

function read(): Fav[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* modo privado: mantém só em memória */
  }
  listeners.forEach((l) => l())
}

export const favorites = {
  list: () => state,
  has: (key: string) => state.some((f) => f.key === key),
  toggle(key: string, name: string, image?: string) {
    state = this.has(key) ? state.filter((f) => f.key !== key) : [{ key, name, image, addedAt: Date.now() }, ...state]
    persist()
  },
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = read()
      listeners.forEach((l) => l())
    }
  })
}

export function useFavorites() {
  return useSyncExternalStore(favorites.subscribe, favorites.list, favorites.list)
}

export function useIsFavorite(key: string) {
  const list = useFavorites()
  return list.some((f) => f.key === key)
}
