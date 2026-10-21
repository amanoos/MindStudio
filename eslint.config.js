import js from '@eslint/js'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'

export default [
  { ignores: ['build/', '.svelte-kit/', 'node_modules/', 'playwright-report/', 'test-results/'] },
  js.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } }
  }
]
