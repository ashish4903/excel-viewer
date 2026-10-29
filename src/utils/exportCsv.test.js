import { describe, expect, it } from 'vitest'
import { toCsv } from './exportCsv.js'

const columns = [
  { key: 'c0', index: 0, label: 'Name', type: 'text' },
  { key: 'c1', index: 1, label: 'Code', type: 'code' },
]

describe('toCsv', () => {
  it('writes a header row and quotes every cell', () => {
    expect(toCsv([['Ada', 42]], columns)).toBe('"Name","Code"\r\n"Ada","42"')
  })

  it('doubles quotes inside cells', () => {
    expect(toCsv([['Say "hi"', null]], columns)).toBe('"Name","Code"\r\n"Say ""hi""",""')
  })

  it('prefixes text that a spreadsheet would run as a formula', () => {
    const rows = [['=HYPERLINK("http://x")', null], ['+1 555'], ['-sum'], ['@cmd'], ['\tTab']]
    const lines = toCsv(rows, columns).split('\r\n').slice(1)
    expect(lines.map((line) => line.split('","')[0])).toEqual([
      `"'=HYPERLINK(""http://x"")`,
      `"'+1 555`,
      `"'-sum`,
      `"'@cmd`,
      `"'\tTab`,
    ])
  })

  it('leaves negative numbers and ordinary text alone', () => {
    expect(toCsv([['a=b', -5]], columns)).toBe('"Name","Code"\r\n"a=b","-5"')
  })
})
