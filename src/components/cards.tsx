import { ArrowDown, ArrowUp, ArrowUpRight, Crown, Gift, Minus, Sparkles, Star, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { cleanName, daysUntil, fmtCompact, fmtDay, fmtMoney, monthShort, parseDay, relativeDays } from '../lib/format'
import { dealCta } from '../lib/stores'
import type { Deal, FreeGame, HypeEntry, MostPlayedEntry, SimpleGame, UpcomingGame } from '../types'
import { useOpenGame } from './GameSheet'
import { DiscountBadge, EndsIn, FavButton, GameImage, Platforms, Sparkline, StoreBadge, cx } from './ui'

/* ----------------------------------- Promoção ----------------------------------- */
export function DealCard({ deal, compact }: { deal: Deal; compact?: boolean }) {
  const open = useOpenGame()
  return (
    <article className="group card card-hover relative flex flex-col overflow-hidden">
      <button onClick={() => open(deal.key)} className="text-left" aria-label={`Detalhes de ${cleanName(deal.title)}`}>
        <div className="zoom-img relative">
          <GameImage src={deal.image} alt={deal.title} className="aspect-[460/215] w-full" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
            <StoreBadge store={deal.store} />
          </div>
          <DiscountBadge value={deal.discount} className="absolute bottom-2.5 left-2.5 shadow-lg" />
          {deal.subscription && (
            <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
              {deal.subscription}
            </span>
          )}
        </div>
      </button>
      <FavButton gameKey={deal.key} name={deal.title} image={deal.image} className="absolute right-2.5 top-2.5 opacity-0 transition group-hover:opacity-100 focus:opacity-100 max-sm:opacity-100" />
      <div className={cx('flex flex-1 flex-col', compact ? 'p-3' : 'p-3.5')}>
        <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-fg" title={deal.title}>
          {cleanName(deal.title)}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <div className="num text-[11px] text-fg-3 line-through">{fmtMoney(deal.originalPrice, deal.currency)}</div>
            <div className="num font-display text-lg font-bold leading-tight">{fmtMoney(deal.price, deal.currency)}</div>
          </div>
          <div className="text-right text-[11px] leading-tight text-fg-3">
            {deal.endsAt ? <EndsIn at={deal.endsAt} /> : deal.rating ? <span>{deal.rating}% positivas</span> : null}
          </div>
        </div>
        <a
          href={deal.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2 py-2 text-center text-[13px] font-semibold text-fg transition hover:border-line-strong hover:bg-surface-3"
        >
          <span className="truncate">{dealCta(deal.store, deal.linkType)}</span>
          <ArrowUpRight className="size-3.5 shrink-0 text-fg-3" />
        </a>
      </div>
    </article>
  )
}

/* ------------------------------------ Grátis ------------------------------------ */
export function FreeGameCard({ game, large }: { game: FreeGame; large?: boolean }) {
  const open = useOpenGame()
  const now = game.status === 'now'
  return (
    <article className="group card relative overflow-hidden">
      <button onClick={() => open(game.key)} className="block w-full text-left">
        <div className="zoom-img relative">
          <GameImage src={game.image} alt={game.title} className={cx('w-full', large ? 'aspect-[16/9]' : 'aspect-[16/9]')} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="absolute left-3 top-3 flex gap-2">
            <span
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider',
                now ? 'bg-accent text-accent-ink' : 'bg-white/15 text-white backdrop-blur',
              )}
            >
              <Gift className="size-3.5" />
              {now ? 'Grátis agora' : 'Em breve'}
            </span>
            <StoreBadge store={game.store} />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className={cx('font-display font-bold leading-tight text-white', large ? 'text-2xl' : 'text-lg')}>{cleanName(game.title)}</h3>
            <div className="mt-1.5 flex items-center gap-3 text-[13px] text-white/80">
              {game.originalPrice && game.originalPrice !== '0' && <span className="line-through">{game.originalPrice}</span>}
              <span className="font-semibold text-white">
                {now ? <EndsIn at={game.endsAt} /> : <>a partir de {fmtDay(game.startsAt.slice(0, 10), { year: false })}</>}
              </span>
            </div>
          </div>
        </div>
      </button>
      <a
        href={game.url}
        target="_blank"
        rel="noreferrer"
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-black shadow-lg transition hover:scale-105 sm:bottom-4 sm:right-4 sm:top-auto sm:px-3.5 sm:text-[13px]"
      >
        {now ? 'Resgatar' : 'Ver na loja'}
        <ArrowUpRight className="size-3.5" />
      </a>
    </article>
  )
}

