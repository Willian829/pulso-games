import type { Deal, SimpleGame } from '../../../src/types.ts'
import { BROWSER_UA, getJson, getText } from '../lib/http.ts'
import { gameKey, slugify } from '../lib/util.ts'

/**
 * Xbox Store (Brasil). A página de ofertas do xbox.com já vem com os produtos
 * embutidos em window.__PRELOADED_STATE__; o mesmo formato é devolvido pelo
 * endpoint de navegação usado pelo próprio site.
 */
const DEALS_PAGE = 'https://www.xbox.com/pt-BR/games/browse/DynamicChannel.GameDeals'
const BROWSE_API = 'https://emerald.xboxservices.com/xboxcomfd/browse'

function extractState(html: string): any {
  const i = html.indexOf('window.__PRELOADED_STATE__')
  if (i < 0) throw new Error('estado da página não encontrado')
  const start = html.indexOf('{', i)
  let depth = 0
  let inStr = false
  let esc = false
  for (let k = start; k < html.length; k++) {
    const c = html[k]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return JSON.parse(html.slice(start, k + 1))
  }
  throw new Error('estado da página incompleto')
}

const img = (url?: string, w = 640, h = 360) => (url ? `${url}?q=90&w=${w}&h=${h}&mode=crop` : undefined)

function productUrl(p: any) {
  return `https://www.xbox.com/pt-BR/games/store/${slugify(p.title) || 'jogo'}/${p.productId}`
}

function toDeal(p: any, popularity: number): Deal | null {
  const price = p.specificPrices?.purchaseable?.[0]
  if (!price || !(price.msrp > price.listPrice)) return null
  // "11/10/2026 09:59:59" (MM/DD/AAAA, UTC)
  let endsAt: string | null = null
  const m = String(price.endDateUtc ?? '').match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/)
  if (m) endsAt = new Date(Date.UTC(+m[3], +m[1] - 1, +m[2], +m[4], +m[5], +m[6])).toISOString()
  const platforms = (p.availableOn ?? []).map((x: string) =>
    x === 'XboxSeriesX' ? 'Xbox Series' : x === 'XboxOne' ? 'Xbox One' : x === 'PC' ? 'PC' : x,
  )
  return {
    id: `xbox-${p.productId}`,
    key: gameKey(p.title),
    title: p.title,
    store: 'xbox',
    price: price.listPrice,
    originalPrice: price.msrp,
    discount: Math.round(price.discountPercentage),
    currency: 'BRL',
    image: img(p.images?.superHeroArt?.url || p.images?.titledHeroArt?.url) || img(p.images?.boxArt?.url, 400, 400),
    url: productUrl(p),
    endsAt,
    rating: p.averageRating ? Math.round((p.averageRating / 5) * 100) : null,
    ratingLabel: p.ratingCount ? `${p.averageRating.toFixed(1)}★ (${p.ratingCount})` : undefined,
    platforms,
    popularity,
    subscription: p.includedWithPassesProductIds?.length ? 'Game Pass' : undefined,
  }
}

export async function fetchXboxDeals(): Promise<Deal[]> {
  const html = await getText(DEALS_PAGE, { headers: { 'User-Agent': BROWSER_UA } })
  const st = extractState(html)
  const channels = st.core2?.channels?.channelData ?? {}
  const key = Object.keys(channels).find((k) => k.includes('GAMEDEALS'))
  const ids: string[] = (key ? channels[key].data?.products : [])?.map((p: any) => p.productId) ?? []
  const sums = st.core2?.products?.productSummaries ?? {}
  return ids
    .map((id, i) => (sums[id] ? toDeal(sums[id], i + 1) : null))
    .filter((d): d is Deal => !!d)
}

/** Jogos mais populares da loja Xbox no momento (ordenação padrão da navegação). */
export async function fetchXboxPopular(): Promise<SimpleGame[]> {
  const j = await getJson(BROWSE_API, {
    method: 'POST',
    query: { locale: 'pt-BR' },
    headers: {
      'content-type': 'application/json',
      'x-ms-api-version': '1.1',
      'ms-cv': 'PulsoGamesClient.1',
      Origin: 'https://www.xbox.com',
      'User-Agent': BROWSER_UA,
    },
    body: JSON.stringify({
      Filters: 'e30=',
      ReturnFilters: false,
      ChannelKeyToBeUsedInResponse: 'POPULAR',
      EncodedContinuationToken: null,
      ChannelId: '',
    }),
  })
  const list: any[] = j.productSummaries ?? []
  const seen = new Set<string>()
  const out: SimpleGame[] = []
  for (const p of list) {
    const key = gameKey(p.title)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      key,
      name: p.title.replace(/\s*-\s*Edição Cofre.*$/i, '').replace(/\s*\(Windows\)$/i, ''),
      image: img(p.images?.superHeroArt?.url) || img(p.images?.boxArt?.url, 400, 400),
      url: productUrl(p),
      rank: out.length + 1,
    })
  }
  return out
}
