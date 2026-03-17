import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Typography,
  Button,
  Link,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import {
  getQuote,
  getTopMovers,
  getNews,
  getMarketStatus,
  type Quote,
  type TopMover,
  type NewsArticle,
  type MarketStatusEntry,
} from '../services/api'

// ── Major indices to display ──────────────────────────────────────────
const INDICES = [
  { symbol: 'SPY', label: 'S&P 500', description: 'SPDR S&P 500 ETF' },
  { symbol: 'QQQ', label: 'NASDAQ 100', description: 'Invesco QQQ Trust' },
  { symbol: 'DIA', label: 'DOW JONES', description: 'SPDR Dow Jones ETF' },
  { symbol: 'IWM', label: 'RUSSELL 2K', description: 'iShares Russell 2000' },
  { symbol: 'VIX', label: 'VIX', description: 'Volatility Index' },
  { symbol: 'GLD', label: 'GOLD', description: 'SPDR Gold Shares' },
]

function pct(s?: string) {
  return s ? parseFloat(s) : null
}

function PriceChange({ value, size = 'body2' }: { value: number | null; size?: string }) {
  if (value == null) return <Typography variant={size as never} sx={{ color: 'rgba(224,230,240,0.3)' }}>—</Typography>
  const up = value >= 0
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
      {up ? (
        <TrendingUpIcon sx={{ fontSize: 13, color: '#00ff88' }} />
      ) : (
        <TrendingDownIcon sx={{ fontSize: 13, color: '#ff3366' }} />
      )}
      <Typography
        variant={size as never}
        sx={{ color: up ? '#00ff88' : '#ff3366', fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}
      >
        {up ? '+' : ''}{value.toFixed(2)}%
      </Typography>
    </Box>
  )
}

