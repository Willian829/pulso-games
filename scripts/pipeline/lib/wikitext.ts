/**
 * Utilitários mínimos para ler wikitext da Wikipedia:
 * - remoção de marcação (links, templates, refs, negrito/itálico)
 * - parser de tabelas com suporte a rowspan/colspan
 */

const ATTR_RE =
  /^\s*((?:(?:rowspan|colspan|style|class|align|valign|width|id|scope|data-sort-value|bgcolor|nowrap)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s|]+)\s*)+)(?:\|(?!\|))?(.*)$/is

/** Remove refs e comentários (antes de qualquer outra coisa). */
export function stripRefs(s: string) {
  return s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
}

function splitParams(inner: string): string[] {
  // Divide por "|" que não esteja dentro de [[...]]
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (let i = 0; i < inner.length; i++) {
    const two = inner.slice(i, i + 2)
    if (two === '[[') {
      depth++
      cur += two
      i++
      continue
    }
    if (two === ']]') {
      depth = Math.max(0, depth - 1)
      cur += two
      i++
      continue
    }
    if (inner[i] === '|' && depth === 0) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += inner[i]
  }
  out.push(cur)
  return out
}

function renderTemplate(inner: string): string {
  const parts = splitParams(inner)
  const name = parts[0].trim().toLowerCase()
  const positional = parts.slice(1).filter((p) => !/^\s*[\w-]+\s*=/.test(p))
  const p = (i: number) => (positional[i] ?? '').trim()
  switch (name) {
    case "'":
      return "'"
    case '--)':
      return ')'
    case '(--':
      return '('
    case '!':
      return '|'
    case 'ndash':
    case 'snd':
      return ' – '
    case 'nbsp':
      return ' '
    case 'sort':
      return p(1) || p(0)
    case 'color':
      return p(1)
    case 'lang':
      return p(1)
    case 'resize':
      return positional.length > 1 ? p(1) : p(0)
    case 'ill':
    case 'interlanguage link':
      return `[[${p(0)}]]`
    case 'efn':
    case 'efn-ua':
    case 'refn':
    case 'cn':
    case 'citation needed':
    case 'unknown':
    case 'tba':
    case 'tbd':
    case 'tbc':
    case 'double-dagger':
    case 'dagger':
    case 'flagicon':
    case 'refh':
    case 'table alignment':
    case 'dynamic list':
    case 'nowrap begin':
    case 'nowrap end':
      return ''
    default:
      if (name.startsWith('#invoke')) return ''
      if (name.startsWith('cite')) return ''
      return positional.length === 1 ? p(0) : positional.length ? p(0) : ''
  }
}

/** Expande/remove templates aninhados de dentro para fora. */
export function expandTemplates(s: string) {
  let prev = ''
  let cur = s
  let guard = 0
  while (prev !== cur && guard++ < 20) {
    prev = cur
    cur = cur.replace(/\{\{([^{}]*)\}\}/g, (_, inner: string) => renderTemplate(inner))
  }
  return cur
}

/** Converte wikitext em texto simples. */
export function plain(s: string): string {
  let t = stripRefs(s)
  t = expandTemplates(t)
  t = t
    .replace(/\[\[(?:File|Image|Arquivo):[^\]]*\]\]/gi, '')
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]]*)\]\]/g, (_, a: string) => a.replace(/#.*$/, ''))
    .replace(/\[https?:[^\s\]]+\s([^\]]+)\]/g, '$1')
    .replace(/\[https?:[^\]]+\]/g, '')
    .replace(/'{2,5}/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;| /g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim()
  return t
}

/** Primeiro link interno ([[Alvo|...]]) de um trecho, se houver. */
export function firstLink(s: string): string | null {
  const m = stripRefs(s).match(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/)
  if (!m) return null
  if (/^(File|Image|Category):/i.test(m[1])) return null
  return m[1].trim()
}

