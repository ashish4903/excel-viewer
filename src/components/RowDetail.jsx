import { useEffect } from 'react'
import { formatCell } from '../utils/formatCell.js'
import CellValue from './CellValue.jsx'
import CopyButton from './CopyButton.jsx'
import Icon from './Icon.jsx'

// Slide-in panel with every non-empty column for one row, including columns hidden in the table.
function RowDetail({ row, columns, titleColumn, onClose }) {
  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const fields = columns
    .filter((c) => c.key !== titleColumn.key)
    .map((c) => ({ column: c, text: formatCell(row[c.index], c.type) }))
    .filter((field) => field.text)
  const emptyCount = columns.length - 1 - fields.length

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <div>
            <span className="eyebrow">{titleColumn.label}</span>
            <h2 id="drawer-title">{formatCell(row[titleColumn.index], titleColumn.type) || '—'}</h2>
          </div>
          <button type="button" className="icon-button secondary" onClick={onClose} aria-label="Close" autoFocus>
            <Icon name="x" />
          </button>
        </header>
        <dl className="drawer-body">
          {fields.map(({ column, text }) => (
            <div key={column.key} className="detail-row">
              <dt>{column.label}</dt>
              <dd>
                <CellValue value={row[column.index]} column={column} />
                <CopyButton text={text} label={column.label} />
              </dd>
            </div>
          ))}
          {emptyCount > 0 && (
            <p className="drawer-note">
              {emptyCount} empty {emptyCount === 1 ? 'field' : 'fields'} not shown
            </p>
          )}
        </dl>
      </aside>
    </div>
  )
}

export default RowDetail
