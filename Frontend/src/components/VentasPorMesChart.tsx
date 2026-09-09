import { useEffect, useRef, useState } from 'react'
import Highcharts from 'highcharts'

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

interface VentasPorMesDatum {
  label: string
  value: number
}

// Paleta fija con colores claramente distintos entre sí (no las variables
// --chart-1..4 del tema: dos de ellas son verdes muy parecidos, lo que
// hacía que la dona se viera "de un solo color" cuando el mes con valor
// coincidía con el único color realmente distinto y los demás meses, en
// $0, no ocupaban ángulo visible).
const PALETA_DONUT = ['#2a7fc9', '#d4a017', '#e0517d', '#10b981']

// Gráfico de dona para "Ventas por mes" en el Panel general: muestra la
// PARTICIPACIÓN de cada uno de los meses del rango (el elegido + los
// anteriores) dentro del total vendido en ese rango.
//
// La leyenda es HTML propia (no la nativa de Highcharts): en un
// contenedor bajo pero ancho como esta card, Highcharts decide ocultar su
// leyenda por completo si calcula que no cabe junto al donut, sin avisar.
// Controlando el layout nosotros mismos evita ese comportamiento.
export function VentasPorMesChart({
  data,
  valueFormatter = (v: number) => v.toFixed(0),
}: {
  data: VentasPorMesDatum[]
  valueFormatter?: (value: number) => string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Highcharts.Chart | null>(null)
  // Se recrea el gráfico cuando cambia el tema (oscuro/claro): los colores
  // se leen de variables CSS solo al crear el chart, así que sin esto
  // quedarían congelados con los colores del tema activo al montar.
  const [temaVersion, setTemaVersion] = useState(0)

  useEffect(() => {
    const observer = new MutationObserver(() => setTemaVersion((v) => v + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const totalVentas = data.reduce((sum, d) => sum + d.value, 0)

  useEffect(() => {
    const el = containerRef.current
    const wrap = wrapRef.current
    if (!el || !wrap || data.length === 0 || totalVentas <= 0) return

    const codeBg = cssVar('--code-bg') || '#1f2028'
    const textH = cssVar('--text-h') || '#f3f4f6'
    const border = cssVar('--border') || '#2e303a'

    // El lado del cuadrado se calcula ANTES de crear el chart (no dentro
    // del ResizeObserver): el spec de ResizeObserver dice que debe
    // disparar su callback al menos una vez al observar, pero en la
    // práctica no siempre lo hace de forma fiable si el elemento no
    // vuelve a cambiar de tamaño — dejando el <div> en su ancho flex
    // natural (rectangular) en vez del cuadrado calculado.
    const calcularLado = () => {
      const wrapRect = wrap.getBoundingClientRect()
      const ladoMaximoPorAncho = wrapRect.width * 0.5
      return Math.max(0, Math.min(ladoMaximoPorAncho, wrapRect.height))
    }
    const ladoInicial = calcularLado()
    el.style.width = `${ladoInicial}px`
    el.style.height = `${ladoInicial}px`

    chartRef.current?.destroy()
    chartRef.current = Highcharts.chart(el, {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent',
        spacing: [0, 0, 0, 0],
        style: { fontFamily: 'inherit' },
        animation: { duration: 300 },
        width: ladoInicial || undefined,
        height: ladoInicial || undefined,
      },
      title: { text: undefined },
      credits: { enabled: false },
      accessibility: { enabled: false },
      legend: { enabled: false },
      tooltip: {
        backgroundColor: codeBg,
        borderColor: border,
        borderRadius: 8,
        style: { color: textH, fontSize: '12px' },
        formatter() {
          const pct = totalVentas > 0 ? ((Number(this.y) / totalVentas) * 100).toFixed(1) : '0'
          return `<b>${this.key}</b><br/>${valueFormatter(Number(this.y))} (${pct}%)`
        },
      },
      plotOptions: {
        pie: {
          innerSize: '66%',
          // Sin borde entre porciones: con meses de valor muy chico (casi
          // sin ángulo), un borde de varios px alrededor de esa porción se
          // veía como una muesca/corte en el círculo en vez de una
          // división limpia. Sin borde, el anillo se ve continuo y liso.
          borderWidth: 0,
          dataLabels: { enabled: false },
          states: { hover: { brightness: 0.1 } },
        },
      },
      series: [
        {
          type: 'pie',
          name: 'Ventas',
          data: data.map((d, i) => ({
            name: d.label,
            y: d.value,
            color: PALETA_DONUT[i % PALETA_DONUT.length],
          })),
        },
      ],
    })

    // Recalcula el cuadrado si la card cambia de tamaño después del montaje
    // (colapsar el sidebar, redimensionar la ventana, etc.) — el tamaño
    // inicial ya se aplicó arriba de forma síncrona.
    const observer = new ResizeObserver(() => {
      const lado = calcularLado()
      el.style.width = `${lado}px`
      el.style.height = `${lado}px`
      if (lado > 0) {
        chartRef.current?.setSize(lado, lado, false)
      }
    })
    observer.observe(wrap)

    return () => {
      observer.disconnect()
      chartRef.current?.destroy()
      chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, valueFormatter, temaVersion])

  if (data.length === 0 || totalVentas <= 0) {
    return <p className="chart-empty">No hay datos disponibles para este período.</p>
  }

  return (
    <div className="ventas-mes-donut" ref={wrapRef}>
      <div className="ventas-mes-chart" ref={containerRef} />
      <ul className="ventas-mes-leyenda">
        {data.map((d, i) => {
          const pct = totalVentas > 0 ? ((d.value / totalVentas) * 100).toFixed(0) : '0'
          return (
            <li key={d.label} className="ventas-mes-leyenda-item">
              <span
                className="ventas-mes-leyenda-punto"
                style={{ background: PALETA_DONUT[i % PALETA_DONUT.length] }}
              />
              <span className="ventas-mes-leyenda-mes">{d.label}</span>
              <span className="ventas-mes-leyenda-pct">{pct}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
