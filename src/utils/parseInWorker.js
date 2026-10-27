// Runs parseExcel in a Web Worker so large files don't freeze the page.
// onProgress(message) receives status text while the file is being read.
// Resolves to the same { sheets } shape parseExcel returns.
export function parseInWorker(file, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/parseExcel.worker.js', import.meta.url), { type: 'module' })
    const rowsBySheet = []
    let received = 0

    worker.onmessage = ({ data }) => {
      if (data.type === 'progress') {
        onProgress(data.message)
      } else if (data.type === 'rows') {
        const rows = (rowsBySheet[data.sheet] ??= [])
        for (const row of data.rows) rows.push(row)
        received += data.rows.length
        onProgress(`Loading ${received.toLocaleString()} rows…`)
      } else {
        worker.terminate()
        if (data.type === 'done') {
          resolve({ sheets: data.sheets.map((sheet, index) => ({ ...sheet, rows: rowsBySheet[index] ?? [] })) })
        } else {
          reject(new Error(data.message))
        }
      }
    }

    worker.onerror = (event) => {
      event.preventDefault()
      worker.terminate()
      reject(new Error('Could not read this file. Make sure it is a valid .xlsx workbook.'))
    }

    worker.postMessage(file)
  })
}
