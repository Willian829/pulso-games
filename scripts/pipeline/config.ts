/**
 * Configuração editável do pipeline.
 */

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** Datas conhecidas das cerimônias (usadas enquanto a Wikipedia ainda não tem a página do ano). */
export const CEREMONY_DATES: Record<string, string> = {
  'tga-2024': '2024-12-12',
  'tga-2025': '2025-12-11',
  'tga-2026': '2026-12-10',
  'bafta-2025': '2025-04-08',
  'bafta-2026': '2026-04-17',
  'dice-2025': '2025-02-13',
  'dice-2026': '2026-02-12',
}

export interface AwardConfig {
  id: string
  org: string
  name: string
  year: number
  page: string
  /** mantém o evento mesmo sem página na Wikipedia (cerimônia futura) */
  keepIfMissing?: boolean
  note?: string
}

/** Premiações acompanhadas. O pipeline tenta o ano atual e o anterior. */
export function awardEvents(year: number): AwardConfig[] {
  const list: AwardConfig[] = []
  for (const y of [year, year - 1]) {
    list.push({
      id: `tga-${y}`,
      org: 'tga',
      name: 'The Game Awards',
      year: y,
      page: `The Game Awards ${y}`,
      keepIfMissing: y === year,
      note: 'Os indicados costumam ser anunciados em meados de novembro; a página é atualizada automaticamente.',
    })
  }
  for (const y of [year + 1, year]) {
    list.push({ id: `bafta-${y}`, org: 'bafta', name: 'BAFTA Games Awards', year: y, page: `${ordinal(y - 2004)} British Academy Games Awards` })
    list.push({ id: `dice-${y}`, org: 'dice', name: 'D.I.C.E. Awards', year: y, page: `${ordinal(y - 1997)} Annual D.I.C.E. Awards` })
  }
  return list
}

/**
 * Ajustes manuais por chave de jogo (ver gameKey()). Útil para exclusivos de console
 * sem página na Steam ou para corrigir correspondências erradas.
 */
export const OVERRIDES: Record<string, { steamAppId?: number; image?: string; title?: string }> = {}

/** Quantas buscas por capa (Steam) fazer por execução — o resultado fica em cache. */
export const MAX_IMAGE_LOOKUPS = Number(process.env.MAX_IMAGE_LOOKUPS ?? 90)
