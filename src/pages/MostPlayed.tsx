import { Info, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MostPlayedRow, RankDelta, SimpleList } from '../components/cards'
import { useOpenGame } from '../components/GameSheet'
import {
  Accent,
  AnimatedNumber,
  Chip,
  ChipRow,
  ErrorBox,
  FavButton,
  GameImage,
  PageHeader,
  Reveal,
  SearchInput,
  Skeleton,
  Sparkline,
  cx,
  stagger,
} from '../components/ui'
import { useDatasets } from '../lib/data'
import { cleanName, fmtCompact, fmtNumber, timeAgo } from '../lib/format'
import { normalize } from '../lib/games'
import { useTitle } from '../lib/select'
import type { MostPlayedEntry } from '../types'

export default function MostPlayed() {
  useTitle('Mais jogados')
  const { data, loading, error } = useDatasets('most-played', 'trending')
  const mp = data['most-played']
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [freeOnly, setFreeOnly] = useState(false)

  const tags = useMemo(() => {
    const c = new Map<string, number>()
    for (const e of mp?.steam ?? []) for (const t of e.tags) c.set(t, (c.get(t) ?? 0) + 1)
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  }, [mp])

  const list = useMemo(() => {
    const nq = normalize(q)
    return (mp?.steam ?? []).filter((e) => (!nq || normalize(e.name).includes(nq)) && (!tag || e.tags.includes(tag)) && (!freeOnly || e.isFree))
  }, [mp, q, tag, freeOnly])

  if (error && !mp) return <ErrorBox error={error} />
  const filtering = !!q || !!tag || freeOnly

  return (
    <div>
      <PageHeader
        eyebrow="Steam · ao vivo"
        icon={<span className="live-dot scale-75" />}
        title={
          <>
            Os mais jogados <Accent>agora</Accent>
          </>
        }
        description="Ranking por jogadores simultâneos nos 100 títulos mais populares da Steam, com dados oficiais da Valve."
        aside={
          mp && (
            <div className="lg:text-right">
              <AnimatedNumber value={mp.totalPlayers} className="display block text-[44px] sm:text-[56px]" />
              <p className="mt-1.5 flex items-center gap-2 text-sm text-fg-2 lg:justify-end">
                <Users className="size-3.5" /> jogando agora · atualizado {timeAgo(mp.updatedAt)}
              </p>
            </div>
          )
        }
      />

      {mp && !filtering && <Podium top={mp.steam.slice(0, 3)} />}

      <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput value={q} onChange={setQ} placeholder="Filtrar o top 100…" className="sm:w-72 sm:shrink-0" />
            <ChipRow className="-mx-4 px-4 sm:mx-0 sm:px-0">
              <Chip active={freeOnly} onClick={() => setFreeOnly((v) => !v)}>
                Gratuitos
              </Chip>
              {tags.map(([t, n]) => (
                <Chip key={t} group="tag" active={tag === t} onClick={() => setTag(tag === t ? null : t)} count={n}>
                  {t}
                </Chip>
              ))}
            </ChipRow>
          </div>

          <div className="card overflow-hidden">
            <div className="eyebrow hidden grid-cols-[56px_minmax(0,1fr)_130px_110px_110px_90px] items-center gap-4 border-b border-line px-5 py-3.5 md:grid">
              <span>#</span>
              <span>Jogo</span>
              <span>7 dias</span>
              <span className="text-right">Jogando agora</span>
              <span className="text-right">Pico 24h</span>
              <span className="text-right">Avaliação</span>
            </div>
            {loading && !mp ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 10 }, (_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : list.length ? (
              <>
                <div className="stagger hidden md:block">
                  {list.map((e, i) => (
                    <TableRow key={e.appid} e={e} i={i} />
                  ))}
                </div>
                <div className="p-2 md:hidden">
                  {list.map((e) => (
                    <MostPlayedRow key={e.appid} e={e} dense />
                  ))}
                </div>
              </>
            ) : (
              <p className="px-6 py-16 text-center text-sm text-fg-2">Nenhum jogo do top 100 corresponde aos filtros.</p>
            )}
          </div>

          <p className="mt-5 flex gap-2.5 text-xs leading-relaxed text-fg-3">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Jogos fora da Steam — como Fortnite, Minecraft, Roblox e League of Legends — não publicam números em tempo real; acompanhe a
            popularidade deles na aba Em alta.
          </p>
        </div>

        <aside className="space-y-6">
          {mp && mp.topSellers.length > 0 && (
            <Reveal className="card p-4">
              <h2 className="display mb-3 px-2 pt-1 text-lg">Mais vendidos · Steam</h2>
              <SimpleList items={mp.topSellers.slice(0, 12)} label="Mais vendidos na Steam" />
            </Reveal>
          )}
          {data.trending && data.trending.psTopSellers.length > 0 && (
            <Reveal className="card p-4">
              <h2 className="display mb-3 px-2 pt-1 text-lg">Mais vendidos · PS5</h2>
              <SimpleList items={data.trending.psTopSellers.slice(0, 12)} label="Mais vendidos na PlayStation Store" />
            </Reveal>
          )}
        </aside>
      </div>
    </div>
  )
}

