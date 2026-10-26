import { columns, rangeFilters } from '../config/columns.js'
import { formatCell } from './formatCell.js'

const isEmpty = (value) => value === null || value === undefined || value === ''

// Converts a cell or input value to a number; null when empty or not numeric.
export function toNumber(value) {
  if (isEmpty(value)) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const cleaned = String(value).replace(/[^0-9.-]/g, '')
  if (cleaned === '') return null
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : null
}

// Range filters that have a min and/or max entered, with the bounds as numbers.
export function getActiveRanges(ranges) {
  return rangeFilters
    .map((r) => ({ ...r, min: toNumber(ranges[r.key]?.min), max: toNumber(ranges[r.key]?.max) }))
    .filter((r) => r.min !== null || r.max !== null)
}

// True when the row's [from, to] range overlaps [min, max]. A missing end falls back to the other one.
function matchesRange(row, range) {
  const from = toNumber(row[range.fromKey]) ?? toNumber(row[range.toKey])
  const to = toNumber(row[range.toKey]) ?? from
  if (from === null) return false
  return (range.min === null || to >= range.min) && (range.max === null || from <= range.max)
}

// Keeps rows matching every active dropdown filter, every range filter, and the search text (any column).
export function filterRows(rows, search, filters, ranges = {}) {
  const query = search.trim().toLowerCase()
  const activeFilters = Object.entries(filters).filter(([, value]) => value !== '')
  const activeRanges = getActiveRanges(ranges)

  return rows.filter(
    (row) =>
      activeFilters.every(([key, value]) => String(row[key] ?? '') === value) &&
      activeRanges.every((range) => matchesRange(row, range)) &&
      (!query || columns.some((c) => formatCell(row[c.key], c.type).toLowerCase().includes(query))),
  )
}

// Sorts by sort.key in sort.direction; empty cells always go last.
export function sortRows(rows, sort) {
  if (!sort.key) return rows
  const direction = sort.direction === 'asc' ? 1 : -1

  return [...rows].sort((a, b) => {
    const x = a[sort.key]
    const y = b[sort.key]
    if (isEmpty(x) || isEmpty(y)) return isEmpty(x) - isEmpty(y)
    return compareValues(x, y) * direction
  })
}

function compareValues(x, y) {
  if (x instanceof Date && y instanceof Date) return x.getTime() - y.getTime()
  if (typeof x === 'number' && typeof y === 'number') return x - y
  return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' })
}

// Distinct non-empty values of a column, sorted, for a filter dropdown.
export function getFilterOptions(rows, key) {
  const values = new Set(rows.map((row) => row[key]).filter((v) => !isEmpty(v)).map(String))
  return [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

// Smallest and largest numeric value across a range filter's two columns.
export function getRangeBounds(rows, range) {
  const values = rows
    .flatMap((row) => [toNumber(row[range.fromKey]), toNumber(row[range.toKey])])
    .filter((v) => v !== null)
  if (values.length === 0) return { min: null, max: null }
  return { min: Math.min(...values), max: Math.max(...values) }
}
