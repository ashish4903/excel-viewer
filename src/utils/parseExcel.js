// Runs inside a Web Worker (src/workers/parseExcel.worker.js).
// Reads .xlsx files directly: an .xlsx is a zip of XML parts, which are unzipped with the browser's
// built-in DecompressionStream and scanned as text. No library: this is several times faster than
// a general XML parser on large sheets, and parts are read in chunks so huge sheets never need to be
// held as one string.
import { rangeFilters, SUGGESTED_FILTERS } from '../config/columns.js'
import { detectColumns, uniqueHeaders } from './detectColumns.js'
import { formatCell } from './formatCell.js'

const isEmpty = (cell) => cell === null || cell === undefined || cell === ''
const PROGRESS_EVERY = 5000
// On large sheets the first PREVIEW_ROWS data rows are handed on early (see onPreview in parseExcel),
// so the page can show them while the rest loads. Smaller sheets load quickly enough without.
const PREVIEW_ROWS = 100
const PREVIEW_MIN_BYTES = 16 * 1024 * 1024
// Formatted search text is cached per column for repeated numbers and dates, up to this many values.
const FORMAT_CACHE_LIMIT = 10000

// A failure with a user-facing message plus technical detail (shown under "Technical details" and logged).
export class ImportError extends Error {
  constructor(message, detail = '') {
    super(message)
    this.name = 'ImportError'
    this.detail = detail
  }
}

const UNREADABLE = 'Could not read this workbook. It may be damaged; try opening it in Excel and saving it again.'

// .xlsx files are zip archives; password-protected .xlsx and old .xls files are OLE compound files.
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0]

async function checkSignature(file) {
  if (file.size === 0) throw new ImportError('This file is empty (0 bytes).')
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())
  const startsWith = (signature) => signature.every((byte, i) => head[i] === byte)
  const hex = [...head].map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
  if (startsWith(OLE_SIGNATURE)) {
    throw new ImportError(
      'This file is password-protected or saved in the old .xls format. Open it in Excel and save it as .xlsx without a password.',
      `File starts with ${hex} (OLE compound file), not 50 4B 03 04 (.xlsx).`,
    )
  }
  if (!startsWith(ZIP_SIGNATURE)) {
    throw new ImportError(
      'This isn’t a real .xlsx workbook. It may be a CSV or another file renamed to .xlsx.',
      `File starts with ${hex}; .xlsx files start with 50 4B 03 04.`,
    )
  }
}

// ---------------------------------------------------------------------------------------------
// Zip

// Lists the zip's files from its central directory: Map of lowercase name -> entry.
async function readZipDirectory(file) {
  const tailSize = Math.min(file.size, 22 + 0xffff)
  const tail = new DataView(await file.slice(file.size - tailSize).arrayBuffer())
  let end = tailSize - 22
  while (end >= 0 && tail.getUint32(end, true) !== 0x06054b50) end--
  if (end < 0) throw new ImportError(UNREADABLE, 'The zip directory (end-of-central-directory record) is missing.')

  const count = tail.getUint16(end + 10, true)
  const size = tail.getUint32(end + 12, true)
  const offset = tail.getUint32(end + 16, true)
  if (count === 0xffff || offset === 0xffffffff) {
    throw new ImportError('This workbook is too large to open here.', 'The file uses ZIP64, which is not supported.')
  }
  const dir = new DataView(await file.slice(offset, offset + size).arrayBuffer())
  const decoder = new TextDecoder()
  const entries = new Map()
  for (let p = 0, i = 0; i < count; i++) {
    if (dir.getUint32(p, true) !== 0x02014b50) throw new ImportError(UNREADABLE, `Zip directory entry ${i} is damaged.`)
    const nameLength = dir.getUint16(p + 28, true)
    const name = decoder.decode(new Uint8Array(dir.buffer, p + 46, nameLength))
    entries.set(name.toLowerCase(), {
      name,
      method: dir.getUint16(p + 10, true),
      compressedSize: dir.getUint32(p + 20, true),
      size: dir.getUint32(p + 24, true),
      offset: dir.getUint32(p + 42, true),
    })
    p += 46 + nameLength + dir.getUint16(p + 30, true) + dir.getUint16(p + 32, true)
  }
  return entries
}

