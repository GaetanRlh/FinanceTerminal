import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Tooltip,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { PageHeader } from '../components/PageHeader'
import { TradingViewChart } from '../components/TradingViewChart'
import { getQuote, getTimeSeries, type Quote, type TimeSeriesPoint, api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

type WatchlistItem = {
  id: number
  entity: {
    id: number
    nom: string
    ticker: string
  }
}

type NoteItem = {
  id: number
  titre: string
  contenu: string
  created_at: string
  entity: {
    id: number
  } | null
}

export function EntityDetailPage() {
  const { symbol = '' } = useParams<{ symbol: string }>()
  const decodedSymbol = decodeURIComponent(symbol)
  const { isAuthenticated } = useAuth()

  const [quote, setQuote] = useState<Quote | null>(null)
  const [series, setSeries] = useState<TimeSeriesPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [entityId, setEntityId] = useState<number | null>(null)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [watchlistItemId, setWatchlistItemId] = useState<number | null>(null)

  const [notes, setNotes] = useState<NoteItem[]>([])
  const [newNote, setNewNote] = useState('')
  const [notesError, setNotesError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [q, s] = await Promise.all([getQuote(decodedSymbol), getTimeSeries(decodedSymbol)])
        setQuote(q)
        setSeries(s)
      } catch {
        setError("Impossible de charger les données de marché pour cette entité.")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [decodedSymbol])

  useEffect(() => {
    const ensureEntityAndFetchExtras = async () => {
      if (!isAuthenticated || !quote) return

      try {
        const entitiesResponse = await api.get('/market/entities/', {
          params: { ticker: quote.symbol },
        })
        const existing = (entitiesResponse.data as any[]).find(
          (e) => e.ticker === quote.symbol,
        )

        let id = existing?.id as number | undefined
        if (!id) {
          const createdResponse = await api.post('/market/entities/', {
            nom: quote.symbol,
            secteur: '',
            ticker: quote.symbol,
            valeur_totale: 0,
          })
          id = createdResponse.data.id
        }

        setEntityId(id ?? null)

        const [watchlistResponse, notesResponse] = await Promise.all([
          api.get('/market/watchlist/'),
          api.get('/market/notes/'),
        ])

        const watchlistItems = watchlistResponse.data as WatchlistItem[]
        const foundItem = watchlistItems.find((item) => item.entity.id === id)
        if (foundItem) {
          setIsInWatchlist(true)
          setWatchlistItemId(foundItem.id)
        } else {
          setIsInWatchlist(false)
          setWatchlistItemId(null)
        }

        const allNotes = notesResponse.data as NoteItem[]
        setNotes(allNotes.filter((n) => n.entity && n.entity.id === id))
      } catch {
        // Fail silently for extras; core market data is primary
      }
    }

    ensureEntityAndFetchExtras()
  }, [isAuthenticated, quote])

  const handleToggleWatchlist = async () => {
    if (!isAuthenticated || !entityId) return

    try {
      if (isInWatchlist && watchlistItemId != null) {
        await api.delete(`/market/watchlist/${watchlistItemId}/`)
        setIsInWatchlist(false)
        setWatchlistItemId(null)
      } else {
        const response = await api.post('/market/watchlist/', {
          entity_id: entityId,
        })
        setIsInWatchlist(true)
        setWatchlistItemId(response.data.id)
      }
    } catch {
      // Swallow errors for now; could show a toast later
    }
  }

  const handleAddNote = async () => {
    if (!isAuthenticated || !entityId || !newNote.trim()) return
    setNotesError(null)
    try {
      const response = await api.post('/market/notes/', {
        entity_id: entityId,
        titre: `Note sur ${decodedSymbol}`,
        contenu: newNote.trim(),
      })
      setNotes((prev) => [response.data as NoteItem, ...prev])
      setNewNote('')
    } catch {
      setNotesError("Impossible d'enregistrer la note. Veuillez réessayer.")
    }
  }

  const title = quote?.symbol ?? decodedSymbol

  return (
    <>
      <PageHeader
        title={title}
        subtitle="Vue d’ensemble simplifiée de l’entité sélectionnée."
      />

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!isLoading && !error && (
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <Box>
                  <Typography variant="h5" component="h2">
                    {title}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    Symbole : {quote?.symbol ?? decodedSymbol}
                  </Typography>
                  {quote?.price != null && (
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      Prix actuel : {quote.price.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })}
                    </Typography>
                  )}
                  {quote?.changePercent && (
                    <Typography variant="body2" color="text.secondary">
                      Variation : {quote.changePercent}
                    </Typography>
                  )}
                </Box>
                <Box>
                  {isAuthenticated ? (
                    <Tooltip
                      title={
                        isInWatchlist
                          ? 'Retirer de ma watchlist'
                          : 'Ajouter à ma watchlist'
                      }
                    >
                      <IconButton onClick={handleToggleWatchlist} size="large" color="primary">
                        <Typography component="span" sx={{ fontSize: 24 }}>
                          {isInWatchlist ? '★' : '☆'}
                        </Typography>
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Connectez-vous pour ajouter cette entité à votre watchlist.">
                      <span>
                        <IconButton size="large" disabled>
                          <Typography component="span" sx={{ fontSize: 24 }}>
                            ☆
                          </Typography>
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Historique du prix
            </Typography>
            {series.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucune donnée de série temporelle disponible pour ce symbole.
              </Typography>
            ) : (
              <Box sx={{ height: 400 }}>
                <TradingViewChart symbol={decodedSymbol} />
              </Box>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Notes
            </Typography>
            {!isAuthenticated && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Connectez-vous pour écrire des notes sur cette entité.
              </Alert>
            )}
            {isAuthenticated && (
              <Stack spacing={2} sx={{ mb: 2 }}>
                {notesError && <Alert severity="error">{notesError}</Alert>}
                <TextField
                  label="Ajouter une note"
                  placeholder="Saisissez ici une réflexion ou un commentaire sur cette entité..."
                  multiline
                  minRows={3}
                  value={newNote}
                  onChange={(event) => setNewNote(event.target.value)}
                />
                <Box>
                  <Button variant="contained" onClick={handleAddNote} disabled={!newNote.trim()}>
                    Enregistrer la note
                  </Button>
                </Box>
              </Stack>
            )}
            <Divider sx={{ mb: 2 }} />
            {notes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucune note enregistrée pour cette entité pour le moment.
              </Typography>
            ) : (
              <List>
                {notes.map((note) => (
                  <ListItem key={note.id} alignItems="flex-start" divider>
                    <ListItemText
                      primary={note.titre}
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(note.created_at).toLocaleString('fr-FR')}
                          </Typography>
                          <Typography variant="body1">{note.contenu}</Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Stack>
      )}
    </>
  )
}

