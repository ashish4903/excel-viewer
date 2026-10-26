const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

// Formats a parsed cell value for display based on its column type.
export function formatCell(value, type) {
  if (value === null || value === undefined || value === '') return ''
  // Excel dates are parsed as UTC midnight; format in UTC so they don't shift a day.
  if (type === 'date' && value instanceof Date) {
    return value.toLocaleDateString(undefined, { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })
  }
  if (type === 'currency' && typeof value === 'number') return currency.format(value)
  return String(value)
}