// Calls onChunk(text, fraction) with an entry's decompressed text, chunk by chunk.
async function readEntry(file, entry, onChunk) {
  const header = new DataView(await file.slice(entry.offset, entry.offset + 30).arrayBuffer())
  if (header.getUint32(0, true) !== 0x04034b50) throw new ImportError(UNREADABLE, `Zip entry ${entry.name} is damaged.`)
  const start = entry.offset + 30 + header.getUint16(26, true) + header.getUint16(28, true)
  const bytes = await file.slice(start, start + entry.compressedSize).arrayBuffer()
  let stream = new Response(bytes).body
  if (entry.method === 8) stream = stream.pipeThrough(new DecompressionStream('deflate-raw'))
  else if (entry.method !== 0) throw new ImportError(UNREADABLE, `${entry.name} uses unsupported zip compression (method ${entry.method}).`)

  const reader = stream.pipeThrough(new TextDecoderStream()).getReader()
  let read = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return
    read += value.length
    onChunk(value, entry.size ? Math.min(read / entry.size, 1) : 0)
  }
}

async function readEntryText(file, entry) {
  let text = ''
  await readEntry(file, entry, (chunk) => (text += chunk))
  return text
}

// Last index in text where a `<child` start tag begins, or -1.
function lastStartTag(text, open) {
  for (let i = text.lastIndexOf(open); i !== -1; i = i > 0 ? text.lastIndexOf(open, i - 1) : -1) {
    const after = i + open.length
    if (after < text.length && endsName(text.charCodeAt(after))) return i
  }
  return -1
}

// Streams an entry and calls onPart(xml, prefix) with pieces that each end right before a `<child`
// start tag, so every element in a piece is complete. prefix is the XML namespace prefix the file
// uses (usually '', sometimes 'x:'), detected from the root element.
// Each chunk is cut at its last `<child` start tag, so text is copied only once when joined. A tag
// split across two chunks is simply not used as a cut point; a later one is. Text without a cut
// point is kept as a list of chunks, so long stretches without one stay linear.
async function readEntryInParts(file, entry, root, child, onPart, onProgress) {
  let head = '' // text before the root element has been found
  let open = null
  let prefix = ''
  let pending = [] // text not handed on yet
  await readEntry(file, entry, (chunk, fraction) => {
    if (open === null) {
      head += chunk
      const match = new RegExp(`<(\\w+:)?${root}[\\s>]`).exec(head)
      if (!match) return
      prefix = match[1] ?? ''
      open = `<${prefix}${child}`
      chunk = head
      head = ''
    }
    const at = lastStartTag(chunk, open)
    if (at === -1) {
      pending.push(chunk)
      return
    }
    pending.push(chunk.slice(0, at))
    const text = pending.join('')
    if (text) onPart(text, prefix)
    pending = [chunk.slice(at)]
    onProgress?.(fraction)
  })
  const rest = head || pending.join('')
  if (rest) onPart(rest, prefix)
}

// ---------------------------------------------------------------------------------------------
// XML helpers (the parts Excel writes are regular, so string scanning is enough)

const ENTITIES = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }

function decode(text) {
  if (text.includes('&')) {
    text = text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (whole, name) => {
      if (name[0] !== '#') return ENTITIES[name] ?? whole
      return String.fromCodePoint(name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : Number(name.slice(1)))
    })
  }
  // Excel escapes some characters as _xHHHH_ (e.g. _x000D_ for a carriage return).
  if (text.includes('_x')) text = text.replace(/_x([0-9a-fA-F]{4})_/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  return text
}

// Value of attribute `name` in a start tag's text, or null.
function attr(tag, name) {
  const at = tag.indexOf(` ${name}=`)
  if (at === -1) return null
  const quote = tag[at + name.length + 2]
  const start = at + name.length + 3
  return tag.slice(start, tag.indexOf(quote, start))
}

// True if the character after a tag name ends the name (so `<c` does not match `<col`).
const endsName = (code) => code === 32 || code === 62 || code === 47 || code === 9 || code === 10 || code === 13

// Start tags `<name ...>` in xml, in order, as their full text (any namespace prefix).
const startTags = (xml, name) => xml.match(new RegExp(`<(?:\\w+:)?${name}[\\s/>][^>]*>`, 'g')) ?? []

