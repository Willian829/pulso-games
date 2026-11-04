import { useEffect } from 'react'
import type { Deal, HypeEntry, StoreId, UpcomingGame } from '../types'
import { daysUntil } from './format'

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Pulso` : 'Pulso · o pulso do mundo dos games'
  }, [title])
}

const STORE_ROTATION: StoreId[] = ['steam', 'playstation', 'xbox', 'epic', 'gog', 'humble', 'fanatical', 'gmg']

/** Mistura as promoções mais populares de cada loja (rodízio), priorizando BRL. */
export function featuredDeals(deals: Deal[], n = 12, minDiscount = 30): Deal[] {
  const byStore = new Map<StoreId, Deal[]>()
  for (const d of deals) {
    if (d.discount < minDiscount || !d.image) continue
    const list = byStore.get(d.store) ?? []
    list.push(d)
    byStore.set(d.store, list)
  }
  for (const list of byStore.values())
    list.sort((a, b) => (a.popularity ?? 999) - (b.popularity ?? 999) || (b.rating ?? 0) - (a.rating ?? 0))
  const out: Deal[] = []
  const seen = new Set<string>()
  let round = 0
  while (out.length < n && round < 30) {
    for (const s of STORE_ROTATION) {
      const d = byStore.get(s)?.[round]
      if (d && !seen.has(d.key)) {
        seen.add(d.key)
        out.push(d)
        if (out.length >= n) break
      }
    }
    round++
  }
  return out
}

/** Escolhe os lançamentos mais relevantes de um período. */
export function spotlightReleases(games: UpcomingGame[], hype: HypeEntry[], withinDays = 150, n = 6): UpcomingGame[] {
  const hypeRank = new Map(hype.map((h, i) => [h.key, i]))
  const scored = games
    .filter((g) => g.date && g.image && g.notable)
    .map((g) => {
      const d = daysUntil(g.date!)
      if (d < 0 || d > withinDays) return null
      let s = 0
      const h = hypeRank.get(g.key)
      if (h !== undefined) s += 120 - h * 2
      if (g.wishlistRank) s += 70 - Math.min(60, g.wishlistRank / 2)
      if (g.hype) s += Math.min(80, g.hype / 5)
      s += g.platforms.length * 4
      if (g.type && /original/i.test(g.type)) s += 10
      if (g.type && /port|early access|dlc|expansion/i.test(g.type)) s -= 25
      s -= d / 10
      return { g, s }
    })
    .filter((x): x is { g: UpcomingGame; s: number } => !!x)
    .sort((a, b) => b.s - a.s)
  return scored.slice(0, n).map((x) => x.g)
}
