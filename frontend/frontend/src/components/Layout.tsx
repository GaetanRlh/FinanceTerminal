import { type ReactNode, useState, useEffect, useCallback } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Stack,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  IconButton,
  Chip,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import SearchIcon from '@mui/icons-material/Search'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import NoteIcon from '@mui/icons-material/Note'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import ExploreIcon from '@mui/icons-material/Explore'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import EventNoteIcon from '@mui/icons-material/EventNote'
import KeyboardCommandKeyIcon from '@mui/icons-material/KeyboardCommandKey'
import { useAuth } from '../contexts/useAuth'
import { useLanguage, type Locale } from '../contexts/LanguageContext'
import { CommandPalette } from './CommandPalette'
import { TickerTape } from './TickerTape'
import { getQuote } from '../services/api'
import type { TickerItem } from './TickerTape'

type LayoutProps = {
  children: ReactNode
}

const WATCHED_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'SPY']

function LiveClock() {
  const { locale, t } = useLanguage()
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const fmt = time.toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'America/New_York',
  })

  return (
    <Tooltip title={t('clockTooltip')}>
      <Typography
        sx={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.7rem',
          color: 'rgba(0,212,255,0.6)',
          letterSpacing: '0.05em',
          userSelect: 'none',
        }}
      >
        {t('clockPrefix')} {fmt}
      </Typography>
    </Tooltip>
  )
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuth()
  const { locale, setLocale, t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const results = await Promise.allSettled(
        WATCHED_SYMBOLS.map((s) => getQuote(s))
      )
      if (cancelled) return
      const items: TickerItem[] = results
        .map((r, i) => {
          if (r.status !== 'fulfilled' || r.value.price == null) {
            return { symbol: WATCHED_SYMBOLS[i], price: '---', change: '---', up: true }
          }
          const q = r.value
          const cp = q.changePercent ? parseFloat(q.changePercent) : 0
          return {
            symbol: q.symbol,
            price: `$${q.price!.toFixed(2)}`,
            change: `${cp >= 0 ? '+' : ''}${cp.toFixed(2)}%`,
            up: cp >= 0,
          }
        })
      setTickerItems(items)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setCmdOpen(true)
    }
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault()
      setCmdOpen(true)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/entities?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const handleLogout = () => {
    logout()
    setAnchorEl(null)
    navigate('/')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar
          sx={{ gap: 1.5, py: 0.75, minHeight: '52px !important' }}
        >
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              fontWeight: 800,
              textDecoration: 'none',
              color: '#00d4ff',
              letterSpacing: '0.05em',
              minWidth: 'fit-content',
              fontFamily: '"JetBrains Mono", monospace',
              textShadow: '0 0 20px rgba(0,212,255,0.5)',
              fontSize: '0.95rem',
              '&::before': { content: '"[[ "', color: 'rgba(0,212,255,0.4)' },
              '&::after': { content: '" ]]"', color: 'rgba(0,212,255,0.4)' },
            }}
          >
            FT
          </Typography>

          <Stack direction="row" spacing={0} sx={{ display: { xs: 'none', md: 'flex' } }}>
            {[
              { to: '/', label: t('navMarket'), icon: <DashboardIcon sx={{ fontSize: 14 }} /> },
              { to: '/entities', label: t('navExplorer'), icon: <ExploreIcon sx={{ fontSize: 14 }} /> },
              ...(isAuthenticated
                ? [
                    { to: '/watchlist', label: t('navWatchlist'), icon: <StarBorderIcon sx={{ fontSize: 14 }} /> },
                    { to: '/paper-trading', label: t('navPaper'), icon: <ShowChartIcon sx={{ fontSize: 14 }} /> },
                    { to: '/calendar', label: t('navCalendar'), icon: <EventNoteIcon sx={{ fontSize: 14 }} /> },
                    { to: '/notes', label: t('navNotes'), icon: <NoteIcon sx={{ fontSize: 14 }} /> },
                  ]
                : []),
            ].map((item) => (
              <Button
                key={item.to}
                color="inherit"
                component={RouterLink}
                to={item.to}
                startIcon={item.icon}
                size="small"
                sx={{
                  color: 'rgba(224,230,240,0.5)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.08em',
                  px: 1.5,
                  py: 0.75,
                  minWidth: 0,
                  borderRadius: 1,
                  fontWeight: 700,
                  '&:hover': {
                    color: '#00d4ff',
                    bgcolor: 'rgba(0,212,255,0.06)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>

          <Box sx={{ flex: 1 }} />

          <Box component="form" onSubmit={handleSearch} sx={{ maxWidth: 260, width: '100%' }}>
            <TextField
              size="small"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { 'aria-label': t('searchAria') } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'rgba(0,212,255,0.4)', fontSize: 16 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 32,
                  fontSize: '0.78rem',
                  bgcolor: 'rgba(0,0,0,0.4)',
                },
              }}
            />
          </Box>

          <Tooltip title={t('cmdPaletteTooltip')}>
            <IconButton
              size="small"
              onClick={() => setCmdOpen(true)}
              sx={{
                color: 'rgba(0,212,255,0.4)',
                border: '1px solid rgba(0,212,255,0.15)',
                borderRadius: 1,
                p: 0.5,
                '&:hover': { color: '#00d4ff', borderColor: 'rgba(0,212,255,0.4)', bgcolor: 'rgba(0,212,255,0.06)' },
              }}
            >
              <KeyboardCommandKeyIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>

          <ToggleButtonGroup
            value={locale}
            exclusive
            size="small"
            onChange={(_, value: Locale | null) => {
              if (value) setLocale(value)
            }}
            aria-label="Language"
            sx={{
              flexShrink: 0,
              '& .MuiToggleButton-root': {
                px: 0.65,
                py: 0.2,
                minWidth: 34,
                fontSize: '0.62rem',
                fontWeight: 800,
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: '0.06em',
                color: 'rgba(224,230,240,0.45)',
                borderColor: 'rgba(0,212,255,0.22) !important',
                lineHeight: 1.2,
                '&.Mui-selected': {
                  color: '#00d4ff',
                  bgcolor: 'rgba(0,212,255,0.12)',
                },
                '&.Mui-selected:hover': {
                  bgcolor: 'rgba(0,212,255,0.18)',
                },
              },
            }}
          >
            <ToggleButton value="en">EN</ToggleButton>
            <ToggleButton value="fr">FR</ToggleButton>
          </ToggleButtonGroup>

          <LiveClock />

          {isAuthenticated ? (
            <>
              <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                size="small"
                sx={{ color: 'rgba(0,212,255,0.6)', p: 0.5 }}
              >
                <AccountCircleIcon sx={{ fontSize: 22 }} />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { mt: 1, minWidth: 180 } } }}
              >
                <MenuItem component={RouterLink} to="/" onClick={() => setAnchorEl(null)}>
                  <DashboardIcon sx={{ mr: 1.5, fontSize: 16, color: 'rgba(0,212,255,0.6)' }} />
                  {t('menuDashboard')}
                </MenuItem>
                <MenuItem component={RouterLink} to="/watchlist" onClick={() => setAnchorEl(null)}>
                  <StarBorderIcon sx={{ mr: 1.5, fontSize: 16, color: 'rgba(0,212,255,0.6)' }} />
                  {t('menuWatchlist')}
                </MenuItem>
                <MenuItem component={RouterLink} to="/notes" onClick={() => setAnchorEl(null)}>
                  <NoteIcon sx={{ mr: 1.5, fontSize: 16, color: 'rgba(0,212,255,0.6)' }} />
                  {t('menuNotes')}
                </MenuItem>
                <MenuItem component={RouterLink} to="/paper-trading" onClick={() => setAnchorEl(null)}>
                  <ShowChartIcon sx={{ mr: 1.5, fontSize: 16, color: 'rgba(0,212,255,0.6)' }} />
                  {t('menuPaper')}
                </MenuItem>
                <MenuItem component={RouterLink} to="/calendar" onClick={() => setAnchorEl(null)}>
                  <EventNoteIcon sx={{ mr: 1.5, fontSize: 16, color: 'rgba(0,212,255,0.6)' }} />
                  {t('menuCalendar')}
                </MenuItem>
                <MenuItem onClick={handleLogout} sx={{ color: '#ff3366' }}>
                  <LogoutIcon sx={{ mr: 1.5, fontSize: 16 }} />
                  {t('menuSignOut')}
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Stack direction="row" spacing={0.75}>
              <Button
                color="inherit"
                component={RouterLink}
                to="/login"
                size="small"
                sx={{ color: 'rgba(224,230,240,0.6)', fontSize: '0.72rem', px: 1.5 }}
              >
                {t('authLogin')}
              </Button>
              <Button
                variant="outlined"
                component={RouterLink}
                to="/register"
                size="small"
                sx={{ fontSize: '0.72rem', px: 1.5, borderColor: 'rgba(0,212,255,0.35)' }}
              >
                {t('authRegister')}
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <TickerTape items={tickerItems.length > 0 ? tickerItems : undefined} />

      <Box component="main" sx={{ flexGrow: 1, py: 2.5, px: { xs: 1.5, md: 2.5 } }}>
        <Box sx={{ maxWidth: 1600, mx: 'auto' }}>{children}</Box>
      </Box>

      <Box
        component="footer"
        sx={{
          py: 1.5,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(0,212,255,0.08)',
          bgcolor: 'rgba(0,0,0,0.5)',
        }}
      >
        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem', color: 'rgba(0,212,255,0.3)' }}>
          {t('footerTagline')}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={t('footerLive')}
            size="small"
            sx={{
              height: 16,
              fontSize: '0.55rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              bgcolor: 'rgba(0,255,136,0.1)',
              color: '#00ff88',
              border: '1px solid rgba(0,255,136,0.3)',
              '& .MuiChip-label': { px: 0.75 },
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
            }}
          />
          <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem', color: 'rgba(224,230,240,0.2)' }}>
            {t('footerCommands')}
          </Typography>
        </Stack>
      </Box>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </Box>
  )
}
