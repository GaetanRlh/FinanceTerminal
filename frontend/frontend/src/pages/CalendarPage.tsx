import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EventIcon from '@mui/icons-material/Event'
import {
  createEventReminder,
  deleteEventReminder,
  getEarningsEvents,
  getEconomicEvents,
  getEventReminders,
  type EarningsEvent,
  type EconomicEvent,
  type EventReminder,
} from '../services/api'
import { PageHeader } from '../components/PageHeader'

type CalendarTab = 'earnings' | 'macro'
type MacroCurrency = 'ALL' | 'USD' | 'EUR' | 'GBP' | 'JPY'

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDaysToDateInput(dateValue: string, days: number): string {
  const d = new Date(`${dateValue}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toDateInputValue(d)
}

function rangeLengthDays(fromDate: string, toDate: string): number {
  const from = new Date(`${fromDate}T00:00:00`).getTime()
  const to = new Date(`${toDate}T00:00:00`).getTime()
  const dayMs = 24 * 60 * 60 * 1000
  return Math.max(1, Math.floor((to - from) / dayMs) + 1)
}

function eventBadge(dateIso: string): { label: string; color: string } | null {
  const now = new Date()
  const d = new Date(dateIso)
  const dayMs = 24 * 60 * 60 * 1000
  const diffDays = Math.floor((d.setHours(0, 0, 0, 0) - new Date(now.setHours(0, 0, 0, 0)).getTime()) / dayMs)
  if (diffDays === 0) return { label: 'TODAY', color: '#ff3366' }
  if (diffDays === 1) return { label: 'TOMORROW', color: '#f59e0b' }
  if (diffDays > 1 && diffDays <= 7) return { label: 'THIS WEEK', color: '#00d4ff' }
  return null
}

export function CalendarPage() {
  const today = new Date()
  const defaultFrom = toDateInputValue(today)
  const defaultTo = toDateInputValue(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000))

  const [tab, setTab] = useState<CalendarTab>('earnings')
  const [earnings, setEarnings] = useState<EarningsEvent[]>([])
  const [macro, setMacro] = useState<EconomicEvent[]>([])
  const [reminders, setReminders] = useState<EventReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMacro, setLoadingMacro] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [macroCurrency, setMacroCurrency] = useState<MacroCurrency>('ALL')
  const [macroFrom, setMacroFrom] = useState(defaultFrom)
  const [macroTo, setMacroTo] = useState(defaultTo)

  const loadMacro = useCallback(async (fromDate: string, toDate: string, currency: MacroCurrency, withSpinner = true) => {
    if (withSpinner) setLoadingMacro(true)
    try {
      const macroRes = await getEconomicEvents({
        from: `${fromDate}T00:00:00`,
        to: `${toDate}T23:59:59`,
        currency: currency === 'ALL' ? undefined : currency,
      })
      setMacro(macroRes)
    } catch {
      setError('Unable to load macro events for the selected filters.')
    } finally {
      if (withSpinner) setLoadingMacro(false)
    }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [earningsRes, macroRes, remindersRes] = await Promise.all([
        getEarningsEvents({ watchlist_only: true }),
        getEconomicEvents({ from: `${defaultFrom}T00:00:00`, to: `${defaultTo}T23:59:59` }),
        getEventReminders(),
      ])
      setEarnings(earningsRes)
      setMacro(macroRes)
      setReminders(remindersRes)
    } catch {
      setError('Unable to load calendar data.')
    } finally {
      setLoading(false)
    }
  }, [defaultFrom, defaultTo])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const reminderMap = useMemo(() => {
    const set = new Set<string>()
    for (const r of reminders) {
      const key = `${r.economic_event?.id ?? 'e'}:${r.earnings_event?.id ?? 'x'}:${r.offset_minutes}`
      set.add(key)
    }
    return set
  }, [reminders])

  const createReminder = async (payload: { economic_event_id?: number; earnings_event_id?: number; offset_minutes: number }) => {
    const key = `${payload.economic_event_id ?? 'e'}:${payload.earnings_event_id ?? 'x'}:${payload.offset_minutes}`
    setSavingKey(key)
    try {
      await createEventReminder(payload)
      const latest = await getEventReminders()
      setReminders(latest)
    } catch {
      setError('Unable to create reminder.')
    } finally {
      setSavingKey(null)
    }
  }

  const removeReminder = async (id: number) => {
    try {
      await deleteEventReminder(id)
      setReminders((prev) => prev.filter((r) => r.id !== id))
    } catch {
      setError('Unable to delete reminder.')
    }
  }

  const applyMacroFilters = () => {
    if (macroFrom > macroTo) {
      setError('Start date must be before end date.')
      return
    }
    setError(null)
    void loadMacro(macroFrom, macroTo, macroCurrency)
  }

  const shiftMacroRange = (direction: -1 | 1) => {
    const days = rangeLengthDays(macroFrom, macroTo)
    const nextFrom = addDaysToDateInput(macroFrom, direction * days)
    const nextTo = addDaysToDateInput(macroTo, direction * days)
    setMacroFrom(nextFrom)
    setMacroTo(nextTo)
    setError(null)
    void loadMacro(nextFrom, nextTo, macroCurrency)
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="Upcoming earnings and macroeconomic events with reminders"
        breadcrumbs={[{ label: 'Market', to: '/' }, { label: 'Calendar' }]}
      />

      {loading ? (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} sx={{ color: 'rgba(0,212,255,0.5)' }} />
        </Box>
      ) : (
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <Paper sx={{ overflow: 'hidden' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab value="earnings" label={`Earnings (${earnings.length})`} />
              <Tab value="macro" label={`Macro Events (${macro.length})`} />
            </Tabs>
            <Box sx={{ p: 1.5 }}>
              {tab === 'earnings' && (
                <Stack spacing={1}>
                  {earnings.length === 0 && (
                    <Typography sx={{ color: 'rgba(224,230,240,0.35)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem', py: 2 }}>
                      No watchlist earnings events found yet.
                    </Typography>
                  )}
                  {earnings.map((eventItem) => {
                    const badge = eventBadge(eventItem.scheduled_at)
                    const oneHourKey = `e:${eventItem.id}:60`
                    const oneDayKey = `e:${eventItem.id}:1440`
                    return (
                      <Paper key={eventItem.id} variant="outlined" sx={{ p: 1.2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Box>
                            <Typography sx={{ color: '#00d4ff', fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>
                              {eventItem.ticker} {eventItem.company_name ? `- ${eventItem.company_name}` : ''}
                            </Typography>
                            <Typography sx={{ color: 'rgba(224,230,240,0.45)', fontSize: '0.78rem', fontFamily: '"JetBrains Mono", monospace' }}>
                              {new Date(eventItem.scheduled_at).toLocaleString()} ({eventItem.session})
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            {badge && <Chip size="small" label={badge.label} sx={{ bgcolor: `${badge.color}20`, color: badge.color, border: `1px solid ${badge.color}40` }} />}
                            <Button
                              size="small"
                              startIcon={<NotificationsActiveIcon sx={{ fontSize: 14 }} />}
                              onClick={() => createReminder({ earnings_event_id: eventItem.id, offset_minutes: 60 })}
                              disabled={reminderMap.has(oneHourKey) || savingKey === oneHourKey}
                            >
                              1h
                            </Button>
                            <Button
                              size="small"
                              onClick={() => createReminder({ earnings_event_id: eventItem.id, offset_minutes: 1440 })}
                              disabled={reminderMap.has(oneDayKey) || savingKey === oneDayKey}
                            >
                              1d
                            </Button>
                          </Stack>
                        </Box>
                      </Paper>
                    )
                  })}
                </Stack>
              )}

              {tab === 'macro' && (
                <Stack spacing={1}>
                  <Paper variant="outlined" sx={{ p: 1.2 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
                      <TextField
                        select
                        size="small"
                        label="Currency"
                        value={macroCurrency}
                        onChange={(e) => setMacroCurrency(e.target.value as MacroCurrency)}
                        sx={{ minWidth: 140 }}
                      >
                        <MenuItem value="ALL">All</MenuItem>
                        <MenuItem value="USD">USD</MenuItem>
                        <MenuItem value="EUR">EUR</MenuItem>
                        <MenuItem value="GBP">GBP</MenuItem>
                        <MenuItem value="JPY">JPY</MenuItem>
                      </TextField>
                      <TextField
                        size="small"
                        type="date"
                        label="From"
                        value={macroFrom}
                        onChange={(e) => setMacroFrom(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        size="small"
                        type="date"
                        label="To"
                        value={macroTo}
                        onChange={(e) => setMacroTo(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                      <Button size="small" onClick={() => shiftMacroRange(-1)}>
                        Back
                      </Button>
                      <Button size="small" onClick={() => shiftMacroRange(1)}>
                        Forward
                      </Button>
                      <Button size="small" variant="contained" onClick={applyMacroFilters}>
                        Apply
                      </Button>
                    </Stack>
                  </Paper>
                  {loadingMacro && (
                    <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                      <CircularProgress size={20} sx={{ color: 'rgba(0,212,255,0.5)' }} />
                    </Box>
                  )}
                  {!loadingMacro && macro.length === 0 && (
                    <Typography sx={{ color: 'rgba(224,230,240,0.35)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem', py: 1 }}>
                      No macro events for these filters.
                    </Typography>
                  )}
                  {macro.map((eventItem) => {
                    const badge = eventBadge(eventItem.scheduled_at)
                    const oneHourKey = `${eventItem.id}:x:60`
                    const oneDayKey = `${eventItem.id}:x:1440`
                    return (
                      <Paper key={eventItem.id} variant="outlined" sx={{ p: 1.2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                          <Box>
                            <Typography sx={{ color: '#e0e6f0', fontFamily: '"JetBrains Mono", monospace', fontWeight: 700 }}>
                              {eventItem.title}
                            </Typography>
                            <Typography sx={{ color: 'rgba(224,230,240,0.45)', fontSize: '0.78rem', fontFamily: '"JetBrains Mono", monospace' }}>
                              {new Date(eventItem.scheduled_at).toLocaleString()} ({eventItem.country}/{eventItem.currency}) - {eventItem.importance}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            {badge && <Chip size="small" label={badge.label} sx={{ bgcolor: `${badge.color}20`, color: badge.color, border: `1px solid ${badge.color}40` }} />}
                            <Button
                              size="small"
                              startIcon={<NotificationsActiveIcon sx={{ fontSize: 14 }} />}
                              onClick={() => createReminder({ economic_event_id: eventItem.id, offset_minutes: 60 })}
                              disabled={reminderMap.has(oneHourKey) || savingKey === oneHourKey}
                            >
                              1h
                            </Button>
                            <Button
                              size="small"
                              onClick={() => createReminder({ economic_event_id: eventItem.id, offset_minutes: 1440 })}
                              disabled={reminderMap.has(oneDayKey) || savingKey === oneDayKey}
                            >
                              1d
                            </Button>
                          </Stack>
                        </Box>
                      </Paper>
                    )
                  })}
                </Stack>
              )}
            </Box>
          </Paper>

          <Paper sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <EventIcon sx={{ fontSize: 16, color: 'rgba(0,212,255,0.6)' }} />
              <Typography sx={{ fontSize: '0.72rem', letterSpacing: '0.08em', color: 'rgba(0,212,255,0.6)', fontWeight: 700 }}>
                ACTIVE REMINDERS
              </Typography>
            </Box>
            <Stack spacing={0.8}>
              {reminders.length === 0 && (
                <Typography sx={{ color: 'rgba(224,230,240,0.35)', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}>
                  No reminders configured.
                </Typography>
              )}
              {reminders.map((r) => (
                <Paper key={r.id} variant="outlined" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.78rem', fontFamily: '"JetBrains Mono", monospace', color: 'rgba(224,230,240,0.75)' }}>
                    {r.earnings_event ? `${r.earnings_event.ticker} earnings` : r.economic_event?.title} - {r.offset_minutes >= 1440 ? `${r.offset_minutes / 1440} day` : `${r.offset_minutes / 60} hour`} before
                  </Typography>
                  <Button size="small" color="error" startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />} onClick={() => removeReminder(r.id)}>
                    Remove
                  </Button>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Stack>
      )}
    </>
  )
}
