import { useMemo } from 'react'
import { formatCell } from '../utils/formatCell.js'
import { getFilterOptions, getNumberBounds, isFilterActive, isRangeInvalid } from '../utils/filterRows.js'
import FilterField from './FilterField.jsx'
import RangeInputs from './RangeInputs.jsx'

// One column filter; the control depends on column.filterKind (select, contains, numberRange, dateRange).
function FilterControl({ column, rows, value, onChange, onRemove }) {
  const kind = column.filterKind
  const options = useMemo(() => (kind === 'select' ? getFilterOptions(rows, column) : []), [kind, rows, column])
  const bounds = useMemo(() => (kind === 'numberRange' ? getNumberBounds(rows, [column.index]) : null), [kind, rows, column])

  let control
  let hint
  let error
  if (kind === 'select') {
    control = (
      <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} aria-label={column.label}>
        <option value="">All ({options.length})</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  } else if (kind === 'contains') {
    control = (
      <input
        type="text"
        className="text-input"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Contains…"
        aria-label={`${column.label} contains`}
      />
    )
  } else {
    const type = kind === 'dateRange' ? 'date' : 'number'
    const range = value && typeof value === 'object' ? value : {}
    control = <RangeInputs type={type} value={range} onChange={onChange} label={column.label} />
    error = isRangeInvalid(range, type) ? (type === 'date' ? 'From is after to' : 'Min > max') : undefined
    if (bounds && bounds.min !== null) {
      hint = `Values in this file: ${formatCell(bounds.min, column.type)} – ${formatCell(bounds.max, column.type)}`
    }
  }

  return (
    <FilterField label={column.label} active={isFilterActive(value)} hint={hint} error={error} onRemove={onRemove}>
      {control}
    </FilterField>
  )
}

export default FilterControl
