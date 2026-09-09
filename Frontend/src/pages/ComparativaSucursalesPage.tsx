import { useEffect, useMemo, useState } from 'react'
import { getComparativaSucursales } from '../api/dashboard'
import { getFlujoPersonasPorDia, getFlujoPersonasPorMes } from '../api/visitas'
import { HorizontalBarChart } from '../components/HorizontalBarChart'
import { DoughnutChart } from '../components/DoughnutChart'
import { LineChart } from '../components/LineChart'
import { KpiTile } from '../components/KpiTile'
import { MonthPicker } from '../components/MonthPicker'
import { DatePicker } from '../components/DatePicker'
import type { ComparativaSucursal } from '../types/dashboard'
import type { FlujoPersonasResumen } from '../types/visita'
import { ApiError } from '../api/client'
import { formatearMoneda } from '../utils/format'
import { crearMapaColoresSucursal } from '../utils/sucursalColor'

type AnalisisTab = 'ventas' | 'inventario' | 'participacion' | 'stockCritico' | 'flujoPersonas'

const TABS: { id: AnalisisTab; label: string }[] = [
  { id: 'ventas', label: 'Ventas' },
  { id: 'inventario', label: 'Inventario' },
  { id: 'participacion', label: 'Participación' },
  { id: 'stockCritico', label: 'Stock crítico' },
  { id: 'flujoPersonas', label: 'Flujo de personas' },
]

type TipoPeriodo = 'dia' | 'mes'

