import { defineConfig } from '@playwright/test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PORT = 4173
// A fresh database for every run, so tests never depend on leftovers from an earlier one.
const dbFile = join(tmpdir(), `mind-studio-e2e-${Date.now()}.db`).replaceAll('\\', '/')

export const E2E_PASSCODE = 'e2e-passcode'

export default defineConfig({
  testDir: 'e2e',
  // Tests share one app and one database, and some change settings, so run them one at a time.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  webServer: {
    command: 'npm run build && node server.js',
    url: `http://127.0.0.1:${PORT}/healthz`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(PORT),
      ASSUME_HTTP: '1',
      PROTOCOL_HEADER: 'x-forwarded-proto',
      APP_PASSCODE: E2E_PASSCODE,
      SESSION_SECRET: 'e2e-session-secret-0123456789abcdef',
      DATABASE_URL: `file:${dbFile}`,
      DEFAULT_TIMEZONE: 'UTC'
    }
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Set E2E_CHANNEL=chrome or msedge to use an installed browser instead of Playwright's.
    channel: process.env.E2E_CHANNEL || undefined
  }
})
