import { Bell, Star, Tag } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useOpenGame } from '../components/GameSheet'
import { DiscountBadge, EmptyState, FavButton, GameImage, PageHeader, cx } from '../components/ui'
import { useFavorites } from '../lib/favorites'
import { cleanName, fmtCompact, fmtMoney, relativeDays } from '../lib/format'
import { useGameIndex, type GameProfile } from '../lib/games'
import { useTitle } from '../lib/select'
import { storeMeta } from '../lib/stores'

export default function Favorites() {
  useTitle('Favoritos')
  const favs = useFavorites()
  const { index } = useGameIndex()
  const items = favs.map((f) => ({ fav: f, game: index.get(f.key) }))
  const onSale = items.filter((i) => i.game?.deals.length || i.game?.free.length)

  return (
    <div>
      <PageHeader
        eyebrow="Seus favoritos"
        icon={<Star className="size-3.5" />}
        title="Sua lista de olho"
        description="Marque jogos com a estrela para acompanhar promoções, datas de lançamento e jogadores em um só lugar. A lista fica salva neste navegador."
      />

      {favs.length === 0 ? (
        <EmptyState icon={<Star className="size-5" />} title="Nenhum favorito ainda">
          Toque na estrela de qualquer jogo — nas{' '}
          <Link to="/promocoes" className="text-accent-text underline">
            promoções
          </Link>
          , nos{' '}
          <Link to="/lancamentos" className="text-accent-text underline">
            lançamentos
          </Link>{' '}
          ou no ranking — para acompanhá-lo aqui.
        </EmptyState>
      ) : (
        <>
          {onSale.length > 0 && (
            <div className="mb-8 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
              <Bell className="size-4 text-accent-text" />
              <span>
                <strong className="text-accent-text">{onSale.length}</strong> {onSale.length === 1 ? 'favorito está' : 'favoritos estão'} em promoção
                ou grátis agora.
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(({ fav, game }) => (
              <FavCard key={fav.key} name={fav.name} image={fav.image} gameKey={fav.key} game={game} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function FavCard({ name, image, gameKey, game }: { name: string; image?: string; gameKey: string; game?: GameProfile }) {
  const open = useOpenGame()
  const deal = game?.deals[0]
  const free = game?.free[0]
  return (
    <article className="group card card-hover relative overflow-hidden">
      <button onClick={() => open(gameKey)} className="block w-full text-left">
        <div className="zoom-img relative">
          <GameImage src={game?.image ?? image} alt={name} className="aspect-[460/215] w-full" />
          {deal && <DiscountBadge value={deal.discount} className="absolute bottom-2.5 left-2.5" />}
        </div>
        <div className="p-4">
          <h3 className="truncate font-semibold">{cleanName(game?.name ?? name)}</h3>
          <div className="mt-3 space-y-1.5 text-[13px]">
            {free && <Line tone="accent">{free.status === 'now' ? 'Grátis agora na Epic' : 'Ficará grátis na Epic em breve'}</Line>}
            {deal && (
              <Line tone="accent">
                <Tag className="mr-1 inline size-3.5" />
                {fmtMoney(deal.price, deal.currency)} na {storeMeta(deal.store).name}
                {game!.deals.length > 1 && <span className="text-fg-3"> · +{game!.deals.length - 1} lojas</span>}
              </Line>
            )}
            {game?.upcoming?.date && <Line>Lança {relativeDays(game.upcoming.date)} ({game.upcoming.dateText})</Line>}
            {game?.steam && <Line>{fmtCompact(game.steam.current)} jogando agora · #{game.steam.rank} na Steam</Line>}
            {!game && <Line>Sem novidades nos dados atuais.</Line>}
          </div>
        </div>
      </button>
      <FavButton gameKey={gameKey} name={name} image={image} className="absolute right-2.5 top-2.5" />
    </article>
  )
}

function Line({ children, tone }: { children: ReactNode; tone?: 'accent' }) {
  return <div className={cx(tone === 'accent' ? 'font-medium text-accent-text' : 'text-fg-2')}>{children}</div>
}
