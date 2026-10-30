// Packs parsed rows into a compact form for the trip from the parsing worker to the page.
// Copying millions of separate strings between threads is slow, so each distinct string is sent
// once, and every cell becomes a kind byte plus a number in typed arrays, which are handed over
// without copying.
//
// Rows are arrays of `width` cell values followed by their search text (see parseExcel.js).

const EMPTY = 0
const TEXT = 1
const NUMBER = 2
const DATE = 3
const TRUE = 4
const FALSE = 5

// Keeps the distinct strings seen so far, so each batch only carries the new ones.
export function createStringTable() {
  return { ids: new Map(), strings: [], sent: 0 }
}

// Encodes a batch of rows. Returns { message, transfer } for postMessage.
export function encodeRows(rows, width, table) {
  const kinds = new Uint8Array(rows.length * width)
  const values = new Float64Array(rows.length * width)
  const search = new Array(rows.length)
  let k = 0
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    for (let c = 0; c < width; c++, k++) {
      const value = row[c]
      if (value === null || value === undefined) continue
      if (typeof value === 'string') {
        let id = table.ids.get(value)
        if (id === undefined) {
          id = table.strings.length
          table.strings.push(value)
          table.ids.set(value, id)
        }
        kinds[k] = TEXT
        values[k] = id
      } else if (typeof value === 'number') {
        kinds[k] = NUMBER
        values[k] = value
      } else if (typeof value === 'boolean') {
        kinds[k] = value ? TRUE : FALSE
      } else {
        kinds[k] = DATE
        values[k] = value.getTime()
      }
    }
    search[r] = row[width]
  }
  const newStrings = table.strings.slice(table.sent)
  table.sent = table.strings.length
  return { message: { width, kinds, values, search, newStrings }, transfer: [kinds.buffer, values.buffer] }
}

// Decodes a batch made by encodeRows, appending its rows to `out`.
// `strings` is the page-side copy of the string table; new strings are added to it.
export function decodeRows({ width, kinds, values, search, newStrings }, strings, out) {
  for (const text of newStrings) strings.push(text)
  let k = 0
  for (let r = 0; r < search.length; r++) {
    const row = new Array(width + 1)
    for (let c = 0; c < width; c++, k++) {
      const kind = kinds[k]
      row[c] =
        kind === EMPTY ? null
        : kind === TEXT ? strings[values[k]]
        : kind === NUMBER ? values[k]
        : kind === DATE ? new Date(values[k])
        : kind === TRUE
    }
    row[width] = search[r]
    out.push(row)
  }
}
