import { ArrowDown, ArrowUp, ArrowUpRight, Crown, Gift, Minus, Sparkles, Star, Users } from 'lucide-react'
import { cleanName, daysUntil, fmtCompact, fmtDay, fmtMoney, monthShort, parseDay, relativeDays } from '../lib/format'
import { dealCta } from '../lib/stores'
import type { Deal, FreeGame, HypeEntry, MostPlayedEntry, SimpleGame, UpcomingGame } from '../types'
import { useOpenGame } from './GameSheet'
import { DiscountBadge, EndsIn, FavButton, GameImage, Platforms, Sparkline, StoreBadge, cx, hiRes } from './ui'

/** Estrela de favorito: aparece ao passar o mouse; sempre visível em telas de toque. */
const FAV_ON_CARD =
  'absolute right-2.5 top-2.5 opacity-0 transition-opacity duration-300 focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100 aria-pressed:opacity-100'

/* ----------------------------------- Promoção ----------------------------------- */
export function DealCard({ deal }: { deal: Deal; compact?: boolean }) {
  const open = useOpenGame()
  return (
    <article className="group card card-hover flex h-full flex-col overflow-hidden">
      <button onClick={() => open(deal.key)} className="block text-left" aria-label={`Detalhes de ${cleanName(deal.title)}`}>
        <div className="zoom-img shine">
          <GameImage src={deal.image} alt={deal.title} className="aspect-[460/215] w-full" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15" />
          <StoreBadge store={deal.store} className="absolute left-2.5 top-2.5" />
          <DiscountBadge value={deal.discount} className="absolute bottom-2.5 left-2.5 shadow-lg" />
          {deal.subscription && (
            <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold leading-none text-white ring-1 ring-inset ring-white/12">
              {deal.subscription}
            </span>
          )}
        </div>
      </button>
      <FavButton gameKey={deal.key} name={deal.title} image={deal.image} className={FAV_ON_CARD} />
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-fg" title={deal.title}>
          {cleanName(deal.title)}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div className="min-w-0">
            <div className="num font-display text-[19px] font-semibold leading-none">{fmtMoney(deal.price, deal.currency)}</div>
            <div className="num mt-1.5 text-[11px] leading-none text-fg-3 line-through">{fmtMoney(deal.originalPrice, deal.currency)}</div>
          </div>
          <div className="text-right text-[11px] leading-tight text-fg-3">
            {deal.endsAt ? <EndsIn at={deal.endsAt} /> : deal.rating ? <span>{deal.rating}% positivas</span> : null}
          </div>
        </div>
        <a
          href={deal.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3.5 inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-surface-2 px-2 text-[13px] font-semibold text-fg ring-1 ring-inset ring-line transition-colors duration-300 hover:bg-accent hover:text-accent-ink hover:ring-transparent"
        >
          <span className="truncate">{dealCta(deal.store, deal.linkType)}</span>
          <ArrowUpRight className="size-3.5 shrink-0 opacity-60" />
        </a>
      </div>
    </article>
  )
}

/* ------------------------------------ Grátis ------------------------------------ */
export function FreeGameCard({ game }: { game: FreeGame; large?: boolean }) {
  const open = useOpenGame()
  const now = game.status === 'now'
  return (
    <article className="group card card-hover overflow-hidden">
      <button onClick={() => open(game.key)} className="block w-full text-left" aria-label={`Detalhes de ${cleanName(game.title)}`}>
        <div className="zoom-img shine">
          <GameImage src={hiRes(game.image, 960)} fallback={game.image} alt={game.title} className="aspect-[16/9] w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/10" />
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span
              className={cx(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase leading-none tracking-[0.1em]',
                now ? 'bg-accent text-accent-ink' : 'bg-white/15 text-white ring-1 ring-inset ring-white/20',
              )}
            >
              <Gift className="size-3.5" />
              {now ? 'Grátis agora' : 'Em breve'}
            </span>
            <StoreBadge store={game.store} />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <h3 className="display text-xl text-white sm:text-2xl">{cleanName(game.title)}</h3>
            <div className="mt-2 flex items-center gap-3 text-[13px] text-white/75">
              {game.originalPrice && game.originalPrice !== '0' && <span className="num line-through">{game.originalPrice}</span>}
              <span className="font-semibold text-white">
                {now ? <EndsIn at={game.endsAt} /> : <>a partir de {fmtDay(game.startsAt.slice(0, 10), { year: false })}</>}
              </span>
            </div>
          </div>
        </div>
      </button>
      <a href={game.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-light absolute right-3 top-3 sm:bottom-5 sm:right-5 sm:top-auto">
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
    <article className="group card card-hover flex h-full flex-col overflow-hidden">
      <button onClick={() => open(game.key)} className="flex flex-1 flex-col text-left" aria-label={`Detalhes de ${cleanName(game.title)}`}>
        <div className="zoom-img shine w-full">
          <GameImage src={game.image} alt={game.title} className="aspect-[460/215] w-full" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" />
          <div className="absolute left-2.5 top-2.5 flex min-w-[46px] flex-col items-center rounded-xl bg-black/70 px-2.5 py-1.5 text-white ring-1 ring-inset ring-white/12">
            {d ? (
              <>
                <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-white/65">{monthShort(d.getMonth() + 1)}</span>
                <span className="num font-display text-xl font-semibold leading-none">{d.getDate()}</span>
              </>
            ) : (
              <span className="py-1 font-mono text-[10px] font-medium uppercase tracking-wide">{game.dateText}</span>
            )}
          </div>
          {hot && (
            <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-hot px-2 py-1 font-mono text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-white">
              <Sparkles className="size-3" /> Aguardado
            </span>
          )}
        </div>
        <div className="flex w-full flex-1 flex-col p-3.5">
          <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug">{cleanName(game.title)}</h3>
          <p className="mt-1 line-clamp-1 text-xs text-fg-3">{[game.genres.slice(0, 2).join(', '), game.developer].filter(Boolean).join(' · ') || '—'}</p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-3.5">
            <Platforms list={game.platforms} max={4} />
            {days !== null && days >= 0 && (
              <span className={cx('num shrink-0 text-[11px] font-semibold', days <= 7 ? 'text-accent-text' : 'text-fg-3')}>{relativeDays(game.date!)}</span>
            )}
          </div>
        </div>
      </button>
      <FavButton gameKey={game.key} name={game.title} image={game.image} className={FAV_ON_CARD} />
    </article>
  )
}

/* ------------------------------- Ranking em pôster ------------------------------- */
export function RankPoster({ e }: { e: MostPlayedEntry }) {
  const open = useOpenGame()
  return (
    <button
      onClick={() => open(e.key)}
      className={cx('group shrink-0 text-left', e.rank >= 10 ? 'pl-[104px] sm:pl-[136px]' : e.rank === 1 ? 'pl-[44px] sm:pl-[58px]' : 'pl-[62px] sm:pl-[82px]')}
      aria-label={`${e.rank}º lugar: ${cleanName(e.name)}, ${fmtCompact(e.current)} jogando`}
    >
      <div className="w-[132px] sm:w-[168px]">
        <div className="relative">
        <span className="rank-num pointer-events-none absolute -bottom-1.5 right-[calc(100%-20px)] select-none text-[132px] sm:text-[172px]" aria-hidden>
          {e.rank}
        </span>
        <div className="zoom-img shine relative rounded-[18px] shadow-[0_24px_50px_-24px_rgb(0_0_0/0.9)] ring-1 ring-line-strong transition-transform duration-500 ease-[var(--ease-fluid)] group-hover:-translate-y-1.5">
          <GameImage src={e.poster} fallback={e.capsule ?? e.image} alt={e.name} variant="poster" className="aspect-[2/3] w-full" />
        </div>
        </div>
        <div className="mt-3.5 px-0.5">
          <div className="truncate text-[13px] font-semibold">{cleanName(e.name)}</div>
          <div className="num mt-1 flex items-center gap-1.5 text-xs text-fg-3">
            <Users className="size-3" />
            {fmtCompact(e.current)} jogando
          </div>
        </div>
      </div>
    </button>
  )
}

/* ------------------------------- Linha de ranking ------------------------------- */
export function RankDelta({ rank, prev }: { rank: number; prev: number | null }) {
  if (prev === null) return <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-cyan">novo</span>
  const d = prev - rank
  if (d === 0) return <Minus className="size-3.5 text-fg-3" aria-label="sem mudança" />
  return (
    <span className={cx('num inline-flex items-center font-mono text-[11px] font-semibold', d > 0 ? 'text-up' : 'text-down')}>
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
      className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors duration-200 hover:bg-surface-2 sm:gap-4 sm:px-3"
    >
      <div className="flex w-8 shrink-0 flex-col items-center gap-0.5">
        <span className={cx('num font-display text-lg font-semibold leading-none', e.rank <= 3 ? 'text-accent-text' : 'text-fg')}>{e.rank}</span>
        <RankDelta rank={e.rank} prev={e.prevRank} />
      </div>
      <GameImage src={e.image} alt={e.name} className={cx('shrink-0 rounded-xl ring-1 ring-line', dense ? 'h-11 w-[94px]' : 'h-12 w-[104px] sm:h-14 sm:w-[120px]')} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{cleanName(e.name)}</div>
        <div className="truncate text-xs text-fg-3">{e.tags.slice(0, 3).join(' · ') || e.developer}</div>
      </div>
      <Sparkline points={e.history} width={92} height={30} className="hidden shrink-0 sm:block" />
      <div className="w-[76px] shrink-0 text-right">
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
  twitch: 'bg-[#9146ff]/15 text-[#b79bff]',
  'steam-players': 'bg-[#66c0f4]/12 text-[#7cc8f5]',
  'steam-sellers': 'bg-[#66c0f4]/12 text-[#7cc8f5]',
  playstation: 'bg-[#0070d1]/18 text-[#64aeff]',
  xbox: 'bg-[#107c10]/22 text-[#63d463]',
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
        <span key={s.source} className={cx('num rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium', SIGNAL_STYLE[s.source])} title={s.label}>
          {SIGNAL_SHORT[s.source]} #{s.rank}
        </span>
      ))}
    </div>
  )
}

