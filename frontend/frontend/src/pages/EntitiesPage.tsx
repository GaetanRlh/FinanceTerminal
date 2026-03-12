import {
  Box,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { searchEntities, type SearchResult } from '../services/api'

export function EntitiesPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const debouncedQuery = useDebouncedValue(query, 400)

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([])
      setError(null)
      return
    }

    let cancelled = false
    const fetchResults = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await searchEntities(debouncedQuery.trim())
        if (!cancelled) {
          setResults(data)
        }
      } catch {
        if (!cancelled) {
          setError("Impossible de récupérer les résultats. Vérifiez votre connexion ou réessayez.")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchResults()

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  const hasQuery = query.trim().length >= 2

  return (
    <>
      <PageHeader
        title="Explorateur d’entités"
        subtitle="Parcourez les entités financières disponibles dans RainTrack (données Alpha Vantage)."
      />
      <Box sx={{ mb: 2 }}>
        <TextField
          label="Rechercher une entité"
          placeholder="Nom, secteur ou ticker"
          fullWidth
          variant="outlined"
          helperText="Tapez au moins 2 caractères pour lancer une recherche."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </Box>
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Symbole</TableCell>
              <TableCell>Région</TableCell>
              <TableCell>Devise</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!hasQuery && !isLoading && !error && (
              <TableRow>
                <TableCell colSpan={4}>
                  Tapez au moins 2 caractères pour lancer une recherche d’entités (données Alpha Vantage).
                </TableCell>
              </TableRow>
            )}
            {hasQuery && results.length === 0 && !isLoading && !error && (
              <TableRow>
                <TableCell colSpan={4}>Aucun résultat trouvé.</TableCell>
              </TableRow>
            )}
            {results.map((result) => (
              <TableRow
                key={`${result.symbol}-${result.region}`}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/entities/${encodeURIComponent(result.symbol)}`)}
              >
                <TableCell>{result.name}</TableCell>
                <TableCell>{result.symbol}</TableCell>
                <TableCell>{result.region ?? '—'}</TableCell>
                <TableCell>{result.currency ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  )
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return useMemo(() => debounced, [debounced])
}

