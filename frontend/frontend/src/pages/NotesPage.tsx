import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { getNotes, deleteNote, updateNote, type NoteItem } from '../services/api'

export function NotesPage() {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitre, setEditTitre] = useState('')
  const [editContenu, setEditContenu] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)
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
        if (!cancelled) setError('Unable to load notes.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [])

  const startEdit = (note: NoteItem) => {
    setEditingId(note.id)
    setEditTitre(note.titre)
    setEditContenu(note.contenu)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitre('')
    setEditContenu('')
  }

  const handleSave = async (note: NoteItem) => {
    setSavingId(note.id)
    try {
      const updated = await updateNote(note.id, { titre: editTitre, contenu: editContenu })
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)))
      setEditingId(null)
    } catch {
      // silent
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (note: NoteItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingId(note.id)
    try {
      await deleteNote(note.id)
      setNotes((prev) => prev.filter((n) => n.id !== note.id))
    } catch {
      // silent
    } finally {
      setDeletingId(null)
    }
  }

  // Group notes by entity
  const grouped = notes.reduce<Record<string, NoteItem[]>>((acc, note) => {
    const key = note.entity?.ticker ?? '__standalone__'
    if (!acc[key]) acc[key] = []
    acc[key].push(note)
    return acc
  }, {})

  return (
    <>
      <PageHeader
        title="Notes"
        subtitle="Your analysis and research notes on financial entities"
        breadcrumbs={[{ label: 'Market', to: '/' }, { label: 'Notes' }]}
        badge={
          notes.length > 0 ? (
            <Chip
              label={`${notes.length} note${notes.length > 1 ? 's' : ''}`}
              size="small"
              sx={{
                height: 20, fontSize: '0.62rem', fontWeight: 700,
                bgcolor: 'rgba(0,212,255,0.1)', color: '#00d4ff',
                border: '1px solid rgba(0,212,255,0.25)',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          ) : null
        }
      />

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, py: 6 }}>
          <CircularProgress size={20} sx={{ color: 'rgba(0,212,255,0.5)' }} />
          <Typography sx={{ fontSize: '0.75rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace' }}>
            Loading notes...
          </Typography>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, fontSize: '0.78rem' }}>{error}</Alert>}

      {!isLoading && !error && (
        notes.length === 0 ? (
          <Paper sx={{ py: 8, textAlign: 'center', px: 3 }}>
            <NoteAddIcon sx={{ fontSize: 36, color: 'rgba(0,212,255,0.2)', mb: 1.5 }} />
            <Typography sx={{ color: 'rgba(224,230,240,0.4)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.82rem', mb: 1 }}>
              No notes yet
            </Typography>
            <Typography sx={{ color: 'rgba(224,230,240,0.25)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', mb: 2 }}>
              Open any entity page and add a note in the Notes tab
            </Typography>
            <Button variant="outlined" size="small" onClick={() => navigate('/entities')} sx={{ fontSize: '0.72rem' }}>
              Browse Entities
            </Button>
          </Paper>
        ) : (
          <Stack spacing={3}>
            {Object.entries(grouped).map(([ticker, groupNotes]) => {
              const firstNote = groupNotes[0]
              return (
                <Box key={ticker}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(0,212,255,0.5)', fontFamily: '"JetBrains Mono", monospace' }}>
                      ▸ {ticker === '__standalone__' ? 'STANDALONE' : ticker}
                    </Typography>
                    {ticker !== '__standalone__' && (
                      <Button
                        size="small"
                        startIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
                        onClick={() => navigate(`/entities/${encodeURIComponent(ticker)}`)}
                        sx={{ fontSize: '0.65rem', color: 'rgba(0,212,255,0.5)', py: 0.25, px: 1, '&:hover': { color: '#00d4ff' } }}
                      >
                        {firstNote.entity?.nom ?? ticker}
                      </Button>
                    )}
                  </Box>
                  <Stack spacing={1.5}>
                    {groupNotes.map((note) => (
                      <Paper
                        key={note.id}
                        variant="outlined"
                        sx={{ p: 2, '&:hover': { borderColor: 'rgba(0,212,255,0.25)' } }}
                      >
                        {editingId === note.id ? (
                          <Stack spacing={1.5}>
                            <TextField
                              size="small"
                              label="Title"
                              value={editTitre}
                              onChange={(e) => setEditTitre(e.target.value)}
                              fullWidth
                            />
                            <TextField
                              size="small"
                              label="Content"
                              value={editContenu}
                              onChange={(e) => setEditContenu(e.target.value)}
                              fullWidth
                              multiline
                              rows={4}
                            />
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleSave(note)}
                                disabled={savingId === note.id}
                                startIcon={savingId === note.id ? <CircularProgress size={12} sx={{ color: 'inherit' }} /> : <CheckIcon sx={{ fontSize: 14 }} />}
                                sx={{ fontSize: '0.7rem' }}
                              >
                                Save
                              </Button>
                              <Button size="small" onClick={cancelEdit} startIcon={<CloseIcon sx={{ fontSize: 14 }} />} sx={{ fontSize: '0.7rem', color: 'rgba(224,230,240,0.5)' }}>
                                Cancel
                              </Button>
                            </Box>
                          </Stack>
                        ) : (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: '0.85rem', color: '#e0e6f0', mb: 0.25 }}>
                                {note.titre}
                              </Typography>
                              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.62rem', color: 'rgba(224,230,240,0.3)', mb: 1 }}>
                                {new Date(note.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem', color: 'rgba(224,230,240,0.7)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                {note.contenu}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', flexShrink: 0 }}>
                              <IconButton
                                size="small"
                                onClick={() => startEdit(note)}
                                sx={{ color: 'rgba(0,212,255,0.3)', '&:hover': { color: '#00d4ff', bgcolor: 'rgba(0,212,255,0.06)' } }}
                              >
                                <EditIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={(e) => handleDelete(note, e)}
                                disabled={deletingId === note.id}
                                sx={{ color: 'rgba(255,51,102,0.4)', '&:hover': { color: '#ff3366', bgcolor: 'rgba(255,51,102,0.08)' } }}
                              >
                                {deletingId === note.id ? <CircularProgress size={14} /> : <DeleteIcon sx={{ fontSize: 15 }} />}
                              </IconButton>
                            </Box>
                          </Box>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        )
      )}
    </>
  )
}
