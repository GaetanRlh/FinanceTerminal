import {
  Box,
  Dialog,
  InputBase,
  List,
  ListItemButton,
  Typography,
  Divider,
} from '@mui/material'
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import SearchIcon from '@mui/icons-material/Search'
import DashboardIcon from '@mui/icons-material/Dashboard'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import NoteIcon from '@mui/icons-material/Note'
import ExploreIcon from '@mui/icons-material/Explore'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn'

type Action = {
  id: string
  label: string
  description?: string
  shortcut?: string
  icon: React.ReactNode
  action: () => void
  category: string
}

type CommandPaletteProps = {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const navigate = useNavigate()

  const go = useCallback(
    (path: string) => {
      navigate(path)
      onClose()
    },
    [navigate, onClose]
  )

  const baseActions: Action[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Market overview',
      icon: <DashboardIcon sx={{ fontSize: 16 }} />,
      shortcut: 'G D',
      action: () => go('/'),
      category: 'Navigate',
    },
    {
      id: 'explorer',
      label: 'Explorer',
      description: 'Search financial entities',
      icon: <ExploreIcon sx={{ fontSize: 16 }} />,
      shortcut: 'G E',
      action: () => go('/entities'),
      category: 'Navigate',
    },
    {
      id: 'watchlist',
      label: 'Watchlist',
      description: 'My followed assets',
      icon: <StarBorderIcon sx={{ fontSize: 16 }} />,
      shortcut: 'G W',
      action: () => go('/watchlist'),
      category: 'Navigate',
    },
    {
      id: 'notes',
      label: 'Notes',
      description: 'My analysis notes',
      icon: <NoteIcon sx={{ fontSize: 16 }} />,
      shortcut: 'G N',
      action: () => go('/notes'),
      category: 'Navigate',
    },
      ]

  const searchAction: Action | null =
    query.trim().length >= 1
      ? {
          id: 'search',
          label: `Search "${query.trim()}"`,
          description: 'Search entities via Alpha Vantage',
          icon: <SearchIcon sx={{ fontSize: 16 }} />,
          action: () => go(`/entities?q=${encodeURIComponent(query.trim())}`),
          category: 'Search',
        }
      : null

  const symbolAction: Action | null =
    /^[A-Z]{1,5}$/i.test(query.trim())
      ? {
          id: 'goto-symbol',
          label: `Go to ${query.trim().toUpperCase()}`,
          description: 'Open entity detail page',
          icon: <TrendingUpIcon sx={{ fontSize: 16 }} />,
          action: () => go(`/entities/${encodeURIComponent(query.trim().toUpperCase())}`),
          category: 'Quick Jump',
        }
      : null

  const filtered = [
    ...(searchAction ? [searchAction] : []),
    ...(symbolAction ? [symbolAction] : []),
    ...baseActions.filter(
      (a) =>
        !query.trim() ||
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        (a.description ?? '').toLowerCase().includes(query.toLowerCase())
    ),
  ]

  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((prev) => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      filtered[selectedIdx]?.action()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const categories = [...new Set(filtered.map((a) => a.category))]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: '#070d1a',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          boxShadow: '0 0 60px rgba(0, 212, 255, 0.12), 0 20px 60px rgba(0,0,0,0.9)',
          maxWidth: 560,
          width: '100%',
          m: 2,
          overflow: 'hidden',
        },
      }}
      slotProps={{ backdrop: { sx: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.7)' } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid rgba(0,212,255,0.12)' }}>
        <SearchIcon sx={{ color: 'rgba(0,212,255,0.6)', mr: 1.5, fontSize: 18 }} />
        <InputBase
          autoFocus
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search, navigate, or type a symbol..."
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.9rem',
            color: '#e0e6f0',
            '& input::placeholder': { color: 'rgba(224,230,240,0.3)' },
          }}
        />
        <Typography
          sx={{
            fontSize: '0.65rem',
            color: 'rgba(0,212,255,0.4)',
            bgcolor: 'rgba(0,212,255,0.06)',
            border: '1px solid rgba(0,212,255,0.15)',
            px: 0.75,
            py: 0.25,
            borderRadius: 1,
            fontFamily: '"JetBrains Mono", monospace',
            ml: 1,
          }}
        >
          ESC
        </Typography>
      </Box>

      <List dense sx={{ py: 0.5, maxHeight: 400, overflow: 'auto' }}>
        {filtered.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography sx={{ color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>
              No actions found
            </Typography>
          </Box>
        )}
        {categories.map((cat, ci) => {
          const items = filtered.filter((a) => a.category === cat)
          return (
            <Box key={cat}>
              {ci > 0 && <Divider sx={{ my: 0.5, borderColor: 'rgba(0,212,255,0.08)' }} />}
              <Typography
                sx={{
                  px: 2,
                  py: 0.5,
                  fontSize: '0.6rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(0,212,255,0.4)',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 700,
                }}
              >
                {cat}
              </Typography>
              {items.map((action) => {
                const globalIdx = filtered.indexOf(action)
                return (
                  <ListItemButton
                    key={action.id}
                    selected={selectedIdx === globalIdx}
                    onClick={action.action}
                    sx={{
                      px: 2,
                      py: 0.75,
                      borderRadius: 0,
                      '&.Mui-selected': {
                        bgcolor: 'rgba(0,212,255,0.08)',
                        borderLeft: '2px solid #00d4ff',
                        pl: '14px',
                      },
                      '&:hover': { bgcolor: 'rgba(0,212,255,0.05)' },
                    }}
                  >
                    <Box sx={{ color: 'rgba(0,212,255,0.6)', mr: 1.5, display: 'flex', alignItems: 'center' }}>
                      {action.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: '0.82rem',
                          fontFamily: '"JetBrains Mono", monospace',
                          color: '#e0e6f0',
                          fontWeight: 500,
                        }}
                      >
                        {action.label}
                      </Typography>
                      {action.description && (
                        <Typography
                          sx={{
                            fontSize: '0.68rem',
                            color: 'rgba(224,230,240,0.4)',
                            fontFamily: '"JetBrains Mono", monospace',
                          }}
                        >
                          {action.description}
                        </Typography>
                      )}
                    </Box>
                    {action.shortcut ? (
                      <Typography
                        sx={{
                          fontSize: '0.62rem',
                          color: 'rgba(0,212,255,0.4)',
                          fontFamily: '"JetBrains Mono", monospace',
                          bgcolor: 'rgba(0,212,255,0.06)',
                          border: '1px solid rgba(0,212,255,0.12)',
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 1,
                        }}
                      >
                        {action.shortcut}
                      </Typography>
                    ) : selectedIdx === globalIdx ? (
                      <KeyboardReturnIcon sx={{ fontSize: 14, color: 'rgba(0,212,255,0.4)' }} />
                    ) : null}
                  </ListItemButton>
                )
              })}
            </Box>
          )
        })}
      </List>

      <Box
        sx={{
          px: 2,
          py: 1,
          borderTop: '1px solid rgba(0,212,255,0.08)',
          display: 'flex',
          gap: 2,
          bgcolor: 'rgba(0,0,0,0.3)',
        }}
      >
        {[
          { key: '↑↓', label: 'navigate' },
          { key: '↵', label: 'select' },
          { key: 'esc', label: 'close' },
        ].map((item) => (
          <Box key={item.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                color: 'rgba(0,212,255,0.5)',
                bgcolor: 'rgba(0,212,255,0.06)',
                border: '1px solid rgba(0,212,255,0.12)',
                px: 0.5,
                borderRadius: 0.5,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              {item.key}
            </Typography>
            <Typography sx={{ fontSize: '0.6rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Dialog>
  )
}
