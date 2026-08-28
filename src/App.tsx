import { useEffect, useRef, useState } from 'react'
import { dimensionsFromHeight, dimensionsFromWidth, inspectImage, LIMITS, resizeImage, validateOutput } from './image'
import type { ImageFormat, ImageInfo } from './image'

const ACCEPT = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1 }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

function outputName(name: string, format: ImageFormat): string {
  const stem = name.replace(/\.[^/.]+$/, '').replace(/[<>:"/\\|?*]/g, '-').trim() || 'resized-image'
  return `${stem}.${format}`
}

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [info, setInfo] = useState<ImageInfo | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [lockRatio, setLockRatio] = useState(true)
  const [format, setFormat] = useState<ImageFormat>('webp')
  const [quality, setQuality] = useState(0.86)
  const [phase, setPhase] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => {
    abortRef.current?.abort()
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
  }, [sourceUrl, resultUrl])

  const clearResult = () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setResultUrl(null)
    setResultBlob(null)
  }

  const reset = () => {
    abortRef.current?.abort()
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    clearResult()
    setFile(null); setInfo(null); setSourceUrl(null); setError(null); setPhase(null)
  }

  const selectFile = async (selected: File) => {
    setError(null)
    clearResult()
    try {
      const inspected = await inspectImage(selected)
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
      setFile(selected)
      setInfo(inspected)
      setWidth(inspected.width)
      setHeight(inspected.height)
      setFormat(inspected.format === 'webp' ? 'jpg' : 'webp')
      setSourceUrl(URL.createObjectURL(selected))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The image could not be inspected.')
    }
  }

  const changeWidth = (value: number) => {
    clearResult()
    if (info && lockRatio && Number.isFinite(value) && value > 0) {
      const next = dimensionsFromWidth(info, value)
      setWidth(next.width); setHeight(next.height)
    } else setWidth(value)
  }
  const changeHeight = (value: number) => {
    clearResult()
    if (info && lockRatio && Number.isFinite(value) && value > 0) {
      const next = dimensionsFromHeight(info, value)
      setWidth(next.width); setHeight(next.height)
    } else setHeight(value)
  }

  const setPercentage = (percentage: number) => {
    if (!info) return
    clearResult()
    setWidth(Math.max(1, Math.round(info.width * percentage / 100)))
    setHeight(Math.max(1, Math.round(info.height * percentage / 100)))
  }

  const process = async () => {
    if (!file || !info || phase) return
    setError(null)
    clearResult()
    try {
      validateOutput(width, height, info, (navigator as Navigator & { deviceMemory?: number }).deviceMemory)
      const controller = new AbortController()
      abortRef.current = controller
      const result = await resizeImage(file, info, {
        width, height, outputFormat: format, quality, signal: controller.signal,
        onProgress: (next) => setPhase(`${next[0]!.toUpperCase()}${next.slice(1)} image`),
      })
      controller.signal.throwIfAborted()
      const url = URL.createObjectURL(result.blob)
      setResultBlob(result.blob)
      setResultUrl(url)
      setPhase(null)
    } catch (caught) {
      setPhase(null)
      if (caught instanceof DOMException && caught.name === 'AbortError') setError('Image processing cancelled. Adjust the settings and try again.')
      else setError(caught instanceof Error ? caught.message : 'The image could not be processed.')
    } finally {
      abortRef.current = null
    }
  }

  const cancel = () => abortRef.current?.abort()
  const download = () => {
    if (!resultUrl || !file) return
    const anchor = document.createElement('a')
    anchor.href = resultUrl
    anchor.download = outputName(file.name, format)
    anchor.click()
  }

  return <main>
    <header>
      <button className="brand" type="button" onClick={reset} aria-label="Clyvora Resize home"><img src="/favicon.png" alt="" width="34" height="34" decoding="async" /><span>Clyvora <strong>Resize</strong></span></button>
      <span className="privacy-badge">Local image processing</span>
    </header>

    {!file || !info || !sourceUrl ? <section className="hero" aria-labelledby="hero-title">
      <p className="eyebrow">Images, focused</p>
      <h1 id="hero-title">Resize and convert images privately in your browser.</h1>
      <p>Choose a PNG, JPEG, or WebP image. Its contents and filename stay on this device during normal use.</p>
      <div className={`drop-zone ${dropActive ? 'active' : ''}`}
        onDragEnter={(event) => { event.preventDefault(); setDropActive(true) }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDropActive(false)}
        onDrop={(event) => { event.preventDefault(); setDropActive(false); const selected = event.dataTransfer.files[0]; if (selected) void selectFile(selected) }}>
        <span className="drop-icon" aria-hidden="true">↙</span>
        <h2>Drop one image here</h2>
        <p>PNG, JPEG, or WebP · up to {Math.round(LIMITS.maxInputBytes / 1024 / 1024)} MB</p>
        <button className="primary" type="button" onClick={() => inputRef.current?.click()}>Choose image</button>
        <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={(event) => { const selected = event.target.files?.[0]; if (selected) void selectFile(selected); event.currentTarget.value = '' }} />
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      <p className="limits">Safety limits: {LIMITS.maxSourceDimension.toLocaleString()} px per source side, {Math.round(LIMITS.maxSourcePixels / 1_000_000)} megapixels decoded, and {LIMITS.maxOutputDimension.toLocaleString()} px per output side.</p>
    </section> : <section className="workspace" aria-labelledby="workspace-title">
      <div className="workspace-heading">
        <div><p className="eyebrow">Image workspace</p><h1 id="workspace-title">Make it fit.</h1></div>
        <button className="secondary" type="button" onClick={reset} disabled={Boolean(phase)}>Process another image</button>
      </div>

      {error && <div className="error" role="alert">{error}</div>}
      <div className="editor-grid">
        <section className="preview-panel" aria-labelledby="preview-title">
          <div className="panel-heading"><h2 id="preview-title">Preview</h2><span>{resultUrl ? 'Result' : 'Original'}</span></div>
          <div className="image-stage"><img src={resultUrl ?? sourceUrl} alt={resultUrl ? `Processed preview of ${file.name}` : `Preview of ${file.name}`} /></div>
          <dl className="metadata">
            <div><dt>File</dt><dd>{file.name}</dd></div>
            <div><dt>Original</dt><dd>{info.format.toUpperCase()} · {info.width} × {info.height} · {formatBytes(file.size)}</dd></div>
            {resultBlob && <div><dt>Result</dt><dd>{format.toUpperCase()} · {width} × {height} · {formatBytes(resultBlob.size)}</dd></div>}
          </dl>
        </section>

        <section className="controls-panel" aria-labelledby="controls-title">
          <div className="panel-heading"><h2 id="controls-title">Resize settings</h2><span>One image</span></div>
          <fieldset>
            <legend>Dimensions</legend>
            <div className="dimension-grid">
              <label>Width <input aria-label="Output width" type="number" min="1" max={LIMITS.maxOutputDimension} value={width} onChange={(event) => changeWidth(Number(event.target.value))} /></label>
              <label>Height <input aria-label="Output height" type="number" min="1" max={LIMITS.maxOutputDimension} value={height} onChange={(event) => changeHeight(Number(event.target.value))} /></label>
            </div>
            <label className="check"><input type="checkbox" checked={lockRatio} onChange={(event) => setLockRatio(event.target.checked)} /> Lock original aspect ratio</label>
            <div className="percentages" role="group" aria-label="Resize by percentage">
              {[25, 50, 75, 100].map((percentage) => <button type="button" key={percentage} onClick={() => setPercentage(percentage)}>{percentage}%</button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend>Output</legend>
            <label>Format
              <select aria-label="Output format" value={format} onChange={(event) => { clearResult(); setFormat(event.target.value as ImageFormat) }}>
                <option value="png">PNG</option><option value="jpg">JPEG</option><option value="webp">WebP</option>
              </select>
            </label>
            {format !== 'png' && <label>Quality <span>{Math.round(quality * 100)}%</span>
              <input aria-label="Output quality" type="range" min="40" max="100" value={Math.round(quality * 100)} onChange={(event) => { clearResult(); setQuality(Number(event.target.value) / 100) }} />
            </label>}
          </fieldset>
          <p className="memory-note">Estimated decoded memory is checked before processing. Images that exceed the safety budget are stopped before browser decoding.</p>
          {phase ? <button className="danger" type="button" onClick={cancel}>{phase} — cancel</button>
            : resultUrl ? <div className="result-actions"><button className="primary" type="button" onClick={download}>Download {format.toUpperCase()}</button><button className="secondary" type="button" onClick={() => void process()}>Process again</button></div>
              : <button className="primary wide" type="button" onClick={() => void process()}>Resize image</button>}
          <p className="status" role="status" aria-live="polite">{phase ?? (resultBlob ? `Ready to download ${formatBytes(resultBlob.size)}` : 'Ready to process')}</p>
        </section>
      </div>
    </section>}

    <footer><p>One image at a time. No upload or image-processing server.</p><a href="https://www.clyvora.tech/">Clyvora products</a></footer>
  </main>
}
