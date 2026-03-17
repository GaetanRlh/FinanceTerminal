import { Box, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'

type TickerItem = {
  symbol: string
  price: string
  change: string
  up: boolean
}

// Static seed data displayed while real data loads
const SEED_TICKERS: TickerItem[] = [
  { symbol: 'AAPL', price: '−−−', change: '−−−', up: true },
  { symbol: 'MSFT', price: '−−−', change: '−−−', up: true },
  { symbol: 'GOOGL', price: '−−−', change: '−−−', up: false },
  { symbol: 'AMZN', price: '−−−', change: '−−−', up: true },
  { symbol: 'NVDA', price: '−−−', change: '−−−', up: true },
  { symbol: 'META', price: '−−−', change: '−−−', up: false },
  { symbol: 'TSLA', price: '−−−', change: '−−−', up: true },
  { symbol: 'BTC', price: '−−−', change: '−−−', up: true },
]

function TickerChip({ item }: { item: TickerItem }) {
  const color = item.up ? '#00ff88' : '#ff3366'
  const Icon = item.up ? TrendingUpIcon : TrendingDownIcon

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.5,
        py: 0.25,
        borderRight: '1px solid rgba(0, 212, 255, 0.1)',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      <Typography sx={{ fontFamily: 'inherit', fontSize: '0.7rem', color: 'rgba(0,212,255,0.8)', fontWeight: 700 }}>
        {item.symbol}
      </Typography>
      <Typography sx={{ fontFamily: 'inherit', fontSize: '0.7rem', color: '#e0e6f0', fontWeight: 500 }}>
        {item.price}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        <Icon sx={{ fontSize: 11, color }} />
        <Typography sx={{ fontFamily: 'inherit', fontSize: '0.7rem', color, fontWeight: 600 }}>
          {item.change}
        </Typography>
      </Box>
    </Box>
  )
}

export function TickerTape({ items = SEED_TICKERS }: { items?: TickerItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  // Double the items for seamless loop
  const doubled = [...items, ...items]

  useEffect(() => {
    const el = trackRef.current
    if (!el) return

    let pos = 0
    let animId: number
    const speed = 0.4

    const step = () => {
      if (!paused) {
        pos -= speed
        const half = el.scrollWidth / 2
        if (Math.abs(pos) >= half) pos = 0
        el.style.transform = `translateX(${pos}px)`
      }
      animId = requestAnimationFrame(step)
    }
    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [paused, items])

  return (
    <Box
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      sx={{
        height: 28,
        overflow: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        '&::before, &::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 60,
          zIndex: 2,
          pointerEvents: 'none',
        },
        '&::before': {
          left: 0,
          background: 'linear-gradient(to right, #030608, transparent)',
        },
        '&::after': {
          right: 0,
          background: 'linear-gradient(to left, #030608, transparent)',
        },
      }}
    >
      <Box
        ref={trackRef}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          fontFamily: '"JetBrains Mono", monospace',
          willChange: 'transform',
        }}
      >
        {doubled.map((item, i) => (
          <TickerChip key={`${item.symbol}-${i}`} item={item} />
        ))}
      </Box>
    </Box>
  )
}

export type { TickerItem }
