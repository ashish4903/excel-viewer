import { describe, expect, it } from 'vitest'
import { ImportError, parseExcel } from './parseExcel.js'
import { makeXlsx } from './xlsxFixture.js'

const ZIP = [0x50, 0x4b, 0x03, 0x04]
const bytesFile = (name = 'data.xlsx', bytes = ZIP) => new File([new Uint8Array(bytes)], name)
const d = (iso) => new Date(`${iso}T00:00:00Z`)
const worksheet = (rows, prefix = '') =>
  `<${prefix}worksheet ${prefix ? `xmlns:${prefix.slice(0, -1)}` : 'xmlns'}="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><${prefix}sheetData>${rows}</${prefix}sheetData></${prefix}worksheet>`

// Cell values of the first sheet's data rows (without the search text at the end).
async function cells(file) {
  const [sheet] = (await parseExcel(file)).sheets
  return sheet.rows.map((row) => row.slice(0, sheet.columns.length))
}

describe('parseExcel: file checks', () => {
  it('rejects files that are not .xlsx', async () => {
    await expect(parseExcel(bytesFile('notes.csv'))).rejects.toThrow('Please choose an .xlsx file.')
  })

  it('rejects empty files', async () => {
    await expect(parseExcel(bytesFile('empty.xlsx', []))).rejects.toThrow('This file is empty (0 bytes).')
  })

  it('explains password-protected and old .xls files', async () => {
    await expect(parseExcel(bytesFile('locked.xlsx', [0xd0, 0xcf, 0x11, 0xe0]))).rejects.toThrow(/password-protected/)
  })

  it('rejects files renamed to .xlsx, with the starting bytes as detail', async () => {
    const error = await parseExcel(bytesFile('fake.xlsx', [0x74, 0x68, 0x69, 0x73])).catch((e) => e)
    expect(error).toBeInstanceOf(ImportError)
    expect(error.message).toMatch(/isn’t a real .xlsx/)
    expect(error.detail).toContain('74 68 69 73')
  })

  it('reports a damaged zip', async () => {
    const error = await parseExcel(bytesFile('broken.xlsx', [...ZIP, 1, 2, 3])).catch((e) => e)
    expect(error.message).toMatch(/Could not read this workbook/)
    expect(error.detail).toMatch(/zip directory/i)
  })

  it('reports a zip that is not a workbook', async () => {
    const file = makeXlsx([{ name: 'S', rows: [['A'], [1]] }], { files: { 'xl/workbook.xml': null } })
    const error = await parseExcel(file).catch((e) => e)
    expect(error.message).toMatch(/Could not read this workbook/)
    expect(error.detail).toContain('xl/workbook.xml is missing')
  })
})

describe('parseExcel: sheet data', () => {
  it('uses the first non-empty row as headers and builds row arrays with search text', async () => {
    const file = makeXlsx([
      {
        name: 'Cases',
        rows: [
          [null, null, null],
          ['CASE_NUMBER', 'CASE_STATUS', 'RECEIVED_DATE'],
          ['G-1', 'Certified', d('2024-01-05')],
          [null, null, null],
          ['G-2', 'Denied', d('2024-02-10')],
          ['G-3', 'Certified', d('2024-03-01')],
        ],
      },
    ])
    const { sheets } = await parseExcel(file)
    const [sheet] = sheets

    expect(sheet.name).toBe('Cases')
    expect(sheet.columns.map((c) => c.header)).toEqual(['CASE_NUMBER', 'CASE_STATUS', 'RECEIVED_DATE'])
    expect(sheet.columns[2].type).toBe('date')
    expect(sheet.rows).toHaveLength(3) // blank rows dropped
    expect(sheet.rows[0].slice(0, 3)).toEqual(['G-1', 'Certified', d('2024-01-05')])
    expect(sheet.rows[0][3]).toContain('g-1\ncertified') // lowercase search text after the cells
    expect(sheet.titleKey).toBe('c0') // first unique, fully filled column
    expect(sheet.suggestedFilterKeys).toContain('c1')
  })

  it('pads short rows and replaces empty cells with null', async () => {
    const file = makeXlsx([{ name: 'S', rows: [['A', 'B', 'C'], ['x'], ['y', '', 'z']] }])
    expect(await cells(file)).toEqual([
      ['x', null, null],
      ['y', null, 'z'],
    ])
  })

  it('adds the salary range filter when both wage columns exist', async () => {
    const file = makeXlsx([{ name: 'S', rows: [['JOB_OPP_WAGE_FROM', 'JOB_OPP_WAGE_TO'], [50000, 60000], [70000, null]] }])
    const [sheet] = (await parseExcel(file)).sheets
    expect(sheet.pairRanges).toEqual([expect.objectContaining({ key: 'pair:wage', fromIndex: 0, toIndex: 1 })])
  })

  it('skips sheets without data and keeps the rest', async () => {
    const file = makeXlsx([
      { name: 'Empty', rows: [] },
      { name: 'Headers only', rows: [['A', 'B']] },
      { name: 'Data', rows: [['A'], ['1']] },
    ])
    const { sheets } = await parseExcel(file)
    expect(sheets.map((s) => s.name)).toEqual(['Data'])
  })

  it('explains when no sheet has data, listing the sheets checked', async () => {
    const error = await parseExcel(makeXlsx([{ name: 'Cases', rows: [['A', 'B']] }])).catch((e) => e)
    expect(error.message).toMatch(/No data found/)
    expect(error.detail).toBe('Sheets checked: Cases (1 rows incl. header)')
  })
})

