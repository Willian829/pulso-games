import { CalendarDays, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { UpcomingCard } from '../components/cards'
import { useOpenGame } from '../components/GameSheet'
import {
  Accent,
  AnimatedNumber,
  Chip,
  ChipRow,
  Countdown,
  EmptyState,
  ErrorBox,
  GameImage,
  GridSkeleton,
  PageHeader,
  Platforms,
  Rail,
  SearchInput,
  cx,
  hiRes,
  stagger,
} from '../components/ui'
import { useDatasets } from '../lib/data'
import { cleanName, fmtDay, monthName, parseDay, relativeDays } from '../lib/format'
import { normalize } from '../lib/games'
import { spotlightReleases, useTitle } from '../lib/select'
import { PLATFORM_FAMILIES, platformFamilies, type PlatformFamily } from '../lib/stores'
import type { UpcomingGame } from '../types'

type YearFilter = 'all' | number | 'tba'

interface Group {
  id: string
  label: string
  sub: string
  order: number
  games: UpcomingGame[]
}

function groupOf(g: UpcomingGame): Omit<Group, 'games'> {
  if (!g.year) return { id: 'tba', label: 'A definir', sub: 'sem data anunciada', order: 999999 }
  const month = g.date ? Number(g.date.slice(5, 7)) : g.month
  if (month) return { id: `${g.year}-${month}`, label: monthName(month), sub: String(g.year), order: g.year * 100 + month }
  if (g.quarter) {
    const q = Number(g.quarter[1])
    return { id: `${g.year}-${g.quarter}`, label: `${q}º trimestre`, sub: String(g.year), order: g.year * 100 + q * 3 + 0.5 }
  }
  return { id: `${g.year}-y`, label: String(g.year), sub: 'sem mês definido', order: g.year * 100 + 13 }
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
    const m = new Map<string, Group>()
    for (const g of filtered) {
      const k = groupOf(g)
      const cur = m.get(k.id) ?? { ...k, games: [] }
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
  const filterKey = `${year}|${platform}|${highlights}`

  return (
    <div>
      <PageHeader
        eyebrow="Calendário de lançamentos"
        icon={<CalendarDays className="size-3.5" />}
        title={
          <>
            O que vem <Accent>por aí</Accent>
          </>
        }
        description="De grandes produções a indies, com datas das listas oficiais e das páginas das lojas."
        aside={
          up && (
            <div className="lg:text-right">
              <AnimatedNumber value={up.games.length} className="display block text-[44px] sm:text-[56px]" />
              <p className="mt-1.5 text-sm text-fg-2">jogos anunciados para {up.years.join(' e ')}</p>
            </div>
          )
        }
      />

      {anticipated.length > 0 && (
        <section className="mb-12">
          <h2 className="eyebrow mb-4 flex items-center gap-2">
            <Sparkles className="size-3.5 text-hot" /> Mais aguardados
          </h2>
          <Rail label="Lançamentos mais aguardados">
            {anticipated.map((g, i) => (
              <AnticipatedCard key={g.id} game={g} big={i === 0} />
            ))}
          </Rail>
        </section>
      )}

      <div className="z-30 -mx-4 mb-8 border-y border-line bg-[var(--glass)] px-4 py-3 backdrop-blur-2xl sm:-mx-6 sm:px-6 md:sticky md:top-[68px] lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <ChipRow className="min-w-0">
            <Chip group="year" active={year === 'all'} onClick={() => setYear('all')}>
              Todos
            </Chip>
            {up?.years.map((y) => (
              <Chip key={y} group="year" active={year === y} onClick={() => setYear(y)}>
                {y}
              </Chip>
            ))}
            <Chip group="year" active={year === 'tba'} onClick={() => setYear('tba')}>
              Sem data
            </Chip>
            <span className="mx-1 h-5 w-px shrink-0 bg-line" />
            {PLATFORM_FAMILIES.map((f) => (
              <Chip key={f.id} group="platform" active={platform === f.id} onClick={() => setPlatform(platform === f.id ? null : f.id)} count={platformCounts.get(f.id)}>
                {f.label}
              </Chip>
            ))}
          </ChipRow>
          <div className="flex items-center gap-3 lg:ml-auto">
            <label className="flex shrink-0 cursor-pointer items-center gap-2.5 text-sm text-fg-2">
              <input type="checkbox" checked={highlights} onChange={(e) => setHighlights(e.target.checked)} className="peer sr-only" />
              <span className="relative h-[22px] w-10 rounded-full bg-surface-3 ring-1 ring-inset ring-line transition-colors duration-300 after:absolute after:left-[3px] after:top-[3px] after:size-4 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-300 after:ease-[var(--ease-fluid)] peer-checked:bg-accent peer-checked:after:translate-x-[18px] peer-focus-visible:ring-2 peer-focus-visible:ring-accent-text" />
              Só destaques
            </label>
            <SearchInput value={q} onChange={setQ} placeholder="Buscar lançamento…" className="min-w-0 flex-1 lg:w-60 lg:flex-none" />
          </div>
        </div>
      </div>

      {loading && !up ? (
        <GridSkeleton count={8} />
      ) : groups.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-6" />} title="Nada encontrado">
          Nenhum lançamento corresponde aos filtros. Tente desligar “Só destaques” ou trocar a plataforma.
        </EmptyState>
      ) : (
        <div key={filterKey} className="space-y-14">
          {groups.slice(0, visibleGroups).map((grp) => (
            <MonthGroup key={grp.id} group={grp} hotKeys={hotKeys} />
          ))}
          {visibleGroups < groups.length && (
            <div className="flex justify-center">
              <button onClick={() => setVisibleGroups((v) => v + 6)} className="btn btn-ghost">
                Mostrar mais meses · {groups.length - visibleGroups} restantes
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
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-line pb-4">
        <h2 className="flex items-baseline gap-3">
          <span className="font-serif text-[40px] italic leading-none tracking-[-0.02em] first-letter:uppercase sm:text-[48px]">{group.label}</span>
          <span className="font-mono text-sm text-fg-3">{group.sub}</span>
        </h2>
        <span className="num pb-1 font-mono text-xs text-fg-3">{group.games.length} jogos</span>
      </div>
      {cards.length > 0 && (
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((g, i) => (
            <div key={g.id} style={stagger(i)}>
              <UpcomingCard game={g} hot={hotKeys.has(g.key)} />
            </div>
          ))}
        </div>
      )}
      {withArt.length > cards.length && (
        <button onClick={() => setShowAll(true)} className="mt-5 text-sm font-semibold text-accent-text underline-offset-4 hover:underline">
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
    <div className="mt-6">
      <div className="eyebrow mb-2.5">Também neste período</div>
      <div className="card divide-y divide-line overflow-hidden">
        {shown.map((g) => (
          <button key={g.id} onClick={() => open(g.key)} className="flex w-full items-center gap-4 px-4 py-2.5 text-left transition-colors duration-200 hover:bg-surface-2">
            <span className="num w-16 shrink-0 font-mono text-[11px] uppercase text-fg-3">{g.date ? fmtDay(g.date, { year: false }) : g.dateText}</span>
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
        <button onClick={() => setExpanded(true)} className="mt-3 text-sm font-semibold text-accent-text underline-offset-4 hover:underline">
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
        'group relative h-[236px] shrink-0 overflow-hidden rounded-[26px] text-left ring-1 ring-line-strong transition-transform duration-500 ease-[var(--ease-fluid)] hover:-translate-y-1 sm:h-[300px]',
        big ? 'w-[86vw] sm:w-[540px]' : 'w-[64vw] sm:w-[286px]',
      )}
    >
      <div className="zoom-img shine absolute inset-0">
        <GameImage src={game.hero ?? hiRes(game.image, big ? 1600 : 800)} fallback={game.image} alt={game.title} className="h-full w-full" eager={big} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/70">
          {d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')} · {relativeDays(game.date!)}
        </div>
        <h3 className={cx('display mt-2 text-white', big ? 'text-[28px] sm:text-[34px]' : 'text-lg sm:text-xl')}>{cleanName(game.title)}</h3>
        {big && (
          <div className="mt-4">
            <Countdown to={game.date!} size="sm" tone="onImage" />
          </div>
        )}
      </div>
    </button>
  )
}
