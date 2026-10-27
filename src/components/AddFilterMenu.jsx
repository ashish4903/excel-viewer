import { useRef, useState } from 'react'
import { useDismiss } from '../hooks/useDismiss.js'
import Icon from './Icon.jsx'

const KIND_LABELS = { select: 'List', contains: 'Text', numberRange: 'Range', dateRange: 'Dates' }

// "+ Add filter" tile: pick any non-empty column that doesn't already have a filter.
function AddFilterMenu({ columns, shownKeys, onAdd }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  useDismiss(ref, open, setOpen)

  const q = query.trim().toLowerCase()
  const candidates = columns.filter(
    (c) => !c.empty && !shownKeys.has(c.key) && (!q || c.label.toLowerCase().includes(q) || c.header.toLowerCase().includes(q)),
  )

  function choose(key) {
    onAdd(key)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="field popover-anchor add-filter" ref={ref}>
      {/* Same label row as the filters so the button lines up with their controls. */}
      <div className="field-head">
        <span className="field-label">More filters</span>
      </div>
      <button type="button" className="add-filter-button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Icon name="filter" size={16} />
        Add filter
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Add a filter">
          <div className="popover-search">
            <Icon name="search" size={16} />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a column…"
              aria-label="Find a column"
              autoFocus
            />
          </div>
          <ul>
            {candidates.length === 0 && <li className="group-label">No more columns to filter</li>}
            {candidates.map((c) => (
              <li key={c.key}>
                <button type="button" className="menu-item" onClick={() => choose(c.key)}>
                  <span>{c.label}</span>
                  <span className="tag">{KIND_LABELS[c.filterKind]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default AddFilterMenu
