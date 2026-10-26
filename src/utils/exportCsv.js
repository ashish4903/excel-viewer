import { formatCell } from './formatCell.js'

// Downloads rows as a CSV of the given columns, using the same formatting as the UI.
export function exportCsv(rows, columns, fileName) {
  const escape = (value) => `"${String(value).replace(/"/g, '""')}"`
  const lines = [
    columns.map((c) => escape(c.label)).join(','),
    ...rows.map((row) => columns.map((c) => escape(formatCell(row[c.key], c.type))).join(',')),
  ]
  // BOM so Excel opens the file as UTF-8.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
