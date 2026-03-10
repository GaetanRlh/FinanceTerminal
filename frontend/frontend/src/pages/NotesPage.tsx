import { useState } from 'react'
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  TextField,
  Paper,
  Stack,
} from '@mui/material'
import { PageHeader } from '../components/PageHeader'

type Note = {
  id: number
  titre: string
  contenu: string
}

const INITIAL_NOTES: Note[] = [
  {
    id: 1,
    titre: 'Suivi des valeurs technologiques',
    contenu: 'Observer l’évolution des valeurs tech avant la prochaine réunion de la FED.',
  },
  {
    id: 2,
    titre: 'Note sur le secteur énergie',
    contenu: 'Regarder l’impact des annonces sur les énergies renouvelables.',
  },
]

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES)
  const [newNote, setNewNote] = useState('')

  const handleAddNote = () => {
    if (!newNote.trim()) return
    const note: Note = {
      id: notes.length + 1,
      titre: 'Nouvelle note',
      contenu: newNote.trim(),
    }
    setNotes([note, ...notes])
    setNewNote('')
  }

  return (
    <>
      <PageHeader
        title="Notes personnelles"
        subtitle="Conservez vos réflexions et analyses sur les entités suivies."
      />
      <Stack spacing={2}>
        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Ajouter une note"
              placeholder="Saisissez ici un commentaire rapide sur le marché ou une entité..."
              multiline
              minRows={3}
              value={newNote}
              onChange={(event) => setNewNote(event.target.value)}
            />
            <Box>
              <Button variant="contained" onClick={handleAddNote}>
                Ajouter une note (mock)
              </Button>
            </Box>
          </Stack>
        </Paper>

        <Paper>
          <List>
            {notes.map((note) => (
              <ListItem key={note.id} alignItems="flex-start" divider>
                <ListItemText
                  primary={note.titre}
                  secondary={note.contenu}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Stack>
    </>
  )
}

