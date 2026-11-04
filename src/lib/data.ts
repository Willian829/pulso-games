import { useEffect, useState } from 'react'
import type { AwardsData, DealsData, Meta, MostPlayedData, TrendingData, UpcomingData } from '../types'

export interface Datasets {
  meta: Meta
  'most-played': MostPlayedData
  deals: DealsData
  upcoming: UpcomingData
  trending: TrendingData
  awards: AwardsData
}
export type DatasetName = keyof Datasets

const cache = new Map<DatasetName, Promise<unknown>>()
const resolved = new Map<DatasetName, unknown>()

/** Carrega um arquivo de public/data (com cache em memória compartilhado entre páginas). */
export function load<K extends DatasetName>(name: K): Promise<Datasets[K]> {
  let p = cache.get(name)
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/${name}.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`Falha ao carregar ${name} (${r.status})`)
        return r.json()
      })
      .then((j) => {
        resolved.set(name, j)
        return j
      })
      .catch((e) => {
        cache.delete(name)
        throw e
      })
    cache.set(name, p)
  }
  return p as Promise<Datasets[K]>
}

export interface DataState<T> {
  data: T | null
  error: Error | null
  loading: boolean
}

export function useDataset<K extends DatasetName>(name: K): DataState<Datasets[K]> {
  const [state, setState] = useState<DataState<Datasets[K]>>(() => {
    const r = resolved.get(name) as Datasets[K] | undefined
    return { data: r ?? null, error: null, loading: !r }
  })
  useEffect(() => {
    if (state.data) return
    let alive = true
    load(name)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }))
    return () => {
      alive = false
    }
  }, [name, state.data])
  return state
}

/** Carrega vários conjuntos de uma vez. */
export function useDatasets<K extends DatasetName>(...names: K[]) {
  const [state, setState] = useState<{ data: { [P in K]?: Datasets[P] }; loading: boolean; error: Error | null }>(() => {
    const data: { [P in K]?: Datasets[P] } = {}
    for (const n of names) {
      const r = resolved.get(n)
      if (r) (data as any)[n] = r
    }
    return { data, loading: names.some((n) => !resolved.has(n)), error: null }
  })
  const key = names.join('|')
  useEffect(() => {
    let alive = true
    Promise.allSettled(names.map((n) => load(n))).then((results) => {
      if (!alive) return
      const data: any = {}
      let error: Error | null = null
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') data[names[i]] = r.value
        else error = r.reason
      })
      setState({ data, loading: false, error })
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state
}
