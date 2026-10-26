import readXlsxFile from 'read-excel-file/browser'
import { columns } from '../config/columns.js'

const isEmpty = (cell) => cell === null || cell === undefined || cell === ''

// Reads the first sheet of an .xlsx file and maps each configured column by its header.
// Returns { rows, missingColumns }; throws an Error with a user-facing message on failure.
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

  // Newer read-excel-file versions return [{ sheet, data }]; older ones return the rows directly.
  const sheetRows = Array.isArray(result?.[0]?.data) ? result[0].data : result
  if (!sheetRows || sheetRows.length === 0) {
    throw new Error('The file is empty.')
  }

  const [headerRow, ...dataRows] = sheetRows
  const indexByHeader = new Map(headerRow.map((header, i) => [String(header ?? '').trim(), i]))

  const missingColumns = columns.filter((c) => !indexByHeader.has(c.header)).map((c) => c.header)
  if (missingColumns.length === columns.length) {
    throw new Error('None of the expected columns were found. Check that the first row contains the column headers.')
  }

  const rows = dataRows
    .filter((row) => row.some((cell) => !isEmpty(cell)))
    .map((row) =>
      Object.fromEntries(
        columns.map((c) => {
          const index = indexByHeader.get(c.header)
          return [c.key, index === undefined || isEmpty(row[index]) ? null : row[index]]
        }),
      ),
    )

  if (rows.length === 0) {
    throw new Error('The file has headers but no data rows.')
  }

  return { rows, missingColumns }
}
