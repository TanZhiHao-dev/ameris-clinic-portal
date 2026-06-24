import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { dict, type DictKey } from './i18n-dict'

export type Lang = 'id' | 'en'

const KEY = 'ameris-lang'

type Vars = Record<string, string | number>

type I18nCtx = {
  lang: Lang
  setLang: (l: Lang) => void
  toggle: () => void
  /** Translate a key. Pass vars to fill `{placeholders}`. Falls back to ID, then the key. */
  t: (key: DictKey, vars?: Vars) => string
}

const Ctx = createContext<I18nCtx | null>(null)

function fill(s: string, vars?: Vars) {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Default to Indonesian on the server; hydrate the saved choice on the client.
  // Indonesian-first means ID visitors never see a flash; EN visitors who opted
  // in see a one-frame swap after hydration, which is acceptable.
  const [lang, setLangState] = useState<Lang>('id')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved === 'en' || saved === 'id') setLangState(saved)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, lang)
    } catch {
      /* ignore */
    }
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => setLangState(l), [])
  const toggle = useCallback(() => setLangState((l) => (l === 'id' ? 'en' : 'id')), [])

  const t = useCallback(
    (key: DictKey, vars?: Vars) => {
      const entry = dict[key]
      if (!entry) return key
      return fill(entry[lang] ?? entry.id, vars)
    },
    [lang],
  )

  return <Ctx.Provider value={{ lang, setLang, toggle, t }}>{children}</Ctx.Provider>
}

export function useI18n() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useI18n must be used within I18nProvider')
  return c
}

// Pick a localized value for owner-managed content (e.g. treatment subtitles):
// the English text when the site is in English AND it exists, else the default.
export function pickLang(lang: Lang, id: string, en?: string | null): string {
  return lang === 'en' && en ? en : id
}
