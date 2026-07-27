'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import styles from '../layout.module.css'

export default function ThemeWrapper({ children }) {
  const pathname = usePathname()
  const isDark = pathname === '/estimate'

  return (
    <div className={isDark ? 'dark-theme' : ''} style={{ height: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className={styles.layout}>
        <Sidebar />
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  )
}
