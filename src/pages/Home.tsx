import { ArrowRight, ArrowUpRight, CalendarDays, Flame, Gift, Tag, Trophy, Users } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DealCard, HypeCard, RankPoster, SignalChips, UpcomingCard } from '../components/cards'
import { useOpenGame } from '../components/GameSheet'
import {
  Accent,
  AnimatedNumber,
  Countdown,
  EASE,
  EndsIn,
  GameImage,
  Platforms,
  Rail,
  Reveal,
  SectionHeader,
  Skeleton,
  Sparkline,
  StoreDot,
  cx,
  hiRes,
  stagger,
} from '../components/ui'
import { useDatasets } from '../lib/data'
import { cleanName, daysUntil, fmtCompact, fmtDay, fmtMoney, fmtNumber, relativeDays, timeAgo } from '../lib/format'
import { featuredDeals, spotlightReleases, useTitle } from '../lib/select'
import type { AwardEvent, Deal, DealsData, FreeGame, MostPlayedData, MostPlayedEntry, UpcomingGame } from '../types'

/* ------------------------------------------------------------------------------------ */
/*  Destaque rotativo                                                                    */
/* ------------------------------------------------------------------------------------ */

interface Slide {
  id: string
  tab: string
  eyebrow: string
  icon: ReactNode
  title: string
  /** abre o painel do jogo ao clicar na arte / botão principal */
  gameKey?: string
  art?: string
  thumb?: string
  body: ReactNode
  primary: { label: string; href?: string; to?: string }
  secondary?: { label: string; to: string }
}

const SLIDE_MS = 8000

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}

