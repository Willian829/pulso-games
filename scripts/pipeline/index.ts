/**
 * Pipeline de dados do Pulso.
 *
 * Coleta dados públicos (Steam, Epic, Xbox, PlayStation, CheapShark, Wikipedia e,
 * opcionalmente, Twitch/IGDB/YouTube), cruza as fontes e gera arquivos JSON estáticos
 * em public/data — a "API" consumida pelo frontend no GitHub Pages.
 *
 * Uso:  npm run data
 */
import type {
  AwardEvent,
  AwardsData,
  Deal,
  DealsData,
  FreeGame,
  HypeEntry,
  HypeSignal,
  Meta,
  MostPlayedData,
  MostPlayedEntry,
  SimpleGame,
  SourceStatus,
  StoreId,
  StoreSummary,
  TrendingData,
  TwitchGame,
  UpcomingData,
  UpcomingGame,
  YouTubeVideo,
} from '../../src/types.ts'
import { awardEvents, CEREMONY_DATES, MAX_IMAGE_LOOKUPS, OVERRIDES } from './config.ts'
import { sleep } from './lib/http.ts'
import { gameKey, isoNow, log, readPrevious, slugify, uniqBy, writeData } from './lib/util.ts'
import { CHEAPSHARK_STORES, fetchCheapSharkDeals, fixDealUrl, type CheapSharkDeal } from './sources/cheapshark.ts'
import { fetchEpicFree } from './sources/epic.ts'
import { fetchIgdbUpcoming, igdbConfigured, igdbImage, type IgdbGame } from './sources/igdb.ts'
import { fetchPlayStationDeals, fetchPlayStationTopSellers } from './sources/playstation.ts'
import {
  fetchConcurrent,
  fetchDailyMostPlayed,
  fetchTagNames,
  findAppId,
  legacyHeader,
  searchMostWishlisted,
  searchSpecials,
  searchTopSellers,
  SteamCatalog,
  type SteamSearchRow,
} from './sources/steam.ts'
import { fetchTwitchTopGames, twitchConfigured } from './sources/twitch.ts'
import { fetchAwardPage, fetchWikiReleases, type WikiRelease } from './sources/wikipedia.ts'
import { fetchXboxDeals, fetchXboxPopular } from './sources/xbox.ts'
import { fetchYouTubeTrending, youtubeConfigured } from './sources/youtube.ts'

const statuses: SourceStatus[] = []

async function source<T>(
  id: string,
  name: string,
  fn: () => Promise<T>,
  opts: { configured?: boolean; count?: (t: T) => number } = {},
): Promise<T | null> {
  if (opts.configured === false) {
    statuses.push({ id, name, ok: false, skipped: true, count: 0 })
    log(id, 'ignorada (credenciais não configuradas)')
    return null
  }
  const t0 = Date.now()
  try {
    const out = await fn()
    const count = opts.count ? opts.count(out) : Array.isArray(out) ? out.length : 1
    statuses.push({ id, name, ok: true, count, ms: Date.now() - t0 })
    log(id, `ok · ${count} itens · ${Date.now() - t0}ms`)
    return out
  } catch (err) {
    const msg = (err as Error).message ?? String(err)
    statuses.push({ id, name, ok: false, count: 0, error: msg.slice(0, 300), ms: Date.now() - t0 })
    log(id, `ERRO · ${msg}`)
    return null
  }
}

const markStale = (id: string) => {
  const s = statuses.find((x) => x.id === id)
  if (s) s.stale = true
}

/* ------------------------------------------------------------------------------------ */

interface Cache {
  /** chave do jogo → appid da Steam (0 = procurado e não encontrado) */
  steamMatches: Record<string, number>
}

const now = new Date()
const NOW = now.getTime()
const TODAY = now.toISOString().slice(0, 10)
const YEAR = now.getUTCFullYear()
const MONTH = now.getUTCMonth() + 1

