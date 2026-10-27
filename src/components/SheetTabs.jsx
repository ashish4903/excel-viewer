// Sheet switcher; hidden when the workbook has a single sheet with data.
function SheetTabs({ sheets, active, onChange }) {
  if (sheets.length < 2) return null

  return (
    <div className="sheet-tabs" role="tablist" aria-label="Sheets">
      {sheets.map((sheet, i) => (
        <button
          key={`${sheet.name}-${i}`}
          type="button"
          role="tab"
          aria-selected={i === active}
          className={`sheet-tab${i === active ? ' active' : ''}`}
          onClick={() => onChange(i)}
        >
          {sheet.name}
          <span className="count">{sheet.rows.length.toLocaleString()}</span>
        </button>
      ))}
    </div>
  )
}

export default SheetTabs
