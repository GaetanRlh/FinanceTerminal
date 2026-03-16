import {
  Box,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  InputAdornment,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../contexts/AuthContext'
import {
  searchEntities,
  getEntities,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  createEntity,
  type SearchResult,
  type WatchlistItem,
} from '../services/api'

export function EntitiesPage() {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [djangoEntities, setDjangoEntities] = useState<{ id: number; ticker: string }[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [watchlistToggling, setWatchlistToggling] = useState<string | null>(null)
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const debouncedQuery = useDebouncedValue(query, 400)

  // Sync URL query to local state
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    if (q !== query) setQuery(q)
  }, [searchParams])

  // Fetch search results (Alpha Vantage) when authenticated
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([])
      setError(null)
      return
    }

    let cancelled = false
    const fetchResults = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await searchEntities(debouncedQuery.trim())
        if (!cancelled) setResults(data)
      } catch (err: unknown) {
        if (!cancelled) {
          const ax = err as { response?: { status?: number; data?: { error?: string } } }
          const status = ax?.response?.status
          const msg = ax?.response?.data?.error
          if (status === 401) {
            setError('Connectez-vous pour rechercher des entités.')
          } else if (status === 503 && msg) {
            setError(msg)
          } else {
            setError('Impossible de récupérer les résultats. Vérifiez votre connexion ou réessayez.')
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchResults()
    return () => { cancelled = true }
  }, [debouncedQuery])

  // Fetch Django entities and watchlist when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setDjangoEntities([])
      setWatchlist([])
      return
    }

    let cancelled = false
    const fetch = async () => {
      try {
        const [entitiesRes, watchlistRes] = await Promise.all([
          getEntities(),
          getWatchlist(),
        ])
        if (!cancelled) {
          setDjangoEntities(entitiesRes.map((e) => ({ id: e.id, ticker: e.ticker })))
          setWatchlist(watchlistRes)
        }
      } catch {
        // Silently fail; watchlist toggle will still work via ensure-create
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [isAuthenticated])

  const watchlistByTicker = useMemo(() => {
    const map = new Map<string, WatchlistItem>()
    for (const w of watchlist) {
      map.set(w.entity.ticker, w)
    }
    return map
  }, [watchlist])

  const ensureEntityAndToggleWatchlist = async (result: SearchResult, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAuthenticated) return
    setWatchlistToggling(result.symbol)

    try {
      const existing = djangoEntities.find((e) => e.ticker === result.symbol)
      let entityId = existing?.id

      if (!entityId) {
        const created = await createEntity({
          nom: result.name,
          ticker: result.symbol,
          secteur: '',
          valeur_totale: 0,
        })
        entityId = created.id
        setDjangoEntities((prev) => [...prev, { id: created.id, ticker: created.ticker }])
      }

      const wl = watchlistByTicker.get(result.symbol)
      if (wl) {
        await removeFromWatchlist(wl.id)
        setWatchlist((prev) => prev.filter((w) => w.id !== wl.id))
      } else {
        const added = await addToWatchlist(entityId)
        setWatchlist((prev) => [added, ...prev])
      }
    } catch {
      // Could show toast
    } finally {
      setWatchlistToggling(null)
    }
  }

  const hasQuery = query.trim().length >= 2

  return (
    <>
      <PageHeader
        title="Explorateur d'entités"
        subtitle="Recherchez et explorez les entités financières. Ajoutez-les à votre watchlist pour les suivre."
      />
      <Box sx={{ mb: 3 }}>
        <TextField
          label="Rechercher une entité"
          placeholder="Nom, secteur ou ticker (min. 2 caractères)"
          fullWidth
          variant="outlined"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.paper',
            },
          }}
        />
      </Box>

      {!isAuthenticated && hasQuery && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Connectez-vous pour rechercher des entités et les ajouter à votre watchlist.
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ overflow: 'hidden' }}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Symbole</TableCell>
              <TableCell>Région</TableCell>
              <TableCell>Devise</TableCell>
              {isAuthenticated && (
                <TableCell align="center" sx={{ width: 60 }}>
                  Watchlist
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {!hasQuery && !isLoading && !error && (
              <TableRow>
                <TableCell colSpan={isAuthenticated ? 5 : 4} sx={{ py: 4, color: 'text.secondary' }}>
                  Tapez au moins 2 caractères pour lancer une recherche.
                </TableCell>
              </TableRow>
            )}
            {hasQuery && results.length === 0 && !isLoading && !error && (
              <TableRow>
                <TableCell colSpan={isAuthenticated ? 5 : 4} sx={{ py: 4, color: 'text.secondary' }}>
                  Aucun résultat trouvé.
                </TableCell>
              </TableRow>
            )}
            {results.map((result) => {
              const inWatchlist = !!watchlistByTicker.get(result.symbol)
              const toggling = watchlistToggling === result.symbol
              return (
                <TableRow
                  key={`${result.symbol}-${result.region ?? ''}`}
                  hover
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => navigate(`/entities/${encodeURIComponent(result.symbol)}`)}
                >
                  <TableCell sx={{ fontWeight: 500 }}>{result.name}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{result.symbol}</TableCell>
                  <TableCell>{result.region ?? '—'}</TableCell>
                  <TableCell>{result.currency ?? '—'}</TableCell>
                  {isAuthenticated && (
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title={inWatchlist ? 'Retirer de la watchlist' : 'Ajouter à la watchlist'}>
                        <IconButton
                          size="small"
                          onClick={(e) => ensureEntityAndToggleWatchlist(result, e)}
                          disabled={toggling}
                          sx={{ color: inWatchlist ? 'primary.main' : 'text.secondary' }}
                        >
                          {toggling ? (
                            <CircularProgress size={20} />
                          ) : inWatchlist ? (
                            <StarIcon fontSize="small" />
                          ) : (
                            <StarBorderIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Paper>
    </>
  )
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return useMemo(() => debounced, [debounced])
}
