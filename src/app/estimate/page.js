'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeftRight, Download, FolderKanban, GripVertical, Maximize2, Minimize2, Plus, PlusCircle, Printer, Save, Trash2 } from 'lucide-react'
import { useEstimate } from '../context/EstimateContext'
import { useProject } from '../context/ProjectContext'
import TakeoffViewer from '../../components/TakeoffViewer'
import EstimateTable from '../../components/EstimateTable'
import { downloadTextFile, safeFileName } from '../../lib/clientDownloads'
import { projectToCsv, serializeProject } from '../../lib/projectModel.mjs'
import { formatCurrency } from '../../lib/utils'
import styles from './estimate.module.css'

export default function EstimatePage() {
  const [takeoffWidth, setTakeoffWidth] = useState(50)
  const [layoutMode, setLayoutMode] = useState('split')
  const [isResizing, setIsResizing] = useState(false)
  const [isSwapped, setIsSwapped] = useState(false)
  const [projectDetails, setProjectDetails] = useState({ name: '', client: '', address: '', trade: 'Electrical' })
  const { activeProject, saving, saveError, lastSavedAt, updateActiveProject, createNewProject } = useProject()

  const {
    items,
    totals,
    category,
    autoAccessories,
    addManualItem,
    updateQty,
    updatePrice,
    updateLabor,
    deleteItem,
    importTakeoff,
    clearItems,
  } = useEstimate()

  useEffect(() => {
    const savedSwap = localStorage.getItem('shadow_estimator_panel_swapped')
    if (savedSwap !== null) {
      setIsSwapped(savedSwap === 'true')
    }
  }, [])

  function toggleSwapPanels() {
    setIsSwapped((prev) => {
      const next = !prev
      localStorage.setItem('shadow_estimator_panel_swapped', String(next))
      return next
    })
  }

  useEffect(() => {
    if (!activeProject) return
    setProjectDetails({
      name: activeProject.name,
      client: activeProject.client,
      address: activeProject.address,
      trade: activeProject.trade,
    })
  }, [activeProject])

  async function saveProjectDetails() {
    await updateActiveProject(projectDetails)
  }

  function exportProjectJson() {
    if (!activeProject) return
    downloadTextFile(`${safeFileName(activeProject.name)}.json`, serializeProject({ ...activeProject, ...projectDetails, estimate: { items, category, autoAccessories } }), 'application/json')
  }

  function exportProjectCsv() {
    if (!activeProject) return
    downloadTextFile(`${safeFileName(activeProject.name)}-estimate.csv`, projectToCsv({ ...activeProject, ...projectDetails, estimate: { items, category, autoAccessories } }), 'text/csv;charset=utf-8')
  }

  function handleResize(e) {
    if (!isResizing || layoutMode !== 'split') return
    const rect = e.currentTarget.getBoundingClientRect()
    const nextWidth = isSwapped
      ? ((rect.right - e.clientX) / rect.width) * 100
      : ((e.clientX - rect.left) / rect.width) * 100
    setTakeoffWidth(Math.min(75, Math.max(25, nextWidth)))
  }

  function togglePane(pane) {
    setLayoutMode((current) => (current === pane ? 'split' : pane))
  }

  const leftWidth = isSwapped ? (100 - takeoffWidth) : takeoffWidth
  const rightWidth = isSwapped ? takeoffWidth : (100 - takeoffWidth)

  const columns = layoutMode === 'takeoff'
    ? (isSwapped ? '0px 0px minmax(0, 1fr)' : 'minmax(0, 1fr) 0px 0px')
    : layoutMode === 'estimate'
      ? (isSwapped ? 'minmax(0, 1fr) 0px 0px' : '0px 0px minmax(0, 1fr)')
      : `${leftWidth}fr 12px ${rightWidth}fr`

  return (
    <div className={styles.workspace}>
      <header className={`${styles.projectBar} no-print`}>
        <div className={styles.projectIdentity}>
          <span>{projectDetails.trade}</span>
          <input aria-label="Project name" value={projectDetails.name} onChange={(event) => setProjectDetails({ ...projectDetails, name: event.target.value })} />
          <input aria-label="Client name" value={projectDetails.client} onChange={(event) => setProjectDetails({ ...projectDetails, client: event.target.value })} placeholder="Add client" />
        </div>
        <div className={`${styles.saveState} ${saveError ? styles.saveError : ''}`}>{saveError || (saving ? 'Saving…' : lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Autosave ready')}</div>
        <div className={styles.projectActions}>
          <button onClick={() => createNewProject({ name: 'New Electrical Project', trade: 'Electrical' })} title="Start a fresh blank electrical project"><PlusCircle size={15} /> New Project</button>
          <button onClick={clearItems} title="Clear all items in current estimate"><Trash2 size={15} /> Clear All</button>
          <button onClick={toggleSwapPanels} title="Swap left and right panels"><ArrowLeftRight size={15} /> Swap Side Panels</button>
          <button onClick={saveProjectDetails}><Save size={15} /> Save details</button>
          <button onClick={exportProjectCsv}><Download size={15} /> CSV</button>
          <button onClick={exportProjectJson}><Download size={15} /> Backup</button>
          <button onClick={() => window.print()}><Printer size={15} /> Print</button>
          <Link href="/projects"><FolderKanban size={15} /> Projects</Link>
        </div>
      </header>
      <div
        className={`${styles.container} ${isResizing ? styles.resizing : ''} no-print`}
        style={{ gridTemplateColumns: columns }}
        onPointerMove={handleResize}
        onPointerUp={() => setIsResizing(false)}
      >
      {/* Takeoff Pane Definition */}
      {(() => {
        const takeoffPane = (
          <div key="takeoff-pane" className={`${styles.pane} ${layoutMode === 'estimate' ? styles.paneHidden : ''}`}>
            <div className={styles.paneHeader}>
              <h2>PDF Takeoff Viewer</h2>
              <div className={styles.paneActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={toggleSwapPanels}
                  aria-label="Swap side panels"
                  title={isSwapped ? "Move PDF Takeoff Viewer to Left" : "Move PDF Takeoff Viewer to Right"}
                >
                  <ArrowLeftRight size={17} />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => togglePane('takeoff')}
                  aria-label={layoutMode === 'takeoff' ? 'Restore split view' : 'Maximize PDF takeoff viewer'}
                  title={layoutMode === 'takeoff' ? 'Restore split view' : 'Maximize PDF takeoff viewer'}
                >
                  {layoutMode === 'takeoff' ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <TakeoffViewer 
                category={category}
                autoAccessories={autoAccessories}
                onImport={importTakeoff}
                onClose={() => {}}
              />
            </div>
          </div>
        )

        const estimatePane = (
          <div key="estimate-pane" className={`${styles.pane} ${layoutMode === 'takeoff' ? styles.paneHidden : ''}`}>
            <div className={styles.paneHeader}>
              <h2>Material Estimate</h2>
              <div className={styles.paneActions}>
                <button className={styles.button} onClick={() => addManualItem()}>
                  <Plus size={16} /> Add Custom Item
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={toggleSwapPanels}
                  aria-label="Swap side panels"
                  title={isSwapped ? "Move Material Estimate to Right" : "Move Material Estimate to Left"}
                >
                  <ArrowLeftRight size={17} />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => togglePane('estimate')}
                  aria-label={layoutMode === 'estimate' ? 'Restore split view' : 'Maximize material estimate'}
                  title={layoutMode === 'estimate' ? 'Restore split view' : 'Maximize material estimate'}
                >
                  {layoutMode === 'estimate' ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                </button>
              </div>
            </div>
            
            <div className={styles.paneBody} style={{ padding: 0 }}>
              <div className={styles.tableContainer}>
                <EstimateTable
                  items={items}
                  onUpdateQty={updateQty}
                  onUpdatePrice={updatePrice}
                  onUpdateLabor={updateLabor}
                  onDelete={deleteItem}
                />
              </div>
            </div>

            <div className={styles.totals}>
              <div className={styles.totalsItem}>
                <span className={styles.totalsLabel}>Subtotal</span>
                <span className={styles.totalsValue}>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className={styles.totalsItem}>
                <span className={styles.totalsLabel}>Labor Hours</span>
                <span className={styles.totalsValue}>{totals.laborTotal.toFixed(2)}</span>
              </div>
              <div className={styles.totalsItem}>
                <span className={styles.totalsLabel}>Tax (7%)</span>
                <span className={styles.totalsValue}>{formatCurrency(totals.tax)}</span>
              </div>
              <div className={styles.totalsItem}>
                <span className={styles.totalsLabel}>Total Estimate</span>
                <span className={`${styles.totalsValue} ${styles.grandTotal}`}>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        )

        const handle = (
          <div
            key="resize-handle"
            className={`${styles.resizeHandle} ${layoutMode !== 'split' ? styles.resizeHandleHidden : ''}`}
            role="separator"
            aria-label="Resize takeoff and estimate panels"
            aria-valuemin="25"
            aria-valuemax="75"
            aria-valuenow={Math.round(takeoffWidth)}
            tabIndex="0"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              setIsResizing(true)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setTakeoffWidth((width) => Math.max(25, width - 5))
              if (e.key === 'ArrowRight') setTakeoffWidth((width) => Math.min(75, width + 5))
            }}
          >
            <GripVertical size={16} />
          </div>
        )

        return isSwapped ? [estimatePane, handle, takeoffPane] : [takeoffPane, handle, estimatePane]
      })()}
      </div>
      <section className={`${styles.printReport} print-only`}>
        <header>
          <div><span>Shadow Estimator</span><h1>{projectDetails.name || 'MEP Estimate'}</h1></div>
          <strong>Estimate</strong>
        </header>
        <div className={styles.reportMetadata}>
          <div><span>Client</span><strong>{projectDetails.client || 'Not specified'}</strong></div>
          <div><span>Site</span><strong>{projectDetails.address || 'Not specified'}</strong></div>
          <div><span>Trade</span><strong>{projectDetails.trade}</strong></div>
          <div><span>Date</span><strong>{new Date().toLocaleDateString()}</strong></div>
        </div>
        <table>
          <thead><tr><th>Item</th><th>Size</th><th>Unit</th><th>Qty</th><th>Unit Price</th><th>Labor Hrs</th><th>Total</th></tr></thead>
          <tbody>{items.map((item, index) => <tr key={`${item.name}-${index}`}><td>{item.name}</td><td>{item.size}</td><td>{item.unit}</td><td>{item.qty}</td><td>{formatCurrency(item.price)}</td><td>{item.labor}</td><td>{formatCurrency(item.total)}</td></tr>)}</tbody>
        </table>
        <div className={styles.reportTotals}>
          <div><span>Material subtotal</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
          <div><span>Labor hours</span><strong>{totals.laborTotal.toFixed(2)}</strong></div>
          <div><span>Tax</span><strong>{formatCurrency(totals.tax)}</strong></div>
          <div><span>Total estimate</span><strong>{formatCurrency(totals.total)}</strong></div>
        </div>
        <footer>Generated by Shadow Estimator · Pricing should be reviewed before proposal submission.</footer>
      </section>
    </div>
  )
}
