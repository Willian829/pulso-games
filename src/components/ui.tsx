import { ArrowRight, ChevronLeft, ChevronRight, Search, Star, X } from 'lucide-react'
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { favorites, useIsFavorite } from '../lib/favorites'
import { cleanName, fmtNumber, hueOf, initials } from '../lib/format'
import { platformShort, storeMeta } from '../lib/stores'
import type { StoreId } from '../types'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/** Curva padrão das animações (saída suave, "fluida"). */
export const EASE = [0.16, 1, 0.3, 1] as const

/** Pede a imagem na largura indicada quando a loja permite (PlayStation, Xbox e Epic). */
export function hiRes(url: string | undefined, w = 1600) {
  if (!url) return url
  if (url.includes('image.api.playstation.com')) return url.replace(/\?w=\d+/, `?w=${w}`)
  if (url.includes('store-images.s-microsoft.com')) return url.replace(/w=\d+&h=\d+/, `w=${w}&h=${Math.round((w * 9) / 16)}`)
  if (/cdnd*.epicgames.com/.test(url) && !url.includes('?')) return `${url}?resize=1&w=${w}&quality=medium`
  return url
}

/* ---------------------------------- Logo ---------------------------------- */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="ecg shrink-0">
      <rect width="64" height="64" rx="18" fill="#0d0f14" />
      <rect x="1" y="1" width="62" height="62" rx="17" fill="none" stroke="var(--accent)" strokeOpacity=".3" strokeWidth="2" />
      <path d="M10 34h11l5-13 8 25 6-17 3 5h11" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ------------------------------- Ícones de marca ------------------------------- */
