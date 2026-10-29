// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import { makeXlsx } from './utils/xlsxFixture.js'

// The worker can't run in tests: parse on the main thread instead, with the real parseExcel.
vi.mock('./utils/parseInWorker.js', async () => {
  const { parseExcel } = await import('./utils/parseExcel.js')
  return { parseInWorker: (file, onProgress) => parseExcel(file, onProgress) }
})

const STATUSES = ['Certified', 'Denied', 'Withdrawn']
const STATES = ['CA', 'NY', 'TX', 'WA']
const SHEET = [
  ['CASE_NUMBER', 'CASE_STATUS', 'EMP_STATE', 'JOB_OPP_WAGE_FROM'],
  ...Array.from({ length: 30 }, (_, i) => [
    `G-${String(i + 1).padStart(3, '0')}`,
    STATUSES[i % 3],
    STATES[i % 4],
    50000 + i * 1000,
  ]),
]

// A real .xlsx built in memory, read by the real parser.
const xlsxFile = (name = 'cases.xlsx') => makeXlsx([{ name: 'Cases', rows: SHEET }], { fileName: name })

const tableRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1) // skip the header row
const firstCells = () => tableRows().map((row) => within(row).getAllByRole('cell')[0].textContent)

async function openFile(user, file = xlsxFile()) {
  const view = render(<App />)
  await user.upload(view.container.querySelector('input[type=file]'), file)
  return view
}

beforeAll(() => {
  // jsdom has no matchMedia; the theme toggle uses it to read the system theme.
  window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
})

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('uploading a file', () => {
  it('shows the upload screen, then the table with the first page of rows', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText('Drop your Excel file here')).toBeTruthy()

    await user.upload(document.querySelector('input[type=file]'), xlsxFile())

    expect(await screen.findByRole('table')).toBeTruthy()
    expect(tableRows()).toHaveLength(25)
    expect(firstCells()[0]).toBe('G-001')
    expect(screen.getByText('cases.xlsx')).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: /Status/ })).toBeTruthy() // label from config overrides
  })

  it('explains the problem when the file is not a real .xlsx', async () => {
    const user = userEvent.setup()
    const fake = new File(['this is text'], 'notes.xlsx')
    await openFile(user, fake)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/isn’t a real .xlsx workbook/)
    expect(within(alert).getByText('Technical details')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

describe('finding rows', () => {
  it('search narrows the rows and the new count is announced', async () => {
    const user = userEvent.setup()
    await openFile(user)
    await screen.findByRole('table')

    await user.type(screen.getByLabelText('Search all columns'), 'g-012')

    await waitFor(() => expect(firstCells()).toEqual(['G-012']))
    expect(screen.getByText('1 of 30 rows match')).toBeTruthy()
  })

  it('shows an empty state when nothing matches, and Clear brings rows back', async () => {
    const user = userEvent.setup()
    await openFile(user)
    await screen.findByRole('table')

    await user.type(screen.getByLabelText('Search all columns'), 'no such value')
    expect(await screen.findByText('No matching rows')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    await waitFor(() => expect(tableRows()).toHaveLength(25))
  })

  it('a dropdown filter keeps only matching rows, and Clear all removes it', async () => {
    const user = userEvent.setup()
    await openFile(user)
    await screen.findByRole('table')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Denied')

    expect(tableRows()).toHaveLength(10)
    expect(tableRows().every((row) => row.textContent.includes('Denied'))).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(tableRows()).toHaveLength(25)
  })
})

describe('sorting and pages', () => {
  it('clicking a column header sorts ascending, then descending', async () => {
    const user = userEvent.setup()
    await openFile(user)
    await screen.findByRole('table')
    const header = () => screen.getByRole('columnheader', { name: /Wage from/ })

    await user.click(within(header()).getByRole('button'))
    expect(header().getAttribute('aria-sort')).toBe('ascending')
    expect(firstCells()[0]).toBe('G-001')

    await user.click(within(header()).getByRole('button'))
    expect(header().getAttribute('aria-sort')).toBe('descending')
    expect(firstCells()[0]).toBe('G-030')
  })

  it('next page shows the remaining rows', async () => {
    const user = userEvent.setup()
    await openFile(user)
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'Next page' }))

    expect(firstCells()).toEqual(['G-026', 'G-027', 'G-028', 'G-029', 'G-030'])
  })
})

describe('choosing columns', () => {
  it('unticking a column hides it, and the choice is remembered for the next file with the same headers', async () => {
    const user = userEvent.setup()
    await openFile(user)
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: /Columns/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Employer state' }))
    expect(screen.queryByRole('columnheader', { name: /Employer state/ })).toBeNull()

    cleanup()
    await openFile(user)
    await screen.findByRole('table')
    expect(screen.queryByRole('columnheader', { name: /Employer state/ })).toBeNull()
  })

  it('Escape closes the popover and returns focus to its button', async () => {
    const user = userEvent.setup()
    await openFile(user)
    await screen.findByRole('table')
    const button = screen.getByRole('button', { name: /Columns/ })

    await user.click(button)
    expect(screen.getByRole('dialog', { name: 'Choose visible columns' })).toBeTruthy()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Choose visible columns' })).toBeNull()
    expect(document.activeElement).toBe(button)
  })
})

describe('row details', () => {
  it('opens from the keyboard, keeps focus inside, and returns focus to the row on close', async () => {
    const user = userEvent.setup()
    await openFile(user)
    await screen.findByRole('table')
    const row = tableRows()[2]

    row.focus()
    await user.keyboard('{Enter}')

    const dialog = screen.getByRole('dialog', { name: 'G-003' })
    expect(within(dialog).getByText('Withdrawn')).toBeTruthy()
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Close' }))

    for (let i = 0; i < 10; i++) await user.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'G-003' })).toBeNull()
    expect(document.activeElement).toBe(row)
  })
})