async function main() {
  log('pulso', `iniciando coleta (${now.toISOString()})`)

  const [prevMost, prevDeals, prevUpcoming, prevTrending, prevAwards, prevCache] = await Promise.all([
    readPrevious<MostPlayedData>('most-played.json'),
    readPrevious<DealsData>('deals.json'),
    readPrevious<UpcomingData>('upcoming.json'),
    readPrevious<TrendingData>('trending.json'),
    readPrevious<AwardsData>('awards.json'),
    readPrevious<Cache>('_cache.json'),
  ])
  const cache: Cache = { steamMatches: { ...(prevCache?.steamMatches ?? {}) } }

  // 1) Coleta em paralelo (cada fonte isolada: uma falha não derruba as outras)
  const [
    concurrent,
    daily,
    tagNames,
    specials,
    wishlist,
    topSellers,
    epicFree,
    cheap,
    xboxDeals,
    xboxPopular,
    psDeals,
    psTop,
    twitch,
    youtube,
    igdb,
    wikiThis,
    wikiNext,
  ] = await Promise.all([
    source('steam-charts', 'Steam · jogadores simultâneos', fetchConcurrent, { count: (r) => r.ranks.length }),
    source('steam-daily', 'Steam · ranking diário', fetchDailyMostPlayed, { count: (m) => m.size }),
    source('steam-tags', 'Steam · tags', fetchTagNames, { count: (m) => m.size }),
    source('steam-specials', 'Steam · promoções', () => searchSpecials(3)),
    source('steam-wishlist', 'Steam · mais desejados', () => searchMostWishlisted(2)),
    source('steam-topsellers', 'Steam · mais vendidos', () => searchTopSellers(1)),
    source('epic-free', 'Epic Games · grátis', fetchEpicFree),
    source('cheapshark', 'CheapShark · lojas de PC', () => fetchCheapSharkDeals(60)),
    source('xbox-deals', 'Xbox Store · ofertas', fetchXboxDeals),
    source('xbox-popular', 'Xbox Store · populares', fetchXboxPopular),
    source('ps-deals', 'PlayStation Store · ofertas', () => fetchPlayStationDeals(3)),
    source('ps-top', 'PlayStation Store · mais vendidos', fetchPlayStationTopSellers),
    source('twitch', 'Twitch · audiência ao vivo', () => fetchTwitchTopGames(15), { configured: twitchConfigured() }),
    source('youtube', 'YouTube · vídeos em alta', () => fetchYouTubeTrending(), { configured: youtubeConfigured() }),
    source('igdb', 'IGDB · mais aguardados', fetchIgdbUpcoming, { configured: igdbConfigured() }),
    source('wiki-releases', `Wikipedia · lançamentos ${YEAR}`, () => fetchWikiReleases(YEAR)),
    source('wiki-releases-next', `Wikipedia · lançamentos ${YEAR + 1}`, () => fetchWikiReleases(YEAR + 1)),
  ])

  // 2) Catálogo Steam: detalhes de todos os appids encontrados (nome, arte, tags, avaliações)
  const catalog = new SteamCatalog()
  const appids = [
    ...(concurrent?.ranks.map((r) => r.appid) ?? []),
    ...(specials?.map((r) => r.appid) ?? []),
    ...(wishlist?.map((r) => r.appid) ?? []),
    ...(topSellers?.map((r) => r.appid) ?? []),
    ...((cheap ?? []).map((d) => d.steamAppId ?? 0).filter(Boolean) as number[]),
  ]
  await catalog.ensure(appids)
  log('steam', `catálogo com ${new Set(appids).size} apps`)

  // Índice global de imagens por chave de jogo (qualquer fonte pode preencher a arte de outra)
  const images = new Map<string, { wide?: string; poster?: string }>()
  const addImage = (key: string, wide?: string, poster?: string) => {
    if (!key) return
    const cur = images.get(key) ?? {}
    if (wide && !cur.wide) cur.wide = wide
    if (poster && !cur.poster) cur.poster = poster
    images.set(key, cur)
  }
  for (const id of new Set(appids)) {
    const it = catalog.get(id)
    if (it) addImage(gameKey(it.name), it.header, it.poster)
  }
  for (const d of [...(xboxDeals ?? []), ...(psDeals ?? []), ...(epicFree ?? [])]) addImage(d.key, d.image)
  for (const g of [...(psTop ?? []), ...(xboxPopular ?? [])]) addImage(g.key, g.image)
  for (const g of twitch ?? []) addImage(g.key, undefined, g.boxArt)
  for (const g of igdb ?? []) {
    const art = g.artworks?.[0]?.image_id ?? g.screenshots?.[0]?.image_id
    addImage(gameKey(g.name), art ? igdbImage(art) : undefined, g.cover ? igdbImage(g.cover.image_id, 't_cover_big') : undefined)
  }
  for (const [key, o] of Object.entries(OVERRIDES)) if (o.image) addImage(key, o.image)

  /** Busca a capa de um jogo pelo nome (Steam), com cache entre execuções. */
  let lookups = 0
  async function imageFor(name: string): Promise<string | undefined> {
    const key = gameKey(name)
    const hit = images.get(key)
    if (hit?.wide) return hit.wide
    const override = OVERRIDES[key]?.steamAppId
    let appid = override ?? cache.steamMatches[key]
    if (appid === undefined && lookups < MAX_IMAGE_LOOKUPS) {
      lookups++
      appid = (await findAppId(name)) ?? 0
      cache.steamMatches[key] = appid
      await sleep(250)
    }
    if (!appid) return hit?.poster
    await catalog.ensure([appid])
    const it = catalog.get(appid)
    const wide = it?.header ?? legacyHeader(appid)
    addImage(key, wide, it?.poster)
    return wide
  }

  /* ---------------------------------- Mais jogados ---------------------------------- */
  let mostPlayed: MostPlayedData
  if (concurrent?.ranks.length) {
    const prevById = new Map(prevMost?.steam.map((e) => [e.appid, e]) ?? [])
    const week = NOW - 7 * 86400_000
    const steam: MostPlayedEntry[] = concurrent.ranks.slice(0, 100).map((r) => {
      const it = catalog.get(r.appid)
      const prev = prevById.get(r.appid)
      const history = [...(prev?.history ?? []).filter(([t]) => t > week && t < NOW - 30 * 60_000), [NOW, r.concurrent] as [number, number]].slice(-64)
      return {
        rank: r.rank,
        appid: r.appid,
        key: gameKey(it?.name ?? String(r.appid)),
        name: it?.name ?? prev?.name ?? `App ${r.appid}`,
        image: it?.header ?? prev?.image ?? legacyHeader(r.appid),
        capsule: it?.capsule,
        hero: it?.hero,
        url: it?.url ?? `https://store.steampowered.com/app/${r.appid}`,
        current: r.concurrent,
        peak24h: r.peak,
        prevRank: prev?.rank ?? null,
        weeklyRank: daily?.get(r.appid) ?? null,
        history,
        tags: (it?.tags ?? []).map((t) => tagNames?.get(t)).filter((t): t is string => !!t).slice(0, 4),
        reviewPct: it?.reviewPct,
        reviewLabel: it?.reviewLabel,
        isFree: it?.isFree,
        price: it?.isFree ? 'Gratuito' : it?.price,
        developer: it?.developer,
        releaseYear: it?.releaseDate ? new Date(it.releaseDate).getUTCFullYear() : undefined,
        description: it?.description,
      }
    })
    mostPlayed = {
      updatedAt: new Date(concurrent.updatedAt).toISOString(),
      totalPlayers: steam.reduce((s, e) => s + e.current, 0),
      steam,
      topSellers: (topSellers ?? []).slice(0, 30).map((r, i) => steamSimple(r, i + 1)),
    }
  } else {
    if (!prevMost) throw new Error('Sem dados da Steam e sem versão anterior — abortando.')
    mostPlayed = { ...prevMost, topSellers: topSellers ? topSellers.slice(0, 30).map((r, i) => steamSimple(r, i + 1)) : prevMost.topSellers }
    markStale('steam-charts')
  }

  function steamSimple(r: SteamSearchRow, rank: number): SimpleGame {
    const it = catalog.get(r.appid)
    return {
      key: gameKey(r.title),
      name: r.title,
      appid: r.appid,
      image: it?.header ?? legacyHeader(r.appid),
      url: it?.url ?? r.url,
      price: r.discount ? r.finalText : it?.isFree ? 'Gratuito' : it?.price ?? r.finalText,
      discount: r.discount || undefined,
      rank,
    }
  }

  /* ----------------------------------- Promoções ------------------------------------ */
  const steamDeals: Deal[] = (specials ?? [])
    .filter((r) => r.discount > 0)
    .map((r, i) => {
      const it = catalog.get(r.appid)
      const original = r.originalText ? Number(r.originalText.replace(/[^\d,]/g, '').replace(',', '.')) : 0
      return {
        id: `steam-${r.appid}`,
        key: gameKey(r.title),
        title: r.title,
        store: 'steam' as StoreId,
        price: r.priceFinalCents / 100,
        originalPrice: original || (r.priceFinalCents / 100) / (1 - r.discount / 100),
        discount: r.discount,
        currency: 'BRL' as const,
        image: it?.header ?? legacyHeader(r.appid),
        url: it?.url ?? r.url,
        endsAt: null,
        rating: it?.reviewPct ?? r.reviewPct ?? null,
        ratingLabel: it?.reviewLabel ?? r.reviewLabel,
        platforms: ['PC'],
        popularity: i + 1,
      }
    })
  const cheapDeals: Deal[] = (cheap ?? []).map((d: CheapSharkDeal) => {
    const { steamAppId, ...deal } = d
    if (steamAppId) {
      // steamAppID do CheapShark às vezes é um pacote (sub); só troca a arte se for um app conhecido
      const it = catalog.get(steamAppId)
      if (it?.header) deal.image = it.header
      if (deal.rating == null && it?.reviewPct) deal.rating = it.reviewPct
    }
    if (deal.image?.includes('capsule_sm_120') || deal.image?.includes('capsule_231x87')) {
      deal.image = images.get(deal.key)?.wide ?? deal.image.replace('capsule_sm_120', 'header').replace('capsule_231x87', 'header')
    }
    deal.platforms = ['PC']
    return deal
  })

  const fresh: Record<string, Deal[] | null> = {
    steam: specials ? steamDeals : null,
    xbox: xboxDeals,
    playstation: psDeals,
    cheapshark: cheap ? cheapDeals : null,
  }
  const allDeals: Deal[] = []
  const activeStores = new Set<string>(['steam', 'xbox', 'playstation', ...Object.values(CHEAPSHARK_STORES)])
  const reuse = (pred: (d: Deal) => boolean, statusId: string) => {
    const old = (prevDeals?.deals.filter((d) => pred(d) && activeStores.has(d.store)) ?? []).map(fixDealUrl)
    if (old.length) {
      allDeals.push(...old)
      markStale(statusId)
    }
  }
  if (fresh.steam) allDeals.push(...fresh.steam)
  else reuse((d) => d.store === 'steam', 'steam-specials')
  if (fresh.xbox) allDeals.push(...fresh.xbox)
  else reuse((d) => d.store === 'xbox', 'xbox-deals')
  if (fresh.playstation) allDeals.push(...fresh.playstation)
  else reuse((d) => d.store === 'playstation', 'ps-deals')
  if (fresh.cheapshark) allDeals.push(...fresh.cheapshark)
  else reuse((d) => !['steam', 'xbox', 'playstation'].includes(d.store), 'cheapshark')

  const deals = uniqBy(allDeals, (d) => d.id)
  for (const d of deals) if (!d.image) d.image = images.get(d.key)?.wide
  const free: FreeGame[] = epicFree ?? prevDeals?.free.filter((f) => new Date(f.endsAt).getTime() > NOW) ?? []
  if (!epicFree && free.length) markStale('epic-free')

  const STORE_NAMES: Record<StoreId, string> = {
    steam: 'Steam',
    epic: 'Epic Games',
    xbox: 'Xbox',
    playstation: 'PlayStation',
    gog: 'GOG',
    humble: 'Humble Store',
    fanatical: 'Fanatical',
    gmg: 'Green Man Gaming',
    ubisoft: 'Ubisoft Store',
    gamersgate: 'GamersGate',
    indiegala: 'IndieGala',
    gamesplanet: 'Gamesplanet',
    wingamestore: 'WinGameStore',
    gamebillet: 'GameBillet',
    dreamgame: 'DreamGame',
    gamesload: 'Gamesload',
  }
  const counts = new Map<StoreId, StoreSummary>()
  for (const d of deals) {
    const s = counts.get(d.store) ?? { id: d.store, name: STORE_NAMES[d.store] ?? d.store, count: 0, currency: d.currency }
    s.count++
    counts.set(d.store, s)
  }
  const ORDER: StoreId[] = ['steam', 'epic', 'xbox', 'playstation', 'gog', 'humble', 'fanatical', 'gmg', 'ubisoft']
  const dealsData: DealsData = {
    updatedAt: isoNow(),
    stores: [...counts.values()].sort((a, b) => {
      const ia = ORDER.indexOf(a.id)
      const ib = ORDER.indexOf(b.id)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || b.count - a.count
    }),
    deals,
    free,
  }

  /* ---------------------------------- Lançamentos ----------------------------------- */
  const upcomingMap = new Map<string, UpcomingGame>()
  const prevUp = new Map(prevUpcoming?.games.map((g) => [g.key, g]) ?? [])

  const isFuture = (r: WikiRelease) => {
    if (r.date) return r.date >= TODAY
    if (r.year > YEAR) return true
    if (r.month) return r.month >= MONTH
    if (r.quarter) return Number(r.quarter[1]) >= Math.ceil(MONTH / 3)
    return true
  }
  const MONTH_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return `${d} ${MONTH_ABBR[m - 1]} ${y}`
  }
  const dateTextFor = (r: { date: string | null; month: number | null; quarter: string | null; year: number | null; fallback?: string }) =>
    r.date ? fmtDate(r.date) : r.month && r.year ? `${MONTH_ABBR[r.month - 1]} ${r.year}` : r.quarter && r.year ? `${r.quarter} ${r.year}` : r.fallback ?? (r.year ? String(r.year) : 'A definir')

  const wikiAll = [...(wikiThis ?? []), ...(wikiNext ?? [])].filter(isFuture)
  if (!wikiThis && !wikiNext && prevUpcoming) markStale('wiki-releases')
  for (const r of wikiAll) {
    const key = gameKey(r.title)
    const existing = upcomingMap.get(key)
    if (existing) {
      // mesmo jogo em outra data/plataforma: une plataformas e mantém a data mais próxima
      existing.platforms = [...new Set([...existing.platforms, ...r.platforms])]
      continue
    }
    upcomingMap.set(key, {
      id: `${slugify(r.title)}-${r.year}`,
      key,
      title: r.title,
      date: r.date,
      dateText: dateTextFor({ ...r, fallback: /^\d{4}$/.test(r.dateText) ? r.dateText : r.dateText }),
      year: r.year,
      month: r.month,
      quarter: r.quarter,
      platforms: r.platforms,
      genres: r.genres,
      type: r.type,
      developer: r.developer,
      publisher: r.publisher,
      notable: !!r.link,
      sources: ['wikipedia'],
      url: r.link ? `https://en.wikipedia.org/wiki/${encodeURIComponent(r.link.replace(/ /g, '_'))}` : undefined,
    })
  }

  // Steam: mais desejados (data oficial da página da loja)
  ;(wishlist ?? []).forEach((r, i) => {
    const it = catalog.get(r.appid)
    const key = gameKey(r.title)
    let date: string | null = null
    let month: number | null = null
    let quarter: string | null = null
    let year: number | null = null
    if (it?.releaseDate) {
      const d = new Date(it.releaseDate)
      year = d.getUTCFullYear()
      if (it.releaseDisplay === 'date_full' || !it.releaseDisplay) date = d.toISOString().slice(0, 10)
      else if (it.releaseDisplay === 'date_month') month = d.getUTCMonth() + 1
      else if (it.releaseDisplay === 'date_quarter') quarter = `Q${Math.floor(d.getUTCMonth() / 3) + 1}`
    }
    if (date && date < TODAY) return // já lançado
    const g = upcomingMap.get(key)
    if (g) {
      g.wishlistRank = i + 1
      g.steamAppId = r.appid
      g.image = g.image ?? it?.header
      g.notable = true
      g.sources.push('steam')
      if (!g.date && date) {
        g.date = date
        g.dateText = dateTextFor({ date, month, quarter, year })
      }
      if (!g.platforms.includes('PC')) g.platforms.unshift('PC')
      g.summary = g.summary ?? it?.description
      return
    }
    upcomingMap.set(key, {
      id: `${slugify(r.title)}-${year ?? 'tba'}`,
      key,
      title: it?.name ?? r.title,
      date,
      dateText: dateTextFor({ date, month, quarter, year, fallback: it?.releaseMessage ? 'A definir' : undefined }),
      year,
      month,
      quarter,
      platforms: ['PC'],
      genres: (it?.tags ?? []).map((t) => tagNames?.get(t)).filter((t): t is string => !!t).slice(0, 3),
      developer: it?.developer,
      publisher: it?.publisher,
      image: it?.header ?? legacyHeader(r.appid),
      steamAppId: r.appid,
      wishlistRank: i + 1,
      notable: true,
      sources: ['steam'],
      url: it?.url ?? r.url,
      summary: it?.description,
    })
  })

  // IGDB: hype + arte + resumo (quando configurado)
  for (const g of (igdb ?? []) as IgdbGame[]) {
    const key = gameKey(g.name)
    const d = g.first_release_date ? new Date(g.first_release_date * 1000) : null
    const date = d ? d.toISOString().slice(0, 10) : null
    const art = g.artworks?.[0]?.image_id ?? g.screenshots?.[0]?.image_id
    const image = art ? igdbImage(art) : g.cover ? igdbImage(g.cover.image_id, 't_cover_big') : undefined
    const platforms = (g.platforms ?? []).map((p) => (p.abbreviation === 'PC' ? 'PC' : p.abbreviation === 'Series X|S' ? 'Xbox Series' : p.abbreviation || p.name))
    const ex = upcomingMap.get(key)
    if (ex) {
      ex.hype = g.hypes
      ex.image = ex.image ?? image
      ex.summary = ex.summary ?? g.summary
      ex.notable = true
      ex.sources.push('igdb')
      continue
    }
    if (date && date < TODAY) continue
    upcomingMap.set(key, {
      id: `${g.slug}-${d?.getUTCFullYear() ?? 'tba'}`,
      key,
      title: g.name,
      date,
      dateText: date ? dateTextFor({ date, month: null, quarter: null, year: null }) : 'A definir',
      year: d?.getUTCFullYear() ?? null,
      month: d ? d.getUTCMonth() + 1 : null,
      quarter: null,
      platforms,
      genres: (g.genres ?? []).map((x) => x.name).slice(0, 3),
      developer: g.involved_companies?.find((c) => c.developer)?.company.name,
      publisher: g.involved_companies?.find((c) => c.publisher)?.company.name,
      image,
      hype: g.hypes,
      notable: true,
      sources: ['igdb'],
      url: `https://www.igdb.com/games/${g.slug}`,
      summary: g.summary,
    })
  }

  // Arte: índice global → versão anterior → busca na Steam (limitada, com cache)
  const upcomingList = [...upcomingMap.values()]
  for (const g of upcomingList) {
    if (!g.image) g.image = images.get(g.key)?.wide ?? prevUp.get(g.key)?.image
    if (!g.steamAppId && prevUp.get(g.key)?.steamAppId) g.steamAppId = prevUp.get(g.key)!.steamAppId
  }
  // (as buscas de capa que faltarem acontecem no fim, depois de tendências e premiações)

  const sortKey = (g: UpcomingGame) => {
    const y = g.year ?? 9999
    const m = g.date ? Number(g.date.slice(5, 7)) : g.month ?? (g.quarter ? Number(g.quarter[1]) * 3 : 13)
    const d = g.date ? Number(g.date.slice(8, 10)) : 99
    return y * 10000 + m * 100 + d
  }
  upcomingList.sort((a, b) => sortKey(a) - sortKey(b) || Number(b.notable) - Number(a.notable) || a.title.localeCompare(b.title))
  const upcomingData: UpcomingData = {
    updatedAt: isoNow(),
    years: [...new Set(upcomingList.map((g) => g.year).filter((y): y is number => !!y))].sort(),
    games: upcomingList,
  }

  /* ------------------------------------ Em alta ------------------------------------- */
  const signals = new Map<string, { name: string; signals: HypeSignal[] }>()
  const addSignal = (name: string, key: string, s: HypeSignal) => {
    const cur = signals.get(key) ?? { name, signals: [] }
    if (!cur.signals.some((x) => x.source === s.source)) cur.signals.push(s)
    signals.set(key, cur)
  }
  mostPlayed.steam.slice(0, 40).forEach((e) =>
    addSignal(e.name, e.key, { source: 'steam-players', label: 'Jogadores na Steam', rank: e.rank, value: e.current }),
  )
  mostPlayed.topSellers.slice(0, 30).forEach((e, i) =>
    addSignal(e.name, e.key, { source: 'steam-sellers', label: 'Mais vendidos Steam', rank: i + 1 }),
  )
  ;(twitch ?? []).slice(0, 30).forEach((g) =>
    addSignal(g.name, g.key, { source: 'twitch', label: 'Audiência na Twitch', rank: g.rank, value: g.viewers }),
  )
  ;(psTop ?? []).slice(0, 30).forEach((g, i) => addSignal(g.name, g.key, { source: 'playstation', label: 'Mais vendidos PS5', rank: i + 1 }))
  ;(xboxPopular ?? []).slice(0, 25).forEach((g, i) => addSignal(g.name, g.key, { source: 'xbox', label: 'Populares no Xbox', rank: i + 1 }))

  const WEIGHTS: Record<HypeSignal['source'], { w: number; n: number }> = {
    twitch: { w: 1.25, n: 30 },
    'steam-players': { w: 1, n: 40 },
    'steam-sellers': { w: 0.8, n: 30 },
    playstation: { w: 0.85, n: 30 },
    xbox: { w: 0.75, n: 25 },
    youtube: { w: 0.5, n: 30 },
    wishlist: { w: 0.4, n: 30 },
  }
  const hype: HypeEntry[] = [...signals.entries()]
    .map(([key, v]) => {
      const score = v.signals.reduce((s, x) => {
        const { w, n } = WEIGHTS[x.source]
        return s + w * (1 - (x.rank - 1) / n)
      }, 0)
      return { key, name: v.name, image: images.get(key)?.wide, score: Math.round(score * 100) / 100, signals: v.signals.sort((a, b) => a.rank - b.rank) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 40)
  for (const h of hype) if (!h.image) h.image = await imageFor(h.name)

  const trendingData: TrendingData = {
    updatedAt: isoNow(),
    configured: { twitch: twitchConfigured(), youtube: youtubeConfigured(), igdb: igdbConfigured() },
    twitch: (twitch as TwitchGame[] | null) ?? (twitchConfigured() ? prevTrending?.twitch ?? [] : []),
    youtube: (youtube as YouTubeVideo[] | null) ?? (youtubeConfigured() ? prevTrending?.youtube ?? [] : []),
    steamTopSellers: mostPlayed.topSellers,
    psTopSellers: psTop ?? prevTrending?.psTopSellers ?? [],
    xboxPopular: xboxPopular ?? prevTrending?.xboxPopular ?? [],
    hype,
  }
  if (!psTop && prevTrending?.psTopSellers?.length) markStale('ps-top')

  /* ----------------------------------- Premiações ----------------------------------- */
  const events: AwardEvent[] = []
  const awardStart = Date.now()
  let awardErrors = 0
  for (const cfg of awardEvents(YEAR)) {
    try {
      const page = await fetchAwardPage(cfg.page)
      const date = page?.date ?? CEREMONY_DATES[cfg.id] ?? null
      if (!page) {
        if (!cfg.keepIfMissing) continue
        events.push({ id: cfg.id, org: cfg.org, name: cfg.name, year: cfg.year, date, status: 'upcoming', note: cfg.note, categories: [], leaders: [] })
        continue
      }
      const categories = page.categories
      const hasWinner = categories.some((c) => c.nominees.some((n) => n.winner))
      events.push({
        id: cfg.id,
        org: cfg.org,
        name: cfg.name,
        year: cfg.year,
        date,
        status: hasWinner ? 'finished' : categories.length ? 'nominees' : 'upcoming',
        url: page.url,
        note: categories.length ? undefined : cfg.note,
        categories,
        leaders: [],
      })
    } catch (err) {
      awardErrors++
      log('awards', `${cfg.page}: ${(err as Error).message}`)
      const old = prevAwards?.events.find((e) => e.id === cfg.id)
      if (old) events.push(old)
    }
    await sleep(200)
  }
  // Mais indicados + capas
  const NON_GAME = /adaptation|creator|athlete|team|fellowship|lifetime|pioneer|hall of fame|esports host|coach/i
  for (const ev of events) {
    const tally = new Map<string, { title: string; key: string; nominations: number; wins: number }>()
    for (const c of ev.categories) {
      if (NON_GAME.test(c.name) || /esports and creators/i.test(c.group ?? '')) continue
      for (const n of c.nominees) {
        const t = tally.get(n.key) ?? { title: n.key === gameKey(n.title) ? n.title : n.credit ?? n.title, key: n.key, nominations: 0, wins: 0 }
        if (n.key === gameKey(n.title)) t.title = n.title
        t.nominations++
        if (n.winner) t.wins++
        tally.set(n.key, t)
      }
    }
    ev.leaders = [...tally.values()]
      .filter((t) => t.nominations > 1)
      .sort((a, b) => b.nominations - a.nominations || b.wins - a.wins)
      .slice(0, 10)
  }
  const prevNomineeImages = new Map<string, string>()
  for (const e of prevAwards?.events ?? []) for (const c of e.categories) for (const n of c.nominees) if (n.image) prevNomineeImages.set(n.key, n.image)
  const nomineeKeys = new Map<string, string>()
  for (const ev of events)
    for (const c of ev.categories) {
      if (NON_GAME.test(c.name) && !/adaptation/i.test(c.name)) continue
      for (const n of c.nominees) if (!nomineeKeys.has(n.key)) nomineeKeys.set(n.key, n.key === gameKey(n.title) ? n.title : n.credit ?? n.title)
    }
  const nomineeImage = new Map<string, string | undefined>()
  for (const [key, title] of nomineeKeys) nomineeImage.set(key, images.get(key)?.wide ?? prevNomineeImages.get(key) ?? (await imageFor(title)))
  for (const ev of events) {
    for (const c of ev.categories) for (const n of c.nominees) n.image = nomineeImage.get(n.key)
    for (const l of ev.leaders) (l as any).image = nomineeImage.get(l.key)
  }
  events.sort((a, b) => {
    const rank = (e: AwardEvent) => (e.status === 'upcoming' ? 0 : e.status === 'nominees' ? 1 : 2)
    return rank(a) - rank(b) || (b.date ?? '').localeCompare(a.date ?? '')
  })
  statuses.push({
    id: 'wiki-awards',
    name: 'Wikipedia · premiações',
    ok: awardErrors === 0,
    count: events.reduce((s, e) => s + e.categories.length, 0),
    ms: Date.now() - awardStart,
    error: awardErrors ? `${awardErrors} página(s) com erro` : undefined,
  })
  const awardsData: AwardsData = { updatedAt: isoNow(), events }

  // Capas restantes dos lançamentos (orçamento de buscas que sobrou)
  const needArt = upcomingList
    .filter((g) => !g.image && g.notable)
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
  for (const g of needArt) {
    if (lookups >= MAX_IMAGE_LOOKUPS) break
    g.image = await imageFor(g.title)
  }

  /* ------------------------------------- Saída -------------------------------------- */
  const meta: Meta = { version: 1, generatedAt: isoNow(), sources: statuses }
  await Promise.all([
    writeData('most-played.json', mostPlayed),
    writeData('deals.json', dealsData),
    writeData('upcoming.json', upcomingData),
    writeData('trending.json', trendingData),
    writeData('awards.json', awardsData),
    writeData('meta.json', meta),
    writeData('_cache.json', cache),
  ])

  const ok = statuses.filter((s) => s.ok).length
  log('pulso', `concluído: ${ok}/${statuses.length} fontes ok · ${deals.length} promoções · ${upcomingList.length} lançamentos · ${events.length} premiações · ${lookups} buscas de capa`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
