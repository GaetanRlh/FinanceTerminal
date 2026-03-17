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
import { PageHeader } from '../components/PageHeader'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import PersonIcon from '@mui/icons-material/Person'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { useState } from 'react'
import { register as apiRegister } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

type RegisterFormValues = {
  full_name: string
  email: string
  password: string
  confirmPassword: string
}

export function RegisterPage() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const password = watch('password')

  const onSubmit = async (data: RegisterFormValues) => {
    setApiError(null)
    setLoading(true)
    try {
      const res = await apiRegister({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
      })
      login(res.tokens)
      navigate('/')
    } catch (err: unknown) {
      const ax = err as { response?: { data?: Record<string, unknown> } }
      const d = ax?.response?.data
      if (d) {
        const msg = Object.values(d).flat().join(' ')
        setApiError(msg || 'Registration failed.')
      } else {
        setApiError('Unable to register. Check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Register"
        subtitle="Create an account to track your financial entities"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Register' }]}
      />
      <Box sx={{ maxWidth: 440, mx: 'auto' }}>
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
          <Typography
            sx={{
              fontSize: '0.62rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: 'rgba(0,212,255,0.5)',
              fontFamily: '"JetBrains Mono", monospace',
              mb: 2.5,
            }}
          >
            ▸ CREATE ACCOUNT
          </Typography>

          {apiError && (
            <Alert severity="error" sx={{ mb: 2, fontSize: '0.78rem' }}>
              {apiError}
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField
              label="Full Name"
              fullWidth
              required
              error={!!errors.full_name}
              helperText={errors.full_name?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ fontSize: 16, color: 'rgba(0,212,255,0.4)' }} />
                  </InputAdornment>
                ),
              }}
              {...register('full_name', { required: 'Name is required' })}
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              error={!!errors.email}
              helperText={errors.email?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ fontSize: 16, color: 'rgba(0,212,255,0.4)' }} />
                  </InputAdornment>
                ),
              }}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' },
              })}
            />
            <TextField
              label="Password"
              type={showPass ? 'text' : 'password'}
              fullWidth
              required
              error={!!errors.password}
              helperText={errors.password?.message}
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
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Minimum 8 characters' },
              })}
            />
            <TextField
              label="Confirm Password"
              type={showConfirm ? 'text' : 'password'}
              fullWidth
              required
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ fontSize: 16, color: 'rgba(0,212,255,0.4)' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowConfirm((v) => !v)} edge="end" sx={{ color: 'rgba(224,230,240,0.4)' }}>
                      {showConfirm ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (v) => v === password || 'Passwords do not match',
              })}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : null}
              sx={{ py: 1.25, fontSize: '0.8rem', mt: 0.5 }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>

            <Divider sx={{ borderColor: 'rgba(0,212,255,0.08)' }}>
              <Typography sx={{ fontSize: '0.65rem', color: 'rgba(224,230,240,0.3)', fontFamily: '"JetBrains Mono", monospace', px: 1 }}>
                OR
              </Typography>
            </Divider>

            <Typography sx={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(224,230,240,0.5)', fontFamily: '"JetBrains Mono", monospace' }}>
              Already have an account?{' '}
              <Typography
                component={RouterLink}
                to="/login"
                sx={{ color: '#00d4ff', textDecoration: 'none', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}
              >
                Sign in
              </Typography>
            </Typography>
          </Stack>
        </Box>
      </Box>
    </>
  )
}
