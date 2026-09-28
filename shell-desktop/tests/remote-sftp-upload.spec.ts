import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DESKTOP_REMOTE_PATHS, apply } from '../src/remote.ts'

function makeContext() {
  const routes = new Map<string, (req: unknown, res: unknown) => void>()
  const ctx = {
    effect: (factory: () => unknown) => factory(),
    logger: { info: () => {}, warn: () => {} },
    webServer: {
      port: 43120,
      register: (entry: { path: string; handler: (req: unknown, res: unknown) => void }) => {
        routes.set(entry.path, entry.handler)
        return () => {}
      },
    },
    tools: { register: () => () => {} },
    get: () => undefined,
    on: () => () => {},
  }
  apply(ctx as never, { aishell: false } as never)
  return { routes }
}

function uploadRequest(query: string, method = 'POST'): IncomingMessage {
  const req = Readable.from([Buffer.from('abc')]) as IncomingMessage
  req.method = method
  req.url = `${DESKTOP_REMOTE_PATHS.sftpUpload}?${query}`
  req.headers = { origin: 'http://127.0.0.1:43120', 'content-type': 'application/octet-stream' }
  ;(req as unknown as { socket: { remoteAddress: string } }).socket = { remoteAddress: '127.0.0.1' }
  return req
}

function fakeResponse() {
  const res = {
    statusCode: 200,
    body: '',
    setHeader: vi.fn(),
    end: vi.fn((body?: string) => { res.body = body ?? '' }),
  }
  return res as unknown as ServerResponse & typeof res
}

const homes: string[] = []
let previousHome: string | undefined

beforeEach(() => { previousHome = process.env.DSH_HOME })

afterEach(() => {
  if (previousHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = previousHome
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
  vi.restoreAllMocks()
})

/** Point DSH_HOME at a throwaway home holding one saved host. */
function tempHostHome(): void {
  const home = mkdtempSync(join(tmpdir(), 'dsh-upload-home-'))
  homes.push(home)
  mkdirSync(join(home, 'remote'), { recursive: true })
  writeFileSync(join(home, 'remote', 'hosts.json'), JSON.stringify([
    { id: 'h-1', name: 'A', host: '10.0.0.1', port: 22, username: 'root', authType: 'password', password: 'x' },
  ]))
  process.env.DSH_HOME = home
}

describe('sftp upload route', () => {
  it('rejects a caller without the renderer origin', async () => {
    const { routes } = makeContext()
    const res = fakeResponse()
    const req = uploadRequest('hostId=h-1&path=%2Ftmp%2Fa.txt')
    req.headers.origin = 'http://evil.example'

    routes.get(DESKTOP_REMOTE_PATHS.sftpUpload)?.(req, res)

    await vi.waitFor(() => { expect(res.statusCode).toBe(403) })
    expect(JSON.parse(res.body)).toEqual({ error: 'forbidden' })
  })

  it('rejects a non-POST method', async () => {
    const { routes } = makeContext()
    const res = fakeResponse()

    routes.get(DESKTOP_REMOTE_PATHS.sftpUpload)?.(uploadRequest('hostId=h-1&path=%2Ftmp%2Fa.txt', 'GET'), res)

    await vi.waitFor(() => { expect(res.statusCode).toBe(405) })
  })

  it('rejects an unknown host before touching SFTP', async () => {
    tempHostHome()
    const { routes } = makeContext()
    const res = fakeResponse()

    routes.get(DESKTOP_REMOTE_PATHS.sftpUpload)?.(uploadRequest('hostId=missing&path=%2Ftmp%2Fa.txt'), res)

    await vi.waitFor(() => { expect(res.statusCode).toBe(400) })
    expect(JSON.parse(res.body)).toEqual({ error: 'unknown host' })
  })

  it('requires a remote path once the host is known', async () => {
    tempHostHome()
    const { routes } = makeContext()
    const res = fakeResponse()

    routes.get(DESKTOP_REMOTE_PATHS.sftpUpload)?.(uploadRequest('hostId=h-1&path='), res)

    await vi.waitFor(() => { expect(res.statusCode).toBe(400) })
    expect(JSON.parse(res.body)).toEqual({ error: 'path is required' })
  })
})
