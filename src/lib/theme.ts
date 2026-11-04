import { useSyncExternalStore } from 'react'

type Theme = 'dark' | 'light'
const listeners = new Set<() => void>()

const current = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f4f5f8' : '#07080b')
  try {
    localStorage.setItem('pulso:theme', t)
  } catch {
    /* sem armazenamento */
  }
  listeners.forEach((l) => l())
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    current,
    () => 'dark' as Theme,
  )
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')] as const
}
