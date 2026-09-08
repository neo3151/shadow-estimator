'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { autoscanItemToPixel } from '../lib/autoscanCoordinates.mjs'
import styles from './TakeoffViewer.module.css'

const FIXTURE_TOOLS = [
  // Outlets & Receptacles
  { type: 'fixture', name: 'Duplex Receptacle 20A', category: 'Branch Power' },
  { type: 'fixture', name: 'GFCI Outlet 20A', category: 'Branch Power' },
  { type: 'fixture', name: 'Quad Receptacle', category: 'Branch Power' },
  { type: 'fixture', name: 'Dedicated 240V Receptacle', category: 'Branch Power' },
  { type: 'fixture', name: 'Floor Box Receptacle', category: 'Branch Power' },
  { type: 'fixture', name: 'USB Charger Outlet', category: 'Branch Power' },
  { type: 'fixture', name: 'Weatherproof Exterior Outlet', category: 'Branch Power' },

  // Switches & Controls
  { type: 'fixture', name: 'Single Pole Switch', category: 'Controls & Devices' },
  { type: 'fixture', name: '3-Way Switch', category: 'Controls & Devices' },
  { type: 'fixture', name: '4-Way Switch', category: 'Controls & Devices' },
  { type: 'fixture', name: 'Dimmer Switch', category: 'Controls & Devices' },
  { type: 'fixture', name: 'Occupancy / Motion Sensor', category: 'Controls & Devices' },
  { type: 'fixture', name: 'Smart Timer Switch', category: 'Controls & Devices' },

  // Lighting Fixtures
  { type: 'fixture', name: '2x4 LED Lay-In Troffer', category: 'Lighting Fixtures' },
  { type: 'fixture', name: '2x2 LED Lay-In Troffer', category: 'Lighting Fixtures' },
  { type: 'fixture', name: 'Recessed Downlight (Can)', category: 'Lighting Fixtures' },
  { type: 'fixture', name: 'High-Bay LED Fixture', category: 'Lighting Fixtures' },
  { type: 'fixture', name: 'LED Strip / Linear Light', category: 'Lighting Fixtures' },
  { type: 'fixture', name: 'Exterior Wall Pack', category: 'Lighting Fixtures' },
  { type: 'fixture', name: 'Emergency Exit Sign Combo', category: 'Lighting Fixtures' },
  { type: 'fixture', name: 'Track Light Head', category: 'Lighting Fixtures' },

  // Power & Distribution Gear
  { type: 'fixture', name: 'Main Distribution Panel (200A)', category: 'Distribution & Gear' },
  { type: 'fixture', name: 'Sub-Panel (100A)', category: 'Distribution & Gear' },
  { type: 'fixture', name: 'Safety Disconnect Switch', category: 'Distribution & Gear' },
  { type: 'fixture', name: 'Dry-Type Transformer', category: 'Distribution & Gear' },
  { type: 'fixture', name: 'Meter Socket Base', category: 'Distribution & Gear' },
  { type: 'fixture', name: 'Junction / Pull Box (J-Box)', category: 'Distribution & Gear' },

  // Fire Alarm & Low Voltage
  { type: 'fixture', name: 'Smoke Detector', category: 'Fire Alarm' },
  { type: 'fixture', name: 'Fire Alarm Horn / Strobe', category: 'Fire Alarm' },
  { type: 'fixture', name: 'Manual Pull Station', category: 'Fire Alarm' },
  { type: 'fixture', name: 'Data / Ethernet Drop (RJ45)', category: 'Low Voltage' },
]

const PIPE_TOOLS = [
  { type: 'pipe', name: 'EMT Conduit', size: '1/2 inch' },
  { type: 'pipe', name: 'EMT Conduit', size: '3/4 inch' },
  { type: 'pipe', name: 'EMT Conduit', size: '1 inch' },
  { type: 'pipe', name: 'PVC Conduit Sch 40', size: '3/4 inch' },
  { type: 'pipe', name: 'PVC Conduit Sch 40', size: '1 inch' },
  { type: 'pipe', name: 'MC Cable (Armor Clad)', size: '12/2' },
  { type: 'pipe', name: 'MC Cable (Armor Clad)', size: '10/2' },
  { type: 'pipe', name: 'NM-B Romex Wire', size: '14/2' },
  { type: 'pipe', name: 'NM-B Romex Wire', size: '12/2' },
]

