import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'

test('processes a real image without sending its bytes or filename outside the app boundary', async ({ page, context }) => {
  const requests: Array<{ url: string; body: string | null }> = []
  page.on('request', (request) => requests.push({ url: request.url(), body: request.postData() }))
  await page.goto('/')
  const boundaryStart = requests.length
  await page.locator('input[type="file"]').setInputFiles(resolve('tests/fixtures/sample.png'))
  await expect(page.getByRole('heading', { name: /make it fit/i })).toBeVisible()
  await page.getByLabel('Output width').fill('64')
  await page.getByLabel('Output format').selectOption('webp')
  await page.getByRole('button', { name: /resize image/i }).click()
  await expect(page.getByRole('button', { name: /download webp/i })).toBeVisible()
  await expect(page.getByText(/webp · 64 ×/i)).toBeVisible()

  const processingRequests = requests.slice(boundaryStart)
  for (const request of processingRequests) {
    const url = new URL(request.url)
    expect(url.origin === 'http://127.0.0.1:4175' || url.protocol === 'blob:').toBe(true)
    expect(`${request.url}\n${request.body ?? ''}`).not.toContain('sample.png')
  }
  expect(processingRequests.filter((request) => request.body)).toHaveLength(0)
  await context.clearCookies()
})

