'use client'

import { useRef } from 'react'
import styles from './EstimateToolbar.module.css'

const CATEGORIES = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Concrete',
  'Masonry',
  'Drywall',
  'Paint',
  'Roofing',
  'Flooring',
  'Insulation',
  'General',
]

export default function EstimateToolbar({
  category,
  onCategoryChange,
  autoAccessories,
  onAutoAccessoriesChange,
  onUpload,
  onClear,
  onPrint,
}) {
  const fileInputRef = useRef(null)

  return (
    <div className={`${styles.toolbar} no-print`}>
      <label className={styles.field}>
        Category:
        <select value={category} onChange={(e) => onCategoryChange(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <input
          type="checkbox"
          checked={autoAccessories}
          onChange={(e) => onAutoAccessoriesChange(e.target.checked)}
        />
        Auto-Include Installation Accessories
      </label>

      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            onUpload(file)
            e.target.value = ''
          }
        }}
        className={styles.hidden}
      />

      <button type="button" onClick={() => fileInputRef.current?.click()}>
        Upload JSON
      </button>
      <button type="button" onClick={onClear}>
        Clear
      </button>
      <button type="button" onClick={onPrint}>
        Print Quote
      </button>
    </div>
  )
}
