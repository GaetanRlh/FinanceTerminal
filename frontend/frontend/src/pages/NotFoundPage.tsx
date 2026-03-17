import { Box, Button, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <Box sx={{ py: 12, textAlign: 'center' }}>
      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '3rem', fontWeight: 800, color: 'rgba(0,212,255,0.15)', mb: 1 }}>
        404
      </Typography>
      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9rem', color: '#e0e6f0', mb: 0.75 }}>
        Page not found
      </Typography>
      <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.72rem', color: 'rgba(224,230,240,0.3)', mb: 3 }}>
        That route doesn't exist
      </Typography>
      <Button variant="outlined" component={RouterLink} to="/" size="small" sx={{ fontSize: '0.75rem' }}>
        Back to Dashboard
      </Button>
    </Box>
  )
}