// The scanning loops in this file stop as soon as a search finds nothing. On a damaged file,
// carrying on with the -1 that indexOf returns would restart the loop from the beginning and never
// finish; stopping instead keeps what was read so far.

// Concatenated text of all <t> elements in a string item or inline string, skipping phonetic runs.
function textOf(xml, p) {
  const phonetic = `<${p}rPh`
  if (xml.includes(phonetic)) xml = xml.replace(new RegExp(`<${p}rPh[\\s\\S]*?</${p}rPh>`, 'g'), '')
  const open = `<${p}t`
  const close = `</${p}t>`
  let text = ''
  for (let i = xml.indexOf(open); i !== -1; i = xml.indexOf(open, i)) {
    const tagEnd = xml.indexOf('>', i)
    if (tagEnd === -1) break
    if (!endsName(xml.charCodeAt(i + open.length)) || xml.charCodeAt(tagEnd - 1) === 47) {
      i = tagEnd + 1
      continue
    }
    const end = xml.indexOf(close, tagEnd)
    if (end === -1) break
    text += xml.slice(tagEnd + 1, end)
    i = end + close.length
  }
  return decode(text)
}

// ---------------------------------------------------------------------------------------------
// Workbook parts

// Resolves a relationship target against the folder of the part that refers to it.
function resolvePath(base, target) {
  const parts = target.startsWith('/') ? [] : base.split('/').slice(0, -1)
  for (const piece of target.replace(/^\//, '').split('/')) {
    if (piece === '..') parts.pop()
    else if (piece !== '.') parts.push(piece)
  }
  return parts.join('/')
}

async function readRelationships(file, entries, partPath) {
  const slash = partPath.lastIndexOf('/')
  const relsPath = `${partPath.slice(0, slash + 1)}_rels/${partPath.slice(slash + 1)}.rels`
  const entry = entries.get(relsPath.toLowerCase())
  const rels = new Map()
  if (!entry) return rels
  for (const tag of startTags(await readEntryText(file, entry), 'Relationship')) {
    rels.set(attr(tag, 'Id'), { type: attr(tag, 'Type') ?? '', target: resolvePath(partPath, decode(attr(tag, 'Target') ?? '')) })
  }
  return rels
}

// Built-in number formats that show dates or times.
const isBuiltInDateFormat = (id) => (id >= 14 && id <= 22) || (id >= 27 && id <= 36) || (id >= 45 && id <= 47) || (id >= 50 && id <= 58)

// A custom format shows a date or time if it has d, m, y, h or s outside quoted text, escapes and [..] codes.
function isDateFormatCode(code) {
  const cleaned = code.replace(/"[^"]*"/g, '').replace(/\\.|_.|\*./g, '').replace(/\[[^\]]*\]/g, '')
  return /[dmyhs]/i.test(cleaned)
}

// Which cell styles (the `s` attribute) have a date number format: dateStyles[style] is true.
async function readDateStyles(file, entries, path) {
  const entry = path && entries.get(path.toLowerCase())
  const dateStyles = []
  if (!entry) return dateStyles
  const xml = await readEntryText(file, entry)
  const customFormats = new Map(startTags(xml, 'numFmt').map((tag) => [Number(attr(tag, 'numFmtId')), decode(attr(tag, 'formatCode') ?? '')]))
  const cellXfs = /<(?:\w+:)?cellXfs[\s>][\s\S]*?<\/(?:\w+:)?cellXfs>/.exec(xml)?.[0] ?? ''
  startTags(cellXfs, 'xf').forEach((tag, index) => {
    const id = Number(attr(tag, 'numFmtId') ?? 0)
    const code = customFormats.get(id)
    dateStyles[index] = code === undefined ? isBuiltInDateFormat(id) : isDateFormatCode(code)
  })
  return dateStyles
}

async function readSharedStrings(file, entries, path, onProgress) {
  const entry = path && entries.get(path.toLowerCase())
  const strings = []
  if (!entry) return strings
  await readEntryInParts(file, entry, 'sst', 'si', (xml, p) => {
    const open = `<${p}si`
    const close = `</${p}si>`
    for (let i = xml.indexOf(open); i !== -1; i = xml.indexOf(open, i)) {
      const tagEnd = xml.indexOf('>', i)
      if (tagEnd === -1) break
      if (!endsName(xml.charCodeAt(i + open.length))) {
        i = tagEnd + 1
      } else if (xml.charCodeAt(tagEnd - 1) === 47) {
        strings.push('')
        i = tagEnd + 1
      } else {
        const end = xml.indexOf(close, tagEnd)
        if (end === -1) break
        strings.push(textOf(xml.slice(tagEnd + 1, end), p).trim())
        i = end + close.length
      }
    }
  }, onProgress)
  return strings
}

// Excel stores dates as days since 1899-12-30 (or since 1904-01-01 in the 1904 date system).
// Excel also counts 1900-02-29, which never existed, so dates before it (serials 1-59) are one day
// later. Times alone (serials below 1) keep 1899-12-30 as their date.
const DAY_MS = 86400000
function excelDate(serial, date1904) {
  const days = date1904 ? serial + 1462 : serial >= 1 && serial < 60 ? serial + 1 : serial
  return new Date(Math.round((days - 25569) * DAY_MS))
}

// The scanning below works on positions in the XML text and avoids creating strings per cell:
// with millions of cells, those small strings cost more than the scanning itself.

// "BC12" at xml[start..end) -> 54 (zero-based column of a cell reference).
function columnAt(xml, start, end) {
  let n = 0
  for (let i = start; i < end; i++) {
    const code = xml.charCodeAt(i)
    if (code < 65 || code > 90) break
    n = n * 26 + code - 64
  }
  return n - 1
}

// Non-negative integer at xml[start..end).
function integerAt(xml, start, end) {
  let n = 0
  for (let i = start; i < end; i++) n = n * 10 + xml.charCodeAt(i) - 48
  return n
}

// Cell types (the `t` attribute) as small numbers.
const NUMBER = 0 // n, or no t attribute
const SHARED = 1 // s: index into the shared strings
const FORMULA_TEXT = 2 // str
const INLINE = 3 // inlineStr
const BOOLEAN = 4 // b
const ERROR = 5 // e
const ISO_DATE = 6 // d

function typeAt(xml, start, end) {
  switch (xml.charCodeAt(start)) {
    case 115: // s, str
      return end - start === 1 ? SHARED : FORMULA_TEXT
    case 105: // inlineStr
      return INLINE
    case 98: // b
      return BOOLEAN
    case 101: // e
      return ERROR
    case 100: // d
      return ISO_DATE
    default:
      return NUMBER
  }
}

const isSpace = (code) => code === 32 || code === 9 || code === 10 || code === 13

// Value of a cell's <v> text at xml[start..end). Text is trimmed.
function cellValue(xml, start, end, type, style, book) {
  if (type === SHARED) return book.sharedStrings[integerAt(xml, start, end)] || null
  if (start === end) return null
  const raw = xml.slice(start, end)
  switch (type) {
    case FORMULA_TEXT:
      return decode(raw).trim() || null
    case BOOLEAN:
      return raw === '1' || raw === 'true'
    case ISO_DATE: {
      const date = new Date(raw)
      return Number.isNaN(date.getTime()) ? decode(raw) : date
    }
    default: {
      const number = Number(raw)
      if (Number.isNaN(number)) return decode(raw)
      return book.dateStyles[style] ? excelDate(number, book.date1904) : number
    }
  }
}

// Adds the rows found in `xml` to `rows` (each an array of cell values, null for blanks).
// Rows without any value are skipped: callers only need the header and data rows.
// Error results such as #N/A count as blank cells.
function parseRows(xml, p, book, rows) {
  const rowOpen = `<${p}row`
  const rowClose = `</${p}row>`
  const cellOpen = `<${p}c`
  const cellClose = `</${p}c>`
  const valueOpen = `<${p}v>`
  const valueClose = `</${p}v>`
  for (let i = xml.indexOf(rowOpen); i !== -1; i = xml.indexOf(rowOpen, i)) {
    const rowTagEnd = xml.indexOf('>', i)
    if (rowTagEnd === -1) break
    if (!endsName(xml.charCodeAt(i + rowOpen.length)) || xml.charCodeAt(rowTagEnd - 1) === 47) {
      i = rowTagEnd + 1
      continue
    }
    const rowEnd = xml.indexOf(rowClose, rowTagEnd)
    if (rowEnd === -1) break
    const cells = []
    let col = 0
    let hasValue = false
    for (let j = xml.indexOf(cellOpen, rowTagEnd); j !== -1 && j < rowEnd; j = xml.indexOf(cellOpen, j)) {
      const tagEnd = xml.indexOf('>', j)
      if (tagEnd === -1) break
      if (!endsName(xml.charCodeAt(j + cellOpen.length))) {
        j = tagEnd + 1
        continue
      }
      // Read the start tag's attributes in place: r (reference), t (type) and s (style) are the
      // only one-letter names; longer or prefixed names (xr:uid, cm, vm) are skipped.
      let type = NUMBER
      let style = -1
      for (let a = j + cellOpen.length; a < tagEnd; ) {
        const eq = xml.indexOf('=', a)
        if (eq === -1 || eq > tagEnd) break
        const start = eq + 2
        const end = xml.indexOf(xml.charCodeAt(eq + 1) === 39 ? "'" : '"', start)
        if (end === -1) break
        if (isSpace(xml.charCodeAt(eq - 2))) {
          const name = xml.charCodeAt(eq - 1)
          if (name === 114) col = columnAt(xml, start, end)
          else if (name === 116) type = typeAt(xml, start, end)
          else if (name === 115) style = integerAt(xml, start, end)
        }
        a = end + 1
      }
      let value = null
      if (xml.charCodeAt(tagEnd - 1) === 47) {
        j = tagEnd + 1
      } else if (type !== INLINE && xml.startsWith(valueOpen, tagEnd + 1)) {
        // Usual layout, checked in place instead of searched for: <c ...><v>value</v></c>
        const start = tagEnd + 1 + valueOpen.length
        const valueEnd = xml.indexOf('<', start)
        if (valueEnd === -1) break
        if (type !== ERROR) value = cellValue(xml, start, valueEnd, type, style, book)
        const after = valueEnd + valueClose.length
        const end = xml.startsWith(cellClose, after) ? after : xml.indexOf(cellClose, after)
        if (end === -1) break
        j = end + cellClose.length
      } else {
        const end = xml.indexOf(cellClose, tagEnd)
        if (end === -1) break
        if (type === INLINE) {
          value = textOf(xml.slice(tagEnd + 1, end), p).trim() || null
        } else if (type !== ERROR) {
          const v = xml.indexOf(valueOpen, tagEnd)
          const valueEnd = v === -1 || v > end ? -1 : xml.indexOf(valueClose, v)
          if (valueEnd !== -1) value = cellValue(xml, v + valueOpen.length, valueEnd, type, style, book)
        }
        j = end + cellClose.length
      }
      if (value !== null) {
        while (cells.length < col) cells.push(null)
        cells[col] = value
        hasValue = true
      }
      col++
    }
    if (hasValue) rows.push(cells)
    i = rowEnd + rowClose.length
  }
}

// Reads every sheet's cell values: [{ sheet: name, data: [[cell, ...], ...] }].
// preview is { onPreview, minBytes } (see parseExcel).
async function readWorkbook(file, onProgress, preview) {
  const entries = await readZipDirectory(file)
  const packageRels = await readRelationships(file, entries, '')
  const workbookPath = [...packageRels.values()].find((r) => r.type.endsWith('/officeDocument'))?.target ?? 'xl/workbook.xml'
  const workbookEntry = entries.get(workbookPath.toLowerCase())
  if (!workbookEntry) throw new ImportError(UNREADABLE, `${workbookPath} is missing, so this is not an Excel workbook.`)

  const workbookXml = await readEntryText(file, workbookEntry)
  const rels = await readRelationships(file, entries, workbookPath)
  const target = (suffix) => [...rels.values()].find((r) => r.type.endsWith(suffix))?.target
  const date1904 = /\sdate1904="(1|true)"/.test(startTags(workbookXml, 'workbookPr')[0] ?? '')
  const dateStyles = await readDateStyles(file, entries, target('/styles'))
  const sharedStrings = await readSharedStrings(file, entries, target('/sharedStrings'), (fraction) =>
    onProgress(`Reading text… ${Math.round(fraction * 100)}%`),
  )
  const book = { sharedStrings, dateStyles, date1904 }

  const sheetTags = startTags(workbookXml, 'sheet')
  const sheets = []
  for (const tag of sheetTags) {
    const name = decode(attr(tag, 'name') ?? `Sheet${sheets.length + 1}`)
    const relId = /\s\w+:id="([^"]*)"/.exec(tag)?.[1]
    const entry = entries.get((rels.get(relId)?.target ?? '').toLowerCase())
    const data = []
    if (entry) {
      const label = sheetTags.length > 1 ? `Reading ${name}…` : 'Reading workbook…'
      // Only the first sheet is previewed: it is the one the page opens on.
      let previewPending = sheets.length === 0 && Boolean(preview.onPreview) && entry.size >= preview.minBytes
      const onPart = (xml, p) => {
        parseRows(xml, p, book, data)
        if (previewPending && data.length > PREVIEW_ROWS) {
          previewPending = false
          const sheet = parseSheet(name, data.slice(0, PREVIEW_ROWS + 1), '', () => {})
          if (sheet) preview.onPreview(sheet)
        }
      }
      await readEntryInParts(file, entry, 'worksheet', 'row', onPart, (fraction) =>
        onProgress(`${label} ${Math.round(fraction * 100)}%`),
      )
    }
    sheets.push({ sheet: name, data })
  }
  return sheets
}

