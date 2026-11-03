'use client'

import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, persistLanguage, type LanguageCode } from '@/i18n/config'

export function useLanguage() {
  const { i18n } = useTranslation()
  const language = (i18n.resolvedLanguage ?? 'bn') as LanguageCode

  const setLanguage = useCallback((code: LanguageCode) => {
    return persistLanguage(code)
  }, [])

  return { language, setLanguage, languages: LANGUAGES }
}
