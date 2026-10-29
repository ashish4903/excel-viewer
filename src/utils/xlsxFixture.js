// Test helper: builds real .xlsx files in memory, so tests exercise the actual reader.
// Not used by the app.
import { crc32, deflateRawSync } from 'node:zlib'

const encoder = new TextEncoder()
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const columnName = (index) => {
  let name = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  return name
}

// Style 1 is a date (built-in format 14); style 2 uses a custom date format; style 0 is General.
const STYLES = `<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd&quot;/&quot;mm&quot;/&quot;yyyy"/></numFmts>
<cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/></cellXfs>
</styleSheet>`

// Sheet XML from rows of JS values; strings go into the shared strings table.
function sheetXml(rows, sharedStrings) {
  const cell = (value, ref) => {
    if (value === null || value === undefined) return ''
    if (value instanceof Date) {
      return `<c r="${ref}" s="1"><v>${(value.getTime() - Date.UTC(1899, 11, 30)) / 86400000}</v></c>`
    }
    if (typeof value === 'number') return `<c r="${ref}"><v>${value}</v></c>`
    if (typeof value === 'boolean') return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`
    sharedStrings.push(value)
    return `<c r="${ref}" t="s"><v>${sharedStrings.length - 1}</v></c>`
  }
  const body = rows
    .map((row, r) => `<row r="${r + 1}">${row.map((value, c) => cell(value, `${columnName(c)}${r + 1}`)).join('')}</row>`)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`
}

function zip(files) {
  const locals = []
  const central = []
  let offset = 0
  for (const [name, text] of Object.entries(files)) {
    const nameBytes = encoder.encode(name)
    const data = encoder.encode(text)
    const packed = deflateRawSync(data)
    const header = (size) => {
      const bytes = new Uint8Array(size)
      const view = new DataView(bytes.buffer)
      return { bytes, view }
    }
    const local = header(30)
    local.view.setUint32(0, 0x04034b50, true)
    local.view.setUint16(4, 20, true)
    local.view.setUint16(8, 8, true)
    local.view.setUint32(14, crc32(data), true)
    local.view.setUint32(18, packed.length, true)
    local.view.setUint32(22, data.length, true)
    local.view.setUint16(26, nameBytes.length, true)
    const entry = header(46)
    entry.view.setUint32(0, 0x02014b50, true)
    entry.view.setUint16(4, 20, true)
    entry.view.setUint16(6, 20, true)
    entry.view.setUint16(10, 8, true)
    entry.view.setUint32(16, crc32(data), true)
    entry.view.setUint32(20, packed.length, true)
    entry.view.setUint32(24, data.length, true)
    entry.view.setUint16(28, nameBytes.length, true)
    entry.view.setUint32(42, offset, true)
    locals.push(local.bytes, nameBytes, packed)
    central.push(entry.bytes, nameBytes)
    offset += 30 + nameBytes.length + packed.length
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22)
  const view = new DataView(end.buffer)
  view.setUint32(0, 0x06054b50, true)
  view.setUint16(8, central.length / 2, true)
  view.setUint16(10, central.length / 2, true)
  view.setUint32(12, centralSize, true)
  view.setUint32(16, offset, true)
  return [...locals, ...central, end]
}

// sheets: [{ name, rows }] or [{ name, xml }] (raw worksheet XML).
// options.files adds or replaces parts by path; a null value leaves that part out.
export function makeXlsx(sheets, { fileName = 'data.xlsx', date1904 = false, files = {} } = {}) {
  const sharedStrings = []
  const parts = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<workbookPr${date1904 ? ' date1904="1"' : ''}/><sheets>${sheets
      .map((s, i) => `<sheet name="${escape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('')}</sheets></workbook>`,
    'xl/styles.xml': STYLES,
  }
  sheets.forEach((s, i) => {
    parts[`xl/worksheets/sheet${i + 1}.xml`] = s.xml ?? sheetXml(s.rows, sharedStrings)
  })
  parts['xl/sharedStrings.xml'] = `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${sharedStrings
    .map((text) => `<si><t xml:space="preserve">${escape(text)}</t></si>`)
    .join('')}</sst>`
  const n = sheets.length
  parts['xl/_rels/workbook.xml.rels'] = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join('')}
<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId${n + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`
  for (const [path, text] of Object.entries(files)) {
    if (text === null) delete parts[path]
    else parts[path] = text
  }
  return new File(zip(parts), fileName)
}