function Hero({ slides }: { slides: Slide[] }) {
  const open = useOpenGame()
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const i = index % slides.length
  const slide = slides[i]
  const go = (n: number) => setIndex((n + slides.length) % slides.length)
  const act = () => slide.gameKey && open(slide.gameKey)

  return (
    <section
      className="relative isolate overflow-clip rounded-[28px] border border-white/10 bg-[#0b0c10] text-white shadow-[0_50px_110px_-55px_rgb(0_0_0/0.95)] sm:rounded-[36px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carrossel"
      aria-label="Destaques"
    >
      {/* Luz ambiente: a própria arte, desfocada */}
      <AnimatePresence initial={false}>
        <motion.div
          key={slide.id}
          className="absolute inset-0 -z-10 overflow-clip"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
          aria-hidden
        >
          {slide.thumb && <img src={slide.thumb} alt="" className="h-full w-full scale-125 object-cover opacity-75 blur-3xl saturate-[1.7]" />}
          <div className="hero-scrim absolute inset-0" />
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-1 items-center gap-6 p-4 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-12 lg:p-12 lg:pb-9">
        <div className="relative order-1 lg:order-2">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, x: 44, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -28, scale: 0.98 }}
              transition={{ duration: 0.85, ease: EASE }}
            >
              <button
                type="button"
                onClick={act}
                tabIndex={slide.gameKey ? 0 : -1}
                aria-label={`Ver detalhes de ${cleanName(slide.title)}`}
                className={cx(
                  'kenburns block w-full overflow-clip rounded-[20px] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/15 sm:rounded-[26px]',
                  !slide.gameKey && 'cursor-default',
                )}
              >
                <GameImage src={slide.art} fallback={slide.thumb} alt={slide.title} className="aspect-[16/10] w-full" eager />
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="order-2 flex min-h-[300px] flex-col justify-center lg:order-1 lg:min-h-[392px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.id}
              initial="hidden"
              animate="show"
              exit="exit"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.07, delayChildren: 0.06 } },
                exit: { opacity: 0, y: -10, transition: { duration: 0.18, ease: 'easeIn' } },
              }}
            >
              <motion.div variants={item} className="eyebrow flex items-center gap-2 !text-white/70">
                {slide.icon}
                {slide.eyebrow}
              </motion.div>
              <motion.h2 variants={item} className="display mt-4 text-[34px] sm:text-5xl lg:text-[58px]">
                {cleanName(slide.title)}
              </motion.h2>
              <motion.div variants={item} className="mt-4">
                {slide.body}
              </motion.div>
              <motion.div variants={item} className="mt-7 flex flex-wrap gap-2.5">
                {slide.primary.href ? (
                  <a href={slide.primary.href} target="_blank" rel="noreferrer" className="btn btn-light">
                    {slide.primary.label} <ArrowUpRight className="size-4" />
                  </a>
                ) : slide.primary.to ? (
                  <Link to={slide.primary.to} className="btn btn-light">
                    {slide.primary.label} <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <button type="button" onClick={act} className="btn btn-light">
                    {slide.primary.label}
                  </button>
                )}
                {slide.secondary && (
                  <Link to={slide.secondary.to} className="btn btn-glass">
                    {slide.secondary.label}
                  </Link>
                )}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Abas com barra de progresso */}
      <div className="flex gap-2 px-4 pb-4 sm:px-8 sm:pb-7 lg:px-12" role="tablist" aria-label="Escolher destaque">
        {slides.map((s, n) => (
          <button key={s.id} type="button" role="tab" aria-selected={n === i} aria-label={s.tab} onClick={() => go(n)} className="group/tab min-w-0 flex-1 py-1 text-left">
            <span
              className={cx(
                'eyebrow mb-2.5 hidden truncate transition-colors duration-300 sm:block',
                n === i ? '!text-white' : '!text-white/40 group-hover/tab:!text-white/75',
              )}
            >
              {s.tab}
            </span>
            <span className="block h-[3px] overflow-hidden rounded-full bg-white/15">
              {n === i ? (
                reduce ? (
                  <span className="block h-full bg-white" />
                ) : (
                  <span
                    key={index}
                    className="hero-progress block h-full rounded-full bg-white"
                    style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }}
                    onAnimationEnd={() => go(i + 1)}
                  />
                )
              ) : n < i ? (
                <span className="block h-full bg-white/40" />
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------------------ */
/*  Painel "agora"                                                                       */
/* ------------------------------------------------------------------------------------ */

/** Soma os jogadores do top 100 em cada coleta (para o gráfico do total). */
function totalHistory(entries: MostPlayedEntry[]): [number, number][] {
  const buckets = new Map<number, { sum: number; n: number }>()
  for (const e of entries)
    for (const [t, v] of e.history) {
      const k = Math.round(t / 600_000)
      const b = buckets.get(k) ?? { sum: 0, n: 0 }
      b.sum += v
      b.n++
      buckets.set(k, b)
    }
  const max = Math.max(0, ...[...buckets.values()].map((b) => b.n))
  return [...buckets.entries()]
    .filter(([, b]) => b.n >= max * 0.6)
    .sort((a, b) => a[0] - b[0])
    .map(([k, b]) => [k * 600_000, b.sum])
}

const tile = 'group card card-hover flex flex-col overflow-hidden p-5'
const tileArrow = 'size-4 shrink-0 text-fg-3 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg'

function PlayersTile({ mp }: { mp: MostPlayedData }) {
  const total = useMemo(() => totalHistory(mp.steam), [mp])
  return (
    <Link to="/mais-jogados" className={cx(tile, 'col-span-2 sm:p-7 lg:row-span-2')} style={stagger(0)}>
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow flex items-center gap-2.5">
          <span className="live-dot scale-75" /> Jogando agora na Steam
        </span>
        <ArrowUpRight className={tileArrow} />
      </div>
      <AnimatedNumber value={mp.totalPlayers} className="display mt-5 block text-[52px] sm:text-[80px]" />
      <p className="mt-2 text-sm text-fg-2">pessoas nos 100 jogos mais populares · atualizado {timeAgo(mp.updatedAt)}</p>
      <div className="relative mt-6 min-h-[96px] flex-1">
        <Sparkline points={total} stretch width={600} height={160} strokeWidth={2} color="var(--accent-text)" className="absolute inset-0 h-full w-full" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-2.5 border-t border-line pt-5 sm:grid-cols-3">
        {mp.steam.slice(0, 3).map((e) => (
          <div key={e.appid} className="flex min-w-0 items-baseline justify-between gap-3 sm:block">
            <div className="flex min-w-0 items-center gap-2">
              <span className="num font-mono text-[11px] font-semibold text-accent-text">#{e.rank}</span>
              <span className="truncate text-[13px] font-semibold">{cleanName(e.name)}</span>
            </div>
            <div className="num shrink-0 text-xs text-fg-3 sm:mt-1">{fmtCompact(e.current)} jogando</div>
          </div>
        ))}
      </div>
    </Link>
  )
}

function DealsTile({ deals }: { deals: DealsData }) {
  return (
    <Link to="/promocoes" className={tile} style={stagger(1)}>
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow flex items-center gap-2">
          <Tag className="size-3.5 text-hot" /> Promoções
        </span>
        <ArrowUpRight className={tileArrow} />
      </div>
      <AnimatedNumber value={deals.deals.length} className="display mt-5 block text-[40px] sm:text-[46px]" />
      <p className="mt-1.5 text-xs text-fg-2">ofertas ativas em {deals.stores.length} lojas</p>
      <div className="mt-auto flex items-center gap-1.5 pt-5">
        {deals.stores.slice(0, 8).map((s) => (
          <StoreDot key={s.id} store={s.id} />
        ))}
        {deals.stores.length > 8 && <span className="font-mono text-[10px] text-fg-3">+{deals.stores.length - 8}</span>}
      </div>
    </Link>
  )
}

/** Jogo grátis do momento ou, na falta dele, o maior desconto em reais. */
function SpotTile({ free, deal }: { free?: FreeGame; deal?: Deal }) {
  const open = useOpenGame()
  const title = free?.title ?? deal?.title
  const key = free?.key ?? deal?.key
  if (!title || !key) return <div className={tile} style={stagger(2)} />
  return (
    <button onClick={() => open(key)} className={cx(tile, 'relative min-h-[176px] justify-end !p-0 text-left')} style={stagger(2)}>
      <div className="zoom-img absolute inset-0">
        <GameImage src={hiRes(free?.image ?? deal?.image, 800)} alt={title} className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />
      </div>
      <div className="relative p-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-1 font-mono text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-accent-ink">
          {free ? (
            <>
              <Gift className="size-3" /> Grátis agora
            </>
          ) : (
            <>−{deal!.discount}%</>
          )}
        </span>
        <div className="mt-2.5 line-clamp-2 text-[15px] font-semibold leading-tight text-white">{cleanName(title)}</div>
        <div className="mt-1 text-xs text-white/70">{free ? <EndsIn at={free.endsAt} /> : <span className="num">{fmtMoney(deal!.price, deal!.currency)}</span>}</div>
      </div>
    </button>
  )
}

function ReleasesTile({ count, next }: { count: number; next: UpcomingGame[] }) {
  return (
    <Link to="/lancamentos" className={tile} style={stagger(3)}>
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow flex items-center gap-2">
          <CalendarDays className="size-3.5 text-violet" /> Em 30 dias
        </span>
        <ArrowUpRight className={tileArrow} />
      </div>
      <div className="mt-5 flex items-baseline gap-2">
        <AnimatedNumber value={count} className="display text-[40px] sm:text-[46px]" />
        <span className="text-xs text-fg-2">lançamentos</span>
      </div>
      <ul className="mt-auto space-y-1.5 pt-4">
        {next.slice(0, 3).map((g) => (
          <li key={g.id} className="flex items-center gap-2.5 text-xs">
            <span className="num w-11 shrink-0 font-mono text-[10px] uppercase text-fg-3">{fmtDay(g.date!, { year: false }).replace(' de ', ' ').replace('.', '')}</span>
            <span className="truncate font-medium text-fg-2 transition-colors group-hover:text-fg">{cleanName(g.title)}</span>
          </li>
        ))}
      </ul>
    </Link>
  )
}

function AwardTile({ event }: { event?: AwardEvent }) {
  const days = event?.date ? daysUntil(event.date) : null
  return (
    <Link to="/premiacoes" className={cx(tile, 'relative')} style={stagger(4)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,var(--gold-soft),transparent_60%)]" />
      <div className="relative flex items-center justify-between gap-2">
        <span className="eyebrow flex items-center gap-2">
          <Trophy className="size-3.5 text-gold" /> Premiações
        </span>
        <ArrowUpRight className={tileArrow} />
      </div>
      {event && days !== null ? (
        <>
          <div className="relative mt-5 flex items-baseline gap-2">
            <AnimatedNumber value={days} className="display text-[40px] text-gold sm:text-[46px]" />
            <span className="text-xs text-fg-2">dias</span>
          </div>
          <p className="relative mt-auto pt-4 text-[13px] font-semibold leading-snug">
            {event.name} {event.year}
            <span className="mt-0.5 block text-xs font-normal text-fg-3">{fmtDay(event.date!)}</span>
          </p>
        </>
      ) : (
        <p className="relative mt-auto pt-4 text-[13px] font-semibold">Indicados e vencedores</p>
      )}
    </Link>
  )
}

/* ------------------------------------------------------------------------------------ */
/*  Página                                                                               */
/* ------------------------------------------------------------------------------------ */

export default function Home() {
  useTitle('')
  const { data } = useDatasets('most-played', 'deals', 'upcoming', 'trending', 'awards', 'meta')
  const mp = data['most-played']
  const deals = data.deals
  const up = data.upcoming
  const tr = data.trending
  const aw = data.awards

  const spotlight = useMemo(() => (up && tr ? spotlightReleases(up.games, tr.hype, 150, 14) : []), [up, tr])
  const soon = useMemo(
    () =>
      spotlight
        .slice(1)
        .filter((g) => daysUntil(g.date!) <= 120)
        .slice(0, 10)
        .sort((a, b) => a.date!.localeCompare(b.date!)),
    [spotlight],
  )
  const next30 = useMemo(() => up?.games.filter((g) => g.date && daysUntil(g.date) >= 0 && daysUntil(g.date) <= 30).length ?? 0, [up])
  const topDeals = useMemo(() => (deals ? featuredDeals(deals.deals, 12, 40) : []), [deals])
  const bestDeal = useMemo(
    () =>
      deals?.deals
        .filter((d) => d.currency === 'BRL' && d.image && (d.popularity ?? 999) <= 40)
        .sort((a, b) => b.discount - a.discount || (a.popularity ?? 999) - (b.popularity ?? 999))[0],
    [deals],
  )
  const freeNow = deals?.free.find((f) => f.status === 'now')
  const nextAward = aw?.events.find((e) => e.date && daysUntil(e.date) >= 0)
  const lastFinished = aw?.events.find((e) => e.status === 'finished' && e.org === 'tga') ?? aw?.events.find((e) => e.status === 'finished')
  const goty = lastFinished?.categories.find((c) => /game of the year|best game/i.test(c.name))?.nominees.find((n) => n.winner)

  const slides = useMemo(() => {
    const out: Slide[] = []
    const release = spotlight[0]
    const top = mp?.steam[0]
    if (release) {
      out.push({
        id: 'release',
        tab: 'Lançamento',
        eyebrow: 'Próximo grande lançamento',
        icon: <span className="live-dot accent scale-75" />,
        title: release.title,
        gameKey: release.key,
        art: release.hero ?? hiRes(release.image),
        thumb: release.image,
        body: (
          <>
            <p className="text-[15px] text-white/70">
              <strong className="font-semibold text-white">{fmtDay(release.date!, { weekday: true })}</strong> · {relativeDays(release.date!)}
            </p>
            <div className="mt-3">
              <Platforms list={release.platforms} max={6} tone="onImage" />
            </div>
            <div className="mt-6">
              <Countdown to={release.date!} tone="onImage" />
            </div>
          </>
        ),
        primary: { label: 'Ver detalhes' },
        secondary: { label: 'Calendário completo', to: '/lancamentos' },
      })
    }
    if (top) {
      out.push({
        id: 'playing',
        tab: 'Mais jogado',
        eyebrow: 'Mais jogado agora',
        icon: <span className="live-dot scale-75" />,
        title: top.name,
        gameKey: top.key,
        art: top.hero,
        thumb: top.capsule ?? top.image,
        body: (
          <>
            <div className="flex items-end gap-5">
              <div>
                <div className="num display text-[44px] sm:text-[56px]">{fmtNumber(top.current)}</div>
                <p className="mt-1.5 text-sm text-white/70">jogando neste momento · pico de {fmtCompact(top.peak24h)} em 24h</p>
              </div>
              <Sparkline points={top.history} width={132} height={48} strokeWidth={2} className="mb-7 hidden shrink-0 sm:block" />
            </div>
            <p className="mt-4 line-clamp-1 text-xs text-white/55">{top.tags.slice(0, 4).join(' · ')}</p>
          </>
        ),
        primary: { label: 'Ver detalhes' },
        secondary: { label: 'Top 100', to: '/mais-jogados' },
      })
    }
    if (freeNow) {
      out.push({
        id: 'free',
        tab: 'Grátis',
        eyebrow: 'Grátis na Epic Games Store',
        icon: <Gift className="size-3.5" />,
        title: freeNow.title,
        gameKey: freeNow.key,
        art: hiRes(freeNow.image, 1280),
        thumb: hiRes(freeNow.image, 480),
        body: (
          <>
            <p className="text-[15px] text-white/70">
              Para resgatar e ficar com o jogo para sempre.{' '}
              {freeNow.originalPrice && freeNow.originalPrice !== '0' && (
                <>
                  De <span className="num line-through">{freeNow.originalPrice}</span> por <strong className="font-semibold text-white">R$ 0</strong>.
                </>
              )}
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ring-white/15">
              <EndsIn at={freeNow.endsAt} prefix="A oferta termina em" />
            </p>
          </>
        ),
        primary: { label: 'Resgatar na Epic', href: freeNow.url },
        secondary: { label: 'Todas as promoções', to: '/promocoes' },
      })
    }
    const trend = tr?.hype.find((h) => h.key !== top?.key && h.key !== release?.key)
    if (trend) {
      out.push({
        id: 'trend',
        tab: 'Em alta',
        eyebrow: 'Em alta · Índice Pulso',
        icon: <Flame className="size-3.5 text-hot" />,
        title: trend.name,
        gameKey: trend.key,
        art: trend.hero ?? hiRes(trend.image),
        thumb: trend.image,
        body: (
          <>
            <p className="max-w-md text-[15px] text-white/70">Aparece ao mesmo tempo entre os mais jogados, os mais vendidos e os mais populares das lojas.</p>
            <div className="mt-4">
              <SignalChips entry={trend} max={5} />
            </div>
          </>
        ),
        primary: { label: 'Ver detalhes' },
        secondary: { label: 'Ranking completo', to: '/em-alta' },
      })
    }
    if (nextAward?.date) {
      out.push({
        id: 'award',
        tab: 'Premiações',
        eyebrow: 'Temporada de premiações',
        icon: <Trophy className="size-3.5 text-gold" />,
        title: `${nextAward.name} ${nextAward.year}`,
        art: hiRes(goty?.image),
        thumb: goty?.image,
        body: (
          <>
            <p className="text-[15px] text-white/70">
              Cerimônia em <strong className="font-semibold text-white">{fmtDay(nextAward.date, { weekday: true })}</strong>
              {goty && lastFinished ? ` · ${cleanName(goty.title)} levou o Jogo do Ano em ${lastFinished.year}` : ''}
            </p>
            <div className="mt-6">
              <Countdown to={nextAward.date} tone="onImage" />
            </div>
          </>
        ),
        primary: { label: 'Indicados e vencedores', to: '/premiacoes' },
      })
    }
    return out
  }, [spotlight, mp, freeNow, tr, nextAward, goty, lastFinished])

  return (
    <div>
      {/* Cabeçalho */}
      <header className="stagger flex flex-col gap-5 pb-7 pt-8 sm:pb-9 sm:pt-12 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="display text-[42px] sm:text-6xl lg:text-[76px]">
          O <Accent>pulso</Accent> do mundo
          <br />
          dos games.
        </h1>
        <div className="flex flex-col gap-4 lg:items-end lg:pb-2.5" style={stagger(2)}>
          <p className="max-w-[26rem] text-[15px] leading-relaxed text-fg-2 lg:text-right">
            O que está sendo jogado, o que vem por aí, onde está mais barato e quem leva os prêmios. Atualizado sozinho, o dia todo.
          </p>
          <span className="inline-flex w-fit items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 py-2 text-xs text-fg-2">
            <span className="live-dot scale-90" />
            Ao vivo{data.meta ? ` · atualizado ${timeAgo(data.meta.generatedAt)}` : ''}
          </span>
        </div>
      </header>

      {slides.length ? <Hero slides={slides} /> : <Skeleton className="h-[560px] w-full rounded-[36px]" />}

      {/* Painel de números */}
      <section className="stagger mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Agora em números">
        {mp && deals && up ? (
          <>
            <PlayersTile mp={mp} />
            <DealsTile deals={deals} />
            <SpotTile free={freeNow} deal={bestDeal} />
            <ReleasesTile count={next30} next={soon.length ? soon : spotlight} />
            <AwardTile event={nextAward} />
          </>
        ) : (
          <>
            <Skeleton className="col-span-2 h-[380px] rounded-[22px] lg:row-span-2" />
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[180px] rounded-[22px]" />
            ))}
          </>
        )}
      </section>

      {/* Top 10 */}
      <Reveal className="mt-20">
        <SectionHeader
          eyebrow="Steam · ao vivo"
          icon={<span className="live-dot scale-75" />}
          title={
            <>
              Top 10 <Accent>agora</Accent>
            </>
          }
          action={{ to: '/mais-jogados', label: 'Top 100' }}
        />
        <Rail label="Dez jogos mais jogados agora" className="!gap-2 sm:!gap-3">
          {mp
            ? mp.steam.slice(0, 10).map((e) => <RankPoster key={e.appid} e={e} />)
            : Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="ml-12 aspect-[2/3] w-[168px] shrink-0 rounded-[18px]" />)}
        </Rail>
      </Reveal>

      {/* Promoções */}
      <Reveal className="mt-16">
        <SectionHeader
          eyebrow="Em todas as lojas"
          icon={<Tag className="size-3.5" />}
          title={
            <>
              Promoções em <Accent>destaque</Accent>
            </>
          }
          action={{ to: '/promocoes', label: deals ? `Todas as ${fmtNumber(deals.deals.length)}` : 'Todas' }}
        />
        <Rail label="Promoções em destaque">
          {topDeals.length
            ? topDeals.map((d) => (
                <div key={d.id} className="w-[236px] shrink-0 sm:w-[258px]">
                  <DealCard deal={d} />
                </div>
              ))
            : Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="aspect-[3/4] w-[258px] shrink-0 rounded-[22px]" />)}
        </Rail>
      </Reveal>

      {/* Em alta */}
      <Reveal className="mt-16">
        <SectionHeader
          eyebrow="Índice Pulso"
          icon={<Flame className="size-3.5 text-hot" />}
          title={
            <>
              Em <Accent>alta</Accent>
            </>
          }
          description="Jogos que aparecem ao mesmo tempo entre os mais jogados, os mais vendidos e os mais assistidos."
          action={{ to: '/em-alta', label: 'Ver ranking' }}
        />
        <Rail label="Jogos em alta">
          {tr
            ? tr.hype.slice(0, 12).map((h, i) => (
                <div key={h.key} className="w-[236px] shrink-0 sm:w-[258px]">
                  <HypeCard entry={h} rank={i + 1} />
                </div>
              ))
            : Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="aspect-[4/3] w-[258px] shrink-0 rounded-[22px]" />)}
        </Rail>
      </Reveal>

      {/* Lançamentos */}
      <Reveal className="mt-16">
        <SectionHeader
          eyebrow="Calendário"
          icon={<CalendarDays className="size-3.5" />}
          title={
            <>
              Chegando em <Accent>breve</Accent>
            </>
          }
          action={{ to: '/lancamentos', label: 'Calendário completo' }}
        />
        <Rail label="Próximos lançamentos">
          {soon.length
            ? soon.map((g) => (
                <div key={g.id} className="w-[236px] shrink-0 sm:w-[258px]">
                  <UpcomingCard game={g} />
                </div>
              ))
            : Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="aspect-[4/3] w-[258px] shrink-0 rounded-[22px]" />)}
        </Rail>
      </Reveal>

      {/* Premiações */}
      {aw && (nextAward || lastFinished) && (
        <Reveal className="mt-16">
          <AwardsTeaser next={nextAward} last={lastFinished} gotyWinner={goty} />
        </Reveal>
      )}

      <p className="mt-12 flex items-center gap-2 text-xs text-fg-3">
        <Users className="size-3.5" />
        O total de jogadores soma os 100 jogos mais jogados da Steam neste momento.
      </p>
    </div>
  )
}

