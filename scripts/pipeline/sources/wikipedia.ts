import type { AwardCategory, AwardNominee } from '../../../src/types.ts'
import { getJson } from '../lib/http.ts'
import { gameKey } from '../lib/util.ts'
import { firstItalic, firstLink, parseTables, plain, section, stripRefs, type WikiTable } from '../lib/wikitext.ts'

const API = 'https://en.wikipedia.org/w/api.php'

export async function wikitext(page: string): Promise<{ title: string; text: string } | null> {
  const j = await getJson(API, {
    query: { action: 'parse', page, prop: 'wikitext', format: 'json', formatversion: 2, redirects: 1 },
  })
  if (j.error) {
    if (j.error.code === 'missingtitle') return null
    throw new Error(j.error.info || j.error.code)
  }
  return { title: j.parse.title, text: j.parse.wikitext }
}

/* ------------------------------------------------------------------------------------ */
/*  Lançamentos: "List of video games released in AAAA"                                  */
/* ------------------------------------------------------------------------------------ */

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

const PLATFORM_MAP: Record<string, string> = {
  WIN: 'PC',
  OSX: 'Mac',
  MAC: 'Mac',
  LIN: 'Linux',
  PS4: 'PS4',
  PS5: 'PS5',
  XBO: 'Xbox One',
  'XBX/S': 'Xbox Series',
  'XBX/S|': 'Xbox Series',
  XBXS: 'Xbox Series',
  NS: 'Switch',
  NS2: 'Switch 2',
  IOS: 'iOS',
  DROID: 'Android',
  QUEST: 'Meta Quest',
  PSVR: 'PS VR',
  PSVR2: 'PS VR2',
  LUNA: 'Luna',
  AVP: 'Vision Pro',
}

export function normalizePlatforms(text: string): string[] {
  const out = new Set<string>()
  for (const raw of text.split(/[,/]\s*(?=[A-Za-z])|,\s*/)) {
    const t = raw.trim()
    if (!t) continue
    const code = t.toUpperCase().replace(/\s+/g, '')
    out.add(PLATFORM_MAP[code] ?? PLATFORM_MAP[code.replace(/\|$/, '')] ?? t)
  }
  // "XBX/S" pode ter sido partido em "XBX" e "S"
  if (out.has('XBX') || out.has('S')) {
    out.delete('XBX')
    out.delete('S')
    out.add('Xbox Series')
  }
  return [...out]
}

export interface WikiRelease {
  title: string
  link: string | null
  date: string | null
  year: number
  month: number | null
  quarter: string | null
  dateText: string
  platforms: string[]
  genres: string[]
  type?: string
  developer?: string
  publisher?: string
}

function columnIndex(headers: string[], re: RegExp) {
  return headers.findIndex((h) => re.test(h))
}

function parseApprox(text: string, year: number): { quarter: string | null; month: number | null; dateText: string } {
  const t = text.trim()
  const q = t.match(/\bQ([1-4])\b/i)
  if (q) return { quarter: `Q${q[1]}`, month: null, dateText: `Q${q[1]} ${year}` }
  const mIdx = MONTHS.findIndex((m) => t.toLowerCase().includes(m))
  if (mIdx >= 0) return { quarter: null, month: mIdx + 1, dateText: `${String(mIdx + 1).padStart(2, '0')}/${year}` }
  const seasons: Record<string, string> = { spring: 'Primavera (HN)', summer: 'Meio do ano', fall: 'Fim do ano', autumn: 'Fim do ano', winter: 'Inverno (HN)', early: 'Início do ano', mid: 'Meio do ano', late: 'Fim do ano', holiday: 'Fim do ano' }
  for (const [k, v] of Object.entries(seasons)) if (t.toLowerCase().includes(k)) return { quarter: null, month: null, dateText: `${v} ${year}` }
  return { quarter: null, month: null, dateText: String(year) }
}

function parseReleaseTable(table: WikiTable, year: number, unscheduled: boolean): WikiRelease[] {
  const headerRow = table.rows.find((r) => r.length && r.every((c) => c.header))
  if (!headerRow) return []
  const headers = headerRow.map((c) => c.text.toLowerCase())
  const iTitle = columnIndex(headers, /^title/)
  const iDate = columnIndex(headers, /release date|^date/)
  const iApprox = columnIndex(headers, /approximate/)
  const iPlat = columnIndex(headers, /platform/)
  const iType = columnIndex(headers, /type/)
  const iGenre = columnIndex(headers, /genre/)
  const iDev = columnIndex(headers, /developer/)
  const iPub = columnIndex(headers, /publisher/)
  if (iTitle < 0) return []

  const out: WikiRelease[] = []
  for (const row of table.rows) {
    if (row === headerRow || row.every((c) => c.header) || row.length <= iTitle) continue
    const titleCell = row[iTitle]
    const title = titleCell.text.replace(/\s*\[\w+\]$/, '').trim()
    if (!title) continue

    let date: string | null = null
    let month: number | null = null
    let quarter: string | null = null
    let dateText = String(year)
    if (!unscheduled && iDate >= 0) {
      const d = row[iDate]?.text ?? ''
      const mIdx = MONTHS.findIndex((m) => d.toLowerCase().startsWith(m))
      const day = Number(d.match(/\b(\d{1,2})\b/)?.[1])
      if (mIdx >= 0) {
        month = mIdx + 1
        if (day) {
          date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          dateText = date
        } else dateText = `${String(month).padStart(2, '0')}/${year}`
      }
    } else if (iApprox >= 0) {
      ;({ quarter, month, dateText } = parseApprox(row[iApprox]?.text ?? '', year))
    }

    out.push({
      title,
      link: firstLink(titleCell.raw),
      date,
      year,
      month,
      quarter,
      dateText,
      platforms: iPlat >= 0 ? normalizePlatforms(row[iPlat]?.text ?? '') : [],
      genres: iGenre >= 0 ? (row[iGenre]?.text ?? '').split(/,\s*/).filter(Boolean) : [],
      type: iType >= 0 ? row[iType]?.text || undefined : undefined,
      developer: iDev >= 0 ? row[iDev]?.text || undefined : undefined,
      publisher: iPub >= 0 ? row[iPub]?.text || undefined : undefined,
    })
  }
  return out
}

