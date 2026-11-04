import type { TwitchGame, TwitchStream } from '../../../src/types.ts'
import { getJson, request } from '../lib/http.ts'
import { gameKey } from '../lib/util.ts'

/**
 * Twitch Helix (credenciais de app gratuitas em https://dev.twitch.tv/console/apps).
 * As mesmas credenciais também liberam a API do IGDB.
 */
const HELIX = 'https://api.twitch.tv/helix'

let tokenCache: { token: string; exp: number } | null = null

export const twitchConfigured = () => !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET)

export async function twitchToken(): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.token
  const res = await request('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: 'client_credentials',
    }).toString(),
    retries: 1,
  })
  const j: any = await res.json()
  tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 }
  return tokenCache.token
}

async function helix(path: string, query: Record<string, string | number | undefined> = {}) {
  const token = await twitchToken()
  return getJson(`${HELIX}${path}`, {
    query,
    headers: { 'Client-Id': process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${token}` },
  })
}

const NON_GAMES = new Set(['509658', '26936', '509660', '518203', '509663', '509667', '417752', '509670', '1469308723'])
// Just Chatting, Music, Art, Sports, Special Events, Food & Drink, Talk Shows & Podcasts, Science & Technology, Software and Game Development

/**
 * Agrega as ~1.500 lives com mais espectadores para estimar a audiência de cada jogo
 * e destacar os streamers principais.
 */
export async function fetchTwitchTopGames(pages = 15): Promise<TwitchGame[]> {
  const streams: any[] = []
  let cursor: string | undefined
  for (let p = 0; p < pages; p++) {
    const j = await helix('/streams', { first: 100, type: 'live', after: cursor })
    streams.push(...(j.data ?? []))
    cursor = j.pagination?.cursor
    if (!cursor) break
  }

  type Agg = { id: string; name: string; viewers: number; channels: number; top: TwitchStream[] }
  const byGame = new Map<string, Agg>()
  for (const s of streams) {
    if (!s.game_id || NON_GAMES.has(s.game_id)) continue
    const g: Agg = byGame.get(s.game_id) ?? { id: s.game_id, name: s.game_name, viewers: 0, channels: 0, top: [] }
    g.viewers += s.viewer_count
    g.channels += 1
    if (g.top.length < 4)
      g.top.push({
        user: s.user_name,
        login: s.user_login,
        viewers: s.viewer_count,
        title: s.title,
        thumbnail: String(s.thumbnail_url).replace('{width}', '440').replace('{height}', '248'),
        language: s.language,
      })
    byGame.set(s.game_id, g)
  }

  const ranked = [...byGame.values()].sort((a, b) => b.viewers - a.viewers).slice(0, 40)
  const art = new Map<string, string>()
  if (ranked.length) {
    const qs = ranked.map((g) => `id=${g.id}`).join('&')
    const token = await twitchToken()
    const j = await getJson(`${HELIX}/games?${qs}`, {
      headers: { 'Client-Id': process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${token}` },
    })
    for (const g of j.data ?? []) art.set(g.id, String(g.box_art_url).replace('{width}', '285').replace('{height}', '380'))
  }

  return ranked.map((g, i) => ({
    rank: i + 1,
    id: g.id,
    key: gameKey(g.name),
    name: g.name,
    boxArt: art.get(g.id) ?? `https://static-cdn.jtvnw.net/ttv-boxart/${g.id}-285x380.jpg`,
    viewers: g.viewers,
    channels: g.channels,
    topStreams: g.top,
  }))
}
