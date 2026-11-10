import { ArrowUpRight, Award, CalendarDays, Crown, Eye, Gift, Tag, TrendingUp, Users, X } from 'lucide-react'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cleanName, fmtCompact, fmtDay, fmtMoney, fmtNumber, relativeDays } from '../lib/format'
import { useGameIndex, type GameProfile } from '../lib/games'
import { trAward } from '../lib/i18n'
import { storeFromUrl, storeMeta, twitchCategorySlug } from '../lib/stores'
import type { StoreId } from '../types'
import { DiscountBadge, EASE, EndsIn, FavButton, GameImage, Platforms, Sparkline, StoreDot, TwitchIcon, cx, hiRes } from './ui'

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

function useIsDesktop() {
  const [is, setIs] = useState(() => window.matchMedia('(min-width: 640px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const on = () => setIs(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return is
}

function Sheet({ gameKey, onClose }: { gameKey: string; onClose: () => void }) {
  const { index, loading } = useGameIndex()
  const game = index.get(gameKey)
  const desktop = useIsDesktop()
  const drag = useDragControls()

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
        className="absolute inset-0 bg-black/65 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        onClick={onClose}
      />
      <motion.aside
        className="absolute inset-x-0 bottom-0 flex max-h-[93dvh] flex-col overflow-hidden rounded-t-[30px] border border-line-strong bg-bg-elev shadow-pop sm:inset-y-3 sm:left-auto sm:right-3 sm:max-h-none sm:w-[540px] sm:rounded-[30px]"
        initial={desktop ? { x: 80, opacity: 0 } : { y: '100%' }}
        animate={desktop ? { x: 0, opacity: 1 } : { y: 0 }}
        exit={desktop ? { x: 60, opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } } : { y: '100%', transition: { duration: 0.25, ease: 'easeIn' } }}
        transition={{ type: 'spring', damping: 34, stiffness: 320, mass: 0.9 }}
        drag={desktop ? false : 'y'}
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 600) onClose()
        }}
      >
        {/* Alça para arrastar e fechar (celular) */}
        <div
          className="absolute inset-x-0 top-0 z-20 flex h-8 cursor-grab touch-none items-start justify-center pt-2.5 active:cursor-grabbing sm:hidden"
          onPointerDown={(e) => drag.start(e)}
        >
          <span className="h-1 w-10 rounded-full bg-white/60 shadow" />
        </div>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 grid size-9 place-items-center rounded-full bg-black/55 text-white ring-1 ring-inset ring-white/15 transition-colors duration-200 hover:bg-black/80"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
        <div className="thin-scroll flex-1 overflow-y-auto overscroll-contain">{game ? <SheetBody game={game} /> : <SheetFallback loading={loading} />}</div>
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
        <p className="pt-12 text-center text-fg-2">Não encontramos este jogo nos dados atuais.</p>
      )}
    </div>
  )
}

function Stat({ icon, label, value, sub }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-inset ring-line">
      <div className="eyebrow flex items-center gap-1.5 !text-[10px]">
        {icon}
        {label}
      </div>
      <div className="num display mt-2.5 text-[22px]">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-fg-2">{sub}</div>}
    </div>
  )
}

function Block({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-9">
      <h3 className="eyebrow mb-3.5 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  )
}

const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } }

