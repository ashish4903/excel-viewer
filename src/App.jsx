import { useCallback, useMemo, useState } from 'react'
import FileUpload from './components/FileUpload.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import StatsBar from './components/StatsBar.jsx'
import SearchBar from './components/SearchBar.jsx'
import FilterDropdowns from './components/FilterDropdowns.jsx'
import RangeFilters from './components/RangeFilters.jsx'
import ActiveFilters from './components/ActiveFilters.jsx'
import ColumnPicker from './components/ColumnPicker.jsx'
import SortSelect from './components/SortSelect.jsx'
import DataTable from './components/DataTable.jsx'
import DataCards from './components/DataCards.jsx'
import Pagination from './components/Pagination.jsx'
import RowDetail from './components/RowDetail.jsx'
import StatusMessage from './components/StatusMessage.jsx'
import Icon from './components/Icon.jsx'
import { columns } from './config/columns.js'
import { parseExcel } from './utils/parseExcel.js'
import { filterRows, getActiveRanges, sortRows } from './utils/filterRows.js'
import { exportCsv } from './utils/exportCsv.js'

const PAGE_SIZE = 25
const NO_SORT = { key: null, direction: 'asc' }

function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({})
  const [ranges, setRanges] = useState({})
  const [sort, setSort] = useState(NO_SORT)
  const [page, setPage] = useState(1)
  const [hiddenKeys, setHiddenKeys] = useState(() => new Set())
  const [selectedRow, setSelectedRow] = useState(null)

  async function handleFile(file) {
    setLoading(true)
    setError('')
    try {
      const result = await parseExcel(file)
      setData({ ...result, fileName: file.name })
      setSearch('')
      setFilters({})
      setRanges({})
      setSort(NO_SORT)
      setPage(1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(value) {
    setSearch(value)
    setPage(1)
  }

  function handleFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  // bound: 'min' | 'max'; value: raw input text
  function handleRange(key, bound, value) {
    setRanges((current) => ({ ...current, [key]: { ...current[key], [bound]: value } }))
    setPage(1)
  }

  function removeRange(key) {
    setRanges((current) => ({ ...current, [key]: {} }))
    setPage(1)
  }

  function clearAll() {
    setSearch('')
    setFilters({})
    setRanges({})
    setPage(1)
  }

  function handleSort(key) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
    setPage(1)
  }

  function handleSortChange(next) {
    setSort(next)
    setPage(1)
  }

  function toggleColumn(key) {
    setHiddenKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const closeDetail = useCallback(() => setSelectedRow(null), [])

  const rows = data?.rows
  const filtered = useMemo(
    () => filterRows(rows ?? [], search, filters, ranges),
    [rows, search, filters, ranges],
  )
  const sorted = useMemo(() => sortRows(filtered, sort), [filtered, sort])
  const visibleColumns = useMemo(() => columns.filter((c) => !hiddenKeys.has(c.key)), [hiddenKeys])

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const animationKey = `${currentPage}-${sort.key}-${sort.direction}`
  const activeFilterCount = Object.values(filters).filter(Boolean).length + getActiveRanges(ranges).length

  function handleExport() {
    const baseName = data.fileName.replace(/\.xlsx$/i, '')
    exportCsv(sorted, visibleColumns, `${baseName}-filtered.csv`)
  }

  return (
    <div className="app">
      <header className="app-bar">
        <div className="app-bar-inner">
          <div className="brand">
            <span className="brand-mark">
              <Icon name="sheet" size={22} />
            </span>
            <div>
              <h1>Excel Viewer</h1>
              <p>{data ? data.fileName : 'Explore your spreadsheets right in the browser'}</p>
            </div>
          </div>
          <div className="app-bar-actions">
            {data && <FileUpload variant="compact" onFile={handleFile} loading={loading} />}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="content">
        {error && <StatusMessage kind="error">{error}</StatusMessage>}

        {!data && <FileUpload variant="hero" onFile={handleFile} loading={loading} />}

        {data && (
          <>
            {data.missingColumns.length > 0 && (
              <StatusMessage kind="warning">
                These columns were not found in the file and will be blank: {data.missingColumns.join(', ')}
              </StatusMessage>
            )}

            <StatsBar
              total={data.rows.length}
              matching={sorted.length}
              visibleColumns={visibleColumns.length}
              totalColumns={columns.length}
              activeFilters={activeFilterCount}
            />

            <section className="panel controls" aria-label="Search and filters">
              <SearchBar value={search} onChange={handleSearch} />
              <div className="filters">
                <FilterDropdowns rows={data.rows} filters={filters} onChange={handleFilter} />
                <RangeFilters rows={data.rows} ranges={ranges} onChange={handleRange} />
              </div>
              <div className="toolbar">
                <ActiveFilters
                  search={search}
                  filters={filters}
                  ranges={ranges}
                  onClearSearch={() => handleSearch('')}
                  onRemoveFilter={(key) => handleFilter(key, '')}
                  onRemoveRange={removeRange}
                  onClearAll={clearAll}
                />
                <div className="toolbar-actions">
                  <SortSelect sort={sort} onChange={handleSortChange} />
                  <ColumnPicker
                    hiddenKeys={hiddenKeys}
                    onToggle={toggleColumn}
                    onShowAll={() => setHiddenKeys(new Set())}
                  />
                  <button type="button" className="button" onClick={handleExport} disabled={sorted.length === 0}>
                    <Icon name="download" />
                    Export CSV
                  </button>
                </div>
              </div>
            </section>

            {sorted.length === 0 ? (
              <div className="panel empty-state">
                <span className="empty-icon">
                  <Icon name="search" size={28} />
                </span>
                <h2>No matching rows</h2>
                <p>Try a different search term or remove some filters.</p>
                <button type="button" className="button secondary" onClick={clearAll}>
                  Clear search and filters
                </button>
              </div>
            ) : (
              <section className="panel results" aria-label="Results">
                <DataTable
                  rows={pageRows}
                  columns={visibleColumns}
                  sort={sort}
                  onSort={handleSort}
                  onSelect={setSelectedRow}
                  query={search}
                  animationKey={animationKey}
                />
                <DataCards
                  rows={pageRows}
                  columns={visibleColumns}
                  onSelect={setSelectedRow}
                  query={search}
                  animationKey={animationKey}
                />
                <Pagination
                  page={currentPage}
                  pageCount={pageCount}
                  pageSize={PAGE_SIZE}
                  total={sorted.length}
                  onChange={setPage}
                />
              </section>
            )}
          </>
        )}
      </main>

      {selectedRow && <RowDetail row={selectedRow} onClose={closeDetail} />}
    </div>
  )
}

export default App
