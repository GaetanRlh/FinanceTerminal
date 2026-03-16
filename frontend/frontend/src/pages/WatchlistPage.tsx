import {
  Alert,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { getWatchlist, removeFromWatchlist, type WatchlistItem } from '../services/api'

export function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const navigate = useNavigate()

  const REFRESH_INTERVAL_MS = 60_000

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getWatchlist()
        if (!cancelled) setItems(data)
      } catch {
        if (!cancelled) setError('Impossible de charger votre watchlist.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await getWatchlist()
        setItems(data)
      } catch {
        // Silent fail on refresh
      }
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const handleRemove = async (item: WatchlistItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setRemovingId(item.id)
    try {
      await removeFromWatchlist(item.id)
      setItems((prev) => prev.filter((w) => w.id !== item.id))
    } catch {
      // Could show toast
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Ma watchlist"
        subtitle="Les entités financières que vous suivez."
      />

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!isLoading && !error && (
        <Paper sx={{ overflow: 'hidden' }}>
          {items.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Votre watchlist est vide. Explorez les entités et ajoutez-en à votre liste.
              </Typography>
            </Box>
          ) : (
            <Table size="medium">
              <TableHead>
                <TableRow>
                  <TableCell>Entité</TableCell>
                  <TableCell>Ticker</TableCell>
                  <TableCell>Secteur</TableCell>
                  <TableCell align="right">Valeur totale</TableCell>
                  <TableCell align="center" sx={{ width: 60 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/entities/${encodeURIComponent(item.entity.ticker)}`)}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>{item.entity.nom}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{item.entity.ticker}</TableCell>
                    <TableCell>{item.entity.secteur || '—'}</TableCell>
                    <TableCell align="right">
                      {Number(item.entity.valeur_totale).toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Retirer de la watchlist">
                        <IconButton
                          size="small"
                          onClick={(e) => handleRemove(item, e)}
                          disabled={removingId === item.id}
                          sx={{ color: 'primary.main' }}
                        >
                          {removingId === item.id ? (
                            <CircularProgress size={20} />
                          ) : (
                            <StarIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}
    </>
  )
}
