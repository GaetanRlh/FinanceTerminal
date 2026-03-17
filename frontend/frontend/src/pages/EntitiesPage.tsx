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
  Typography,
  Chip,
  Stack,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
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

const POPULAR = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'SPY', 'BRK.A', 'V']

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

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    if (q !== query) setQuery(q)
  }, [searchParams])

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
            setError('Sign in to search entities.')
          } else if (status === 503 && msg) {
            setError(msg)
          } else {
            setError('Unable to fetch results. Check your connection or try again.')
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchResults()
    return () => { cancelled = true }
  }, [debouncedQuery])

  useEffect(() => {
    if (!isAuthenticated) {
      setDjangoEntities([])
      setWatchlist([])
      return
    }

    let cancelled = false
    const fetchAuth = async () => {
      try {
        const [entitiesRes, watchlistRes] = await Promise.all([getEntities(), getWatchlist()])
        if (!cancelled) {
          setDjangoEntities(entitiesRes.map((e) => ({ id: e.id, ticker: e.ticker })))
          setWatchlist(watchlistRes)
        }
      } catch {
        // silent
      }
    }
    fetchAuth()
    return () => { cancelled = true }
  }, [isAuthenticated])

  const watchlistByTicker = useMemo(() => {
    const map = new Map<string, WatchlistItem>()
    for (const w of watchlist) map.set(w.entity.ticker, w)
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
        const created = await createEntity({ nom: result.name, ticker: result.symbol, secteur: '', valeur_totale: 0 })
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
      // silent
    } finally {
      setWatchlistToggling(null)
    }
  }

  const hasQuery = query.trim().length >= 2

  return (
    <>
      <PageHeader
        title="Explorer"
        subtitle="Search and browse financial entities from global markets"
        breadcrumbs={[{ label: 'Market', to: '/' }, { label: 'Explorer' }]}
      />

      {/* Search bar */}
      <Box sx={{ mb: 2.5 }}>
        <TextField
          label="Search entity"
          placeholder="Company name, sector, or ticker symbol (min 2 chars)"
          fullWidth
          variant="outlined"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'rgba(0,212,255,0.4)', fontSize: 18 }} />
              </InputAdornment>
            ),
            endAdornment: isLoading ? (
              <InputAdornment position="end">
                <CircularProgress size={16} sx={{ color: 'rgba(0,212,255,0.4)' }} />
              </InputAdornment>
            ) : null,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: '0.9rem',
            },
          }}
        />
      </Box>

      {/* Popular tickers shortcut */}
      {!hasQuery && (
        <Box sx={{ mb: 2.5 }}>
          <Typography sx={{ fontSize: '0.62rem', letterSpacing: '0.1em', color: 'rgba(0,212,255,0.4)', fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, mb: 1 }}>
            POPULAR
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.75}>
            {POPULAR.map((sym) => (
              <Chip
                key={sym}
                label={sym}
                size="small"
                icon={<TrendingUpIcon sx={{ fontSize: '12px !important' }} />}
                onClick={() => setQuery(sym)}
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  bgcolor: 'rgba(0,212,255,0.05)',
                  border: '1px solid rgba(0,212,255,0.2)',
                  color: 'rgba(0,212,255,0.8)',
                  '&:hover': {
                    bgcolor: 'rgba(0,212,255,0.1)',
                    borderColor: 'rgba(0,212,255,0.5)',
                  },
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {!isAuthenticated && hasQuery && (
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.78rem' }}>
          Sign in to search entities and manage your watchlist.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, fontSize: '0.78rem' }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Region</TableCell>
              <TableCell>Currency</TableCell>
              <TableCell align="right">Detail</TableCell>
              {isAuthenticated && (
                <TableCell align="center" sx={{ width: 60 }}>
                  Watch
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {!hasQuery && !isLoading && !error && (
              <TableRow>
                <TableCell colSpan={isAuthenticated ? 6 : 5} sx={{ py: 4 }}>
                  <Typography sx={{ color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem', textAlign: 'center' }}>
                    Type at least 2 characters to search entities
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {hasQuery && results.length === 0 && !isLoading && !error && (
              <TableRow>
                <TableCell colSpan={isAuthenticated ? 6 : 5} sx={{ py: 4 }}>
                  <Typography sx={{ color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem', textAlign: 'center' }}>
                    No results for "{query}"
                  </Typography>
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
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/entities/${encodeURIComponent(result.symbol)}`)}
                >
                  <TableCell>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: '#00d4ff', fontSize: '0.82rem' }}>
                      {result.symbol}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', color: '#e0e6f0' }}>
                      {result.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', color: 'rgba(224,230,240,0.5)' }}>
                      {result.region ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={result.currency ?? '—'}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        bgcolor: 'rgba(245,158,11,0.1)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245,158,11,0.25)',
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Open detail page">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/entities/${encodeURIComponent(result.symbol)}`)}
                        sx={{ color: 'rgba(0,212,255,0.4)', '&:hover': { color: '#00d4ff' } }}
                      >
                        <OpenInNewIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  {isAuthenticated && (
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}>
                        <IconButton
                          size="small"
                          onClick={(e) => ensureEntityAndToggleWatchlist(result, e)}
                          disabled={toggling}
                          sx={{ color: inWatchlist ? '#f59e0b' : 'rgba(224,230,240,0.2)', '&:hover': { color: '#f59e0b' } }}
                        >
                          {toggling ? (
                            <CircularProgress size={16} sx={{ color: 'rgba(0,212,255,0.4)' }} />
                          ) : inWatchlist ? (
                            <StarIcon sx={{ fontSize: 16 }} />
                          ) : (
                            <StarBorderIcon sx={{ fontSize: 16 }} />
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
