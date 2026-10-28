import { useRef, useState } from 'react'
import { useDismiss } from '../hooks/useDismiss.js'
import Icon from './Icon.jsx'

function ColumnPicker({ columns, visibleKeys, onToggle, onShowAll, onHideAll, onReset }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  useDismiss(ref, open, setOpen)

  const q = query.trim().toLowerCase()
  const matches = columns.filter((c) => !q || c.label.toLowerCase().includes(q) || c.header.toLowerCase().includes(q))
  const filled = matches.filter((c) => !c.empty)
  const empty = matches.filter((c) => c.empty)
  const visibleCount = visibleKeys.size

  const renderItem = (c) => {
    const checked = visibleKeys.has(c.key)
    return (
      <li key={c.key}>
        <label className={`check${c.empty ? ' muted' : ''}`}>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(c.key)}
            disabled={checked && visibleCount === 1}
          />
          <span>{c.label}</span>
          {c.empty && <span className="tag">empty</span>}
        </label>
      </li>
    )
  }

  return (
    <div className="popover-anchor" ref={ref}>
      <button
        type="button"
        className="button secondary"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Icon name="columns" />
        Columns
        <span className="count">
          {visibleCount}/{columns.length}
        </span>
      </button>
      {open && (
        <div className="popover wide" role="dialog" aria-label="Choose visible columns">
          <div className="popover-header">
            <div>
              <strong>Visible columns</strong>
              <span className="popover-sub">
                {visibleCount} of {columns.length} shown
              </span>
            </div>
          </div>
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
          <div className="popover-actions">
            <button type="button" className="link-button" onClick={onShowAll}>
              Show all
            </button>
            <button type="button" className="link-button" onClick={onHideAll}>
              Hide all
            </button>
            <button type="button" className="link-button" onClick={onReset} title="Back to the first columns and forget the saved choice">
              Reset
            </button>
          </div>
          <ul>
            {filled.map(renderItem)}
            {empty.length > 0 && <li className="group-label">Empty in this file ({empty.length})</li>}
            {empty.map(renderItem)}
            {matches.length === 0 && <li className="group-label">No columns match “{query}”</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

export default ColumnPicker
