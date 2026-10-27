# Excel Viewer

React (Vite) app that reads an Excel file in the browser and shows it in a filterable, responsive table.

## Commands

- npm run dev: start dev server
- npm run build: production build
- npm test: run the unit tests (Vitest); tests live next to the code as *.test.js

## Rules

- Plain React + CSS (no UI library unless I ask)
- Excel parsing lives only in src/utils/parseExcel.js
- Columns are detected from each uploaded file (src/utils/detectColumns.js), never hard-coded in components; src/config/columns.js holds only optional per-header overrides and defaults
- Mobile-first responsive layout
- Keep components small; one component per file
- Don't read node_modules or sample-data unless I ask
