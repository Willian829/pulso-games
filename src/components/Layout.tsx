import { CalendarDays, Flame, House, Moon, Search, Star, Sun, Tag, Trophy, Users } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useDataset } from '../lib/data'
import { useFavorites } from '../lib/favorites'
import { timeAgo } from '../lib/format'
import { useTheme } from '../lib/theme'
import { CommandPalette } from './CommandPalette'
import { GitHubIcon, Logo, cx } from './ui'

const NAV = [
  { to: '/', label: 'Início', short: 'Início', icon: House, end: true },
  { to: '/mais-jogados', label: 'Mais jogados', short: 'Top', icon: Users },
  { to: '/lancamentos', label: 'Lançamentos', short: 'Agenda', icon: CalendarDays },
  { to: '/promocoes', label: 'Promoções', short: 'Ofertas', icon: Tag },
  { to: '/em-alta', label: 'Em alta', short: 'Em alta', icon: Flame },
  { to: '/premiacoes', label: 'Premiações', short: 'Prêmios', icon: Trophy },
]

export const REPO_URL = (import.meta.env.VITE_REPO_URL as string | undefined) || ''

export function Layout({ children }: { children: ReactNode }) {
  const [palette, setPalette] = useState(false)
  const [theme, toggleTheme] = useTheme()
  const favs = useFavorites()
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !/input|textarea|select/i.test((e.target as HTMLElement).tagName))) {
        e.preventDefault()
        setPalette(true)
      }
    }
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="ambient" />
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink">
        Pular para o conteúdo
      </a>

      <header
        className={cx(
          'sticky top-0 z-50 transition-[background,border-color,backdrop-filter] duration-300',
          scrolled ? 'border-b border-line bg-[var(--glass)] backdrop-blur-xl' : 'border-b border-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Pulso — início">
            <Logo size={34} />
            <span className="font-display text-xl font-bold tracking-tight">Pulso</span>
          </Link>

          <nav className="ml-2 hidden items-center gap-0.5 lg:flex xl:ml-4 xl:gap-1" aria-label="Principal">
            {NAV.slice(1).map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cx(
                    'relative whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition xl:px-3.5',
                    isActive ? 'bg-surface-2 text-fg' : 'text-fg-2 hover:text-fg',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setPalette(true)}
              className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface/70 pl-3 pr-2 text-sm text-fg-3 transition hover:border-line-strong hover:text-fg-2 sm:w-56 lg:w-40 xl:w-56"
              aria-label="Buscar jogos"
            >
              <Search className="size-4" />
              <span className="hidden flex-1 text-left sm:block">Buscar jogos…</span>
              <kbd className="hidden rounded-md border border-line bg-surface-2 px-1.5 text-[11px] text-fg-3 sm:block lg:hidden xl:block">Ctrl K</kbd>
            </button>
            <NavLink
              to="/favoritos"
              className={({ isActive }) =>
                cx('relative grid size-10 place-items-center rounded-full transition', isActive ? 'bg-surface-2 text-fg' : 'text-fg-2 hover:bg-surface-2 hover:text-fg')
              }
              aria-label="Favoritos"
            >
              <Star className="size-[18px]" />
              {favs.length > 0 && (
                <span className="num absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-accent-ink">
                  {favs.length}
                </span>
              )}
            </NavLink>
            <button
              onClick={toggleTheme}
              className="grid size-10 place-items-center rounded-full text-fg-2 transition hover:bg-surface-2 hover:text-fg"
              aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            >
              {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
            </button>
          </div>
        </div>
      </header>

      <main id="conteudo" className="mx-auto w-full max-w-[1320px] flex-1 px-4 pb-28 sm:px-6 lg:px-8 lg:pb-16">
        {children}
      </main>

      <Footer />

      {/* Barra inferior (celular) */}
      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-line bg-[var(--glass)] backdrop-blur-xl lg:hidden"
        aria-label="Navegação"
      >
        <div className="mx-auto grid max-w-lg grid-cols-6">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cx('flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition', isActive ? 'text-accent-text' : 'text-fg-3')
              }
            >
              <n.icon className="size-5" />
              <span className="max-w-full truncate px-0.5">{n.short}</span>
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
    <footer className="border-t border-line pb-24 lg:pb-0">
      <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_2fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-display text-lg font-bold">Pulso</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-2">
            O pulso do mundo dos games: o que está sendo jogado, o que vem por aí, onde está mais barato e quem está levando os prêmios.
          </p>
          {meta && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-fg-2">
              <span className="live-dot accent scale-75" />
              Dados atualizados {timeAgo(meta.generatedAt)} · {ok}/{active} fontes ok
            </p>
          )}
          {REPO_URL && (
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-2 text-sm text-fg-2 hover:text-fg">
              <GitHubIcon /> Código-fonte
            </a>
          )}
        </div>
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-3">Fontes de dados</h3>
          <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {meta?.sources.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-fg-2">
                <span
                  className={cx(
                    'size-1.5 shrink-0 rounded-full',
                    s.skipped ? 'bg-fg-3/50' : s.ok && !s.stale ? 'bg-up' : s.stale ? 'bg-gold' : 'bg-down',
                  )}
                />
                <span className="truncate">{s.name}</span>
                <span className="ml-auto shrink-0 text-xs text-fg-3">
                  {s.skipped ? 'não configurada' : s.ok ? `${s.count}` : s.stale ? 'cache' : 'falhou'}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-fg-3">
            Dados públicos de Steam, Epic Games, Xbox, PlayStation Store, CheapShark, Wikipedia e, quando configurados, Twitch, IGDB e
            YouTube. Pulso não é afiliado a nenhuma dessas empresas; marcas e imagens pertencem aos respectivos donos.
          </p>
        </div>
      </div>
    </footer>
  )
}
