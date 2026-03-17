import { createTheme } from '@mui/material/styles'

const MONO = '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace'

export const arkhamTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00d4ff',
      light: '#33dfff',
      dark: '#00a8cc',
    },
    secondary: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    background: {
      default: '#030608',
      paper: '#080f1c',
    },
    success: {
      main: '#00ff88',
      light: '#33ffaa',
      dark: '#00cc6a',
    },
    error: {
      main: '#ff3366',
      light: '#ff6680',
      dark: '#cc0044',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    text: {
      primary: '#e0e6f0',
      secondary: '#7b8fa8',
      disabled: 'rgba(224, 230, 240, 0.3)',
    },
    divider: 'rgba(0, 212, 255, 0.1)',
  },
  typography: {
    fontFamily: MONO,
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.7rem' },
    body1: { fontFamily: MONO },
    body2: { fontFamily: MONO, fontSize: '0.8125rem' },
    caption: { fontFamily: MONO, fontSize: '0.7rem' },
    button: { fontFamily: MONO, fontWeight: 600 },
  },
  shape: {
    borderRadius: 2,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#030608',
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.015) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#080f1c',
          border: '1px solid rgba(0, 212, 255, 0.12)',
          boxShadow: 'inset 0 0 0 1px rgba(0, 212, 255, 0.04)',
        },
        outlined: {
          border: '1px solid rgba(0, 212, 255, 0.2)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#080f1c',
          border: '1px solid rgba(0, 212, 255, 0.12)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          '&:hover': {
            borderColor: 'rgba(0, 212, 255, 0.35)',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.08)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#030608',
          backgroundImage: 'none',
          borderBottom: '1px solid rgba(0, 212, 255, 0.15)',
          boxShadow: '0 1px 20px rgba(0, 212, 255, 0.06)',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'rgba(0, 212, 255, 0.7)',
            borderBottom: '1px solid rgba(0, 212, 255, 0.15)',
            padding: '10px 12px',
            fontFamily: MONO,
            backgroundColor: 'rgba(0, 212, 255, 0.03)',
          },
          '& .MuiTableCell-body': {
            borderBottom: '1px solid rgba(0, 212, 255, 0.06)',
            padding: '10px 12px',
            fontFamily: MONO,
            fontSize: '0.8125rem',
          },
          '& .MuiTableRow-root:hover': {
            backgroundColor: 'rgba(0, 212, 255, 0.04)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontFamily: MONO,
          borderRadius: 2,
          letterSpacing: '0.03em',
        },
        contained: {
          boxShadow: '0 0 12px rgba(0, 212, 255, 0.25)',
          '&:hover': {
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)',
          },
        },
        outlined: {
          borderColor: 'rgba(0, 212, 255, 0.35)',
          '&:hover': {
            borderColor: '#00d4ff',
            backgroundColor: 'rgba(0, 212, 255, 0.06)',
            boxShadow: '0 0 12px rgba(0, 212, 255, 0.15)',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontFamily: MONO,
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
          color: 'rgba(224, 230, 240, 0.5)',
          '&.Mui-selected': {
            color: '#00d4ff',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#00d4ff',
          boxShadow: '0 0 8px #00d4ff',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: MONO,
          fontWeight: 600,
          fontSize: '0.65rem',
          letterSpacing: '0.05em',
          borderRadius: 2,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            fontFamily: MONO,
            backgroundColor: 'rgba(0, 212, 255, 0.02)',
            '& fieldset': {
              borderColor: 'rgba(0, 212, 255, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 212, 255, 0.4)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00d4ff',
              boxShadow: '0 0 0 2px rgba(0, 212, 255, 0.12)',
            },
          },
          '& .MuiInputLabel-root': {
            fontFamily: MONO,
            fontSize: '0.8rem',
          },
          '& .MuiInputBase-input': {
            fontFamily: MONO,
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0a1428',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 212, 255, 0.06)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontFamily: MONO,
          fontSize: '0.8rem',
          '&:hover': {
            backgroundColor: 'rgba(0, 212, 255, 0.08)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          transition: 'color 0.2s, background-color 0.2s',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontFamily: MONO,
          fontSize: '0.8rem',
          borderRadius: 2,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
        },
        bar: {
          backgroundColor: '#00d4ff',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#0a1428',
          border: '1px solid rgba(0, 212, 255, 0.25)',
          fontFamily: MONO,
          fontSize: '0.75rem',
          borderRadius: 2,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(0, 212, 255, 0.1)',
        },
      },
    },
  },
})
