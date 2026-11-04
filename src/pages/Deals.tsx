import { Gift, Info, Tag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DealCard, FreeGameCard } from '../components/cards'
import { Chip, EmptyState, ErrorBox, GridSkeleton, PageHeader, SearchInput, Select, StoreDot } from '../components/ui'
import { useDataset } from '../lib/data'
import { fmtNumber, timeAgo } from '../lib/format'
import { normalize } from '../lib/games'
import { featuredDeals, useTitle } from '../lib/select'
import type { Deal, StoreId } from '../types'

type Sort = 'relevance' | 'discount' | 'price' | 'rating' | 'ending'
const PAGE = 40

export default function Deals() {
  useTitle('Promoções')
  const { data, loading, error } = useDataset('deals')
  const [store, setStore] = useState<StoreId | 'all'>('all')
  const [sort, setSort] = useState<Sort>('relevance')
  const [minDiscount, setMinDiscount] = useState(0)
  const [brlOnly, setBrlOnly] = useState(false)
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const list = useMemo(() => {
    if (!data) return []
    const nq = normalize(q)
    let l = data.deals.filter(
      (d) =>
        (store === 'all' || d.store === store) &&
        d.discount >= minDiscount &&
        (!brlOnly || d.currency === 'BRL') &&
        (!nq || normalize(d.title).includes(nq)),
    )
    const cmp: Record<Sort, (a: Deal, b: Deal) => number> = {
      relevance: (a, b) => (a.popularity ?? 999) - (b.popularity ?? 999),
      discount: (a, b) => b.discount - a.discount || (a.popularity ?? 999) - (b.popularity ?? 999),
      price: (a, b) => (a.currency === b.currency ? a.price - b.price : a.currency === 'BRL' ? -1 : 1),
      rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
      ending: (a, b) => (a.endsAt ? new Date(a.endsAt).getTime() : Infinity) - (b.endsAt ? new Date(b.endsAt).getTime() : Infinity),
    }
    if (sort === 'relevance' && store === 'all' && !nq) {
      // rodízio entre lojas para a vitrine ficar variada
      const mixed = featuredDeals(l, l.length, 0)
      const seen = new Set(mixed.map((d) => d.id))
      l = [...mixed, ...l.filter((d) => !seen.has(d.id))]
    } else l = [...l].sort(cmp[sort])
    return l
  }, [data, store, sort, minDiscount, brlOnly, q])

  const freeNow = data?.free.filter((f) => f.status === 'now') ?? []
  const freeSoon = data?.free.filter((f) => f.status === 'upcoming') ?? []

  if (error && !data) return <ErrorBox error={error} />

  return (
    <div>
      <PageHeader
        eyebrow="Promoções"
        icon={<Tag className="size-3.5" />}
        title={
          <>
            Mais jogo, <span className="text-gradient">menos gasto</span>
          </>
        }
        description={
          data
            ? `${fmtNumber(data.deals.length)} ofertas em ${data.stores.length} lojas — Steam, Epic, Xbox, PlayStation, GOG, Humble e mais. Atualizado ${timeAgo(data.updatedAt)}.`
            : 'Carregando as ofertas…'
        }
      />

      {(freeNow.length > 0 || freeSoon.length > 0) && (
        <section className="mb-12">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
            <Gift className="size-5 text-accent-text" /> Grátis na Epic Games Store
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...freeNow, ...freeSoon].map((f, i) => (
              <FreeGameCard key={f.id} game={f} large={i === 0} />
            ))}
          </div>
        </section>
      )}

      <div className="z-30 -mx-4 mb-6 space-y-3 border-b border-line bg-[var(--glass)] px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:sticky md:top-16 lg:-mx-8 lg:px-8">
        <div className="scroller flex gap-2 overflow-x-auto">
          <Chip active={store === 'all'} onClick={() => (setStore('all'), setLimit(PAGE))} count={data?.deals.length}>
            Todas as lojas
          </Chip>
          {data?.stores.map((s) => (
            <Chip key={s.id} active={store === s.id} onClick={() => (setStore(s.id), setLimit(PAGE))} count={s.count}>
              <StoreDot store={s.id} />
              {s.name}
            </Chip>
          ))}
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex gap-2">
          <SearchInput value={q} onChange={(v) => (setQ(v), setLimit(PAGE))} placeholder="Buscar promoção…" className="min-w-0 flex-1 md:w-64 md:flex-none" />
          <Select<Sort>
            label="Ordenar"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'relevance', label: 'Mais populares' },
              { value: 'discount', label: 'Maior desconto' },
              { value: 'price', label: 'Menor preço' },
              { value: 'rating', label: 'Melhor avaliados' },
              { value: 'ending', label: 'Terminando antes' },
            ]}
          />
          </div>
          <div className="scroller flex gap-1.5 overflow-x-auto">
            {[0, 50, 75, 90].map((v) => (
              <Chip key={v} active={minDiscount === v} onClick={() => setMinDiscount(v)}>
                {v ? `${v}%+` : 'Qualquer %'}
              </Chip>
            ))}
            <Chip active={brlOnly} onClick={() => setBrlOnly((v) => !v)}>
              Só em R$
            </Chip>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <GridSkeleton count={12} className="aspect-[3/4]" />
      ) : list.length === 0 ? (
        <EmptyState icon={<Tag className="size-5" />} title="Nenhuma promoção encontrada">
          Ajuste os filtros ou a busca para ver mais ofertas.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {list.slice(0, limit).map((d) => (
              <DealCard key={d.id} deal={d} compact />
            ))}
          </div>
          {limit < list.length && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setLimit((l) => l + PAGE * 2)}
                className="rounded-full border border-line-strong px-6 py-3 text-sm font-semibold transition hover:bg-surface-2"
              >
                Carregar mais ({fmtNumber(list.length - limit)} restantes)
              </button>
            </div>
          )}
        </>
      )}

      <p className="mt-8 flex gap-2 text-xs leading-relaxed text-fg-3">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Steam, Xbox, PlayStation e Epic (grátis) usam preços da loja brasileira. GOG, Humble, Fanatical, Green Man Gaming e outras lojas
        internacionais vêm do agregador CheapShark, em dólar. Confira sempre o valor final na loja.
      </p>
    </div>
  )
}