function AwardsTeaser({
  next,
  last,
  gotyWinner,
}: {
  next?: AwardEvent
  last?: AwardEvent
  gotyWinner?: { title: string; image?: string; key: string }
}) {
  const open = useOpenGame()
  return (
    <div className="card relative overflow-hidden !rounded-[28px] sm:!rounded-[36px]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_320px_at_100%_0%,var(--gold-soft),transparent),radial-gradient(520px_320px_at_0%_100%,var(--violet-soft),transparent)]" />
      <div className="relative grid grid-cols-1 gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:p-12">
        <div>
          <div className="eyebrow mb-4 inline-flex items-center gap-2 !text-gold">
            <Trophy className="size-3.5" /> Temporada de premiações
          </div>
          {next ? (
            <>
              <h2 className="display text-[34px] sm:text-5xl">
                {next.name} <span className="font-serif text-[1.08em] font-normal italic text-gold">{next.year}</span>
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-fg-2">
                {next.status === 'upcoming'
                  ? `Cerimônia em ${fmtDay(next.date!, { weekday: true })}. ${next.note ?? ''}`
                  : `Indicados anunciados. A cerimônia acontece em ${fmtDay(next.date!)}.`}
              </p>
              <div className="mt-7">
                <Countdown to={next.date!} size="lg" />
              </div>
            </>
          ) : (
            <h2 className="display text-[34px] sm:text-5xl">Premiações</h2>
          )}
          <Link to="/premiacoes" className="btn btn-primary mt-8">
            Ver indicados e vencedores <ArrowRight className="size-4" />
          </Link>
        </div>
        {gotyWinner && last && (
          <button onClick={() => open(gotyWinner.key)} className="group relative overflow-hidden rounded-3xl text-left ring-1 ring-gold/30">
            <div className="zoom-img shine">
              <GameImage src={gotyWinner.image} alt={gotyWinner.title} className="aspect-[16/10] w-full" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <div className="eyebrow !text-[#ffcf5c]">
                Jogo do Ano · {last.name} {last.year}
              </div>
              <div className="display mt-2 text-2xl text-white sm:text-[28px]">{cleanName(gotyWinner.title)}</div>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
