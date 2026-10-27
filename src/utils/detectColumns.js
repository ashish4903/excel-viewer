import { columnOverrides } from '../config/columns.js'

const isEmpty = (value) => value === null || value === undefined || value === ''

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

function inferType(header, values) {
  if (values.length === 0) return 'empty'
  if (values.every((v) => v instanceof Date)) return 'date'
  if (values.every((v) => typeof v === 'number')) return isCodeHeader(header) ? 'code' : 'number'
  return 'text'
}

function filterKindFor(type, distinct) {
  if (type === 'date') return 'dateRange'
  if (type === 'number' || type === 'currency') return 'numberRange'
  return distinct <= 200 ? 'select' : 'contains'
}

// Builds column definitions from headers and data rows (arrays of cells).
export function detectColumns(headers, dataRows) {
  return headers.map((header, i) => {
    const values = dataRows.map((row) => row[i]).filter((v) => !isEmpty(v))
    const distinct = new Set(values.map((v) => (v instanceof Date ? v.getTime() : v))).size
    const override = columnOverrides[header] ?? {}
    const empty = values.length === 0
    const type = override.type ?? inferType(header, values)
    // Suggest a dropdown for text columns with a handful of repeating values (e.g. status, state).
    const suggested = override.filterable ?? (type === 'text' && distinct >= 2 && distinct <= 50 && distinct < values.length * 0.6)

    return {
      key: `c${i}`,
      header,
      label: override.label ?? humanize(header),
      type,
      display: override.display,
      hidden: override.hidden ?? false,
      empty,
      // Every row has a different, non-empty value: a good card/detail title.
      unique: !empty && values.length === dataRows.length && distinct === values.length,
      suggestedFilter: !empty && suggested,
      filterKind: filterKindFor(type, distinct),
    }
  })
}
