import Icon from './Icon.jsx'

// Page numbers around the current page, with ellipses for gaps: 1 … 4 5 6 … 10
function getPageNumbers(page, pageCount) {
  const pages = new Set([1, pageCount, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b)
  const result = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push(`gap-${p}`)
    result.push(p)
  })
  return result
}

function Pagination({ page, pageCount, pageSize, total, onChange }) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="range">
        Showing <strong>{first}–{last}</strong> of <strong>{total.toLocaleString()}</strong>
      </span>
      <div className="pages">
        <button
          type="button"
          className="icon-button secondary"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <Icon name="chevronLeft" />
        </button>
        {getPageNumbers(page, pageCount).map((p) =>
          typeof p === 'string' ? (
            <span key={p} className="gap">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`page${p === page ? ' current' : ''}`}
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="icon-button secondary"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          <Icon name="chevronRight" />
        </button>
      </div>
    </nav>
  )
}

export default Pagination
