import { useMemo } from 'react'
import { formatCell } from '../utils/formatCell.js'
import { getNumberBounds, isFilterActive } from '../utils/filterRows.js'
import RangeInputs from './RangeInputs.jsx'

// Min/max filter over a from/to column pair (configured in rangeFilters, e.g. salary range).
function PairRangeFilter({ pair, rows, value, onChange }) {
  const bounds = useMemo(() => getNumberBounds(rows, [pair.fromIndex, pair.toIndex]), [rows, pair])

  return (
    <div className={`field range${isFilterActive(value) ? ' active' : ''}`}>
      <div className="field-head">
        <span>{pair.label}</span>
      </div>
      <RangeInputs
        value={value && typeof value === 'object' ? value : {}}
        onChange={onChange}
        label={pair.label}
        placeholders={
          bounds.min !== null
            ? { min: `Min ${formatCell(bounds.min, pair.type)}`, max: `Max ${formatCell(bounds.max, pair.type)}` }
            : {}
        }
        hint={pair.hint}
      />
    </div>
  )
}

export default PairRangeFilter
