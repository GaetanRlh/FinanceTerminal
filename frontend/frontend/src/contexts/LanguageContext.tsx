import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { en, type MessageKey } from '../locales/en'
import { fr } from '../locales/fr'

export type Locale = 'en' | 'fr'

const tables: Record<Locale, Record<MessageKey, string>> = { en: en as Record<MessageKey, string>, fr }

export type LanguageContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: MessageKey) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

const STORAGE_KEY = 'ft_locale'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'en'
    return window.localStorage.getItem(STORAGE_KEY) === 'fr' ? 'fr' : 'en'
  })

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, l)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const t = useMemo(
    () => (key: MessageKey) => tables[locale][key] ?? key,
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return ctx
}
