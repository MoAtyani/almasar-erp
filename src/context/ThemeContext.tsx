'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isLight: boolean
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  isLight: false,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    // Read from localStorage or system preference
    const saved = localStorage.getItem('almasar_theme') as Theme
    if (saved === 'light' || saved === 'dark') {
      setThemeState(saved)
      applyTheme(saved)
    } else {
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      const initial: Theme = prefersLight ? 'light' : 'dark'
      setThemeState(initial)
      applyTheme(initial)
    }
  }, [])

  function applyTheme(currentTheme: Theme) {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', currentTheme)
      if (currentTheme === 'light') {
        document.documentElement.classList.add('light-theme')
        document.documentElement.classList.remove('dark-theme')
        document.body.classList.add('light-theme')
        document.body.classList.remove('dark-theme')
      } else {
        document.documentElement.classList.add('dark-theme')
        document.documentElement.classList.remove('light-theme')
        document.body.classList.add('dark-theme')
        document.body.classList.remove('light-theme')
      }
    }
  }

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme)
    localStorage.setItem('almasar_theme', newTheme)
    applyTheme(newTheme)
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isLight: theme === 'light' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
