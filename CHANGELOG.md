# Changelog

All notable changes to the Excel Viewer are listed here, newest first.
Versions follow [Semantic Versioning](https://semver.org): see "Versions and releases" in the [README](README.md).

## [Unreleased]

### Performance
- Large files show their first 100 rows within a couple of seconds while the rest loads (120,000 rows × 140 columns: first rows after about 2 seconds instead of 13). Search, filters and sorting appear when the whole file is ready.

## [1.0.0] - 2026-10-29

The first numbered release. It covers everything built so far.

### Features
- Open any `.xlsx` file in the browser; the file never leaves your device.
- Columns, types (text, number, currency, date, code) and filters are detected from each file.
- Search across all columns, suggested dropdown filters, and **+ Add filter** for any column (list, text, number range or date range).
- Sort by any column, choose which columns to show (remembered for files with the same headers), and switch between sheets.
- Row details panel with copy buttons.
- Export the filtered rows as CSV. Text that looks like a formula is saved as plain text, so it can't run in Excel.
- A table on desktop and cards on phones, with light and dark themes.
- Clear messages for empty, password-protected, old `.xls`, renamed or damaged files.
- Accessible: keyboard navigation, screen-reader labels and announcements, and readable contrast.

### Performance
- Workbooks are read by a small built-in reader instead of a library. Large files open 2–3x faster (50,000 rows in about 2–4 seconds).
- Wide files open about twice as fast again: 120,000 rows × 140 columns in about 13 seconds.
- Fixed "Maximum call stack size exceeded" on some large files.

### Project
- Automatic tests, lint, build, dependency audit and CodeQL security scanning on every pull request.
- Every merge to `main` is deployed to GitHub Pages; the footer shows the live version.
- Dependabot keeps dependencies up to date.
- MIT licence.

[Unreleased]: https://github.com/ashish4903/excel-viewer/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ashish4903/excel-viewer/releases/tag/v1.0.0
