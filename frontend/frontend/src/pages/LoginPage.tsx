import { useForm } from 'react-hook-form'
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { login as loginApi } from '../services/api'
import { useAuth } from '../contexts/useAuth'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import TerminalIcon from '@mui/icons-material/Terminal'

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
  const [showPass, setShowPass] = useState(false)
  const from = (location.state as { from?: { pathname?: string } } | null)?.from

  const onSubmit = async (data: LoginFormValues) => {
    setError(null)
    setIsSubmitting(true)
    try {
      const tokens = await loginApi(data)
      login(tokens)
      navigate(from?.pathname ?? '/', { replace: true })
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status
        if (status === 401) {
          setError('Invalid credentials. Check your email and password.')
        } else if (status === 403 || status === 429) {
          setError('Account temporarily blocked due to too many attempts. Try again later.')
        } else {
          setError('An error occurred. Please try again.')
        }
      } else {
        setError('Network error. Check your connection and try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Sign In"
        subtitle="Access your FinanceTerminal workspace"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Sign In' }]}
      />
      <Box sx={{ maxWidth: 420, mx: 'auto' }}>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            p: 3,
            border: '1px solid rgba(0,212,255,0.15)',
            bgcolor: '#080f1c',
            borderRadius: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
            <TerminalIcon sx={{ color: 'rgba(0,212,255,0.5)', fontSize: 18 }} />
            <Typography
              sx={{
                fontSize: '0.62rem',
                fontWeight: 800,
                letterSpacing: '0.12em',
                color: 'rgba(0,212,255,0.5)',
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              AUTHENTICATE
            </Typography>
          </Box>

          <Stack spacing={2}>
            {from && !error && (
              <Alert severity="info" sx={{ fontSize: '0.78rem' }}>
                Sign in to access this page.
              </Alert>
            )}
            {error && <Alert severity="error" sx={{ fontSize: '0.78rem' }}>{error}</Alert>}

            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ fontSize: 16, color: 'rgba(0,212,255,0.4)' }} />
                  </InputAdornment>
                ),
              }}
              {...register('email')}
            />
            <TextField
              label="Password"
              type={showPass ? 'text' : 'password'}
              fullWidth
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ fontSize: 16, color: 'rgba(0,212,255,0.4)' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPass((v) => !v)} edge="end" sx={{ color: 'rgba(224,230,240,0.4)' }}>
                      {showPass ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              {...register('password')}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : null}
              sx={{ py: 1.25, fontSize: '0.8rem' }}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>

            <Divider sx={{ borderColor: 'rgba(0,212,255,0.08)' }}>
              <Typography sx={{ fontSize: '0.65rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace', px: 1 }}>
                OR
              </Typography>
            </Divider>

            <Typography sx={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(224,230,240,0.5)', fontFamily: '"JetBrains Mono", monospace' }}>
              No account?{' '}
              <Typography
                component={RouterLink}
                to="/register"
                sx={{ color: '#00d4ff', textDecoration: 'none', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}
              >
                Create one
              </Typography>
            </Typography>
          </Stack>
        </Box>
      </Box>
    </>
  )
}
