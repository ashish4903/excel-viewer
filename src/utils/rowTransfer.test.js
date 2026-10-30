import { describe, expect, it } from 'vitest'
import { createStringTable, decodeRows, encodeRows } from './rowTransfer.js'

const d = (iso) => new Date(`${iso}T00:00:00Z`)

describe('rowTransfer', () => {
  it('round-trips every kind of cell and the search text', () => {
    const rows = [
      ['Ada', 42, d('2024-03-05'), true, null, 'ada 42'],
      ['Bob', -1.5, null, false, 'Ada', 'bob -1.5'],
    ]
    const table = createStringTable()
    const { message, transfer } = encodeRows(rows, 5, table)
    expect(transfer).toEqual([message.kinds.buffer, message.values.buffer])

    const out = []
    decodeRows(structuredClone(message), [], out)
    expect(out).toEqual(rows)
  })

  it('sends each distinct string once, across batches', () => {
    const table = createStringTable()
    const first = encodeRows([['x', 'y'], ['x', 'y']], 1, table).message
    const second = encodeRows([['x', 'z'], ['w', 'z']], 1, table).message
    expect(first.newStrings).toEqual(['x'])
    expect(second.newStrings).toEqual(['w'])

    const strings = []
    const out = []
    decodeRows(first, strings, out)
    decodeRows(second, strings, out)
    expect(out.map((row) => row[0])).toEqual(['x', 'x', 'x', 'w'])
    expect(strings).toEqual(['x', 'w'])
  })

  it('treats missing cells in short rows as empty', () => {
    const out = []
    decodeRows(encodeRows([['only', undefined, undefined, 'only']], 3, createStringTable()).message, [], out)
    expect(out).toEqual([['only', null, null, 'only']])
  })
})
