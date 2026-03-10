import { ReactNode } from 'react'
import { AppBar, Toolbar, Typography, Box, Container, Button, Stack } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

type LayoutProps = {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" enableColorOnDark>
        <Toolbar>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit', fontWeight: 700 }}
          >
            RainTrack
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button color="inherit" component={RouterLink} to="/">
              Tableau de bord
            </Button>
            <Button color="inherit" component={RouterLink} to="/entities">
              Explorateur
            </Button>
            <Button color="inherit" component={RouterLink} to="/watchlist">
              Watchlist
            </Button>
            <Button color="inherit" component={RouterLink} to="/notes">
              Notes
            </Button>
            <Button color="inherit" component={RouterLink} to="/login">
              Connexion
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">{children}</Container>
      </Box>

      <Box component="footer" sx={{ py: 2, textAlign: 'center', bgcolor: 'background.default' }}>
        <Typography variant="body2" color="text.secondary">
          RainTrack — Suivez vos entités financières en un coup d&apos;œil
        </Typography>
      </Box>
    </Box>
  )
}

