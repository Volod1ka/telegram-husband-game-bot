import i18n, { type LanguageDetectorAsyncModule } from 'i18next'
import translationEN from './locales/en.json'
import translationUK from './locales/uk.json'

const LANGUAGES = ['uk', 'en'] as const

export const FALLBACK_LANG: Language = 'uk'
export const defaultNS = 'translation'

export type Language = (typeof LANGUAGES)[number]

export const t = i18n.t.bind(i18n)

export const getLanguage = () => {
  return i18n.language
}

export const changeLanguage = async (lang: Language) => {
  await i18n.changeLanguage(lang)
}

export const resources = {
  uk: { translation: translationUK },
  en: { translation: translationEN },
} satisfies Record<Language, Record<typeof defaultNS, object>>

const languageDetector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  init: () => {},
  detect: callback => {
    callback(FALLBACK_LANG)
  },
}

i18n.use(languageDetector).init({
  resources,
  defaultNS,
  keySeparator: '.',
  interpolation: {
    escapeValue: false,
  },
})

export { default } from 'i18next'
