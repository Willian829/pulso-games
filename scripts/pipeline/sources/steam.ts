import { getJson, getText, sleep } from '../lib/http.ts'
import { decodeEntities, similarity } from '../lib/util.ts'

const API = 'https://api.steampowered.com'
const STORE = 'https://store.steampowered.com'
const ASSETS = 'https://shared.akamai.steamstatic.com/store_item_assets/'

export interface SteamRank {
  rank: number
  appid: number
  concurrent: number
  peak: number
}

/** Top 100 jogos por jogadores simultâneos neste momento (não exige chave). */
export async function fetchConcurrent(): Promise<{ updatedAt: number; ranks: SteamRank[] }> {
  const j = await getJson(`${API}/ISteamChartsService/GetGamesByConcurrentPlayers/v1/`)
  const r = j.response
  return {
    updatedAt: (r.last_update ?? Date.now() / 1000) * 1000,
    ranks: (r.ranks ?? []).map((x: any) => ({
      rank: x.rank,
      appid: x.appid,
      concurrent: x.concurrent_in_game,
      peak: x.peak_in_game,
    })),
  }
}

/** Ranking diário (pico do dia) — usado como "posição semanal" de referência. */
export async function fetchDailyMostPlayed(): Promise<Map<number, number>> {
  const j = await getJson(`${API}/ISteamChartsService/GetMostPlayedGames/v1/`)
  const m = new Map<number, number>()
  for (const x of j.response?.ranks ?? []) m.set(x.appid, x.last_week_rank > 0 ? x.last_week_rank : -1)
  return m
}

export interface SteamItem {
  appid: number
  name: string
  url: string
  header?: string
  capsule?: string
  hero?: string
  poster?: string
  isFree: boolean
  tags: number[]
  reviewPct?: number
  reviewLabel?: string
  developer?: string
  publisher?: string
  description?: string
  releaseDate?: number
  comingSoon?: boolean
  releaseDisplay?: string
  releaseMessage?: string
  price?: string
  priceCents?: number
  windows?: boolean
  mac?: boolean
  linux?: boolean
  deck?: number
}

function asset(item: any, file?: string) {
  if (!file || !item.assets?.asset_url_format) return undefined
  return ASSETS + item.assets.asset_url_format.replace('${FILENAME}', file)
}

/**
 * Catálogo com cache em memória sobre IStoreBrowseService/GetItems
 * (detalhes de até 50 apps por chamada, sem chave de API).
 */
export class SteamCatalog {
  private cache = new Map<number, SteamItem | null>()

  get(appid: number) {
    return this.cache.get(appid) ?? undefined
  }

  async ensure(appids: number[]) {
    const missing = [...new Set(appids)].filter((id) => id > 0 && !this.cache.has(id))
    for (let i = 0; i < missing.length; i += 50) {
      const batch = missing.slice(i, i + 50)
      const input = {
        ids: batch.map((appid) => ({ appid })),
        context: { language: 'brazilian', country_code: 'BR' },
        data_request: {
          include_assets: true,
          include_basic_info: true,
          include_release: true,
          include_tag_count: 6,
          include_reviews: true,
          include_platforms: true,
          include_all_purchase_options: true,
        },
      }
      try {
        const j = await getJson(`${API}/IStoreBrowseService/GetItems/v1/`, {
          query: { input_json: JSON.stringify(input) },
        })
        for (const it of j.response?.store_items ?? []) {
          if (!it.success || !it.appid) continue
          const rev = it.reviews?.summary_filtered
          const best = it.best_purchase_option
          this.cache.set(it.appid, {
            appid: it.appid,
            name: it.name,
            url: `${STORE}/${it.store_url_path || `app/${it.appid}`}`,
            header: asset(it, it.assets?.header),
            capsule: asset(it, it.assets?.main_capsule),
            hero: asset(it, it.assets?.library_hero),
            poster: asset(it, it.assets?.library_capsule),
            isFree: !!it.is_free,
            tags: (it.tagids ?? []).slice(0, 6),
            reviewPct: rev?.percent_positive,
            reviewLabel: rev?.review_score_label,
            developer: it.basic_info?.developers?.[0]?.name,
            publisher: it.basic_info?.publishers?.[0]?.name,
            description: it.basic_info?.short_description,
            releaseDate: it.release?.steam_release_date ? it.release.steam_release_date * 1000 : undefined,
            comingSoon: !!it.release?.is_coming_soon,
            releaseDisplay: it.release?.coming_soon_display,
            releaseMessage: it.release?.custom_release_date_message,
            price: best?.formatted_final_price,
            priceCents: best?.final_price_in_cents ? Number(best.final_price_in_cents) : undefined,
            windows: it.platforms?.windows,
            mac: it.platforms?.mac,
            linux: it.platforms?.steamos_linux,
            deck: it.platforms?.steam_deck_compat_category,
          })
        }
        for (const id of batch) if (!this.cache.has(id)) this.cache.set(id, null)
      } catch (err) {
        console.warn(`  steam GetItems falhou para lote ${i / 50 + 1}: ${(err as Error).message}`)
      }
      await sleep(250)
    }
  }
}

