'use client'

import Link from 'next/link'
import { ArrowRight, Box, Database, FileSpreadsheet, Sparkles, Zap } from 'lucide-react'
import { useEstimate } from './context/EstimateContext'
import styles from './page.module.css'

export default function Dashboard() {
  const { items } = useEstimate()

  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}><Sparkles size={14} /> Dedicated Electrical Takeoff & Estimating</div>
          <h1>From electrical blueprint to <span>build-ready estimate.</span></h1>
          <p>Scan power & lighting plans, detect receptacles, switches & panel gear, calculate conduit footage, and price electrical bids in one focused workspace.</p>
          <div className={styles.heroActions}>
            <Link href="/estimate" className={styles.primaryAction}>Open Estimator <ArrowRight size={17} /></Link>
            <Link href="/catalog" className={styles.secondaryAction}>Explore Catalog</Link>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.visualTopline}>
            <span>Active workspace</span>
            <span className={styles.liveBadge}>Ready</span>
          </div>
          <div className={styles.visualMetric}>
            <span>Estimate items</span>
            <strong>{items.length.toString().padStart(2, '0')}</strong>
          </div>
          <div className={styles.visualBars}>
            <span style={{ '--bar-width': '78%' }} />
            <span style={{ '--bar-width': '58%' }} />
            <span style={{ '--bar-width': '88%' }} />
          </div>
          <div className={styles.visualFooter}><Zap size={15} /> Smart dependencies enabled</div>
        </div>
      </section>

      <section className={styles.metrics}>
        <div><Database size={18} /><strong>50</strong><span>electrical SKUs</span></div>
        <div><Sparkles size={18} /><strong>AI-assisted</strong><span>plan takeoff</span></div>
        <div><Zap size={18} /><strong>Automatic</strong><span>accessory rules</span></div>
      </section>

      <section className={styles.workspaceSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span>Workspace</span>
            <h2>Pick up where you left off</h2>
          </div>
        </div>
        <div className={styles.cardGrid}>
          <Link href="/estimate" className={styles.workspaceCard}>
            <div className={styles.cardIcon}><FileSpreadsheet size={22} /></div>
            <div className={styles.cardContent}>
              <span className={styles.cardKicker}>Live estimate</span>
              <h3>Material Estimate</h3>
              <p>{items.length ? `${items.length} items are ready to review and price.` : 'Upload a plan or start adding materials to build your estimate.'}</p>
            </div>
            <ArrowRight className={styles.cardArrow} size={19} />
          </Link>

          <Link href="/catalog" className={styles.workspaceCard}>
            <div className={styles.cardIcon}><Box size={22} /></div>
            <div className={styles.cardContent}>
              <span className={styles.cardKicker}>Material intelligence</span>
              <h3>Electrical Catalog</h3>
              <p>Browse ~50 priced electrical materials with labor, size, and category data.</p>
            </div>
            <ArrowRight className={styles.cardArrow} size={19} />
          </Link>
        </div>
      </section>
    </div>
  )
}
