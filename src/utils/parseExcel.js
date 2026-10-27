import readXlsxFile from 'read-excel-file/browser'
import { rangeFilters, SUGGESTED_FILTERS } from '../config/columns.js'
import { detectColumns, uniqueHeaders } from './detectColumns.js'
import { formatCell } from './formatCell.js'

const isEmpty = (cell) => cell === null || cell === undefined || cell === ''

// Reads every sheet of an .xlsx file. The first non-empty row of each sheet is its header row.
// Returns { sheets: [{ name, columns, rows, titleKey, pairRanges, suggestedFilterKeys }] },
// skipping sheets without data; throws an Error with a user-facing message on failure.
export async function parseExcel(file) {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('Please choose an .xlsx file.')
  }

  let result
  try {
    result = await readXlsxFile(file)
  } catch {
    throw new Error('Could not read this file. Make sure it is a valid .xlsx workbook.')
  }

  // Newer read-excel-file versions return [{ sheet, data }]; older ones return one sheet's rows.
  const rawSheets = Array.isArray(result?.[0]?.data) ? result : [{ sheet: 'Sheet1', data: result ?? [] }]
  const sheets = rawSheets.map(({ sheet, data }) => parseSheet(sheet, data)).filter(Boolean)

  if (sheets.length === 0) {
    throw new Error('No data found. The file needs a header row followed by at least one row of data.')
  }
  return { sheets }
}

function parseSheet(name, data) {
  const headerIndex = data.findIndex((row) => row.some((cell) => !isEmpty(cell)))
  if (headerIndex === -1) return null

  const dataRows = data.slice(headerIndex + 1).filter((row) => row.some((cell) => !isEmpty(cell)))
  if (dataRows.length === 0) return null

  const width = dataRows.reduce((max, row) => Math.max(max, row.length), data[headerIndex].length)
  const headers = uniqueHeaders(data[headerIndex], width)
  const columns = detectColumns(headers, dataRows)

  const rows = dataRows.map((cells) => {
    const row = {}
    columns.forEach((c, i) => {
      row[c.key] = isEmpty(cells[i]) ? null : cells[i]
    })
    // Precomputed lowercase text of every cell, so search stays fast on wide files.
    row._search = columns
      .map((c) => formatCell(row[c.key], c.type))
      .join('\n')
      .toLowerCase()
    return row
  })

  const byHeader = new Map(columns.map((c) => [c.header, c]))
  const pairRanges = rangeFilters
    .filter((r) => byHeader.has(r.fromHeader) && byHeader.has(r.toHeader))
    .map((r) => ({
      key: `pair:${r.key}`,
      label: r.label,
      hint: r.hint,
      fromKey: byHeader.get(r.fromHeader).key,
      toKey: byHeader.get(r.toHeader).key,
      type: byHeader.get(r.fromHeader).type,
    }))

  const titleColumn = columns.find((c) => c.unique) ?? columns.find((c) => !c.empty)

  return {
    name,
    columns,
    rows,
    titleKey: titleColumn.key,
    pairRanges,
    suggestedFilterKeys: columns
      .filter((c) => c.suggestedFilter)
      .slice(0, SUGGESTED_FILTERS)
      .map((c) => c.key),
  }
}
