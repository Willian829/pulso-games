import { request } from '../lib/http.ts'
import { twitchConfigured, twitchToken } from './twitch.ts'

/** IGDB (Twitch) — jogos futuros mais aguardados ("hype"). */
export const igdbConfigured = twitchConfigured

export interface IgdbGame {
  id: number
  name: string
  slug: string
  first_release_date?: number
  hypes?: number
  summary?: string
  cover?: { image_id: string }
  artworks?: { image_id: string }[]
  screenshots?: { image_id: string }[]
  platforms?: { abbreviation?: string; name: string }[]
  genres?: { name: string }[]
  involved_companies?: { developer: boolean; publisher: boolean; company: { name: string } }[]
  websites?: { category: number; url: string }[]
  external_games?: { category: number; uid: string }[]
}

async function igdb(endpoint: string, body: string): Promise<any[]> {
  const token = await twitchToken()
  const res = await request(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID!,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'content-type': 'text/plain',
    },
    body,
  })
  return (await res.json()) as any[]
}

const FIELDS =
  'name,slug,first_release_date,hypes,summary,cover.image_id,artworks.image_id,screenshots.image_id,' +
  'platforms.abbreviation,platforms.name,genres.name,involved_companies.developer,involved_companies.publisher,' +
  'involved_companies.company.name,external_games.category,external_games.uid'

export async function fetchIgdbUpcoming(): Promise<IgdbGame[]> {
  const now = Math.floor(Date.now() / 1000)
  const dated = await igdb(
    'games',
    `fields ${FIELDS}; where first_release_date > ${now} & hypes > 3 & version_parent = null; sort hypes desc; limit 250;`,
  )
  const undated = await igdb(
    'games',
    `fields ${FIELDS}; where first_release_date = null & hypes > 15 & version_parent = null & game_status != (6,8); sort hypes desc; limit 100;`,
  ).catch(() => [])
  return [...dated, ...undated]
}

export const igdbImage = (id: string, size: 't_cover_big' | 't_screenshot_big' | 't_1080p' | 't_720p' = 't_screenshot_big') =>
  `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg`
