# Clyvora Resize

> Resize and convert images privately in your browser.

Clyvora Resize is a focused local PNG, JPEG, and WebP resizer, compressor, and converter. It processes one image at a time and has no image-upload backend.

## Limits

- Input file: 25 MiB
- Source side: 12,000 pixels
- Source pixels: 40 megapixels
- Output side: 8,192 pixels
- Output pixels: 32 megapixels
- Estimated decoded working memory: 128 MiB on constrained devices, otherwise 256 MiB
- Batch size: one

Encoded dimensions are inspected before expensive browser decoding so a small compressed file cannot silently request an unreasonable canvas. PNG, JPEG, and WebP are the only initial formats because their browser decode and encode paths are dependable enough for the intended scope.

## Development and testing

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
pnpm test:browser
```

The browser suite covers Chromium, Firefox, WebKit, and a narrow mobile Chromium viewport. Its privacy test records actual network requests while selecting and processing a real fixture.

Deploy the static build to the owner-configured `resize.clyvora.tech` project. Apply `vercel.json` or equivalent headers at the hosting layer, then verify them on production rather than assuming configuration was applied.

## Known limitations

- Browser image encoders may produce different byte sizes for the same quality value.
- JPEG output uses a white background for transparent source pixels.
- Native canvas encoding cannot always be interrupted mid-call; a cancelled result is discarded and resources are released afterward.
- EXIF, color-profile, and other source metadata are not preserved.