export function HypeCard({ entry, rank }: { entry: HypeEntry; rank: number }) {
  const open = useOpenGame()
  return (
    <button onClick={() => open(entry.key)} className="group card card-hover flex h-full w-full flex-col overflow-hidden text-left">
      <div className="zoom-img shine w-full">
        <GameImage src={entry.image} alt={entry.name} className="aspect-[460/215] w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <span className="num absolute bottom-1.5 left-3 font-display text-[44px] font-semibold leading-none tracking-[-0.06em] text-white drop-shadow-lg">{rank}</span>
        {rank <= 3 && (
          <span className="absolute right-2.5 top-2.5 grid size-7 place-items-center rounded-full bg-hot text-white shadow-lg">
            <Crown className="size-3.5" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
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
          <button
            onClick={() => open(g.key)}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors duration-200 hover:bg-surface-2"
          >
            <span className={cx('num w-6 shrink-0 text-center font-mono text-[13px] font-semibold', i < 3 ? 'text-accent-text' : 'text-fg-3')}>
              {g.rank ?? i + 1}
            </span>
            <GameImage src={g.image} alt={g.name} className="h-9 w-[76px] shrink-0 rounded-lg ring-1 ring-line" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{cleanName(g.name)}</span>
            {g.discount ? <DiscountBadge value={g.discount} className="!px-1.5 !text-[10px]" /> : g.price ? <span className="num shrink-0 text-xs text-fg-3">{g.price}</span> : null}
          </button>
        </li>
      ))}
    </ol>
  )
}

export function WinnerStar() {
  return <Star className="size-3.5 text-gold" fill="currentColor" />
}
