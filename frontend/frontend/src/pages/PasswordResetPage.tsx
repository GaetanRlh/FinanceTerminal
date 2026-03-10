import { Box, Button, TextField, Stack, Typography } from '@mui/material'
import { PageHeader } from '../components/PageHeader'

export function PasswordResetPage() {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  return (
    <>
      <PageHeader
        title="Mot de passe oublié"
        subtitle="Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation (mock)."
      />
      <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 400, mx: 'auto' }}>
        <Stack spacing={2}>
          <TextField label="Adresse e-mail" type="email" fullWidth required />
          <Button type="submit" variant="contained">
            Envoyer le lien de réinitialisation
          </Button>
          <Typography variant="body2" color="text.secondary">
            Cette page est une simulation. L’envoi réel d’e-mail sera implémenté plus tard.
          </Typography>
        </Stack>
      </Box>
    </>
  )
}