/* ---------------------------------- Lançamento ---------------------------------- */
export function UpcomingCard({ game, hot }: { game: UpcomingGame; hot?: boolean }) {
  const open = useOpenGame()
  const d = game.date ? parseDay(game.date) : null
  const days = game.date ? daysUntil(game.date) : null
  return (
    <article className="group card card-hover relative flex flex-col overflow-hidden">
      <button onClick={() => open(game.key)} className="text-left">
        <div className="zoom-img relative">
          <GameImage src={game.image} alt={game.title} className="aspect-[460/215] w-full" />
          <div className="absolute left-2.5 top-2.5 flex flex-col items-center rounded-xl border border-white/10 bg-black/65 px-2.5 py-1.5 text-white backdrop-blur-md">
            {d ? (
              <>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">{monthShort(d.getMonth() + 1)}</span>
                <span className="num font-display text-xl font-bold leading-none">{d.getDate()}</span>
              </>
            ) : (
              <span className="py-1 text-[11px] font-bold uppercase tracking-wide">{game.dateText}</span>
            )}
          </div>
          {hot && (
            <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-hot px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              <Sparkles className="size-3" /> Aguardado
            </span>
          )}
        </div>
      </button>
      <FavButton gameKey={game.key} name={game.title} image={game.image} className="absolute right-2.5 top-2.5 opacity-0 transition group-hover:opacity-100 focus:opacity-100 max-sm:opacity-100" />
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug">{cleanName(game.title)}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-fg-3">
          {[game.genres.slice(0, 2).join(', '), game.developer].filter(Boolean).join(' · ') || '—'}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <Platforms list={game.platforms} max={4} />
          {days !== null && days >= 0 && (
            <span className={cx('num shrink-0 text-[11px] font-semibold', days <= 7 ? 'text-accent-text' : 'text-fg-3')}>{relativeDays(game.date!)}</span>
          )}
        </div>
      </div>
    </article>
  )
}

/* ------------------------------- Linha de ranking ------------------------------- */
export function RankDelta({ rank, prev }: { rank: number; prev: number | null }) {
  if (prev === null) return <span className="text-[10px] font-bold uppercase text-cyan">novo</span>
  const d = prev - rank
  if (d === 0) return <Minus className="size-3.5 text-fg-3" aria-label="sem mudança" />
  return (
    <span className={cx('num inline-flex items-center text-[11px] font-bold', d > 0 ? 'text-up' : 'text-down')}>
      {d > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(d)}
    </span>
  )
}

export function MostPlayedRow({ e, dense }: { e: MostPlayedEntry; dense?: boolean }) {
  const open = useOpenGame()
  return (
    <button
      onClick={() => open(e.key)}
      className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-surface-2 sm:gap-4 sm:px-3"
    >
      <div className="flex w-9 shrink-0 flex-col items-center">
        <span className={cx('num font-display text-lg font-bold', e.rank <= 3 ? 'text-accent-text' : 'text-fg')}>{e.rank}</span>
        <RankDelta rank={e.rank} prev={e.prevRank} />
      </div>
      <GameImage src={e.image} alt={e.name} className={cx('shrink-0 rounded-xl', dense ? 'h-11 w-[94px]' : 'h-12 w-[104px] sm:h-14 sm:w-[120px]')} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{cleanName(e.name)}</div>
        <div className="truncate text-xs text-fg-3">{e.tags.slice(0, 3).join(' · ') || e.developer}</div>
      </div>
      <Sparkline points={e.history} width={92} height={30} className="hidden shrink-0 sm:block" />
      <div className="w-[84px] shrink-0 text-right">
        <div className="num text-[15px] font-semibold">{fmtCompact(e.current)}</div>
        <div className="flex items-center justify-end gap-1 text-[11px] text-fg-3">
          <Users className="size-3" /> agora
        </div>
      </div>
    </button>
  )
}

