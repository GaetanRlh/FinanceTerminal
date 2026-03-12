import { Box, Button, TextField, Stack, Typography, Alert, Link } from '@mui/material'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { requestPasswordReset } from '../services/api'
import axios from 'axios'
import { Link as RouterLink } from 'react-router-dom'

export function PasswordResetPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await requestPasswordReset(email)
      setDone(true)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError("Une erreur est survenue lors de la demande de réinitialisation. Veuillez réessayer.")
      } else {
        setError("Une erreur réseau est survenue. Veuillez vérifier votre connexion et réessayer.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Mot de passe oublié"
        subtitle={
          done
            ? "Si un compte existe avec cet e-mail, un lien de réinitialisation a été envoyé."
            : "Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation."
        }
      />
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ maxWidth: 400, mx: 'auto' }}
      >
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          {!done && (
            <>
              <TextField
                label="Adresse e-mail"
                type="email"
                fullWidth
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                Envoyer le lien de réinitialisation
              </Button>
            </>
          )}
          {done && (
            <Alert severity="success">
              Si un compte existe avec <strong>{email}</strong>, un e-mail contenant les instructions
              de réinitialisation a été envoyé.
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            <Link component={RouterLink} to="/login">
              Retour à la page de connexion
            </Link>
          </Typography>
        </Stack>
      </Box>
    </>
  )
}

