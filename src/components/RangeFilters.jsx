import { useMemo } from 'react'
import { columns, rangeFilters } from '../config/columns.js'
import { formatCell } from '../utils/formatCell.js'
import { getRangeBounds, toNumber } from '../utils/filterRows.js'

const typeByKey = Object.fromEntries(columns.map((c) => [c.key, c.type]))

function RangeFilters({ rows, ranges, onChange }) {
  const boundsByKey = useMemo(
    () => Object.fromEntries(rangeFilters.map((r) => [r.key, getRangeBounds(rows, r)])),
    [rows],
  )

  return rangeFilters.map((r) => {
    const value = ranges[r.key] ?? {}
    const bounds = boundsByKey[r.key]
    const type = typeByKey[r.fromKey]
    const min = toNumber(value.min)
    const max = toNumber(value.max)
    const active = min !== null || max !== null
    const invalid = min !== null && max !== null && min > max

    return (
      <fieldset key={r.key} className={`field range${active ? ' active' : ''}`}>
        <legend>{r.label}</legend>
        <div className={`range-inputs${invalid ? ' invalid' : ''}`}>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={value.min ?? ''}
            onChange={(event) => onChange(r.key, 'min', event.target.value)}
            placeholder={bounds.min === null ? 'Min' : `Min ${formatCell(bounds.min, type)}`}
            aria-label={`${r.label} minimum`}
          />
          <span aria-hidden="true">–</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={value.max ?? ''}
            onChange={(event) => onChange(r.key, 'max', event.target.value)}
            placeholder={bounds.max === null ? 'Max' : `Max ${formatCell(bounds.max, type)}`}
            aria-label={`${r.label} maximum`}
          />
        </div>
        <small className={invalid ? 'error-text' : undefined}>
          {invalid ? 'Minimum is greater than maximum.' : r.hint}
        </small>
      </fieldset>
    )
  })
}

export default RangeFilters