// ---------------------------------------------------------------------------------------------

// Reads every sheet of an .xlsx file. The first non-empty row of each sheet is its header row.
// Returns { sheets: [{ name, columns, rows, titleKey, pairRanges, suggestedFilterKeys }] },
// skipping sheets without data; throws an ImportError (message + detail) on failure.
//
// Each row is an array: row[column.index] is the cell value, and row[columns.length] is the
// row's lowercase search text. Arrays (not objects) keep the hand-off from the worker fast.
// onProgress(message) reports what is happening, for the loading screen.
// onPreview(sheet), if given, is called once with the first sheet's first rows while a large file is
// still being read: same shape as a sheet in the result, with columns detected from those rows only.
// previewMinBytes is the (uncompressed) sheet size from which a preview is sent.
export async function parseExcel(file, onProgress = () => {}, { onPreview, previewMinBytes = PREVIEW_MIN_BYTES } = {}) {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new ImportError('Please choose an .xlsx file.', `Selected file: ${file.name}`)
  }
  await checkSignature(file)

  onProgress('Reading workbook…')
  let rawSheets
  try {
    rawSheets = await readWorkbook(file, onProgress, { onPreview, minBytes: previewMinBytes })
  } catch (err) {
    if (err instanceof ImportError) throw err
    throw new ImportError(UNREADABLE, err?.stack ?? err?.message ?? String(err))
  }

  const sheets = rawSheets
    .map(({ sheet, data }) => parseSheet(sheet, data, rawSheets.length > 1 ? `${sheet}: ` : '', onProgress))
    .filter(Boolean)

  if (sheets.length === 0) {
    throw new ImportError(
      'No data found. The file needs a header row followed by at least one row of data.',
      `Sheets checked: ${rawSheets.map(({ sheet, data }) => `${sheet} (${data.length} rows incl. header)`).join(', ')}`,
    )
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
  // Numbers and dates often repeat (e.g. the same date on many rows), and formatting them is slow.
  const formatCaches = columns.map(() => new Map())

  const rows = dataRows.map((cells, r) => {
    if (r % PROGRESS_EVERY === 0) {
      onProgress(`${progressPrefix}Preparing rows… ${Math.round((r / dataRows.length) * 100)}%`)
    }
    const row = new Array(width + 1)
    const texts = []
    for (let i = 0; i < width; i++) {
      const value = isEmpty(cells[i]) ? null : cells[i]
      row[i] = value
      if (value === null) continue
      if (typeof value === 'string') {
        texts.push(value)
        continue
      }
      const cache = formatCaches[i]
      const key = value instanceof Date ? value.getTime() : value
      let text = cache.get(key)
      if (text === undefined) {
        text = formatCell(value, columns[i].type)
        if (cache.size < FORMAT_CACHE_LIMIT) cache.set(key, text)
      }
      texts.push(text)
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
