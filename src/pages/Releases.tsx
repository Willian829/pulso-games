import { CalendarDays, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { UpcomingCard } from '../components/cards'
import { useOpenGame } from '../components/GameSheet'
import { Chip, Countdown, EmptyState, ErrorBox, GameImage, GridSkeleton, PageHeader, Platforms, SearchInput, cx } from '../components/ui'
import { useDatasets } from '../lib/data'
import { cleanName, fmtDay, fmtNumber, monthName, parseDay, relativeDays } from '../lib/format'
import { normalize } from '../lib/games'
import { spotlightReleases, useTitle } from '../lib/select'
import { PLATFORM_FAMILIES, platformFamilies, type PlatformFamily } from '../lib/stores'
import type { UpcomingGame } from '../types'

type YearFilter = 'all' | number | 'tba'

interface Group {
  id: string
  title: string
  subtitle?: string
  games: UpcomingGame[]
}

function groupOf(g: UpcomingGame): { id: string; title: string; order: number } {
  if (!g.year) return { id: 'tba', title: 'Data a definir', order: 999999 }
  const month = g.date ? Number(g.date.slice(5, 7)) : g.month
  if (month) return { id: `${g.year}-${month}`, title: `${monthName(month)} ${g.year}`, order: g.year * 100 + month }
  if (g.quarter) {
    const q = Number(g.quarter[1])
    return { id: `${g.year}-${g.quarter}`, title: `${q}º trimestre de ${g.year}`, order: g.year * 100 + q * 3 + 0.5 }
  }
  return { id: `${g.year}-y`, title: `${g.year} · sem mês definido`, order: g.year * 100 + 13 }
}

export default function Releases() {
  useTitle('Lançamentos')
  const { data, loading, error } = useDatasets('upcoming', 'trending')
  const up = data.upcoming
  const [year, setYear] = useState<YearFilter>('all')
  const [platform, setPlatform] = useState<PlatformFamily | null>(null)
  const [highlights, setHighlights] = useState(true)
  const [q, setQ] = useState('')
  const [visibleGroups, setVisibleGroups] = useState(6)

  const anticipated = useMemo(() => (up ? spotlightReleases(up.games, data.trending?.hype ?? [], 420, 10) : []), [up, data.trending])
  const hotKeys = useMemo(() => new Set(anticipated.map((g) => g.key)), [anticipated])

  const filtered = useMemo(() => {
    const nq = normalize(q)
    return (up?.games ?? []).filter((g) => {
      if (nq && !normalize(g.title).includes(nq) && !normalize(g.developer ?? '').includes(nq)) return false
      if (highlights && !nq && !g.notable) return false
      if (year === 'tba' && g.year) return false
      if (typeof year === 'number' && g.year !== year) return false
      if (platform && !platformFamilies(g.platforms).includes(platform)) return false
      return true
    })
  }, [up, q, highlights, year, platform])

  const groups = useMemo(() => {
    const m = new Map<string, Group & { order: number }>()
    for (const g of filtered) {
      const k = groupOf(g)
      const cur = m.get(k.id) ?? { id: k.id, title: k.title, order: k.order, games: [] }
      cur.games.push(g)
      m.set(k.id, cur)
    }
    return [...m.values()].sort((a, b) => a.order - b.order)
  }, [filtered])

  const platformCounts = useMemo(() => {
    const c = new Map<PlatformFamily, number>()
    for (const g of up?.games ?? []) if (g.notable) for (const f of platformFamilies(g.platforms)) c.set(f, (c.get(f) ?? 0) + 1)
    return c
  }, [up])

  if (error && !up) return <ErrorBox error={error} />

  return (
    <div>
      <PageHeader
        eyebrow="Calendário de lançamentos"
        icon={<CalendarDays className="size-3.5" />}
        title={
          <>
            O que vem <span className="text-gradient">por aí</span>
          </>
        }
        description={
          up
            ? `${fmtNumber(up.games.length)} jogos anunciados para ${up.years.join(' e ')} — de grandes produções a indies, com datas das listas oficiais e das páginas das lojas.`
            : 'Carregando o calendário…'
        }
      />

      {anticipated.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
            <Sparkles className="size-5 text-hot" /> Mais aguardados
          </h2>
          <div className="scroller edge-fade -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            {anticipated.map((g, i) => (
              <AnticipatedCard key={g.id} game={g} big={i === 0} />
            ))}
          </div>
        </section>
      )}

      <div className="z-30 -mx-4 mb-6 border-b border-line bg-[var(--glass)] px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:sticky md:top-16 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="scroller flex gap-2 overflow-x-auto">
            <Chip active={year === 'all'} onClick={() => setYear('all')}>
              Todos
            </Chip>
            {up?.years.map((y) => (
              <Chip key={y} active={year === y} onClick={() => setYear(y)}>
                {y}
              </Chip>
            ))}
            <Chip active={year === 'tba'} onClick={() => setYear('tba')}>
              Sem data
            </Chip>
            <span className="mx-1 w-px shrink-0 bg-line" />
            {PLATFORM_FAMILIES.map((f) => (
              <Chip key={f.id} active={platform === f.id} onClick={() => setPlatform(platform === f.id ? null : f.id)} count={platformCounts.get(f.id)}>
                {f.label}
              </Chip>
            ))}
          </div>
          <div className="flex items-center gap-2 lg:ml-auto">
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-fg-2">
              <input type="checkbox" checked={highlights} onChange={(e) => setHighlights(e.target.checked)} className="peer sr-only" />
              <span className="relative h-5 w-9 rounded-full bg-surface-3 transition peer-checked:bg-accent after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
              Só destaques
            </label>
            <SearchInput value={q} onChange={setQ} placeholder="Buscar lançamento…" className="w-full lg:w-60" />
          </div>
        </div>
      </div>

      {loading && !up ? (
        <GridSkeleton count={8} />
      ) : groups.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-5" />} title="Nada encontrado">
          Nenhum lançamento corresponde aos filtros. Tente desligar “Só destaques” ou trocar a plataforma.
        </EmptyState>
      ) : (
        <div className="space-y-12">
          {groups.slice(0, visibleGroups).map((grp) => (
            <MonthGroup key={grp.id} group={grp} hotKeys={hotKeys} />
          ))}
          {visibleGroups < groups.length && (
            <div className="flex justify-center">
              <button
                onClick={() => setVisibleGroups((v) => v + 6)}
                className="rounded-full border border-line-strong px-6 py-3 text-sm font-semibold transition hover:bg-surface-2"
              >
                Mostrar mais meses ({groups.length - visibleGroups} restantes)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MonthGroup({ group, hotKeys }: { group: Group; hotKeys: Set<string> }) {
  const [showAll, setShowAll] = useState(false)
  const withArt = group.games.filter((g) => g.image)
  const rest = group.games.filter((g) => !g.image)
  const cards = showAll ? withArt : withArt.slice(0, 12)
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-3">
        <h2 className="font-display text-2xl font-bold capitalize tracking-tight">{group.title}</h2>
        <span className="num text-sm text-fg-3">{group.games.length} jogos</span>
      </div>
      {cards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((g) => (
            <UpcomingCard key={g.id} game={g} hot={hotKeys.has(g.key)} />
          ))}
        </div>
      )}
      {withArt.length > cards.length && (
        <button onClick={() => setShowAll(true)} className="mt-4 text-sm font-semibold text-accent-text hover:underline">
          + {withArt.length - cards.length} jogos com capa neste período
        </button>
      )}
      {rest.length > 0 && <CompactList games={rest} />}
    </section>
  )
}

