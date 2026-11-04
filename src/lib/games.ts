import { useMemo } from 'react'
import type {
  AwardEvent,
  Deal,
  FreeGame,
  HypeEntry,
  MostPlayedEntry,
  SimpleGame,
  TwitchGame,
  UpcomingGame,
} from '../types'
import { useDatasets, type Datasets } from './data'
import { cleanName } from './format'

/** Perfil agregado de um jogo, cruzando todas as fontes pela chave canônica. */
export interface GameProfile {
  key: string
  name: string
  image?: string
  poster?: string
  description?: string
  steam?: MostPlayedEntry
  deals: Deal[]
  free: FreeGame[]
  upcoming?: UpcomingGame
  awards: { event: AwardEvent; category: string; winner: boolean }[]
  twitch?: TwitchGame
  hype?: HypeEntry
  charts: { label: string; rank: number; url?: string }[]
  /** relevância para ordenar a busca */
  weight: number
}

export function normalize(s: string) {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function buildIndex(d: Partial<Datasets>): Map<string, GameProfile> {
  const map = new Map<string, GameProfile>()
  const get = (key: string, name: string, image?: string) => {
    let p = map.get(key)
    if (!p) {
      p = { key, name: cleanName(name), image, deals: [], free: [], awards: [], charts: [], weight: 0 }
      map.set(key, p)
    }
    if (!p.image && image) p.image = image
    return p
  }

  for (const e of d['most-played']?.steam ?? []) {
    const p = get(e.key, e.name, e.image)
    p.name = cleanName(e.name)
    p.steam = e
    p.image = e.image
    p.description = p.description ?? e.description
    p.weight += 100 - e.rank + 50
  }
  const chart = (list: SimpleGame[] | undefined, label: string, w: number) =>
    list?.forEach((g, i) => {
      const p = get(g.key, g.name, g.image)
      p.charts.push({ label, rank: g.rank ?? i + 1, url: g.url })
      p.weight += w - i
    })
  chart(d['most-played']?.topSellers, 'Mais vendidos · Steam', 40)
  chart(d.trending?.psTopSellers, 'Mais vendidos · PS5', 40)

  for (const g of d.trending?.twitch ?? []) {
    const p = get(g.key, g.name)
    p.twitch = g
    p.poster = p.poster ?? g.boxArt
    p.weight += 60 - g.rank
  }
  for (const h of d.trending?.hype ?? []) {
    const p = get(h.key, h.name, h.image)
    p.hype = h
    p.weight += h.score * 20
  }
  for (const deal of d.deals?.deals ?? []) {
    const p = get(deal.key, deal.title, deal.image)
    p.deals.push(deal)
    p.weight += 1
  }
  for (const f of d.deals?.free ?? []) {
    const p = get(f.key, f.title, f.image)
    p.free.push(f)
    p.weight += 30
  }
  for (const g of d.upcoming?.games ?? []) {
    if (!g.notable && !map.has(g.key)) continue
    const p = get(g.key, g.title, g.image)
    p.upcoming = g
    p.description = p.description ?? g.summary
    p.weight += g.notable ? 8 : 1
    if (g.wishlistRank) p.weight += 30 - Math.min(30, g.wishlistRank / 5)
  }
  for (const ev of d.awards?.events ?? []) {
    for (const c of ev.categories) {
      for (const n of c.nominees) {
        // indicações de pessoas/equipes ficam no jogo correspondente
        if (!n.key) continue
        const name = normalize(n.title) === n.key ? n.title : n.credit ?? n.title
        const p = get(n.key, name, n.image)
        if (!p.awards.some((a) => a.event.id === ev.id && a.category === c.name)) {
          p.awards.push({ event: ev, category: c.name, winner: n.winner })
          p.weight += n.winner ? 6 : 2
        }
      }
    }
  }
  // ordena promoções: BRL primeiro, depois menor preço
  for (const p of map.values()) p.deals.sort((a, b) => (a.currency === b.currency ? a.price - b.price : a.currency === 'BRL' ? -1 : 1))
  return map
}

let memo: { src: unknown[]; index: Map<string, GameProfile> } | null = null

export function useGameIndex() {
  const { data, loading } = useDatasets('most-played', 'deals', 'upcoming', 'trending', 'awards')
  const index = useMemo(() => {
    const src = [data['most-played'], data.deals, data.upcoming, data.trending, data.awards]
    if (memo && memo.src.every((s, i) => s === src[i])) return memo.index
    const index = buildIndex(data)
    memo = { src, index }
    return index
  }, [data])
  return { index, loading, data }
}

export function searchGames(index: Map<string, GameProfile>, q: string, limit = 24): GameProfile[] {
  const query = normalize(q)
  if (!query) return []
  const terms = query.split(' ')
  const out: { p: GameProfile; score: number }[] = []
  for (const p of index.values()) {
    const name = normalize(p.name)
    if (!terms.every((t) => name.includes(t) || p.key.includes(t))) continue
    let score = p.weight
    if (name === query) score += 1000
    else if (name.startsWith(query)) score += 400
    else if (name.split(' ').some((w) => w.startsWith(terms[0]))) score += 150
    out.push({ p, score })
  }
  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p)
}
