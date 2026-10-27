import { formatCell } from './formatCell.js'

const isEmpty = (value) => value === null || value === undefined || value === ''

// Converts a cell or input value to a number; null when empty or not numeric.
export function toNumber(value) {
  if (isEmpty(value)) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const cleaned = String(value).replace(/[^0-9.-]/g, '')
  if (cleaned === '') return null
  const result = Number(cleaned)
  return Number.isFinite(result) ? result : null
}

// "YYYY-MM-DD" for a date cell (dates are UTC midnight), otherwise null.
const toIsoDate = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : null)

// Filter values are strings (select/contains) or { min, max } (ranges).
export function isFilterActive(value) {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  return !isEmpty(value.min) || !isEmpty(value.max)
}

export function getActiveFilters(filters) {
  return Object.entries(filters).filter(([, value]) => isFilterActive(value))
}

const within = (value, min, max) => (min === null || value >= min) && (max === null || value <= max)

// Returns a row predicate for one active filter, or null if its column no longer exists.
function buildTest(key, value, columnsByKey, pairRanges) {
  if (key.startsWith('pair:')) {
    const pair = pairRanges.find((p) => p.key === key)
    if (!pair) return null
    const min = toNumber(value.min)
    const max = toNumber(value.max)
    // Overlap of the row's [from, to] with [min, max]; a missing end falls back to the other one.
    return (row) => {
      const from = toNumber(row[pair.fromKey]) ?? toNumber(row[pair.toKey])
      const to = toNumber(row[pair.toKey]) ?? from
      return from !== null && (min === null || to >= min) && (max === null || from <= max)
    }
  }

  const column = columnsByKey.get(key)
  if (!column) return null
  switch (column.filterKind) {
    case 'select':
      return (row) => formatCell(row[key], column.type) === value
    case 'contains': {
      const needle = value.trim().toLowerCase()
      return (row) => formatCell(row[key], column.type).toLowerCase().includes(needle)
    }
    case 'numberRange': {
      const min = toNumber(value.min)
      const max = toNumber(value.max)
      return (row) => {
        const n = toNumber(row[key])
        return n !== null && within(n, min, max)
      }
    }
    case 'dateRange': {
      const min = value.min || null
      const max = value.max || null
      return (row) => {
        const d = toIsoDate(row[key])
        return d !== null && within(d, min, max)
      }
    }
    default:
      return null
  }
}

// Keeps rows matching every active filter and the search text (searched across all columns).
export function filterRows(rows, { columns, pairRanges = [], search = '', filters = {} }) {
  const query = search.trim().toLowerCase()
  const columnsByKey = new Map(columns.map((c) => [c.key, c]))
  const tests = getActiveFilters(filters)
    .map(([key, value]) => buildTest(key, value, columnsByKey, pairRanges))
    .filter(Boolean)

  return rows.filter((row) => tests.every((test) => test(row)) && (!query || row._search.includes(query)))
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

// Distinct non-empty display values of a column, sorted, for a dropdown filter.
export function getFilterOptions(rows, column) {
  const values = new Set(rows.map((row) => formatCell(row[column.key], column.type)).filter(Boolean))
  return [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

// Smallest and largest numeric value across the given columns.
export function getNumberBounds(rows, keys) {
  let min = null
  let max = null
  for (const row of rows) {
    for (const key of keys) {
      const n = toNumber(row[key])
      if (n === null) continue
      if (min === null || n < min) min = n
      if (max === null || n > max) max = n
    }
  }
  return { min, max }
}
