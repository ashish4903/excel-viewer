import CellValue from './CellValue.jsx'
import Icon from './Icon.jsx'

function DataTable({ rows, columns, sort, onSort, onSelect, query, animationKey }) {
  return (
    <div className="table-wrap">
      <table>
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
                  <button type="button" onClick={() => onSort(c.key)}>
                    {c.label}
                    <span className="sort-icon">
                      <Icon name={active ? (sort.direction === 'asc' ? 'arrowUp' : 'arrowDown') : 'sort'} size={14} />
                    </span>
                  </button>
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
              onKeyDown={(event) => event.key === 'Enter' && onSelect(row)}
            >
              {columns.map((c) => (
                <td key={c.key} className={c.type === 'currency' || c.type === 'number' ? 'numeric' : undefined}>
                  <CellValue value={row[c.key]} column={c} query={query} />
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
