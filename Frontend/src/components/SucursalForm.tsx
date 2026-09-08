import { useState, type FormEvent } from 'react'
import { crearSucursal } from '../api/sucursales'
import { ApiError } from '../api/client'

export function SucursalForm({ onCreada }: { onCreada: () => void }) {
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [telefono, setTelefono] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await crearSucursal({
        nombre,
        direccion: direccion || null,
        ciudad: ciudad || null,
        telefono: telefono || null,
      })
      setNombre('')
      setDireccion('')
      setCiudad('')
      setTelefono('')
      onCreada()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la sucursal')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="orden-form" onSubmit={handleSubmit}>
      <div className="form-row-inline">
        <div className="form-row">
          <label htmlFor="suc-nombre">Nombre</label>
          <input
            id="suc-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="suc-ciudad">Ciudad</label>
          <input id="suc-ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
        </div>
        <div className="form-row">
          <label htmlFor="suc-direccion">Dirección</label>
          <input
            id="suc-direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label htmlFor="suc-telefono">Teléfono</label>
          <input
            id="suc-telefono"
            type="tel"
            inputMode="numeric"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
          />
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creando...' : 'Crear sucursal'}
      </button>
    </form>
  )
}
