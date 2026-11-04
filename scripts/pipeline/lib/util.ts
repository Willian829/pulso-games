import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
export const DATA_DIR = join(ROOT, 'public', 'data')

/**
 * Chave canônica de um jogo, usada para cruzar fontes diferentes
 * ("Cyberpunk 2077: Ultimate Edition" → "cyberpunk 2077").
 */
export function gameKey(name: string): string {
  let s = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[™®©℠]/g, '')
    .replace(/&nbsp;|\u00a0/g, ' ')
    .replace(/\((?:windows|pc|ps4|ps5|xbox[^)]*|prévia do jogo|previa do jogo|game preview|early access)\)/g, ' ')
    .replace(/\b(?:ps4\s*(?:e|&|and|\/)\s*ps5|ps5\s*(?:e|&|and|\/)\s*ps4|ps4|ps5)\b/g, ' ')
    .replace(/\bpara\s+xbox.*$/g, ' ')
    .replace(/\bfor\s+xbox.*$/g, ' ')
    .replace(/\bxbox series x\s*\|?\s*s\b/g, ' ')
  // Remove sufixos de edição: "- Deluxe Edition", "Edição Definitiva", "Standard Edition" etc.
  s = s
    .replace(
      /[\s:\-–—]*(?:(?:digital\s+)?(?:standard|deluxe|ultimate|gold|premium|complete|definitive|game of the year|goty|enhanced|collector'?s|digital|special|launch|cross-gen|vault|super deluxe|anniversary)\s+edition|edicao\s+(?:padrao|deluxe|ultimate|definitiva|completa|gold|premium|digital deluxe|cofre|especial|do colecionador)|edicao ultimate do|bundle|pacote)\b.*$/g,
      '',
    )
    .replace(/^edicao\s+\w+\s+do\s+/, '')
    .replace(/['’`"]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
  return s || name.toLowerCase().trim()
}

/** Slug amigável para URLs. */
export function slugify(name: string) {
  return gameKey(name).replace(/\s+/g, '-').slice(0, 80)
}

/** Similaridade (0–1) entre dois nomes, baseada em bigramas (Dice). */
export function similarity(a: string, b: string): number {
  const x = gameKey(a)
  const y = gameKey(b)
  if (x === y) return 1
  if (x.length < 2 || y.length < 2) return 0
  const grams = (s: string) => {
    const m = new Map<string, number>()
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2)
      m.set(g, (m.get(g) || 0) + 1)
    }
    return m
  }
  const gx = grams(x)
  const gy = grams(y)
  let inter = 0
  for (const [g, c] of gx) inter += Math.min(c, gy.get(g) || 0)
  return (2 * inter) / (x.length - 1 + (y.length - 1))
}

export async function writeData(file: string, data: unknown) {
  const path = join(DATA_DIR, file)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(data) + '\n', 'utf8')
  return path
}

/**
 * Lê a versão anterior de um arquivo de dados: primeiro do site publicado
 * (PREVIOUS_DATA_URL, usado no GitHub Actions), depois da cópia local.
 * Serve para manter histórico (sparklines) e como reserva quando uma fonte falha.
 */
export async function readPrevious<T>(file: string): Promise<T | null> {
  const base = process.env.PREVIOUS_DATA_URL?.replace(/\/$/, '')
  if (base) {
    try {
      const res = await fetch(`${base}/${file}`, { signal: AbortSignal.timeout(15_000) })
      if (res.ok) return (await res.json()) as T
    } catch {
      /* cai para a cópia local */
    }
  }
  try {
    return JSON.parse(await readFile(join(DATA_DIR, file), 'utf8')) as T
  } catch {
    return null
  }
}

export function uniqBy<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const it of items) {
    const k = key(it)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(it)
  }
  return out
}

/** Converte "R$1.234,56" / "$12.99" / "12,99" em número. */
export function parsePrice(text: string | number | null | undefined): number {
  if (typeof text === 'number') return text
  if (!text) return 0
  const t = String(text).replace(/[^\d.,]/g, '')
  if (!t) return 0
  // Formato brasileiro: ponto como milhar, vírgula como decimal
  if (t.includes(',')) return Number(t.replace(/\./g, '').replace(',', '.')) || 0
  return Number(t) || 0
}

export const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

export const isoNow = () => new Date().toISOString()

export function log(scope: string, msg: string) {
  const t = new Date().toISOString().slice(11, 19)
  console.log(`[${t}] ${scope.padEnd(12)} ${msg}`)
}
