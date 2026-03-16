import { Box, Typography } from '@mui/material'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export type HoldingSlice = { name: string; value: number; color?: string }

const DEFAULT_COLORS = ['#3b82f6', '#06b6d4', '#22c55e', '#eab308', '#f97316', '#ec4899']

type HoldingsPieChartProps = {
  data: HoldingSlice[]
  height?: number
  title?: string
}

export function HoldingsPieChart({
  data,
  height = 240,
  title = 'Répartition du portefeuille',
}: HoldingsPieChartProps) {
  const chartData = data.map((d, i) => ({
    ...d,
    color: d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }))

  if (chartData.length === 0) {
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
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a2332',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
              }}
              formatter={(_val, name, props) => {
                const total = chartData.reduce((s, d) => s + d.value, 0)
                const v = (props?.payload as { value?: number })?.value ?? 0
                const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0'
                return [`${pct}%`, String(name)]
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}
