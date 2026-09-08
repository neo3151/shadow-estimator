import { normalizeProject } from './projectModel.mjs'

const PROJECTS_KEY = 'shadow-estimator.projects.v1'
const ACTIVE_PROJECT_KEY = 'shadow-estimator.active-project.v1'

function readProjects() {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(PROJECTS_KEY) || '[]')
    return Array.isArray(value) ? value.map(normalizeProject) : []
  } catch (err) {
    throw new Error(`Unable to read saved projects: ${err.message}`)
  }
}

function writeProjects(projects) {
  try {
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects.map(normalizeProject)))
  } catch (err) {
    throw new Error(`Unable to save projects: ${err.message}`)
  }
}

export function createBrowserProjectRepository() {
  return {
    async list() {
      return readProjects().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    },
    async get(id) {
      return readProjects().find((project) => project.id === id) || null
    },
    async save(project) {
      const normalized = normalizeProject(project)
      const projects = readProjects()
      const index = projects.findIndex((item) => item.id === normalized.id)
      if (index >= 0) projects[index] = normalized
      else projects.push(normalized)
      writeProjects(projects)
      return normalized
    },
    async remove(id) {
      writeProjects(readProjects().filter((project) => project.id !== id))
      if (window.localStorage.getItem(ACTIVE_PROJECT_KEY) === id) {
        window.localStorage.removeItem(ACTIVE_PROJECT_KEY)
      }
    },
    async getActiveId() {
      return window.localStorage.getItem(ACTIVE_PROJECT_KEY)
    },
    async setActiveId(id) {
      if (id) window.localStorage.setItem(ACTIVE_PROJECT_KEY, id)
      else window.localStorage.removeItem(ACTIVE_PROJECT_KEY)
    },
  }
}
