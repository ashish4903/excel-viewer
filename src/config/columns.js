// Columns shown in the viewer, in display order.
// header: exact header text in the Excel file
// key: property name on each parsed row
// type: 'text' | 'date' | 'currency' (controls formatting and sorting)
// filterable: adds a dropdown filter for this column
// display: 'badge' renders values as colored pills (optional)
export const columns = [
  { key: 'caseNumber', header: 'CASE_NUMBER', label: 'Case number', type: 'text', filterable: false },
  { key: 'caseStatus', header: 'CASE_STATUS', label: 'Status', type: 'text', filterable: true, display: 'badge' },
  { key: 'receivedDate', header: 'RECEIVED_DATE', label: 'Received', type: 'date', filterable: false },
  { key: 'decisionDate', header: 'DECISION_DATE', label: 'Decision', type: 'date', filterable: false },
  { key: 'occupationType', header: 'OCCUPATION_TYPE', label: 'Occupation type', type: 'text', filterable: true, display: 'badge' },
  { key: 'empBusinessName', header: 'EMP_BUSINESS_NAME', label: 'Employer', type: 'text', filterable: false },
  { key: 'empTradeName', header: 'EMP_TRADE_NAME', label: 'Trade name', type: 'text', filterable: false },
  { key: 'empAddr1', header: 'EMP_ADDR1', label: 'Employer address 1', type: 'text', filterable: false },
  { key: 'empAddr2', header: 'EMP_ADDR2', label: 'Employer address 2', type: 'text', filterable: false },
  { key: 'empCity', header: 'EMP_CITY', label: 'Employer city', type: 'text', filterable: false },
  { key: 'empState', header: 'EMP_STATE', label: 'Employer state', type: 'text', filterable: true },
  { key: 'empPostcode', header: 'EMP_POSTCODE', label: 'Employer postcode', type: 'text', filterable: false },
  { key: 'empCountry', header: 'EMP_COUNTRY', label: 'Employer country', type: 'text', filterable: true },
  { key: 'empProvince', header: 'EMP_PROVINCE', label: 'Employer province', type: 'text', filterable: false },
  { key: 'pocLastName', header: 'EMP_POC_LAST_NAME', label: 'Contact last name', type: 'text', filterable: false },
  { key: 'pocFirstName', header: 'EMP_POC_FIRST_NAME', label: 'Contact first name', type: 'text', filterable: false },
  { key: 'pocMiddleName', header: 'EMP_POC_MIDDLE_NAME', label: 'Contact middle name', type: 'text', filterable: false },
  { key: 'pocJobTitle', header: 'EMP_POC_JOB_TITLE', label: 'Contact job title', type: 'text', filterable: false },
  { key: 'pocAddr1', header: 'EMP_POC_ADDR1', label: 'Contact address 1', type: 'text', filterable: false },
  { key: 'pocAddr2', header: 'EMP_POC_ADDR2', label: 'Contact address 2', type: 'text', filterable: false },
  { key: 'pocCity', header: 'EMP_POC_CITY', label: 'Contact city', type: 'text', filterable: false },
  { key: 'pocState', header: 'EMP_POC_STATE', label: 'Contact state', type: 'text', filterable: false },
  { key: 'pocPostalCode', header: 'EMP_POC_POSTAL_CODE', label: 'Contact postal code', type: 'text', filterable: false },
  { key: 'pocEmail', header: 'EMP_POC_EMAIL', label: 'Contact email', type: 'text', filterable: false },
  { key: 'attyEmail', header: 'ATTY_AG_EMAIL', label: 'Attorney/agent email', type: 'text', filterable: false },
  { key: 'jobTitle', header: 'JOB_TITLE', label: 'Job title', type: 'text', filterable: false },
  { key: 'wageFrom', header: 'JOB_OPP_WAGE_FROM', label: 'Wage from', type: 'currency', filterable: false },
  { key: 'wageTo', header: 'JOB_OPP_WAGE_TO', label: 'Wage to', type: 'currency', filterable: false },
  { key: 'wagePer', header: 'JOB_OPP_WAGE_PER', label: 'Wage per', type: 'text', filterable: true },
  { key: 'worksiteAddr1', header: 'PRIMARY_WORKSITE_ADDR1', label: 'Worksite address', type: 'text', filterable: false },
]

// Min/max range filters. A row matches when its [fromKey, toKey] range overlaps the entered range.
export const rangeFilters = [
  {
    key: 'wage',
    label: 'Salary range',
    fromKey: 'wageFrom',
    toKey: 'wageTo',
    hint: 'Combine with “Wage per” to compare like with like.',
  },
]
