import CellValue from './CellValue.jsx'
import Icon from './Icon.jsx'

// Without onSort (while a file is still loading), headers are plain text instead of sort buttons.
function DataTable({ rows, columns, sort, onSort, onSelect, query, animationKey }) {
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">
          {onSort ? 'Results. Column buttons sort the table; press' : 'First rows of the file. Press'} Enter or Space on a row to see all
          its details.
        </caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort.key === c.key
              return (
                <th
                  key={c.key}
                  className={active ? 'sorted' : undefined}
                  aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {onSort ? (
                    <button type="button" onClick={() => onSort(c.key)}>
                      {c.label}
                      <span className="sort-icon">
                        <Icon name={active ? (sort.direction === 'asc' ? 'arrowUp' : 'arrowDown') : 'sort'} size={14} />
                      </span>
                    </button>
                  ) : (
                    <span className="th-label">{c.label}</span>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody key={animationKey}>
          {rows.map((row, i) => (
            <tr
              key={i}
              tabIndex={0}
              style={{ '--i': i }}
              onClick={() => onSelect(row)}
              onKeyDown={(event) => {
                if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault()
                  onSelect(row)
                }
              }}
            >
              {columns.map((c) => (
                <td key={c.key} className={c.type === 'currency' || c.type === 'number' ? 'numeric' : undefined}>
                  <CellValue value={row[c.index]} column={c} query={query} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
