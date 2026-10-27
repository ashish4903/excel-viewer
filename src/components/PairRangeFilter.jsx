import { useMemo } from 'react'
import { formatCell } from '../utils/formatCell.js'
import { getNumberBounds, isFilterActive, isRangeInvalid } from '../utils/filterRows.js'
import FilterField from './FilterField.jsx'
import RangeInputs from './RangeInputs.jsx'

// Min/max filter over a from/to column pair (configured in rangeFilters, e.g. salary range).
function PairRangeFilter({ pair, rows, value, onChange }) {
  const bounds = useMemo(() => getNumberBounds(rows, [pair.fromIndex, pair.toIndex]), [rows, pair])
  const range = value && typeof value === 'object' ? value : {}
  const boundsText =
    bounds.min !== null ? `Values in this file: ${formatCell(bounds.min, pair.type)} – ${formatCell(bounds.max, pair.type)}.` : ''

  return (
    <FilterField
      label={pair.label}
      active={isFilterActive(value)}
      hint={[boundsText, pair.hint].filter(Boolean).join(' ')}
      error={isRangeInvalid(range) ? 'Min > max' : undefined}
    >
      <RangeInputs value={range} onChange={onChange} label={pair.label} />
    </FilterField>
  )
}

export default PairRangeFilter
