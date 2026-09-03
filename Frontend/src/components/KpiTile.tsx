export function KpiTile({
  label,
  value,
  sublabel,
  tone = 'neutral',
}: {
  label: string
  value: string
  sublabel?: string
  tone?: 'neutral' | 'warning' | 'critical'
}) {
  return (
    <div className={`kpi-tile kpi-tile-${tone}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {sublabel && <span className="kpi-sublabel">{sublabel}</span>}
    </div>
  )
}
