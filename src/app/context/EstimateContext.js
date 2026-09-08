'use client'

import React, { createContext, useCallback, useContext, useState, useMemo } from 'react'
import { TAX_RATE } from '../../lib/utils'

const EstimateContext = createContext(null)

export function EstimateProvider({ children }) {
  const [items, setItems] = useState([])
  const [autoAccessories, setAutoAccessories] = useState(true)
  const [category, setCategory] = useState('Electrical')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, it) => sum + (it.qty || 0) * (it.price || 0), 0)
    const laborTotal = items.reduce((sum, it) => sum + (it.qty || 0) * (it.labor || 0), 0)
    const tax = subtotal * TAX_RATE
    return { subtotal, laborTotal, tax, total: subtotal + tax }
  }, [items])

  async function processEstimate(nextItems = items, nextAuto = autoAccessories) {
    if (!nextItems.length) return
    setLoading(true)
    try {
      const res = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: nextItems.map((it) => ({
            name: it.name,
            qty: it.qty,
            size: it.size,
            price: it.manual ? it.price : undefined,
            labor: it.manual ? it.labor : undefined,
          })),
          category,
          autoAccessories: nextAuto,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setItems(data.items)
    } catch (err) {
      setMessage('Estimate failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function addFromCatalog(catalogItem) {
    const newItem = {
      id: catalogItem.id,
      name: catalogItem.item_name,
      size: catalogItem.size,
      unit: catalogItem.unit,
      category: catalogItem.category,
      qty: 1,
      price: Number(catalogItem.estimated_price_usd) || 0,
      labor: Number(catalogItem.labor_hours_per_unit) || 0,
      total: Number(catalogItem.estimated_price_usd) || 0,
      laborTotal: Number(catalogItem.labor_hours_per_unit) || 0,
      manual: false,
    }
    const next = [...items, newItem]
    setItems(next)
    processEstimate(next, autoAccessories)
  }

  function addManualItem(name = 'New Item') {
    const next = [...items, { name, qty: 1, price: 0, labor: 0, total: 0, laborTotal: 0, manual: true }]
    setItems(next)
  }

  function updateQty(index, qty) {
    const next = [...items]
    next[index].qty = Math.max(0, Number(qty) || 0)
    next[index].total = next[index].qty * (next[index].price || 0)
    next[index].laborTotal = next[index].qty * (next[index].labor || 0)
    setItems(next)
  }

  function updatePrice(index, price) {
    const next = [...items]
    next[index].price = Math.max(0, Number(price) || 0)
    next[index].total = next[index].qty * next[index].price
    next[index].manual = true
    setItems(next)
  }

  function updateLabor(index, labor) {
    const next = [...items]
    next[index].labor = Math.max(0, Number(labor) || 0)
    next[index].laborTotal = next[index].qty * next[index].labor
    next[index].manual = true
    setItems(next)
  }

  function deleteItem(index) {
    const next = items.filter((_, i) => i !== index)
    setItems(next)
    processEstimate(next, autoAccessories)
  }

  function handleToggleAuto(next) {
    setAutoAccessories(next)
    processEstimate(items, next)
  }

  function handleFileUpload(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result)
        const list = Array.isArray(parsed) ? parsed : [parsed]
        const next = [
          ...items,
          ...list
            .filter((it) => it.name)
            .map((it) => ({
              name: it.name,
              qty: Number(it.qty) || 1,
              price: it.price !== undefined ? Number(it.price) : undefined,
              labor: it.labor !== undefined ? Number(it.labor) : undefined,
            })),
        ]
        setItems(next)
        processEstimate(next, autoAccessories)
      } catch (err) {
        setMessage('Invalid JSON file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }
  
  function clearItems() {
    setItems([])
  }

  const hydrateEstimate = useCallback((snapshot = {}) => {
    setItems(Array.isArray(snapshot.items) ? snapshot.items : [])
    setCategory(snapshot.category || 'General')
    setAutoAccessories(snapshot.autoAccessories !== false)
    setMessage('')
  }, [])
  
  function importTakeoff(importedItems) {
    const next = [...items, ...importedItems]
    setItems(next)
    processEstimate(next, autoAccessories)
    setMessage(`Imported ${importedItems.length} items from takeoff.`)
  }

  const value = {
    items,
    totals,
    autoAccessories,
    category,
    loading,
    message,
    setCategory,
    addFromCatalog,
    addManualItem,
    updateQty,
    updatePrice,
    updateLabor,
    deleteItem,
    handleToggleAuto,
    handleFileUpload,
    clearItems,
    hydrateEstimate,
    importTakeoff,
    setMessage
  }

  return (
    <EstimateContext.Provider value={value}>
      {children}
    </EstimateContext.Provider>
  )
}

export function useEstimate() {
  const context = useContext(EstimateContext)
  if (!context) {
    throw new Error('useEstimate must be used within an EstimateProvider')
  }
  return context
}
