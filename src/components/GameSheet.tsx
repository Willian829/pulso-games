import { ArrowUpRight, Award, CalendarDays, Crown, Eye, Gift, Tag, TrendingUp, Users, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cleanName, fmtCompact, fmtDay, fmtMoney, fmtNumber, relativeDays } from '../lib/format'
import { useGameIndex, type GameProfile } from '../lib/games'
import { trAward } from '../lib/i18n'
import { storeMeta } from '../lib/stores'
import { DiscountBadge, EndsIn, FavButton, GameImage, Platforms, Sparkline, StoreDot, TwitchIcon, cx } from './ui'

const Ctx = createContext<(key: string) => void>(() => {})

/** Abre o painel de detalhes de um jogo a partir de qualquer lugar. */
export const useOpenGame = () => useContext(Ctx)

export function GameSheetProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams()
  const key = params.get('jogo')
  const open = useCallback(
    (k: string) => {
      setParams(
        (p) => {
          const n = new URLSearchParams(p)
          n.set('jogo', k)
          return n
        },
        { replace: false },
      )
    },
    [setParams],
  )
  const close = useCallback(() => {
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        n.delete('jogo')
        return n
      },
      { replace: true },
    )
  }, [setParams])
  return (
    <Ctx.Provider value={open}>
      {children}
      <AnimatePresence>{key && <Sheet key="sheet" gameKey={key} onClose={close} />}</AnimatePresence>
    </Ctx.Provider>
  )
}

function Sheet({ gameKey, onClose }: { gameKey: string; onClose: () => void }) {
  const { index, loading } = useGameIndex()
  const game = index.get(gameKey)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={game ? cleanName(game.name) : 'Detalhes do jogo'}>
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        className="thin-scroll absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-line-strong bg-bg-elev shadow-2xl sm:inset-y-3 sm:left-auto sm:right-3 sm:max-h-none sm:w-[520px] sm:rounded-3xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
        {game ? <SheetBody game={game} /> : <SheetFallback loading={loading} />}
      </motion.aside>
    </div>
  )
}

function SheetFallback({ loading }: { loading: boolean }) {
  return (
    <div className="p-8">
      {loading ? (
        <div className="space-y-4">
          <div className="skeleton aspect-video" />
          <div className="skeleton h-8 w-2/3" />
          <div className="skeleton h-24" />
        </div>
      ) : (
        <p className="pt-10 text-center text-fg-2">Não encontramos este jogo nos dados atuais.</p>
      )}
    </div>
  )
}

function Stat({ icon, label, value, sub }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-3">
        {icon}
        {label}
      </div>
      <div className="num mt-1.5 font-display text-xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-fg-2">{sub}</div>}
    </div>
  )
}

function Block({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
        <span className="text-fg-3">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  )
}