function Podium({ top }: { top: MostPlayedEntry[] }) {
  const open = useOpenGame()
  return (
    <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-3">
      {top.map((e, i) => (
        <div key={e.appid} className="group card card-hover overflow-hidden" style={stagger(i + 2)}>
          <button onClick={() => open(e.key)} className="block w-full text-left" aria-label={`Detalhes de ${cleanName(e.name)}`}>
            <div className="zoom-img shine">
              <GameImage src={e.capsule ?? e.image} alt={e.name} className="aspect-[616/353] w-full" eager />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/5" />
              <span
                className={cx(
                  'num absolute left-4 top-3 font-display text-[64px] font-semibold leading-none tracking-[-0.06em] drop-shadow-lg',
                  i === 0 ? 'text-accent' : 'text-white/90',
                )}
              >
                {e.rank}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <h3 className="display truncate text-xl text-white sm:text-[22px]">{cleanName(e.name)}</h3>
                <div className="mt-2.5 flex items-end justify-between gap-3">
                  <div>
                    <div className="num font-display text-[26px] font-semibold leading-none text-white">{fmtNumber(e.current)}</div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-white/65">
                      <Users className="size-3" /> jogando · pico {fmtCompact(e.peak24h)}
                    </div>
                  </div>
                  <Sparkline points={e.history} width={110} height={38} strokeWidth={2} />
                </div>
              </div>
            </div>
          </button>
          <FavButton gameKey={e.key} name={e.name} image={e.image} className="absolute right-3 top-3" />
        </div>
      ))}
    </div>
  )
}

function TableRow({ e, i }: { e: MostPlayedEntry; i: number }) {
  const open = useOpenGame()
  const ratio = e.peak24h ? e.current / e.peak24h : 0
  return (
    <button
      onClick={() => open(e.key)}
      style={stagger(i)}
      className="grid w-full grid-cols-[56px_minmax(0,1fr)_130px_110px_110px_90px] items-center gap-4 border-b border-line px-5 py-2.5 text-left transition-colors duration-200 last:border-0 hover:bg-surface-2"
    >
      <div className="flex items-center gap-2">
        <span className={cx('num w-7 font-display text-lg font-semibold', e.rank <= 3 ? 'text-accent-text' : 'text-fg')}>{e.rank}</span>
        <RankDelta rank={e.rank} prev={e.prevRank} />
      </div>
      <div className="flex min-w-0 items-center gap-3.5">
        <GameImage src={e.image} alt={e.name} className="h-12 w-[104px] shrink-0 rounded-lg ring-1 ring-line" />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold">{cleanName(e.name)}</div>
          <div className="truncate text-xs text-fg-3">
            {e.isFree ? 'Gratuito · ' : e.price ? `${e.price} · ` : ''}
            {e.tags.slice(0, 3).join(' · ')}
          </div>
        </div>
      </div>
      <Sparkline points={e.history} width={120} height={32} />
      <div className="text-right">
        <div className="num text-[15px] font-semibold">{fmtNumber(e.current)}</div>
        <div className="ml-auto mt-1.5 h-[3px] w-16 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-accent-text" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
        </div>
      </div>
      <div className="num text-right text-sm text-fg-2">{fmtNumber(e.peak24h)}</div>
      <div className="text-right">
        {e.reviewPct ? (
          <span
            className={cx(
              'num inline-flex rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium',
              e.reviewPct >= 80 ? 'bg-up/12 text-up' : e.reviewPct >= 60 ? 'bg-gold-soft text-gold' : 'bg-down/12 text-down',
            )}
            title={e.reviewLabel}
          >
            {e.reviewPct}%
          </span>
        ) : (
          <span className="text-xs text-fg-3">—</span>
        )}
      </div>
    </button>
  )
}
