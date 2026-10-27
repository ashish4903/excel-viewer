// Columns are detected from each uploaded file (see src/utils/detectColumns.js).
// Everything here is optional tuning; files without these headers work unchanged.

// How many non-empty columns the table shows before the user picks their own.
export const DEFAULT_VISIBLE_COLUMNS = 40

// How many auto-suggested dropdown filters appear; more can be added with "+ Add filter".
export const SUGGESTED_FILTERS = 4

// Per-header overrides, keyed by the exact header text in the file.
// label: display name
// type: 'text' | 'number' | 'currency' | 'date' | 'code' (code = numbers shown as typed, e.g. zip, phone)
// display: 'badge' renders values as colored pills
// filterable: true always suggests a dropdown filter; false never does
// hidden: true starts the column hidden
export const columnOverrides = {
  CASE_STATUS: { label: 'Status', display: 'badge', filterable: true },
  OCCUPATION_TYPE: { display: 'badge', filterable: true },
  EMP_STATE: { label: 'Employer state', filterable: true },
  JOB_OPP_WAGE_FROM: { label: 'Wage from', type: 'currency' },
  JOB_OPP_WAGE_TO: { label: 'Wage to', type: 'currency' },
  JOB_OPP_WAGE_PER: { label: 'Wage per', filterable: true },
}

// Paired min/max filters, shown when a file has both headers.
// A row matches when its [from, to] range overlaps the entered range.
export const rangeFilters = [
  {
    key: 'wage',
    label: 'Salary range',
    fromHeader: 'JOB_OPP_WAGE_FROM',
    toHeader: 'JOB_OPP_WAGE_TO',
    hint: 'Combine with “Wage per” to compare like with like.',
  },
]
