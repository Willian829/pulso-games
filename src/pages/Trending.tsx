import { Eye, Flame, Info, KeyRound, Radio, Users } from 'lucide-react'
import { SignalChips, SimpleList } from '../components/cards'
import { useOpenGame } from '../components/GameSheet'
import { ErrorBox, GameImage, PageHeader, Skeleton, TwitchIcon, YouTubeIcon, cx } from '../components/ui'
import { useDataset } from '../lib/data'
import { cleanName, fmtCompact, fmtNumber, timeAgo } from '../lib/format'
import { useTitle } from '../lib/select'
import type { HypeEntry, TwitchGame, YouTubeVideo } from '../types'

export default function Trending() {
  useTitle('Em alta')
  const { data, loading, error } = useDataset('trending')
  if (error && !data) return <ErrorBox error={error} />
  const max = data?.hype[0]?.score ?? 1

  return (
    <div>
      <PageHeader
        eyebrow="Tendências"
        icon={<Flame className="size-3.5 text-hot" />}
        title={
          <>
            Em alta entre <span className="text-gradient">jogadores e streamers</span>
          </>
        }
        description="O Índice Pulso cruza jogadores ao vivo, vendas nas lojas e audiência nas plataformas de streaming para mostrar o que está realmente dominando a conversa agora."
      />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold">Índice Pulso</h2>
              <p className="mt-1 text-sm text-fg-2">{data ? `Atualizado ${timeAgo(data.updatedAt)}` : 'Carregando…'}</p>
            </div>
            <details className="group relative w-full text-sm sm:w-auto">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-fg-2 hover:text-fg">
                <Info className="size-3.5" /> Como calculamos
              </summary>
              <div className="relative z-20 mt-2 w-full rounded-2xl sm:absolute sm:right-0 sm:w-80 border border-line-strong bg-bg-elev p-4 text-[13px] leading-relaxed text-fg-2 shadow-2xl">
                Cada jogo ganha pontos pela posição em cada ranking: audiência na Twitch (peso 1,25), jogadores simultâneos na Steam (1,0),
                mais vendidos da PS Store (0,85), mais vendidos da Steam (0,8) e populares da Xbox Store (0,75). Quem aparece em vários
                rankings ao mesmo tempo sobe.
              </div>
            </details>
          </div>
          <div className="space-y-1">
            {loading && !data
              ? Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-16" />)
              : data?.hype.slice(0, 25).map((h, i) => <HypeRow key={h.key} entry={h} rank={i + 1} max={max} />)}
          </div>
        </section>

        <aside className="space-y-6">
          {data && data.psTopSellers.length > 0 && (
            <div className="card p-4">
              <h2 className="mb-3 px-2 font-display text-lg font-bold">Mais vendidos · PS5</h2>
              <SimpleList items={data.psTopSellers.slice(0, 10)} />
            </div>
          )}
          {data && data.xboxPopular?.length > 0 && (
            <div className="card p-4">
              <h2 className="mb-3 px-2 font-display text-lg font-bold">Populares · Xbox</h2>
              <SimpleList items={data.xboxPopular.slice(0, 10)} />
            </div>
          )}
          {data && data.steamTopSellers.length > 0 && (
            <div className="card p-4">
              <h2 className="mb-3 px-2 font-display text-lg font-bold">Mais vendidos · Steam</h2>
              <SimpleList items={data.steamTopSellers.slice(0, 10)} />
            </div>
          )}
        </aside>
      </div>

      <section className="mt-14">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#9146ff] text-white">
            <TwitchIcon className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-2xl font-bold">Mais assistidos na Twitch</h2>
            <p className="text-sm text-fg-2">Audiência somada das ~1.500 maiores lives do momento.</p>
          </div>
        </div>
        {data && data.twitch.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {data.twitch.slice(0, 18).map((g) => (
              <TwitchCard key={g.id} game={g} />
            ))}
          </div>
        ) : (
          data && <SetupCard service="twitch" />
        )}
        {data && data.twitch.length > 0 && <TopStreams games={data.twitch} />}
      </section>

      <section className="mt-14">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#ff0033] text-white">
            <YouTubeIcon className="size-5" />
          </span>
          <div>
            <h2 className="font-display text-2xl font-bold">Em alta no YouTube Games</h2>
            <p className="text-sm text-fg-2">Vídeos de jogos mais populares agora no Brasil e nos EUA.</p>
          </div>
        </div>
        {data && data.youtube.length > 0 ? <VideoGrid videos={data.youtube} /> : data && <SetupCard service="youtube" />}
      </section>
    </div>
  )
}

