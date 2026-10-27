import { describe, expect, it } from 'vitest'
import {
  filterRows,
  getActiveFilters,
  getFilterOptions,
  getNumberBounds,
  isFilterActive,
  isRangeInvalid,
  sortRows,
  toNumber,
} from './filterRows.js'

const d = (iso) => new Date(`${iso}T00:00:00Z`)

const columns = [
  { key: 'c0', index: 0, type: 'text', filterKind: 'contains' },
  { key: 'c1', index: 1, type: 'text', filterKind: 'select' },
  { key: 'c2', index: 2, type: 'number', filterKind: 'numberRange' },
  { key: 'c3', index: 3, type: 'date', filterKind: 'dateRange' },
  { key: 'c4', index: 4, type: 'number', filterKind: 'numberRange' },
]
const pairRanges = [{ key: 'pair:wage', fromIndex: 2, toIndex: 4, type: 'number' }]

// Same shape parseExcel produces: cells, then the lowercase search text at row[columns.length].
const row = (name, status, from, start, to) => [name, status, from, start, to, `${name}\n${status}`.toLowerCase()]
const rows = [
  row('Ann Lee', 'Active', 50000, d('2024-01-05'), 60000),
  row('Bob Ray', 'Active', 70000, d('2024-02-10'), null),
  row('Cy Moe', 'Left', null, d('2023-11-20'), null),
  row('Di Fox', 'Left', 90000, null, 120000),
]
const names = (result) => result.map((r) => r[0])

describe('toNumber', () => {
  it('reads numbers and numeric text', () => {
    expect(toNumber(42)).toBe(42)
    expect(toNumber('$1,250.50')).toBe(1250.5)
  })

  it('returns null for empty or non-numeric values', () => {
    expect(toNumber('')).toBeNull()
    expect(toNumber(null)).toBeNull()
    expect(toNumber('n/a')).toBeNull()
    expect(toNumber(Infinity)).toBeNull()
  })
})

describe('filter state helpers', () => {
  it('treats blank strings and empty ranges as inactive', () => {
    expect(isFilterActive('')).toBe(false)
    expect(isFilterActive('  ')).toBe(false)
    expect(isFilterActive({ min: '', max: '' })).toBe(false)
    expect(isFilterActive('Active')).toBe(true)
    expect(isFilterActive({ min: '10' })).toBe(true)
  })

  it('lists only active filters', () => {
    expect(getActiveFilters({ c1: 'Active', c0: '', c2: { min: '', max: '' } })).toEqual([['c1', 'Active']])
  })

  it('flags ranges where min is greater than max', () => {
    expect(isRangeInvalid({ min: '10', max: '5' })).toBe(true)
    expect(isRangeInvalid({ min: '5', max: '10' })).toBe(false)
    expect(isRangeInvalid({ min: '10' })).toBe(false)
    expect(isRangeInvalid({ min: '2024-05-01', max: '2024-01-01' }, 'date')).toBe(true)
  })
})

describe('filterRows', () => {
  const run = (options) => names(filterRows(rows, { columns, pairRanges, ...options }))

  it('returns the same array when nothing is active', () => {
    expect(filterRows(rows, { columns })).toBe(rows)
  })

  it('searches across columns, ignoring case', () => {
    expect(run({ search: 'LEFT' })).toEqual(['Cy Moe', 'Di Fox'])
    expect(run({ search: '  bob ' })).toEqual(['Bob Ray'])
  })

  it('filters by a dropdown value', () => {
    expect(run({ filters: { c1: 'Active' } })).toEqual(['Ann Lee', 'Bob Ray'])
  })

  it('filters by contained text', () => {
    expect(run({ filters: { c0: 'o' } })).toEqual(['Bob Ray', 'Cy Moe', 'Di Fox'])
  })

  it('filters by number range and skips empty cells', () => {
    expect(run({ filters: { c2: { min: '60000', max: '' } } })).toEqual(['Bob Ray', 'Di Fox'])
  })

  it('filters by date range', () => {
    expect(run({ filters: { c3: { min: '2024-01-01', max: '2024-01-31' } } })).toEqual(['Ann Lee'])
  })

  it('matches salary ranges that overlap the from/to pair', () => {
    // Ann 50k-60k, Bob 70k (no "to"), Di 90k-120k; Cy has no wage.
    expect(run({ filters: { 'pair:wage': { min: '55000', max: '75000' } } })).toEqual(['Ann Lee', 'Bob Ray'])
    expect(run({ filters: { 'pair:wage': { min: '100000', max: '' } } })).toEqual(['Di Fox'])
  })

  it('combines search and filters', () => {
    expect(run({ search: 'active', filters: { c2: { min: '60000' } } })).toEqual(['Bob Ray'])
  })

  it('ignores filters for columns that no longer exist', () => {
    expect(run({ filters: { c99: 'x' } })).toEqual(names(rows))
  })
})

describe('sortRows', () => {
  it('sorts numbers both ways and keeps empty cells last', () => {
    expect(names(sortRows(rows, { key: 'c2', direction: 'asc' }, columns))).toEqual(['Ann Lee', 'Bob Ray', 'Di Fox', 'Cy Moe'])
    expect(names(sortRows(rows, { key: 'c2', direction: 'desc' }, columns))).toEqual(['Di Fox', 'Bob Ray', 'Ann Lee', 'Cy Moe'])
  })

  it('sorts dates', () => {
    expect(names(sortRows(rows, { key: 'c3', direction: 'asc' }, columns))).toEqual(['Cy Moe', 'Ann Lee', 'Bob Ray', 'Di Fox'])
  })

  it('sorts text naturally (2 before 10) and ignores case', () => {
    const text = [['item 10'], ['Item 2'], ['item 1']]
    expect(sortRows(text, { key: 'c0', direction: 'asc' }, [columns[0]]).map((r) => r[0])).toEqual(['item 1', 'Item 2', 'item 10'])
  })

  it('leaves rows unchanged without a sort column, and does not mutate the input', () => {
    expect(sortRows(rows, { key: null }, columns)).toBe(rows)
    const copy = [...rows]
    sortRows(rows, { key: 'c2', direction: 'desc' }, columns)
    expect(rows).toEqual(copy)
  })
})

describe('getFilterOptions and getNumberBounds', () => {
  it('lists distinct non-empty values, sorted', () => {
    expect(getFilterOptions(rows, columns[1])).toEqual(['Active', 'Left'])
  })

  it('finds the smallest and largest number across columns', () => {
    expect(getNumberBounds(rows, [2, 4])).toEqual({ min: 50000, max: 120000 })
    expect(getNumberBounds([], [2])).toEqual({ min: null, max: null })
  })
})
