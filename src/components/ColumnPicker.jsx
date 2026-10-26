import { useEffect, useRef, useState } from 'react'
import { columns } from '../config/columns.js'
import Icon from './Icon.jsx'

function ColumnPicker({ hiddenKeys, onToggle, onShowAll }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    function handlePointer(event) {
      if (!ref.current.contains(event.target)) setOpen(false)
    }
    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const visibleCount = columns.length - hiddenKeys.size

  return (
    <div className="popover-anchor" ref={ref}>
      <button
        type="button"
        className="button secondary"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <Icon name="columns" />
        Columns
        <span className="count">
          {visibleCount}/{columns.length}
        </span>
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Choose visible columns">
          <div className="popover-header">
            <div>
              <strong>Visible columns</strong>
              <span className="popover-sub">
                {visibleCount} of {columns.length} shown
              </span>
            </div>
            <button type="button" className="link-button" onClick={onShowAll} disabled={hiddenKeys.size === 0}>
              Show all
            </button>
          </div>
          <ul>
            {columns.map((c) => {
              const checked = !hiddenKeys.has(c.key)
              return (
                <li key={c.key}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(c.key)}
                      disabled={checked && visibleCount === 1}
                    />
                    <span>{c.label}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default ColumnPicker
