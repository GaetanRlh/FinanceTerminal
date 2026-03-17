import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Link,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ArticleIcon from '@mui/icons-material/Article'
import InfoIcon from '@mui/icons-material/Info'
import { useEffect, useState, useCallback } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getQuote,
  getTimeSeries,
  getEntities,
  createEntity,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  getCompanyOverview,
  getNews,
  type Quote,
  type TimeSeriesPoint,
  type NoteItem,
  type CompanyOverview,
  type NewsArticle,
} from '../services/api'
import { PortfolioLineChart, type ChartPoint } from '../components/charts/PortfolioLineChart'
import { PageHeader } from '../components/PageHeader'

type TabValue = 'chart' | 'fundamentals' | 'news' | 'notes'

const PERIOD_DAYS: Record<string, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  ALL: 99999,
}

function FundamentalRow({ label, value, highlight }: { label: string; value: string | number | null | undefined; highlight?: boolean }) {
  if (value == null || value === 'None' || value === '-' || value === '') return null
  return (
    <TableRow>
      <TableCell sx={{ color: 'rgba(0,212,255,0.6)', fontSize: '0.72rem', py: 0.75 }}>{label}</TableCell>
      <TableCell align="right" sx={{ fontSize: '0.78rem', fontWeight: highlight ? 700 : 500, color: highlight ? '#e0e6f0' : 'rgba(224,230,240,0.8)', py: 0.75 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </TableCell>
    </TableRow>
  )
}

function StatCard({ label, value, sub, accent = '#00d4ff' }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <Card sx={{ p: 0 }}>
      <CardContent sx={{ p: '12px 14px !important' }}>
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(0,212,255,0.5)', fontFamily: '"JetBrains Mono", monospace', mb: 0.5 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: accent, fontFamily: '"JetBrains Mono", monospace', letterSpacing: '-0.01em' }}>
          {value}
        </Typography>
        {sub && (
          <Typography sx={{ fontSize: '0.62rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace', mt: 0.25 }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

function formatMarketCap(val: string) {
  const n = parseFloat(val)
  if (isNaN(n)) return val
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toLocaleString()}`
}

function SentimentBadge({ label }: { label: string }) {
  const color = label?.toLowerCase().includes('bullish') ? '#00ff88'
    : label?.toLowerCase().includes('bearish') ? '#ff3366'
    : '#f59e0b'
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        height: 16, fontSize: '0.55rem', fontWeight: 700,
        bgcolor: `${color}15`, color,
        border: `1px solid ${color}40`,
        '& .MuiChip-label': { px: 0.75 },
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}
    />
  )
}

export function EntityDetailPage() {
  const { symbol = '' } = useParams<{ symbol: string }>()
  const decodedSymbol = decodeURIComponent(symbol)
  const { isAuthenticated } = useAuth()

  const [quote, setQuote] = useState<Quote | null>(null)
  const [series, setSeries] = useState<TimeSeriesPoint[]>([])
  const [overview, setOverview] = useState<CompanyOverview | null>(null)
  const [news, setNews] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('3M')

  const [entityId, setEntityId] = useState<number | null>(null)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [watchlistItemId, setWatchlistItemId] = useState<number | null>(null)
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [watchlistError, setWatchlistError] = useState<string | null>(null)

  const [notes, setNotes] = useState<NoteItem[]>([])
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [notesError, setNotesError] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')

  const [activeTab, setActiveTab] = useState<TabValue>('chart')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [q, s, ov, newsRes] = await Promise.all([
        getQuote(decodedSymbol),
        getTimeSeries(decodedSymbol, 'ALL'),
        getCompanyOverview(decodedSymbol),
        getNews(decodedSymbol, 8),
      ])
      setQuote(q)
      setSeries(s)
      setOverview(ov)
      setNews(newsRes)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const data = (err as { response?: { data?: { error?: string } } })?.response?.data
      setError(
        status === 401
          ? 'Sign in to view market data for this entity.'
          : data?.error ?? 'Unable to load market data.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [decodedSymbol])

  useEffect(() => {
    load()
    const interval = setInterval(() => {
      getQuote(decodedSymbol).then(setQuote).catch(() => {})
    }, 60_000)
    return () => clearInterval(interval)
  }, [load, decodedSymbol])

  useEffect(() => {
    if (!isAuthenticated || !quote) return
    let cancelled = false
    const ensureAndFetch = async () => {
      try {
        const entities = await getEntities()
        const existing = entities.find((e) => e.ticker === quote.symbol)
        let id = existing?.id
        if (!id) {
          try {
            const created = await createEntity({ nom: overview?.Name ?? quote.symbol, ticker: quote.symbol, secteur: overview?.Sector ?? '', valeur_totale: 0 })
            id = created.id
          } catch {
            // Another concurrent request may have already created it — re-fetch
            const retried = await getEntities()
            id = retried.find((e) => e.ticker === quote.symbol)?.id
          }
        }
        if (!id || cancelled) return
        setEntityId(id)
        const [watchlistRes, notesRes] = await Promise.all([getWatchlist(), getNotes()])
        if (cancelled) return
        const wl = watchlistRes.find((w) => w.entity.id === id)
        setIsInWatchlist(!!wl)
        setWatchlistItemId(wl?.id ?? null)
        setNotes(notesRes.filter((n) => n.entity?.id === id))
      } catch { /* silent */ }
    }
    ensureAndFetch()
    return () => { cancelled = true }
  }, [isAuthenticated, quote, overview])

  const handleToggleWatchlist = async () => {
    if (!isAuthenticated || !entityId) return
    setWatchlistLoading(true)
    setWatchlistError(null)
    try {
      if (isInWatchlist && watchlistItemId != null) {
        await removeFromWatchlist(watchlistItemId)
        setIsInWatchlist(false)
        setWatchlistItemId(null)
      } else {
        const added = await addToWatchlist(entityId)
        setIsInWatchlist(true)
        setWatchlistItemId(added.id)
      }
    } catch {
      setWatchlistError('Failed to update watchlist. Please try again.')
    } finally {
      setWatchlistLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!entityId || !newNoteContent.trim()) return
    setNotesError(null)
    try {
      const created = await createNote({
        entity_id: entityId,
        titre: newNoteTitle.trim() || `Note on ${decodedSymbol}`,
        contenu: newNoteContent.trim(),
      })
      setNotes((prev) => [created, ...prev])
      setNewNoteTitle('')
      setNewNoteContent('')
    } catch {
      setNotesError('Failed to save note.')
    }
  }

  const handleSaveEdit = async () => {
    if (editingNoteId == null) return
    setNotesError(null)
    try {
      const updated = await updateNote(editingNoteId, { contenu: editingContent })
      setNotes((prev) => prev.map((n) => (n.id === editingNoteId ? updated : n)))
      setEditingNoteId(null)
    } catch {
      setNotesError('Failed to save note. Please try again.')
    }
  }

  const handleDeleteNote = async (id: number) => {
    setNotesError(null)
    try {
      await deleteNote(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
    } catch {
      setNotesError('Failed to delete note. Please try again.')
    }
  }

  // Filter series by period
  const cutoff = (() => {
    const days = PERIOD_DAYS[period] ?? 90
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().slice(0, 10)
  })()

  const filteredSeries = series.filter((p) => p.date >= cutoff)
  const chartData: ChartPoint[] = filteredSeries.map((p) => ({
    date: p.date,
    value: p.close,
    open: p.open,
    high: p.high,
    low: p.low,
    volume: p.volume,
  }))

  const cp = quote?.changePercent ? parseFloat(quote.changePercent) : null
  const up = cp != null ? cp >= 0 : true

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', py: 10, gap: 2 }}>
        <CircularProgress size={28} sx={{ color: 'rgba(0,212,255,0.5)' }} />
        <Typography sx={{ fontSize: '0.75rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
          Loading {decodedSymbol}...
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={!isAuthenticated && (
          <Button color="inherit" component={RouterLink} to="/login" size="small">Sign In</Button>
        )}
        sx={{ fontSize: '0.8rem' }}
      >
        {error}
      </Alert>
    )
  }

  return (
    <Stack spacing={2.5}>
      {watchlistError && (
        <Alert severity="error" onClose={() => setWatchlistError(null)} sx={{ fontSize: '0.78rem' }}>
          {watchlistError}
        </Alert>
      )}
      {/* Header */}
      <PageHeader
        title={decodedSymbol}
        subtitle={overview?.Name ?? overview?.Exchange ?? 'Financial Entity'}
        breadcrumbs={[{ label: 'Market', to: '/' }, { label: 'Explorer', to: '/entities' }, { label: decodedSymbol }]}
        badge={
          overview?.Sector ? (
            <Chip
              label={overview.Sector}
              size="small"
              sx={{
                height: 20, fontSize: '0.62rem', fontWeight: 700,
                bgcolor: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.3)',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          ) : null
        }
        actions={
          isAuthenticated ? (
            <Button
              variant={isInWatchlist ? 'contained' : 'outlined'}
              size="small"
              startIcon={watchlistLoading ? <CircularProgress size={14} /> : isInWatchlist ? <StarIcon /> : <StarBorderIcon />}
              onClick={handleToggleWatchlist}
              disabled={watchlistLoading}
              sx={{ fontSize: '0.72rem', px: 1.5 }}
            >
              {isInWatchlist ? 'Watching' : 'Watch'}
            </Button>
          ) : (
            <Tooltip title="Sign in to add to watchlist">
              <span>
                <Button variant="outlined" size="small" startIcon={<StarBorderIcon />} disabled sx={{ fontSize: '0.72rem' }}>
                  Watch
                </Button>
              </span>
            </Tooltip>
          )
        }
      />

      {/* Price + key stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 1.5 }}>
        <Card sx={{ gridColumn: { xs: '1', sm: '1 / 3', md: '1 / 2' }, p: 0, border: `1px solid ${up ? 'rgba(0,255,136,0.25)' : 'rgba(255,51,102,0.25)'}` }}>
          <CardContent sx={{ p: '14px 16px !important' }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(0,212,255,0.5)', fontFamily: '"JetBrains Mono", monospace', mb: 0.5 }}>
              LAST PRICE
            </Typography>
            <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color: '#e0e6f0', fontFamily: '"JetBrains Mono", monospace', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {quote?.price != null ? `$${quote.price.toFixed(2)}` : '—'}
            </Typography>
            {cp != null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                {up ? <TrendingUpIcon sx={{ fontSize: 14, color: '#00ff88' }} /> : <TrendingDownIcon sx={{ fontSize: 14, color: '#ff3366' }} />}
                <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', fontWeight: 700, color: up ? '#00ff88' : '#ff3366' }}>
                  {up ? '+' : ''}{cp.toFixed(2)}%
                </Typography>
                {quote?.change != null && (
                  <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: 'rgba(224,230,240,0.4)' }}>
                    ({up ? '+' : ''}${quote.change.toFixed(2)})
                  </Typography>
                )}
              </Box>
            )}
            {quote?.latestDay && (
              <Typography sx={{ fontSize: '0.6rem', color: 'rgba(224,230,240,0.25)', fontFamily: '"JetBrains Mono", monospace', mt: 0.5 }}>
                {quote.latestDay}
              </Typography>
            )}
          </CardContent>
        </Card>
        <StatCard label="OPEN" value={quote?.open != null ? `$${quote.open.toFixed(2)}` : '—'} />
        <StatCard label="HIGH" value={quote?.high != null ? `$${quote.high.toFixed(2)}` : '—'} accent="#00ff88" />
        <StatCard label="LOW" value={quote?.low != null ? `$${quote.low.toFixed(2)}` : '—'} accent="#ff3366" />
        <StatCard label="VOLUME" value={quote?.volume != null ? Number(quote.volume).toLocaleString('en-US', { notation: 'compact' }) : '—'} accent="rgba(224,230,240,0.6)" />
        <StatCard
          label="MKT CAP"
          value={overview?.MarketCapitalization ? formatMarketCap(overview.MarketCapitalization) : '—'}
          sub={overview?.Exchange}
        />
      </Box>

      {/* Company description */}
      {overview?.Description && overview.Description !== 'None' && (
        <Paper sx={{ p: 2 }}>
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(0,212,255,0.5)', fontFamily: '"JetBrains Mono", monospace', mb: 1 }}>
            ▸ COMPANY OVERVIEW
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'rgba(224,230,240,0.7)', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.7 }}>
            {overview.Description}
          </Typography>
        </Paper>
      )}

      {/* Main content */}
      <Box>
      {/* Tabs */}
      <Paper sx={{ overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            borderBottom: '1px solid rgba(0,212,255,0.1)',
            px: 2,
            bgcolor: 'rgba(0,0,0,0.2)',
            minHeight: 40,
            '& .MuiTab-root': { minHeight: 40 },
          }}
        >
          <Tab label="Chart" value="chart" icon={<TrendingUpIcon sx={{ fontSize: 14 }} />} iconPosition="start" />
          <Tab label="Fundamentals" value="fundamentals" icon={<InfoIcon sx={{ fontSize: 14 }} />} iconPosition="start" />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                News
                {news.length > 0 && (
                  <Chip label={news.length} size="small" sx={{ height: 16, fontSize: '0.55rem', bgcolor: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.2)', '& .MuiChip-label': { px: 0.5 } }} />
                )}
              </Box>
            }
            value="news"
            icon={<ArticleIcon sx={{ fontSize: 14 }} />}
            iconPosition="start"
          />
          <Tab label="Notes" value="notes" icon={<EditIcon sx={{ fontSize: 14 }} />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {/* CHART TAB */}
          {activeTab === 'chart' && (
            <PortfolioLineChart
              data={chartData}
              height={340}
              title={`${decodedSymbol} Price History`}
              period={period}
              onPeriodChange={setPeriod}
            />
          )}

          {/* FUNDAMENTALS TAB */}
          {activeTab === 'fundamentals' && (
            overview ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                {[
                  {
                    title: 'Valuation',
                    rows: [
                      { label: 'Market Cap', value: overview.MarketCapitalization ? formatMarketCap(overview.MarketCapitalization) : null, highlight: true },
                      { label: 'P/E Ratio', value: overview.PERatio },
                      { label: 'EPS (TTM)', value: overview.EPS ? `$${overview.EPS}` : null },
                      { label: 'Beta', value: overview.Beta },
                      { label: 'EV/EBITDA', value: overview.EVToEBITDA },
                      { label: 'Rev/Share TTM', value: overview.RevenuePerShareTTM ? `$${overview.RevenuePerShareTTM}` : null },
                    ],
                  },
                  {
                    title: 'Price Targets',
                    rows: [
                      { label: '52W High', value: overview['52WeekHigh'] ? `$${parseFloat(overview['52WeekHigh']).toFixed(2)}` : null, highlight: true },
                      { label: '52W Low', value: overview['52WeekLow'] ? `$${parseFloat(overview['52WeekLow']).toFixed(2)}` : null },
                      { label: 'Analyst Target', value: overview.AnalystTargetPrice ? `$${parseFloat(overview.AnalystTargetPrice).toFixed(2)}` : null },
                      { label: 'Dividend Yield', value: overview.DividendYield && overview.DividendYield !== 'None' ? `${parseFloat(overview.DividendYield).toFixed(2)}%` : null },
                      { label: 'Profit Margin', value: overview.ProfitMargin && overview.ProfitMargin !== 'None' ? `${(parseFloat(overview.ProfitMargin) * 100).toFixed(2)}%` : null },
                    ],
                  },
                  {
                    title: 'Company Info',
                    rows: [
                      { label: 'Exchange', value: overview.Exchange, highlight: true },
                      { label: 'Sector', value: overview.Sector },
                      { label: 'Industry', value: overview.Industry },
                      { label: 'Country', value: overview.Country },
                      { label: 'Currency', value: overview.Currency },
                    ],
                  },
                ].map((section) => (
                  <Box key={section.title}>
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(0,212,255,0.5)', fontFamily: '"JetBrains Mono", monospace', mb: 1, textTransform: 'uppercase' }}>
                      ▸ {section.title}
                    </Typography>
                    <Table size="small" sx={{ '& .MuiTableCell-root': { px: 1, py: 0.75 } }}>
                      <TableBody>
                        {section.rows.map((row) => (
                          <FundamentalRow key={row.label} label={row.label} value={row.value} highlight={row.highlight} />
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography sx={{ color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}>
                  No fundamental data available for {decodedSymbol}
                </Typography>
              </Box>
            )
          )}

          {/* NEWS TAB */}
          {activeTab === 'news' && (
            news.length > 0 ? (
              <Stack spacing={0}>
                {news.map((article, i) => {
                  const publishedAt = article.time_published
                    ? new Date(
                        article.time_published.replace(
                          /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/,
                          '$1-$2-$3T$4:$5:$6'
                        )
                      ).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : ''

                  return (
                    <Box key={i} sx={{ py: 1.5, px: 1, borderBottom: '1px solid rgba(0,212,255,0.06)', '&:last-child': { borderBottom: 'none' } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 0.75 }}>
                        <Link
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: '#e0e6f0', fontFamily: '"JetBrains Mono", monospace', textDecoration: 'none', lineHeight: 1.5, '&:hover': { color: '#00d4ff' } }}
                        >
                          {article.title}
                          <OpenInNewIcon sx={{ fontSize: 10, ml: 0.5, opacity: 0.4, verticalAlign: 'middle' }} />
                        </Link>
                        {article.overall_sentiment_label && <SentimentBadge label={article.overall_sentiment_label} />}
                      </Box>
                      {article.summary && (
                        <Typography sx={{ fontSize: '0.72rem', color: 'rgba(224,230,240,0.5)', fontFamily: '"JetBrains Mono", monospace', lineHeight: 1.6, mb: 0.5 }}>
                          {article.summary.slice(0, 200)}...
                        </Typography>
                      )}
                      <Typography sx={{ fontSize: '0.62rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
                        {article.source} · {publishedAt}
                      </Typography>
                    </Box>
                  )
                })}
              </Stack>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography sx={{ color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}>
                  No news available for {decodedSymbol}
                </Typography>
              </Box>
            )
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <Stack spacing={2}>
              {!isAuthenticated && (
                <Alert
                  severity="info"
                  action={<Button color="inherit" component={RouterLink} to="/login" size="small">Sign In</Button>}
                  sx={{ fontSize: '0.78rem' }}
                >
                  Sign in to write private notes on this entity.
                </Alert>
              )}

              {isAuthenticated && (
                <>
                  {notesError && <Alert severity="error" sx={{ fontSize: '0.78rem' }}>{notesError}</Alert>}
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(0,212,255,0.5)', fontFamily: '"JetBrains Mono", monospace', mb: 1.25 }}>
                      ▸ ADD NOTE
                    </Typography>
                    <TextField
                      placeholder="Title (optional)"
                      size="small"
                      fullWidth
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      placeholder="Write your analysis or comment..."
                      multiline
                      minRows={3}
                      fullWidth
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                    />
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAddNote}
                      disabled={!newNoteContent.trim()}
                      size="small"
                      sx={{ mt: 1.5, fontSize: '0.75rem' }}
                    >
                      Save Note
                    </Button>
                  </Paper>

                  {notes.length === 0 ? (
                    <Typography sx={{ color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem', py: 2 }}>
                      No notes yet for {decodedSymbol}.
                    </Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {notes.map((note) => (
                        <Paper
                          key={note.id}
                          variant="outlined"
                          sx={{ p: 2, '&:hover': { borderColor: 'rgba(0,212,255,0.25)' } }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 0.75 }}>
                            <Box>
                              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: '0.82rem', color: '#e0e6f0' }}>
                                {note.titre}
                              </Typography>
                              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.62rem', color: 'rgba(224,230,240,0.3)', mt: 0.25 }}>
                                {new Date(note.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={0.5}>
                              {editingNoteId === note.id ? (
                                <>
                                  <Button size="small" onClick={handleSaveEdit} sx={{ fontSize: '0.7rem' }}>Save</Button>
                                  <Button size="small" color="inherit" onClick={() => setEditingNoteId(null)} sx={{ fontSize: '0.7rem', color: 'rgba(224,230,240,0.4)' }}>Cancel</Button>
                                </>
                              ) : (
                                <>
                                  <IconButton size="small" onClick={() => { setEditingNoteId(note.id); setEditingContent(note.contenu) }} sx={{ color: 'rgba(0,212,255,0.4)', '&:hover': { color: '#00d4ff' } }}>
                                    <EditIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                  <IconButton size="small" onClick={() => handleDeleteNote(note.id)} sx={{ color: 'rgba(255,51,102,0.4)', '&:hover': { color: '#ff3366' } }}>
                                    <DeleteIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </>
                              )}
                            </Stack>
                          </Box>
                          {editingNoteId === note.id ? (
                            <TextField multiline fullWidth minRows={3} value={editingContent} onChange={(e) => setEditingContent(e.target.value)} sx={{ mt: 1 }} />
                          ) : (
                            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem', color: 'rgba(224,230,240,0.7)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                              {note.contenu}
                            </Typography>
                          )}
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </>
              )}
            </Stack>
          )}
        </Box>
      </Paper>
      </Box>
    </Stack>
  )
}
