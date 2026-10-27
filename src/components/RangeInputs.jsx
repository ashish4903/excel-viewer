// Min/max pair for number or date ranges. value: { min, max } as raw input strings.
// Validation and hints are shown by the surrounding FilterField.
function RangeInputs({ type = 'number', value = {}, onChange, label }) {
  const isDate = type === 'date'

  const input = (bound) => (
    <input
      type={isDate ? 'date' : 'number'}
      inputMode={isDate ? undefined : 'decimal'}
      value={value[bound] ?? ''}
      onChange={(event) => onChange({ ...value, [bound]: event.target.value })}
      placeholder={bound === 'min' ? 'Min' : 'Max'}
      aria-label={`${label} ${isDate ? (bound === 'min' ? 'from' : 'to') : bound === 'min' ? 'minimum' : 'maximum'}`}
    />
  )

  return (
    <div className="range-inputs">
      {input('min')}
      <span aria-hidden="true">–</span>
      {input('max')}
    </div>
  )
}

export default RangeInputs
