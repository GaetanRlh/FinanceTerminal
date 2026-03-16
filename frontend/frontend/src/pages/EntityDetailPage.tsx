import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getQuote,
  getTimeSeries,
  getEntities,
  createEntity,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  type Quote,
  type TimeSeriesPoint,
  type NoteItem,
} from '../services/api'
import { PortfolioLineChart } from '../components/charts/PortfolioLineChart'
import { HoldingsPieChart } from '../components/charts/HoldingsPieChart'

type TabValue = 'portfolio' | 'transactions' | 'notes'

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
  const [watchlistLoading, setWatchlistLoading] = useState(false)

  const [notes, setNotes] = useState<NoteItem[]>([])
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [notesError, setNotesError] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')

  const [activeTab, setActiveTab] = useState<TabValue>('portfolio')

  const REFRESH_INTERVAL_MS = 60_000

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [q, s] = await Promise.all([getQuote(decodedSymbol), getTimeSeries(decodedSymbol)])
        if (!cancelled) {
          setQuote(q)
          setSeries(s)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const status = (err as { response?: { status?: number } })?.response?.status
          const data = (err as { response?: { data?: { error?: string } } })?.response?.data
          const msg = data?.error
          setError(
            status === 401
              ? 'Connectez-vous pour afficher les données de cette entité.'
              : msg ?? 'Impossible de charger les données de marché.'
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [decodedSymbol])

  useEffect(() => {
    if (!decodedSymbol || error) return
    const interval = setInterval(async () => {
      try {
        const [q, s] = await Promise.all([getQuote(decodedSymbol), getTimeSeries(decodedSymbol)])
        setQuote(q)
        setSeries(s)
      } catch {
        // Silent fail on refresh
      }
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [decodedSymbol, error])

  useEffect(() => {
    if (!isAuthenticated || !quote) return

    let cancelled = false
    const ensureAndFetch = async () => {
      try {
        const entities = await getEntities()
        const existing = entities.find((e) => e.ticker === quote.symbol)
        let id = existing?.id

        if (!id) {
          const created = await createEntity({
            nom: quote.symbol,
            ticker: quote.symbol,
            secteur: '',
            valeur_totale: 0,
          })
          id = created.id
        }

        if (cancelled) return
        setEntityId(id)

        const [watchlistRes, notesRes] = await Promise.all([getWatchlist(), getNotes()])
        if (cancelled) return

        const wl = watchlistRes.find((w) => w.entity.id === id)
        setIsInWatchlist(!!wl)
        setWatchlistItemId(wl?.id ?? null)
        setNotes(notesRes.filter((n) => n.entity?.id === id))
      } catch {
        // Silently fail
      }
    }
    ensureAndFetch()
    return () => { cancelled = true }
  }, [isAuthenticated, quote])

  const handleToggleWatchlist = async () => {
    if (!isAuthenticated || !entityId) return
    setWatchlistLoading(true)
    try {
      if (isInWatchlist && watchlistItemId != null) {
        await removeFromWatchlist(watchlistItemId)
        setIsInWatchlist(false)
        setWatchlistItemId(null)
      } else {
        const added = await addToWatchlist(entityId)
        setIsInWatchlist(true)
        setWatchlistItemId(added.id)
      }
    } finally {
      setWatchlistLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!entityId || !newNoteContent.trim()) return
    setNotesError(null)
    try {
      const created = await createNote({
        entity_id: entityId,
        titre: newNoteTitle.trim() || `Note sur ${decodedSymbol}`,
        contenu: newNoteContent.trim(),
      })
      setNotes((prev) => [created, ...prev])
      setNewNoteTitle('')
      setNewNoteContent('')
    } catch {
      setNotesError("Impossible d'enregistrer la note.")
    }
  }

  const handleStartEdit = (note: NoteItem) => {
    setEditingNoteId(note.id)
    setEditingContent(note.contenu)
  }

  const handleSaveEdit = async () => {
    if (editingNoteId == null) return
    try {
      const updated = await updateNote(editingNoteId, { contenu: editingContent })
      setNotes((prev) => prev.map((n) => (n.id === editingNoteId ? updated : n)))
      setEditingNoteId(null)
    } catch {
      // Could show toast
    }
  }

  const handleCancelEdit = () => {
    setEditingNoteId(null)
    setEditingContent('')
  }

  const handleDeleteNote = async (id: number) => {
    try {
      await deleteNote(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
    } catch {
      // Could show toast
    }
  }

  const chartData = series.map((p) => ({ date: p.date, value: p.close }))
  const pieData = quote?.price != null
    ? [{ name: decodedSymbol, value: quote.price }]
    : []

  const totalValue = quote?.price ?? 0
  const changePercent = quote?.changePercent ? parseFloat(quote.changePercent) : null

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          !isAuthenticated && (
            <Button color="inherit" component={RouterLink} to="/login">
              Connexion
            </Button>
          )
        }
      >
        {error}
      </Alert>
    )
  }

  return (
    <Stack spacing={3}>
      {/* Entity header */}
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'primary.main',
              fontSize: '1.25rem',
              fontWeight: 700,
            }}
          >
            {decodedSymbol.slice(0, 2).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" fontWeight={700}>
              {decodedSymbol}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap">
              <Chip label="Entité" size="small" variant="outlined" />
              {quote?.price != null && (
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {quote.price.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })}
                  {changePercent != null && (
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{
                        ml: 1,
                        color: changePercent >= 0 ? 'success.main' : 'error.main',
                      }}
                    >
                      {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                    </Typography>
                  )}
                </Typography>
              )}
            </Stack>
          </Box>
          {isAuthenticated ? (
            <Button
              variant="outlined"
              size="medium"
              startIcon={
                watchlistLoading ? (
                  <CircularProgress size={18} />
                ) : isInWatchlist ? (
                  <StarIcon />
                ) : (
                  <StarBorderIcon />
                )
              }
              onClick={handleToggleWatchlist}
              disabled={watchlistLoading}
              sx={{ textTransform: 'none' }}
            >
              {isInWatchlist ? 'Dans la watchlist' : 'Ajouter à la watchlist'}
            </Button>
          ) : (
            <Tooltip title="Connectez-vous pour ajouter à votre watchlist">
              <span>
                <Button
                  variant="outlined"
                  size="medium"
                  startIcon={<StarBorderIcon />}
                  disabled
                  component={RouterLink}
                  to="/login"
                  sx={{ textTransform: 'none' }}
                >
                  Watchlist
                </Button>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Paper>

      {/* Upper region: cards, pie, chart */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        <Box>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Valeur totale
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                {totalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })}
              </Typography>
              {changePercent != null && (
                <Typography
                  variant="body2"
                  sx={{ color: changePercent >= 0 ? 'success.main' : 'error.main', mt: 0.5 }}
                >
                  {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}% sur la période
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
        <Box>
          <Paper sx={{ p: 2, height: '100%', minHeight: 280 }}>
            <HoldingsPieChart data={pieData} height={240} />
          </Paper>
        </Box>
        <Box>
          <Paper sx={{ p: 2, height: '100%', minHeight: 280 }}>
            <PortfolioLineChart data={chartData} height={240} />
          </Paper>
        </Box>
      </Box>

      {/* Lower region: tabs */}
      <Paper sx={{ overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Portfolio" value="portfolio" />
          <Tab label="Transactions" value="transactions" />
          <Tab label="Notes" value="notes" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {activeTab === 'portfolio' && (
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell>Actif</TableCell>
                  <TableCell align="right">Prix</TableCell>
                  <TableCell align="right">Variation</TableCell>
                  <TableCell align="right">Valeur</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {quote?.price != null ? (
                  <TableRow>
                    <TableCell sx={{ fontWeight: 500 }}>{decodedSymbol}</TableCell>
                    <TableCell align="right">
                      {quote.price.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        component="span"
                        sx={{ color: (changePercent ?? 0) >= 0 ? 'success.main' : 'error.main' }}
                      >
                        {changePercent != null ? `${changePercent >= 0 ? '+' : ''}${changePercent}%` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {quote.price.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })}
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ py: 4, color: 'text.secondary' }}>
                      Aucune donnée de portefeuille disponible.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {activeTab === 'transactions' && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Aucune transaction disponible pour cette entité.
              </Typography>
            </Box>
          )}

          {activeTab === 'notes' && (
            <Stack spacing={2}>
              {!isAuthenticated && (
                <Alert
                  severity="info"
                  action={
                    <Button color="inherit" component={RouterLink} to="/login" size="small">
                      Connexion
                    </Button>
                  }
                >
                  Connectez-vous pour écrire des notes privées sur cette entité.
                </Alert>
              )}

              {isAuthenticated && (
                <>
                  {notesError && <Alert severity="error">{notesError}</Alert>}
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Ajouter une note
                    </Typography>
                    <TextField
                      placeholder="Titre (optionnel)"
                      size="small"
                      fullWidth
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      placeholder="Saisissez votre réflexion ou commentaire..."
                      multiline
                      minRows={3}
                      fullWidth
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                    />
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAddNote}
                      disabled={!newNoteContent.trim()}
                      sx={{ mt: 2 }}
                    >
                      Enregistrer
                    </Button>
                  </Paper>

                  {notes.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      Aucune note enregistrée pour cette entité.
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {notes.map((note) => (
                        <Paper key={note.id} variant="outlined" sx={{ p: 2 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {note.titre}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(note.created_at).toLocaleString('fr-FR')}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={0.5}>
                              {editingNoteId === note.id ? (
                                <>
                                  <Button size="small" onClick={handleSaveEdit}>
                                    Enregistrer
                                  </Button>
                                  <Button size="small" color="inherit" onClick={handleCancelEdit}>
                                    Annuler
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <IconButton size="small" onClick={() => handleStartEdit(note)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={() => handleDeleteNote(note.id)} color="error">
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </>
                              )}
                            </Stack>
                          </Stack>
                          {editingNoteId === note.id ? (
                            <TextField
                              multiline
                              fullWidth
                              minRows={3}
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              sx={{ mt: 2 }}
                            />
                          ) : (
                            <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                              {note.contenu}
                            </Typography>
                          )}
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </>
              )}
            </Stack>
          )}
        </Box>
      </Paper>
    </Stack>
  )
}
