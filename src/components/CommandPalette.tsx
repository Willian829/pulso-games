import { CalendarDays, CornerDownLeft, Flame, Gamepad2, Search, Star, Tag, Trophy, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cleanName, fmtCompact, fmtMoney } from '../lib/format'
import { searchGames, useGameIndex, type GameProfile } from '../lib/games'
import { useOpenGame } from './GameSheet'
import { EASE, GameImage, cx } from './ui'

const PAGES = [
  { to: '/mais-jogados', label: 'Mais jogados', hint: 'Top 100 da Steam ao vivo', icon: Users },
  { to: '/lancamentos', label: 'Lançamentos', hint: 'Calendário do ano', icon: CalendarDays },
  { to: '/promocoes', label: 'Promoções', hint: 'Ofertas em todas as lojas', icon: Tag },
  { to: '/em-alta', label: 'Em alta', hint: 'Índice Pulso e streamers', icon: Flame },
  { to: '/premiacoes', label: 'Premiações', hint: 'Indicados e vencedores', icon: Trophy },
  { to: '/favoritos', label: 'Favoritos', hint: 'Sua lista', icon: Star },
]

function hint(p: GameProfile) {
  if (p.steam) return `${fmtCompact(p.steam.current)} jogando agora`
  if (p.free.length) return 'Grátis na Epic'
  if (p.deals.length) {
    const d = p.deals[0]
    return `a partir de ${fmtMoney(d.price, d.currency)} · −${d.discount}%`
  }
  if (p.upcoming) return `Lançamento: ${p.upcoming.dateText}`
  if (p.awards.length) return `${p.awards.length} indicações em premiações`
  if (p.twitch) return `${fmtCompact(p.twitch.viewers)} assistindo na Twitch`
  return ''
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const { index } = useGameIndex()
  const openGame = useOpenGame()
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)

  const results = useMemo(() => searchGames(index, q, 12), [index, q])
  const items = q ? results.map((g) => ({ type: 'game' as const, g })) : PAGES.map((p) => ({ type: 'page' as const, p }))

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
      setTimeout(() => input.current?.focus(), 40)
    }
  }, [open])
  useEffect(() => setActive(0), [q])
  // mantém o item ativo visível ao navegar pelo teclado
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = (i: number) => {
    const it = items[i]
    if (!it) return
    onClose()
    if (it.type === 'game') setTimeout(() => openGame(it.g.key), 10)
    else navigate(it.p.to)
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[11vh]" role="dialog" aria-modal="true" aria-label="Buscar">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ duration: 0.4, ease: EASE }}
            className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-line-strong bg-bg-elev shadow-pop"
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search className="size-5 shrink-0 text-fg-3" />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setActive((a) => Math.min(items.length - 1, a + 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setActive((a) => Math.max(0, a - 1))
                  } else if (e.key === 'Enter') choose(active)
                  else if (e.key === 'Escape') onClose()
                }}
                placeholder="Buscar jogos, promoções, lançamentos…"
                className="h-[60px] min-w-0 flex-1 bg-transparent text-[17px] text-fg outline-none placeholder:text-fg-3"
              />
              <kbd className="hidden rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-3 ring-1 ring-inset ring-line sm:block">Esc</kbd>
            </div>
            <div ref={list} className="thin-scroll max-h-[56vh] overflow-y-auto p-2">
              {!q && <div className="eyebrow px-3 pb-1.5 pt-2.5">Ir para</div>}
              {q && !results.length && (
                <div className="px-4 py-12 text-center text-sm text-fg-2">
                  <Gamepad2 className="mx-auto mb-3 size-7 text-fg-3" />
                  Nenhum jogo encontrado para “{q}”.
                </div>
              )}
              {items.map((it, i) => (
                <button
                  key={it.type === 'game' ? it.g.key : it.p.to}
                  data-i={i}
                  onMouseMove={() => active !== i && setActive(i)}
                  onClick={() => choose(i)}
                  className={cx('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors duration-150', active === i && 'bg-surface-2')}
                >
                  {it.type === 'game' ? (
                    <>
                      <GameImage src={it.g.image} alt={it.g.name} className="h-10 w-[72px] shrink-0 rounded-lg ring-1 ring-line" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{cleanName(it.g.name)}</div>
                        <div className="truncate text-xs text-fg-3">{hint(it.g)}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg-2 ring-1 ring-inset ring-line">
                        <it.p.icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{it.p.label}</div>
                        <div className="truncate text-xs text-fg-3">{it.p.hint}</div>
                      </div>
                    </>
                  )}
                  <CornerDownLeft className={cx('size-3.5 shrink-0 text-fg-3 transition-opacity', active === i ? 'opacity-100' : 'opacity-0')} />
                </button>
              ))}
            </div>
            <div className="hidden items-center gap-4 border-t border-line px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-fg-3 sm:flex">
              <span>↑↓ navegar</span>
              <span>↵ abrir</span>
              <span className="ml-auto">{q ? `${results.length} resultados` : 'Digite para buscar jogos'}</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
