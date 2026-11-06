import { ArrowUpRight, Crown, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { WinnerStar } from '../components/cards'
import { useOpenGame } from '../components/GameSheet'
import { Chip, Countdown, EmptyState, ErrorBox, GameImage, PageHeader, Skeleton, cx } from '../components/ui'
import { useDataset } from '../lib/data'
import { cleanName, daysUntil, fmtDay } from '../lib/format'
import { trAward as tr } from '../lib/i18n'
import { useTitle } from '../lib/select'
import type { AwardCategory, AwardEvent } from '../types'

const STATUS_LABEL: Record<AwardEvent['status'], string> = {
  upcoming: 'Em breve',
  nominees: 'Indicados',
  finished: 'Vencedores',
}


export default function Awards() {
  useTitle('Premiações')
  const { data, loading, error } = useDataset('awards')
  const [selected, setSelected] = useState<string | null>(null)
  const events = data?.events ?? []
  const ev = events.find((e) => e.id === selected) ?? events[0]
  // enquanto a próxima cerimônia não tem indicados, mostra a edição anterior logo abaixo
  const previous = ev?.status === 'upcoming' ? events.find((e) => e.org === ev.org && e.year === ev.year - 1) : undefined

  if (error && !data) return <ErrorBox error={error} />

  return (
    <div>
      <PageHeader
        eyebrow="Premiações"
        icon={<Trophy className="size-3.5 text-gold" />}
        title={
          <>
            Quem está levando <span className="text-gradient">os troféus</span>
          </>
        }
        description="The Game Awards, BAFTA Games Awards e D.I.C.E. Awards: indicados, vencedores e os jogos mais premiados. Os indicados aparecem aqui automaticamente assim que são anunciados."
      />

      <div className="scroller mb-8 flex gap-2 overflow-x-auto">
        {events.map((e) => (
          <Chip key={e.id} active={ev?.id === e.id} onClick={() => setSelected(e.id)}>
            {e.name} {e.year}
            <span
              className={cx(
                'rounded-full px-1.5 text-[10px] font-bold uppercase',
                e.status === 'upcoming' ? 'bg-hot-soft text-hot' : e.status === 'nominees' ? 'bg-violet-soft text-violet' : 'bg-gold-soft text-gold',
                ev?.id === e.id && 'bg-bg/20 text-bg',
              )}
            >
              {STATUS_LABEL[e.status]}
            </span>
          </Chip>
        ))}
      </div>

      {loading && !data ? (
        <Skeleton className="h-96" />
      ) : !ev ? (
        <EmptyState icon={<Trophy className="size-5" />} title="Sem premiações no momento" />
      ) : (
        <>
          <EventView event={ev} />
          {previous && (
            <div className="mt-16">
              <div className="mb-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-3">
                  Enquanto isso · {previous.name} {previous.year}
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <EventView event={previous} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EventView({ event }: { event: AwardEvent }) {
  const goty = event.categories.find((c) => /^(game of the year|best game)$/i.test(c.name))
  const groups = useMemo(() => {
    const m = new Map<string, AwardCategory[]>()
    for (const c of event.categories) {
      if (c === goty) continue
      const g = c.group && !/^media$/i.test(c.group) ? c.group : 'Categorias'
      m.set(g, [...(m.get(g) ?? []), c])
    }
    return [...m.entries()]
  }, [event, goty])

  if (event.status === 'upcoming') return <UpcomingEvent event={event} />

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {goty && <GotyPanel event={event} category={goty} />}
        {event.leaders.length > 0 && <Leaders event={event} />}
      </div>

      {groups.map(([name, cats]) => (
        <section key={name} className="mt-12">
          {groups.length > 1 && <h3 className="mb-4 font-display text-xl font-bold">{tr(name)}</h3>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cats.map((c) => (
              <CategoryCard key={c.name} category={c} />
            ))}
          </div>
        </section>
      ))}

      {event.url && (
        <a href={event.url} target="_blank" rel="noreferrer" className="mt-10 inline-flex items-center gap-1.5 text-sm text-fg-3 hover:text-fg">
          Fonte: Wikipedia <ArrowUpRight className="size-3.5" />
        </a>
      )}
    </div>
  )
}

function UpcomingEvent({ event }: { event: AwardEvent }) {
  const days = event.date ? daysUntil(event.date) : null
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-line-strong bg-surface p-6 sm:p-12">
      <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_100%_0%,var(--gold-soft),transparent),radial-gradient(600px_300px_at_0%_100%,var(--violet-soft),transparent)]" />
      <Trophy className="absolute -right-6 -top-6 size-56 text-gold opacity-[0.07]" strokeWidth={1} />
      <div className="relative max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gold">
          <span className="live-dot scale-75" style={{ background: 'var(--gold)' }} />
          Próxima cerimônia
        </span>
        <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-6xl">
          {event.name} {event.year}
        </h2>
        {event.date && (
          <p className="mt-3 text-lg text-fg-2">
            {fmtDay(event.date, { weekday: true })} · Peacock Theater, Los Angeles
            {days !== null && days >= 0 && <span className="text-fg-3"> · faltam {days} dias</span>}
          </p>
        )}
        {event.date && (
          <div className="mt-8">
            <Countdown to={event.date} size="lg" />
          </div>
        )}
        <p className="mt-8 max-w-lg text-sm leading-relaxed text-fg-2">
          {event.note ?? 'Os indicados aparecerão aqui automaticamente assim que forem anunciados.'}
        </p>
      </div>
    </div>
  )
}

function GotyPanel({ event, category }: { event: AwardEvent; category: AwardCategory }) {
  const open = useOpenGame()
  const winner = category.nominees.find((n) => n.winner)
  const lead = winner ?? category.nominees[0]
  const others = category.nominees.filter((n) => n !== lead)
  return (
    <section className="card overflow-hidden">
      <button onClick={() => open(lead.key)} className="group relative block w-full text-left">
        <div className="zoom-img">
          <GameImage src={lead.image} alt={lead.title} className="aspect-[16/8] w-full" eager />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-gold px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-black">
            <Crown className="size-3.5" />
            {winner ? `${tr(category.name)} · ${event.year}` : `Indicados a ${tr(category.name)}`}
          </div>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">{cleanName(lead.title)}</h2>
          {lead.credit && <p className="mt-1 text-sm text-white/70">{lead.credit}</p>}
        </div>
      </button>
      <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
        {others.map((n) => (
          <button key={n.title} onClick={() => open(n.key)} className="group flex items-center gap-3 bg-surface p-3 text-left transition hover:bg-surface-2">
            <GameImage src={n.image} alt={n.title} className="h-10 w-[72px] shrink-0 rounded-lg" />
            <span className="line-clamp-2 text-[13px] font-medium leading-snug">{cleanName(n.title)}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function Leaders({ event }: { event: AwardEvent }) {
  const open = useOpenGame()
  const max = event.leaders[0]?.nominations ?? 1
  return (
    <section className="card p-5 sm:p-6">
      <h3 className="font-display text-xl font-bold">Mais indicados</h3>
      <p className="mt-1 text-xs text-fg-3">
        <span className="mr-3 inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-gold" /> vitórias
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-surface-3 ring-1 ring-line-strong" /> indicações
        </span>
      </p>
      <ol className="mt-5 space-y-3.5">
        {event.leaders.slice(0, 8).map((l) => (
          <li key={l.key}>
            <button onClick={() => open(l.key)} className="group w-full text-left">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium group-hover:text-accent-text">{cleanName(l.title)}</span>
                <span className="num shrink-0 text-xs text-fg-2">
                  {event.status === 'finished' && <span className="font-semibold text-gold">{l.wins} </span>}
                  {event.status === 'finished' ? '/ ' : ''}
                  {l.nominations}
                </span>
              </div>
              <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3">
                <div className="absolute inset-y-0 left-0 rounded-full bg-fg-3/40" style={{ width: `${(l.nominations / max) * 100}%` }} />
                <div className="absolute inset-y-0 left-0 rounded-full bg-gold" style={{ width: `${(l.wins / max) * 100}%` }} />
              </div>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

function CategoryCard({ category }: { category: AwardCategory }) {
  const open = useOpenGame()
  const winner = category.nominees.find((n) => n.winner)
  const rest = category.nominees.filter((n) => n !== winner)
  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <h4 className="text-sm font-semibold">{tr(category.name)}</h4>
        {tr(category.name) !== category.name && <p className="text-[11px] text-fg-3">{category.name}</p>}
      </div>
      {winner && (
        <button onClick={() => open(winner.key)} className="group relative block text-left">
          <div className="zoom-img">
            <GameImage src={winner.image} alt={winner.title} className="aspect-[16/7] w-full" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-2 p-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gold text-black">
              <Crown className="size-3.5" />
            </span>
            <div className="min-w-0">
              <div className="truncate font-semibold text-white">{cleanName(winner.title)}</div>
              {winner.credit && <div className="truncate text-[11px] text-white/70">{winner.credit}</div>}
            </div>
          </div>
        </button>
      )}
      <ul className="flex-1 divide-y divide-line">
        {rest.map((n) => (
          <li key={n.title}>
            <button onClick={() => open(n.key)} className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] transition hover:bg-surface-2">
              {n.winner ? <WinnerStar /> : <span className="size-1.5 shrink-0 rounded-full bg-fg-3/50" />}
              <span className="min-w-0 flex-1 truncate text-fg-2">{cleanName(n.title)}</span>
            </button>
          </li>
        ))}
      </ul>
    </article>
  )
}
