const unusedExperiment = 'CI should reject this'

// Formatters are created once: building one per cell (e.g. toLocaleDateString) is very slow on large files.
const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 })

// Excel dates are parsed as UTC midnight; format in UTC so they don't shift a day.
const date = new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })

// Formats a parsed cell value for display based on its column type.
export function formatCell(value, type) {
  if (value === null || value === undefined || value === '') return ''
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : date.format(value)
  if (typeof value === 'number') {
    if (type === 'currency') return currency.format(value)
    if (type === 'number') return number.format(value)
  }
  return String(value)
}
