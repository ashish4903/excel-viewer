import { parseExcel } from '../utils/parseExcel.js'

// Rows are posted in batches so the page copies them in small steps instead of one long freeze.
const ROWS_PER_MESSAGE = 5000

// Receives a File and posts, in order:
//   { type: 'progress', message }          status text while parsing
//   { type: 'rows', sheet, rows }           a batch of rows for sheet index `sheet`
//   { type: 'done', sheets }                sheet metadata (rows: [] — reassembled from the batches)
//   { type: 'error', message }              on failure
self.onmessage = async ({ data: file }) => {
  try {
    const { sheets } = await parseExcel(file, (message) => self.postMessage({ type: 'progress', message }))
    sheets.forEach((sheet, index) => {
      for (let start = 0; start < sheet.rows.length; start += ROWS_PER_MESSAGE) {
        self.postMessage({ type: 'rows', sheet: index, rows: sheet.rows.slice(start, start + ROWS_PER_MESSAGE) })
      }
    })
    self.postMessage({ type: 'done', sheets: sheets.map((sheet) => ({ ...sheet, rows: [] })) })
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message })
  }
}
