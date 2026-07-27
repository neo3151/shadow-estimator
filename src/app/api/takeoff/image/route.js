import { readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const session = searchParams.get('session')
    const page = searchParams.get('page')

    if (!session || !page) {
      return new Response('Missing session or page', { status: 400 })
    }

    if (!/^[\w-]+$/.test(session)) {
      return new Response('Invalid session', { status: 400 })
    }

    const path = join(tmpdir(), `takeoff-${session}`, `page-${page}.png`)
    const data = readFileSync(path)
    return new Response(data, { headers: { 'Content-Type': 'image/png' } })
  } catch (err) {
    return new Response('Image not found', { status: 404 })
  }
}
