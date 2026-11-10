import { ArrowUpRight, Crown, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { WinnerStar } from '../components/cards'
import { useOpenGame } from '../components/GameSheet'
import { Accent, Chip, ChipRow, Countdown, EmptyState, ErrorBox, GameImage, PageHeader, Skeleton, cx, stagger } from '../components/ui'
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
            Quem está levando <Accent>os troféus</Accent>
          </>
        }
        description="The Game Awards, BAFTA Games Awards e D.I.C.E. Awards: indicados, vencedores e os jogos mais premiados. Os indicados aparecem aqui automaticamente assim que são anunciados."
      />

      <ChipRow className="mb-10">
        {events.map((e) => {
          const active = ev?.id === e.id
          return (
            <Chip key={e.id} group="event" active={active} onClick={() => setSelected(e.id)}>
              {e.name} {e.year}
              <span
                className={cx(
                  'rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase leading-none tracking-wide',
                  active ? 'bg-bg/15' : e.status === 'upcoming' ? 'bg-hot-soft text-hot' : e.status === 'nominees' ? 'bg-violet-soft text-violet' : 'bg-gold-soft text-gold',
                )}
              >
                {STATUS_LABEL[e.status]}
              </span>
            </Chip>
          )
        })}
      </ChipRow>

      {loading && !data ? (
        <Skeleton className="h-96 rounded-[28px]" />
      ) : !ev ? (
        <EmptyState icon={<Trophy className="size-6" />} title="Sem premiações no momento" />
      ) : (
        <div key={ev.id}>
          <EventView event={ev} />
          {previous && (
            <div className="mt-20">
              <div className="mb-8 flex items-center gap-4">
                <span className="h-px flex-1 bg-line" />
                <span className="eyebrow">
                  Enquanto isso · {previous.name} {previous.year}
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <EventView event={previous} />
            </div>
          )}
        </div>
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
      <div className="stagger grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {goty && <GotyPanel event={event} category={goty} />}
        {event.leaders.length > 0 && <Leaders event={event} />}
      </div>

      {groups.map(([name, cats]) => (
        <section key={name} className="mt-14">
          {groups.length > 1 && <h3 className="mb-5 font-serif text-[32px] italic leading-none tracking-[-0.02em]">{tr(name)}</h3>}
          <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cats.map((c, i) => (
              <CategoryCard key={c.name} category={c} i={i} />
            ))}
          </div>
        </section>
      ))}

      {event.url && (
        <a href={event.url} target="_blank" rel="noreferrer" className="mt-10 inline-flex items-center gap-1.5 text-sm text-fg-3 transition-colors hover:text-fg">
          Fonte: Wikipedia <ArrowUpRight className="size-3.5" />
        </a>
      )}
    </div>
  )
}

