import { useMemo } from 'react'
import { columns } from '../config/columns.js'
import { getFilterOptions } from '../utils/filterRows.js'

const filterableColumns = columns.filter((c) => c.filterable)

function FilterDropdowns({ rows, filters, onChange }) {
  const optionsByKey = useMemo(
    () => Object.fromEntries(filterableColumns.map((c) => [c.key, getFilterOptions(rows, c.key)])),
    [rows],
  )

  return filterableColumns.map((c) => (
    <label key={c.key} className={`field${filters[c.key] ? ' active' : ''}`}>
      <span>{c.label}</span>
      <select value={filters[c.key] ?? ''} onChange={(event) => onChange(c.key, event.target.value)}>
        <option value="">All ({optionsByKey[c.key].length})</option>
        {optionsByKey[c.key].map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  ))
}

export default FilterDropdowns
