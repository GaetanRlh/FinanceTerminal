import { type ReactNode, useState } from 'react'
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
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import SearchIcon from '@mui/icons-material/Search'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import NoteIcon from '@mui/icons-material/Note'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '../contexts/AuthContext'

type LayoutProps = {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/entities?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    logout()
    handleUserMenuClose()
    navigate('/')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: 2, py: 1 }}>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              fontWeight: 700,
              textDecoration: 'none',
              color: 'primary.main',
              letterSpacing: '-0.02em',
              minWidth: 120,
            }}
          >
            RainTrack
          </Typography>

          <Stack direction="row" spacing={0.5} sx={{ flexGrow: 1 }}>
            <Button
              color="inherit"
              component={RouterLink}
              to="/"
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              Tableau de bord
            </Button>
            <Button
              color="inherit"
              component={RouterLink}
              to="/entities"
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              Explorateur
            </Button>
            {isAuthenticated && (
              <>
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/watchlist"
                  startIcon={<StarBorderIcon sx={{ fontSize: 18 }} />}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                >
                  Watchlist
                </Button>
                <Button
                  color="inherit"
                  component={RouterLink}
                  to="/notes"
                  startIcon={<NoteIcon sx={{ fontSize: 18 }} />}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                >
                  Notes
                </Button>
              </>
            )}
          </Stack>

          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{ flexGrow: 1, maxWidth: 400, mx: 2 }}
          >
            <TextField
              size="small"
              placeholder="Rechercher des entités, symboles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              slotProps={{
                htmlInput: { 'aria-label': 'Rechercher' },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.default',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                },
              }}
            />
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            {isAuthenticated ? (
              <>
                <IconButton onClick={handleUserMenuOpen} size="small" sx={{ color: 'text.secondary' }}>
                  <AccountCircleIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleUserMenuClose}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  slotProps={{
                    paper: { sx: { mt: 1.5, minWidth: 180 } },
                  }}
                >
                  <MenuItem component={RouterLink} to="/" onClick={handleUserMenuClose}>
                    <DashboardIcon sx={{ mr: 1, fontSize: 20 }} />
                    Tableau de bord
                  </MenuItem>
                  <MenuItem component={RouterLink} to="/watchlist" onClick={handleUserMenuClose}>
                    <StarBorderIcon sx={{ mr: 1, fontSize: 20 }} />
                    Watchlist
                  </MenuItem>
                  <MenuItem component={RouterLink} to="/notes" onClick={handleUserMenuClose}>
                    <NoteIcon sx={{ mr: 1, fontSize: 20 }} />
                    Notes
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                    Déconnexion
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button color="inherit" component={RouterLink} to="/login" size="small">
                  Connexion
                </Button>
                <Button
                  variant="contained"
                  component={RouterLink}
                  to="/register"
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  Inscription
                </Button>
              </>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, py: 3, px: 2 }}>
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>{children}</Box>
      </Box>

      <Box
        component="footer"
        sx={{
          py: 2,
          px: 2,
          textAlign: 'center',
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          RainTrack — Suivez vos entités financières en un coup d&apos;œil
        </Typography>
      </Box>
    </Box>
  )
}
