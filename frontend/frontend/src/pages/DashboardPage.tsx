import { Box, Button, Card, CardContent, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import ExploreIcon from '@mui/icons-material/Explore'
import StarIcon from '@mui/icons-material/Star'
import NoteIcon from '@mui/icons-material/Note'
import { PageHeader } from '../components/PageHeader'

export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Tableau de bord RainTrack"
        subtitle="Vue d'ensemble de vos entités financières et de votre activité récente."
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        <Card sx={{ transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 2 } }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Explorateur
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Recherchez et explorez les entités financières.
            </Typography>
            <Button
              component={RouterLink}
              to="/entities"
              variant="outlined"
              startIcon={<ExploreIcon />}
              sx={{ textTransform: 'none' }}
            >
              Ouvrir l'explorateur
            </Button>
          </CardContent>
        </Card>
        <Card sx={{ transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 2 } }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Watchlist
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Les entités que vous suivez.
            </Typography>
            <Button
              component={RouterLink}
              to="/watchlist"
              variant="outlined"
              startIcon={<StarIcon />}
              sx={{ textTransform: 'none' }}
            >
              Voir ma watchlist
            </Button>
          </CardContent>
        </Card>
        <Card sx={{ transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 2 } }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Notes
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Vos réflexions et analyses.
            </Typography>
            <Button
              component={RouterLink}
              to="/notes"
              variant="outlined"
              startIcon={<NoteIcon />}
              sx={{ textTransform: 'none' }}
            >
              Voir mes notes
            </Button>
          </CardContent>
        </Card>
      </Box>
    </>
  )
}
