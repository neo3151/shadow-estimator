'use client'

import Link from 'next/link'
import { FileSpreadsheet, Box } from 'lucide-react'
import { useEstimate } from './context/EstimateContext'

export default function Dashboard() {
  const { items } = useEstimate()

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Welcome to Shadow Estimator</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.1rem' }}>
        The professional trade estimating tool with smart dependencies.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        <div className="glass" style={{ padding: '2rem', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'var(--accent-primary)', width: '48px', height: '48px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <FileSpreadsheet color="white" size={24} />
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Current Estimate</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', flex: 1 }}>
            You have {items.length} items in your active estimate. 
          </p>
          <Link href="/estimate" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: 'var(--accent-primary)', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '500', textAlign: 'center' }}>
            Open Estimator
          </Link>
        </div>

        <div className="glass" style={{ padding: '2rem', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#10b981', width: '48px', height: '48px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Box color="white" size={24} />
          </div>
          <h2 style={{ marginBottom: '0.5rem' }}>Materials Catalog</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', flex: 1 }}>
            Browse over 4,200 construction materials and add them to your estimate.
          </p>
          <Link href="/catalog" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: '500', textAlign: 'center' }}>
            Browse Catalog
          </Link>
        </div>

      </div>
    </div>
  )
}