export async function fetchWikiReleases(year: number): Promise<WikiRelease[]> {
  const page = await wikitext(`List of video games released in ${year}`)
  if (!page) return []
  const list = stripRefs(section(page.text, /^List$/i) ?? page.text)
  const unschedIdx = list.search(/^===\s*Unscheduled/m)
  const out: WikiRelease[] = []
  for (const t of parseTables(list)) {
    const isUnscheduled = unschedIdx >= 0 && t.start >= unschedIdx
    out.push(...parseReleaseTable(t, year, isUnscheduled))
  }
  return out
}

/* ------------------------------------------------------------------------------------ */
/*  Premiações (The Game Awards, BAFTA, D.I.C.E.)                                        */
/* ------------------------------------------------------------------------------------ */

function parseNomineeLine(body: string, depth: number, hasDeeper: boolean): AwardNominee | null {
  const isDagger = /\{\{\s*(double-dagger|dagger|‡)\s*\}\}|‡/i.test(body)
  const startsBold = /^'''/.test(body.trim())
  const winner = isDagger || (depth === 1 && hasDeeper && startsBold)
  const text = plain(body).replace(/[‡†]/g, '').trim()
  if (!text) return null
  const game = firstItalic(body)
  let title: string
  let credit: string
  if (game && text.startsWith(game)) {
    // "Jogo (Estúdio, Editora) — Pessoas" ou "Jogo – Estúdio / Editora"
    title = game
    credit = text
      .slice(game.length)
      .replace(/^[\s–—\-:]+/, '')
      .replace(/^\((.*?)\)/, '$1')
      .replace(/\s+[–—]\s+$/, '')
  } else {
    const [t, ...rest] = text.split(/\s+[–—]\s+|\s+-\s+/)
    title = t
    credit = rest.join(' – ')
  }
  return {
    title: title.trim(),
    credit: credit.trim() || undefined,
    winner,
    key: gameKey(game || title),
  }
}

function parseCellNominees(raw: string): AwardNominee[] {
  const lines = stripRefs(raw)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^\*+/.test(l))
  const hasDeeper = lines.some((l) => /^\*\*/.test(l))
  const out: AwardNominee[] = []
  for (const l of lines) {
    const depth = l.match(/^\*+/)![0].length
    const n = parseNomineeLine(l.replace(/^\*+\s*/, ''), depth, hasDeeper)
    if (n) out.push(n)
  }
  return out
}

/** Extrai categorias de premiação a partir das tabelas "categoria / indicados". */
export function parseAwardTables(text: string): AwardCategory[] {
  const sec = stripRefs(
    section(text, /^(winners and nominees|nominees and winners|winners|nominees|awards|award winners and nominees)$/i) ?? text,
  )
  const groupHeads = [...sec.matchAll(/^={3,5}\s*(.+?)\s*={3,5}\s*$/gm)].map((m) => ({
    name: plain(m[1]),
    index: m.index!,
  }))
  const categories: AwardCategory[] = []
  for (const table of parseTables(sec)) {
    const group = groupHeads.filter((g) => g.index < table.start).pop()?.name
    if (group && /multiple/i.test(group)) continue
    let heads: string[] = []
    for (const row of table.rows) {
      if (row.length && row.every((c) => c.header)) {
        heads = row.map((c) => c.text)
        continue
      }
      row.forEach((cell, i) => {
        // BAFTA/D.I.C.E.: o nome da categoria vem dentro da célula via {{Award category|cor|Nome}}
        const inline = cell.raw.match(/\{\{\s*Award category\s*\|[^|]*\|((?:[^{}]|\{\{[^{}]*\}\})+)\}\}/i)
        const name = inline ? plain(inline[1]) : heads[i]
        const nominees = parseCellNominees(cell.raw)
        if (!name || !nominees.length) return
        if (/^(award|category|categories)$/i.test(name)) return
        if (categories.some((c) => c.name === name && c.nominees.length === nominees.length)) return
        categories.push({ name, group, nominees })
      })
    }
  }
  return categories
}

export async function fetchAwardPage(page: string) {
  const p = await wikitext(page)
  // Redirecionou para outro artigo (ex.: "The Game Awards 2026" → "The Game Awards"): ainda não existe
  if (!p || p.title.replace(/_/g, ' ').toLowerCase() !== page.toLowerCase()) return null
  const d = p.text.match(/\|\s*date\s*=\s*\{\{\s*(?:start date|dts|date)[^|]*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})/i)
  let date = d ? `${d[1]}-${d[2].padStart(2, '0')}-${d[3].padStart(2, '0')}` : null
  if (!date) {
    const raw = p.text.match(/\|\s*date\s*=\s*([^\n|]+)/i)?.[1]
    const parsed = raw ? Date.parse(plain(raw).replace(/(\d+)(st|nd|rd|th)/, '$1') + ' UTC') : NaN
    if (!Number.isNaN(parsed)) date = new Date(parsed).toISOString().slice(0, 10)
  }
  return {
    title: p.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
    date,
    categories: parseAwardTables(p.text),
  }
}
