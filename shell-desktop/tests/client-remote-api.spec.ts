import { afterEach, describe, expect, it, vi } from 'vitest'
import { remoteBridge } from '../src/client/remote-api.ts'

interface FetchCall {
  readonly url: string
  readonly body: unknown
}

function stubFetch(payload: unknown): FetchCall[] {
  const calls: FetchCall[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: { body?: string }) => {
    calls.push({ url, body: init.body === undefined ? undefined : JSON.parse(init.body) })
    return {
      ok: true,
      status: 200,
      json: async () => payload,
      text: async () => '',
    }
  }))
  return calls
}

afterEach(() => { vi.unstubAllGlobals() })

describe('remote bridge session host mapping', () => {
  it('reads the explicit session → host mapping', async () => {
    const calls = stubFetch({ sessions: { 's-1': 'h-1' } })

    await expect(remoteBridge.listSessionHosts()).resolves.toEqual({ 's-1': 'h-1' })
    expect(calls[0]!.url).toBe('/_dsh/desktop/remote/session-hosts-list')
    expect(calls[0]!.body).toEqual({})
  })

  it('records one session host association', async () => {
    const calls = stubFetch({ sessions: { 's-1': 'h-1' } })

    await expect(remoteBridge.setSessionHost('s-1', 'h-1')).resolves.toEqual({ 's-1': 'h-1' })
    expect(calls[0]!.url).toBe('/_dsh/desktop/remote/session-host-set')
    expect(calls[0]!.body).toEqual({ sessionId: 's-1', hostId: 'h-1' })
  })

  it('surfaces a bridge failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => 'boom',
    })))

    await expect(remoteBridge.listSessionHosts()).rejects.toThrow('session-hosts-list failed (500)')
  })
})

describe('remote bridge session terminal ownership', () => {
  it('reads the recorded session → terminal mapping', async () => {
    const calls = stubFetch({ sessions: { 's-1': 'local:aaaa' } })

    await expect(remoteBridge.listSessionTerminals()).resolves.toEqual({ 's-1': 'local:aaaa' })
    expect(calls[0]!.url).toBe('/_dsh/desktop/remote/session-terminal-list')
    expect(calls[0]!.body).toEqual({})
  })

  it('surfaces a bridge failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => 'boom',
    })))

    await expect(remoteBridge.listSessionTerminals()).rejects.toThrow('session-terminal-list failed (500)')
  })
})

describe('remote bridge active-terminal execution', () => {
  it('types a command into the active terminal', async () => {
    const calls = stubFetch({ sessionId: 's-1' })

    await remoteBridge.runInActiveShell('df -h')

    expect(calls[0]!.url).toBe('/_dsh/desktop/remote/shell-exec')
    expect(calls[0]!.body).toEqual({ command: 'df -h' })
  })
})

describe('remote bridge sftp upload', () => {
  it('streams the picked file to the encoded remote path', async () => {
    const calls: { url: string; method: string | undefined; body: unknown }[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: { method?: string; body?: unknown }) => {
      calls.push({ url, method: init.method, body: init.body })
      return { ok: true, status: 200, json: async () => ({ path: '/tmp/a.txt', bytes: 3 }), text: async () => '' }
    }))

    const file = new Blob(['abc'])
    await remoteBridge.sftpUpload('h-1', '/tmp/a.txt', file)

    expect(calls[0]!.url).toBe('/_dsh/desktop/remote/sftp-upload?hostId=h-1&path=%2Ftmp%2Fa.txt')
    expect(calls[0]!.method).toBe('POST')
    expect(calls[0]!.body).toBe(file)
  })

  it('surfaces an upload failure with the Host message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => 'disk full',
    })))

    await expect(remoteBridge.sftpUpload('h-1', '/tmp/a.txt', new Blob(['abc'])))
      .rejects.toThrow('sftp-upload failed (500) disk full')
  })
})
