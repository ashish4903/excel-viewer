import { beforeEach, describe, expect, it, vi } from 'vitest'
import readXlsxFile from 'read-excel-file/web-worker'
import { ImportError, parseExcel } from './parseExcel.js'

// The real reader only runs in a browser worker, so tests replace it with a mock that returns sheet data.
vi.mock('read-excel-file/web-worker', () => ({ default: vi.fn() }))

const ZIP = [0x50, 0x4b, 0x03, 0x04]
const xlsx = (name = 'data.xlsx', bytes = ZIP) => new File([new Uint8Array(bytes)], name)
const d = (iso) => new Date(`${iso}T00:00:00Z`)

// Braces matter: a function returned from beforeEach is run as cleanup, and mockReset() returns the mock.
beforeEach(() => {
  readXlsxFile.mockReset()
})

describe('parseExcel: file checks', () => {
  it('rejects files that are not .xlsx', async () => {
    await expect(parseExcel(xlsx('notes.csv'))).rejects.toThrow('Please choose an .xlsx file.')
  })

  it('rejects empty files', async () => {
    await expect(parseExcel(xlsx('empty.xlsx', []))).rejects.toThrow('This file is empty (0 bytes).')
  })

  it('explains password-protected and old .xls files', async () => {
    await expect(parseExcel(xlsx('locked.xlsx', [0xd0, 0xcf, 0x11, 0xe0]))).rejects.toThrow(/password-protected/)
  })

  it('rejects files renamed to .xlsx, with the starting bytes as detail', async () => {
    const error = await parseExcel(xlsx('fake.xlsx', [0x74, 0x68, 0x69, 0x73])).catch((e) => e)
    expect(error).toBeInstanceOf(ImportError)
    expect(error.message).toMatch(/isn’t a real .xlsx/)
    expect(error.detail).toContain('74 68 69 73')
    expect(readXlsxFile).not.toHaveBeenCalled()
  })

  it('reports reader failures with the original error as detail', async () => {
    readXlsxFile.mockRejectedValue(new RangeError('Maximum call stack size exceeded'))
    const error = await parseExcel(xlsx()).catch((e) => e)
    expect(error.message).toMatch(/Could not read this workbook/)
    expect(error.detail).toContain('RangeError: Maximum call stack size exceeded')
  })
})

describe('parseExcel: sheet data', () => {
  it('uses the first non-empty row as headers and builds row arrays with search text', async () => {
    readXlsxFile.mockResolvedValue([
      {
        sheet: 'Cases',
        data: [
          [null, null, null],
          ['CASE_NUMBER', 'CASE_STATUS', 'RECEIVED_DATE'],
          ['G-1', 'Certified', d('2024-01-05')],
          [null, null, null],
          ['G-2', 'Denied', d('2024-02-10')],
          ['G-3', 'Certified', d('2024-03-01')],
        ],
      },
    ])
    const { sheets } = await parseExcel(xlsx())
    const [sheet] = sheets

    expect(sheet.name).toBe('Cases')
    expect(sheet.columns.map((c) => c.header)).toEqual(['CASE_NUMBER', 'CASE_STATUS', 'RECEIVED_DATE'])
    expect(sheet.rows).toHaveLength(3) // blank rows dropped
    expect(sheet.rows[0].slice(0, 2)).toEqual(['G-1', 'Certified'])
    expect(sheet.rows[0][3]).toContain('g-1\ncertified') // lowercase search text after the cells
    expect(sheet.titleKey).toBe('c0') // first unique, fully filled column
    expect(sheet.suggestedFilterKeys).toContain('c1')
  })

  it('pads short rows and replaces empty cells with null', async () => {
    readXlsxFile.mockResolvedValue([{ sheet: 'S', data: [['A', 'B', 'C'], ['x'], ['y', '', 'z']] }])
    const [sheet] = (await parseExcel(xlsx())).sheets
    expect(sheet.rows[0].slice(0, 3)).toEqual(['x', null, null])
    expect(sheet.rows[1].slice(0, 3)).toEqual(['y', null, 'z'])
  })

  it('adds the salary range filter when both wage columns exist', async () => {
    readXlsxFile.mockResolvedValue([
      { sheet: 'S', data: [['JOB_OPP_WAGE_FROM', 'JOB_OPP_WAGE_TO'], [50000, 60000], [70000, null]] },
    ])
    const [sheet] = (await parseExcel(xlsx())).sheets
    expect(sheet.pairRanges).toEqual([expect.objectContaining({ key: 'pair:wage', fromIndex: 0, toIndex: 1 })])
  })

  it('skips sheets without data and keeps the rest', async () => {
    readXlsxFile.mockResolvedValue([
      { sheet: 'Empty', data: [] },
      { sheet: 'Headers only', data: [['A', 'B']] },
      { sheet: 'Data', data: [['A'], ['1']] },
    ])
    const { sheets } = await parseExcel(xlsx())
    expect(sheets.map((s) => s.name)).toEqual(['Data'])
  })

  it('explains when no sheet has data, listing the sheets checked', async () => {
    readXlsxFile.mockResolvedValue([{ sheet: 'Cases', data: [['A', 'B']] }])
    const error = await parseExcel(xlsx()).catch((e) => e)
    expect(error.message).toMatch(/No data found/)
    expect(error.detail).toBe('Sheets checked: Cases (1 rows incl. header)')
  })
})
