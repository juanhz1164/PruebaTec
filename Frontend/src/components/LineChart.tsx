import { useEffect, useRef } from 'react'
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

interface LineChartDatum {
  label: string
  value: number
}

export function LineChart({
  data,
  valueFormatter = (v: number) => v.toFixed(0),
  height,
  colorVar = '--rol-accent',
  llenarContenedor = false,
}: {
  data: LineChartDatum[]
  valueFormatter?: (value: number) => string
  height?: number
  colorVar?: string
  llenarContenedor?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return

    const accent = cssVar(colorVar) || '#34d399'
    const text = cssVar('--text') || '#9ca3af'
    const border = cssVar('--border') || '#2e303a'
    const codeBg = cssVar('--code-bg') || '#1f2028'
    const textH = cssVar('--text-h') || '#f3f4f6'

    const valores = data.map((d) => d.value)
    const maximo = Math.max(...valores)
    const minimo = Math.min(...valores)
    // Si ningún valor es 0, el eje puede arrancar cerca del mínimo real en
    // vez de en 0 — evita la línea "aplastada" contra la base cuando todos
    // los meses tienen ventas similares y altas. Si hay al menos un 0 (mes
    // sin ventas), SÍ debe arrancar en 0: ese 0 es información real que no
    // se debe ocultar recortando el eje.
    const hayCeroReal = minimo <= 0
    // Un poco de aire arriba del máximo (10%) para que el punto más alto no
    // quede pegado al borde superior del gráfico.
    const margenSuperior = maximo > 0 ? maximo * 0.1 : 1

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            borderColor: accent,
            backgroundColor: `${accent}22`,
            pointBackgroundColor: accent,
            pointBorderColor: accent,
            pointRadius: data.length > 12 ? 0 : 3,
            pointHoverRadius: 5,
            pointHitRadius: 10,
            borderWidth: 2,
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: codeBg,
            titleColor: textH,
            bodyColor: textH,
            borderColor: border,
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (ctx) => valueFormatter(ctx.parsed.y ?? 0),
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: text,
              font: { size: 12 },
              autoSkip: true,
              maxRotation: 0,
              maxTicksLimit: 6,
            },
            border: { color: border },
          },
          y: {
            grid: { color: border },
            ticks: {
              color: text,
              font: { size: 12 },
              precision: 0,
              maxTicksLimit: 5,
              callback: (v: string | number) => valueFormatter(Number(v)),
            },
            beginAtZero: hayCeroReal,
            // Sin un mínimo "bonito" propio, con beginAtZero:false Chart.js
            // ajusta el eje casi exactamente al rango de los datos y la
            // línea puede quedar recortada arriba/abajo — se le da un
            // margen inferior del 10% del máximo cuando no hay ceros reales.
            suggestedMin: hayCeroReal ? undefined : Math.max(0, minimo - margenSuperior),
            suggestedMax: maximo + margenSuperior,
            border: { display: false },
          },
        },
      },
    }

    chartRef.current?.destroy()
    chartRef.current = new Chart(canvas, config)

    const resizeId = requestAnimationFrame(() => chartRef.current?.resize())

    return () => {
      cancelAnimationFrame(resizeId)
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [data, colorVar, valueFormatter])

  if (data.length === 0) {
    return <p className="chart-empty">No hay datos disponibles para este período.</p>
  }

  return (
    <div
      className={`line-chart ${llenarContenedor ? 'line-chart--fill' : ''}`}
      style={height ? { height } : undefined}
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
