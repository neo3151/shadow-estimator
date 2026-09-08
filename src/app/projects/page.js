'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Building2, Download, FolderOpen, FolderPlus, MapPin, Trash2, Upload } from 'lucide-react'
import { useProject } from '../context/ProjectContext'
import { downloadTextFile, safeFileName } from '../../lib/clientDownloads'
import { serializeProject } from '../../lib/projectModel.mjs'
import styles from './projects.module.css'

export default function ProjectsPage() {
  const router = useRouter()
  const importRef = useRef(null)
  const { projects, activeProject, ready, saveError, createNewProject, openProject, archiveProject, deleteProject, importProject } = useProject()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('active')
  const [form, setForm] = useState({ name: '', client: '', address: '', trade: 'MEP' })

  const visibleProjects = projects.filter((project) => project.status === filter)

  async function handleCreate(event) {
    event.preventDefault()
    const project = await createNewProject(form)
    setForm({ name: '', client: '', address: '', trade: 'MEP' })
    setShowForm(false)
    await openProject(project.id)
    router.push('/estimate')
  }

  async function handleOpen(id) {
    await openProject(id)
    router.push('/estimate')
  }

  async function handleDelete(project) {
    if (!window.confirm(`Delete “${project.name}”? This removes the browser copy of the project.`)) return
    await deleteProject(project.id)
  }

  async function handleImport(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const project = await importProject(await file.text())
      await openProject(project.id)
      router.push('/estimate')
    } catch (err) {
      window.alert(`Project import failed: ${err.message}`)
    } finally {
      event.target.value = ''
    }
  }

  if (!ready) return <div className={styles.loading}>Loading project workspace…</div>

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <span>Project workspace</span>
          <h1>Saved Estimates</h1>
          <p>Create, resume, archive, and back up MEP estimating projects.</p>
        </div>
        <div className={styles.headerActions}>
          <input ref={importRef} type="file" accept="application/json" onChange={handleImport} hidden />
          <button className={styles.secondaryButton} onClick={() => importRef.current?.click()}><Upload size={16} /> Import backup</button>
          <button className={styles.primaryButton} onClick={() => setShowForm((value) => !value)}><FolderPlus size={16} /> New project</button>
        </div>
      </header>

      {saveError && <div className={styles.storageError}>{saveError}. Export any available projects and check browser storage permissions.</div>}

      {showForm && (
        <form className={styles.projectForm} onSubmit={handleCreate}>
          <label>Project name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Riverside Medical Office" /></label>
          <label>Client<input value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} placeholder="Client or company" /></label>
          <label>Site address<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Project location" /></label>
          <label>Trade<select value={form.trade} onChange={(event) => setForm({ ...form, trade: event.target.value })}><option>Electrical</option><option>MEP</option><option>HVAC</option><option>General</option></select></label>
          <div className={styles.formActions}><button type="button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit">Create project</button></div>
        </form>
      )}

      <div className={styles.filterBar}>
        <button className={filter === 'active' ? styles.activeFilter : ''} onClick={() => setFilter('active')}>Active <span>{projects.filter((project) => project.status === 'active').length}</span></button>
        <button className={filter === 'archived' ? styles.activeFilter : ''} onClick={() => setFilter('archived')}>Archived <span>{projects.filter((project) => project.status === 'archived').length}</span></button>
      </div>

      <div className={styles.grid}>
        {visibleProjects.map((project) => (
          <article key={project.id} className={`${styles.card} ${activeProject?.id === project.id ? styles.activeCard : ''}`}>
            <div className={styles.cardTopline}><span>{project.trade}</span>{activeProject?.id === project.id && <span className={styles.currentBadge}>Current</span>}</div>
            <h2>{project.name}</h2>
            <div className={styles.metadata}>
              <span><Building2 size={14} /> {project.client || 'No client added'}</span>
              <span><MapPin size={14} /> {project.address || 'No site address'}</span>
            </div>
            <div className={styles.cardStats}>
              <div><strong>{project.estimate.items.length}</strong><span>estimate items</span></div>
              <div><strong>{new Date(project.updatedAt).toLocaleDateString()}</strong><span>last updated</span></div>
            </div>
            <div className={styles.cardActions}>
              <button className={styles.openButton} onClick={() => handleOpen(project.id)}><FolderOpen size={15} /> Open</button>
              <button title="Download JSON backup" onClick={() => downloadTextFile(`${safeFileName(project.name)}.json`, serializeProject(project), 'application/json')}><Download size={15} /></button>
              <button title={project.status === 'archived' ? 'Restore project' : 'Archive project'} onClick={() => archiveProject(project.id, project.status !== 'archived')}>{project.status === 'archived' ? <ArchiveRestore size={15} /> : <Archive size={15} />}</button>
              <button className={styles.deleteButton} title="Delete project" onClick={() => handleDelete(project)}><Trash2 size={15} /></button>
            </div>
          </article>
        ))}
        {!visibleProjects.length && <div className={styles.emptyState}><FolderOpen size={28} /><h2>No {filter} projects</h2><p>{filter === 'active' ? 'Create a project to start a durable MEP estimate.' : 'Archived projects will appear here.'}</p></div>}
      </div>
    </div>
  )
}
