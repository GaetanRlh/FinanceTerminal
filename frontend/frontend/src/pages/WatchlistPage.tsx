import {
  Alert,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { getWatchlist, removeFromWatchlist, getQuote, type WatchlistItem, type Quote } from '../services/api'

type WatchlistItemWithQuote = WatchlistItem & {
  quote: Quote | null
  quoteLoading: boolean
}

const REFRESH_MS = 60_000

export function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItemWithQuote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const navigate = useNavigate()

  const enrichWithQuotes = useCallback(async (watchlistItems: WatchlistItem[]) => {
    const enriched: WatchlistItemWithQuote[] = watchlistItems.map((item) => ({
      ...item,
      quote: null,
      quoteLoading: true,
    }))
    setItems(enriched)

    const results = await Promise.allSettled(
      watchlistItems.map((item) => getQuote(item.entity.ticker))
    )

    setItems(
      watchlistItems.map((item, idx) => ({
        ...item,
        quote: results[idx].status === 'fulfilled' ? (results[idx] as PromiseFulfilledResult<Quote>).value : null,
        quoteLoading: false,
      }))
    )
    setLastRefresh(new Date())
  }, [])

  const fetchData = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const data = await getWatchlist()
      // Stop the full-page spinner before fetching per-row quotes
      // so the table renders with per-row loading indicators
      if (showLoader) setIsLoading(false)
      await enrichWithQuotes(data)
    } catch {
      setError('Unable to load watchlist.')
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [enrichWithQuotes])

  useEffect(() => {
    fetchData(true)
  }, [fetchData])

  useEffect(() => {
    const interval = setInterval(() => fetchData(false), REFRESH_MS)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleRemove = async (item: WatchlistItemWithQuote, e: React.MouseEvent) => {
    e.stopPropagation()
    setRemovingId(item.id)
    try {
      await removeFromWatchlist(item.id)
      setItems((prev) => prev.filter((w) => w.id !== item.id))
    } catch {
      // silent
    } finally {
      setRemovingId(null)
    }
  }

  const gainers = items.filter((i) => {
    const cp = i.quote?.changePercent ? parseFloat(i.quote.changePercent) : 0
    return cp > 0
  }).length

  const losers = items.filter((i) => {
    const cp = i.quote?.changePercent ? parseFloat(i.quote.changePercent) : 0
    return cp < 0
  }).length

  return (
    <>
      <PageHeader
        title="Watchlist"
        subtitle="Your tracked assets with live market data"
        breadcrumbs={[{ label: 'Market', to: '/' }, { label: 'Watchlist' }]}
        actions={
          <Tooltip title="Refresh prices">
            <IconButton
              size="small"
              onClick={() => fetchData(false)}
              disabled={refreshing}
              sx={{ color: 'rgba(0,212,255,0.5)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 1 }}
            >
              <RefreshIcon sx={{ fontSize: 16, animation: refreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }
              }} />
            </IconButton>
          </Tooltip>
        }
      />

      {/* Summary stats */}
      {!isLoading && items.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, mb: 2.5 }}>
          {[
            { label: 'ASSETS', value: String(items.length), accent: '#00d4ff' },
            { label: 'GAINERS', value: String(gainers), accent: '#00ff88' },
            { label: 'LOSERS', value: String(losers), accent: '#ff3366' },
            { label: 'LAST UPDATE', value: lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), accent: 'rgba(224,230,240,0.4)' },
          ].map((stat) => (
            <Paper
              key={stat.label}
              sx={{ p: 1.5, textAlign: 'center' }}
            >
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(0,212,255,0.5)', fontFamily: '"JetBrains Mono", monospace', mb: 0.5 }}>
                {stat.label}
              </Typography>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: stat.accent, fontFamily: '"JetBrains Mono", monospace' }}>
                {stat.value}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <Stack spacing={1.5} alignItems="center">
            <CircularProgress size={24} sx={{ color: 'rgba(0,212,255,0.5)' }} />
            <Typography sx={{ fontSize: '0.72rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
              Loading watchlist...
            </Typography>
          </Stack>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!isLoading && !error && (
        <Paper sx={{ overflow: 'hidden' }}>
          {items.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography sx={{ color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.82rem', mb: 1 }}>
                Your watchlist is empty
              </Typography>
              <Typography sx={{ color: 'rgba(224,230,240,0.2)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.7rem' }}>
                → Browse Explorer to find and track assets
              </Typography>
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Change</TableCell>
                  <TableCell align="right">High</TableCell>
                  <TableCell align="right">Low</TableCell>
                  <TableCell align="right">Volume</TableCell>
                  <TableCell align="center" sx={{ width: 60 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => {
                  const q = item.quote
                  const cp = q?.changePercent ? parseFloat(q.changePercent) : null
                  const up = cp != null ? cp >= 0 : true

                  return (
                    <TableRow
                      key={item.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/entities/${encodeURIComponent(item.entity.ticker)}`)}
                    >
                      <TableCell>
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: '#00d4ff', fontSize: '0.82rem' }}>
                          {item.entity.ticker}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem', color: '#e0e6f0' }}>
                          {item.entity.nom}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {item.quoteLoading ? (
                          <CircularProgress size={12} sx={{ color: 'rgba(0,212,255,0.3)' }} />
                        ) : (
                          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: '0.85rem', color: '#e0e6f0' }}>
                            {q?.price != null ? `$${q.price.toFixed(2)}` : '—'}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {item.quoteLoading ? null : cp != null ? (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                            {up ? (
                              <TrendingUpIcon sx={{ fontSize: 12, color: '#00ff88' }} />
                            ) : (
                              <TrendingDownIcon sx={{ fontSize: 12, color: '#ff3366' }} />
                            )}
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem', fontWeight: 700, color: up ? '#00ff88' : '#ff3366' }}>
                              {up ? '+' : ''}{cp.toFixed(2)}%
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ color: 'rgba(224,230,240,0.3)', fontSize: '0.75rem' }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', color: 'rgba(0,255,136,0.7)' }}>
                          {q?.high != null ? `$${q.high.toFixed(2)}` : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', color: 'rgba(255,51,102,0.7)' }}>
                          {q?.low != null ? `$${q.low.toFixed(2)}` : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: 'rgba(224,230,240,0.4)' }}>
                          {q?.volume != null ? Number(q.volume).toLocaleString('en-US', { notation: 'compact' }) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Remove from watchlist">
                          <IconButton
                            size="small"
                            onClick={(e) => handleRemove(item, e)}
                            disabled={removingId === item.id}
                            sx={{ color: '#f59e0b', '&:hover': { color: '#fbbf24', bgcolor: 'rgba(245,158,11,0.1)' } }}
                          >
                            {removingId === item.id ? (
                              <CircularProgress size={14} sx={{ color: '#f59e0b' }} />
                            ) : (
                              <StarIcon sx={{ fontSize: 15 }} />
                            )}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}
    </>
  )
}
