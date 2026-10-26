# Excel Viewer

React (Vite) app that reads an Excel file in the browser and shows it in a filterable, responsive table.

## Commands

- npm run dev: start dev server
- npm run build: production build

## Rules

- Plain React + CSS (no UI library unless I ask)
- Excel parsing lives only in src/utils/parseExcel.js
- Columns are defined in src/config/columns.js, never hard-coded in components
- Mobile-first responsive layout
- Keep components small; one component per file
- Don't read node_modules or sample-data unless I ask
