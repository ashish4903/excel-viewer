import { columns } from '../config/columns.js'
import Icon from './Icon.jsx'

// Sort control for the card layout, where there are no column headers to click.
function SortSelect({ sort, onChange }) {
  return (
    <div className="sort-select">
      <select
        value={sort.key ?? ''}
        onChange={(event) => onChange({ key: event.target.value || null, direction: sort.direction })}
        aria-label="Sort by"
      >
        <option value="">Sort: original order</option>
        {columns.map((c) => (
          <option key={c.key} value={c.key}>
            Sort: {c.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="icon-button secondary"
        onClick={() => onChange({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
        disabled={!sort.key}
        aria-label={sort.direction === 'asc' ? 'Sort descending' : 'Sort ascending'}
      >
        <Icon name={sort.direction === 'asc' ? 'arrowUp' : 'arrowDown'} />
      </button>
    </div>
  )
}

export default SortSelect
