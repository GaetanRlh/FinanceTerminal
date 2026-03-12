import { useForm } from 'react-hook-form'
import { Box, Button, TextField, Typography, Stack, Alert, Link } from '@mui/material'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { login as loginApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

type LoginFormValues = {
  email: string
  password: string
}

export function LoginPage() {
  const { register, handleSubmit } = useForm<LoginFormValues>()
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const from = (location.state as { from?: { pathname?: string } } | null)?.from

  const onSubmit = async (data: LoginFormValues) => {
    setError(null)
    setIsSubmitting(true)
    try {
      const tokens = await loginApi(data)
      login(tokens)
      if (from?.pathname) {
        navigate(from.pathname, { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status
        if (status === 401) {
          setError('Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.')
        } else if (status === 403 || status === 429) {
          setError('Compte temporairement bloqué suite à plusieurs tentatives. Réessayez plus tard.')
        } else {
          setError("Une erreur est survenue lors de la connexion. Veuillez réessayer.")
        }
      } else {
        setError("Une erreur réseau est survenue. Veuillez vérifier votre connexion et réessayer.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader title="Connexion" subtitle="Connectez-vous pour accéder à votre espace RainTrack." />
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ maxWidth: 400, mx: 'auto' }}
      >
        <Stack spacing={2}>
          {from && !error && (
            <Alert severity="info">Vous devez être connecté pour accéder à cette page.</Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Adresse e-mail"
            type="email"
            fullWidth
            required
            {...register('email')}
          />
          <TextField
            label="Mot de passe"
            type="password"
            fullWidth
            required
            {...register('password')}
          />
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Se connecter
          </Button>
          <Typography variant="body2">
            Vous n&apos;avez pas encore de compte ?{' '}
            <Link component={RouterLink} to="/register">
              Créer un compte
            </Link>
          </Typography>
          <Typography variant="body2">
            Mot de passe oublié ?{' '}
            <Link component={RouterLink} to="/password-reset">
              Réinitialiser mon mot de passe
            </Link>
          </Typography>
        </Stack>
      </Box>
    </>
  )
}

