'use client'

import { useEffect, type ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n, { type LanguageCode } from './config'

// Mounted once in the root layout. Keeps <html lang> in sync so browsers,
// screen readers and font fallbacks follow the active language.
export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Language switching does NOT happen here: the layout hydrates before the
    // page content (see app/template.tsx for why). This provider only keeps
    // <html lang> in sync so browsers, screen readers and font fallbacks
    // follow the active language.
    const sync = (lng: string) => {
      document.documentElement.lang = lng
    }
    sync((i18n.resolvedLanguage ?? 'bn') as LanguageCode)
    i18n.on('languageChanged', sync)
    return () => {
      i18n.off('languageChanged', sync)
    }
  }, [])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
