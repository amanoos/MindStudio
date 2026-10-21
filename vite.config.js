import { sveltekit } from '@sveltejs/kit/vite'
import adapter from '@sveltejs/adapter-node'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter(),
      csp: {
        directives: {
          'default-src': ['self'],
          'script-src': ['self'],
          'style-src': ['self'],
          'style-src-attr': ['unsafe-inline'],
          'img-src': ['self', 'data:'],
          'font-src': ['self', 'data:'],
          'connect-src': ['self', 'https://api.anthropic.com'],
          'worker-src': ['self', 'blob:'],
          'object-src': ['none'],
          'base-uri': ['self'],
          'form-action': ['self'],
          'frame-ancestors': ['none']
        }
      }
    })
  ],
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
