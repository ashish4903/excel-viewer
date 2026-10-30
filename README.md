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
- **Export** the filtered rows as CSV. Text that looks like a formula (starting with = + - @) is saved as plain text, so it can't run when the file is opened in Excel.
- **Large files:** 50,000 rows open in about 2–4 seconds without freezing the page. The workbook is read by a small built-in reader that uses the browser's own unzip support, in a background worker.
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
├── App.test.jsx            screen tests: upload, search, filters, sorting, columns, keyboard
├── components/             one small component per file (table, cards, filters, …)
├── config/columns.js       optional per-header labels, types and filters
├── utils/
│   ├── parseExcel.js       reads the workbook (the only place Excel is parsed; no library)
│   ├── detectColumns.js    works out each column's type and filter
│   ├── filterRows.js       search, filters and sorting
│   ├── xlsxFixture.js      builds real .xlsx files in memory for the tests
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

The workflow is in [`.github/workflows/ci.yml`](.github/workflows/ci.yml). Its jobs get read-only access to the code; only the deploy job may publish to Pages.

GitHub also runs these free security checks on the repository:

- **CodeQL code scanning** looks for security problems in the code and workflows on every pull request and push to `main`.
- **Secret scanning with push protection** blocks any push that contains a token or password.
- **Dependabot** opens pull requests for outdated or vulnerable dependencies.

## Built with

[React](https://react.dev), [Vite](https://vite.dev) and [Vitest](https://vitest.dev), styled with plain CSS. Excel files are read with the browser's built-in [DecompressionStream](https://developer.mozilla.org/docs/Web/API/DecompressionStream); there is no spreadsheet library.
