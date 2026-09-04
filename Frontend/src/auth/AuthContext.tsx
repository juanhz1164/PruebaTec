import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setAuthToken } from '../api/client'
import { login as loginRequest } from '../api/auth'
import { normalizarRol, type LoginRequest, type Usuario } from '../types/auth'

const STORAGE_KEY = 'inventario.session'

interface StoredSession {
  token: string
  expiraEn: string
  usuario: Usuario
}

interface AuthContextValue {
  usuario: Usuario | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredSession(): StoredSession | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as StoredSession
    if (new Date(session.expiraEn) <= new Date()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    session.usuario.rol = normalizarRol(session.usuario.rol)
    return session
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = readStoredSession()
    if (stored) {
      setAuthToken(stored.token)
      setSession(stored)
    }
    setIsLoading(false)
  }, [])

  const login = async (data: LoginRequest) => {
    const response = await loginRequest(data)
    const nuevaSesion: StoredSession = {
      token: response.token,
      expiraEn: response.expiraEn,
      usuario: { ...response.usuario, rol: normalizarRol(response.usuario.rol) },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevaSesion))
    setAuthToken(nuevaSesion.token)
    setSession(nuevaSesion)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setAuthToken(null)
    setSession(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      usuario: session?.usuario ?? null,
      token: session?.token ?? null,
      isAuthenticated: session !== null,
      isLoading,
      login,
      logout,
    }),
    [session, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