export const TwitchIcon = ({ className = 'size-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M4.3 3 3 6.4v13.1h4.6V22h2.6l2.5-2.5h3.7l5-5V3H4.3Zm15.4 10.6-2.9 2.9h-4.6l-2.5 2.5v-2.5H5.8V4.7h13.9v8.9ZM16.8 7.6h-1.7v5.1h1.7V7.6Zm-4.6 0h-1.7v5.1h1.7V7.6Z" />
  </svg>
)
export const YouTubeIcon = ({ className = 'size-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <rect x="1.5" y="5" width="21" height="14" rx="4.5" fill="currentColor" />
    <path d="m10 9.2 5.2 2.8-5.2 2.8V9.2Z" fill="var(--bg)" />
  </svg>
)
export const GitHubIcon = ({ className = 'size-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
  </svg>
)

/* -------------------------------- Imagem de jogo -------------------------------- */
interface GameImageProps {
  src?: string
  /** usada quando `src` falha (ex.: arte grande que não existe para o jogo) */
  fallback?: string
  alt: string
  className?: string
  /** "wide" (16:9 / capa da Steam) ou "poster" (2:3) */
  variant?: 'wide' | 'poster' | 'square'
  eager?: boolean
}

/** Imagem com carregamento progressivo e placeholder gerado (cor + iniciais) quando falta arte. */
export function GameImage({ src, fallback, alt, className, variant = 'wide', eager }: GameImageProps) {
  // estado por URL: evita que uma imagem já em cache (onLoad imediato) fique invisível
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState<string[]>([])
  const current = [src, fallback].find((s): s is string => !!s && !failed.includes(s))
  const loaded = !!current && loadedSrc === current
  const imgRef = useCallback(
    (el: HTMLImageElement | null) => {
      if (el && el.complete && el.naturalWidth > 0 && current) setLoadedSrc(current)
    },
    [current],
  )
  const hue = hueOf(alt)
  return (
    <div
      className={cx('relative overflow-hidden bg-surface-2', className)}
      style={
        !current
          ? {
              background: `radial-gradient(120% 90% at 0% 0%, hsl(${hue} 70% 38% / .55), transparent 60%), radial-gradient(100% 100% at 100% 100%, hsl(${(hue + 60) % 360} 70% 30% / .5), transparent 60%), var(--solid)`,
            }
          : undefined
      }
    >
      {current ? (
        <>
          {!loaded && <div className="skeleton absolute inset-0 rounded-none" />}
          <img
            ref={imgRef}
            src={current}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setLoadedSrc(current)}
            onError={() => setFailed((f) => [...f, current])}
            className={cx('game-img h-full w-full object-cover', loaded ? 'opacity-100' : 'opacity-0')}
          />
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className={cx('font-display font-bold tracking-tight text-white/85 drop-shadow', variant === 'poster' ? 'text-3xl' : 'text-2xl')}>
            {initials(alt)}
          </span>
        </div>
      )}
    </div>
  )
}

/* ---------------------------------- Sparkline ---------------------------------- */
function smoothPath(pts: [number, number][]) {
  const f = (n: number) => n.toFixed(1)
  if (pts.length < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])},${f(p[1])}`).join(' ')
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2
    const my = (pts[i][1] + pts[i + 1][1]) / 2
    d += ` Q${f(pts[i][0])},${f(pts[i][1])} ${f(mx)},${f(my)}`
  }
  const last = pts[pts.length - 1]
  return `${d} L${f(last[0])},${f(last[1])}`
}

export function Sparkline({
  points,
  width = 120,
  height = 34,
  className,
  strokeWidth = 1.75,
  stretch,
  color,
}: {
  points: [number, number][]
  width?: number
  height?: number
  className?: string
  strokeWidth?: number
  /** estica para preencher o contêiner (largura e altura vêm do CSS) */
  stretch?: boolean
  color?: string
}) {
  const id = useId().replace(/:/g, '')
  if (points.length < 2) {
    return (
      <div className={cx('flex items-center font-mono text-[10px] uppercase tracking-wider text-fg-3', className)} style={stretch ? undefined : { width, height }}>
        coletando…
      </div>
    )
  }
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)]
  const pad = 3
  const sx = (x: number) => pad + ((x - x0) / (x1 - x0 || 1)) * (width - pad * 2)
  const sy = (y: number) => height - pad - ((y - y0) / (y1 - y0 || 1)) * (height - pad * 2)
  const scaled = points.map((p) => [sx(p[0]), sy(p[1])] as [number, number])
  const d = smoothPath(scaled)
  const stroke = color ?? (ys[ys.length - 1] >= ys[0] ? 'var(--up)' : 'var(--down)')
  const last = scaled[scaled.length - 1]
  return (
    <svg
      width={stretch ? undefined : width}
      height={stretch ? undefined : height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={stretch ? 'none' : undefined}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="spark-area" d={`${d} L${sx(x1).toFixed(1)},${height} L${sx(x0).toFixed(1)},${height} Z`} fill={`url(#${id})`} />
      <path
        className={stretch ? 'spark-area' : 'spark-line'}
        pathLength={stretch ? undefined : 1}
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect={stretch ? 'non-scaling-stroke' : undefined}
      />
      {!stretch && <circle className="spark-area" cx={last[0]} cy={last[1]} r="2.6" fill={stroke} />}
    </svg>
  )
}

/* -------------------------------- Contagem regressiva -------------------------------- */
function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

/** Para datas "AAAA-MM-DD" usa a meia-noite local. */
export function targetTime(iso: string) {
  if (iso.length === 10) {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).getTime()
  }
  return new Date(iso).getTime()
}

