import { useEffect } from 'react'
import { columns } from '../config/columns.js'
import { formatCell } from '../utils/formatCell.js'
import CellValue from './CellValue.jsx'
import CopyButton from './CopyButton.jsx'
import Icon from './Icon.jsx'

const [titleColumn, ...fieldColumns] = columns

// Slide-in panel with every configured column for one row.
function RowDetail({ row, onClose }) {
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
            <h2 id="drawer-title">{formatCell(row[titleColumn.key], titleColumn.type) || '—'}</h2>
          </div>
          <button type="button" className="icon-button secondary" onClick={onClose} aria-label="Close" autoFocus>
            <Icon name="x" />
          </button>
        </header>
        <dl className="drawer-body">
          {fieldColumns.map((c) => {
            const text = formatCell(row[c.key], c.type)
            return (
              <div key={c.key} className="detail-row">
                <dt>{c.label}</dt>
                <dd>
                  <CellValue value={row[c.key]} column={c} />
                  {text && <CopyButton text={text} label={c.label} />}
                </dd>
              </div>
            )
          })}
        </dl>
      </aside>
    </div>
  )
}

export default RowDetail
