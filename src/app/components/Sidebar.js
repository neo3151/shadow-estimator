'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileSpreadsheet, Box, Settings } from 'lucide-react'
import styles from '../layout.module.css'

export default function Sidebar() {
  const pathname = usePathname()

  const links = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Estimator', href: '/estimate', icon: FileSpreadsheet },
    { name: 'Catalog', href: '/catalog', icon: Box },
    { name: 'Settings', href: '#', icon: Settings },
  ]

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <Box size={24} color="var(--accent-primary)" />
        Shadow<span>Estimator</span>
      </div>
      <nav className={styles.nav}>
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <Icon size={20} />
              {link.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
