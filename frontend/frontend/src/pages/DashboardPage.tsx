import { Grid, Card, CardContent, Typography } from '@mui/material'
import { PageHeader } from '../components/PageHeader'

export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Tableau de bord RainTrack"
        subtitle="Vue d’ensemble de vos entités financières et de votre activité récente."
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Entités suivies
              </Typography>
              <Typography color="text.secondary">
                Visualisez rapidement les entités que vous suivez dans votre watchlist.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Dernières notes
              </Typography>
              <Typography color="text.secondary">
                Retrouvez vos réflexions et notes personnelles liées au marché.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Accès rapide
              </Typography>
              <Typography color="text.secondary">
                Accédez en un clic à l’explorateur d’entités et à votre watchlist.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  )
}

