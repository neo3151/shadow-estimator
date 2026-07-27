'use client'

import { formatCurrency, TAX_RATE } from '../lib/utils'
import styles from './TotalsPanel.module.css'

export default function TotalsPanel({ totals, loading }) {
  return (
    <div className={styles.totals}>
      <div>Subtotal: {formatCurrency(totals.subtotal)}</div>
      <div>Labor Hours: {(totals.laborTotal || 0).toFixed(2)}</div>
      <div>Tax ({(TAX_RATE * 100).toFixed(0)}%): {formatCurrency(totals.tax)}</div>
      <div className={styles.grandTotal}>Total: {formatCurrency(totals.total)}</div>
      {loading && <p>Processing...</p>}
    </div>
  )
}