function CompactList({ games }: { games: UpcomingGame[] }) {
  const open = useOpenGame()
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? games : games.slice(0, 8)
  return (
    <div className="mt-5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-3">Também neste período</div>
      <div className="card divide-y divide-line overflow-hidden">
        {shown.map((g) => (
          <button key={g.id} onClick={() => open(g.key)} className="flex w-full items-center gap-4 px-4 py-2.5 text-left transition hover:bg-surface-2">
            <span className="num w-16 shrink-0 text-xs font-semibold text-fg-2">{g.date ? fmtDay(g.date, { year: false }) : g.dateText}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{cleanName(g.title)}</span>
              <span className="block truncate text-xs text-fg-3">{[g.genres.slice(0, 2).join(', '), g.developer].filter(Boolean).join(' · ')}</span>
            </span>
            <span className="hidden sm:block">
              <Platforms list={g.platforms} max={4} />
            </span>
          </button>
        ))}
      </div>
      {games.length > 8 && !expanded && (
        <button onClick={() => setExpanded(true)} className="mt-3 text-sm font-semibold text-accent-text hover:underline">
          Ver mais {games.length - 8}
        </button>
      )}
    </div>
  )
}

function AnticipatedCard({ game, big }: { game: UpcomingGame; big?: boolean }) {
  const open = useOpenGame()
  const d = parseDay(game.date!)
  return (
    <button
      onClick={() => open(game.key)}
      className={cx(
        'group relative h-[230px] shrink-0 overflow-hidden rounded-3xl border border-line-strong text-left sm:h-[292px]',
        big ? 'w-[86vw] sm:w-[520px]' : 'w-[64vw] sm:w-[280px]',
      )}
    >
      <div className="zoom-img absolute inset-0">
        <GameImage src={game.image} alt={game.title} className="h-full w-full" eager={big} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <div className="text-xs font-semibold text-white/75">
          {d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} · {relativeDays(game.date!)}
        </div>
        <h3 className={cx('mt-1 font-display font-bold leading-tight text-white', big ? 'text-3xl' : 'text-lg')}>{cleanName(game.title)}</h3>
        {big && (
          <div className="mt-4 [&_div.rounded-xl]:border-white/10 [&_div.rounded-xl]:bg-black/45 [&_span]:text-white [&_span.uppercase]:text-white/60">
            <Countdown to={game.date!} size="sm" />
          </div>
        )}
      </div>
    </button>
  )
}
