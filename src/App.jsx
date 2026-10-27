import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import FileUpload from './components/FileUpload.jsx'
import AppBar from './components/AppBar.jsx'
import SheetTabs from './components/SheetTabs.jsx'
import StatsBar from './components/StatsBar.jsx'
import SearchBar from './components/SearchBar.jsx'
import FilterControl from './components/FilterControl.jsx'
import PairRangeFilter from './components/PairRangeFilter.jsx'
import AddFilterMenu from './components/AddFilterMenu.jsx'
import ActiveFilters from './components/ActiveFilters.jsx'
import ColumnPicker from './components/ColumnPicker.jsx'
import SortSelect from './components/SortSelect.jsx'
import DataTable from './components/DataTable.jsx'
import DataCards from './components/DataCards.jsx'
import Pagination from './components/Pagination.jsx'
import RowDetail from './components/RowDetail.jsx'
import StatusMessage from './components/StatusMessage.jsx'
import Icon from './components/Icon.jsx'
import { parseExcel } from './utils/parseExcel.js'
import { filterRows, getActiveFilters, sortRows } from './utils/filterRows.js'
import { clearVisibleKeys, defaultVisibleKeys, loadVisibleKeys, saveVisibleKeys } from './utils/columnPrefs.js'
import { exportCsv } from './utils/exportCsv.js'

const PAGE_SIZE = 25
const NO_SORT = { key: null, direction: 'asc' }

function App() {
  const [data, setData] = useState(null)
  const [sheetIndex, setSheetIndex] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  // Keyed by column key (or "pair:<key>"); strings for list/text filters, { min, max } for ranges.
  const [filters, setFilters] = useState({})
  const [addedFilterKeys, setAddedFilterKeys] = useState([])
  const [sort, setSort] = useState(NO_SORT)
  const [page, setPage] = useState(1)
  const [visibleKeys, setVisibleKeys] = useState(() => new Set())
  const [selectedRow, setSelectedRow] = useState(null)

  const sheet = data?.sheets[sheetIndex]
  const deferredSearch = useDeferredValue(search)

  function resetView(nextSheet) {
    setSearch('')
    setFilters({})
    setAddedFilterKeys([])
    setSort(NO_SORT)
    setPage(1)
    setSelectedRow(null)
    setVisibleKeys(loadVisibleKeys(nextSheet.columns))
  }

  async function handleFile(file) {
    setLoading(true)
    setError('')
    try {
      const result = await parseExcel(file)
      setData({ ...result, fileName: file.name })
      setSheetIndex(0)
      resetView(result.sheets[0])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSheetChange(index) {
    setSheetIndex(index)
    resetView(data.sheets[index])
  }

  function handleSearch(value) {
    setSearch(value)
    setPage(1)
  }

  function handleFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  function addFilter(key) {
    setAddedFilterKeys((current) => [...current, key])
  }

  function removeAddedFilter(key) {
    setAddedFilterKeys((current) => current.filter((k) => k !== key))
    setFilters((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setPage(1)
  }

  function clearAll() {
    setSearch('')
    setFilters({})
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

  function updateVisible(next) {
    setVisibleKeys(next)
    saveVisibleKeys(sheet.columns, next)
  }

  function toggleColumn(key) {
    const next = new Set(visibleKeys)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    updateVisible(next)
  }

  function resetColumns() {
    clearVisibleKeys(sheet.columns)
    setVisibleKeys(defaultVisibleKeys(sheet.columns))
  }

  const closeDetail = useCallback(() => setSelectedRow(null), [])

  const columns = sheet?.columns
  const rows = sheet?.rows
  const pairRanges = sheet?.pairRanges
  const filtered = useMemo(
    () => (rows ? filterRows(rows, { columns, pairRanges, search: deferredSearch, filters }) : []),
    [rows, columns, pairRanges, deferredSearch, filters],
  )
  const sorted = useMemo(() => sortRows(filtered, sort), [filtered, sort])
  const visibleColumns = useMemo(() => (columns ?? []).filter((c) => visibleKeys.has(c.key)), [columns, visibleKeys])

  if (!sheet) {
    return (
      <div className="app">
        <AppBar />
        <main className="content">
          {error && <StatusMessage kind="error">{error}</StatusMessage>}
          <FileUpload variant="hero" onFile={handleFile} loading={loading} />
        </main>
      </div>
    )
  }

  const columnsByKey = new Map(columns.map((c) => [c.key, c]))
  const titleColumn = columnsByKey.get(sheet.titleKey)
  const shownFilterKeys = [...sheet.suggestedFilterKeys, ...addedFilterKeys]
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const animationKey = `${sheetIndex}-${currentPage}-${sort.key}-${sort.direction}`

  function handleExport() {
    const baseName = data.fileName.replace(/\.xlsx$/i, '')
    const sheetPart = data.sheets.length > 1 ? `-${sheet.name}` : ''
    exportCsv(sorted, visibleColumns, `${baseName}${sheetPart}-filtered.csv`)
  }

  return (
    <div className="app">
      <AppBar
        subtitle={data.sheets.length > 1 ? `${data.fileName} · ${sheet.name}` : data.fileName}
        actions={<FileUpload variant="compact" onFile={handleFile} loading={loading} />}
      />

      <main className="content">
        {error && <StatusMessage kind="error">{error}</StatusMessage>}

        <SheetTabs sheets={data.sheets} active={sheetIndex} onChange={handleSheetChange} />

        <StatsBar
          total={rows.length}
          matching={sorted.length}
          visibleColumns={visibleColumns.length}
          totalColumns={columns.length}
          activeFilters={getActiveFilters(filters).length}
        />

        <section className="panel controls" aria-label="Search and filters">
          <SearchBar value={search} onChange={handleSearch} />
          <div className="filters">
            {shownFilterKeys.map((key) => (
              <FilterControl
                key={key}
                column={columnsByKey.get(key)}
                rows={rows}
                value={filters[key]}
                onChange={(value) => handleFilter(key, value)}
                onRemove={addedFilterKeys.includes(key) ? () => removeAddedFilter(key) : undefined}
              />
            ))}
            {pairRanges.map((pair) => (
              <PairRangeFilter
                key={pair.key}
                pair={pair}
                rows={rows}
                value={filters[pair.key]}
                onChange={(value) => handleFilter(pair.key, value)}
              />
            ))}
            <AddFilterMenu columns={columns} shownKeys={new Set(shownFilterKeys)} onAdd={addFilter} />
          </div>
          <div className="toolbar">
            <ActiveFilters
              search={search}
              filters={filters}
              columns={columns}
              pairRanges={pairRanges}
              onClearSearch={() => handleSearch('')}
              onRemoveFilter={(key) => handleFilter(key, '')}
              onClearAll={clearAll}
            />
            <div className="toolbar-actions">
              <SortSelect columns={visibleColumns} sort={sort} onChange={handleSortChange} />
              <ColumnPicker
                columns={columns}
                visibleKeys={visibleKeys}
                onToggle={toggleColumn}
                onShowAll={() => updateVisible(new Set(columns.filter((c) => !c.empty).map((c) => c.key)))}
                onHideAll={() => updateVisible(new Set([sheet.titleKey]))}
                onReset={resetColumns}
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
              query={deferredSearch}
              animationKey={animationKey}
            />
            <DataCards
              rows={pageRows}
              columns={visibleColumns}
              titleColumn={titleColumn}
              onSelect={setSelectedRow}
              query={deferredSearch}
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
      </main>

      {selectedRow && (
        <RowDetail row={selectedRow} columns={columns} titleColumn={titleColumn} onClose={closeDetail} />
      )}
    </div>
  )
}

export default App
