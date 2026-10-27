import Icon from './Icon.jsx'

// Shared shell for every filter so they line up: one label row (label, then hint icon or error,
// then optional remove button) above a single 42px control. Hints and errors never add height.
function FilterField({ label, active, hint, error, onRemove, className = '', children }) {
  return (
    <div className={`field${active ? ' active' : ''}${error ? ' invalid' : ''} ${className}`.trim()}>
      <div className="field-head">
        <span className="field-label" title={label}>
          {label}
        </span>
        {error ? (
          <span className="field-error" role="alert">
            {error}
          </span>
        ) : (
          hint && (
            <span className="field-hint" title={hint} aria-label={hint} role="img">
              <Icon name="info" size={14} />
            </span>
          )
        )}
        {onRemove && (
          <button type="button" className="icon-button ghost tiny" onClick={onRemove} aria-label={`Remove ${label} filter`}>
            <Icon name="x" size={14} />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

export default FilterField
