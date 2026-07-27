'use client'

import { formatCurrency } from '../lib/utils'
import styles from './SearchField.module.css'

export default function SearchField({ search, onSearchChange, results, onSelect }) {
  return (
    <div className={`${styles.wrapper} no-print`}>
      <input
        type="text"
        placeholder="Search catalog..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className={styles.input}
      />
      {results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map((it) => (
            <button
              key={it.id}
              type="button"
              className={styles.item}
              onClick={() => onSelect(it)}
            >
              {it.item_name} {it.size ? `(${it.size})` : ''} — {formatCurrency(it.estimated_price_usd)} — {it.category}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
