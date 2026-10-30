import { columnOverrides } from '../config/columns.js'

const isEmpty = (value) => value === null || value === undefined || value === ''

// Columns with more distinct values than this get a "contains" filter instead of a dropdown.
const DISTINCT_LIMIT = 200

// Header words that mark numeric columns as codes (shown as typed, no thousands separators).
const CODE_WORDS = new Set(['id', 'code', 'zip', 'zipcode', 'postcode', 'postal', 'phone', 'phoneext', 'fax', 'ext', 'year', 'fein', 'ein', 'naics', 'ssn', 'number', 'no'])

function isCodeHeader(header) {
  return header
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .some((word) => CODE_WORDS.has(word) || word.startsWith('phone') || word.startsWith('zip'))
}

// Makes headers non-blank and unique: blank -> "Column 3", repeats -> "City (2)".
export function uniqueHeaders(rawHeaders, width) {
  const seen = new Map()
  return Array.from({ length: width }, (_, i) => {
    const base = String(rawHeaders[i] ?? '').trim() || `Column ${i + 1}`
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    return count === 1 ? base : `${base} (${count})`
  })
}

// "EMP_BUSINESS_NAME" -> "Emp Business Name"; headers already in mixed case are kept as written.
export function humanize(header) {
  if (!header.includes('_') && header !== header.toUpperCase()) return header
  return header
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => (word.length <= 2 ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ')
}

function inferType(header, count, allDates, allNumbers) {
  if (count === 0) return 'empty'
  if (allDates) return 'date'
  if (allNumbers) return isCodeHeader(header) ? 'code' : 'number'
  return 'text'
}

function filterKindFor(type, distinct) {
  if (type === 'date') return 'dateRange'
  if (type === 'number' || type === 'currency') return 'numberRange'
  return distinct <= DISTINCT_LIMIT ? 'select' : 'contains'
}

// Builds column definitions from headers and data rows (arrays of cells).
// key identifies the column in filters and saved preferences; index is its position in each row array.
export function detectColumns(headers, dataRows) {
  // One pass over the rows, row by row (much faster on large files than reading one column at a
  // time across every row), with per-column counters and no intermediate arrays.
  // Distinct values are only compared with small limits (50, 200) and checked for "all different",
  // so counting stops once a repeat has been seen and there are more than DISTINCT_LIMIT of them.
  const n = headers.length
  const counts = new Uint32Array(n)
  const notDates = new Uint8Array(n)
  const notNumbers = new Uint8Array(n)
  const repeated = new Uint8Array(n)
  const distinctValues = headers.map(() => new Set())
  for (const row of dataRows) {
    const length = Math.min(row.length, n)
    for (let i = 0; i < length; i++) {
      const v = row[i]
      if (isEmpty(v)) continue
      counts[i]++
      let key = v
      if (v instanceof Date) {
        notNumbers[i] = 1
        key = v.getTime()
      } else {
        notDates[i] = 1
        if (typeof v !== 'number') notNumbers[i] = 1
      }
      const seen = distinctValues[i]
      if (repeated[i] && seen.size > DISTINCT_LIMIT) continue
      if (seen.has(key)) repeated[i] = 1
      else seen.add(key)
    }
  }

  return headers.map((header, i) => {
    const count = counts[i]
    const allDates = !notDates[i]
    const allNumbers = !notNumbers[i]
    const distinct = distinctValues[i].size

    const override = columnOverrides[header] ?? {}
    const empty = count === 0
    const type = override.type ?? inferType(header, count, allDates, allNumbers)
    // Suggest a dropdown for text columns with a handful of repeating values (e.g. status, state).
    const suggested = override.filterable ?? (type === 'text' && distinct >= 2 && distinct <= 50 && distinct < count * 0.6)

    return {
      key: `c${i}`,
      index: i,
      header,
      label: override.label ?? humanize(header),
      type,
      display: override.display,
      hidden: override.hidden ?? false,
      empty,
      // Every row has a different, non-empty value: a good card/detail title.
      unique: !empty && count === dataRows.length && distinct === count,
      suggestedFilter: !empty && suggested,
      filterKind: filterKindFor(type, distinct),
    }
  })
}
