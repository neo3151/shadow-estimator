'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useEstimate } from './EstimateContext'
import { createBrowserProjectRepository } from '../../lib/projectRepository'
import { createProject, parseProjectBackup, updateProject } from '../../lib/projectModel.mjs'

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const repository = useMemo(() => createBrowserProjectRepository(), [])
  const { items, category, autoAccessories, hydrateEstimate } = useEstimate()
  const [projects, setProjects] = useState([])
  const [activeProject, setActiveProject] = useState(null)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const restoring = useRef(false)
  const activeProjectRef = useRef(null)
  const activeProjectId = activeProject?.id

  useEffect(() => {
    activeProjectRef.current = activeProject
  }, [activeProject])

  const refreshProjects = useCallback(async () => {
    const next = await repository.list()
    setProjects(next)
    return next
  }, [repository])

  const openProject = useCallback(async (id) => {
    const project = await repository.get(id)
    if (!project) return null
    restoring.current = true
    activeProjectRef.current = project
    setActiveProject(project)
    setSaveError('')
    hydrateEstimate(project.estimate)
    await repository.setActiveId(project.id)
    setTimeout(() => {
      restoring.current = false
    }, 0)
    return project
  }, [hydrateEstimate, repository])

  useEffect(() => {
    let cancelled = false
    async function initialize() {
      try {
        let nextProjects = await repository.list()
        if (!nextProjects.length) {
          const starter = createProject({ name: 'First Electrical Estimate', trade: 'Electrical' })
          await repository.save(starter)
          nextProjects = [starter]
        }
        const activeId = await repository.getActiveId()
        const selected = nextProjects.find((project) => project.id === activeId) || nextProjects.find((project) => project.status === 'active') || nextProjects[0]
        if (cancelled) return
        setProjects(nextProjects)
        await openProject(selected.id)
      } catch (err) {
        if (!cancelled) setSaveError(err.message)
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    initialize()
    return () => {
      cancelled = true
    }
  }, [openProject, repository])

  useEffect(() => {
    if (!ready || !activeProjectRef.current || restoring.current) return
    const timeout = setTimeout(async () => {
      setSaving(true)
      setSaveError('')
      try {
        const saved = updateProject(activeProjectRef.current, {
          estimate: { items, category, autoAccessories },
        })
        await repository.save(saved)
        activeProjectRef.current = saved
        setActiveProject(saved)
        setLastSavedAt(saved.updatedAt)
        await refreshProjects()
      } catch (err) {
        setSaveError(err.message)
      } finally {
        setSaving(false)
      }
    }, 600)
    return () => clearTimeout(timeout)
  }, [activeProjectId, autoAccessories, category, items, ready, refreshProjects, repository])

  const createNewProject = useCallback(async (metadata = {}) => {
    const project = createProject(metadata)
    await repository.save(project)
    await refreshProjects()
    await openProject(project.id)
    return project
  }, [openProject, refreshProjects, repository])

  const updateActiveProject = useCallback(async (changes) => {
    if (!activeProject) return null
    const updated = updateProject(activeProject, changes)
    await repository.save(updated)
    activeProjectRef.current = updated
    setActiveProject(updated)
    setSaveError('')
    setLastSavedAt(updated.updatedAt)
    await refreshProjects()
    return updated
  }, [activeProject, refreshProjects, repository])

  const archiveProject = useCallback(async (id, archived = true) => {
    const project = await repository.get(id)
    if (!project) return
    const updated = updateProject(project, { status: archived ? 'archived' : 'active' })
    await repository.save(updated)
    if (activeProject?.id === id) setActiveProject(updated)
    await refreshProjects()
  }, [activeProject?.id, refreshProjects, repository])

  const deleteProject = useCallback(async (id) => {
    await repository.remove(id)
    let remaining = await refreshProjects()
    if (!remaining.length) {
      const replacement = createProject({ name: 'Untitled MEP Project', trade: 'MEP' })
      await repository.save(replacement)
      remaining = await refreshProjects()
    }
    if (activeProject?.id === id) await openProject(remaining[0].id)
  }, [activeProject?.id, openProject, refreshProjects, repository])

  const importProject = useCallback(async (backup) => {
    const project = parseProjectBackup(backup)
    await repository.save(project)
    await refreshProjects()
    await openProject(project.id)
    return project
  }, [openProject, refreshProjects, repository])

  const value = {
    projects,
    activeProject,
    ready,
    saving,
    saveError,
    lastSavedAt,
    createNewProject,
    openProject,
    updateActiveProject,
    archiveProject,
    deleteProject,
    importProject,
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) throw new Error('useProject must be used within a ProjectProvider')
  return context
}
