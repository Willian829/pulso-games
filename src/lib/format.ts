import type { Currency } from '../types'

const nf = new Intl.NumberFormat('pt-BR')
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const money: Record<Currency, Intl.NumberFormat> = {
  BRL: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
  USD: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }),
}
const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

export const fmtNumber = (n: number) => nf.format(Math.round(n))
export const fmtCompact = (n: number) => compact.format(n)
export const fmtMoney = (n: number, c: Currency = 'BRL') => (n === 0 ? 'Grátis' : money[c].format(n))

export function timeAgo(iso: string | number | Date) {
  const d = new Date(iso).getTime()
  const diff = (d - Date.now()) / 1000
  const abs = Math.abs(diff)
  if (abs < 60) return 'agora mesmo'
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day')
  return rtf.format(Math.round(diff / (86400 * 30)), 'month')
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const monthName = (m: number) => MONTHS[m - 1]
export const monthShort = (m: number) => MONTHS_SHORT[m - 1]

/** "2026-11-19" → Date no fuso local (meia-noite) */
export const parseDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function fmtDay(iso: string, opts: { weekday?: boolean; year?: boolean } = {}) {
  const d = parseDay(iso)
  return d.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: opts.year === false ? undefined : 'numeric',
    weekday: opts.weekday ? 'short' : undefined,
  })
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Dias inteiros até uma data (negativo se já passou). */
export function daysUntil(iso: string) {
  const target = iso.length === 10 ? parseDay(iso) : new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (iso.length === 10) return Math.round((target.getTime() - today.getTime()) / 86400000)
  return Math.ceil((target.getTime() - Date.now()) / 86400000)
}

export function relativeDays(iso: string) {
  const d = daysUntil(iso)
  if (d === 0) return 'hoje'
  if (d === 1) return 'amanhã'
  if (d === -1) return 'ontem'
  if (d > 1 && d < 60) return `em ${d} dias`
  if (d < 0) return `há ${-d} dias`
  const months = Math.round(d / 30)
  return months < 12 ? `em ${months} meses` : `em ${Math.round(d / 365)} ano${d > 547 ? 's' : ''}`
}

export function plural(n: number, one: string, many: string) {
  return `${fmtNumber(n)} ${n === 1 ? one : many}`
}

/** Remove símbolos de marca para exibição. */
export const cleanName = (s: string) => s.replace(/[™®©]/g, '').replace(/\s{2,}/g, ' ').trim()

/** Cor estável a partir de um texto (para placeholders). */
export function hueOf(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}

export function initials(s: string) {
  const words = cleanName(s)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + (words.find((w, i) => i > 0 && /\p{L}|\d/u.test(w[0])) ?? words[1])[0]).toUpperCase()
}
