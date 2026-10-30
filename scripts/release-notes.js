// Prints the CHANGELOG.md section for the version in package.json, to use as release notes.
// Fails when that version has no section, so CI catches a version bump without a changelog entry.
// Usage: node scripts/release-notes.js
import { readFileSync } from 'node:fs'
import process from 'node:process'

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

// The section runs from its "## [x.y.z]" heading to the next "## [" heading or the link list at the end.
const start = changelog.indexOf(`\n## [${version}]`)
if (start === -1) {
  console.error(`CHANGELOG.md has no "## [${version}]" section for the version in package.json.`)
  process.exit(1)
}
const body = changelog.slice(changelog.indexOf('\n', start + 1) + 1)
const end = body.search(/^## \[|^\[[^\]]+\]: /m)
const notes = (end === -1 ? body : body.slice(0, end)).trim()
if (!notes) {
  console.error(`The "## [${version}]" section of CHANGELOG.md is empty.`)
  process.exit(1)
}
console.log(notes)
