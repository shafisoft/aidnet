import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n, { STORAGE_KEY, detectLanguage, persistLanguage } from './config'

function setBrowserLanguage(language: string) {
  vi.stubGlobal('navigator', { ...navigator, language })
}

describe('i18n language detection', () => {
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    vi.unstubAllGlobals()
  })

  it('keeps English for an English browser', () => {
    setBrowserLanguage('en-US')
    expect(detectLanguage()).toBe('en')
  })

  it('detects Bangla from the browser language', () => {
    setBrowserLanguage('bn-BD')
    expect(detectLanguage()).toBe('bn')
  })

  it('falls back to Bangla for any other browser language', () => {
    setBrowserLanguage('fr-FR')
    expect(detectLanguage()).toBe('bn')
  })

  it('prefers the saved choice over the browser language', () => {
    setBrowserLanguage('en-US')
    window.localStorage.setItem(STORAGE_KEY, 'bn')
    expect(detectLanguage()).toBe('bn')
  })

  it('falls back to browser detection for unknown saved values', () => {
    setBrowserLanguage('bn-BD')
    window.localStorage.setItem(STORAGE_KEY, 'fr')
    expect(detectLanguage()).toBe('bn')
  })
})

describe('persistLanguage', () => {
  afterEach(async () => {
    window.localStorage.removeItem(STORAGE_KEY)
    await i18n.changeLanguage('en')
    vi.restoreAllMocks()
  })

  it('stores the choice and switches the active language', async () => {
    await persistLanguage('bn')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('bn')
    expect(i18n.language).toBe('bn')
  })

  it('resolves missing keys through the English fallback', async () => {
    await persistLanguage('bn')
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key')
    expect(i18n.t('campaigns.title')).toBe('ক্যাম্পেইন খুঁজুন')
  })
})
