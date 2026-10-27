// Runs inside a Web Worker (src/workers/parseExcel.worker.js), so it uses the worker build.
import readXlsxFile from 'read-excel-file/web-worker'
import { rangeFilters, SUGGESTED_FILTERS } from '../config/columns.js'
import { detectColumns, uniqueHeaders } from './detectColumns.js'
import { formatCell } from './formatCell.js'

const isEmpty = (cell) => cell === null || cell === undefined || cell === ''
const PROGRESS_EVERY = 5000

// Reads every sheet of an .xlsx file. The first non-empty row of each sheet is its header row.
// Returns { sheets: [{ name, columns, rows, titleKey, pairRanges, suggestedFilterKeys }] },
// skipping sheets without data; throws an Error with a user-facing message on failure.
//
// Each row is an array: row[column.index] is the cell value, and row[columns.length] is the
// row's lowercase search text. Arrays (not objects) keep the hand-off from the worker fast.
// onProgress(message) reports what is happening, for the loading screen.
export async function parseExcel(file, onProgress = () => {}) {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('Please choose an .xlsx file.')
  }

  onProgress('Reading workbook…')
  let result
  try {
    result = await readXlsxFile(file)
  } catch {
    throw new Error('Could not read this file. Make sure it is a valid .xlsx workbook.')
  }

  // Newer read-excel-file versions return [{ sheet, data }]; older ones return one sheet's rows.
  const rawSheets = Array.isArray(result?.[0]?.data) ? result : [{ sheet: 'Sheet1', data: result ?? [] }]
  const sheets = rawSheets
    .map(({ sheet, data }) => parseSheet(sheet, data, rawSheets.length > 1 ? `${sheet}: ` : '', onProgress))
    .filter(Boolean)

  if (sheets.length === 0) {
    throw new Error('No data found. The file needs a header row followed by at least one row of data.')
  }
  return { sheets }
}

function parseSheet(name, data, progressPrefix, onProgress) {
  const headerIndex = data.findIndex((row) => row.some((cell) => !isEmpty(cell)))
  if (headerIndex === -1) return null

  const dataRows = data.slice(headerIndex + 1).filter((row) => row.some((cell) => !isEmpty(cell)))
  if (dataRows.length === 0) return null

  onProgress(`${progressPrefix}Analyzing ${dataRows.length.toLocaleString()} rows…`)
  const width = dataRows.reduce((max, row) => Math.max(max, row.length), data[headerIndex].length)
  const headers = uniqueHeaders(data[headerIndex], width)
  const columns = detectColumns(headers, dataRows)

  const rows = dataRows.map((cells, r) => {
    if (r % PROGRESS_EVERY === 0) {
      onProgress(`${progressPrefix}Preparing rows… ${Math.round((r / dataRows.length) * 100)}%`)
    }
    const row = new Array(width + 1)
    const texts = []
    for (let i = 0; i < width; i++) {
      const value = isEmpty(cells[i]) ? null : cells[i]
      row[i] = value
      if (value !== null) texts.push(formatCell(value, columns[i].type))
    }
    // Precomputed search text of every cell, so search stays fast on wide files.
    row[width] = texts.join('\n').toLowerCase()
    return row
  })

  const byHeader = new Map(columns.map((c) => [c.header, c]))
  const pairRanges = rangeFilters
    .filter((r) => byHeader.has(r.fromHeader) && byHeader.has(r.toHeader))
    .map((r) => ({
      key: `pair:${r.key}`,
      label: r.label,
      hint: r.hint,
      fromIndex: byHeader.get(r.fromHeader).index,
      toIndex: byHeader.get(r.toHeader).index,
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
