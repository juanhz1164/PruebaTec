import { useState } from 'react'

// Input de contraseña con botón de mostrar/ocultar, mismo patrón visual que
// ya existe en LoginPage.tsx (mismos SVGs de ojo/ojo tachado) pero con clases
// propias que usan las variables del tema de la app (--text/--border/etc.) en
// vez de las --login-* de la pantalla de login, para poder reutilizarlo
// dentro de modales (crear/editar usuario).
export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  minLength?: number
  autoComplete?: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="password-field">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M3 3l18 18M10.58 10.58a2 2 0 0 0 2.83 2.83M9.88 4.24A9.4 9.4 0 0 1 12 4c5.5 0 9.5 4.5 10.5 8-.4 1.4-1.14 2.79-2.15 4.02M6.6 6.6C4.4 8.05 2.8 10.1 1.5 12c1 3.5 5 8 10.5 8 1.42 0 2.73-.3 3.9-.82"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M1.5 12C2.5 8.5 6.5 4 12 4s9.5 4.5 10.5 8c-1 3.5-5 8-10.5 8s-9.5-4.5-10.5-8Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        )}
      </button>
    </div>
  )
}
