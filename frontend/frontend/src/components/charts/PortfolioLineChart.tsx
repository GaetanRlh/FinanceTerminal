import { Box, Typography } from '@mui/material'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type ChartPoint = { date: string; value: number }

type PortfolioLineChartProps = {
  data: ChartPoint[]
  height?: number
  title?: string
  valueFormatter?: (v: number) => string
}

export function PortfolioLineChart({
  data,
  height = 320,
  title = 'Historique de la valeur',
  valueFormatter = (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
}: PortfolioLineChartProps) {
  if (data.length === 0) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Aucune donnée disponible
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      {title && (
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
          {title}
        </Typography>
      )}
      <Box sx={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="date"
              minTickGap={40}
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`}
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a2332',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
              }}
              labelStyle={{ color: 'rgba(255,255,255,0.9)' }}
              formatter={(val) => [valueFormatter(Number(val ?? 0)), 'Valeur']}
              labelFormatter={(label) => String(label)}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#portfolioGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}