const REVIEW_CATEGORIES = ['Branch Power', 'Controls & Devices', 'Lighting Fixtures', 'Distribution & Gear', 'Fire Alarm', 'Low Voltage', 'Conduit & Wire']

function toImagePoint(img, clientX, clientY, srcWidth, srcHeight) {
  const rect = img.getBoundingClientRect()
  const x = (clientX - rect.left) * (srcWidth / rect.width)
  const y = (clientY - rect.top) * (srcHeight / rect.height)
  return { x, y }
}

function createTakeoffId() {
  return crypto.randomUUID()
}

function markerClassName(item) {
  if (item.reviewStatus === 'rejected') return `${styles.mark} ${styles.rejectedMark}`
  if (item.reviewStatus === 'accepted') return `${styles.mark} ${styles.acceptedMark}`
  if (String(item.source).startsWith('smart-')) {
    return `${styles.mark} ${Number(item.confidence) < 0.6 ? styles.lowConfidenceMark : styles.pendingMark}`
  }
  return `${styles.mark} ${item.source === 'manual' ? styles.manualMark : styles.advancedMark}`
}

export default function TakeoffViewer({ category, autoAccessories, onImport, onClose }) {
  const [pages, setPages] = useState([])
  const [session, setSession] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState('info')

  const [tool, setTool] = useState(FIXTURE_TOOLS[0])
  const [takeoff, setTakeoff] = useState([])
  const [isScanning, setIsScanning] = useState(false)
  const [isSmartScanning, setIsSmartScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(null)
  const [documentsByPage, setDocumentsByPage] = useState({})
  const [ocrResultsByPage, setOcrResultsByPage] = useState({})

  const [calibrate, setCalibrate] = useState({ step: 0, points: [], distance: '' })
  const [pixelsPerFoot, setPixelsPerFoot] = useState(null)
  const [sidebarPosition, setSidebarPosition] = useState('left')

  useEffect(() => {
    const saved = localStorage.getItem('shadow_estimator_sidebar_pos')
    if (saved) setSidebarPosition(saved)
  }, [])

  function toggleSidebarPosition() {
    setSidebarPosition((prev) => {
      const next = prev === 'left' ? 'right' : 'left'
      localStorage.setItem('shadow_estimator_sidebar_pos', next)
      return next
    })
  }

  const [drag, setDrag] = useState(null)
  const imageRef = useRef(null)

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setMessage('')
    setMessageTone('info')
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
      setSession(data.session)
      setCurrentPage(0)
      setTakeoff([])
      setDocumentsByPage({})
      setOcrResultsByPage({})
      setScanProgress(null)
      setCalibrate({ step: 0, points: [], distance: '' })
      setPixelsPerFoot(null)
      if (data.pages[0]?.pixelsPerFoot) {
        setPixelsPerFoot(data.pages[0].pixelsPerFoot)
        const scaleMessage = `Scale auto-calibrated: ${data.pages[0].scaleText || 'Detected'} (${data.pages[0].pixelsPerFoot.toFixed(1)} px/ft)`
        setMessage(data.truncated ? `${scaleMessage}. Showing ${data.truncated.shown} of ${data.truncated.total} pages.` : scaleMessage)
        setMessageTone('success')
      }
    } catch (err) {
      setMessage('Failed to convert PDF: ' + err.message)
      setMessageTone('error')
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
          id: createTakeoffId(),
          name: tool.name,
          size: tool.size,
          qty: Math.max(0.1, Math.round(feet * 10) / 10),
          unit: 'per foot',
          page: page.page,
          source: 'manual',
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
          id: createTakeoffId(),
          name: tool.name,
          qty: 1,
          size: '',
          unit: 'each',
          category: tool.category || category,
          page: page.page,
          source: 'manual',
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

  function updateTakeoffItem(id, changes) {
    setTakeoff((previous) => previous.map((item) => item.id === id ? { ...item, ...changes } : item))
  }

  function reviewItem(id, reviewStatus) {
    updateTakeoffItem(id, { reviewStatus })
  }

  function acceptAllSmartItems() {
    setTakeoff((previous) => previous.map((item) =>
      String(item.source).startsWith('smart-') && item.reviewStatus === 'pending'
        ? { ...item, reviewStatus: 'accepted' }
        : item
    ))
  }

  async function handleImport() {
    if (!importableTakeoff.length || pendingReviewCount) return
    setLoading(true)
    setMessageTone('info')
    try {
      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: importableTakeoff.map((it) => ({
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
      setMessageTone('error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAutoScan() {
    const current = pages[currentPage]
    if (!current) return
    setIsScanning(true)
    setMessageTone('info')
    setMessage('AI is scanning this page for fixtures.')
    try {
      const res = await fetch('/api/takeoff/autoscan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, page: current.page }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const newItems = (data.items || []).flatMap((item) => {
        const point = autoscanItemToPixel(item, current.width, current.height)
        if (!point) return []
        return [{
          id: createTakeoffId(),
          name: item.name,
          category: item.category || '',
          qty: 1,
          size: '',
          unit: 'each',
          page: current.page,
          source: 'autoscan',
          x: point.x,
          y: point.y,
        }]
      })
      setTakeoff((previous) => [...previous, ...newItems])
      setMessage(newItems.length ? `Auto-Scan found ${newItems.length} fixtures on page ${current.page}.` : `Auto-Scan found no fixtures on page ${current.page}.`)
      setMessageTone(newItems.length ? 'success' : 'info')
    } catch (err) {
      setMessage('Auto-Scan failed: ' + err.message)
      setMessageTone('error')
    } finally {
      setIsScanning(false)
    }
  }

  const [isOcrScanning, setIsOcrScanning] = useState(false)

  async function handleOcrInventory() {
    const current = pages[currentPage]
    if (!current) return
    setIsOcrScanning(true)
    setMessageTone('info')
    setMessage('AI OCR is reading this page.')
    try {
      const res = await fetch('/api/takeoff/ocr-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, page: current.page }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setOcrResultsByPage((previous) => ({ ...previous, [current.page]: data }))
      const newItems = (data.inventory || []).map((item) => ({
        id: createTakeoffId(),
        name: item.name,
        category: item.category || '',
        qty: item.qty,
        size: item.size || '',
        unit: item.unit || 'each',
        page: current.page,
        source: 'ocr',
      }))
      setTakeoff((previous) => [...previous, ...newItems])
      setMessage(newItems.length ? `OCR recognized ${newItems.length} inventory rows on page ${current.page}.` : `OCR found no inventory on page ${current.page}.`)
      setMessageTone(newItems.length ? 'success' : 'info')
    } catch (err) {
      setMessage('OCR Scan failed: ' + err.message)
      setMessageTone('error')
    } finally {
      setIsOcrScanning(false)
    }
  }

  async function requestSmartScan(pageData) {
    const res = await fetch('/api/takeoff/smart-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, page: pageData.page }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)

    const items = (data.items || []).map((item) => {
      const point = item.x == null ? null : autoscanItemToPixel(item, pageData.width, pageData.height)
      return {
        ...item,
        id: createTakeoffId(),
        ...(point ? { x: point.x, y: point.y } : {}),
        page: pageData.page,
      }
    })
    setTakeoff((previous) => [
      ...previous.filter((item) => item.page !== pageData.page || !String(item.source).startsWith('smart-')),
      ...items,
    ])
    setDocumentsByPage((previous) => ({ ...previous, [pageData.page]: data.document }))
    return items.length
  }

  async function handleSmartScanPage() {
    const current = pages[currentPage]
    if (!current) return
    setIsSmartScanning(true)
    setMessageTone('info')
    setMessage(`Smart Scan is analyzing page ${current.page}.`)
    try {
      const count = await requestSmartScan(current)
      setMessage(`Smart Scan completed page ${current.page} with ${count} takeoff rows.`)
      setMessageTone('success')
    } catch (err) {
      setMessage('Smart Scan failed: ' + err.message)
      setMessageTone('error')
    } finally {
      setIsSmartScanning(false)
    }
  }

  async function handleSmartScanAll() {
    if (!pages.length) return
    setIsSmartScanning(true)
    setMessageTone('info')
    setScanProgress({ completed: 0, total: pages.length })
    const failedPages = []
    let totalItems = 0
    for (let index = 0; index < pages.length; index++) {
      const pageData = pages[index]
      setMessage(`Smart Scan is analyzing page ${pageData.page} (${index + 1} of ${pages.length}).`)
      try {
        totalItems += await requestSmartScan(pageData)
      } catch (err) {
        console.error(`Smart Scan failed on page ${pageData.page}:`, err)
        failedPages.push(pageData.page)
      }
      setScanProgress({ completed: index + 1, total: pages.length })
    }

    if (failedPages.length) {
      setMessage(`Smart Scan kept successful results, but failed on page${failedPages.length > 1 ? 's' : ''} ${failedPages.join(', ')}.`)
      setMessageTone('error')
    } else {
      setMessage(`Smart Scan completed ${pages.length} pages with ${totalItems} takeoff rows.`)
      setMessageTone('success')
    }
    setIsSmartScanning(false)
  }

  function changePage(index) {
    setCurrentPage(Math.min(pages.length - 1, Math.max(0, index)))
    setDrag(null)
    setCalibrate({ step: 0, points: [], distance: '' })
  }

  const current = pages[currentPage]
  const currentDocument = current ? documentsByPage[current.page] || ocrResultsByPage[current.page] : null
  const currentTakeoff = current ? takeoff.filter((item) => item.page === current.page) : []
  const smartItems = takeoff.filter((item) => String(item.source).startsWith('smart-'))
  const pendingReviewCount = smartItems.filter((item) => item.reviewStatus === 'pending').length
  const acceptedReviewCount = smartItems.filter((item) => item.reviewStatus === 'accepted').length
  const rejectedReviewCount = smartItems.filter((item) => item.reviewStatus === 'rejected').length
  const importableTakeoff = takeoff.filter((item) => !String(item.source).startsWith('smart-') || item.reviewStatus === 'accepted')
  const isBusy = loading || isScanning || isOcrScanning || isSmartScanning

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>

        <div className={`${styles.body} ${sidebarPosition === 'right' ? styles.bodyRight : ''}`}>
          <div className={`${styles.sidebar} ${sidebarPosition === 'right' ? styles.sidebarRight : ''}`}>
            <div className={styles.sidebarHeaderControls}>
              <button
                type="button"
                className={styles.sidebarSwapBtn}
                onClick={toggleSidebarPosition}
                title={`Move tool sidebar to ${sidebarPosition === 'left' ? 'right' : 'left'}`}
              >
                <ArrowLeftRight size={12} /> Sidebar: {sidebarPosition === 'left' ? 'Left' : 'Right'}
              </button>
            </div>
            <input type="file" accept="application/pdf" onChange={handleUpload} />

            {message && <p className={`${styles.status} ${styles[messageTone]}`}>{message}</p>}
            {scanProgress && isSmartScanning && (
              <progress className={styles.progress} value={scanProgress.completed} max={scanProgress.total}>
                {scanProgress.completed} of {scanProgress.total}
              </progress>
            )}

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
              <div className={styles.calibrateSection}>
                <p>Distance between points (ft):</p>
                <input
                  type="number"
                  value={calibrate.distance}
                  onChange={(e) => setCalibrate({ ...calibrate, distance: e.target.value })}
                  className={styles.calibrateInput}
                />
                <button onClick={applyCalibration} className={styles.calibrateSetButton}>Set</button>
              </div>
            )}

            <div className={styles.toolGroup}>
              {['Branch Power', 'Controls & Devices', 'Lighting Fixtures', 'Distribution & Gear', 'Fire Alarm', 'Low Voltage'].map((cat, catIdx) => {
                const tools = FIXTURE_TOOLS.filter(t => t.category === cat)
                if (!tools.length) return null
                return (
                  <div key={cat} style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.28rem' }}>
                    <h4 style={catIdx > 0 ? { marginTop: '0.75rem', gridColumn: '1 / -1' } : { gridColumn: '1 / -1' }}>{cat}</h4>
                    {tools.map((t) => (
                      <button
                        key={t.name}
                        className={`${styles.toolButton} ${tool === t ? styles.active : ''}`}
                        onClick={() => setTool(t)}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>

            <div className={styles.toolGroup}>
              <h4>Conduit & Wire (Linear)</h4>
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
              <div className={styles.scanActions}>
                <button className={styles.smartScanButton} onClick={handleSmartScanPage} disabled={isBusy}>
                  {isSmartScanning ? 'Smart Scan running...' : 'Smart Scan Page'}
                </button>
                <button className={styles.scanAllButton} onClick={handleSmartScanAll} disabled={isBusy || pages.length < 2}>
                  Smart Scan All
                </button>
                <details className={styles.advancedActions}>
                  <summary>Advanced scan options</summary>
                  <button onClick={handleAutoScan} disabled={isBusy}>
                    {isScanning ? 'Scanning fixtures...' : 'Auto-Scan Page'}
                  </button>
                  <button onClick={handleOcrInventory} disabled={isBusy}>
                    {isOcrScanning ? 'Reading text...' : 'OCR Inventory Page'}
                  </button>
                </details>
              </div>
            )}

            {currentDocument && (
              <div className={styles.documentInfo}>
                <h5>Page {current.page} drawing details</h5>
                {currentDocument.title && <p><strong>Title:</strong> {currentDocument.title}</p>}
                {currentDocument.scale && <p><strong>Scale:</strong> {currentDocument.scale}</p>}
                {currentDocument.rooms?.length > 0 && <p><strong>Rooms:</strong> {currentDocument.rooms.join(', ')}</p>}
                {currentDocument.notes?.length > 0 && (
                  <ul>
                    {currentDocument.notes.map((note, index) => <li key={index}>{note}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className={styles.takeoffHeader}>
              <h4>Takeoff ({takeoff.length})</h4>
              {pendingReviewCount > 0 && <button onClick={acceptAllSmartItems}>Accept all</button>}
            </div>
            {smartItems.length > 0 && (
              <div className={styles.reviewSummary}>
                <span>{pendingReviewCount} pending</span>
                <span>{acceptedReviewCount} accepted</span>
                <span>{rejectedReviewCount} rejected</span>
              </div>
            )}
            <ul className={styles.takeoffList}>
              {takeoff.map((item) => {
                const isSmartItem = String(item.source).startsWith('smart-')
                return (
                  <li key={item.id} className={isSmartItem ? styles.reviewItem : ''} data-review-status={item.reviewStatus}>
                    <div className={styles.itemHeading}>
                      <span className={styles.pageBadge}>P{item.page}</span>
                      {item.category && <span className={styles.categoryBadge}>[{item.category}]</span>}
                      {isSmartItem && <span className={styles.confidenceBadge}>{Math.round((item.confidence ?? 0.5) * 100)}% confidence</span>}
                    </div>
                    {isSmartItem ? (
                      <>
                        <div className={styles.reviewFields}>
                          <input
                            aria-label="Item name"
                            value={item.name}
                            onChange={(event) => updateTakeoffItem(item.id, { name: event.target.value })}
                          />
                          <select
                            aria-label="Item category"
                            value={item.category}
                            onChange={(event) => updateTakeoffItem(item.id, { category: event.target.value })}
                          >
                            {!REVIEW_CATEGORIES.includes(item.category) && <option>{item.category}</option>}
                            {REVIEW_CATEGORIES.map((reviewCategory) => <option key={reviewCategory}>{reviewCategory}</option>)}
                          </select>
                          <input
                            aria-label="Item quantity"
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={item.qty}
                            onChange={(event) => updateTakeoffItem(item.id, { qty: Math.max(0.1, Number(event.target.value) || 0.1) })}
                          />
                        </div>
                        <div className={styles.reviewActions}>
                          <button onClick={() => reviewItem(item.id, 'accepted')} disabled={item.reviewStatus === 'accepted'}>Accept</button>
                          <button onClick={() => reviewItem(item.id, 'rejected')} disabled={item.reviewStatus === 'rejected'}>Reject</button>
                          <button onClick={() => removeItem(item.id)}>Delete</button>
                        </div>
                      </>
                    ) : (
                      <div className={styles.standardItem}>
                        <span>{item.name} {item.size} — {item.qty} {item.unit}</span>
                        <button onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>×</button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            {pendingReviewCount > 0 && <p className={styles.reviewNotice}>Review or accept all AI findings before import.</p>}
            <button className={styles.importButton} onClick={handleImport} disabled={!importableTakeoff.length || pendingReviewCount > 0 || isBusy}>
              Import {importableTakeoff.length} Item{importableTakeoff.length === 1 ? '' : 's'} to Estimate
            </button>
          </div>

          <div className={styles.stage}>
            {!current && !loading && <p>Upload a PDF plan to start.</p>}
            {loading && <p>Processing...</p>}
            {current && (
              <>
                <div className={styles.pageNavigation}>
                  <button onClick={() => changePage(currentPage - 1)} disabled={currentPage === 0 || isBusy}>Previous</button>
                  <span>Page {currentPage + 1} of {pages.length}</span>
                  <button onClick={() => changePage(currentPage + 1)} disabled={currentPage === pages.length - 1 || isBusy}>Next</button>
                </div>
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
                    {currentTakeoff.map((it) => (
                      it.x != null && it.y != null && (
                        <circle key={it.id} cx={it.x} cy={it.y} r={6} className={markerClassName(it)} />
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
