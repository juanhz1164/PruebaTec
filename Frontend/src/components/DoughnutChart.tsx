import { useEffect, useRef } from 'react'
import { Chart, DoughnutController, ArcElement, Tooltip, type ChartConfiguration } from 'chart.js'

Chart.register(DoughnutController, ArcElement, Tooltip)

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

interface DoughnutDatum {
  label: string
  value: number
  colorVar: string
}

export function DoughnutChart({
  data,
  valueFormatter = (v: number) => v.toFixed(0),
  centerLabel,
  centerValue,
  height = 320,
}: {
  data: DoughnutDatum[]
  valueFormatter?: (value: number) => string
  centerLabel?: string
  centerValue?: string
  height?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  const total = data.reduce((sum, d) => sum + d.value, 0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0 || total === 0) return

    const border = cssVar('--border') || '#2e303a'
    const codeBg = cssVar('--code-bg') || '#1f2028'
    const textH = cssVar('--text-h') || '#f3f4f6'
    const bg = cssVar('--bg') || '#16171d'

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: data.map((d) => cssVar(d.colorVar) || '#34d399'),
            borderColor: bg,
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        animation: { duration: 400 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: codeBg,
            titleColor: textH,
            bodyColor: textH,
            borderColor: border,
            borderWidth: 1,
            padding: 10,
            displayColors: true,
            callbacks: {
              label: (ctx) => {
                const value = ctx.parsed ?? 0
                const pct = total > 0 ? (value / total) * 100 : 0
                return [`Ventas: ${valueFormatter(value)}`, `Participación: ${pct.toFixed(1)}%`]
              },
            },
          },
        },
      },
    }

    chartRef.current?.destroy()
    chartRef.current = new Chart(canvas, config)

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [data, total, valueFormatter])

  if (data.length === 0 || total === 0) {
    return <p className="chart-empty">No hay datos disponibles para este período.</p>
  }

  return (
    <div className="doughnut-chart" style={{ height }}>
      <canvas ref={canvasRef} />
      {(centerLabel || centerValue) && (
        <div className="doughnut-chart-center">
          {centerValue && <span className="doughnut-chart-center-value">{centerValue}</span>}
          {centerLabel && <span className="doughnut-chart-center-label">{centerLabel}</span>}
        </div>
      )}
    </div>
  )
}
