import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { MoonStar, SunMedium } from 'lucide-react'

const STORAGE_KEY = 'collabify-theme'
const VALID_THEMES = new Set(['dark', 'light'])

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext(null)

function readInitialTheme() {
  if (typeof window === 'undefined') return 'dark'

  const storedTheme = window.localStorage.getItem(STORAGE_KEY)
  if (VALID_THEMES.has(storedTheme)) return storedTheme

  return 'dark'
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return

  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  if (document.body) {
    document.body.dataset.theme = theme
    document.body.style.colorScheme = theme
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore storage failures
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(() => ({
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    setTheme,
    toggleTheme,
  }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}

export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={`theme-toggle-button ${className}`.trim()}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      onClick={toggleTheme}
    >
      {isDark ? <SunMedium aria-hidden="true" /> : <MoonStar aria-hidden="true" />}
    </button>
  )
}
