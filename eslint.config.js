import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      // __APP_COMMIT__ and __APP_BUILT_AT__ are filled in at build time by vite.config.js.
      globals: { ...globals.browser, __APP_COMMIT__: 'readonly', __APP_BUILT_AT__: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
