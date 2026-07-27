'use client'

import { useEffect, useState, useMemo } from 'react'
import { Search, Box } from 'lucide-react'
import { useEstimate } from '../context/EstimateContext'
import { itemMatchesTrade, formatCurrency } from '../../lib/utils'
import styles from './catalog.module.css'

const TRADES = [
  'General', 'Plumbing', 'Electrical', 'HVAC', 'Concrete', 
  'Masonry', 'Drywall', 'Paint', 'Roofing', 'Flooring', 'Insulation'
]

export default function CatalogPage() {
  const [catalog, setCatalog] = useState([])
  const [search, setSearch] = useState('')
  const [activeTrade, setActiveTrade] = useState('General')
  const { addFromCatalog } = useEstimate()

  useEffect(() => {
    fetch('/data/catalog.json')
      .then((r) => r.json())
      .then(setCatalog)
      .catch((err) => console.error('Failed to load catalog:', err))
  }, [])

  const filteredCatalog = useMemo(() => {
    let filtered = catalog.filter(it => itemMatchesTrade(it, activeTrade))
    
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (it) =>
          it.item_name?.toLowerCase().includes(q) ||
          it.category?.toLowerCase().includes(q) ||
          it.size?.toLowerCase().includes(q)
      )
    }
    
    return filtered.slice(0, 50) // Limit to 50 for performance
  }, [catalog, activeTrade, search])

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Materials Catalog</h1>
        <div className={styles.searchBar}>
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Search materials, items, SKU..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <h3>Categories</h3>
          <div className={styles.categoryList}>
            {TRADES.map(trade => (
              <button
                key={trade}
                className={`${styles.categoryItem} ${activeTrade === trade ? styles.categoryItemActive : ''}`}
                onClick={() => setActiveTrade(trade)}
              >
                {trade}
              </button>
            ))}
          </div>
        </aside>

        <main>
          <div className={styles.grid}>
            {filteredCatalog.map(item => (
              <div key={item.id || item.item_name} className={styles.card}>
                <div className={styles.badge}>In Stock</div>
                <div className={styles.cardImagePlaceholder}>
                  <Box size={40} opacity={0.5} />
                </div>
                <h4 className={styles.cardTitle}>{item.item_name}</h4>
                <p className={styles.cardDesc}>
                  {item.category} • {item.size || 'Standard Size'}
                  {item.id && <><br/>SKU: {String(item.id).substring(0,8)}</>}
                </p>
                
                <div className={styles.cardFooter}>
                  <div className={styles.price}>
                    {formatCurrency(item.estimated_price_usd)}
                    <span className={styles.unit}>/{item.unit || 'ea'}</span>
                  </div>
                  <button 
                    className={styles.addButton}
                    onClick={() => {
                      addFromCatalog(item)
                      // Optional: Show a tiny toast here, but updating context is enough for now
                    }}
                  >
                    Add to Order
                  </button>
                </div>
              </div>
            ))}
            
            {filteredCatalog.length === 0 && (
              <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>
                No materials found matching your criteria.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
