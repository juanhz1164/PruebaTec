import { useEffect, useState, type FormEvent } from 'react'
import { crearUsuario } from '../api/usuarios'
import { getSucursales } from '../api/sucursales'
import { ApiError } from '../api/client'
import { ROL_LABEL, type Rol } from '../types/auth'
import type { Sucursal } from '../types/sucursal'

// El Administrador solo crea Gerentes y Operadores desde este panel; un
// segundo Admin general no se crea por esta vía.
const ROLES_CREABLES: Rol[] = ['GerenteSucursal', 'OperadorInventario']

export function UsuarioForm({ onCreado }: { onCreado: () => void }) {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalId, setSucursalId] = useState<number | null>(null)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<Rol>('OperadorInventario')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    getSucursales()
      .then((data) => {
        setSucursales(data)
        setSucursalId((current) => current ?? data[0]?.id ?? null)
      })
      .catch(() => setError('No se pudo cargar el listado de sucursales'))
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!sucursalId) {
      setError('Selecciona una sucursal')
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await crearUsuario({ sucursalId, nombre, email, password, rol })
      setNombre('')
      setEmail('')
      setPassword('')
      onCreado()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el usuario')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="orden-form" onSubmit={handleSubmit}>
      <div className="form-row-inline">
        <div className="form-row">
          <label htmlFor="usr-nombre">Nombre</label>
          <input
            id="usr-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="usr-email">Email</label>
          <input
            id="usr-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="usr-password">Contraseña</label>
          <input
            id="usr-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div className="form-row">
          <label htmlFor="usr-rol">Rol</label>
          <select id="usr-rol" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
            {ROLES_CREABLES.map((r) => (
              <option key={r} value={r}>
                {ROL_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="usr-sucursal">Sucursal</label>
          <select
            id="usr-sucursal"
            value={sucursalId ?? ''}
            onChange={(e) => setSucursalId(Number(e.target.value))}
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creando...' : 'Crear usuario'}
      </button>
    </form>
  )
}