/** Número que "rola" quando muda. */
function RollingValue({ value, className }: { value: string; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return <span className={className}>{value}</span>
  return (
    <span className={cx('relative inline-flex overflow-hidden', className)} style={{ lineHeight: 1.08 }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '65%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-65%', opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function Countdown({
  to,
  size = 'md',
  label,
  tone = 'surface',
}: {
  to: string
  size?: 'sm' | 'md' | 'lg'
  label?: string
  /** "onImage": versão clara para usar sobre fotos */
  tone?: 'surface' | 'onImage'
}) {
  const now = useNow(1000)
  const { d, h, m, s } = parts(targetTime(to) - now)
  const cells = [
    { v: d, l: 'dias' },
    { v: h, l: 'horas' },
    { v: m, l: 'min' },
    { v: s, l: 'seg' },
  ]
  const box = { sm: 'min-w-[46px] px-1.5 py-1.5 rounded-xl', md: 'min-w-[60px] px-2 py-2.5 rounded-2xl', lg: 'min-w-[68px] px-2.5 py-3 rounded-2xl sm:min-w-[88px] sm:py-4' }[size]
  const num = { sm: 'text-lg', md: 'text-[26px]', lg: 'text-[34px] sm:text-[46px]' }[size]
  return (
    <div role="timer" aria-label={label ?? 'Contagem regressiva'}>
      {label && <span className="eyebrow mb-2.5 block">{label}</span>}
      <div className="flex gap-1.5 sm:gap-2">
        {cells.map((c) => (
          <div
            key={c.l}
            className={cx(
              'flex flex-col items-center border',
              box,
              tone === 'onImage' ? 'border-white/12 bg-black/45 text-white backdrop-blur-md' : 'border-line bg-surface-2 text-fg',
            )}
          >
            <RollingValue value={String(c.v).padStart(2, '0')} className={cx('num font-display font-semibold tracking-tight', num)} />
            <span
              className={cx(
                'mt-1 font-mono uppercase tracking-[0.14em]',
                size === 'sm' ? 'text-[8px]' : 'text-[9px]',
                tone === 'onImage' ? 'text-white/55' : 'text-fg-3',
              )}
            >
              {c.l}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** "termina em 2d 4h" compacto */
export function EndsIn({ at, prefix = 'termina em' }: { at: string; prefix?: string }) {
  const now = useNow(30_000)
  const ms = new Date(at).getTime() - now
  if (ms <= 0) return <span>encerrado</span>
  const { d, h, m } = parts(ms)
  const txt = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}min` : `${m}min`
  return (
    <span className={cx(d === 0 && 'text-hot')}>
      {prefix} {txt}
    </span>
  )
}

/* ------------------------------ Movimento e revelação ------------------------------ */

/** Número que conta até o valor quando entra na tela. */
export function AnimatedNumber({
  value,
  format = fmtNumber,
  className,
  duration = 1.6,
}: {
  value: number
  format?: (n: number) => string
  className?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const from = useRef(0)
  useEffect(() => {
    const el = ref.current
    if (!el || !inView) return
    if (reduce) {
      el.textContent = format(value)
      return
    }
    const controls = animate(from.current, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => {
        el.textContent = format(v)
      },
    })
    from.current = value
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView, reduce])
  return (
    <span ref={ref} className={cx('num', className)} aria-label={format(value)}>
      {format(0)}
    </span>
  )
}

/** Sobe e aparece quando entra na tela. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.06 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/** Palavra de destaque dos títulos (serifa itálica na cor da seção). */
export const Accent = ({ children }: { children: ReactNode }) => <em className="accent-word">{children}</em>

/** Índice para a animação em cascata (.stagger). */
export const stagger = (i: number) => ({ '--i': i }) as CSSProperties

/* ---------------------------------- Selos ---------------------------------- */
export function StoreBadge({ store, className }: { store: StoreId; className?: string }) {
  const m = storeMeta(store)
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full bg-black/70 py-1 pl-2 pr-2.5 text-[11px] font-semibold leading-none text-white ring-1 ring-inset ring-white/12',
        className,
      )}
    >
      <span className="size-2 rounded-full ring-1 ring-white/30" style={{ background: m.color }} />
      {m.short}
    </span>
  )
}

export function StoreDot({ store }: { store: StoreId }) {
  return <span className="inline-block size-2 shrink-0 rounded-full ring-1 ring-white/25" style={{ background: storeMeta(store).color }} />
}

export function Platforms({ list, max = 5, tone = 'surface' }: { list: string[]; max?: number; tone?: 'surface' | 'onImage' }) {
  const shown = list.slice(0, max)
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((p) => (
        <span
          key={p}
          className={cx(
            'rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide',
            tone === 'onImage' ? 'bg-white/12 text-white/90 ring-1 ring-inset ring-white/15' : 'bg-surface-2 text-fg-2 ring-1 ring-inset ring-line',
          )}
        >
          {platformShort(p)}
        </span>
      ))}
      {list.length > max && (
        <span className={cx('px-1 font-mono text-[10px] font-medium', tone === 'onImage' ? 'text-white/60' : 'text-fg-3')}>+{list.length - max}</span>
      )}
    </div>
  )
}

export function DiscountBadge({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cx(
        'num inline-flex items-center rounded-full bg-accent px-2 py-1 font-mono text-[12px] font-semibold leading-none text-accent-ink',
        className,
      )}
    >
      −{value}%
    </span>
  )
}

/* ---------------------------------- Layout ---------------------------------- */
export function SectionHeader({
  eyebrow,
  title,
  icon,
  action,
  description,
}: {
  eyebrow?: string
  title: ReactNode
  icon?: ReactNode
  action?: { to: string; label: string }
  description?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="eyebrow mb-2.5 flex items-center gap-2">
            {icon}
            {eyebrow}
          </div>
        )}
        <h2 className="display text-[26px] sm:text-[34px]">{title}</h2>
        {description && <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-fg-2">{description}</p>}
      </div>
      {action && (
        <Link to={action.to} className="group btn btn-sm btn-ghost shrink-0">
          {action.label}
          <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  aside,
  children,
}: {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  /** conteúdo à direita do título (ex.: número em destaque) */
  aside?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="relative pb-8 pt-8 sm:pb-10 sm:pt-14">
      <div className="stagger flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="eyebrow mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 !text-fg-2">
            {icon}
            {eyebrow}
          </div>
          <h1 className="display text-[40px] sm:text-6xl lg:text-[68px]">{title}</h1>
          {description && <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-fg-2 sm:text-[17px]">{description}</p>}
        </div>
        {aside && (
          <div className="shrink-0" style={stagger(3)}>
            {aside}
          </div>
        )}
      </div>
      {children}
    </header>
  )
}

/** Linha de chips com rolagem horizontal (necessária para o indicador deslizante funcionar ao rolar). */
export function ChipRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div layoutScroll className={cx('scroller -my-1 flex items-center gap-2 overflow-x-auto py-1', className)}>
      {children}
    </motion.div>
  )
}

export function Chip({
  active,
  onClick,
  children,
  count,
  className,
  group,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  count?: number
  className?: string
  /** chips do mesmo grupo compartilham um indicador que desliza entre eles */
  group?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'relative inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-[13px] font-medium transition-colors duration-200',
        active ? 'text-bg' : 'bg-surface text-fg-2 ring-1 ring-inset ring-line hover:bg-surface-2 hover:text-fg',
        className,
      )}
    >
      {active &&
        (group ? (
          <motion.span
            layoutId={`chip-${group}`}
            className="absolute inset-0 rounded-full bg-fg"
            transition={{ type: 'spring', stiffness: 440, damping: 36 }}
          />
        ) : (
          <span className="absolute inset-0 rounded-full bg-fg" />
        ))}
      <span className="relative inline-flex items-center gap-1.5">
        {children}
        {count !== undefined && <span className={cx('num font-mono text-[11px]', active ? 'opacity-60' : 'text-fg-3')}>{count}</span>}
      </span>
    </button>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar jogo…',
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <label className={cx('group relative flex items-center', className)}>
      <Search className="pointer-events-none absolute left-3.5 size-4 text-fg-3 transition-colors group-focus-within:text-fg" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full min-w-0 rounded-full border border-line bg-surface pl-10 pr-9 text-sm text-fg outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-fg-3 focus:border-line-strong focus:bg-surface-2 focus:shadow-[0_0_0_4px_var(--accent-soft)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 grid size-6 place-items-center rounded-full text-fg-3 transition hover:bg-surface-3 hover:text-fg"
          aria-label="Limpar busca"
        >
          <X className="size-3.5" />
        </button>
      )}
    </label>
  )
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <label className="relative inline-flex shrink-0 items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 cursor-pointer appearance-none rounded-full border border-line bg-surface pl-4 pr-9 text-sm font-medium text-fg outline-none transition-[background-color,border-color,box-shadow] duration-200 hover:border-line-strong focus:border-line-strong focus:shadow-[0_0_0_4px_var(--accent-soft)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-bg-elev text-fg">
            {o.label}
          </option>
        ))}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 size-4 text-fg-3" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  )
}

/** Trilho horizontal: rola com o dedo/trackpad e, no desktop, com setas. */
export function Rail({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })
  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    const start = el.scrollLeft < 8
    const end = el.scrollLeft + el.clientWidth > el.scrollWidth - 8
    setEdge((e) => (e.start === start && e.end === end ? e : { start, end }))
  }, [])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [update])
  const by = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.82, behavior: 'smooth' })
  const arrow =
    'glass absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full text-fg shadow-pop transition-all duration-300 hover:scale-105 lg:grid'
  return (
    <div className="group/rail relative" role="region" aria-label={label}>
      <div
        ref={ref}
        className={cx('scroller rail edge-fade -mx-4 flex scroll-px-4 gap-4 overflow-x-auto px-4 pb-5 pt-1 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:-mx-8 lg:scroll-px-8 lg:px-8', className)}
        style={{ '--fade-l': edge.start ? '0px' : '40px', '--fade-r': edge.end ? '0px' : '40px' } as CSSProperties}
      >
        {children}
      </div>
      <button
        type="button"
        aria-label="Anterior"
        onClick={() => by(-1)}
        className={cx(arrow, '-left-3', edge.start ? 'pointer-events-none opacity-0' : 'opacity-0 group-hover/rail:opacity-100')}
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Próximo"
        onClick={() => by(1)}
        className={cx(arrow, '-right-3', edge.end ? 'pointer-events-none opacity-0' : 'opacity-0 group-hover/rail:opacity-100')}
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      {icon && <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-surface-2 text-fg-2 ring-1 ring-inset ring-line">{icon}</div>}
      <h3 className="display text-xl">{title}</h3>
      {children && <div className="mt-2.5 max-w-md text-sm leading-relaxed text-fg-2">{children}</div>}
    </div>
  )
}

export function FavButton({ gameKey, name, image, className }: { gameKey: string; name: string; image?: string; className?: string }) {
  const active = useIsFavorite(gameKey)
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.82 }}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        favorites.toggle(gameKey, cleanName(name), image)
      }}
      aria-label={active ? `Remover ${name} dos favoritos` : `Adicionar ${name} aos favoritos`}
      aria-pressed={active}
      className={cx(
        'grid size-9 place-items-center rounded-full ring-1 ring-inset transition-colors duration-200',
        active ? 'bg-accent text-accent-ink ring-transparent' : 'bg-black/55 text-white ring-white/15 hover:bg-black/75',
        className,
      )}
    >
      <Star className="size-4" fill={active ? 'currentColor' : 'none'} strokeWidth={2.2} />
    </motion.button>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} />
}

export function GridSkeleton({ count = 8, className = 'aspect-[16/11]' }: { count?: number; className?: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  )
}

export function ErrorBox({ error }: { error: Error }) {
  return (
    <div className="pt-16">
      <EmptyState title="Não foi possível carregar os dados">{error.message}. Tente recarregar a página em instantes.</EmptyState>
    </div>
  )
}

export const Name = ({ children }: { children: string }) => <>{cleanName(children)}</>
