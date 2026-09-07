import { useTheme } from '../theme/ThemeContext'

export function ThemeToggle() {
  const { tema, alternarTema } = useTheme()
  const esOscuro = tema === 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={alternarTema}
      aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={esOscuro ? 'Modo claro' : 'Modo oscuro'}
    >
      {esOscuro ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.6 5.4l-1.55 1.55M6.95 17.05 5.4 18.6M18.6 18.6l-1.55-1.55M6.95 6.95 5.4 5.4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
          <path
            d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