function SheetBody({ game }: { game: GameProfile }) {
  const steam = game.steam
  const up = game.upcoming
  const brl = game.deals.filter((d) => d.currency === 'BRL')
  const usd = game.deals.filter((d) => d.currency === 'USD')
  const bestBrl = brl[0]
  const awardsByEvent = useMemo(() => {
    const m = new Map<string, { name: string; items: GameProfile['awards'] }>()
    for (const a of game.awards) {
      const id = a.event.id
      const cur = m.get(id) ?? { name: `${a.event.name} ${a.event.year}`, items: [] }
      cur.items.push(a)
      m.set(id, cur)
    }
    return [...m.values()]
  }, [game.awards])

  return (
    <div>
      <div className="relative">
        <GameImage src={steam?.hero ?? game.image} alt={game.name} className="aspect-[16/9] w-full" eager />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-elev via-bg-elev/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight text-fg drop-shadow sm:text-3xl">
              {cleanName(game.name)}
            </h2>
            <FavButton gameKey={game.key} name={game.name} image={game.image} className="mb-1 size-10 shrink-0" />
          </div>
          {(steam?.tags.length || up?.genres.length) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(steam?.tags ?? up?.genres ?? []).slice(0, 4).map((t) => (
                <span key={t} className="rounded-full bg-surface-2/90 px-2.5 py-0.5 text-[11px] font-medium text-fg-2 backdrop-blur">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pb-10 sm:px-6">
        {game.description && <p className="mt-2 text-sm leading-relaxed text-fg-2">{game.description}</p>}

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {steam && (
            <Stat
              icon={<Users className="size-3.5" />}
              label="Jogando agora"
              value={fmtNumber(steam.current)}
              sub={`#${steam.rank} na Steam · pico ${fmtCompact(steam.peak24h)}`}
            />
          )}
          {game.twitch && (
            <Stat
              icon={<Eye className="size-3.5" />}
              label="Na Twitch"
              value={fmtCompact(game.twitch.viewers)}
              sub={`#${game.twitch.rank} · ${fmtNumber(game.twitch.channels)} lives`}
            />
          )}
          {bestBrl && (
            <Stat
              icon={<Tag className="size-3.5" />}
              label="Menor preço"
              value={fmtMoney(bestBrl.price, 'BRL')}
              sub={`${storeMeta(bestBrl.store).name} · −${bestBrl.discount}%`}
            />
          )}
          {up && (
            <Stat
              icon={<CalendarDays className="size-3.5" />}
              label="Lançamento"
              value={up.date ? fmtDay(up.date) : up.dateText}
              sub={up.date ? relativeDays(up.date) : undefined}
            />
          )}
          {game.hype && (
            <Stat
              icon={<TrendingUp className="size-3.5" />}
              label="Índice Pulso"
              value={game.hype.score.toFixed(2)}
              sub={`${game.hype.signals.length} sinais de tendência`}
            />
          )}
          {game.awards.length > 0 && (
            <Stat
              icon={<Award className="size-3.5" />}
              label="Premiações"
              value={`${game.awards.filter((a) => a.winner).length} vitórias`}
              sub={`${game.awards.length} indicações`}
            />
          )}
        </div>

        {steam && steam.history.length > 1 && (
          <Block title="Jogadores simultâneos (Steam, últimos dias)" icon={<Users className="size-4" />}>
            <div className="rounded-2xl border border-line bg-surface p-4">
              <Sparkline points={steam.history} width={440} height={90} className="h-auto w-full" strokeWidth={2} />
            </div>
          </Block>
        )}

        {game.free.length > 0 && (
          <Block title="Grátis" icon={<Gift className="size-4" />}>
            {game.free.map((f) => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl border border-accent/30 bg-accent-soft p-3.5 text-sm"
              >
                <span className="font-semibold text-accent-text">
                  {f.status === 'now' ? 'Grátis agora na Epic' : `Grátis a partir de ${fmtDay(f.startsAt.slice(0, 10))}`}
                </span>
                <span className="text-fg-2">
                  <EndsIn at={f.status === 'now' ? f.endsAt : f.startsAt} prefix={f.status === 'now' ? 'termina em' : 'começa em'} />
                </span>
              </a>
            ))}
          </Block>
        )}

        {game.deals.length > 0 && (
          <Block title="Onde comprar com desconto" icon={<Tag className="size-4" />}>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {[...brl, ...usd].slice(0, 10).map((d) => (
                <a
                  key={d.id}
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2"
                >
                  <StoreDot store={d.store} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{storeMeta(d.store).name}</div>
                    <div className="truncate text-xs text-fg-3">{cleanName(d.title)}</div>
                  </div>
                  <DiscountBadge value={d.discount} />
                  <div className="text-right">
                    <div className="num text-sm font-semibold">{fmtMoney(d.price, d.currency)}</div>
                    <div className="num text-[11px] text-fg-3 line-through">{fmtMoney(d.originalPrice, d.currency)}</div>
                  </div>
                  <ArrowUpRight className="size-4 text-fg-3" />
                </a>
              ))}
            </div>
            {usd.length > 0 && <p className="mt-2 text-[11px] text-fg-3">Lojas internacionais exibem preços em dólar (US$).</p>}
          </Block>
        )}

        {up && (
          <Block title="Lançamento" icon={<CalendarDays className="size-4" />}>
            <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{up.date ? fmtDay(up.date, { weekday: true }) : up.dateText}</span>
                <Platforms list={up.platforms} max={8} />
              </div>
              {(up.developer || up.publisher) && (
                <p className="mt-2 text-fg-2">
                  {up.developer}
                  {up.publisher && up.publisher !== up.developer ? ` · ${up.publisher}` : ''}
                </p>
              )}
              {up.wishlistRank && <p className="mt-1 text-fg-3">#{up.wishlistRank} entre os mais desejados da Steam</p>}
            </div>
          </Block>
        )}

        {game.twitch && game.twitch.topStreams.length > 0 && (
          <Block title="Ao vivo agora" icon={<TwitchIcon className="size-4" />}>
            <div className="grid grid-cols-2 gap-2.5">
              {game.twitch.topStreams.slice(0, 4).map((s) => (
                <a
                  key={s.login}
                  href={`https://twitch.tv/${s.login}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-2xl border border-line bg-surface"
                >
                  <div className="zoom-img relative aspect-video overflow-hidden">
                    <img src={s.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-hot px-1.5 py-0.5 text-[10px] font-bold text-white">
                      AO VIVO
                    </span>
                    <span className="num absolute bottom-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      {fmtCompact(s.viewers)}
                    </span>
                  </div>
                  <div className="truncate px-3 py-2 text-xs font-semibold">{s.user}</div>
                </a>
              ))}
            </div>
          </Block>
        )}

        {awardsByEvent.length > 0 && (
          <Block title="Premiações" icon={<Crown className="size-4" />}>
            <div className="space-y-2.5">
              {awardsByEvent.map((ev) => (
                <div key={ev.name} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-3">{ev.name}</div>
                  <ul className="space-y-1.5 text-sm">
                    {ev.items.map((a) => (
                      <li key={a.category} className="flex items-center gap-2">
                        <span className={cx('grid size-5 place-items-center rounded-full text-[10px]', a.winner ? 'bg-gold text-black' : 'bg-surface-3 text-fg-3')}>
                          {a.winner ? '★' : '•'}
                        </span>
                        <span className={a.winner ? 'font-semibold' : 'text-fg-2'}>{trAward(a.category)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Block>
        )}

        {game.charts.length > 0 && (
          <Block title="Nos rankings" icon={<TrendingUp className="size-4" />}>
            <div className="flex flex-wrap gap-2">
              {game.charts.map((c) => (
                <span key={c.label} className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-fg-2">
                  <span className="num font-semibold text-fg">#{c.rank}</span> {c.label}
                </span>
              ))}
            </div>
          </Block>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          {steam && <ExtLink href={steam.url}>Ver na Steam</ExtLink>}
          {up?.url && !steam && <ExtLink href={up.url}>{up.url.includes('wikipedia') ? 'Wikipedia' : 'Página do jogo'}</ExtLink>}
          {game.twitch && <ExtLink href={`https://www.twitch.tv/directory/category/${encodeURIComponent(game.twitch.name.toLowerCase().replace(/\s+/g, '-'))}`}>Twitch</ExtLink>}
          <ExtLink href={`https://www.youtube.com/results?search_query=${encodeURIComponent(cleanName(game.name) + ' gameplay')}`}>Vídeos no YouTube</ExtLink>
        </div>
      </div>
    </div>
  )
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium text-fg transition hover:border-line-strong"
    >
      {children}
      <ArrowUpRight className="size-3.5 text-fg-3" />
    </a>
  )
}
