import type { YouTubeVideo } from '../../../src/types.ts'
import { getJson } from '../lib/http.ts'

/** YouTube Data API v3 — vídeos em alta na categoria Games (20). Chave gratuita no Google Cloud. */
export const youtubeConfigured = () => !!process.env.YOUTUBE_API_KEY

export async function fetchYouTubeTrending(regions = ['BR', 'US']): Promise<YouTubeVideo[]> {
  const out: YouTubeVideo[] = []
  for (const regionCode of regions) {
    const j = await getJson('https://www.googleapis.com/youtube/v3/videos', {
      query: {
        part: 'snippet,statistics',
        chart: 'mostPopular',
        videoCategoryId: 20,
        regionCode,
        maxResults: 30,
        hl: 'pt',
        key: process.env.YOUTUBE_API_KEY,
      },
    })
    for (const v of j.items ?? []) {
      const th = v.snippet?.thumbnails
      out.push({
        id: v.id,
        title: v.snippet?.localized?.title || v.snippet?.title,
        channel: v.snippet?.channelTitle,
        views: Number(v.statistics?.viewCount ?? 0),
        likes: v.statistics?.likeCount ? Number(v.statistics.likeCount) : undefined,
        thumbnail: (th?.maxres || th?.standard || th?.high || th?.medium || th?.default)?.url,
        publishedAt: v.snippet?.publishedAt,
        region: regionCode,
      })
    }
  }
  return out
}
