import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The commit this build comes from: GitHub Actions provides it; locally it is read from git.
function commitSha() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

// The app's version number (see Versions and releases in README.md).
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Relative asset paths, so the build works at https://ashish4903.github.io/excel-viewer/ as well as at a site root.
  base: './',
  plugins: [react()],
  // Shown in the footer so you can tell which version is live (see src/components/AppFooter.jsx).
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(command === 'build' ? commitSha() : ''),
    __APP_BUILT_AT__: JSON.stringify(command === 'build' ? new Date().toISOString() : ''),
  },
}))
