import { toNumber } from '../utils/filterRows.js'

// Min/max pair for number or date ranges. value: { min, max } as raw input strings.
function RangeInputs({ type = 'number', value = {}, onChange, label, placeholders = {}, hint }) {
  const isDate = type === 'date'
  const min = isDate ? value.min || null : toNumber(value.min)
  const max = isDate ? value.max || null : toNumber(value.max)
  const invalid = min !== null && max !== null && min > max

  const input = (bound) => (
    <input
      type={isDate ? 'date' : 'number'}
      inputMode={isDate ? undefined : 'decimal'}
      value={value[bound] ?? ''}
      onChange={(event) => onChange({ ...value, [bound]: event.target.value })}
      placeholder={placeholders[bound] ?? (bound === 'min' ? 'Min' : 'Max')}
      aria-label={`${label} ${isDate ? (bound === 'min' ? 'from' : 'to') : bound === 'min' ? 'minimum' : 'maximum'}`}
    />
  )

  return (
    <>
      <div className={`range-inputs${invalid ? ' invalid' : ''}`}>
        {input('min')}
        <span aria-hidden="true">–</span>
        {input('max')}
      </div>
      {(invalid || hint) && (
        <small className={invalid ? 'error-text' : undefined}>
          {invalid ? `${isDate ? 'Start date is after end date' : 'Minimum is greater than maximum'}.` : hint}
        </small>
      )}
    </>
  )
}

export default RangeInputs
