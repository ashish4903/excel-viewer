import { formatCell } from '../utils/formatCell.js'
import { getActiveFilters, toNumber } from '../utils/filterRows.js'
import Icon from './Icon.jsx'

function describe(value, kind, type) {
  if (kind === 'select') return value
  if (kind === 'contains') return `contains “${value}”`
  const format =
    kind === 'dateRange' ? (v) => formatCell(new Date(`${v}T00:00:00Z`), 'date') : (v) => formatCell(toNumber(v), type)
  const hasMin = value.min !== undefined && value.min !== ''
  const hasMax = value.max !== undefined && value.max !== ''
  if (hasMin && hasMax) return `${format(value.min)} – ${format(value.max)}`
  if (hasMin) return `≥ ${format(value.min)}`
  return `≤ ${format(value.max)}`
}

function ActiveFilters({ search, filters, columns, pairRanges, onClearSearch, onRemoveFilter, onClearAll }) {
  const columnsByKey = new Map(columns.map((c) => [c.key, c]))
  const chips = getActiveFilters(filters)
    .map(([key, value]) => {
      const pair = pairRanges.find((p) => p.key === key)
      if (pair) return { key, label: pair.label, text: describe(value, 'numberRange', pair.type) }
      const column = columnsByKey.get(key)
      return column && { key, label: column.label, text: describe(value, column.filterKind, column.type) }
    })
    .filter(Boolean)

  if (!search && chips.length === 0) return null

  return (
    <div className="chips" aria-label="Active filters">
      {search && (
        <button type="button" className="chip" onClick={onClearSearch}>
          <span className="chip-label">Search</span> “{search}”
          <Icon name="x" size={14} />
        </button>
      )}
      {chips.map((chip) => (
        <button key={chip.key} type="button" className="chip" onClick={() => onRemoveFilter(chip.key)}>
          <span className="chip-label">{chip.label}</span> {chip.text}
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
