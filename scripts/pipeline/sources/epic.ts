import type { FreeGame } from '../../../src/types.ts'
import { getJson } from '../lib/http.ts'
import { gameKey } from '../lib/util.ts'

const URL = 'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions'

function pickImage(images: any[] = []) {
  const order = ['OfferImageWide', 'DieselStoreFrontWide', 'featuredMedia', 'Thumbnail', 'OfferImageTall']
  for (const t of order) {
    const img = images.find((i) => i.type === t)
    if (img?.url) return img.url as string
  }
  return images[0]?.url as string | undefined
}

function slugOf(g: any): string | null {
  const s =
    g.catalogNs?.mappings?.find((m: any) => m.pageType === 'productHome')?.pageSlug ||
    g.offerMappings?.find((m: any) => m.pageType === 'productHome')?.pageSlug ||
    g.catalogNs?.mappings?.[0]?.pageSlug ||
    g.productSlug ||
    g.urlSlug
  if (!s || s === '[]') return null
  return String(s).replace(/\/home$/, '')
}

/** Jogos gratuitos (agora e próximos) da Epic Games Store. */
export async function fetchEpicFree(): Promise<FreeGame[]> {
  const j = await getJson(URL, { query: { locale: 'pt-BR', country: 'BR', allowCountries: 'BR' } })
  const elements: any[] = j?.data?.Catalog?.searchStore?.elements ?? []
  const out: FreeGame[] = []
  for (const g of elements) {
    const now = g.promotions?.promotionalOffers?.[0]?.promotionalOffers ?? []
    const next = g.promotions?.upcomingPromotionalOffers?.[0]?.promotionalOffers ?? []
    const freeNow = now.find((o: any) => o.discountSetting?.discountPercentage === 0)
    const freeNext = next.find((o: any) => o.discountSetting?.discountPercentage === 0)
    const offer = freeNow || freeNext
    if (!offer) continue
    // Mistérios ("Mystery Game") vêm sem slug; ainda assim mostramos
    const slug = slugOf(g)
    out.push({
      id: `epic-${g.id}`,
      key: gameKey(g.title),
      title: g.title,
      store: 'epic',
      image: pickImage(g.keyImages),
      url: slug ? `https://store.epicgames.com/pt-BR/p/${slug}` : 'https://store.epicgames.com/pt-BR/free-games',
      startsAt: offer.startDate,
      endsAt: offer.endDate,
      status: freeNow ? 'now' : 'upcoming',
      originalPrice: g.price?.totalPrice?.fmtPrice?.originalPrice,
      description: g.description,
    })
  }
  return out.sort((a, b) => (a.status === b.status ? a.startsAt.localeCompare(b.startsAt) : a.status === 'now' ? -1 : 1))
}