/* ------------------------------------ Hype ------------------------------------ */
const SIGNAL_STYLE: Record<string, string> = {
  twitch: 'bg-[#9146ff]/15 text-[#b18cff]',
  'steam-players': 'bg-[#66c0f4]/12 text-[#7cc8f5]',
  'steam-sellers': 'bg-[#66c0f4]/12 text-[#7cc8f5]',
  playstation: 'bg-[#0070d1]/18 text-[#5aa9ff]',
  xbox: 'bg-[#107c10]/20 text-[#5fd35f]',
  youtube: 'bg-[#ff0033]/12 text-[#ff6b81]',
  wishlist: 'bg-violet-soft text-violet',
}
const SIGNAL_SHORT: Record<string, string> = {
  twitch: 'Twitch',
  'steam-players': 'Steam',
  'steam-sellers': 'Vendas Steam',
  playstation: 'PS Store',
  xbox: 'Xbox',
  youtube: 'YouTube',
  wishlist: 'Desejados',
}

export function SignalChips({ entry, max = 4 }: { entry: HypeEntry; max?: number }) {
  return (
    <div className="flex flex-wrap gap-1">
      {entry.signals.slice(0, max).map((s) => (
        <span key={s.source} className={cx('num rounded-md px-1.5 py-0.5 text-[10px] font-semibold', SIGNAL_STYLE[s.source])} title={s.label}>
          {SIGNAL_SHORT[s.source]} #{s.rank}
        </span>
      ))}
    </div>
  )
}

export function HypeCard({ entry, rank }: { entry: HypeEntry; rank: number }) {
  const open = useOpenGame()
  return (
    <button onClick={() => open(entry.key)} className="group card card-hover relative flex w-full flex-col overflow-hidden text-left">
      <div className="zoom-img relative">
        <GameImage src={entry.image} alt={entry.name} className="aspect-[460/215] w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <span className="num absolute bottom-2 left-3 font-display text-4xl font-bold leading-none text-white drop-shadow-lg">{rank}</span>
        {rank <= 3 && (
          <span className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-full bg-hot text-white">
            <Crown className="size-3.5" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <h3 className="line-clamp-1 text-[14px] font-semibold">{cleanName(entry.name)}</h3>
        <SignalChips entry={entry} />
      </div>
    </button>
  )
}

/* -------------------------------- Lista simples -------------------------------- */
export function SimpleList({ items, label }: { items: SimpleGame[]; label?: string }) {
  const open = useOpenGame()
  return (
    <ol className="space-y-0.5" aria-label={label}>
      {items.map((g, i) => (
        <li key={g.key + i}>
          <button onClick={() => open(g.key)} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-surface-2">
            <span className={cx('num w-6 shrink-0 text-center font-display text-sm font-bold', i < 3 ? 'text-accent-text' : 'text-fg-3')}>{g.rank ?? i + 1}</span>
            <GameImage src={g.image} alt={g.name} className="h-9 w-[76px] shrink-0 rounded-lg" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{cleanName(g.name)}</span>
            {g.discount ? <DiscountBadge value={g.discount} className="text-[11px]" /> : g.price ? <span className="num shrink-0 text-xs text-fg-3">{g.price}</span> : null}
          </button>
        </li>
      ))}
    </ol>
  )
}

export function StatTile({
  icon,
  label,
  value,
  sub,
  tone = 'default',
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'default' | 'accent' | 'hot' | 'gold' | 'violet'
}) {
  const toneCls = {
    default: 'text-fg-2 bg-surface-2',
    accent: 'text-accent-text bg-accent-soft',
    hot: 'text-hot bg-hot-soft',
    gold: 'text-gold bg-gold-soft',
    violet: 'text-violet bg-violet-soft',
  }[tone]
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className={cx('grid size-8 place-items-center rounded-xl', toneCls)}>{icon}</span>
        <span className="text-[12px] font-medium text-fg-2">{label}</span>
      </div>
      <div className="num mt-3 font-display text-[26px] font-bold leading-none tracking-tight sm:text-3xl">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-fg-3">{sub}</div>}
    </div>
  )
}

export function WinnerStar() {
  return <Star className="size-3.5 text-gold" fill="currentColor" />
}

