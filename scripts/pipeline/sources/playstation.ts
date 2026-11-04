import type { Deal, SimpleGame } from '../../../src/types.ts'
import { BROWSER_UA, getJson, sleep } from '../lib/http.ts'
import { gameKey, parsePrice } from '../lib/util.ts'

/**
 * PlayStation Store (Brasil) — mesma API GraphQL (consultas persistidas) usada pelo
 * store.playstation.com. Se a Sony trocar o hash, basta atualizar PS_GRID_HASH.
 */
const GQL = 'https://web.np.playstation.com/api/graphql/v1/op'
const PS_GRID_HASH = process.env.PS_GRID_HASH || '4ce7d410a4db2c8b635a48c1dcec375906ff63b19dadd87e073f8fd0c0481d35'
/** "Todas as ofertas" (categoria dinâmica da loja) */
const ALL_DEALS = '3f772501-f6f8-49b7-abac-874a88ca4897'
/** "Todos os jogos de PS5" */
const ALL_PS5 = 'd0446d4b-dc9a-4f1e-86ec-651f099c9b29'

async function grid(id: string, offset: number, size: number, filterBy: string[], attempt = 0): Promise<any> {
  try {
    return await gridOnce(id, offset, size, filterBy)
  } catch (err) {
    // "Breaker is open": proteção temporária da API — espera e tenta de novo
    if (attempt < 3 && /breaker|rate|429|timeout|esgotado/i.test((err as Error).message)) {
      await sleep(4000 * (attempt + 1))
      return grid(id, offset, size, filterBy, attempt + 1)
    }
    throw err
  }
}

async function gridOnce(id: string, offset: number, size: number, filterBy: string[]) {
  const j = await getJson(GQL, {
    query: {
      operationName: 'categoryGridRetrieve',
      variables: JSON.stringify({
        id,
        pageArgs: { size, offset },
        sortBy: { name: 'sales30', isAscending: false },
        filterBy,
        facetOptions: [],
      }),
      extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: PS_GRID_HASH } }),
    },
    headers: {
      'User-Agent': BROWSER_UA,
      'content-type': 'application/json',
      'x-apollo-operation-name': 'categoryGridRetrieve',
      'x-psn-store-locale-override': 'pt-BR',
    },
  })
  if (j.errors?.length) throw new Error(j.errors[0].message)
  return j.data?.categoryGridRetrieve
}

function pickImage(media: any[] = []): string | undefined {
  // Prefere artes 16:9 em JPG (as PNG de "cover art" costumam ser recortes transparentes)
  const order = ['SIXTEEN_BY_NINE_BANNER', 'FOUR_BY_THREE_BANNER', 'BACKGROUND_LAYER_ART', 'BACKGROUND', 'SCREENSHOT', 'GAMEHUB_COVER_ART', 'MASTER']
  for (const role of order) {
    const m = media.find((x) => x.role === role && x.type === 'IMAGE' && !/\.png$/i.test(x.url))
    if (m) return `${m.url}?w=640`
  }
  const any = media.find((x) => x.type === 'IMAGE' && x.role !== 'LOGO')
  if (any) return `${any.url}?w=640`
}

export async function fetchPlayStationDeals(pages = 3): Promise<Deal[]> {
  const out: Deal[] = []
  for (let p = 0; p < pages; p++) {
    const g = await grid(ALL_DEALS, p * 48, 48, ['storeDisplayClassification:FULL_GAME'])
    for (const x of g?.products ?? []) {
      const pr = x.price
      if (!pr?.discountText) continue
      const original = parsePrice(pr.basePrice)
      const price = parsePrice(pr.discountedPrice)
      if (!(original > price)) continue
      const discount = Math.abs(parseInt(String(pr.discountText).replace(/[^\d-]/g, ''), 10)) || Math.round((1 - price / original) * 100)
      out.push({
        id: `ps-${x.id}`,
        key: gameKey(x.name),
        title: x.name,
        store: 'playstation',
        price,
        originalPrice: original,
        discount,
        currency: 'BRL',
        image: pickImage(x.media),
        url: `https://store.playstation.com/pt-br/product/${x.id}`,
        endsAt: null,
        platforms: x.platforms ?? [],
        popularity: out.length + 1,
        subscription: pr.isTiedToSubscription || pr.upsellText ? (pr.upsellText ? `PS Plus ${pr.upsellText}` : 'PS Plus') : undefined,
      })
    }
    if (g?.pageInfo?.isLast) break
    await sleep(500)
  }
  return out
}

/** Mais vendidos de PS5 nos últimos 30 dias (inclui pré-vendas). */
export async function fetchPlayStationTopSellers(): Promise<SimpleGame[]> {
  const g = await grid(ALL_PS5, 0, 36, [])
  const list = (g?.concepts?.length ? g.concepts : g?.products) ?? []
  return list.map((c: any, i: number) => ({
    key: gameKey(c.name),
    name: c.name.replace(/\s*\(PlayStation®5\)/, ''),
    image: pickImage(c.media),
    url: g?.concepts?.length
      ? `https://store.playstation.com/pt-br/concept/${c.id}`
      : `https://store.playstation.com/pt-br/product/${c.id}`,
    rank: i + 1,
  }))
}
