import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
})

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

// Synchronously set token on module load so the first API call is already authenticated
if (typeof window !== 'undefined') {
  const _stored = window.localStorage.getItem('rt_access_token')
  if (_stored) setAuthToken(_stored)
}

// Automatically refresh the access token when it expires (401)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const isTokenEndpoint = original?.url?.includes('/auth/token/')

    if (error.response?.status === 401 && !original._retry && !isTokenEndpoint) {
      original._retry = true
      const refresh = localStorage.getItem('rt_refresh_token')

      if (refresh) {
        try {
          const res = await axios.post('http://localhost:8000/api/auth/token/refresh/', { refresh })
          const newAccess: string = res.data.access
          localStorage.setItem('rt_access_token', newAccess)
          api.defaults.headers.common.Authorization = `Bearer ${newAccess}`
          original.headers.Authorization = `Bearer ${newAccess}`
          return api(original)
        } catch {
          // refresh token also expired — kick the user out
        }
      }

      localStorage.removeItem('rt_access_token')
      localStorage.removeItem('rt_refresh_token')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

// ── Auth ─────────────────────────────────────────────────────────────

type LoginResponse = {
  access: string
  refresh: string
}

type RegisterResponse = {
  user: { id: number; email: string; full_name: string; date_joined: string }
  tokens: { access: string; refresh: string }
}

export async function login(payload: { email: string; password: string }): Promise<LoginResponse> {
  const response = await api.post('/auth/login/', {
    email: payload.email,
    password: payload.password,
  })
  return response.data as LoginResponse
}

export async function register(payload: {
  email: string
  password: string
  confirmPassword: string
  full_name: string
}): Promise<RegisterResponse> {
  const response = await api.post('/auth/register/', payload)
  return response.data as RegisterResponse
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post('/auth/password-reset/', { email })
}

// ── Market / Alpha Vantage helpers ───────────────────────────────────

export type SearchResult = {
  symbol: string
  name: string
  region?: string
  currency?: string
}

export type Quote = {
  symbol: string
  price: number | null
  change?: number | null
  changePercent?: string
  open?: number | null
  high?: number | null
  low?: number | null
  volume?: number | null
  prevClose?: number | null
  latestDay?: string
}

export type TimeSeriesPoint = {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type CompanyOverview = {
  Symbol: string
  Name: string
  Description: string
  Exchange: string
  Currency: string
  Country: string
  Sector: string
  Industry: string
  MarketCapitalization: string
  PERatio: string
  EPS: string
  DividendYield: string
  '52WeekHigh': string
  '52WeekLow': string
  Beta: string
  AnalystTargetPrice: string
  RevenuePerShareTTM: string
  ProfitMargin: string
  EVToEBITDA: string
}

export type NewsArticle = {
  title: string
  url: string
  time_published: string
  summary: string
  source: string
  overall_sentiment_label: string
  overall_sentiment_score: number
  ticker_sentiment?: Array<{ ticker: string; relevance_score: string; ticker_sentiment_label: string }>
}

export type TopMover = {
  ticker: string
  price: string
  change_amount: string
  change_percentage: string
  volume: string
}

export type MarketStatusEntry = {
  market_type: string
  region: string
  primary_exchanges: string
  local_open: string
  local_close: string
  current_status: string
  notes: string
}

export async function searchEntities(query: string): Promise<SearchResult[]> {
  const response = await api.get('/market/search/', { params: { q: query } })
  const data = response.data as { bestMatches?: Record<string, string>[] }
  const matches = data.bestMatches ?? []

  return matches.map((match) => ({
    symbol: match['1. symbol'],
    name: match['2. name'],
    region: match['4. region'],
    currency: match['8. currency'],
  }))
}

export async function getQuote(symbol: string): Promise<Quote> {
  const response = await api.get('/market/quote/', { params: { symbol } })
  const data = response.data as { 'Global Quote'?: Record<string, string> }
  const quote = data['Global Quote'] ?? {}

  const priceRaw = quote['05. price']
  const price = priceRaw ? Number(priceRaw) : null
  const change = quote['09. change'] ? Number(quote['09. change']) : null
  const open = quote['02. open'] ? Number(quote['02. open']) : null
  const high = quote['03. high'] ? Number(quote['03. high']) : null
  const low = quote['04. low'] ? Number(quote['04. low']) : null
  const volume = quote['06. volume'] ? Number(quote['06. volume']) : null
  const prevClose = quote['08. previous close'] ? Number(quote['08. previous close']) : null

  return {
    symbol: quote['01. symbol'] ?? symbol,
    price: Number.isFinite(price) ? (price as number) : null,
    change: Number.isFinite(change) ? change : null,
    changePercent: quote['10. change percent'],
    open: Number.isFinite(open) ? open : null,
    high: Number.isFinite(high) ? high : null,
    low: Number.isFinite(low) ? low : null,
    volume: Number.isFinite(volume) ? volume : null,
    prevClose: Number.isFinite(prevClose) ? prevClose : null,
    latestDay: quote['07. latest trading day'],
  }
}

export async function getTimeSeries(symbol: string, period = '1Y'): Promise<TimeSeriesPoint[]> {
  const periodToInterval: Record<string, string> = {
    '1M': '1m', '3M': '3m', '6M': '6m', '1Y': '1y', 'ALL': 'full',
    'compact': '1y', 'full': 'full',
  }
  const interval = periodToInterval[period] ?? '1y'
  const response = await api.get('/market/time-series/', { params: { symbol, interval } })
  const data = response.data as { 'Time Series (Daily)'?: Record<string, Record<string, string>> }
  const series = data['Time Series (Daily)'] ?? {}

  return Object.entries(series)
    .map(([date, values]) => ({
      date,
      open: Number(values['1. open']),
      high: Number(values['2. high']),
      low: Number(values['3. low']),
      close: Number(values['4. close']),
      volume: Number(values['5. volume']),
    }))
    .filter((point) => Number.isFinite(point.close))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

export async function getCompanyOverview(symbol: string): Promise<CompanyOverview | null> {
  try {
    const response = await api.get('/market/overview/', { params: { symbol } })
    return response.data as CompanyOverview
  } catch {
    return null
  }
}

export async function getNews(tickers = '', limit = 10): Promise<NewsArticle[]> {
  try {
    const response = await api.get('/market/news/', { params: { tickers, limit } })
    const data = response.data as { feed?: NewsArticle[] }
    return data.feed ?? []
  } catch {
    return []
  }
}

export async function getTopMovers(): Promise<{
  top_gainers: TopMover[]
  top_losers: TopMover[]
  most_actively_traded: TopMover[]
} | null> {
  try {
    const response = await api.get('/market/top-movers/')
    return response.data as { top_gainers: TopMover[]; top_losers: TopMover[]; most_actively_traded: TopMover[] }
  } catch {
    return null
  }
}

export async function getMarketStatus(): Promise<MarketStatusEntry[]> {
  try {
    const response = await api.get('/market/market-status/')
    const data = response.data as { markets?: MarketStatusEntry[] }
    return data.markets ?? []
  } catch {
    return []
  }
}

// ── Entities, Watchlist, Notes ───────────────────────────────────────────

export type Entity = {
  id: number
  nom: string
  secteur: string
  ticker: string
  valeur_totale: string | number
}

export type WatchlistItem = {
  id: number
  entity: Entity
  added_at: string
}

export type NoteItem = {
  id: number
  entity: Entity | null
  entity_id?: number
  titre: string
  contenu: string
  created_at: string
}

export async function getEntities(params?: { ticker?: string }): Promise<Entity[]> {
  const response = await api.get('/market/entities/', { params })
  return response.data as Entity[]
}

export async function createEntity(data: {
  nom: string
  secteur?: string
  ticker: string
  valeur_totale?: number
}): Promise<Entity> {
  const response = await api.post('/market/entities/', {
    nom: data.nom,
    secteur: data.secteur ?? '',
    ticker: data.ticker,
    valeur_totale: data.valeur_totale ?? 0,
  })
  return response.data as Entity
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const response = await api.get('/market/watchlist/')
  return response.data as WatchlistItem[]
}

export async function addToWatchlist(entityId: number): Promise<WatchlistItem> {
  const response = await api.post('/market/watchlist/', { entity_id: entityId })
  return response.data as WatchlistItem
}

export async function removeFromWatchlist(watchlistItemId: number): Promise<void> {
  await api.delete(`/market/watchlist/${watchlistItemId}/`)
}

export async function getNotes(): Promise<NoteItem[]> {
  const response = await api.get('/market/notes/')
  return response.data as NoteItem[]
}

export async function createNote(data: {
  entity_id: number
  titre: string
  contenu: string
}): Promise<NoteItem> {
  const response = await api.post('/market/notes/', data)
  return response.data as NoteItem
}

export async function updateNote(id: number, data: { titre?: string; contenu?: string }): Promise<NoteItem> {
  const response = await api.patch(`/market/notes/${id}/`, data)
  return response.data as NoteItem
}

export async function deleteNote(id: number): Promise<void> {
  await api.delete(`/market/notes/${id}/`)
}


export { api }
