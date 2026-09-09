import { useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { confirmarRecepcionTransferencia } from '../api/transferencias'
import type { Transferencia } from '../types/transferencia'
import { ApiError } from '../api/client'

export function RecepcionForm({
  transferencia,
  onConfirmada,
  onCerrar,
}: {
  transferencia: Transferencia
  onConfirmada: () => void
  onCerrar: () => void
}) {
  const [cantidades, setCantidades] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      transferencia.lineas.map((l) => [l.id, String(l.cantidadEnviada)]),
    ),
  )
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const lineas: { transferenciaLineaId: number; cantidadRecibida: number }[] = []
    for (const linea of transferencia.lineas) {
      const valor = Number(cantidades[linea.id])
      if (!Number.isFinite(valor) || valor < 0) {
        setError(`Cantidad recibida inválida para ${linea.productoNombre}`)
        return
      }
      if (valor > linea.cantidadEnviada) {
        setError(
          `No puedes recibir más de lo enviado para ${linea.productoNombre} (enviado: ${linea.cantidadEnviada})`,
        )
        return
      }
      lineas.push({ transferenciaLineaId: linea.id, cantidadRecibida: valor })
    }

    setError(null)
    setIsSubmitting(true)
    try {
      await confirmarRecepcionTransferencia(transferencia.id, { lineas })
      onConfirmada()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo confirmar la recepción')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="orden-form recepcion-form" onSubmit={handleSubmit}>
      <h2>
        Confirmar recepción — {transferencia.sucursalOrigenNombre} →{' '}
        {transferencia.sucursalDestinoNombre}
      </h2>

      <table className="data-table lineas-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad enviada</th>
            <th>Cantidad recibida</th>
          </tr>
        </thead>
        <tbody>
          {transferencia.lineas.map((linea) => (
            <tr key={linea.id}>
              <td>{linea.productoNombre}</td>
              <td>{linea.cantidadEnviada}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  max={linea.cantidadEnviada}
                  step="1"
                  inputMode="numeric"
                  value={cantidades[linea.id] ?? ''}
                  onChange={(e) =>
                    setCantidades((prev) => ({
                      ...prev,
                      [linea.id]: e.target.value.replace(/[^0-9]/g, ''),
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === '.' || e.key === ',') e.preventDefault()
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {error && <p className="error-text">{error}</p>}

      <div className="acciones-cell">
        <button type="button" className="danger-button" onClick={onCerrar}>
          Cancelar
        </button>
        <button type="submit" className="success-button" disabled={isSubmitting}>
          <Check size={14} strokeWidth={2.3} />
          {isSubmitting ? 'Confirmando...' : 'Confirmar recepción'}
        </button>
      </div>
    </form>
  )
}
