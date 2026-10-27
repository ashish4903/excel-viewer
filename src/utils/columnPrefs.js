import { DEFAULT_VISIBLE_COLUMNS } from '../config/columns.js'

// Visible-column choices are saved in this browser per header layout, so a later file with
// exactly the same headers restores them. Only column keys are stored, never cell data.
const PREFIX = 'excel-viewer:columns:'

function storageKey(columns) {
  const text = columns.map((c) => c.header).join('\u0001')
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return `${PREFIX}${columns.length}-${(hash >>> 0).toString(36)}`
}

export function defaultVisibleKeys(columns) {
  return new Set(
    columns
      .filter((c) => !c.empty && !c.hidden)
      .slice(0, DEFAULT_VISIBLE_COLUMNS)
      .map((c) => c.key),
  )
}

export function loadVisibleKeys(columns) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(columns)))
    if (Array.isArray(saved)) {
      const valid = saved.filter((key) => columns.some((c) => c.key === key))
      if (valid.length > 0) return new Set(valid)
    }
  } catch {
    // Storage unavailable or corrupt: fall back to the default.
  }
  return defaultVisibleKeys(columns)
}

export function saveVisibleKeys(columns, keys) {
  try {
    localStorage.setItem(storageKey(columns), JSON.stringify([...keys]))
  } catch {
    // Ignore: the choice still applies until the next upload.
  }
}

export function clearVisibleKeys(columns) {
  try {
    localStorage.removeItem(storageKey(columns))
  } catch {
    // Ignore.
  }
}
