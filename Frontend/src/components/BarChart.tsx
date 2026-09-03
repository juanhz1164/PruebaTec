interface BarChartDatum {
  label: string
  value: number
}

export function BarChart({
  data,
  colorVar = '--chart-1',
  valueFormatter = (v: number) => v.toFixed(0),
  height = 180,
}: {
  data: BarChartDatum[]
  colorVar?: string
  valueFormatter?: (value: number) => string
  height?: number
}) {
  if (data.length === 0) {
    return <p className="chart-empty">Sin datos.</p>
  }

  const max = Math.max(...data.map((d) => d.value), 1)
  const barWidth = 100 / data.length

  return (
    <div className="bar-chart" role="img" aria-label="Gráfica de barras">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="bar-chart-svg">
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 24)
          const x = i * barWidth + barWidth * 0.15
          const w = barWidth * 0.7
          const y = height - 20 - barHeight
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={w}
                height={Math.max(barHeight, 1)}
                rx="1"
                fill={`var(${colorVar})`}
              />
              <title>
                {d.label}: {valueFormatter(d.value)}
              </title>
            </g>
          )
        })}
      </svg>
      <div className="bar-chart-labels">
        {data.map((d) => (
          <div key={d.label} className="bar-chart-label">
            <span className="bar-chart-label-text">{d.label}</span>
            <span className="bar-chart-label-value">{valueFormatter(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
