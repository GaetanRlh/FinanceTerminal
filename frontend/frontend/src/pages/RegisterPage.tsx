import { useForm } from 'react-hook-form'
import { Box, Button, TextField, Typography, Stack, Paper } from '@mui/material'
import { PageHeader } from '../components/PageHeader'
import { Link as RouterLink } from 'react-router-dom'

type RegisterFormValues = {
  email: string
  password: string
  confirmPassword: string
  fullName: string
}

export function RegisterPage() {
  const { register, handleSubmit } = useForm<RegisterFormValues>()

  const onSubmit = (data: RegisterFormValues) => {
    console.log('Register form submitted:', data)
  }

  return (
    <>
      <PageHeader
        title="Création de compte"
        subtitle="Inscrivez-vous pour commencer à suivre vos entités financières."
      />
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ maxWidth: 480, mx: 'auto' }}
      >
        <Stack spacing={2}>
          <TextField label="Nom complet" fullWidth required {...register('fullName')} />
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
          <TextField
            label="Confirmation du mot de passe"
            type="password"
            fullWidth
            required
            {...register('confirmPassword')}
          />
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2">
              reCAPTCHA (placeholder) — l’intégration réelle côté frontend et backend sera ajoutée
              plus tard.
            </Typography>
          </Paper>
          <Button type="submit" variant="contained">
            Créer un compte
          </Button>
          <Typography variant="body2">
            Vous avez déjà un compte ?{' '}
            <RouterLink to="/login" style={{ textDecoration: 'none' }}>
              Se connecter
            </RouterLink>
          </Typography>
        </Stack>
      </Box>
    </>
  )
}