function SheetBody({ game }: { game: GameProfile }) {
  const steam = game.steam
  const up = game.upcoming
  const brl = game.deals.filter((d) => d.currency === 'BRL')
  const usd = game.deals.filter((d) => d.currency === 'USD')
  const bestBrl = brl[0]
  const links = useMemo(() => buildLinks(game), [game])
  const art = steam?.hero ?? up?.hero ?? game.hype?.hero ?? hiRes(game.image, 1280)
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
  const tags = steam?.tags.length ? steam.tags : (up?.genres ?? [])

  return (
    <div className="relative">
      {/* Luz ambiente a partir da arte do jogo */}
      {game.image && (
        <img src={game.image} alt="" aria-hidden className="pointer-events-none absolute inset-x-0 top-24 h-80 w-full scale-110 object-cover opacity-35 blur-3xl saturate-150" />
      )}
      <div className="relative">
        <GameImage src={art} fallback={game.image} alt={game.name} className="aspect-[16/9] w-full" eager />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-elev via-bg-elev/25 to-transparent" />
      </div>

      <motion.div
        className="relative -mt-16 px-5 pb-12 sm:px-7"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.12 } } }}
      >
        <motion.div variants={item} className="flex items-end justify-between gap-3">
          <h2 className="display text-[30px] leading-[1.02] text-fg sm:text-[36px]">{cleanName(game.name)}</h2>
          <FavButton gameKey={game.key} name={game.name} image={game.image} className="mb-0.5 size-10 shrink-0" />
        </motion.div>
        {tags.length > 0 && (
          <motion.div variants={item} className="mt-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((t) => (
              <span key={t} className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium leading-none text-fg-2 ring-1 ring-inset ring-line">
                {t}
              </span>
            ))}
          </motion.div>
        )}
        {game.description && (
          <motion.p variants={item} className="mt-4 text-sm leading-relaxed text-fg-2">
            {game.description}
          </motion.p>
        )}
        <motion.div variants={item}>
          <StoreLinks links={links.stores} />
        </motion.div>

        <motion.div variants={item} className="mt-6 grid grid-cols-2 gap-2.5">
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
        </motion.div>

        {steam && steam.history.length > 1 && (
          <motion.div variants={item}>
            <Block title="Jogadores simultâneos · últimos dias" icon={<Users className="size-3.5" />}>
              <div className="h-28 rounded-2xl bg-surface p-3 ring-1 ring-inset ring-line">
                <Sparkline points={steam.history} stretch width={440} height={90} strokeWidth={2} className="h-full w-full" />
              </div>
            </Block>
          </motion.div>
        )}

        {game.free.length > 0 && (
          <motion.div variants={item}>
            <Block title="Grátis" icon={<Gift className="size-3.5" />}>
              {game.free.map((f) => (
                <a
                  key={f.id}
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-2xl bg-accent-soft p-4 text-sm ring-1 ring-inset ring-accent/30 transition-colors hover:ring-accent/60"
                >
                  <span className="font-semibold text-accent-text">
                    {f.status === 'now' ? 'Grátis agora na Epic' : `Grátis a partir de ${fmtDay(f.startsAt.slice(0, 10))}`}
                  </span>
                  <span className="shrink-0 text-fg-2">
                    <EndsIn at={f.status === 'now' ? f.endsAt : f.startsAt} prefix={f.status === 'now' ? 'termina em' : 'começa em'} />
                  </span>
                </a>
              ))}
            </Block>
          </motion.div>
        )}

        {game.deals.length > 0 && (
          <motion.div variants={item}>
            <Block title="Onde comprar com desconto" icon={<Tag className="size-3.5" />}>
              <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-inset ring-line">
                {[...brl, ...usd].slice(0, 10).map((d) => (
                  <a
                    key={d.id}
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-3 border-b border-line px-4 py-3 transition-colors duration-200 last:border-0 hover:bg-surface-2"
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
                    <ArrowUpRight className="size-4 text-fg-3 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
                  </a>
                ))}
              </div>
              {usd.length > 0 && <p className="mt-2.5 text-[11px] text-fg-3">Lojas internacionais exibem preços em dólar (US$).</p>}
            </Block>
          </motion.div>
        )}

        {up && (
          <motion.div variants={item}>
            <Block title="Lançamento" icon={<CalendarDays className="size-3.5" />}>
              <div className="rounded-2xl bg-surface p-4 text-sm ring-1 ring-inset ring-line">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{up.date ? fmtDay(up.date, { weekday: true }) : up.dateText}</span>
                  <Platforms list={up.platforms} max={8} />
                </div>
                {(up.developer || up.publisher) && (
                  <p className="mt-2.5 text-fg-2">
                    {up.developer}
                    {up.publisher && up.publisher !== up.developer ? ` · ${up.publisher}` : ''}
                  </p>
                )}
                {up.wishlistRank && <p className="mt-1 text-fg-3">#{up.wishlistRank} entre os mais desejados da Steam</p>}
              </div>
            </Block>
          </motion.div>
        )}

        {game.twitch && game.twitch.topStreams.length > 0 && (
          <motion.div variants={item}>
            <Block title="Ao vivo agora" icon={<TwitchIcon className="size-3.5" />}>
              <div className="grid grid-cols-2 gap-2.5">
                {game.twitch.topStreams.slice(0, 4).map((s) => (
                  <a key={s.login} href={`https://twitch.tv/${s.login}`} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl bg-surface ring-1 ring-inset ring-line">
                    <div className="zoom-img aspect-video">
                      <img src={s.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
                      <span className="absolute left-2 top-2 rounded-md bg-hot px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">AO VIVO</span>
                      <span className="num absolute bottom-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">{fmtCompact(s.viewers)}</span>
                    </div>
                    <div className="truncate px-3 py-2 text-xs font-semibold">{s.user}</div>
                  </a>
                ))}
              </div>
            </Block>
          </motion.div>
        )}

        {awardsByEvent.length > 0 && (
          <motion.div variants={item}>
            <Block title="Premiações" icon={<Crown className="size-3.5" />}>
              <div className="space-y-2.5">
                {awardsByEvent.map((ev) => (
                  <div key={ev.name} className="rounded-2xl bg-surface p-4 ring-1 ring-inset ring-line">
                    <div className="mb-3 text-[13px] font-semibold">{ev.name}</div>
                    <ul className="space-y-2 text-sm">
                      {ev.items.map((a) => (
                        <li key={a.category} className="flex items-center gap-2.5">
                          <span
                            className={cx(
                              'grid size-5 shrink-0 place-items-center rounded-full text-[10px]',
                              a.winner ? 'bg-[#ffcf5c] text-black' : 'bg-surface-3 text-fg-3',
                            )}
                          >
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
          </motion.div>
        )}

        {game.charts.length > 0 && (
          <motion.div variants={item}>
            <Block title="Nos rankings" icon={<TrendingUp className="size-3.5" />}>
              <div className="flex flex-wrap gap-2">
                {game.charts.map((c) => {
                  const body = (
                    <>
                      <span className="num font-mono font-semibold text-fg">#{c.rank}</span> {c.label}
                    </>
                  )
                  const cls = 'inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs text-fg-2 ring-1 ring-inset ring-line'
                  return c.url ? (
                    <a key={c.label} href={c.url} target="_blank" rel="noreferrer" className={cx(cls, 'transition-colors duration-200 hover:bg-surface-2 hover:text-fg')}>
                      {body}
                      <ArrowUpRight className="size-3 text-fg-3" />
                    </a>
                  ) : (
                    <span key={c.label} className={cls}>
                      {body}
                    </span>
                  )
                })}
              </div>
            </Block>
          </motion.div>
        )}

        <motion.div variants={item} className="mt-9 flex flex-wrap gap-2">
          {links.extra.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">
              {l.label}
              <ArrowUpRight className="size-3.5 text-fg-3" />
            </a>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}

interface LinkItem {
  label: string
  url: string
  store?: StoreId
}

/**
 * Todos os links de loja conhecidos para um jogo, um por loja, do mais útil para o menos útil:
 * grátis → oferta mais barata em cada loja → página da Steam → rankings das lojas → lançamento.
 */
function buildLinks(game: GameProfile) {
  const stores: LinkItem[] = []
  const seen = new Set<string>()
  const add = (l: LinkItem) => {
    const k = l.store ?? l.url
    if (seen.has(k)) return
    seen.add(k)
    stores.push(l)
  }
  for (const f of game.free) add({ label: f.status === 'now' ? 'Resgatar grátis na Epic' : 'Ver na Epic Games', url: f.url, store: 'epic' })
  for (const d of game.deals)
    add({
      label: d.linkType === 'search' ? `Buscar oferta na ${storeMeta(d.store).name}` : `Ver oferta na ${storeMeta(d.store).name}`,
      url: d.url,
      store: d.store,
    })
  if (game.steam) add({ label: 'Ver na Steam', url: game.steam.url, store: 'steam' })
  for (const c of game.charts) {
    const s = c.url ? storeFromUrl(c.url) : null
    if (s && c.url) add({ label: `Ver na ${storeMeta(s).name}`, url: c.url, store: s })
  }
  const up = game.upcoming
  if (up?.steamAppId) add({ label: 'Ver na Steam', url: `https://store.steampowered.com/app/${up.steamAppId}`, store: 'steam' })
  const upStore = up?.url ? storeFromUrl(up.url) : null
  if (up?.url && upStore) add({ label: `Ver na ${storeMeta(upStore).name}`, url: up.url, store: upStore })

  const extra: LinkItem[] = []
  if (up?.url && !upStore) extra.push({ label: up.url.includes('wikipedia') ? 'Wikipedia' : 'IGDB', url: up.url })
  if (game.twitch) extra.push({ label: 'Twitch', url: `https://www.twitch.tv/directory/category/${twitchCategorySlug(game.twitch.name)}` })
  extra.push({
    label: 'Vídeos no YouTube',
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanName(game.name) + ' gameplay')}`,
  })
  return { stores, extra }
}

function StoreLinks({ links }: { links: LinkItem[] }) {
  if (!links.length) return null
  const [first, ...rest] = links
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <a href={first.url} target="_blank" rel="noreferrer" className="btn btn-primary !h-11">
        {first.label}
        <ArrowUpRight className="size-4" />
      </a>
      {rest.slice(0, 5).map((l) => (
        <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="btn btn-ghost !h-11 !px-4">
          {l.store && <StoreDot store={l.store} />}
          {l.store ? storeMeta(l.store).short : l.label}
          <ArrowUpRight className="size-3.5 text-fg-3" />
        </a>
      ))}
    </div>
  )
}