describe('parseExcel: reading cells', () => {
  it('reads numbers, booleans, trimmed text and special characters', async () => {
    const file = makeXlsx([{ name: 'S', rows: [['A', 'B', 'C', 'D'], [-12.5, true, '  padded  ', 'R&D <"x">'], [1e15, false, 'café 😀', null]] }])
    expect(await cells(file)).toEqual([
      [-12.5, true, 'padded', 'R&D <"x">'],
      [1e15, false, 'café 😀', null],
    ])
  })

  it('reads inline strings, formula text, rich text and escaped characters', async () => {
    const xml = worksheet(
      '<row r="1"><c r="A1" t="inlineStr"><is><t>Head</t></is></c></row>' +
        '<row r="2"><c r="A2" t="str"><f>A1</f><v>from formula</v></c></row>' +
        '<row r="3"><c r="A3" t="inlineStr"><is><r><rPr><b/></rPr><t>Bold</t></r><r><t xml:space="preserve"> part</t></r><rPh><t>skip</t></rPh></is></c></row>' +
        '<row r="4"><c r="A4" t="inlineStr"><is><t>Line_x000D_break &amp; &#233;&#x41;</t></is></c></row>',
    )
    expect(await cells(makeXlsx([{ name: 'S', xml }]))).toEqual([['from formula'], ['Bold part'], ['Line\rbreak & éA']])
  })

  it('treats Excel errors such as #N/A as blank cells', async () => {
    const xml = worksheet('<row r="1"><c r="A1" t="inlineStr"><is><t>H</t></is></c><c r="B1" t="inlineStr"><is><t>I</t></is></c></row><row r="2"><c r="A2" t="e"><v>#N/A</v></c><c r="B2"><v>1</v></c></row>')
    expect(await cells(makeXlsx([{ name: 'S', xml }]))).toEqual([[null, 1]])
  })

  it('places cells by their reference and handles cells without one', async () => {
    const xml = worksheet('<row r="1"><c r="B1"><v>1</v></c><c><v>2</v></c><c r="E1"><v>3</v></c></row><row r="3"><c r="A3"><v>4</v></c></row>')
    const [sheet] = (await parseExcel(makeXlsx([{ name: 'S', xml }]))).sheets
    expect(sheet.columns.map((c) => c.header)).toEqual(['Column 1', '1', '2', 'Column 4', '3'])
    expect(sheet.rows[0].slice(0, 5)).toEqual([4, null, null, null, null])
  })

  it('converts date-formatted numbers using built-in and custom formats', async () => {
    const xml = worksheet(
      '<row r="1"><c r="A1" t="inlineStr"><is><t>Built-in</t></is></c><c r="B1" t="inlineStr"><is><t>Custom</t></is></c><c r="C1" t="inlineStr"><is><t>Plain</t></is></c><c r="D1" t="inlineStr"><is><t>Time</t></is></c></row>' +
        '<row r="2"><c r="A2" s="1"><v>45356</v></c><c r="B2" s="2"><v>45356.5</v></c><c r="C2"><v>45356</v></c><c r="D2" s="1"><v>0.5208449074</v></c></row>' +
        '<row r="3"><c r="A3" s="1"><v>10</v></c></row>',
    )
    expect(await cells(makeXlsx([{ name: 'S', xml }]))).toEqual([
      [d('2024-03-05'), new Date('2024-03-05T12:00:00Z'), 45356, new Date('1899-12-30T12:30:01Z')],
      [d('1900-01-10'), null, null, null], // before Excel's fake 1900-02-29
    ])
  })

  it('supports the 1904 date system', async () => {
    const xml = worksheet('<row r="1"><c r="A1" t="inlineStr"><is><t>D</t></is></c></row><row r="2"><c r="A2" s="1"><v>43894</v></c></row>')
    expect(await cells(makeXlsx([{ name: 'S', xml }], { date1904: true }))).toEqual([[d('2024-03-05')]])
  })

  it('reads sheets written with a namespace prefix', async () => {
    const xml = worksheet('<x:row r="1"><x:c r="A1" t="inlineStr"><x:is><x:t>Name</x:t></x:is></x:c></x:row><x:row r="2"><x:c r="A2"><x:v>7</x:v></x:c></x:row>', 'x:')
    expect(await cells(makeXlsx([{ name: 'S', xml }]))).toEqual([[7]])
  })

  it('reads many rows split across chunks', async () => {
    const rows = [['ID', 'Name'], ...Array.from({ length: 3000 }, (_, i) => [i, `name ${i} `.repeat(5)])]
    const result = await cells(makeXlsx([{ name: 'S', rows }]))
    expect(result).toHaveLength(3000)
    expect(result[2999]).toEqual([2999, `name 2999 `.repeat(5).trim()])
  })

  it('keeps the sheet order and names from the workbook', async () => {
    const file = makeXlsx([
      { name: 'Second & <more>', rows: [['A'], [1]] },
      { name: 'First', rows: [['B'], [2]] },
    ])
    expect((await parseExcel(file)).sheets.map((s) => s.name)).toEqual(['Second & <more>', 'First'])
  })
})

