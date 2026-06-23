import { useI18n } from '../../lib/i18n'

// Compact ID/EN pill toggle. Used in both the landing header and the in-app
// header so customers can switch language anywhere on the public site.
export function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang, t } = useI18n()

  return (
    <div
      className={`inline-flex shrink-0 items-center rounded-full p-0.5 ${className}`}
      style={{ border: '1px solid var(--color-line)', background: 'var(--color-shell)' }}
      role="group"
      aria-label={t('lang.aria')}
    >
      {(['id', 'en'] as const).map((l) => {
        const active = lang === l
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            className="rounded-full px-2.5 py-1 text-[0.72rem] font-bold uppercase tracking-wide transition"
            style={
              active
                ? { background: 'var(--color-ink)', color: 'var(--color-cream)' }
                : { background: 'transparent', color: 'var(--color-ink-muted)' }
            }
          >
            {l}
          </button>
        )
      })}
    </div>
  )
}
