import {
  Box,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from '@mui/material'
import { PageHeader } from '../components/PageHeader'
import type { Entity } from '../types/entities'

const MOCK_ENTITIES: Entity[] = [
  { id: 1, nom: 'Tech Global Fund', secteur: 'Technologie', ticker: 'TGF', valeurTotale: 1500000 },
  { id: 2, nom: 'HealthCare Select', secteur: 'Santé', ticker: 'HCS', valeurTotale: 820000 },
  { id: 3, nom: 'Green Energy Index', secteur: 'Énergie', ticker: 'GEI', valeurTotale: 430000 },
]

export function EntitiesPage() {
  return (
    <>
      <PageHeader
        title="Explorateur d’entités"
        subtitle="Parcourez les entités financières disponibles dans RainTrack."
      />
      <Box sx={{ mb: 2 }}>
        <TextField
          label="Rechercher une entité"
          placeholder="Nom, secteur ou ticker"
          fullWidth
          variant="outlined"
        />
      </Box>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Secteur</TableCell>
              <TableCell>Ticker</TableCell>
              <TableCell align="right">Valeur totale (€)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {MOCK_ENTITIES.map((entity) => (
              <TableRow key={entity.id}>
                <TableCell>{entity.nom}</TableCell>
                <TableCell>{entity.secteur}</TableCell>
                <TableCell>{entity.ticker}</TableCell>
                <TableCell align="right">
                  {entity.valeurTotale.toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  )
}

