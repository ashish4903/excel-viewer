import Icon from './Icon.jsx'

function StatsBar({ total, matching, visibleColumns, totalColumns, activeFilters }) {
  const stats = [
    { label: 'Total rows', value: total, icon: 'rows', tone: 'violet' },
    { label: 'Matching', value: matching, icon: 'search', tone: 'teal' },
    { label: 'Columns shown', value: `${visibleColumns}/${totalColumns}`, icon: 'columns', tone: 'pink' },
    { label: 'Active filters', value: activeFilters, icon: 'filter', tone: 'amber' },
  ]

  return (
    <ul className="stats">
      {stats.map((stat) => (
        <li key={stat.label} className={`stat tone-${stat.tone}`}>
          <span className="stat-icon">
            <Icon name={stat.icon} />
          </span>
          <div>
            <span className="stat-value">{stat.value.toLocaleString()}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default StatsBar
