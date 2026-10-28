import { useEffect, useRef, useState } from 'react'
import { formatCell } from '../utils/formatCell.js'
import CellValue from './CellValue.jsx'
import CopyButton from './CopyButton.jsx'
import Icon from './Icon.jsx'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

// Slide-in panel with every non-empty column for one row, including columns hidden in the table.
// While open, Tab stays inside the panel; on close, focus goes back to where it was (the row).
function RowDetail({ row, columns, titleColumn, onClose }) {
  const panelRef = useRef(null)
  // Read during the first render: by the time effects run, autoFocus has already moved focus to Close.
  const [opener] = useState(() => document.activeElement)

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !panelRef.current) return
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)]
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
      if (opener?.isConnected) opener.focus()
    }
  }, [onClose, opener])

  const fields = columns
    .filter((c) => c.key !== titleColumn.key)
    .map((c) => ({ column: c, text: formatCell(row[c.index], c.type) }))
    .filter((field) => field.text)
  const emptyCount = columns.length - 1 - fields.length

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <span className="eyebrow">{titleColumn.label}</span>
            <h2 id="drawer-title">{formatCell(row[titleColumn.index], titleColumn.type) || '—'}</h2>
          </div>
          <button type="button" className="icon-button secondary" onClick={onClose} aria-label="Close" autoFocus>
            <Icon name="x" />
          </button>
        </div>
        <div className="drawer-body">
          <dl className="detail-list">
            {fields.map(({ column, text }) => (
              <div key={column.key} className="detail-row">
                <dt>{column.label}</dt>
                <dd>
                  <CellValue value={row[column.index]} column={column} />
                  <CopyButton text={text} label={column.label} />
                </dd>
              </div>
            ))}
          </dl>
          {emptyCount > 0 && (
            <p className="drawer-note">
              {emptyCount} empty {emptyCount === 1 ? 'field' : 'fields'} not shown
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default RowDetail
