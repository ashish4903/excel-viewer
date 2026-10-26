import { columns } from '../config/columns.js'
import { formatCell } from '../utils/formatCell.js'
import { getActiveRanges } from '../utils/filterRows.js'
import Icon from './Icon.jsx'

const labelByKey = Object.fromEntries(columns.map((c) => [c.key, c.label]))
const typeByKey = Object.fromEntries(columns.map((c) => [c.key, c.type]))

function describeRange(range) {
  const format = (value) => formatCell(value, typeByKey[range.fromKey])
  if (range.min !== null && range.max !== null) return `${format(range.min)} – ${format(range.max)}`
  if (range.min !== null) return `≥ ${format(range.min)}`
  return `≤ ${format(range.max)}`
}

function ActiveFilters({ search, filters, ranges, onClearSearch, onRemoveFilter, onRemoveRange, onClearAll }) {
  const active = Object.entries(filters).filter(([, value]) => value !== '')
  const activeRanges = getActiveRanges(ranges)
  if (!search && active.length === 0 && activeRanges.length === 0) return null

  return (
    <div className="chips" aria-label="Active filters">
      {search && (
        <button type="button" className="chip" onClick={onClearSearch}>
          <span className="chip-label">Search</span> “{search}”
          <Icon name="x" size={14} />
        </button>
      )}
      {active.map(([key, value]) => (
        <button key={key} type="button" className="chip" onClick={() => onRemoveFilter(key)}>
          <span className="chip-label">{labelByKey[key]}</span> {value}
          <Icon name="x" size={14} />
        </button>
      ))}
      {activeRanges.map((range) => (
        <button key={range.key} type="button" className="chip" onClick={() => onRemoveRange(range.key)}>
          <span className="chip-label">{range.label}</span> {describeRange(range)}
          <Icon name="x" size={14} />
        </button>
      ))}
      <button type="button" className="link-button" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  )
}

export default ActiveFilters