function IndexCard({ symbol, label, description }: { symbol: string; label: string; description: string }) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getQuote(symbol)
      .then((q) => { if (!cancelled) { setQuote(q); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [symbol])

  const cp = pct(quote?.changePercent)
  const up = cp != null ? cp >= 0 : true

  return (
    <Card
      component={RouterLink}
      to={`/entities/${symbol}`}
      sx={{
        textDecoration: 'none',
        p: 0,
        cursor: 'pointer',
        '&:hover': { borderColor: 'rgba(0,212,255,0.4)', '& .index-label': { color: '#00d4ff' } },
      }}
    >
      <CardContent sx={{ p: '12px 14px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography
            className="index-label"
            sx={{
              fontSize: '0.62rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              color: 'rgba(0,212,255,0.7)',
              fontFamily: '"JetBrains Mono", monospace',
              transition: 'color 0.2s',
            }}
          >
            {label}
          </Typography>
          {loading ? (
            <CircularProgress size={10} sx={{ color: 'rgba(0,212,255,0.4)' }} />
          ) : (
            <PriceChange value={cp} size="caption" />
          )}
        </Box>
        {loading ? (
          <Box sx={{ mt: 0.5, height: 28, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: 80, height: 14, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 0.5 }} />
          </Box>
        ) : (
          <Typography
            sx={{
              mt: 0.25,
              fontSize: '1.15rem',
              fontWeight: 700,
              color: quote?.price != null ? (up ? '#e0e6f0' : '#e0e6f0') : 'rgba(224,230,240,0.3)',
              fontFamily: '"JetBrains Mono", monospace',
              letterSpacing: '-0.02em',
            }}
          >
            {quote?.price != null ? `$${quote.price.toFixed(2)}` : '—'}
          </Typography>
        )}
        <Typography sx={{ fontSize: '0.62rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace', mt: 0.25 }}>
          {description}
        </Typography>
      </CardContent>
    </Card>
  )
}

function MoverRow({ mover, type }: { mover: TopMover; type: 'gainer' | 'loser' }) {
  const up = type === 'gainer'
  const cp = parseFloat(mover.change_percentage?.replace('%', '') ?? '0')

  return (
    <Box
      component={RouterLink}
      to={`/entities/${mover.ticker}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 0.75,
        px: 1.5,
        borderBottom: '1px solid rgba(0,212,255,0.05)',
        textDecoration: 'none',
        '&:last-child': { borderBottom: 'none' },
        '&:hover': { bgcolor: 'rgba(0,212,255,0.04)' },
      }}
    >
      <Box>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#e0e6f0', fontFamily: '"JetBrains Mono", monospace' }}>
          {mover.ticker}
        </Typography>
        <Typography sx={{ fontSize: '0.65rem', color: 'rgba(224,230,240,0.4)', fontFamily: '"JetBrains Mono", monospace' }}>
          Vol: {Number(mover.volume).toLocaleString('en-US', { notation: 'compact' })}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#e0e6f0', fontFamily: '"JetBrains Mono", monospace' }}>
          ${parseFloat(mover.price).toFixed(2)}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, justifyContent: 'flex-end' }}>
          {up ? (
            <TrendingUpIcon sx={{ fontSize: 11, color: '#00ff88' }} />
          ) : (
            <TrendingDownIcon sx={{ fontSize: 11, color: '#ff3366' }} />
          )}
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: up ? '#00ff88' : '#ff3366', fontFamily: '"JetBrains Mono", monospace' }}>
            {up ? '+' : ''}{cp.toFixed(2)}%
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

function SentimentBadge({ label }: { label: string }) {
  const color =
    label?.toLowerCase().includes('bullish')
      ? '#00ff88'
      : label?.toLowerCase().includes('bearish')
      ? '#ff3366'
      : '#f59e0b'
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        height: 16,
        fontSize: '0.55rem',
        fontWeight: 700,
        bgcolor: `${color}15`,
        color,
        border: `1px solid ${color}40`,
        '& .MuiChip-label': { px: 0.75 },
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    />
  )
}

function NewsItem({ article }: { article: NewsArticle }) {
  const publishedAt = article.time_published
    ? new Date(
        article.time_published.replace(
          /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/,
          '$1-$2-$3T$4:$5:$6'
        )
      ).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <Box
      sx={{
        py: 1.25,
        px: 1.5,
        borderBottom: '1px solid rgba(0,212,255,0.05)',
        '&:last-child': { borderBottom: 'none' },
        '&:hover': { bgcolor: 'rgba(0,212,255,0.03)' },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
        <Link
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#e0e6f0',
            fontFamily: '"JetBrains Mono", monospace',
            textDecoration: 'none',
            lineHeight: 1.4,
            flex: 1,
            '&:hover': { color: '#00d4ff', textDecoration: 'none' },
          }}
        >
          {article.title}
          <OpenInNewIcon sx={{ fontSize: 10, ml: 0.5, opacity: 0.4, verticalAlign: 'middle' }} />
        </Link>
        {article.overall_sentiment_label && (
          <SentimentBadge label={article.overall_sentiment_label} />
        )}
      </Box>
      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
        {article.source} · {publishedAt}
      </Typography>
    </Box>
  )
}

function MarketStatusBar({ markets }: { markets: MarketStatusEntry[] }) {
  const usMarket = markets.find((m) => m.region === 'United States' && m.market_type === 'Equity')
  if (!usMarket) return null

  const isOpen = usMarket.current_status?.toLowerCase() === 'open'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <FiberManualRecordIcon
        sx={{
          fontSize: 8,
          color: isOpen ? '#00ff88' : '#ff3366',
          animation: isOpen ? 'pulse 2s infinite' : 'none',
          '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
        }}
      />
      <Typography sx={{ fontSize: '0.7rem', fontFamily: '"JetBrains Mono", monospace', color: isOpen ? '#00ff88' : '#ff3366', fontWeight: 700 }}>
        US EQUITY {isOpen ? 'OPEN' : 'CLOSED'}
      </Typography>
      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
        {usMarket.local_open}–{usMarket.local_close} EST
      </Typography>
    </Box>
  )
}

export function DashboardPage() {
  const [topMovers, setTopMovers] = useState<{ top_gainers: TopMover[]; top_losers: TopMover[]; most_actively_traded: TopMover[] } | null>(null)
  const [news, setNews] = useState<NewsArticle[]>([])
  const [markets, setMarkets] = useState<MarketStatusEntry[]>([])
  const [loadingMovers, setLoadingMovers] = useState(true)
  const [loadingNews, setLoadingNews] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getTopMovers(), getNews('', 12), getMarketStatus()]).then(([movers, articles, mktStatus]) => {
      if (cancelled) return
      setTopMovers(movers)
      setNews(articles)
      setMarkets(mktStatus)
      setLoadingMovers(false)
      setLoadingNews(false)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <PageHeader
        title="Market Overview"
        subtitle="Real-time market data powered by Yahoo Finance"
        badge={markets.length > 0 ? <MarketStatusBar markets={markets} /> : null}
      />

      {/* Major Indices */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: '0.65rem',
            letterSpacing: '0.12em',
            color: 'rgba(0,212,255,0.5)',
            fontWeight: 800,
            fontFamily: '"JetBrains Mono", monospace',
            mb: 1.25,
            textTransform: 'uppercase',
          }}
        >
          ▸ Major Indices
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1.5 }}>
          {INDICES.map((idx) => (
            <IndexCard key={idx.symbol} {...idx} />
          ))}
        </Box>
      </Box>

      {/* Main content area */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr 1.8fr' }, gap: 2.5 }}>
        {/* Top Gainers */}
        <Paper sx={{ overflow: 'hidden' }}>
          <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon sx={{ fontSize: 14, color: '#00ff88' }} />
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', color: '#00ff88', fontFamily: '"JetBrains Mono", monospace' }}>
              TOP GAINERS
            </Typography>
          </Box>
          {loadingMovers ? (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={20} sx={{ color: 'rgba(0,212,255,0.4)' }} />
            </Box>
          ) : topMovers?.top_gainers?.length ? (
            topMovers.top_gainers.slice(0, 8).map((m, i) => (
              <MoverRow key={`${m.ticker}-${i}`} mover={m} type="gainer" />
            ))
          ) : (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
                No data available
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Top Losers */}
        <Paper sx={{ overflow: 'hidden' }}>
          <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingDownIcon sx={{ fontSize: 14, color: '#ff3366' }} />
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', color: '#ff3366', fontFamily: '"JetBrains Mono", monospace' }}>
              TOP LOSERS
            </Typography>
          </Box>
          {loadingMovers ? (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={20} sx={{ color: 'rgba(0,212,255,0.4)' }} />
            </Box>
          ) : topMovers?.top_losers?.length ? (
            topMovers.top_losers.slice(0, 8).map((m, i) => (
              <MoverRow key={`${m.ticker}-${i}`} mover={m} type="loser" />
            ))
          ) : (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
                No data available
              </Typography>
            </Box>
          )}
        </Paper>

        {/* News feed */}
        <Paper sx={{ overflow: 'hidden' }}>
          <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(0,212,255,0.7)', fontFamily: '"JetBrains Mono", monospace' }}>
              ▸ MARKET NEWS
            </Typography>
            <Typography sx={{ fontSize: '0.6rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
              SENTIMENT ANALYSIS
            </Typography>
          </Box>
          {loadingNews ? (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={20} sx={{ color: 'rgba(0,212,255,0.4)' }} />
            </Box>
          ) : news.length > 0 ? (
            <Box sx={{ maxHeight: 520, overflow: 'auto' }}>
              {news.map((article, i) => (
                <NewsItem key={i} article={article} />
              ))}
            </Box>
          ) : (
            <Box sx={{ py: 6, textAlign: 'center', px: 2 }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace', mb: 2 }}>
                Market news unavailable
              </Typography>
              <Button
                variant="outlined"
                size="small"
                component={RouterLink}
                to="/entities"
                sx={{ fontSize: '0.7rem' }}
              >
                Browse Entities
              </Button>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Quick access */}
      <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
        {[
          {
            to: '/entities',
            label: 'EXPLORER',
            desc: 'Search & browse financial entities',
            accent: '#00d4ff',
            cmd: '/entities',
          },
          {
            to: '/watchlist',
            label: 'WATCHLIST',
            desc: 'Track your followed assets',
            accent: '#f59e0b',
            cmd: '/watchlist',
          },
          {
            to: '/notes',
            label: 'NOTES',
            desc: 'Your analysis & research notes',
            accent: '#00ff88',
            cmd: '/notes',
          },
        ].map((item) => (
          <Card
            key={item.to}
            component={RouterLink}
            to={item.to}
            sx={{ textDecoration: 'none', p: 0, cursor: 'pointer' }}
          >
            <CardContent sx={{ p: '16px !important' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    color: item.accent,
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {item.label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.6rem',
                    color: `${item.accent}50`,
                    fontFamily: '"JetBrains Mono", monospace',
                    bgcolor: `${item.accent}10`,
                    border: `1px solid ${item.accent}25`,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 0.5,
                  }}
                >
                  {item.cmd}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.75rem', color: 'rgba(224,230,240,0.5)', fontFamily: '"JetBrains Mono", monospace' }}>
                {item.desc}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </>
  )
}