// El backend filtra "el día"/"el mes" en hora de Colombia (ver
// ZonaHorariaColombia), así que "hoy" debe calcularse en hora local aquí
// también — toISOString() es UTC y desalinearía el día cerca de la medianoche.
function hoyIso(): string {
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function mesActualIso(): string {
  return hoyIso().slice(0, 7)
}

function formatearFechaCorta(fechaIso: string): string {
  const [, mes, dia] = fechaIso.split('-')
  return `${dia}/${mes}`
}

function completarHoras(
  porHora: { hora: number; cantidadPersonas: number; cantidadVisitas: number }[],
  metrica: 'personas' | 'visitas',
): { label: string; value: number }[] {
  const valoresPorHora = new Map(porHora.map((h) => [h.hora, h]))
  return Array.from({ length: 24 }, (_, hora) => {
    const dato = valoresPorHora.get(hora)
    const value = dato ? (metrica === 'personas' ? dato.cantidadPersonas : dato.cantidadVisitas) : 0
    return { label: `${String(hora).padStart(2, '0')}:00`, value }
  })
}

export function ComparativaSucursalesPage() {
  const [comparativa, setComparativa] = useState<ComparativaSucursal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<AnalisisTab>('ventas')

  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>('dia')
  const [fechaDia, setFechaDia] = useState(hoyIso())
  const [fechaMes, setFechaMes] = useState(mesActualIso())
  const [flujo, setFlujo] = useState<FlujoPersonasResumen | null>(null)
  const [isLoadingFlujo, setIsLoadingFlujo] = useState(false)
  const [errorFlujo, setErrorFlujo] = useState<string | null>(null)
  const [flujoMetrica, setFlujoMetrica] = useState<'personas' | 'visitas'>('personas')

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    getComparativaSucursales()
      .then(setComparativa)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la comparativa')
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (tab !== 'flujoPersonas') return

    let cancelled = false
    setIsLoadingFlujo(true)
    setErrorFlujo(null)

    const peticion =
      tipoPeriodo === 'dia'
        ? getFlujoPersonasPorDia(fechaDia)
        : getFlujoPersonasPorMes(Number(fechaMes.slice(0, 4)), Number(fechaMes.slice(5, 7)))

    peticion
      .then((data) => {
        if (!cancelled) setFlujo(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorFlujo(err instanceof ApiError ? err.message : 'No se pudo cargar el flujo de personas')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingFlujo(false)
      })

    return () => {
      cancelled = true
    }
  }, [tab, tipoPeriodo, fechaDia, fechaMes])

  const totalVentas = comparativa.reduce((sum, c) => sum + c.totalVentasMesActual, 0)
  const totalCantidadVentas = comparativa.reduce((sum, c) => sum + c.cantidadVentasMesActual, 0)
  const totalInventario = comparativa.reduce((sum, c) => sum + c.valorInventarioActual, 0)
  const totalTransferencias = comparativa.reduce((sum, c) => sum + c.transferenciasActivas, 0)

  const coloresSucursal = useMemo(
    () => crearMapaColoresSucursal(comparativa.map((c) => c.sucursalNombre)),
    [comparativa],
  )

  const ordenadaPorVentas = [...comparativa].sort((a, b) => b.totalVentasMesActual - a.totalVentasMesActual)
  const ordenadaPorBajoMinimo = [...comparativa].sort((a, b) => b.productosBajoMinimo - a.productosBajoMinimo)

  return (
    <div className="page page-fixed-header">
      <div className="page-header-sticky page-header-sticky--compacto">
        <p className="page-subtitle">Analiza el rendimiento y estado del inventario de cada sucursal</p>

        {isLoading && <p>Cargando...</p>}
        {error && <p className="error-text">{error}</p>}
        {!isLoading && !error && comparativa.length === 0 && <p>Sin datos.</p>}

        {!isLoading && !error && comparativa.length > 0 && (
          <>
            <div className="kpi-row kpi-row--compacta">
              <KpiTile icon="dinero" label="Ventas totales" value={formatearMoneda(totalVentas)} />
              <KpiTile icon="ventas" label="Número total de ventas" value={String(totalCantidadVentas)} />
              <KpiTile
                icon="inventario"
                label="Valor total del inventario"
                value={formatearMoneda(totalInventario)}
              />
              <KpiTile
                icon="transferencias"
                label="Transferencias activas"
                value={String(totalTransferencias)}
              />
            </div>

            <h2 className="analisis-sucursal-titulo">Análisis por sucursal</h2>

            <div className="tabs tabs--scroll">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`tab-button ${tab === t.id ? 'tab-button--activo' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {!isLoading && !error && comparativa.length > 0 && (
        <div className="page-scroll-body page-scroll-body--sin-barra page-scroll-body--clip">
          <section className="dash-card analisis-sucursal-card analisis-sucursal-card--full">
            <div className="analisis-sucursal-body analisis-sucursal-body--full">
              {tab === 'ventas' && (
                <div className="analisis-sucursal-tab-contenido">
                  <h3>Ventas por sucursal</h3>
                  <p className="dash-card-hint">Ventas del mes actual, de mayor a menor</p>
                  <HorizontalBarChart
                    fill
                    data={ordenadaPorVentas.map((c) => ({
                      label: c.sucursalNombre,
                      value: c.totalVentasMesActual,
                      sublabel: `${c.cantidadVentasMesActual} ventas`,
                      colorVar: coloresSucursal[c.sucursalNombre],
                    }))}
                    valueFormatter={(v) => formatearMoneda(v)}
                  />
                </div>
              )}

              {tab === 'inventario' && (
                <div className="analisis-sucursal-tab-contenido">
                  <h3>Valor del inventario por sucursal</h3>
                  <p className="dash-card-hint">Valor actual del inventario, de mayor a menor</p>
                  <HorizontalBarChart
                    fill
                    data={comparativa.map((c) => ({
                      label: c.sucursalNombre,
                      value: c.valorInventarioActual,
                      colorVar: coloresSucursal[c.sucursalNombre],
                    }))}
                    valueFormatter={(v) => formatearMoneda(v)}
                  />
                </div>
              )}

              {tab === 'participacion' && (
                <div className="analisis-sucursal-tab-contenido">
                  <h3>Participación de ventas por sucursal</h3>
                  <p className="dash-card-hint">Porcentaje del total de ventas que aporta cada sucursal</p>
                  <div className="doughnut-chart-wrap doughnut-chart-wrap--fill">
                    <DoughnutChart
                      data={comparativa.map((c) => ({
                        label: c.sucursalNombre,
                        value: c.totalVentasMesActual,
                        colorVar: coloresSucursal[c.sucursalNombre],
                      }))}
                      valueFormatter={(v) => formatearMoneda(v)}
                      centerValue={formatearMoneda(totalVentas)}
                      centerLabel="Ventas totales"
                    />
                    <ul className="doughnut-legend">
                      {ordenadaPorVentas.map((c) => (
                        <li key={c.sucursalId} className="doughnut-legend-item">
                          <span
                            className="doughnut-legend-dot"
                            style={{ backgroundColor: `var(${coloresSucursal[c.sucursalNombre]})` }}
                          />
                          <span className="doughnut-legend-nombre">{c.sucursalNombre}</span>
                          <span className="doughnut-legend-valor">
                            {totalVentas > 0 ? ((c.totalVentasMesActual / totalVentas) * 100).toFixed(1) : '0.0'}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {tab === 'stockCritico' && (
                <div className="analisis-sucursal-tab-contenido">
                  <h3>Productos bajo mínimo por sucursal</h3>
                  <p className="dash-card-hint">Sucursales con productos por debajo del stock mínimo</p>
                  <HorizontalBarChart
                    fill
                    data={ordenadaPorBajoMinimo.map((c) => ({
                      label: c.sucursalNombre,
                      value: c.productosBajoMinimo,
                      colorVar: c.productosBajoMinimo > 0 ? '--status-critical' : '--chart-1',
                    }))}
                    valueFormatter={(v) => String(v)}
                  />
                </div>
              )}

              {tab === 'flujoPersonas' && (
                <div className="analisis-sucursal-tab-contenido">
                  <h3>Flujo de personas por sucursal</h3>
                  <p className="dash-card-hint">
                    Grupos y personas que ingresaron, según registros reales de Visitas
                  </p>

                  <div className="flujo-periodo-selector">
                    <div className="flujo-periodo-tipo">
                      <button
                        type="button"
                        className={tipoPeriodo === 'dia' ? 'activo' : ''}
                        onClick={() => setTipoPeriodo('dia')}
                      >
                        Día
                      </button>
                      <button
                        type="button"
                        className={tipoPeriodo === 'mes' ? 'activo' : ''}
                        onClick={() => setTipoPeriodo('mes')}
                      >
                        Mes
                      </button>
                    </div>

                    {tipoPeriodo === 'dia' ? (
                      <DatePicker value={fechaDia} max={hoyIso()} onChange={setFechaDia} />
                    ) : (
                      <MonthPicker value={fechaMes} max={mesActualIso()} onChange={setFechaMes} />
                    )}
                  </div>

                  {isLoadingFlujo && <p>Cargando...</p>}
                  {errorFlujo && <p className="error-text">{errorFlujo}</p>}

                  {!isLoadingFlujo && !errorFlujo && flujo && (
                    <div className="flujo-layout">
                      <div className="flujo-columnas">
                        <div className="flujo-columna flujo-columna--kpis">
                          <div className="flujo-kpi-tile">
                            <span className="flujo-kpi-label">Personas</span>
                            <span className="flujo-kpi-valor">{flujo.totalPersonas}</span>
                          </div>
                          <div className="flujo-kpi-tile">
                            <span className="flujo-kpi-label">Visitas</span>
                            <span className="flujo-kpi-valor">{flujo.totalVisitas}</span>
                          </div>
                          <div className="flujo-kpi-tile">
                            <span className="flujo-kpi-label">Promedio / visita</span>
                            <span className="flujo-kpi-valor">{flujo.promedioPersonasPorVisita.toFixed(2)}</span>
                          </div>
                          <div className="flujo-kpi-tile">
                            <span className="flujo-kpi-label">Mayor flujo</span>
                            <span className="flujo-kpi-valor flujo-kpi-valor--texto">
                              {flujo.sucursalMayorFlujo ?? '—'}
                            </span>
                          </div>
                        </div>

                        <div className="flujo-columna">
                          <h4>Personas por sucursal</h4>
                          {flujo.porSucursal.length > 0 ? (
                            <HorizontalBarChart
                              data={flujo.porSucursal.map((s) => ({
                                label: s.sucursalNombre,
                                value: s.cantidadPersonas,
                                sublabel: `${s.cantidadVisitas} visitas · promedio ${s.promedioPersonasPorVisita.toFixed(2)}`,
                                colorVar: coloresSucursal[s.sucursalNombre],
                              }))}
                              valueFormatter={(v) => `${v} personas`}
                            />
                          ) : (
                            <p className="chart-empty chart-empty--placeholder">
                              No hay visitas registradas para este período.
                            </p>
                          )}
                        </div>

                        <div className="flujo-columna">
                          <div className="flujo-columna-header">
                            <h4>{tipoPeriodo === 'dia' ? 'Flujo por hora' : 'Flujo por día'}</h4>
                            <div className="flujo-periodo-tipo">
                              <button
                                type="button"
                                className={flujoMetrica === 'personas' ? 'activo' : ''}
                                onClick={() => setFlujoMetrica('personas')}
                              >
                                Personas
                              </button>
                              <button
                                type="button"
                                className={flujoMetrica === 'visitas' ? 'activo' : ''}
                                onClick={() => setFlujoMetrica('visitas')}
                              >
                                Visitas
                              </button>
                            </div>
                          </div>

                          {tipoPeriodo === 'dia' ? (
                            flujo.porHora.length > 0 ? (
                              <LineChart
                                data={completarHoras(flujo.porHora, flujoMetrica)}
                                valueFormatter={(v) => String(v)}
                                colorVar="--chart-3"
                              />
                            ) : (
                              <p className="chart-empty chart-empty--placeholder">
                                No hay datos por hora para este día.
                              </p>
                            )
                          ) : flujo.porDia.length > 0 ? (
                            <LineChart
                              data={flujo.porDia.map((d) => ({
                                label: formatearFechaCorta(d.fecha),
                                value: flujoMetrica === 'personas' ? d.cantidadPersonas : d.cantidadVisitas,
                              }))}
                              valueFormatter={(v) => String(v)}
                              colorVar="--chart-3"
                            />
                          ) : (
                            <p className="chart-empty chart-empty--placeholder">
                              No hay datos por día para este mes.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