/** Nomes das tags da Steam em português. */
export async function fetchTagNames(): Promise<Map<number, string>> {
  const j = await getJson(`${API}/IStoreService/GetTagList/v1/`, { query: { language: 'brazilian' } })
  return new Map((j.response?.tags ?? []).map((t: any) => [t.tagid as number, t.name as string]))
}

export async function fetchFeatured() {
  return getJson(`${STORE}/api/featuredcategories`, { query: { cc: 'br', l: 'portuguese' } })
}

export interface SteamSearchRow {
  appid: number
  title: string
  url: string
  released: string
  discount: number
  priceFinalCents: number
  originalText?: string
  finalText?: string
  reviewPct?: number
  reviewLabel?: string
  image?: string
}

/** Lê o HTML da busca da Steam (mesma fonte da página de busca da loja). */
function parseSearchHtml(html: string): SteamSearchRow[] {
  const rows: SteamSearchRow[] = []
  for (const block of html.split('<a href="').slice(1)) {
    const appid = Number(block.match(/data-ds-appid="(\d+)/)?.[1])
    if (!appid) continue
    const url = block.slice(0, block.indexOf('"')).replace(/\?snr=[^"]*/, '')
    const title = decodeEntities(block.match(/<span class="title">([^<]+)<\/span>/)?.[1] ?? '').trim()
    const released = (block.match(/class="search_released[^"]*">\s*([^<]*?)\s*<\/div>/)?.[1] ?? '').trim()
    const discount = Number(block.match(/data-discount="(\d+)"/)?.[1] ?? 0)
    const priceFinalCents = Number(block.match(/data-price-final="(\d+)"/)?.[1] ?? 0)
    const originalText = block.match(/discount_original_price">([^<]+)</)?.[1]?.trim()
    const finalText = block.match(/discount_final_price">([^<]+)</)?.[1]?.trim()
    const tooltip = decodeEntities(block.match(/search_review_summary[^"]*" data-tooltip-html="([^"]+)"/)?.[1] ?? '')
    const reviewPct = Number(tooltip.match(/(\d+)%/)?.[1]) || undefined
    const reviewLabel = tooltip.split('<br>')[0] || undefined
    const image = block.match(/<img src="([^"]+)"/)?.[1]
    rows.push({ appid, title, url, released, discount, priceFinalCents, originalText, finalText, reviewPct, reviewLabel, image })
  }
  return rows
}

async function search(params: Record<string, string | number>, pages: number, pageSize = 100) {
  const out: SteamSearchRow[] = []
  for (let p = 0; p < pages; p++) {
    const j = await getJson(`${STORE}/search/results/`, {
      query: { infinite: 1, start: p * pageSize, count: pageSize, cc: 'br', l: 'portuguese', ...params },
    })
    const rows = parseSearchHtml(j.results_html ?? '')
    out.push(...rows)
    if (rows.length < pageSize / 2) break
    await sleep(400)
  }
  return out
}

/** Jogos em promoção na Steam (ordenação padrão da loja ≈ relevância/popularidade). */
export const searchSpecials = (pages = 3) => search({ specials: 1, category1: 998 }, pages)

/** Jogos mais desejados que ainda não foram lançados. */
export const searchMostWishlisted = (pages = 2) => search({ filter: 'popularwishlist' }, pages)

/** Mais vendidos (receita) no momento. */
export const searchTopSellers = (pages = 1) => search({ filter: 'topsellers', category1: 998 }, pages, 50)

/** Procura o appid de um jogo pelo nome (para buscar capa/arte). */
export async function findAppId(name: string): Promise<number | null> {
  try {
    const j = await getJson(`${STORE}/api/storesearch/`, { query: { term: name, l: 'english', cc: 'US' }, retries: 1 })
    let best: { id: number; score: number } | null = null
    for (const it of j.items ?? []) {
      if (it.type !== 'app') continue
      const score = similarity(name, it.name)
      if (!best || score > best.score) best = { id: it.id, score }
    }
    return best && best.score >= 0.86 ? best.id : null
  } catch {
    return null
  }
}

export const legacyHeader = (appid: number) => `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`
