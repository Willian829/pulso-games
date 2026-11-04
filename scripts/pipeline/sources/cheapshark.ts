import type { Deal, StoreId } from '../../../src/types.ts'
import { getJson, sleep } from '../lib/http.ts'
import { gameKey } from '../lib/util.ts'

/**
 * CheapShark agrega promoções de lojas de PC (preços em USD).
 * https://apidocs.cheapshark.com/
 */
const API = 'https://www.cheapshark.com/api/1.0'

export const CHEAPSHARK_STORES: Record<string, StoreId> = {
  '7': 'gog',
  '11': 'humble',
  '15': 'fanatical',
  '3': 'gmg',
  '25': 'epic',
  '13': 'ubisoft',
  '2': 'gamersgate',
  '30': 'indiegala',
  '27': 'gamesplanet',
  '23': 'gamebillet',
  '21': 'wingamestore',
  '35': 'dreamgame',
  '28': 'gamesload',
}

export interface CheapSharkDeal extends Deal {
  steamAppId?: number
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
          url: `https://www.cheapshark.com/redirect?dealID=${d.dealID}`,
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
  return out
}
