import { Star } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { favorites, useIsFavorite } from '../lib/favorites'
import { cleanName, hueOf, initials } from '../lib/format'
import { platformShort, storeMeta } from '../lib/stores'
import type { StoreId } from '../types'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ---------------------------------- Logo ---------------------------------- */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="ecg shrink-0">
      <rect width="64" height="64" rx="16" fill="var(--surface-2)" />
      <rect x="1" y="1" width="62" height="62" rx="15" fill="none" stroke="var(--accent)" strokeOpacity=".28" strokeWidth="2" />
      <path
        d="M10 34h11l5-13 8 25 6-17 3 5h11"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  alt: string
  className?: string
  /** "wide" (16:9 / capa da Steam) ou "poster" (3:4) */
  variant?: 'wide' | 'poster' | 'square'
  eager?: boolean
}

/** Imagem com carregamento progressivo e placeholder gerado (cor + iniciais) quando falta arte. */
export function GameImage({ src, alt, className, variant = 'wide', eager }: GameImageProps) {
  // estado por URL: evita que uma imagem já em cache (onLoad imediato) fique invisível
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const loaded = !!src && loadedSrc === src
  const failed = !!src && failedSrc === src
  const imgRef = useCallback(
    (el: HTMLImageElement | null) => {
      if (el && el.complete && el.naturalWidth > 0 && src) setLoadedSrc(src)
    },
    [src],
  )
  const hue = hueOf(alt)
  const showImg = src && !failed
  return (
    <div
      className={cx('relative overflow-hidden bg-surface-2', className)}
      style={
        !showImg
          ? {
              background: `radial-gradient(120% 90% at 0% 0%, hsl(${hue} 70% 38% / .55), transparent 60%), radial-gradient(100% 100% at 100% 100%, hsl(${(hue + 60) % 360} 70% 30% / .5), transparent 60%), var(--surface-2)`,
            }
          : undefined
      }
    >
      {showImg ? (
        <>
          {!loaded && <div className="skeleton absolute inset-0 rounded-none" />}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setLoadedSrc(src)}
            onError={() => setFailedSrc(src)}
            className={cx('h-full w-full object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')}
          />
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span
            className={cx(
              'font-display font-bold tracking-tight text-white/85 drop-shadow',
              variant === 'poster' ? 'text-3xl' : 'text-2xl',
            )}
          >
            {initials(alt)}
          </span>
        </div>
      )}
    </div>
  )
}

