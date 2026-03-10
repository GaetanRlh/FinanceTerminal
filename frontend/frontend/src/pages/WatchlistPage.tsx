import { Alert, List, ListItem, ListItemText, Paper } from '@mui/material'
import { PageHeader } from '../components/PageHeader'

const MOCK_WATCHLIST = [
  { id: 1, nom: 'Tech Global Fund', ticker: 'TGF' },
  { id: 2, nom: 'Green Energy Index', ticker: 'GEI' },
]

export function WatchlistPage() {
  return (
    <>
      <PageHeader
        title="Ma watchlist"
        subtitle="Retrouvez ici les entités que vous avez décidé de suivre."
      />
      <Alert severity="info" sx={{ mb: 2 }}>
        Cette page affiche pour l&apos;instant une watchlist fictive. La connexion à l’API sera ajoutée plus tard.
      </Alert>
      <Paper>
        <List>
          {MOCK_WATCHLIST.map((item) => (
            <ListItem key={item.id} divider>
              <ListItemText primary={item.nom} secondary={`Ticker : ${item.ticker}`} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </>
  )
}