function HypeRow({ entry, rank, max }: { entry: HypeEntry; rank: number; max: number }) {
  const open = useOpenGame()
  return (
    <button onClick={() => open(entry.key)} className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-surface-2 sm:gap-4 sm:px-3">
      <span className={cx('num w-8 shrink-0 text-center font-display text-xl font-bold', rank <= 3 ? 'text-hot' : 'text-fg-3')}>{rank}</span>
      <GameImage src={entry.image} alt={entry.name} className="h-12 w-[104px] shrink-0 rounded-xl sm:h-14 sm:w-[120px]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{cleanName(entry.name)}</div>
        <div className="mt-1.5">
          <SignalChips entry={entry} max={5} />
        </div>
      </div>
      <div className="hidden w-32 shrink-0 sm:block">
        <div className="flex justify-between text-[11px] text-fg-3">
          <span>índice</span>
          <span className="num font-semibold text-fg">{entry.score.toFixed(2)}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-gradient-to-r from-hot to-[var(--gold)]" style={{ width: `${(entry.score / max) * 100}%` }} />
        </div>
      </div>
    </button>
  )
}

function TwitchCard({ game }: { game: TwitchGame }) {
  const open = useOpenGame()
  return (
    <button onClick={() => open(game.key)} className="group card card-hover overflow-hidden text-left">
      <div className="zoom-img relative">
        <GameImage src={game.boxArt} alt={game.name} variant="poster" className="aspect-[3/4] w-full" />
        <span className="num absolute left-2 top-2 rounded-lg bg-black/70 px-2 py-0.5 font-display text-sm font-bold text-white backdrop-blur">#{game.rank}</span>
      </div>
      <div className="p-3">
        <div className="truncate text-[13px] font-semibold">{cleanName(game.name)}</div>
        <div className="mt-1 flex items-center gap-3 text-xs text-fg-2">
          <span className="num inline-flex items-center gap-1">
            <Eye className="size-3.5 text-hot" />
            {fmtCompact(game.viewers)}
          </span>
          <span className="num inline-flex items-center gap-1 text-fg-3">
            <Radio className="size-3.5" />
            {fmtNumber(game.channels)}
          </span>
        </div>
      </div>
    </button>
  )
}

function TopStreams({ games }: { games: TwitchGame[] }) {
  const streams = games
    .flatMap((g) => g.topStreams.map((s) => ({ ...s, game: g.name })))
    .sort((a, b) => b.viewers - a.viewers)
    .slice(0, 8)
  return (
    <div className="mt-8">
      <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
        <span className="live-dot" /> Streamers em destaque agora
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {streams.map((s) => (
          <a key={s.login} href={`https://twitch.tv/${s.login}`} target="_blank" rel="noreferrer" className="group card card-hover overflow-hidden">
            <div className="zoom-img relative aspect-video overflow-hidden bg-surface-2">
              <img src={s.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute left-2 top-2 rounded-md bg-hot px-1.5 py-0.5 text-[10px] font-bold text-white">AO VIVO</span>
              <span className="num absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                <Users className="size-3" /> {fmtCompact(s.viewers)}
              </span>
            </div>
            <div className="p-3">
              <div className="truncate text-sm font-semibold">{s.user}</div>
              <div className="truncate text-xs text-fg-3">
                {cleanName(s.game)} · {s.title}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

function VideoGrid({ videos }: { videos: YouTubeVideo[] }) {
  const seen = new Set<string>()
  const list = videos.filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true))).slice(0, 12)
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {list.map((v) => (
        <a key={v.id} href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" className="group card card-hover overflow-hidden">
          <div className="zoom-img relative aspect-video overflow-hidden bg-surface-2">
            <img src={v.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{v.region}</span>
          </div>
          <div className="p-3">
            <div className="line-clamp-2 text-sm font-semibold leading-snug">{v.title}</div>
            <div className="mt-1 truncate text-xs text-fg-3">
              {v.channel} · {fmtCompact(v.views)} visualizações
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

function SetupCard({ service }: { service: 'twitch' | 'youtube' }) {
  const isTwitch = service === 'twitch'
  return (
    <div className="card relative overflow-hidden p-6 sm:p-8">
      <div
        className="absolute inset-0 opacity-60"
        style={{ background: `radial-gradient(600px 220px at 0% 0%, ${isTwitch ? 'rgb(145 70 255 / .16)' : 'rgb(255 0 51 / .12)'}, transparent)` }}
      />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-fg-2">
          <KeyRound className="size-5" />
        </span>
        <div className="flex-1">
          <h3 className="font-display text-lg font-bold">
            {isTwitch ? 'Conecte a Twitch para ver a audiência ao vivo' : 'Conecte o YouTube para ver os vídeos em alta'}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-fg-2">
            {isTwitch ? (
              <>
                Crie um app gratuito em <span className="font-mono text-fg">dev.twitch.tv/console/apps</span> e adicione os segredos{' '}
                <span className="font-mono text-fg">TWITCH_CLIENT_ID</span> e <span className="font-mono text-fg">TWITCH_CLIENT_SECRET</span> no
                repositório do GitHub. As mesmas credenciais ativam o IGDB (jogos mais aguardados).
              </>
            ) : (
              <>
                Gere uma chave da YouTube Data API v3 no Google Cloud e adicione o segredo{' '}
                <span className="font-mono text-fg">YOUTUBE_API_KEY</span> no repositório do GitHub.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
