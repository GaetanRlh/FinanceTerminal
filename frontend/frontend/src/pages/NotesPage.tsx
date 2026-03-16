import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { getNotes, deleteNote, type NoteItem } from '../services/api'

export function NotesPage() {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getNotes()
        if (!cancelled) setNotes(data)
      } catch {
        if (!cancelled) setError('Impossible de charger vos notes.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [])

  const handleDelete = async (note: NoteItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingId(note.id)
    try {
      await deleteNote(note.id)
      setNotes((prev) => prev.filter((n) => n.id !== note.id))
    } catch {
      // Could show toast
    } finally {
      setDeletingId(null)
    }
  }

  const handleOpenEntity = (note: NoteItem) => {
    if (note.entity?.ticker) {
      navigate(`/entities/${encodeURIComponent(note.entity.ticker)}`)
    }
  }

  return (
    <>
      <PageHeader
        title="Notes personnelles"
        subtitle="Vos réflexions et analyses sur les entités suivies."
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
        <Stack spacing={2}>
          {notes.length === 0 ? (
            <Paper sx={{ py: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Vous n&apos;avez pas encore de notes. Ajoutez des notes sur les pages de détail des entités.
              </Typography>
            </Paper>
          ) : (
            notes.map((note) => (
              <Paper key={note.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {note.titre}
                    </Typography>
                    {note.entity && (
                      <Button
                        size="small"
                        startIcon={<OpenInNewIcon />}
                        onClick={() => handleOpenEntity(note)}
                        sx={{ mt: 0.5, textTransform: 'none' }}
                      >
                        {note.entity.nom} ({note.entity.ticker})
                      </Button>
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {new Date(note.created_at).toLocaleString('fr-FR')}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                      {note.contenu}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => handleDelete(note, e)}
                    disabled={deletingId === note.id}
                  >
                    {deletingId === note.id ? (
                      <CircularProgress size={20} />
                    ) : (
                      <DeleteIcon fontSize="small" />
                    )}
                  </IconButton>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      )}
    </>
  )
}
