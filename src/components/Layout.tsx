import { CalendarDays, Flame, House, Moon, Search, Star, Sun, Tag, Trophy, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useDataset } from '../lib/data'
import { useFavorites } from '../lib/favorites'
import { timeAgo } from '../lib/format'
import { useTheme } from '../lib/theme'
import { CommandPalette } from './CommandPalette'
import { Accent, EASE, GitHubIcon, Logo, cx } from './ui'

const NAV = [
  { to: '/', label: 'Início', short: 'Início', icon: House, end: true, section: 'home' },
  { to: '/mais-jogados', label: 'Mais jogados', short: 'Top', icon: Users, section: 'mais-jogados' },
  { to: '/lancamentos', label: 'Lançamentos', short: 'Agenda', icon: CalendarDays, section: 'lancamentos' },
  { to: '/promocoes', label: 'Promoções', short: 'Ofertas', icon: Tag, section: 'promocoes' },
  { to: '/em-alta', label: 'Em alta', short: 'Em alta', icon: Flame, section: 'em-alta' },
  { to: '/premiacoes', label: 'Premiações', short: 'Prêmios', icon: Trophy, section: 'premiacoes' },
]

/** Seção atual: define a cor da luz ambiente (ver html[data-section] em styles.css). */
const sectionOf = (pathname: string) =>
  NAV.find((n) => n.to !== '/' && pathname.startsWith(n.to))?.section ?? (pathname.startsWith('/favoritos') ? 'favoritos' : 'home')

const SPRING = { type: 'spring', stiffness: 420, damping: 36 } as const

export const REPO_URL = (import.meta.env.VITE_REPO_URL as string | undefined) || ''

export function Layout({ children }: { children: ReactNode }) {
  const [palette, setPalette] = useState(false)
  const [theme, toggleTheme] = useTheme()
  const favs = useFavorites()
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.section = sectionOf(pathname)
  }, [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/input|textarea|select/i.test((e.target as HTMLElement).tagName))) {
        e.preventDefault()
        setPalette(true)
      }
    }
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const iconBtn = 'relative grid size-10 place-items-center rounded-full text-fg-2 transition-colors duration-200 hover:bg-surface-2 hover:text-fg'

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <div className="aurora" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
      >
        Pular para o conteúdo
      </a>

      <header
        className={cx(
          'sticky top-0 z-50 border-b transition-[background-color,border-color] duration-500',
          scrolled ? 'border-line bg-[var(--glass)] backdrop-blur-2xl backdrop-saturate-150' : 'border-transparent',
        )}
      >
        <div className="mx-auto flex h-[68px] max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-1">
            <Link to="/" className="group flex items-center gap-2.5" aria-label="Pulso — início">
              <span className="transition-transform duration-500 ease-[var(--ease-fluid)] group-hover:rotate-[-6deg] group-hover:scale-105">
                <Logo size={34} />
              </span>
              <span className="text-[19px] font-semibold tracking-[-0.03em]">Pulso</span>
            </Link>
          </div>

          <nav className="hidden items-center rounded-full border border-line bg-surface p-1 lg:flex" aria-label="Principal">
            {NAV.slice(1).map((n) => (
              <NavLink key={n.to} to={n.to} className="group relative whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium xl:px-[18px]">
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-fg" transition={SPRING} />}
                    <span className={cx('relative transition-colors duration-200', isActive ? 'text-bg' : 'text-fg-2 group-hover:text-fg')}>
                      {n.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-1">
            <button
              onClick={() => setPalette(true)}
              className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm text-fg-3 transition-colors duration-200 hover:border-line-strong hover:bg-surface-2 hover:text-fg-2 xl:w-52"
              aria-label="Buscar jogos"
            >
              <Search className="size-4 shrink-0" />
              <span className="hidden flex-1 text-left sm:block">Buscar</span>
              <kbd className="hidden rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-3 ring-1 ring-inset ring-line xl:block">Ctrl K</kbd>
            </button>
            <NavLink to="/favoritos" className={({ isActive }) => cx(iconBtn, isActive && 'bg-surface-2 text-fg')} aria-label="Favoritos">
              <Star className="size-[18px]" />
              {favs.length > 0 && (
                <motion.span
                  key={favs.length}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 16 }}
                  className="num absolute right-0.5 top-0.5 grid min-w-[17px] place-items-center rounded-full bg-accent px-1 font-mono text-[10px] font-semibold leading-[17px] text-accent-ink"
                >
                  {favs.length}
                </motion.span>
              )}
            </NavLink>
            <button onClick={toggleTheme} className={iconBtn} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
              <motion.span
                key={theme}
                initial={{ rotate: -70, opacity: 0, scale: 0.6 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="grid place-items-center"
              >
                {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
              </motion.span>
            </button>
          </div>
        </div>
      </header>

      <main id="conteudo" className="mx-auto w-full max-w-[1320px] flex-1 px-4 pb-32 sm:px-6 lg:px-8 lg:pb-24">
        {children}
      </main>

      <Footer />

      {/* Dock flutuante (celular e tablet) */}
      <nav className="fixed inset-x-3 z-50 lg:hidden" style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }} aria-label="Navegação">
        <div className="glass mx-auto grid max-w-md grid-cols-6 rounded-[26px] p-1.5 shadow-pop">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="relative flex flex-col items-center gap-1 rounded-[20px] py-2 text-[10px] font-medium">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="dock-pill" className="absolute inset-0 rounded-[20px] bg-surface-3" transition={SPRING} />}
                  <n.icon className={cx('relative size-5 transition-colors duration-200', isActive ? 'text-accent-text' : 'text-fg-3')} strokeWidth={isActive ? 2.3 : 2} />
                  <span className={cx('relative max-w-full truncate px-0.5 transition-colors duration-200', isActive ? 'text-fg' : 'text-fg-3')}>{n.short}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  )
}

