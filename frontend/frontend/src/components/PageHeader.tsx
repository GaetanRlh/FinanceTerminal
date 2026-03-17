import { Typography, Box, Breadcrumbs } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

type BreadcrumbItem = {
  label: string
  to?: string
}

type PageHeaderProps = {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  badge?: React.ReactNode
}

export function PageHeader({ title, subtitle, breadcrumbs, actions, badge }: PageHeaderProps) {
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<ChevronRightIcon sx={{ fontSize: 12, color: 'rgba(0,212,255,0.3)' }} />}
          sx={{ mb: 1 }}
        >
          {breadcrumbs.map((crumb, i) =>
            crumb.to ? (
              <Typography
                key={i}
                component={RouterLink}
                to={crumb.to}
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.7rem',
                  color: 'rgba(0,212,255,0.5)',
                  textDecoration: 'none',
                  '&:hover': { color: '#00d4ff' },
                }}
              >
                {crumb.label}
              </Typography>
            ) : (
              <Typography
                key={i}
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.7rem',
                  color: 'rgba(224,230,240,0.4)',
                }}
              >
                {crumb.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                color: '#e0e6f0',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                '&::before': { content: '"// "', color: 'rgba(0,212,255,0.3)', fontWeight: 400 },
              }}
            >
              {title}
            </Typography>
            {badge}
          </Box>
          {subtitle && (
            <Typography
              sx={{
                mt: 0.5,
                color: 'rgba(224,230,240,0.4)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.78rem',
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box>}
      </Box>
      <Box
        sx={{
          mt: 1.5,
          height: 1,
          background: 'linear-gradient(to right, rgba(0,212,255,0.4), rgba(0,212,255,0.05), transparent)',
        }}
      />
    </Box>
  )
}