/** Primeiro trecho em itálico (normalmente o nome do jogo). */
export function firstItalic(s: string): string | null {
  const t = expandTemplates(stripRefs(s))
  const m = t.match(/(?<!')''(?!')([^']+?)''(?!')/) || t.match(/'''''(.+?)''/)
  if (!m) return null
  const out = plain(m[1]).replace(/[\s–—\-:,(]+$/, '').trim()
  return out || null
}

export interface WikiCell {
  raw: string
  text: string
  header: boolean
}

export interface WikiTable {
  /** linhas já "expandidas": rowspans/colspans copiados para as posições cobertas */
  rows: WikiCell[][]
  /** posição (caractere) do início da tabela no wikitext */
  start: number
}

function parseCell(raw: string, header: boolean) {
  let content = raw
  let rowspan = 1
  let colspan = 1
  const m = content.match(ATTR_RE)
  if (m) {
    const attrs = m[1]
    const rs = attrs.match(/rowspan\s*=\s*"?(\d+)/i)
    const cs = attrs.match(/colspan\s*=\s*"?(\d+)/i)
    if (rs) rowspan = Number(rs[1])
    if (cs) colspan = Number(cs[1])
    content = m[2]
  }
  return { content, rowspan, colspan, header }
}

/** Divide uma linha de células ("a || b || c") respeitando [[ ]] e {{ }}. */
function splitInline(line: string, sep: '||' | '!!'): string[] {
  const out: string[] = []
  let depthL = 0
  let depthT = 0
  let cur = ''
  for (let i = 0; i < line.length; i++) {
    const two = line.slice(i, i + 2)
    if (two === '[[') depthL++
    else if (two === ']]') depthL = Math.max(0, depthL - 1)
    else if (two === '{{') depthT++
    else if (two === '}}') depthT = Math.max(0, depthT - 1)
    if (two === sep && depthL === 0 && depthT === 0) {
      out.push(cur)
      cur = ''
      i++
      continue
    }
    cur += line[i]
  }
  out.push(cur)
  return out
}

/** Extrai todas as tabelas de um wikitext (não aninhadas). */
export function parseTables(wikitext: string): WikiTable[] {
  const text = stripRefs(wikitext)
  const tables: WikiTable[] = []
  const lines = text.split('\n')
  let offset = 0
  let inTable = false
  let start = 0
  let rawRows: { content: string; rowspan: number; colspan: number; header: boolean }[][] = []
  let row: (typeof rawRows)[number] | null = null
  let lastCell: (typeof rawRows)[number][number] | null = null
  let nested = 0

  const flushTable = () => {
    if (row && row.length) rawRows.push(row)
    // Expande rowspan/colspan
    const grid: WikiCell[][] = []
    const pending: { cell: WikiCell; left: number }[] = []
    for (const r of rawRows) {
      const out: WikiCell[] = []
      let col = 0
      const take = () => {
        while (pending[col] && pending[col].left > 0) {
          out.push(pending[col].cell)
          pending[col].left--
          col++
        }
      }
      for (const c of r) {
        take()
        const cell: WikiCell = { raw: c.content.trim(), text: plain(c.content), header: c.header }
        for (let k = 0; k < c.colspan; k++) {
          out.push(cell)
          if (c.rowspan > 1) pending[col] = { cell, left: c.rowspan - 1 }
          col++
        }
      }
      take()
      grid.push(out)
    }
    tables.push({ rows: grid, start })
    rawRows = []
    row = null
    lastCell = null
  }

  for (const line of lines) {
    const t = line.trimStart()
    if (!inTable) {
      if (t.startsWith('{|')) {
        inTable = true
        start = offset
        rawRows = []
        row = []
      }
    } else if (t.startsWith('{|')) {
      nested++
      if (lastCell) lastCell.content += '\n' + line
    } else if (t.startsWith('|}')) {
      if (nested > 0) {
        nested--
        if (lastCell) lastCell.content += '\n' + line
      } else {
        flushTable()
        inTable = false
      }
    } else if (nested > 0) {
      if (lastCell) lastCell.content += '\n' + line
    } else if (t.startsWith('|-')) {
      if (row && row.length) rawRows.push(row)
      row = []
      lastCell = null
    } else if (t.startsWith('|+')) {
      // legenda — ignora
    } else if (t.startsWith('!')) {
      for (const part of splitInline(t.slice(1), '!!')) {
        const c = parseCell(part, true)
        row!.push(c)
        lastCell = c
      }
    } else if (t.startsWith('|')) {
      for (const part of splitInline(t.slice(1), '||')) {
        const c = parseCell(part, false)
        row!.push(c)
        lastCell = c
      }
    } else if (lastCell) {
      lastCell.content += '\n' + line
    }
    offset += line.length + 1
  }
  return tables
}

/** Retorna o trecho de uma seção (== Título ==) até a próxima seção de mesmo nível ou superior. */
export function section(wikitext: string, title: RegExp): string | null {
  const re = /^(={2,6})\s*(.+?)\s*\1\s*$/gm
  let m: RegExpExecArray | null
  let found: { level: number; index: number } | null = null
  while ((m = re.exec(wikitext))) {
    const level = m[1].length
    if (found) {
      if (level <= found.level) return wikitext.slice(found.index, m.index)
    } else if (title.test(m[2])) {
      found = { level, index: m.index }
    }
  }
  return found ? wikitext.slice(found.index) : null
}
