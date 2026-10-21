import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(import.meta.dirname, '..', 'src', 'lib', 'ai')

describe('the AI code runs in the browser only', () => {
  const files = readdirSync(dir).filter((f) => f.endsWith('.js'))

  it('has files to check', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s imports nothing from the server', (file) => {
    const src = readFileSync(join(dir, file), 'utf8')
    const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]/g)].map(
      (m) => m[1] ?? m[2]
    )
    for (const spec of imports) {
      expect(spec).not.toMatch(/server/)
      expect(spec).not.toMatch(/^(node:|fs|path|@libsql)/)
    }
    expect(src).not.toMatch(/\$env|process\.env/)
  })

  it('only the key store reads the stored key', () => {
    for (const file of files.filter((f) => f !== 'key-store.js')) {
      const src = readFileSync(join(dir, file), 'utf8')
      expect(src).not.toMatch(/claude-key|KEY_NAME/)
      // Other modules may keep harmless settings in storage, but only by their own name.
      if (/localStorage/.test(src)) expect(file).toBe('settings.js')
    }
  })
})
