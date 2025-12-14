'use client'

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { THEME_STORAGE_KEY } from '@/lib/theme'
import { createClient } from '@/lib/supabase/client'

export type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getPreferredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  // Default to light mode (no system preference detection)
  return 'light'
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const supabase = useMemo(() => createClient(), [])

  // Save theme to database
  const saveThemeToDb = useCallback(async (newTheme: Theme) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ dark_mode: newTheme === 'dark' })
          .eq('id', user.id)
      }
    } catch (error) {
      // Silently fail - localStorage will still work
      console.error('Failed to save theme to database:', error)
    }
  }, [supabase])

  useEffect(() => {
    const initial = getPreferredTheme()
    setThemeState(initial)
    applyTheme(initial)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // ignore
    }
    applyTheme(next)
    // Also save to database
    saveThemeToDb(next)
  }, [saveThemeToDb])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    }),
    [theme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
