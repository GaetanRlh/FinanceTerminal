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

type LoginResponse = {
  access: string
  refresh: string
}

export async function login(payload: { email: string; password: string }): Promise<LoginResponse> {
  const response = await api.post('/auth/login/', {
    email: payload.email,
    password: payload.password,
  })
  return response.data as LoginResponse
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
  changePercent?: string
}

export type TimeSeriesPoint = {
  date: string
  close: number
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

  return {
    symbol: quote['01. symbol'] ?? symbol,
    price: Number.isFinite(price) ? (price as number) : null,
    changePercent: quote['10. change percent'],
  }
}

export async function getTimeSeries(symbol: string): Promise<TimeSeriesPoint[]> {
  const response = await api.get('/market/time-series/', { params: { symbol } })
  const data = response.data as { 'Time Series (Daily)'?: Record<string, Record<string, string>> }
  const series = data['Time Series (Daily)'] ?? {}

  return Object.entries(series)
    .map(([date, values]) => ({
      date,
      close: Number(values['4. close']),
    }))
    .filter((point) => Number.isFinite(point.close))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
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

