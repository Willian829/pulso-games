import type { StoreId } from '../types'

export interface StoreMeta {
  name: string
  short: string
  color: string
  /** cor do texto sobre a cor da loja */
  ink: string
}

export const STORES: Record<StoreId, StoreMeta> = {
  steam: { name: 'Steam', short: 'Steam', color: '#1b2838', ink: '#66c0f4' },
  epic: { name: 'Epic Games', short: 'Epic', color: '#2a2a2a', ink: '#ffffff' },
  xbox: { name: 'Xbox', short: 'Xbox', color: '#107c10', ink: '#ffffff' },
  playstation: { name: 'PlayStation', short: 'PS Store', color: '#0070d1', ink: '#ffffff' },
  gog: { name: 'GOG', short: 'GOG', color: '#86328a', ink: '#ffffff' },
  humble: { name: 'Humble Store', short: 'Humble', color: '#cc2929', ink: '#ffffff' },
  fanatical: { name: 'Fanatical', short: 'Fanatical', color: '#ff9800', ink: '#1a1200' },
  gmg: { name: 'Green Man Gaming', short: 'GMG', color: '#00bf63', ink: '#05220f' },
  ubisoft: { name: 'Ubisoft Store', short: 'Ubisoft', color: '#0e82cf', ink: '#ffffff' },
  gamersgate: { name: 'GamersGate', short: 'GamersGate', color: '#2b3a55', ink: '#ffffff' },
  indiegala: { name: 'IndieGala', short: 'IndieGala', color: '#e2393b', ink: '#ffffff' },
  gamesplanet: { name: 'Gamesplanet', short: 'Gamesplanet', color: '#1f4e8c', ink: '#ffffff' },
  wingamestore: { name: 'WinGameStore', short: 'WinGame', color: '#2a5db0', ink: '#ffffff' },
  gamebillet: { name: 'GameBillet', short: 'GameBillet', color: '#f05a28', ink: '#ffffff' },
  dreamgame: { name: 'DreamGame', short: 'DreamGame', color: '#6c3fd1', ink: '#ffffff' },
  gamesload: { name: 'Gamesload', short: 'Gamesload', color: '#e4002b', ink: '#ffffff' },
}

export const storeMeta = (id: StoreId) => STORES[id] ?? { name: id, short: id, color: '#333', ink: '#fff' }

/** Identifica a loja a partir de uma URL (usado em links de rankings). */
export function storeFromUrl(url: string): StoreId | null {
  if (/store\.steampowered\.com/.test(url)) return 'steam'
  if (/store\.playstation\.com/.test(url)) return 'playstation'
  if (/xbox\.com/.test(url)) return 'xbox'
  if (/epicgames\.com/.test(url)) return 'epic'
  if (/gog\.com/.test(url)) return 'gog'
  return null
}

/** Texto do botão de uma oferta: página do produto ou busca da loja. */
export const dealCta = (store: StoreId, linkType?: 'product' | 'search') =>
  linkType === 'search' ? `Buscar na ${storeMeta(store).short}` : `Ver na ${storeMeta(store).short}`

/** Slug de categoria da Twitch ("PUBG: BATTLEGROUNDS" → "pubg-battlegrounds"). */
export const twitchCategorySlug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'™®©]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Famílias de plataforma para filtros. */
export const PLATFORM_FAMILIES = [
  { id: 'pc', label: 'PC', match: /^(PC|Mac|Linux)$/ },
  { id: 'playstation', label: 'PlayStation', match: /^PS/ },
  { id: 'xbox', label: 'Xbox', match: /^Xbox/ },
  { id: 'nintendo', label: 'Nintendo', match: /^Switch/ },
  { id: 'mobile', label: 'Mobile', match: /^(iOS|Android)$/ },
  { id: 'vr', label: 'VR', match: /(VR|Quest|Vision)/ },
] as const

export type PlatformFamily = (typeof PLATFORM_FAMILIES)[number]['id']

export function platformFamilies(platforms: string[]): PlatformFamily[] {
  return PLATFORM_FAMILIES.filter((f) => platforms.some((p) => f.match.test(p))).map((f) => f.id)
}

const SHORT: Record<string, string> = {
  'Xbox Series': 'XSX',
  'Xbox One': 'XB1',
  'Switch 2': 'NS2',
  Switch: 'NS',
  'Meta Quest': 'Quest',
  'PS VR2': 'PSVR2',
  'PS VR': 'PSVR',
  Android: 'Android',
}
export const platformShort = (p: string) => SHORT[p] ?? p
