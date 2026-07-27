'use client'

import { formatCurrency } from '../lib/utils'
import styles from './EstimateTable.module.css'

function EstimateRow({ item, index, onUpdateQty, onUpdatePrice, onUpdateLabor, onDelete }) {
  return (
    <tr className={styles.row}>
      <td className={styles.cell}>
        {item.name}
        {item.manual && <span className={styles.manual}>(manual)</span>}
      </td>
      <td className={styles.cell}>{item.size}</td>
      <td className={styles.cell}>{item.unit}</td>
      <td className={`${styles.cell} ${styles.number}`}>
        <input
          type="number"
          min="0"
          value={item.qty}
          onChange={(e) => onUpdateQty(index, e.target.value)}
          className="no-print"
        />
        <span className="print-only" style={{ display: 'none' }}>
          {item.qty}
        </span>
      </td>
      <td className={`${styles.cell} ${styles.number}`}>
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.price}
          onChange={(e) => onUpdatePrice(index, e.target.value)}
          className="no-print"
        />
        <span className="print-only" style={{ display: 'none' }}>
          {formatCurrency(item.price)}
        </span>
      </td>
      <td className={`${styles.cell} ${styles.number}`}>
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.labor}
          onChange={(e) => onUpdateLabor(index, e.target.value)}
          className="no-print"
        />
        <span className="print-only" style={{ display: 'none' }}>
          {item.labor}
        </span>
      </td>
      <td className={`${styles.cell} ${styles.number}`}>{formatCurrency(item.total)}</td>
      <td className={`${styles.cell} no-print`}>
        <button type="button" onClick={() => onDelete(index)}>
          Remove
        </button>
      </td>
    </tr>
  )
}

export default function EstimateTable({ items, onUpdateQty, onUpdatePrice, onUpdateLabor, onDelete }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Item</th>
          <th>Size</th>
          <th>Unit</th>
          <th className={styles.number}>Qty</th>
          <th className={styles.number}>Unit Price</th>
          <th className={styles.number}>Labor Hrs</th>
          <th className={styles.number}>Total</th>
          <th className="no-print">Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <EstimateRow
            key={index}
            item={item}
            index={index}
            onUpdateQty={onUpdateQty}
            onUpdatePrice={onUpdatePrice}
            onUpdateLabor={onUpdateLabor}
            onDelete={onDelete}
          />
        ))}
      </tbody>
    </table>
  )
}
