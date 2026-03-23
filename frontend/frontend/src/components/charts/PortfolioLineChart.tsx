import { Box, Typography, Stack, Chip } from '@mui/material'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts'

export type ChartPoint = { date: string; value: number; open?: number; high?: number; low?: number; volume?: number }

type PortfolioLineChartProps = {
  data: ChartPoint[]
  height?: number
  title?: string
  valueFormatter?: (v: number) => string
  period?: string
  onPeriodChange?: (p: string) => void
  periodOptions?: string[]
}

const DEFAULT_PERIOD_OPTIONS = ['1M', '3M', '6M', '1Y', 'ALL']

function CustomTooltip({ active, payload, label, valueFormatter }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  valueFormatter: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <Box
      sx={{
        bgcolor: '#0a1428',
        border: '1px solid rgba(0,212,255,0.25)',
        borderRadius: 1,
        p: 1.25,
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      }}
    >
      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(0,212,255,0.6)', fontFamily: '"JetBrains Mono", monospace', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#e0e6f0', fontFamily: '"JetBrains Mono", monospace' }}>
        {valueFormatter(payload[0].value)}
      </Typography>
    </Box>
  )
}

export function PortfolioLineChart({
  data,
  height = 320,
  title = 'Price History',
  valueFormatter = (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  period = '1M',
  onPeriodChange,
  periodOptions = DEFAULT_PERIOD_OPTIONS,
}: PortfolioLineChartProps) {
  if (data.length === 0) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: '0.75rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
          No chart data available
        </Typography>
      </Box>
    )
  }

  const firstVal = data[0]?.value ?? 0
  const lastVal = data[data.length - 1]?.value ?? 0
  const change = lastVal - firstVal
  const changePct = firstVal !== 0 ? (change / firstVal) * 100 : 0
  const up = change >= 0
  const strokeColor = up ? '#00ff88' : '#ff3366'
  const gradId = up ? 'lineGradUp' : 'lineGradDown'

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box>
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(0,212,255,0.5)', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase' }}>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
            <Typography sx={{ fontSize: '0.7rem', fontFamily: '"JetBrains Mono", monospace', color: up ? '#00ff88' : '#ff3366', fontWeight: 700 }}>
              {up ? '▲' : '▼'} {up ? '+' : ''}{changePct.toFixed(2)}%
            </Typography>
            <Typography sx={{ fontSize: '0.65rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
              {up ? '+' : ''}{valueFormatter(change)}
            </Typography>
          </Box>
        </Box>
        {onPeriodChange && (
          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
            {periodOptions.map((p) => (
              <Chip
                key={p}
                label={p}
                size="small"
                onClick={() => onPeriodChange(p)}
                sx={{
                  height: 20,
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: '"JetBrains Mono", monospace',
                  bgcolor: period === p ? 'rgba(0,212,255,0.15)' : 'transparent',
                  color: period === p ? '#00d4ff' : 'rgba(224,230,240,0.3)',
                  border: period === p ? '1px solid rgba(0,212,255,0.4)' : '1px solid rgba(224,230,240,0.1)',
                  '&:hover': { bgcolor: 'rgba(0,212,255,0.08)' },
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            ))}
          </Stack>
        )}
      </Box>
      <Box sx={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="lineGradUp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00ff88" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lineGradDown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff3366" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#ff3366" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="rgba(0,212,255,0.06)" />
            <XAxis
              dataKey="date"
              minTickGap={50}
              tick={{ fill: 'rgba(224,230,240,0.3)', fontSize: 10, fontFamily: '"JetBrains Mono", monospace' }}
              axisLine={{ stroke: 'rgba(0,212,255,0.1)' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`}
              tick={{ fill: 'rgba(224,230,240,0.3)', fontSize: 10, fontFamily: '"JetBrains Mono", monospace' }}
              axisLine={false}
              tickLine={false}
              width={56}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip valueFormatter={valueFormatter} />} />
            <ReferenceLine y={firstVal} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={1.5}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 4, fill: strokeColor, stroke: '#030608', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}
