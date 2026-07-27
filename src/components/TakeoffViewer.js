'use client'

import { useRef, useState } from 'react'
import styles from './TakeoffViewer.module.css'

const FIXTURE_TOOLS = [
  { type: 'fixture', name: 'Toilet' },
  { type: 'fixture', name: 'Sink' },
  { type: 'fixture', name: 'Water Heater' },
  { type: 'fixture', name: 'Shower' },
  { type: 'fixture', name: 'Bathtub' },
]

const PIPE_TOOLS = [
  { type: 'pipe', name: 'Copper Pipe', size: '1/2 inch' },
  { type: 'pipe', name: 'Copper Pipe', size: '3/4 inch' },
  { type: 'pipe', name: 'PVC Pipe', size: '1-1/2 inch' },
  { type: 'pipe', name: 'PVC Pipe', size: '2 inch' },
]

function toImagePoint(img, clientX, clientY, srcWidth, srcHeight) {
  const rect = img.getBoundingClientRect()
  const x = (clientX - rect.left) * (srcWidth / rect.width)
  const y = (clientY - rect.top) * (srcHeight / rect.height)
  return { x, y }
}

export default function TakeoffViewer({ category, autoAccessories, onImport, onClose }) {
  const [pages, setPages] = useState([])
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const [tool, setTool] = useState(FIXTURE_TOOLS[0])
  const [takeoff, setTakeoff] = useState([])
  const [isScanning, setIsScanning] = useState(false)

  const [calibrate, setCalibrate] = useState({ step: 0, points: [], distance: '' })
  const [pixelsPerFoot, setPixelsPerFoot] = useState(null)

  const [drag, setDrag] = useState(null)
  const imageRef = useRef(null)

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      const res = await fetch('/api/takeoff/convert', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPages(data.pages)
      setCurrentPage(0)
    } catch (err) {
      setMessage('Failed to convert PDF: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleMouseDown(e) {
    const page = pages[currentPage]
    if (!page || !imageRef.current || calibrate.step > 0) return
    if (tool.type !== 'pipe') return
    const pt = toImagePoint(imageRef.current, e.clientX, e.clientY, page.width, page.height)
    setDrag({ start: pt, current: pt })
  }

  function handleMouseMove(e) {
    const page = pages[currentPage]
    if (!page || !drag || !imageRef.current) return
    const pt = toImagePoint(imageRef.current, e.clientX, e.clientY, page.width, page.height)
    setDrag({ ...drag, current: pt })
  }

  function handleMouseUp(e) {
    const page = pages[currentPage]
    if (!page || !imageRef.current) return

    if (drag) {
      const dx = drag.current.x - drag.start.x
      const dy = drag.current.y - drag.start.y
      const pixelLen = Math.sqrt(dx * dx + dy * dy)
      if (pixelLen < 5) {
        setDrag(null)
        return
      }
      let feet = pixelLen
      if (pixelsPerFoot && pixelsPerFoot > 0) {
        feet = pixelLen / pixelsPerFoot
      }
      setTakeoff((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          name: tool.name,
          size: tool.size,
          qty: Math.max(0.1, Math.round(feet * 10) / 10),
          unit: 'per foot',
          x: drag.start.x,
          y: drag.start.y,
        },
      ])
      setDrag(null)
      return
    }

    const pt = toImagePoint(imageRef.current, e.clientX, e.clientY, page.width, page.height)

    if (calibrate.step === 1) {
      setCalibrate({ ...calibrate, step: 2, points: [pt] })
      return
    }

    if (calibrate.step === 2) {
      setCalibrate({ ...calibrate, step: 3, points: [...calibrate.points, pt] })
      return
    }

    if (tool.type === 'fixture') {
      setTakeoff((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          name: tool.name,
          qty: 1,
          size: '',
          unit: 'each',
          x: pt.x,
          y: pt.y,
        },
      ])
    }
  }

  function handleMouseLeave() {
    if (drag) setDrag(null)
  }

  function startCalibration() {
    setCalibrate({ step: 1, points: [], distance: '' })
  }

  function applyCalibration() {
    const dist = parseFloat(calibrate.distance)
    if (!dist || dist <= 0 || calibrate.points.length < 2) return
    const p1 = calibrate.points[0]
    const p2 = calibrate.points[1]
    const pixelDist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
    if (pixelDist <= 0) return
    setPixelsPerFoot(pixelDist / dist)
    setCalibrate({ step: 0, points: [], distance: '' })
  }

  function removeItem(id) {
    setTakeoff((prev) => prev.filter((it) => it.id !== id))
  }

  async function handleImport() {
    if (!takeoff.length) return
    setLoading(true)
    try {
      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: takeoff.map((it) => ({
            name: it.name,
            qty: it.qty,
            size: it.size,
          })),
          category,
          autoAccessories,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onImport(data.items)
      setTakeoff([])
      onClose()
    } catch (err) {
      setMessage('Import failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAutoScan() {
    const current = pages[currentPage]
    if (!current) return
    setIsScanning(true)
    setMessage('AI is scanning for fixtures... this may take a few seconds.')
    try {
      const urlObj = new URL(current.url, window.location.origin)
      const session = urlObj.searchParams.get('session')
      
      const res = await fetch('/api/takeoff/autoscan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, page: current.page })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      if (data.items && data.items.length > 0) {
        const newItems = data.items.map((it) => {
          const cx = ((it.xmin + it.xmax) / 2 / 1000) * current.width
          const cy = ((it.ymin + it.ymax) / 2 / 1000) * current.height
          return {
            id: Date.now() + Math.random(),
            name: it.name,
            qty: 1,
            size: '',
            unit: 'each',
            x: cx,
            y: cy,
          }
        })
        setTakeoff((prev) => [...prev, ...newItems])
        setMessage(`AI Auto-Scan found ${newItems.length} fixtures!`)
      } else {
        setMessage('AI Auto-Scan found no fixtures on this page.')
      }
    } catch (err) {
      setMessage('Auto-Scan failed: ' + err.message)
    } finally {
      setIsScanning(false)
    }
  }

  const current = pages[currentPage]

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>

        <div className={styles.body}>
          <div className={styles.sidebar}>
            <input type="file" accept="application/pdf" onChange={handleUpload} />

            {message && <p style={{ color: 'red' }}>{message}</p>}

            {current && (
              <div className={styles.calibrateInfo}>
                {pixelsPerFoot ? (
                  <span>Scale: {pixelsPerFoot.toFixed(1)} px/ft</span>
                ) : (
                  <span>Not calibrated. Use a known dimension line.</span>
                )}
                {calibrate.step === 0 && <button onClick={startCalibration}>Calibrate scale</button>}
                {calibrate.step > 0 && <p>Click two points on the known distance.</p>}
              </div>
            )}

            {calibrate.step === 3 && (
              <div>
                <p>Distance between points (ft):</p>
                <input
                  type="number"
                  value={calibrate.distance}
                  onChange={(e) => setCalibrate({ ...calibrate, distance: e.target.value })}
                  style={{ width: 80 }}
                />
                <button onClick={applyCalibration}>Set</button>
              </div>
            )}

            <div className={styles.toolGroup}>
              <h4>Fixtures</h4>
              {FIXTURE_TOOLS.map((t) => (
                <button
                  key={t.name}
                  className={`${styles.toolButton} ${tool === t ? styles.active : ''}`}
                  onClick={() => setTool(t)}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <div className={styles.toolGroup}>
              <h4>Pipes</h4>
              {PIPE_TOOLS.map((t) => (
                <button
                  key={`${t.name}-${t.size}`}
                  className={`${styles.toolButton} ${tool === t ? styles.active : ''}`}
                  onClick={() => setTool(t)}
                >
                  {t.name} {t.size}
                </button>
              ))}
            </div>

            {current && (
              <button 
                className={styles.importButton} 
                onClick={handleAutoScan} 
                disabled={isScanning || loading}
                style={{ background: '#7e22ce', marginBottom: '1rem' }}
              >
                ✨ AI Auto-Scan Page
              </button>
            )}

            <h4>Takeoff ({takeoff.length})</h4>
            <ul className={styles.takeoffList}>
              {takeoff.map((it) => (
                <li key={it.id}>
                  <span>
                    {it.name} {it.size} — {it.qty} {it.unit}
                  </span>
                  <button onClick={() => removeItem(it.id)}>x</button>
                </li>
              ))}
            </ul>

            <button className={styles.importButton} onClick={handleImport} disabled={!takeoff.length || loading}>
              Import to Estimate
            </button>
          </div>

          <div className={styles.stage}>
            {!current && !loading && <p>Upload a PDF plan to start.</p>}
            {loading && <p>Processing...</p>}
            {current && (
              <div
                className={styles.canvasWrap}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={imageRef} src={current.url} alt={`Page ${current.page}`} draggable={false} />
                <svg className={styles.svgOverlay} viewBox={`0 0 ${current.width} ${current.height}`}>
                  {takeoff.map((it) => (
                    it.x != null && it.y != null && (
                      <circle key={it.id} cx={it.x} cy={it.y} r={6} className={styles.mark} />
                    )
                  ))}
                  {calibrate.points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={5} fill="#ff0" stroke="#000" strokeWidth={1} />
                  ))}
                  {calibrate.points.length === 2 && (
                    <line
                      x1={calibrate.points[0].x}
                      y1={calibrate.points[0].y}
                      x2={calibrate.points[1].x}
                      y2={calibrate.points[1].y}
                      stroke="#ff0"
                      strokeWidth={2}
                      strokeDasharray="4"
                    />
                  )}
                  {drag && (
                    <line
                      x1={drag.start.x}
                      y1={drag.start.y}
                      x2={drag.current.x}
                      y2={drag.current.y}
                      className={styles.dragLine}
                    />
                  )}
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
