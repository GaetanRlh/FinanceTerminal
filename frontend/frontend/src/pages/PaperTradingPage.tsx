import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { PageHeader } from '../components/PageHeader'
import {
  cancelPaperOrder,
  evaluatePaperOrders,
  executePaperTrade,
  formatApiError,
  getPaperOrders,
  getPaperPerformance,
  getPaperPortfolio,
  type PaperOrderItem,
  type PaperPerformanceData,
  type PaperPortfolioData,
} from '../services/api'
import { PortfolioLineChart } from '../components/charts/PortfolioLineChart'

type TradeAction = 'BUY' | 'SELL'
type OrderType = 'MARKET' | 'LIMIT' | 'STOP'
type PerfPeriod = '1W' | '1M' | '3M' | '6M' | 'YTD'

export function PaperTradingPage() {
  const [portfolio, setPortfolio] = useState<PaperPortfolioData | null>(null)
  const [orders, setOrders] = useState<PaperOrderItem[]>([])
  const [performance, setPerformance] = useState<PaperPerformanceData | null>(null)
  const [perfPeriod, setPerfPeriod] = useState<PerfPeriod>('1M')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [ticker, setTicker] = useState('AAPL')
  const [action, setAction] = useState<TradeAction>('BUY')
  const [orderType, setOrderType] = useState<OrderType>('MARKET')
  const [shares, setShares] = useState('1')
  const [triggerPrice, setTriggerPrice] = useState('')

  const loadAll = useCallback(async (period: PerfPeriod = perfPeriod) => {
    setError(null)
    const [pRes, oRes, perfRes] = await Promise.allSettled([
      getPaperPortfolio(),
      getPaperOrders(),
      getPaperPerformance(period),
    ])

    if (pRes.status === 'fulfilled') {
      setPortfolio(pRes.value)
    } else {
      setPortfolio(null)
    }

    if (oRes.status === 'fulfilled') {
      setOrders(oRes.value)
    } else {
      setOrders([])
    }

    if (perfRes.status === 'fulfilled') {
      setPerformance(perfRes.value)
    } else {
      setPerformance(null)
    }

    const parts: string[] = []
    if (pRes.status === 'rejected') parts.push(`Portfolio: ${formatApiError(pRes.reason)}`)
    if (oRes.status === 'rejected') parts.push(`Orders: ${formatApiError(oRes.reason)}`)
    if (perfRes.status === 'rejected') parts.push(`Chart data: ${formatApiError(perfRes.reason)}`)
    if (parts.length) setError(parts.join(' '))

    setLoading(false)
  }, [perfPeriod])

  useEffect(() => {
    void loadAll(perfPeriod)
  }, [loadAll, perfPeriod])

  const chartData = useMemo(
    () =>
      (performance?.series ?? []).map((p) => ({
        date: new Date(p.captured_at).toLocaleDateString(),
        value: Number(p.total_equity),
      })),
    [performance]
  )

  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'PENDING'), [orders])

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const parsedShares = Number(shares)
    if (!ticker.trim() || !Number.isFinite(parsedShares) || parsedShares <= 0) {
      setError('Please enter a valid ticker and share quantity.')
      return
    }
    if (orderType !== 'MARKET') {
      const p = Number(triggerPrice)
      if (!Number.isFinite(p) || p <= 0) {
        setError('Please enter a valid trigger price for limit/stop orders.')
        return
      }
    }
    setSubmitting(true)
    try {
      await executePaperTrade({
        ticker: ticker.trim().toUpperCase(),
        action,
        shares: parsedShares,
        order_type: orderType,
        trigger_price: orderType === 'MARKET' ? undefined : Number(triggerPrice),
      })
      setSuccess(orderType === 'MARKET' ? `${action} market order executed successfully.` : `${action} ${orderType} order placed.`)
      await loadAll()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { error?: string } } })?.response?.data
      setError(data?.error ?? 'Trade execution failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEvaluateOrders = async () => {
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await evaluatePaperOrders()
      setSuccess(`Order evaluation complete. Filled: ${result.filled}, Pending: ${result.pending}.`)
      await loadAll()
    } catch {
      setError('Unable to evaluate pending orders.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelOrder = async (id: number) => {
    setSubmitting(true)
    setError(null)
    try {
      await cancelPaperOrder(id)
      setSuccess('Order cancelled.')
      await loadAll()
    } catch {
      setError('Unable to cancel order.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePeriodChange = (p: string) => {
    setPerfPeriod(p as PerfPeriod)
  }

  return (
    <>
      <PageHeader
        title="Paper Trading"
        subtitle="Simulated portfolio with virtual cash"
        breadcrumbs={[{ label: 'Market', to: '/' }, { label: 'Paper Trading' }]}
        badge={<Chip label="SIMULATION" size="small" sx={{ bgcolor: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }} />}
      />

      {loading ? (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} sx={{ color: 'rgba(0,212,255,0.5)' }} />
        </Box>
      ) : (
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
            {[
              { label: 'CASH', value: `$${portfolio?.summary.cash_balance ?? '0.00'}`, color: '#00d4ff' },
              { label: 'MARKET VALUE', value: `$${portfolio?.summary.market_value ?? '0.00'}`, color: '#e0e6f0' },
              { label: 'EQUITY', value: `$${portfolio?.summary.total_equity ?? '0.00'}`, color: '#00ff88' },
              { label: 'UNREALIZED PNL', value: `$${portfolio?.summary.unrealized_pnl ?? '0.00'}`, color: (portfolio?.summary.unrealized_pnl ?? '0').startsWith('-') ? '#ff3366' : '#00ff88' },
              { label: 'DAY PNL', value: `${(portfolio?.summary.day_pnl ?? '0').startsWith('-') ? '' : '+'}$${portfolio?.summary.day_pnl ?? '0.00'}`, color: (portfolio?.summary.day_pnl ?? '0').startsWith('-') ? '#ff3366' : '#00ff88' },
              { label: 'DAY PNL %', value: `${(portfolio?.summary.day_pnl_pct ?? '0').startsWith('-') ? '' : '+'}${portfolio?.summary.day_pnl_pct ?? '0.00'}%`, color: (portfolio?.summary.day_pnl_pct ?? '0').startsWith('-') ? '#ff3366' : '#00ff88' },
              { label: 'CASH RATIO', value: `${portfolio?.summary.cash_ratio_pct ?? '0.00'}%`, color: '#f59e0b' },
              { label: 'LARGEST POSITION', value: `${portfolio?.summary.largest_position_pct ?? '0.00'}%`, color: '#f59e0b' },
            ].map((item) => (
              <Paper key={item.label} sx={{ p: 1.5 }}>
                <Typography sx={{ fontSize: '0.62rem', color: 'rgba(0,212,255,0.5)', fontWeight: 700, letterSpacing: '0.08em', mb: 0.5 }}>
                  {item.label}
                </Typography>
                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: item.color, fontFamily: '"JetBrains Mono", monospace' }}>
                  {item.value}
                </Typography>
              </Paper>
            ))}
          </Box>

          <Paper sx={{ p: 1.5 }}>
            <PortfolioLineChart
              title="Portfolio value over time"
              data={chartData}
              period={perfPeriod}
              periodOptions={['1W', '1M', '3M', '6M', 'YTD']}
              onPeriodChange={handlePeriodChange}
              valueFormatter={(v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              height={280}
            />
          </Paper>

          <Paper component="form" onSubmit={handleTrade} sx={{ p: 2 }}>
            <Typography sx={{ fontSize: '0.68rem', color: 'rgba(0,212,255,0.55)', fontWeight: 700, letterSpacing: '0.08em', mb: 1.5 }}>
              PLACE PAPER TRADE
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr 1fr auto' }, gap: 1.2 }}>
              <TextField
                label="Ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                required
                size="small"
              />
              <TextField
                label="Action"
                select
                value={action}
                onChange={(e) => setAction(e.target.value as TradeAction)}
                size="small"
              >
                <MenuItem value="BUY">BUY</MenuItem>
                <MenuItem value="SELL">SELL</MenuItem>
              </TextField>
              <TextField
                label="Order Type"
                select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as OrderType)}
                size="small"
              >
                <MenuItem value="MARKET">MARKET</MenuItem>
                <MenuItem value="LIMIT">LIMIT</MenuItem>
                <MenuItem value="STOP">STOP</MenuItem>
              </TextField>
              <TextField
                label="Shares"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                required
                type="number"
                inputProps={{ min: 0.000001, step: 0.000001 }}
                size="small"
              />
              {orderType !== 'MARKET' && (
                <TextField
                  label="Trigger Price"
                  value={triggerPrice}
                  onChange={(e) => setTriggerPrice(e.target.value)}
                  required
                  type="number"
                  inputProps={{ min: 0.0001, step: 0.0001 }}
                  size="small"
                />
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <SwapHorizIcon />}
              >
                Execute
              </Button>
            </Box>
          </Paper>

          <Paper sx={{ overflow: 'hidden' }}>
            <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '0.68rem', color: 'rgba(0,212,255,0.55)', fontWeight: 700, letterSpacing: '0.08em' }}>
                PENDING ORDERS
              </Typography>
              <Button size="small" onClick={() => void handleEvaluateOrders()} disabled={submitting}>
                Evaluate
              </Button>
            </Box>
            {pendingOrders.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Ticker</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Shares</TableCell>
                    <TableCell align="right">Trigger</TableCell>
                    <TableCell align="right">Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell sx={{ fontSize: '0.72rem' }}>
                        {new Date(order.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{order.ticker}</TableCell>
                      <TableCell sx={{ color: order.action === 'BUY' ? '#00ff88' : '#ff3366', fontWeight: 700 }}>{order.action}</TableCell>
                      <TableCell>{order.order_type}</TableCell>
                      <TableCell align="right">{Number(order.shares).toFixed(4)}</TableCell>
                      <TableCell align="right">{order.trigger_price ? `$${Number(order.trigger_price).toFixed(2)}` : '-'}</TableCell>
                      <TableCell align="right">{order.status}</TableCell>
                      <TableCell align="right">
                        <Button size="small" color="error" onClick={() => void handleCancelOrder(order.id)} disabled={submitting}>
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography sx={{ color: 'rgba(224,230,240,0.35)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}>
                  No pending orders.
                </Typography>
              </Box>
            )}
          </Paper>

          <Paper sx={{ overflow: 'hidden' }}>
            <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
              <Typography sx={{ fontSize: '0.68rem', color: 'rgba(0,212,255,0.55)', fontWeight: 700, letterSpacing: '0.08em' }}>
                OPEN POSITIONS
              </Typography>
            </Box>
            {portfolio?.positions_live?.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ticker</TableCell>
                    <TableCell align="right">Shares</TableCell>
                    <TableCell>Sector</TableCell>
                    <TableCell align="right">Avg Cost</TableCell>
                    <TableCell align="right">Last Price</TableCell>
                    <TableCell align="right">Day PnL</TableCell>
                    <TableCell align="right">Market Value</TableCell>
                    <TableCell align="right">Unrealized PnL</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {portfolio.positions_live.map((pos) => (
                    <TableRow key={pos.ticker}>
                      <TableCell>
                        <Typography sx={{ color: '#00d4ff', fontWeight: 700, fontFamily: '"JetBrains Mono", monospace' }}>{pos.ticker}</Typography>
                      </TableCell>
                      <TableCell align="right">{Number(pos.shares).toFixed(4)}</TableCell>
                      <TableCell>{pos.sector}</TableCell>
                      <TableCell align="right">${Number(pos.avg_cost).toFixed(2)}</TableCell>
                      <TableCell align="right">${Number(pos.last_price).toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: Number(pos.day_pnl) >= 0 ? '#00ff88' : '#ff3366' }}>
                        {Number(pos.day_pnl) >= 0 ? '+' : ''}${Number(pos.day_pnl).toFixed(2)}
                      </TableCell>
                      <TableCell align="right">${Number(pos.market_value).toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: Number(pos.unrealized_pnl) >= 0 ? '#00ff88' : '#ff3366' }}>
                        {Number(pos.unrealized_pnl) >= 0 ? '+' : ''}${Number(pos.unrealized_pnl).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography sx={{ color: 'rgba(224,230,240,0.35)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}>
                  No open positions yet.
                </Typography>
              </Box>
            )}
          </Paper>

          <Paper sx={{ overflow: 'hidden' }}>
            <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon sx={{ fontSize: 14, color: 'rgba(0,212,255,0.55)' }} />
              <Typography sx={{ fontSize: '0.68rem', color: 'rgba(0,212,255,0.55)', fontWeight: 700, letterSpacing: '0.08em' }}>
                RECENT TRADES
              </Typography>
            </Box>
            {portfolio?.trades?.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Ticker</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell align="right">Shares</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {portfolio.trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell sx={{ fontSize: '0.72rem' }}>
                        {new Date(trade.executed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{trade.ticker}</TableCell>
                      <TableCell sx={{ color: trade.action === 'BUY' ? '#00ff88' : '#ff3366', fontWeight: 700 }}>{trade.action}</TableCell>
                      <TableCell align="right">{Number(trade.shares).toFixed(4)}</TableCell>
                      <TableCell align="right">${Number(trade.price).toFixed(2)}</TableCell>
                      <TableCell align="right">${Number(trade.total).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography sx={{ color: 'rgba(224,230,240,0.35)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}>
                  No trades yet.
                </Typography>
              </Box>
            )}
          </Paper>
        </Stack>
      )}
    </>
  )
}
