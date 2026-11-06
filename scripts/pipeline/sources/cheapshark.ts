import type { Deal, StoreId } from '../../../src/types.ts'
import { getJson, mapLimit, sleep } from '../lib/http.ts'
import { gameKey, similarity } from '../lib/util.ts'

/**
 * CheapShark agrega promoções de lojas de PC (preços em USD).
 * https://apidocs.cheapshark.com/
 *
 * O link de redirecionamento do CheapShark (cheapshark.com/redirect) fica preso numa
 * verificação anti-robô do Cloudflare, então montamos o link da própria loja:
 * página do produto quando dá para resolvê-la (GOG) ou a busca da loja pelo título.
 */
const API = 'https://www.cheapshark.com/api/1.0'

/** Lojas cujos links foram verificados num navegador (as demais travam em verificação anti-robô). */
export const CHEAPSHARK_STORES: Record<string, StoreId> = {
  '7': 'gog',
  '11': 'humble',
  '15': 'fanatical',
  '3': 'gmg',
  '25': 'epic',
  '13': 'ubisoft',
  '2': 'gamersgate',
  '30': 'indiegala',
  '21': 'wingamestore',
}

const searchTerm = (title: string) => encodeURIComponent(title.replace(/[™®©]/g, '').replace(/\s+/g, ' ').trim())

/** Página de busca de cada loja (abre já filtrada pelo jogo). */
export const STORE_SEARCH: Partial<Record<StoreId, (title: string) => string>> = {
  gog: (t) => `https://www.gog.com/en/games?query=${searchTerm(t)}`,
  humble: (t) => `https://www.humblebundle.com/store/search?search=${searchTerm(t)}`,
  fanatical: (t) => `https://www.fanatical.com/en/search?search=${searchTerm(t)}`,
  gmg: (t) => `https://www.greenmangaming.com/search?query=${searchTerm(t)}`,
  epic: (t) => `https://store.epicgames.com/pt-BR/browse?q=${searchTerm(t)}&sortBy=relevancy&sortDir=DESC`,
  ubisoft: (t) => `https://store.ubisoft.com/us/search?q=${searchTerm(t)}`,
  gamersgate: (t) => `https://www.gamersgate.com/games/?query=${searchTerm(t)}`,
  indiegala: (t) => `https://www.indiegala.com/search/${searchTerm(t)}`,
  wingamestore: (t) => `https://www.wingamestore.com/search/?SearchWord=${searchTerm(t)}`,
}

/** Corrige links antigos (redirect do CheapShark) em dados reaproveitados de execuções anteriores. */
export function fixDealUrl(d: Deal): Deal {
  if (!d.url.includes('cheapshark.com/redirect')) return d
  const search = STORE_SEARCH[d.store]
  return search ? { ...d, url: search(d.title), linkType: 'search' } : d
}

export interface CheapSharkDeal extends Deal {
  steamAppId?: number
}

/** Link direto da página do produto na GOG (API pública de catálogo usada pelo gog.com). */
async function gogProductUrl(title: string): Promise<string | null> {
  try {
    const j = await getJson('https://catalog.gog.com/v1/catalog', {
      query: { limit: 5, query: `like:${title.replace(/[™®©]/g, '')}`, order: 'desc:score', productType: 'in:game,pack' },
      retries: 1,
      timeoutMs: 15_000,
    })
    let best: { url: string; score: number } | null = null
    for (const p of j.products ?? []) {
      if (!p.storeLink) continue
      const score = similarity(title, p.title)
      if (!best || score > best.score) best = { url: p.storeLink, score }
    }
    return best && best.score >= 0.8 ? best.url : null
  } catch {
    return null
  }
}

export async function fetchCheapSharkDeals(perStore = 60): Promise<CheapSharkDeal[]> {
  const out: CheapSharkDeal[] = []
  const errors: string[] = []
  for (const [storeID, store] of Object.entries(CHEAPSHARK_STORES)) {
    try {
      const list: any[] = await getJson(`${API}/deals`, {
        query: { storeID, pageSize: perStore, sortBy: 'Deal Rating', onSale: 1 },
      })
      list.forEach((d, i) => {
        const price = Number(d.salePrice)
        const originalPrice = Number(d.normalPrice)
        if (!(originalPrice > 0)) return
        const rating = Number(d.steamRatingPercent) || Number(d.metacriticScore) || null
        const search = STORE_SEARCH[store]
        out.push({
          id: `cs-${d.dealID}`,
          key: gameKey(d.title),
          title: d.title,
          store,
          price,
          originalPrice,
          discount: Math.round(Number(d.savings)),
          currency: 'USD',
          image: d.thumb,
          url: search ? search(d.title) : `https://www.cheapshark.com/redirect?dealID=${d.dealID}`,
          linkType: 'search',
          endsAt: null,
          rating,
          ratingLabel: d.steamRatingText || undefined,
          popularity: i + 1,
          steamAppId: Number(d.steamAppID) || undefined,
        })
      })
    } catch (err) {
      errors.push(`${store}: ${(err as Error).message}`)
    }
    await sleep(700) // a API pede moderação
  }
  if (!out.length && errors.length) throw new Error(errors.join('; '))

  // GOG: troca a busca pelo link direto do produto quando o catálogo encontra o jogo
  const gog = out.filter((d) => d.store === 'gog')
  await mapLimit(gog, 4, async (d) => {
    const url = await gogProductUrl(d.title)
    if (url) {
      d.url = url
      d.linkType = 'product'
    }
  })
  return out
}
