import { formatCell } from '../utils/formatCell.js'
import CellValue from './CellValue.jsx'
import Icon from './Icon.jsx'

const PREVIEW_FIELDS = 5

// The first visible column is the card title; badge columns sit beside it.
// Up to PREVIEW_FIELDS other non-empty fields are previewed; the rest open in the detail panel.
function DataCards({ rows, columns, onSelect, query, animationKey }) {
  const [titleColumn, ...rest] = columns
  const badgeColumns = rest.filter((c) => c.display === 'badge')
  const fieldColumns = rest.filter((c) => c.display !== 'badge')

  return (
    <ul className="cards" key={animationKey}>
      {rows.map((row, i) => {
        const preview = fieldColumns.filter((c) => formatCell(row[c.key], c.type)).slice(0, PREVIEW_FIELDS)
        return (
          <li key={i} style={{ '--i': i }}>
            <button type="button" className="card" onClick={() => onSelect(row)}>
              <div className="card-header">
                <h3>
                  <CellValue value={row[titleColumn.key]} column={titleColumn} query={query} />
                </h3>
                {badgeColumns.map((c) => (
                  <CellValue key={c.key} value={row[c.key]} column={c} query={query} />
                ))}
              </div>
              <dl>
                {preview.map((c) => (
                  <div key={c.key}>
                    <dt>{c.label}</dt>
                    <dd>
                      <CellValue value={row[c.key]} column={c} query={query} />
                    </dd>
                  </div>
                ))}
              </dl>
              <span className="card-more">
                View all details <Icon name="chevronRight" size={16} />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default DataCards
