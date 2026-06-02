import './StatsCard.css'

export default function StatsCard({ title, value, icon, color, subtitle }) {
  return (
    <div className="stats-card" style={{ borderTopColor: color }}>
      <div className="stats-card-icon" style={{ background: `${color}15`, color }}>
        {icon}
      </div>
      <div className="stats-card-content">
        <div className="stats-card-title">{title}</div>
        <div className="stats-card-value">{value}</div>
        {subtitle && <div className="stats-card-subtitle">{subtitle}</div>}
      </div>
    </div>
  )
}
