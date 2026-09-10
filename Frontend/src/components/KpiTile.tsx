import { NavIcon, type NavIconName } from './NavIcon'

export function KpiTile({
  label,
  value,
  sublabel,
  tone = 'neutral',
  icon,
}: {
  label: string
  value: string
  sublabel?: string
  tone?: 'neutral' | 'warning' | 'critical'
  icon?: NavIconName
}) {
  return (
    <div className={`kpi-tile kpi-tile-${tone}`}>
      <div className="kpi-header">
        {icon && <NavIcon name={icon} />}
        <span className="kpi-label">{label}</span>
      </div>
      <span className="kpi-value">{value}</span>
      {sublabel && <span className="kpi-sublabel">{sublabel}</span>}
    </div>
  )
}
