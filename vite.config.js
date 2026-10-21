import { sveltekit } from '@sveltejs/kit/vite'
import adapter from '@sveltejs/adapter-node'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [sveltekit({ adapter: adapter() })],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          include: ['tests/**/*.test.js'],
          exclude: ['tests/components/**'],
          environment: 'node'
        }
      },
      {
        extends: true,
        resolve: { conditions: ['browser'] },
        test: {
          name: 'components',
          include: ['tests/components/**/*.test.js'],
          environment: 'jsdom'
        }
      }
    ]
  }
})
