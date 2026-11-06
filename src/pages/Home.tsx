import { ArrowRight, CalendarDays, Flame, Gift, Tag, Trophy, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { DealCard, FreeGameCard, HypeCard, MostPlayedRow, StatTile, UpcomingCard } from '../components/cards'
import { useOpenGame } from '../components/GameSheet'
import { Countdown, GameImage, Platforms, SectionHeader, Skeleton, cx } from '../components/ui'
import { useDatasets } from '../lib/data'
import { cleanName, daysUntil, fmtCompact, fmtDay, fmtNumber, relativeDays, timeAgo } from '../lib/format'
import { featuredDeals, spotlightReleases, useTitle } from '../lib/select'
import type { AwardEvent, UpcomingGame } from '../types'

const fade = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.05 },
  transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] as const },
}

export default function Home() {
  useTitle('')
  const { data, loading } = useDatasets('most-played', 'deals', 'upcoming', 'trending', 'awards', 'meta')
  const mp = data['most-played']
  const deals = data.deals
  const up = data.upcoming
  const tr = data.trending
  const aw = data.awards

  const spotlight = useMemo(() => (up && tr ? spotlightReleases(up.games, tr.hype, 150, 7) : []), [up, tr])
  const next30 = useMemo(
    () => up?.games.filter((g) => g.date && daysUntil(g.date) >= 0 && daysUntil(g.date) <= 30).length ?? 0,
    [up],
  )
  // os 8 lançamentos mais relevantes dos próximos 4 meses, em ordem de data
  const soon = useMemo(() => {
    if (!up || !tr) return []
    const skip = new Set(spotlight.slice(0, 4).map((g) => g.key))
    return spotlightReleases(up.games, tr.hype, 120, 16)
      .filter((g) => !skip.has(g.key))
      .slice(0, 8)
      .sort((a, b) => a.date!.localeCompare(b.date!))
  }, [up, tr, spotlight])
  const topDeals = useMemo(() => (deals ? featuredDeals(deals.deals, 10, 40) : []), [deals])
  const freeNow = deals?.free ?? []
  const nextAward = aw?.events.find((e) => e.date && daysUntil(e.date) >= 0)
  const lastFinished = aw?.events.find((e) => e.status === 'finished' && e.org === 'tga') ?? aw?.events.find((e) => e.status === 'finished')
  const goty = lastFinished?.categories.find((c) => /game of the year|best game/i.test(c.name))

  return (
    <div>
      {/* ------------------------------------ Hero ------------------------------------ */}
      <section className="grid grid-cols-1 items-center gap-8 pb-10 pt-8 sm:pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12 lg:pb-14 lg:pt-16">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/60 px-3.5 py-1.5 text-xs font-medium text-fg-2 backdrop-blur">
            <span className="live-dot" />
            Ao vivo{data.meta ? ` · atualizado ${timeAgo(data.meta.generatedAt)}` : ''}
          </div>
          <h1 className="font-display text-[44px] font-bold leading-[0.98] tracking-[-0.035em] sm:text-6xl xl:text-7xl">
            O <span className="text-gradient">pulso</span> do mundo
            <br />
            dos games.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-fg-2 sm:text-lg">
            O que está sendo jogado agora, o que chega nos próximos meses, onde está mais barato e quem leva os prêmios — tudo em
            um painel que se atualiza sozinho.
          </p>
          <div className="mt-7 grid max-w-xl grid-cols-3 gap-3">
            {[
              { v: mp ? fmtCompact(mp.totalPlayers) : '—', l: 'jogando agora*' },
              { v: deals ? fmtNumber(deals.deals.length) : '—', l: 'promoções ativas' },
              { v: up ? fmtNumber(next30) : '—', l: 'lançamentos em 30 dias' },
            ].map((s) => (
              <div key={s.l} className="border-l-2 border-accent/60 pl-3">
                <div className="num font-display text-2xl font-bold sm:text-3xl">{s.v}</div>
                <div className="text-xs text-fg-3 sm:text-[13px]">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/mais-jogados"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-accent-ink shadow-[0_8px_30px_-8px_var(--accent)] transition hover:brightness-110"
            >
              Ver os mais jogados <ArrowRight className="size-4" />
            </Link>
            <Link to="/promocoes" className="inline-flex items-center gap-2 rounded-full border border-line-strong px-5 py-3 text-sm font-semibold transition hover:bg-surface-2">
              Caçar promoções
            </Link>
          </div>
          <p className="mt-4 text-[11px] text-fg-3">*Soma dos 100 jogos mais jogados da Steam neste momento.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}>
          {spotlight[0] ? <Spotlight game={spotlight[0]} others={spotlight.slice(1, 4)} /> : <Skeleton className="aspect-[4/3.2] w-full rounded-[28px]" />}
        </motion.div>
      </section>

      {/* ------------------------------------ KPIs ------------------------------------ */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          tone="accent"
          icon={<Users className="size-4" />}
          label="Jogadores agora (Steam)"
          value={mp ? fmtCompact(mp.totalPlayers) : '—'}
          sub={mp ? `#1: ${cleanName(mp.steam[0].name)}` : undefined}
        />
        <StatTile
          tone="hot"
          icon={<Tag className="size-4" />}
          label="Promoções rastreadas"
          value={deals ? fmtNumber(deals.deals.length) : '—'}
          sub={deals ? `em ${deals.stores.length} lojas` : undefined}
        />
        <StatTile
          tone="violet"
          icon={<CalendarDays className="size-4" />}
          label="Lançamentos em 30 dias"
          value={up ? fmtNumber(next30) : '—'}
          sub={up ? `${fmtNumber(up.games.length)} no calendário` : undefined}
        />
        <StatTile
          tone="gold"
          icon={<Trophy className="size-4" />}
          label={nextAward ? `${nextAward.name} ${nextAward.year}` : 'Próxima premiação'}
          value={nextAward?.date ? `${daysUntil(nextAward.date)} dias` : '—'}
          sub={nextAward?.date ? fmtDay(nextAward.date) : undefined}
        />
      </section>

      {/* --------------------------- Mais jogados + Em alta --------------------------- */}
      <section className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-8">
        <motion.div {...fade} className="card p-4 sm:p-6">
          <SectionHeader eyebrow="Steam · ao vivo" icon={<span className="live-dot scale-75" />} title="Mais jogados agora" action={{ to: '/mais-jogados', label: 'Top 100' }} />
          <div className="-mx-2">
            {loading && !mp
              ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="mx-2 mb-2 h-14" />)
              : mp?.steam.slice(0, 8).map((e) => <MostPlayedRow key={e.appid} e={e} />)}
          </div>
        </motion.div>

        <motion.div {...fade} className="card p-4 sm:p-6">
          <SectionHeader eyebrow="Índice Pulso" icon={<Flame className="size-3.5 text-hot" />} title="Em alta" action={{ to: '/em-alta', label: 'Ver tudo' }} />
          <p className="-mt-2 mb-4 text-[13px] leading-relaxed text-fg-2">
            Jogos que aparecem ao mesmo tempo entre os mais jogados, mais vendidos e mais assistidos.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {tr?.hype.slice(0, 6).map((h, i) => <HypeCard key={h.key} entry={h} rank={i + 1} />) ??
              Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[4/3]" />)}
          </div>
        </motion.div>
      </section>

      {/* ------------------------------------ Grátis ------------------------------------ */}
      {freeNow.length > 0 && (
        <motion.section {...fade} className="mt-16">
          <SectionHeader eyebrow="Epic Games Store" icon={<Gift className="size-3.5 text-accent-text" />} title="Grátis para resgatar" action={{ to: '/promocoes', label: 'Promoções' }} />
          <div className={cx('grid grid-cols-1 gap-4', freeNow.length === 1 ? 'md:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3')}>
            {freeNow.slice(0, 3).map((f) => (
              <FreeGameCard key={f.id} game={f} />
            ))}
          </div>
        </motion.section>
      )}

      {/* ---------------------------------- Promoções ---------------------------------- */}
      <motion.section {...fade} className="mt-16">
        <SectionHeader
          eyebrow="Steam · PlayStation · Xbox · GOG · Humble…"
          icon={<Tag className="size-3.5" />}
          title="Promoções em destaque"
          action={{ to: '/promocoes', label: `Todas${deals ? ` (${fmtNumber(deals.deals.length)})` : ''}` }}
        />
        <div className="scroller edge-fade -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:[mask-image:none]">
          {topDeals.length
            ? topDeals.map((d) => (
                <div key={d.id} className="w-[72vw] max-w-[280px] shrink-0 sm:w-[260px] lg:w-auto lg:max-w-none">
                  <DealCard deal={d} compact />
                </div>
              ))
            : Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="aspect-[3/4] w-[260px] shrink-0 lg:w-auto" />)}
        </div>
      </motion.section>

      {/* ---------------------------------- Lançamentos ---------------------------------- */}
      <motion.section {...fade} className="mt-16">
        <SectionHeader eyebrow="Calendário" icon={<CalendarDays className="size-3.5" />} title="Chegando em breve" action={{ to: '/lancamentos', label: 'Calendário completo' }} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {soon.length
            ? soon.map((g) => <UpcomingCard key={g.id} game={g} hot={spotlight.some((s) => s.key === g.key)} />)
            : Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="aspect-[4/3]" />)}
        </div>
      </motion.section>

      {/* ---------------------------------- Premiações ---------------------------------- */}
      {aw && (nextAward || lastFinished) && (
        <motion.section {...fade} className="mt-16">
          <AwardsTeaser next={nextAward} last={lastFinished} gotyWinner={goty?.nominees.find((n) => n.winner)} />
        </motion.section>
      )}
    </div>
  )
}

function Spotlight({ game, others }: { game: UpcomingGame; others: UpcomingGame[] }) {
  const open = useOpenGame()
  return (
    <div className="relative">
      <div className="absolute -inset-2 -z-10 rounded-[40px] sm:-inset-6 bg-[radial-gradient(closest-side,var(--accent-soft),transparent)] blur-2xl" />
      <button onClick={() => open(game.key)} className="group relative block w-full overflow-hidden rounded-[28px] border border-line-strong text-left shadow-2xl">
        <div className="zoom-img">
          <GameImage src={game.image} alt={game.title} className="aspect-[4/5] w-full sm:aspect-[16/10]" eager />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/0" />
        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md">
          <span className="live-dot accent scale-75" /> Próximo grande lançamento
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-white/80">
            <span className="font-semibold text-white">{fmtDay(game.date!, { weekday: true })}</span>
            <span>·</span>
            <span>{relativeDays(game.date!)}</span>
          </div>
          <h2 className="font-display text-3xl font-bold leading-[1.02] tracking-tight text-white sm:text-[44px]">{cleanName(game.title)}</h2>
          <div className="mt-3 [&_span]:border-white/15 [&_span]:bg-white/10 [&_span]:text-white/90">
            <Platforms list={game.platforms} max={6} />
          </div>
          <div className="mt-5 [&_div.rounded-xl]:border-white/10 [&_div.rounded-xl]:bg-black/45 [&_span]:text-white [&_span.uppercase]:text-white/60">
            <Countdown to={game.date!} size="md" />
          </div>
        </div>
      </button>
      {others.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3">
          {others.map((g) => (
            <button key={g.id} onClick={() => open(g.key)} className="group card card-hover overflow-hidden text-left">
              <div className="zoom-img">
                <GameImage src={g.image} alt={g.title} className="aspect-[16/9] w-full" />
              </div>
              <div className="p-2.5">
                <div className="truncate text-[12px] font-semibold">{cleanName(g.title)}</div>
                <div className="text-[11px] text-fg-3">{fmtDay(g.date!, { year: false })}</div>
              </div>
            </button>
          ))}
        </div>
      )}
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
    <div className="relative overflow-hidden rounded-[28px] border border-line-strong bg-surface">
      <div className="absolute inset-0 bg-[radial-gradient(700px_300px_at_100%_0%,var(--gold-soft),transparent),radial-gradient(500px_300px_at_0%_100%,var(--violet-soft),transparent)]" />
      <div className="relative grid grid-cols-1 gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
            <Trophy className="size-3.5" /> Temporada de premiações
          </div>
          {next ? (
            <>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {next.name} {next.year}
              </h2>
              <p className="mt-2 max-w-lg text-fg-2">
                {next.status === 'upcoming'
                  ? `Cerimônia em ${fmtDay(next.date!, { weekday: true })}. ${next.note ?? ''}`
                  : `Indicados anunciados — a cerimônia acontece em ${fmtDay(next.date!)}.`}
              </p>
              <div className="mt-6">
                <Countdown to={next.date!} size="lg" />
              </div>
            </>
          ) : (
            <h2 className="font-display text-3xl font-bold">Premiações</h2>
          )}
          <Link to="/premiacoes" className="mt-7 inline-flex items-center gap-2 rounded-full bg-fg px-5 py-2.5 text-sm font-bold text-bg transition hover:opacity-90">
            Ver indicados e vencedores <ArrowRight className="size-4" />
          </Link>
        </div>
        {gotyWinner && last && (
          <button onClick={() => open(gotyWinner.key)} className="group relative overflow-hidden rounded-3xl border border-gold/30 text-left">
            <div className="zoom-img">
              <GameImage src={gotyWinner.image} alt={gotyWinner.title} className="aspect-[16/10] w-full" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
                Jogo do Ano · {last.name} {last.year}
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-white">{cleanName(gotyWinner.title)}</div>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}
