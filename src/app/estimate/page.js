'use client'

import { Plus } from 'lucide-react'
import { useEstimate } from '../context/EstimateContext'
import TakeoffViewer from '../../components/TakeoffViewer'
import EstimateTable from '../../components/EstimateTable'
import { formatCurrency } from '../../lib/utils'
import styles from './estimate.module.css'

export default function EstimatePage() {
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
  } = useEstimate()

  return (
    <div className={styles.container}>
      {/* Left Pane: Takeoff */}
      <div className={styles.pane}>
        <div className={styles.paneHeader}>
          <h2>PDF Takeoff Viewer</h2>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <TakeoffViewer 
            category={category}
            autoAccessories={autoAccessories}
            onImport={importTakeoff}
            onClose={() => {}} // Not a modal anymore
          />
        </div>
      </div>

      {/* Right Pane: Estimate Table */}
      <div className={styles.pane}>
        <div className={styles.paneHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Material Estimate</h2>
          <button className={styles.button} onClick={() => addManualItem()}>
            <Plus size={16} /> Add Custom Item
          </button>
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
            <span className={styles.totalsLabel}>Labor</span>
            <span className={styles.totalsValue}>{formatCurrency(totals.laborTotal)}</span>
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
    </div>
  )
}