function UpcomingEvent({ event }: { event: AwardEvent }) {
  const days = event.date ? daysUntil(event.date) : null
  return (
    <div className="card relative overflow-hidden !rounded-[28px] p-6 sm:!rounded-[36px] sm:p-12 lg:p-14" style={{ animation: 'rise 0.7s var(--ease-fluid) both' }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_420px_at_100%_0%,var(--gold-soft),transparent),radial-gradient(600px_320px_at_0%_100%,var(--violet-soft),transparent)]" />
      <Trophy className="pointer-events-none absolute -right-8 -top-8 size-64 text-gold opacity-[0.07]" strokeWidth={0.8} />
      <div className="relative max-w-2xl">
        <span className="eyebrow inline-flex items-center gap-2.5 rounded-full bg-gold-soft px-3 py-1.5 !text-gold">
          <span className="live-dot gold scale-75" />
          Próxima cerimônia
        </span>
        <h2 className="display mt-6 text-[40px] sm:text-[68px]">
          {event.name} <span className="font-serif text-[1.08em] font-normal italic text-gold">{event.year}</span>
        </h2>
        {event.date && (
          <p className="mt-4 text-[17px] text-fg-2">
            {fmtDay(event.date, { weekday: true })} · Peacock Theater, Los Angeles
            {days !== null && days >= 0 && <span className="text-fg-3"> · faltam {days} dias</span>}
          </p>
        )}
        {event.date && (
          <div className="mt-9">
            <Countdown to={event.date} size="lg" />
          </div>
        )}
        <p className="mt-9 max-w-lg text-sm leading-relaxed text-fg-2">
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
        <div className="zoom-img shine">
          <GameImage src={lead.image} alt={lead.title} className="aspect-[16/8] w-full" eager />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#ffcf5c] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase leading-none tracking-[0.12em] text-black">
            <Crown className="size-3.5" />
            {winner ? `${tr(category.name)} · ${event.year}` : `Indicados a ${tr(category.name)}`}
          </div>
          <h2 className="display mt-4 text-[30px] text-white sm:text-[42px]">{cleanName(lead.title)}</h2>
          {lead.credit && <p className="mt-2 text-sm text-white/65">{lead.credit}</p>}
        </div>
      </button>
      <div className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3">
        {others.map((n) => (
          <button key={n.title} onClick={() => open(n.key)} className="flex items-center gap-3 rounded-xl p-2 text-left transition-colors duration-200 hover:bg-surface-2">
            <GameImage src={n.image} alt={n.title} className="h-10 w-[72px] shrink-0 rounded-lg ring-1 ring-line" />
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
    <section className="card p-5 sm:p-7" style={stagger(2)}>
      <h3 className="display text-[22px]">Mais indicados</h3>
      <p className="mt-2 flex items-center gap-4 text-xs text-fg-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-gold" /> vitórias
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-surface-3 ring-1 ring-line-strong" /> indicações
        </span>
      </p>
      <ol className="mt-6 space-y-4">
        {event.leaders.slice(0, 8).map((l) => (
          <li key={l.key}>
            <button onClick={() => open(l.key)} className="group w-full text-left">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium transition-colors group-hover:text-accent-text">{cleanName(l.title)}</span>
                <span className="num shrink-0 font-mono text-xs text-fg-2">
                  {event.status === 'finished' && <span className="font-semibold text-gold">{l.wins} </span>}
                  {event.status === 'finished' ? '/ ' : ''}
                  {l.nominations}
                </span>
              </div>
              <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="absolute inset-y-0 left-0 rounded-full bg-surface-3 ring-1 ring-inset ring-line" style={{ width: `${(l.nominations / max) * 100}%` }} />
                <div className="absolute inset-y-0 left-0 rounded-full bg-gold" style={{ width: `${(l.wins / max) * 100}%` }} />
              </div>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

function CategoryCard({ category, i }: { category: AwardCategory; i: number }) {
  const open = useOpenGame()
  const winner = category.nominees.find((n) => n.winner)
  const rest = category.nominees.filter((n) => n !== winner)
  const name = tr(category.name)
  return (
    <article className="card flex flex-col overflow-hidden" style={stagger(i)}>
      <div className="px-4 pb-3 pt-4">
        <h4 className="text-[15px] font-semibold leading-tight">{name}</h4>
        {name !== category.name && <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-3">{category.name}</p>}
      </div>
      {winner && (
        <button onClick={() => open(winner.key)} className="group relative mx-2 block overflow-hidden rounded-2xl text-left">
          <div className="zoom-img shine">
            <GameImage src={winner.image} alt={winner.title} className="aspect-[16/7] w-full" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/88 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-2.5 p-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#ffcf5c] text-black">
              <Crown className="size-3.5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold text-white">{cleanName(winner.title)}</div>
              {winner.credit && <div className="truncate text-[11px] text-white/65">{winner.credit}</div>}
            </div>
          </div>
        </button>
      )}
      <ul className="flex-1 p-2">
        {rest.map((n) => (
          <li key={n.title}>
            <button onClick={() => open(n.key)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors duration-200 hover:bg-surface-2">
              {n.winner ? <WinnerStar /> : <span className="size-1 shrink-0 rounded-full bg-fg-3/60" />}
              <span className="min-w-0 flex-1 truncate text-fg-2">{cleanName(n.title)}</span>
            </button>
          </li>
        ))}
      </ul>
    </article>
  )
}