/* ---------------------------------- Sparkline ---------------------------------- */
export function Sparkline({
  points,
  width = 120,
  height = 34,
  className,
  strokeWidth = 1.75,
}: {
  points: [number, number][]
  width?: number
  height?: number
  className?: string
  strokeWidth?: number
}) {
  if (points.length < 2) {
    return (
      <div className={cx('flex items-center text-[11px] text-fg-3', className)} style={{ width, height }}>
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
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(' ')
  const up = ys[ys.length - 1] >= ys[0]
  const color = up ? 'var(--up)' : 'var(--down)'
  const id = `sg-${Math.round(ys[0])}-${points.length}-${Math.round(ys[ys.length - 1])}`
  const last = points[points.length - 1]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${sx(x1)},${height} L${sx(x0)},${height} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={sx(last[0])} cy={sy(last[1])} r="2.6" fill={color} />
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

export function Countdown({ to, size = 'md', label }: { to: string; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const now = useNow(1000)
  const { d, h, m, s } = parts(targetTime(to) - now)
  const cells = [
    { v: d, l: 'dias' },
    { v: h, l: 'horas' },
    { v: m, l: 'min' },
    { v: s, l: 'seg' },
  ]
  const big = size === 'lg'
  return (
    <div className="flex flex-col gap-2" aria-label={label ?? 'Contagem regressiva'}>
      {label && <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-3">{label}</span>}
      <div className="flex gap-1.5 sm:gap-2">
        {cells.map((c) => (
          <div
            key={c.l}
            className={cx(
              'num flex flex-col items-center justify-center rounded-xl border border-line bg-surface-2/80 backdrop-blur',
              big ? 'min-w-[66px] px-2.5 py-2.5 sm:min-w-[78px]' : size === 'sm' ? 'min-w-[42px] px-1.5 py-1' : 'min-w-[54px] px-2 py-1.5',
            )}
          >
            <span className={cx('font-display font-bold leading-none', big ? 'text-3xl sm:text-4xl' : size === 'sm' ? 'text-base' : 'text-xl')}>
              {String(c.v).padStart(2, '0')}
            </span>
            <span className={cx('mt-1 uppercase tracking-wider text-fg-3', size === 'sm' ? 'text-[9px]' : 'text-[10px]')}>{c.l}</span>
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

/* ---------------------------------- Selos ---------------------------------- */
export function StoreBadge({ store, className }: { store: StoreId; className?: string }) {
  const m = storeMeta(store)
  return (
    <span
      className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-5', className)}
      style={{ background: m.color, color: m.ink, boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / .12)' }}
    >
      {m.short}
    </span>
  )
}

export function StoreDot({ store }: { store: StoreId }) {
  return <span className="inline-block size-2 shrink-0 rounded-full ring-1 ring-white/20" style={{ background: storeMeta(store).color }} />
}

export function Platforms({ list, max = 5 }: { list: string[]; max?: number }) {
  const shown = list.slice(0, max)
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((p) => (
        <span key={p} className="rounded-md border border-line bg-surface-2 px-1.5 py-px text-[10px] font-semibold tracking-wide text-fg-2">
          {platformShort(p)}
        </span>
      ))}
      {list.length > max && <span className="px-1 text-[10px] font-semibold text-fg-3">+{list.length - max}</span>}
    </div>
  )
}

export function DiscountBadge({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cx(
        'num inline-flex items-center rounded-lg bg-accent px-1.5 py-0.5 font-display text-[13px] font-bold leading-none text-accent-ink',
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
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-3">
            {icon}
            {eyebrow}
          </div>
        )}
        <h2 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-[28px]">{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-fg-2">{description}</p>}
      </div>
      {action && (
        <Link
          to={action.to}
          className="group inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-fg-2 transition hover:border-line-strong hover:text-fg"
        >
          {action.label}
          <span className="transition group-hover:translate-x-0.5">→</span>
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
  children,
}: {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="relative pb-6 pt-8 sm:pb-8 sm:pt-12">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-2 backdrop-blur">
        {icon}
        {eyebrow}
      </div>
      <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-tight sm:text-5xl">{title}</h1>
      {description && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fg-2 sm:text-base">{description}</p>}
      {children}
    </header>
  )
}

export function Chip({
  active,
  onClick,
  children,
  count,
  className,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  count?: number
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition',
        active
          ? 'border-transparent bg-fg text-bg'
          : 'border-line bg-surface/70 text-fg-2 hover:border-line-strong hover:text-fg',
        className,
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cx('num text-[11px]', active ? 'text-bg/60' : 'text-fg-3')}>{count}</span>
      )}
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
    <label className={cx('relative flex items-center', className)}>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 size-4 text-fg-3" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full min-w-0 rounded-full border border-line bg-surface/80 pl-9 pr-9 text-sm text-fg placeholder:text-fg-3 outline-none transition focus:border-line-strong focus:bg-surface"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 grid size-6 place-items-center rounded-full text-fg-3 hover:bg-surface-2 hover:text-fg"
          aria-label="Limpar busca"
        >
          ×
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
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 appearance-none rounded-full border border-line bg-surface/80 pl-4 pr-9 text-sm font-medium text-fg outline-none transition hover:border-line-strong focus:border-line-strong"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
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

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-surface-2 text-fg-2">{icon}</div>}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {children && <div className="mt-2 max-w-md text-sm leading-relaxed text-fg-2">{children}</div>}
    </div>
  )
}

export function FavButton({ gameKey, name, image, className }: { gameKey: string; name: string; image?: string; className?: string }) {
  const active = useIsFavorite(gameKey)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        favorites.toggle(gameKey, cleanName(name), image)
      }}
      aria-label={active ? `Remover ${name} dos favoritos` : `Adicionar ${name} aos favoritos`}
      aria-pressed={active}
      className={cx(
        'grid size-8 place-items-center rounded-full backdrop-blur-md transition',
        active ? 'bg-accent text-accent-ink' : 'bg-black/45 text-white/90 hover:bg-black/65',
        className,
      )}
    >
      <Star className="size-4" fill={active ? 'currentColor' : 'none'} strokeWidth={2.2} />
    </button>
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
    <EmptyState title="Não foi possível carregar os dados">
      {error.message}. Tente recarregar a página em instantes.
    </EmptyState>
  )
}

export const Name = ({ children }: { children: string }) => <>{cleanName(children)}</>
