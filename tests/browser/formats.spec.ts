import { expect, test } from '@playwright/test'
import { resolve } from 'node:path'

test('produces PNG, JPEG, and WebP results with working lossy quality controls', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(resolve('tests/fixtures/sample.png'))
  await page.getByLabel('Output width').fill('96')

  for (const [format, label] of [['png', 'PNG'], ['jpg', 'JPG'], ['webp', 'WEBP']] as const) {
    await page.getByLabel('Output format').selectOption(format)
    if (format !== 'png') {
      await page.getByLabel('Output quality').fill('40')
      await expect(page.getByText('40%')).toBeVisible()
    }
    await page.getByRole('button', { name: /resize image/i }).click()
    await expect(page.getByRole('button', { name: `Download ${label}` })).toBeVisible()
    await expect(page.getByText(new RegExp(`${label} · 96 ×`, 'i'))).toBeVisible()
  }
})
