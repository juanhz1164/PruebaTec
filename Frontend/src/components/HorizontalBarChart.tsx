import { useEffect, useRef } from 'react'
import {
  Chart,
  BarController,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js'

Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip)

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

interface HBarDatum {
  label: string
  value: number
  sublabel?: string
  colorVar?: string
}

export function HorizontalBarChart({
  data,
  valueFormatter = (v: number) => v.toFixed(0),
  height,
  colorVar = '--rol-accent',
}: {
  data: HBarDatum[]
  valueFormatter?: (value: number) => string
  height?: number
  colorVar?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  const ordenados = [...data].sort((a, b) => b.value - a.value)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || ordenados.length === 0) return

    const accent = cssVar(colorVar) || '#34d399'
    const text = cssVar('--text') || '#9ca3af'
    const border = cssVar('--border') || '#2e303a'
    const codeBg = cssVar('--code-bg') || '#1f2028'
    const textH = cssVar('--text-h') || '#f3f4f6'

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: ordenados.map((d) => d.label),
        datasets: [
          {
            data: ordenados.map((d) => d.value),
            backgroundColor: ordenados.map((d) => (d.colorVar ? cssVar(d.colorVar) || accent : accent)),
            borderRadius: 4,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
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
            displayColors: false,
            callbacks: {
              label: (ctx) => {
                const sub = ordenados[ctx.dataIndex]?.sublabel
                const base = valueFormatter(ctx.parsed.x ?? 0)
                return sub ? `${base} · ${sub}` : base
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: border },
            ticks: {
              color: text,
              font: { size: 12 },
              callback: (v) => valueFormatter(Number(v)),
            },
            border: { display: false },
          },
          y: {
            grid: { display: false },
            ticks: { color: textH, font: { size: 13 } },
            border: { color: border },
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
  }, [ordenados, colorVar, valueFormatter])

  if (ordenados.length === 0) {
    return <p className="chart-empty">No hay datos disponibles para este período.</p>
  }

  const resolvedHeight = height ?? Math.max(ordenados.length * 40, 100)

  return (
    <div className="hbar-chart" style={{ height: resolvedHeight }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
