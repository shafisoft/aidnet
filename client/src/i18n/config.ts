import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import bn from './locales/bn.json'

export const STORAGE_KEY = 'donate.language'

export const LANGUAGES = [
  { code: 'bn', label: 'বাংলা' },
  { code: 'en', label: 'English' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']

function isLanguageCode(value: string | null): value is LanguageCode {
  return value === 'en' || value === 'bn'
}

// Resolution order: saved preference → browser language → Bangla (default).
export function detectLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'bn'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (isLanguageCode(stored)) return stored
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'bn'
}

// The app is a client-only static export: one global instance, initialised
// at import time. Hydration law: the static export always renders Bangla, so
// the first client render must be Bangla too — the saved/browser preference is
// applied after mount via syncLanguage(). Components use useTranslation();
// explicit switching goes through persistLanguage so the choice survives
// reloads.
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      bn: { translation: bn },
    },
    lng: 'bn',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
}

// Called once from I18nProvider after mount: applies the saved preference
// (or browser language) post-hydration, so server and client first paint agree.
export function syncLanguage() {
  return i18n.changeLanguage(detectLanguage())
}

export function persistLanguage(language: LanguageCode) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, language)
  }
  return i18n.changeLanguage(language)
}

export default i18n
