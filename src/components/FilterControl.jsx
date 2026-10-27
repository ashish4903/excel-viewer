import { useMemo } from 'react'
import { formatCell } from '../utils/formatCell.js'
import { getFilterOptions, getNumberBounds, isFilterActive } from '../utils/filterRows.js'
import RangeInputs from './RangeInputs.jsx'
import Icon from './Icon.jsx'

// One column filter; the control depends on column.filterKind (select, contains, numberRange, dateRange).
function FilterControl({ column, rows, value, onChange, onRemove }) {
  const kind = column.filterKind
  const options = useMemo(() => (kind === 'select' ? getFilterOptions(rows, column) : []), [kind, rows, column])
  const bounds = useMemo(() => (kind === 'numberRange' ? getNumberBounds(rows, [column.key]) : null), [kind, rows, column])
  const isRange = kind === 'numberRange' || kind === 'dateRange'

  let control
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
    control = (
      <RangeInputs
        type={kind === 'dateRange' ? 'date' : 'number'}
        value={value && typeof value === 'object' ? value : {}}
        onChange={onChange}
        label={column.label}
        placeholders={
          bounds && bounds.min !== null
            ? { min: `Min ${formatCell(bounds.min, column.type)}`, max: `Max ${formatCell(bounds.max, column.type)}` }
            : {}
        }
      />
    )
  }

  return (
    <div className={`field${isFilterActive(value) ? ' active' : ''}${isRange ? ' range' : ''}`}>
      <div className="field-head">
        <span>{column.label}</span>
        {onRemove && (
          <button type="button" className="icon-button ghost tiny" onClick={onRemove} aria-label={`Remove ${column.label} filter`}>
            <Icon name="x" size={14} />
          </button>
        )}
      </div>
      {control}
    </div>
  )
}

export default FilterControl
