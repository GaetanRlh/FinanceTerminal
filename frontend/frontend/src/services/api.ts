import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
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
          const res = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh })
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
  ForwardPE?: string
  PEGRatio?: string
  PriceToBookRatio?: string
  PriceToSalesRatioTTM?: string
  '50DayMovingAverage'?: string
  '200DayMovingAverage'?: string
  ReturnOnEquityTTM?: string
  ReturnOnAssetsTTM?: string
  OperatingMarginTTM?: string
  SharesOutstanding?: string
  EnterpriseValue?: string
  EnterpriseToRevenue?: string
  QuarterlyEarningsGrowthYOY?: string
  QuarterlyRevenueGrowthYOY?: string
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
  list_name?: string
  tags?: string[]
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

export type EntityContextData = {
  symbol: string
  overview: CompanyOverview
  peers: Array<{
    symbol: string
    name: string
    price: string | null
    change_percent: string
    market_cap: string
  }>
  earnings_history: Array<{
    date: string
    eps_estimate: string | null
    eps_actual: string | null
    surprise_pct: string | null
  }>
}

export type EconomicEvent = {
  id: number
  title: string
  event_type: 'FOMC' | 'CPI' | 'NFP' | 'GDP' | 'PMI' | 'OTHER'
  scheduled_at: string
  country: string
  currency: string
  importance: 'HIGH' | 'MEDIUM' | 'LOW'
  source_url?: string
}

export type EarningsEvent = {
  id: number
  ticker: string
  company_name: string
  scheduled_at: string
  session: 'PRE_MARKET' | 'POST_MARKET' | 'DURING_MARKET' | 'TBD'
  source_url?: string
}

export type EventReminder = {
  id: number
  economic_event: EconomicEvent | null
  earnings_event: EarningsEvent | null
  offset_minutes: number
  enabled: boolean
  created_at: string
}

export type AlertRule = {
  id: number
  name: string
  rule_type:
    | 'PRICE_ABOVE'
    | 'PRICE_BELOW'
    | 'MOVE_UP_PCT'
    | 'MOVE_DOWN_PCT'
    | 'EVENT_SOON_MINUTES'
  symbol: string
  threshold: string
  enabled: boolean
  last_triggered_at: string | null
  created_at: string
  updated_at: string
}

export type AlertEvent = {
  id: number
  rule: AlertRule | null
  message: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  payload: Record<string, unknown>
  acknowledged: boolean
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

export async function getWatchlist(params?: { list_name?: string; tag?: string }): Promise<WatchlistItem[]> {
  const response = await api.get('/market/watchlist/', { params })
  return response.data as WatchlistItem[]
}

export async function addToWatchlist(entityId: number, options?: { list_name?: string; tags?: string[] }): Promise<WatchlistItem> {
  const response = await api.post('/market/watchlist/', {
    entity_id: entityId,
    list_name: options?.list_name,
    tags: options?.tags,
  })
  return response.data as WatchlistItem
}

export async function updateWatchlistItem(
  id: number,
  payload: Partial<Pick<WatchlistItem, 'list_name' | 'tags'>>
): Promise<WatchlistItem> {
  const response = await api.patch(`/market/watchlist/${id}/`, payload)
  return response.data as WatchlistItem
}

export async function getWatchlistCollections(): Promise<Array<{ name: string; count: number; tags: string[] }>> {
  const response = await api.get('/market/watchlist/lists/')
  return response.data as Array<{ name: string; count: number; tags: string[] }>
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

export async function getEntityContext(symbol: string): Promise<EntityContextData> {
  const response = await api.get('/market/entity-context/', { params: { symbol } })
  return response.data as EntityContextData
}

export async function getEconomicEvents(params?: {
  from?: string
  to?: string
  importance?: 'HIGH' | 'MEDIUM' | 'LOW'
  currency?: string
}): Promise<EconomicEvent[]> {
  const response = await api.get('/market/calendar/economic/', { params })
  return response.data as EconomicEvent[]
}

export async function getEarningsEvents(params?: {
  from?: string
  to?: string
  watchlist_only?: boolean
}): Promise<EarningsEvent[]> {
  const response = await api.get('/market/calendar/earnings/', { params })
  return response.data as EarningsEvent[]
}

export async function getEventReminders(): Promise<EventReminder[]> {
  const response = await api.get('/market/calendar/reminders/')
  return response.data as EventReminder[]
}

export async function createEventReminder(payload: {
  economic_event_id?: number
  earnings_event_id?: number
  offset_minutes: number
  enabled?: boolean
}): Promise<EventReminder> {
  const response = await api.post('/market/calendar/reminders/', payload)
  return response.data as EventReminder
}

export async function deleteEventReminder(id: number): Promise<void> {
  await api.delete(`/market/calendar/reminders/${id}/`)
}

export async function getAlertRules(): Promise<AlertRule[]> {
  const response = await api.get('/market/alerts/rules/')
  return response.data as AlertRule[]
}

export async function createAlertRule(payload: {
  name: string
  rule_type: AlertRule['rule_type']
  symbol?: string
  threshold: number
  enabled?: boolean
}): Promise<AlertRule> {
  const response = await api.post('/market/alerts/rules/', payload)
  return response.data as AlertRule
}

export async function updateAlertRule(
  id: number,
  payload: Partial<Pick<AlertRule, 'name' | 'symbol' | 'threshold' | 'enabled'>>
): Promise<AlertRule> {
  const response = await api.patch(`/market/alerts/rules/${id}/`, payload)
  return response.data as AlertRule
}

export async function deleteAlertRule(id: number): Promise<void> {
  await api.delete(`/market/alerts/rules/${id}/`)
}

export async function getAlertEvents(params?: { acknowledged?: boolean }): Promise<AlertEvent[]> {
  const response = await api.get('/market/alerts/events/', { params })
  return response.data as AlertEvent[]
}

export async function acknowledgeAlertEvent(id: number, acknowledged: boolean): Promise<AlertEvent> {
  const response = await api.patch(`/market/alerts/events/${id}/`, { acknowledged })
  return response.data as AlertEvent
}

export async function evaluateAlertRules(): Promise<{ created: number; unacknowledged: number }> {
  const response = await api.post('/market/alerts/evaluate/')
  return response.data as { created: number; unacknowledged: number }
}


export { api }
