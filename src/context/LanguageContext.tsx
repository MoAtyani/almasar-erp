'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { Language, translate } from '@/lib/i18n'

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  toggleLang: () => void
  t: (key: string) => string
  dir: 'rtl' | 'ltr'
  isRtl: boolean
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
  t: (k: string) => k,
  dir: 'ltr',
  isRtl: false,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en')

  useEffect(() => {
    const saved = localStorage.getItem('almasar_lang') as Language
    if (saved && (saved === 'en' || saved === 'ar')) {
      setLangState(saved)
      applyDirection(saved)
    } else {
      applyDirection('en')
    }
  }, [])

  function applyDirection(currentLang: Language) {
    const direction = currentLang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.setAttribute('lang', currentLang)
    document.documentElement.setAttribute('dir', direction)
    if (document.body) {
      document.body.setAttribute('dir', direction)
    }
  }

  function setLang(newLang: Language) {
    setLangState(newLang)
    localStorage.setItem('almasar_lang', newLang)
    applyDirection(newLang)
  }

  function toggleLang() {
    setLang(lang === 'en' ? 'ar' : 'en')
  }

  const t = (key: string) => translate(key, lang)
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const isRtl = lang === 'ar'

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, dir, isRtl }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
