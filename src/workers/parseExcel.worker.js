import { ImportError, parseExcel } from '../utils/parseExcel.js'
import { createStringTable, encodeRows } from '../utils/rowTransfer.js'

// Rows are posted in batches so the page decodes them in small steps instead of one long freeze.
const ROWS_PER_MESSAGE = 5000

// Receives a File and posts, in order:
//   { type: 'progress', message }               status text while parsing
//   { type: 'preview', sheet }                   large files only: the first sheet's first rows, early
//   { type: 'rows', sheet, ...encoded batch }    a batch of rows for sheet index `sheet` (see rowTransfer.js)
//   { type: 'done', sheets }                     sheet metadata (rows: [] — reassembled from the batches)
//   { type: 'error', message, detail }           on failure
self.onmessage = async ({ data: file }) => {
  try {
    const { sheets } = await parseExcel(file, (message) => self.postMessage({ type: 'progress', message }), {
      onPreview: (sheet) => self.postMessage({ type: 'preview', sheet }),
    })
    sheets.forEach((sheet, index) => {
      const table = createStringTable()
      for (let start = 0; start < sheet.rows.length; start += ROWS_PER_MESSAGE) {
        const batch = sheet.rows.slice(start, start + ROWS_PER_MESSAGE)
        const { message, transfer } = encodeRows(batch, sheet.columns.length, table)
        self.postMessage({ type: 'rows', sheet: index, ...message }, transfer)
      }
    })
    self.postMessage({ type: 'done', sheets: sheets.map((sheet) => ({ ...sheet, rows: [] })) })
  } catch (err) {
    // Expected problems carry a user-facing message; anything else is a bug, so keep its stack as detail.
    const expected = err instanceof ImportError
    self.postMessage({
      type: 'error',
      message: expected ? err.message : 'Something went wrong while reading this file.',
      detail: expected ? err.detail : (err?.stack ?? String(err)),
    })
  }
}
