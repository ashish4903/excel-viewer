---
name: excel-table-ui
description: Use when building or changing the Excel data table, filters, or responsive layout in this app.
---

# Excel table UI conventions

1. Read the column list from src/config/columns.js (key, label, type, filterable).
2. Parse the file with parseExcel.js and return an array of objects keyed by column key.
3. Filters: text search across all columns, plus a dropdown for every column marked filterable.
4. Table: sticky header, sortable columns, pagination at 25 rows.
5. Responsive: table on desktop, stacked cards under 640px.
6. Show a clear message for empty files, missing columns, or wrong file type.
