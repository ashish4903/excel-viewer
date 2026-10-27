import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the build works at https://ashish4903.github.io/excel-viewer/ as well as at a site root.
  base: './',
  plugins: [react()],
})
