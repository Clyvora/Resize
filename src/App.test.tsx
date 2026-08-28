import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./image', async (original) => {
  const actual = await original<typeof import('./image')>()
  return {
    ...actual,
    inspectImage: vi.fn().mockResolvedValue({ format: 'png', mimeType: 'image/png', width: 800, height: 600 }),
    resizeImage: vi.fn().mockResolvedValue({
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' }),
      format: 'webp', mimeType: 'image/webp', width: 400, height: 300,
    }),
  }
})

describe('Clyvora Resize', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:image') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  })

  it('selects one image and exposes dimensions and format controls', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File([new Uint8Array([1])], 'sample.png', { type: 'image/png' })] } })
    expect(await screen.findByRole('heading', { name: /make it fit/i })).toBeVisible()
    expect(screen.getByLabelText(/output width/i)).toHaveValue(800)
    expect(screen.getByLabelText(/output height/i)).toHaveValue(600)
    await user.click(screen.getByRole('button', { name: '50%' }))
    expect(screen.getByLabelText(/output width/i)).toHaveValue(400)
    expect(screen.getByLabelText(/output height/i)).toHaveValue(300)
  })

  it('processes a lossy output and presents a real result size', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File([new Uint8Array([1])], 'sample.png', { type: 'image/png' })] } })
    await screen.findByRole('heading', { name: /make it fit/i })
    await user.click(screen.getByRole('button', { name: /resize image/i }))
    expect(await screen.findByRole('button', { name: /download webp/i })).toBeEnabled()
    expect(screen.getByText(/ready to download 3 b/i)).toBeVisible()
  })

  it('releases preview resources when starting another image', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File([new Uint8Array([1])], 'sample.png', { type: 'image/png' })] } })
    await screen.findByRole('heading', { name: /make it fit/i })
    await user.click(screen.getByRole('button', { name: /process another image/i }))
    expect(URL.revokeObjectURL).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /choose image/i })).toBeEnabled()
  })
})

