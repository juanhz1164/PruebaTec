import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Tema = 'light' | 'dark'

const STORAGE_KEY = 'tema-preferido'

interface ThemeContextValue {
  tema: Tema
  alternarTema: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function leerTemaGuardado(): Tema {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY)
    if (guardado === 'light' || guardado === 'dark') return guardado
  } catch {
    // localStorage puede no estar disponible (modo privado, etc.): se usa el default.
  }
  return 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(leerTemaGuardado)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    try {
      localStorage.setItem(STORAGE_KEY, tema)
    } catch {
      // Sin persistencia disponible: el tema solo dura la sesión actual.
    }
  }, [tema])

  const alternarTema = () => setTema((actual) => (actual === 'dark' ? 'light' : 'dark'))

  return <ThemeContext.Provider value={{ tema, alternarTema }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider')
  }
  return context
}
