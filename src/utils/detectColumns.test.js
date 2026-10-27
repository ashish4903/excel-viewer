import { describe, expect, it } from 'vitest'
import { detectColumns, humanize, uniqueHeaders } from './detectColumns.js'

const d = (iso) => new Date(`${iso}T00:00:00Z`)

describe('uniqueHeaders', () => {
  it('names blank headers by position and numbers repeats', () => {
    expect(uniqueHeaders(['City', '', 'City', null], 5)).toEqual(['City', 'Column 2', 'City (2)', 'Column 4', 'Column 5'])
  })

  it('trims whitespace', () => {
    expect(uniqueHeaders(['  Name  '], 1)).toEqual(['Name'])
  })
})

describe('humanize', () => {
  it('turns SNAKE_CASE headers into words', () => {
    expect(humanize('EMP_BUSINESS_NAME')).toBe('Emp Business Name')
  })

  it('keeps short words as written', () => {
    expect(humanize('JOB_OPP_WAGE_TO')).toBe('Job Opp Wage TO')
  })

  it('keeps mixed-case headers unchanged', () => {
    expect(humanize('First name')).toBe('First name')
  })
})

describe('detectColumns', () => {
  const headers = ['Name', 'Status', 'Salary', 'Start', 'Zip code', 'Notes']
  const rows = [
    ['Ann', 'Active', 50000, d('2024-01-05'), 96813, null],
    ['Bob', 'Active', 62000, d('2024-02-10'), 10001, null],
    ['Cy', 'Left', 48000, d('2023-11-20'), 73301, ''],
    ['Di', 'Active', 75000, d('2024-03-01'), 98101, null],
  ]
  const byHeader = Object.fromEntries(detectColumns(headers, rows).map((c) => [c.header, c]))

  it('gives each column a stable key and its position', () => {
    expect(byHeader.Name).toMatchObject({ key: 'c0', index: 0 })
    expect(byHeader.Notes).toMatchObject({ key: 'c5', index: 5 })
  })

  it('detects text, number, date, code and empty columns', () => {
    expect(byHeader.Name.type).toBe('text')
    expect(byHeader.Salary.type).toBe('number')
    expect(byHeader.Start.type).toBe('date')
    expect(byHeader['Zip code'].type).toBe('code')
    expect(byHeader.Notes.type).toBe('empty')
    expect(byHeader.Notes.empty).toBe(true)
  })

  it('picks a filter kind for each type', () => {
    expect(byHeader.Status.filterKind).toBe('select')
    expect(byHeader.Salary.filterKind).toBe('numberRange')
    expect(byHeader.Start.filterKind).toBe('dateRange')
  })

  it('suggests a filter for text columns with a few repeating values', () => {
    expect(byHeader.Status.suggestedFilter).toBe(true)
    expect(byHeader.Name.suggestedFilter).toBe(false) // every value different
    expect(byHeader.Notes.suggestedFilter).toBe(false)
  })

  it('marks fully populated, all-different columns as unique (title candidates)', () => {
    expect(byHeader.Name.unique).toBe(true)
    expect(byHeader.Status.unique).toBe(false)
  })

  it('uses a text search instead of a dropdown when a column has over 200 values', () => {
    const many = Array.from({ length: 250 }, (_, i) => [`item ${i}`])
    expect(detectColumns(['Item'], many)[0].filterKind).toBe('contains')
  })

  it('applies per-header overrides from the config', () => {
    const [status] = detectColumns(['CASE_STATUS'], [['Certified'], ['Denied']])
    expect(status.label).toBe('Status')
    expect(status.suggestedFilter).toBe(true)
  })
})
