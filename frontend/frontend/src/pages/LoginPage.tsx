import { useForm } from 'react-hook-form'
import { Box, Button, TextField, Typography, Stack, Alert, Link } from '@mui/material'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { Link as RouterLink } from 'react-router-dom'

type LoginFormValues = {
  email: string
  password: string
}

export function LoginPage() {
  const { register, handleSubmit } = useForm<LoginFormValues>()
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = (data: LoginFormValues) => {
    console.log('Login form submitted:', data)
    setSubmitted(true)
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
          {submitted && <Alert severity="success">Connexion simulée avec succès (mock).</Alert>}
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
          <Button type="submit" variant="contained">
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

