import { describe, expect, it } from 'vitest'
import { formatCell } from './formatCell.js'

// Output depends on the machine's locale, so these check the parts that are the same everywhere.
describe('formatCell', () => {
  it('returns an empty string for empty cells', () => {
    expect(formatCell(null, 'text')).toBe('')
    expect(formatCell(undefined, 'number')).toBe('')
    expect(formatCell('', 'text')).toBe('')
  })

  it('formats currency with a dollar sign and at most 2 decimals', () => {
    const text = formatCell(1234.567, 'currency')
    expect(text).toContain('$')
    expect(text).toMatch(/1.?234.57/)
  })

  it('formats numbers with grouping', () => {
    expect(formatCell(1234.5, 'number')).toMatch(/1.?234.5/)
  })

  it('shows codes exactly as typed (no grouping)', () => {
    expect(formatCell(96813, 'code')).toBe('96813')
  })

  it('formats dates in UTC so they never shift a day', () => {
    const text = formatCell(new Date('2024-03-05T00:00:00Z'), 'date')
    expect(text).toContain('2024')
    expect(text).toMatch(/\b5\b/)
  })

  it('returns an empty string for invalid dates', () => {
    expect(formatCell(new Date('not a date'), 'date')).toBe('')
  })
})