function Footer() {
  const { data: meta } = useDataset('meta')
  const ok = meta?.sources.filter((s) => s.ok).length ?? 0
  const active = meta?.sources.filter((s) => !s.skipped).length ?? 0
  return (
    <footer className="relative border-t border-line pb-28 lg:pb-0">
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-12 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-lg font-semibold tracking-[-0.03em]">Pulso</span>
          </div>
          <p className="display mt-5 max-w-sm text-[26px] leading-[1.1]">
            O <Accent>pulso</Accent> do mundo dos games.
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-2">
            O que está sendo jogado, o que vem por aí, onde está mais barato e quem está levando os prêmios.
          </p>
          {meta && (
            <p className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 py-2 text-xs text-fg-2">
              <span className="live-dot accent scale-75" />
              Atualizado {timeAgo(meta.generatedAt)} · {ok}/{active} fontes ok
            </p>
          )}
          {REPO_URL && (
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="mt-4 flex w-fit items-center gap-2 text-sm text-fg-2 transition-colors hover:text-fg">
              <GitHubIcon /> Código-fonte
            </a>
          )}
        </div>
        <div>
          <h3 className="eyebrow">Fontes de dados</h3>
          <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {meta?.sources.map((s) => (
              <li key={s.id} className="flex items-center gap-2.5 text-fg-2">
                <span className={cx('size-1.5 shrink-0 rounded-full', s.skipped ? 'bg-fg-3/50' : s.ok && !s.stale ? 'bg-up' : s.stale ? 'bg-gold' : 'bg-down')} />
                <span className="truncate">{s.name}</span>
                <span className="ml-auto shrink-0 font-mono text-[11px] text-fg-3">
                  {s.skipped ? 'não configurada' : s.ok ? `${s.count}` : s.stale ? 'cache' : 'falhou'}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-fg-3">
            Dados públicos de Steam, Epic Games, Xbox, PlayStation Store, CheapShark, Wikipedia e, quando configurados, Twitch, IGDB e YouTube.
            Pulso não é afiliado a nenhuma dessas empresas; marcas e imagens pertencem aos respectivos donos.
          </p>
        </div>
      </div>
    </footer>
  )
}
