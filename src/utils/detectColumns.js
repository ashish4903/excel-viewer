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
  return headers.map((header, i) => {
    // Single pass over the column, without intermediate arrays (matters for 50k+ row files).
    // Distinct values are only compared with small limits (50, 200) and checked for "all different",
    // so counting stops once a repeat has been seen and there are more than DISTINCT_LIMIT of them.
    let count = 0
    let allDates = true
    let allNumbers = true
    let repeated = false
    const distinctValues = new Set()
    for (const row of dataRows) {
      const v = row[i]
      if (isEmpty(v)) continue
      count++
      const key = v instanceof Date ? v.getTime() : v
      if (v instanceof Date) {
        allNumbers = false
      } else {
        allDates = false
        if (typeof v !== 'number') allNumbers = false
      }
      if (repeated && distinctValues.size > DISTINCT_LIMIT) continue
      if (distinctValues.has(key)) repeated = true
      else distinctValues.add(key)
    }
    const distinct = distinctValues.size

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
