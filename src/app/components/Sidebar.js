'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LayoutDashboard, FileSpreadsheet, Box, FolderKanban, Menu, X } from 'lucide-react'
import styles from '../layout.module.css'

export default function Sidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)

  const links = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Estimator', href: '/estimate', icon: FileSpreadsheet },
    { name: 'Catalog', href: '/catalog', icon: Box },
  ]

  return (
    <aside className={`${styles.sidebar} ${expanded ? styles.sidebarExpanded : styles.sidebarCollapsed}`}>
      <div className={styles.sidebarHeader}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setExpanded((open) => !open)}
          aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
          aria-expanded={expanded}
          title={expanded ? 'Collapse navigation' : 'Expand navigation'}
        >
          {expanded ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className={styles.logo}>
          <Box size={24} color="var(--accent-primary)" />
          {expanded && <span className={styles.logoName}>Shadow<span>Estimator</span></span>}
        </div>
      </div>
      <nav className={styles.nav} aria-label="Primary navigation">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              title={!expanded ? link.name : undefined}
            >
              <Icon size={20} />
              {expanded && <span>{link.name}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
