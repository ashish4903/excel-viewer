import { formatCell } from '../utils/formatCell.js'
import Highlight from './Highlight.jsx'

// Stable hue per value so the same badge text always gets the same color.
function hueFor(text) {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return hash
}

function CellValue({ value, column, query = '' }) {
  const text = formatCell(value, column.type)
  if (!text) return <span className="empty">—</span>
  if (column.display === 'badge') {
    return (
      <span className="badge" style={{ '--hue': hueFor(text) }}>
        <Highlight text={text} query={query} />
      </span>
    )
  }
  return <Highlight text={text} query={query} />
}

export default CellValue
