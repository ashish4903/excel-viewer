---
name: excel-table-ui
description: Use when building or changing the Excel data table, filters, or responsive layout in this app.
---

# Excel table UI conventions

1. Columns come from the uploaded file: parseExcel.js reads each sheet and detectColumns.js builds { key, header, label, type, filterKind, ... }. src/config/columns.js only holds optional per-header overrides, defaults, and paired range filters.
2. Parse the file with parseExcel.js and return, per sheet, an array of objects keyed by column key.
3. Filters: text search across all columns, a few auto-suggested dropdowns, and "+ Add filter" for any other column (list, text, number range, or date range by type).
4. Table: sticky header, sortable columns, pagination at 25 rows.
5. Responsive: table on desktop, stacked cards under 640px.
6. Show a clear message for empty files, sheets without data, or wrong file type.
