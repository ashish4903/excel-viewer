const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 })

// Formats a parsed cell value for display based on its column type.
export function formatCell(value, type) {
  if (value === null || value === undefined || value === '') return ''
  // Excel dates are parsed as UTC midnight; format in UTC so they don't shift a day.
  if (value instanceof Date) {
    return value.toLocaleDateString(undefined, { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })
  }
  if (typeof value === 'number') {
    if (type === 'currency') return currency.format(value)
    if (type === 'number') return number.format(value)
  }
  return String(value)
}
