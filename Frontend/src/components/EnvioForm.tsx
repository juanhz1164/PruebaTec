import { useState, type FormEvent } from 'react'
import { Truck } from 'lucide-react'
import { Modal } from './Modal'
import { DatePicker } from './DatePicker'
import { PRIORIDAD_TRANSFERENCIA_LABEL } from '../types/transferencia'
import type { RegistrarEnvio, Transferencia } from '../types/transferencia'
import { registrarEnvioTransferencia } from '../api/transferencias'
import { ApiError } from '../api/client'

// Modal "Enviar transferencia": distinto del modal "Agregar producto" (ese
// solo maneja producto+cantidad) y distinto de la solicitud (ahí se define
// la prioridad). Este modal captura EXCLUSIVAMENTE los datos del envío
// logístico: transportista, ruta, costo, fecha estimada de llegada — la
// prioridad ya quedó fija desde la solicitud y aquí solo se muestra como
// información de solo lectura, nunca se vuelve a pedir.
export function EnvioForm({
  transferencia,
  onEnviada,
  onCerrar,
}: {
  transferencia: Transferencia
  onEnviada: () => void
  onCerrar: () => void
}) {
  const [transportista, setTransportista] = useState('')
  const [ruta, setRuta] = useState(
    `${transferencia.sucursalOrigenNombre} → ${transferencia.sucursalDestinoNombre}`,
  )
  const [costoEnvio, setCostoEnvio] = useState('')
  const [fechaEstimada, setFechaEstimada] = useState(() => {
    const manana = new Date()
    manana.setDate(manana.getDate() + 1)
    return manana.toISOString().slice(0, 10)
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    const costo = costoEnvio.trim() === '' ? null : Number(costoEnvio)
    if (costo !== null && (!Number.isFinite(costo) || costo < 0)) {
      setError('El costo de transporte debe ser un número válido mayor o igual a cero.')
      return
    }

    const dto: RegistrarEnvio = {
      transportista: transportista.trim() || null,
      ruta: ruta.trim() || null,
      costoEnvio: costo,
      fechaEstimadaLlegada: fechaEstimada ? `${fechaEstimada}T00:00:00` : null,
      lineas: transferencia.lineas.map((l) => ({
        transferenciaLineaId: l.id,
        cantidadEnviada: l.cantidadSolicitada,
      })),
    }

    setIsSubmitting(true)
    try {
      await registrarEnvioTransferencia(transferencia.id, dto)
      onEnviada()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el envío')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title="Enviar transferencia"
      description={`Transferencia #${transferencia.id} · ${transferencia.sucursalOrigenNombre} → ${transferencia.sucursalDestinoNombre}`}
      onClose={onCerrar}
    >
      <form className="tr-envio-form" onSubmit={handleSubmit}>
        {transferencia.prioridad !== null && (
          <div className="tr-envio-prioridad">
            <span>Prioridad</span>
            <strong className={`tr-prioridad-chip tr-prioridad-chip--activa tr-prioridad-chip--${transferencia.prioridad}`}>
              {PRIORIDAD_TRANSFERENCIA_LABEL[transferencia.prioridad]}
            </strong>
          </div>
        )}

        <div className="form-row">
          <label htmlFor="envio-transportista">Transportista</label>
          <input
            id="envio-transportista"
            type="text"
            placeholder="Ej. Transportes XYZ"
            value={transportista}
            onChange={(e) => setTransportista(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-row">
          <label htmlFor="envio-ruta">Ruta</label>
          <input
            id="envio-ruta"
            type="text"
            value={ruta}
            onChange={(e) => setRuta(e.target.value)}
          />
        </div>

        <div className="form-row-inline">
          <div className="form-row">
            <label htmlFor="envio-costo">Costo de transporte</label>
            <input
              id="envio-costo"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0"
              value={costoEnvio}
              onChange={(e) => setCostoEnvio(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label htmlFor="envio-fecha">Fecha estimada de llegada</label>
            <DatePicker value={fechaEstimada} onChange={setFechaEstimada} className="tr-envio-fecha" />
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="danger-button" onClick={onCerrar} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            <Truck size={14} strokeWidth={2.3} />
            {isSubmitting ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
