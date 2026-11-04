import { CalendarDays, Flame, Gamepad2, Search, Tag, Trophy, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cleanName, fmtCompact, fmtMoney } from '../lib/format'
import { searchGames, useGameIndex, type GameProfile } from '../lib/games'
import { useOpenGame } from './GameSheet'
import { GameImage, cx } from './ui'

const PAGES = [
  { to: '/mais-jogados', label: 'Mais jogados', icon: Users },
  { to: '/lancamentos', label: 'Lançamentos', icon: CalendarDays },
  { to: '/promocoes', label: 'Promoções', icon: Tag },
  { to: '/em-alta', label: 'Em alta', icon: Flame },
  { to: '/premiacoes', label: 'Premiações', icon: Trophy },
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

  const results = useMemo(() => searchGames(index, q, 12), [index, q])
  const items = q ? results.map((g) => ({ type: 'game' as const, g })) : PAGES.map((p) => ({ type: 'page' as const, p }))

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
      setTimeout(() => input.current?.focus(), 30)
    }
  }, [open])
  useEffect(() => setActive(0), [q])

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
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Buscar">
          <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-line-strong bg-bg-elev shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search className="size-5 text-fg-3" />
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
                className="h-14 flex-1 bg-transparent text-base text-fg placeholder:text-fg-3 outline-none"
              />
              <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[11px] text-fg-3 sm:block">Esc</kbd>
            </div>
            <div className="thin-scroll max-h-[55vh] overflow-y-auto p-2">
              {!q && <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-fg-3">Ir para</div>}
              {q && !results.length && (
                <div className="px-4 py-10 text-center text-sm text-fg-2">
                  <Gamepad2 className="mx-auto mb-2 size-6 text-fg-3" />
                  Nenhum jogo encontrado para “{q}”.
                </div>
              )}
              {items.map((it, i) => (
                <button
                  key={it.type === 'game' ? it.g.key : it.p.to}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={cx('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition', active === i && 'bg-surface-2')}
                >
                  {it.type === 'game' ? (
                    <>
                      <GameImage src={it.g.image} alt={it.g.name} className="h-10 w-[72px] shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{cleanName(it.g.name)}</div>
                        <div className="truncate text-xs text-fg-3">{hint(it.g)}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="grid size-9 place-items-center rounded-xl bg-surface-2 text-fg-2">
                        <it.p.icon className="size-4" />
                      </span>
                      <span className="text-sm font-medium">{it.p.label}</span>
                    </>
                  )}
                  {active === i && <span className="text-xs text-fg-3">↵</span>}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
