import { Gift, Info, Tag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DealCard, FreeGameCard } from '../components/cards'
import {
  Accent,
  AnimatedNumber,
  Chip,
  ChipRow,
  EmptyState,
  ErrorBox,
  GridSkeleton,
  PageHeader,
  SearchInput,
  Select,
  StoreDot,
  stagger,
} from '../components/ui'
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
      (d) => (store === 'all' || d.store === store) && d.discount >= minDiscount && (!brlOnly || d.currency === 'BRL') && (!nq || normalize(d.title).includes(nq)),
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

  const free = useMemo(() => [...(data?.free ?? [])].sort((a, b) => (a.status === b.status ? 0 : a.status === 'now' ? -1 : 1)), [data])

  if (error && !data) return <ErrorBox error={error} />
  const pickStore = (s: StoreId | 'all') => {
    setStore(s)
    setLimit(PAGE)
  }
  // muda quando os filtros mudam: refaz a entrada em cascata da grade
  const gridKey = `${store}|${sort}|${minDiscount}|${brlOnly}`

  return (
    <div>
      <PageHeader
        eyebrow="Promoções"
        icon={<Tag className="size-3.5" />}
        title={
          <>
            Mais jogo, <Accent>menos gasto</Accent>
          </>
        }
        description="Steam, Epic, Xbox, PlayStation, GOG, Humble e mais — as melhores ofertas de cada loja em um só lugar."
        aside={
          data && (
            <div className="lg:text-right">
              <AnimatedNumber value={data.deals.length} className="display block text-[44px] sm:text-[56px]" />
              <p className="mt-1.5 text-sm text-fg-2">
                ofertas em {data.stores.length} lojas · atualizado {timeAgo(data.updatedAt)}
              </p>
            </div>
          )
        }
      />

      {free.length > 0 && (
        <section className="mb-12">
          <h2 className="eyebrow mb-4 flex items-center gap-2">
            <Gift className="size-3.5 text-accent-text" /> Grátis na Epic Games Store
          </h2>
          <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {free.map((f, i) => (
              <div key={f.id} style={stagger(i + 2)}>
                <FreeGameCard game={f} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="z-30 -mx-4 mb-8 space-y-3 border-y border-line bg-[var(--glass)] px-4 py-3 backdrop-blur-2xl sm:-mx-6 sm:px-6 md:sticky md:top-[68px] lg:-mx-8 lg:px-8">
        <ChipRow>
          <Chip group="store" active={store === 'all'} onClick={() => pickStore('all')} count={data?.deals.length}>
            Todas as lojas
          </Chip>
          {data?.stores.map((s) => (
            <Chip key={s.id} group="store" active={store === s.id} onClick={() => pickStore(s.id)} count={s.count}>
              <StoreDot store={s.id} />
              {s.name}
            </Chip>
          ))}
        </ChipRow>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex gap-2">
            <SearchInput
              value={q}
              onChange={(v) => {
                setQ(v)
                setLimit(PAGE)
              }}
              placeholder="Buscar promoção…"
              className="min-w-0 flex-1 md:w-64 md:flex-none"
            />
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
          <ChipRow>
            {[0, 50, 75, 90].map((v) => (
              <Chip key={v} group="discount" active={minDiscount === v} onClick={() => setMinDiscount(v)}>
                {v ? `${v}%+` : 'Qualquer %'}
              </Chip>
            ))}
            <span className="mx-1 h-5 w-px shrink-0 bg-line" />
            <Chip active={brlOnly} onClick={() => setBrlOnly((v) => !v)}>
              Só em R$
            </Chip>
          </ChipRow>
        </div>
      </div>

      {loading && !data ? (
        <GridSkeleton count={12} className="aspect-[3/4]" />
      ) : list.length === 0 ? (
        <EmptyState icon={<Tag className="size-6" />} title="Nenhuma promoção encontrada">
          Ajuste os filtros ou a busca para ver mais ofertas.
        </EmptyState>
      ) : (
        <>
          <div key={gridKey} className="stagger grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {list.slice(0, limit).map((d, i) => (
              <div key={d.id} style={stagger(i < PAGE ? i : 0)}>
                <DealCard deal={d} />
              </div>
            ))}
          </div>
          {limit < list.length && (
            <div className="mt-10 flex justify-center">
              <button onClick={() => setLimit((l) => l + PAGE * 2)} className="btn btn-ghost">
                Carregar mais · {fmtNumber(list.length - limit)} restantes
              </button>
            </div>
          )}
        </>
      )}

      <p className="mt-10 flex gap-2.5 text-xs leading-relaxed text-fg-3">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Steam, Xbox, PlayStation e Epic (grátis) usam preços da loja brasileira. GOG, Humble, Fanatical, Green Man Gaming e outras lojas
        internacionais vêm do agregador CheapShark, em dólar: o botão “Buscar na…” abre a busca da loja já filtrada pelo jogo. Confira sempre
        o valor final na loja.
      </p>
    </div>
  )
}
