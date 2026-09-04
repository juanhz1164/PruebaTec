import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api/client'

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? '/'
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login({ email, password })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'El correo o la contraseña no son correctos.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <aside className="login-panel" aria-hidden="true">
        <div className="login-panel-pattern" />
        <div className="login-panel-content">
          <div className="login-panel-brand">
            <span className="login-panel-mark">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
                <path
                  d="M12 3 3 7.5v9L12 21l9-4.5v-9z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 7.5 12 12l9-4.5M12 12v9"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="login-panel-brand-name">Inventario Multi-Sucursal</span>
          </div>

          <div className="login-panel-copy">
            <h1>Gestiona tu inventario de forma simple, centralizada y eficiente.</h1>
            <p>
              Controla stock, transferencias y ventas de todas tus sucursales desde un solo
              lugar.
            </p>
          </div>

          <ul className="login-panel-stats">
            <li>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                <path
                  d="M4 21V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v15M14 21v-9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v9M2 21h20"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Sucursales conectadas en tiempo real</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                <path
                  d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Trazabilidad completa de productos</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                <rect x="3" y="12" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="10" y="8" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="17" y="4" width="4" height="16" rx="1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Reportes y estadísticas centralizadas</span>
            </li>
          </ul>
        </div>
      </aside>

      <main className="login-form-side">
        <form className="login-card" onSubmit={handleSubmit} noValidate>
          <div className="login-card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
              <path
                d="M12 3 3 7.5v9L12 21l9-4.5v-9z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M3 7.5 12 12l9-4.5M12 12v9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h2 className="login-title">Bienvenido de nuevo</h2>
          <p className="login-subtitle">Ingresa tus credenciales para continuar</p>

          {error && (
            <div className="login-alert" role="alert">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12 8v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="login-field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="nombre@empresa.com"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Contraseña</label>
            <div className="login-password-field">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
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
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
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
          </div>

          <button type="submit" className="login-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="login-spinner" aria-hidden="true" />
                Autenticando...
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>
      </main>
    </div>
  )
}
