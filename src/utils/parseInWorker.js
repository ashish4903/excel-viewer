import { decodeRows } from './rowTransfer.js'

// Runs parseExcel in a Web Worker so large files don't freeze the page.
// onProgress(message) receives status text while the file is being read.
// Resolves to the same { sheets } shape parseExcel returns. Rejects with an Error whose
// `detail` holds technical information for the "Technical details" section and the console.
function failure(message, detail) {
  const err = new Error(message)
  err.detail = detail
  return err
}

export function parseInWorker(file, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    let worker
    try {
      worker = new Worker(new URL('../workers/parseExcel.worker.js', import.meta.url), { type: 'module' })
    } catch (err) {
      reject(failure('The file reader could not start in this browser.', err?.message ?? String(err)))
      return
    }
    const rowsBySheet = []
    const stringsBySheet = []
    let received = 0

    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        onProgress(data.message)
      } else if (data.type === 'rows') {
        decodeRows(data, (stringsBySheet[data.sheet] ??= []), (rowsBySheet[data.sheet] ??= []))
        received += data.search.length
        onProgress(`Loading ${received.toLocaleString()} rows…`)
      } else {
        worker.terminate()
        if (data.type === 'done') {
          resolve({ sheets: data.sheets.map((sheet, index) => ({ ...sheet, rows: rowsBySheet[index] ?? [] })) })
        } else {
          reject(failure(data.message, data.detail))
        }
      }
    }

    // The worker script itself failed to load or crashed (e.g. the dev server reloaded mid-import).
    // This is not a problem with the file, so say so.
    worker.onerror = (event) => {
      event.preventDefault()
      worker.terminate()
      const where = event.filename ? ` (${event.filename}${event.lineno ? `:${event.lineno}` : ''})` : ''
      reject(
        failure(
          'The file reader stopped unexpectedly. Reload the page and try again.',
          `${event.message || 'Worker failed to load; the browser gave no details.'}${where}`,
        ),
      )
    }

    worker.onmessageerror = () => {
      worker.terminate()
      reject(failure('The file was read but could not be passed to the page. Reload the page and try again.', 'messageerror from worker'))
    }

    worker.postMessage(file)
  })
}
