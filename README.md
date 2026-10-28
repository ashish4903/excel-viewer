# Excel Viewer

Open any Excel (.xlsx) file in your browser and explore it in a searchable, filterable, sortable table that also works on phones.

**Live app: https://ashish4903.github.io/excel-viewer/**

[![CI](https://github.com/ashish4903/excel-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/ashish4903/excel-viewer/actions/workflows/ci.yml)

## Your data stays on your device

Files are read entirely in your browser. Nothing is uploaded to a server, so it is safe to open files with private information.

## Features

- **Works with any .xlsx file.** Columns, types (text, number, currency, date, code) and filters are detected from each file; nothing is tied to one layout.
- **Search** across every column at once (press `/` to jump to the search box).
- **Filters:** four suggested dropdown filters, plus **+ Add filter** for any column as a list, text, number range or date range.
- **Sorting** by any column, with empty cells always last.
- **Choose columns:** the first 40 are shown; your choice is remembered for files with the same headers.
- **Multiple sheets** appear as tabs.
- **Row details:** click a row to see all its fields, with copy buttons.
- **Export** the filtered rows as CSV.
- **Large files:** 50,000+ rows load without freezing the page (reading runs in a background worker).
- **Responsive:** a table on desktop and cards on phones, with light and dark themes.
- **Clear error messages** for empty, password-protected, old .xls or renamed files, with technical details for troubleshooting.

## Run it locally

Requires [Node.js](https://nodejs.org) 22 or newer (CI uses Node 24).

```bash
git clone https://github.com/ashish4903/excel-viewer.git
cd excel-viewer
npm install
npm run dev
```

Then open the address shown in the terminal (usually http://localhost:5173).

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with live reload |
| `npm test` | Run the unit tests once (`npm run test:watch` re-runs them as you edit) |
| `npm run lint` | Check code style with ESLint |
| `npm run build` | Build the production site into `dist/` |
| `npm run preview` | Serve the production build locally |

## Project structure

```
src/
├── App.jsx                 page layout and state
├── components/             one small component per file (table, cards, filters, …)
├── config/columns.js       optional per-header labels, types and filters
├── utils/
│   ├── parseExcel.js       reads the workbook (the only place Excel is parsed)
│   ├── detectColumns.js    works out each column's type and filter
│   ├── filterRows.js       search, filters and sorting
│   └── *.test.js           unit tests, next to the code they check
└── workers/                runs parsing off the main thread
```

### Tuning for a specific file

Everything is detected automatically, but `src/config/columns.js` can adjust columns by their exact header text, for example:

```js
export const columnOverrides = {
  CASE_STATUS: { label: 'Status', display: 'badge', filterable: true },
  JOB_OPP_WAGE_FROM: { label: 'Wage from', type: 'currency' },
}
```

Files without those headers are unaffected.

## How changes reach the live site

`main` is protected, so every change goes through a pull request:

1. Create a branch, commit and push, then open a pull request.
2. **CI** (GitHub Actions) installs dependencies, then runs lint, tests and the production build. The pull request can only be merged when this passes. A separate **audit** check warns if a dependency has a known security vulnerability.
3. Merging into `main` runs CI again and then **deploys** the build to GitHub Pages, usually within a minute.

The workflow is in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Built with

[React](https://react.dev), [Vite](https://vite.dev), [read-excel-file](https://www.npmjs.com/package/read-excel-file) and [Vitest](https://vitest.dev), styled with plain CSS.
