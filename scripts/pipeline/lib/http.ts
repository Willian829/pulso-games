/**
 * Cliente HTTP do pipeline: timeout, novas tentativas com backoff e User-Agent identificável.
 */

export const USER_AGENT =
  process.env.PULSO_USER_AGENT ||
  'PulsoGames/1.0 (+https://github.com; painel open-source de games hospedado no GitHub Pages)'

/** Alguns sites só entregam o HTML completo para navegadores. */
export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

export interface RequestOptions extends RequestInit {
  timeoutMs?: number
  retries?: number
  query?: Record<string, string | number | boolean | undefined>
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public url: string,
    body: string,
  ) {
    super(`HTTP ${status} em ${shortUrl(url)}${body ? ` — ${body.slice(0, 160)}` : ''}`)
  }
}

function shortUrl(url: string) {
  try {
    const u = new URL(url)
    return u.host + u.pathname
  } catch {
    return url
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function withQuery(url: string, query?: RequestOptions['query']) {
  if (!query) return url
  const u = new URL(url)
  for (const [k, v] of Object.entries(query)) if (v !== undefined) u.searchParams.set(k, String(v))
  return u.toString()
}

export async function request(url: string, opts: RequestOptions = {}): Promise<Response> {
  const { timeoutMs = 25_000, retries = 2, query, headers, ...init } = opts
  const finalUrl = withQuery(url, query)
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(finalUrl, {
        ...init,
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8', ...headers },
        signal: ctrl.signal,
      })
      if (res.ok) return res
      const body = await res.text().catch(() => '')
      // 4xx (exceto 429) não melhora com nova tentativa
      if (res.status < 500 && res.status !== 429) throw new HttpError(res.status, finalUrl, body)
      lastErr = new HttpError(res.status, finalUrl, body)
    } catch (err) {
      if (err instanceof HttpError && err.status < 500 && err.status !== 429) throw err
      lastErr = err
    } finally {
      clearTimeout(timer)
    }
    if (attempt < retries) await sleep(800 * 2 ** attempt + Math.random() * 400)
  }
  if (lastErr instanceof Error && lastErr.name === 'AbortError') {
    throw new Error(`Tempo esgotado em ${shortUrl(finalUrl)}`)
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

export async function getJson<T = any>(url: string, opts?: RequestOptions): Promise<T> {
  const res = await request(url, { ...opts, headers: { Accept: 'application/json', ...opts?.headers } })
  return (await res.json()) as T
}

export async function getText(url: string, opts?: RequestOptions): Promise<string> {
  const res = await request(url, opts)
  return res.text()
}

/** Executa tarefas com concorrência limitada, preservando a ordem dos resultados. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return out
}
