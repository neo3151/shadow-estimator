'use client'

import {
  BrickWall,
  Droplets,
  Hammer,
  House,
  Layers,
  Package,
  Paintbrush,
  Wind,
  Zap,
} from 'lucide-react'
import styles from './catalog.module.css'

const ILLUSTRATIONS = [
  {
    match: /plumb|pipe|piping|fitting|valve|water|drain|faucet|trap|copper|pvc|pex|sewer/i,
    icon: Droplets,
    label: 'Plumbing supply',
    color: '#0ea5e9',
  },
  {
    match: /electr|wire|cable|conduit|switch|outlet|breaker|panel|voltage/i,
    icon: Zap,
    label: 'Electrical material',
    color: '#f59e0b',
  },
  {
    match: /hvac|heat|vent|duct|furnace|boiler|air condition|cooling|thermostat/i,
    icon: Wind,
    label: 'HVAC equipment',
    color: '#14b8a6',
  },
  {
    match: /paint|primer|coat|varnish|lacquer|enamel|stain|sealer/i,
    icon: Paintbrush,
    label: 'Paint and coatings',
    color: '#ec4899',
  },
  {
    match: /roof|shingle|membrane|gutter|flashing|lumber|wood|timber|siding/i,
    icon: House,
    label: 'Building material',
    color: '#f97316',
  },
  {
    match: /concrete|cement|masonry|brick|stone|mortar|grout|aggregate|rebar/i,
    icon: BrickWall,
    label: 'Masonry material',
    color: '#78716c',
  },
  {
    match: /fastener|hardware|screw|bolt|nut|washer|tool|welding|steel|metal/i,
    icon: Hammer,
    label: 'Hardware and tools',
    color: '#64748b',
  },
  {
    match: /floor|flooring|tile|carpet|insulat|drywall|gypsum|sheet/i,
    icon: Layers,
    label: 'Finishing material',
    color: '#8b5cf6',
  },
]

function illustrationFor(item) {
  const text = `${item.item_name || ''} ${item.category || ''}`
  return ILLUSTRATIONS.find((illustration) => illustration.match.test(text)) || {
    icon: Package,
    label: 'Construction material',
    color: '#2563eb',
  }
}

export default function CatalogProductImage({ item }) {
  const illustration = illustrationFor(item)
  const Icon = illustration.icon

  return (
    <div
      className={styles.productImage}
      style={{ '--product-accent': illustration.color }}
      role="img"
      aria-label={`${item.item_name}: ${illustration.label}`}
    >
      <div className={styles.productImageGlow} />
      <div className={styles.productImageIcon}>
        <Icon size={42} strokeWidth={1.5} />
      </div>
      <span className={styles.productImageLabel}>{illustration.label}</span>
    </div>
  )
}
