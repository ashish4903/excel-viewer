import { formatCell } from './formatCell.js'

// Text that Excel would run as a formula when the CSV is opened (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/

// Builds CSV text for the given rows and columns, using the same formatting as the UI.
// Text cells that start like a formula get a leading ' so spreadsheet apps show them as text.
export function toCsv(rows, columns) {
  const escape = (value) => `"${String(value).replace(/"/g, '""')}"`
  const cell = (value, column) => {
    const text = formatCell(value, column.type)
    return escape(typeof value === 'string' && FORMULA_START.test(text) ? `'${text}` : text)
  }
  return [
    columns.map((c) => escape(c.label)).join(','),
    ...rows.map((row) => columns.map((c) => cell(row[c.index], c)).join(',')),
  ].join('\r\n')
}

// Downloads rows as a CSV of the given columns.
export function exportCsv(rows, columns, fileName) {
  // BOM so Excel opens the file as UTF-8.
  const blob = new Blob(['﻿' + toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
