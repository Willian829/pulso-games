/**
 * Tipos compartilhados entre o pipeline de dados (scripts/pipeline) e o frontend (src).
 * Cada arquivo JSON em public/data segue um destes contratos.
 */

export type StoreId =
  | 'steam'
  | 'epic'
  | 'xbox'
  | 'playstation'
  | 'gog'
  | 'humble'
  | 'fanatical'
  | 'gmg'
  | 'ubisoft'
  | 'gamersgate'
  | 'indiegala'
  | 'gamesplanet'
  | 'wingamestore'
  | 'gamebillet'
  | 'dreamgame'
  | 'gamesload'

export type Currency = 'BRL' | 'USD'

export interface SourceStatus {
  id: string
  name: string
  ok: boolean
  /** true quando a fonte exige credenciais que não foram configuradas */
  skipped?: boolean
  count: number
  error?: string
  ms?: number
  /** quando a fonte falhou e mantivemos os dados da execução anterior */
  stale?: boolean
}

export interface Meta {
  version: number
  generatedAt: string
  sources: SourceStatus[]
}

/** Jogo resumido, usado em listas secundárias */
export interface SimpleGame {
  key: string
  name: string
  image?: string
  url?: string
  appid?: number
  price?: string
  discount?: number
  rank?: number
}

/* ---------------------------------- Mais jogados ---------------------------------- */

export interface MostPlayedEntry {
  rank: number
  appid: number
  key: string
  name: string
  image: string
  capsule?: string
  hero?: string
  /** capa vertical (600x900) */
  poster?: string
  url: string
  current: number
  peak24h: number
  /** posição na execução anterior do pipeline (para ▲▼) */
  prevRank: number | null
  /** posição no ranking semanal da Steam (pico diário) */
  weeklyRank: number | null
  /** [timestamp(ms), jogadores] — últimas ~8 coletas por dia, até 7 dias */
  history: [number, number][]
  tags: string[]
  reviewPct?: number
  reviewLabel?: string
  isFree?: boolean
  price?: string
  developer?: string
  releaseYear?: number
  description?: string
}

export interface MostPlayedData {
  updatedAt: string
  totalPlayers: number
  steam: MostPlayedEntry[]
  topSellers: SimpleGame[]
}

/* ----------------------------------- Promoções ------------------------------------ */

export interface Deal {
  id: string
  key: string
  title: string
  store: StoreId
  price: number
  originalPrice: number
  discount: number
  currency: Currency
  image?: string
  url: string
  /** "search" quando o link abre a busca da loja já filtrada pelo jogo (sem página direta conhecida) */
  linkType?: 'product' | 'search'
  endsAt?: string | null
  /** 0–100 */
  rating?: number | null
  ratingLabel?: string
  platforms?: string[]
  /** posição na ordenação de popularidade da própria loja (menor = mais popular) */
  popularity?: number
  /** incluso em assinatura (ex.: PS Plus Extra, Game Pass) */
  subscription?: string
}

export interface FreeGame {
  id: string
  key: string
  title: string
  store: StoreId
  image?: string
  url: string
  startsAt: string
  endsAt: string
  status: 'now' | 'upcoming'
  originalPrice?: string
  description?: string
}

export interface StoreSummary {
  id: StoreId
  name: string
  count: number
  currency: Currency
}

export interface DealsData {
  updatedAt: string
  stores: StoreSummary[]
  deals: Deal[]
  free: FreeGame[]
}

/* ---------------------------------- Lançamentos ----------------------------------- */

export interface UpcomingGame {
  id: string
  key: string
  title: string
  /** YYYY-MM-DD quando a data é exata */
  date: string | null
  /** texto amigável: "19 nov 2026", "Q1 2027", "2027", "A definir" */
  dateText: string
  year: number | null
  month: number | null
  quarter: string | null
  platforms: string[]
  genres: string[]
  type?: string
  developer?: string
  publisher?: string
  image?: string
  /** arte grande em paisagem, quando disponível */
  hero?: string
  steamAppId?: number
  /** posição entre os mais desejados da Steam */
  wishlistRank?: number
  /** "hype" do IGDB (quando configurado) */
  hype?: number
  /** jogo com artigo próprio na Wikipedia, em lista de desejos ou com hype */
  notable: boolean
  sources: string[]
  url?: string
  summary?: string
}

export interface UpcomingData {
  updatedAt: string
  years: number[]
  games: UpcomingGame[]
}

/* ------------------------------------ Em alta ------------------------------------- */

export interface TwitchStream {
  user: string
  login: string
  viewers: number
  title: string
  thumbnail: string
  language: string
}

export interface TwitchGame {
  rank: number
  id: string
  key: string
  name: string
  boxArt: string
  viewers: number
  channels: number
  topStreams: TwitchStream[]
}

export interface YouTubeVideo {
  id: string
  title: string
  channel: string
  views: number
  likes?: number
  thumbnail: string
  publishedAt: string
  region: string
}

export interface HypeSignal {
  source: 'steam-players' | 'steam-sellers' | 'twitch' | 'youtube' | 'wishlist' | 'xbox' | 'playstation'
  label: string
  rank: number
  value?: number
}

export interface HypeEntry {
  key: string
  name: string
  image?: string
  hero?: string
  poster?: string
  score: number
  signals: HypeSignal[]
}

export interface TrendingData {
  updatedAt: string
  configured: { twitch: boolean; youtube: boolean; igdb: boolean }
  twitch: TwitchGame[]
  youtube: YouTubeVideo[]
  steamTopSellers: SimpleGame[]
  psTopSellers: SimpleGame[]
  xboxPopular: SimpleGame[]
  hype: HypeEntry[]
}

/* ----------------------------------- Premiações ----------------------------------- */

export interface AwardNominee {
  title: string
  key: string
  credit?: string
  winner: boolean
  image?: string
}

export interface AwardCategory {
  name: string
  group?: string
  nominees: AwardNominee[]
}

export interface AwardEvent {
  id: string
  org: 'tga' | 'bafta' | 'dice' | string
  name: string
  year: number
  date: string | null
  status: 'upcoming' | 'nominees' | 'finished'
  url?: string
  note?: string
  categories: AwardCategory[]
  leaders: { title: string; key: string; nominations: number; wins: number; image?: string }[]
}

export interface AwardsData {
  updatedAt: string
  events: AwardEvent[]
}
