/** Browser client for the desktop remote bridge: saved hosts and shell sessions. */

/** One saved SSH host as the Host bridge stores it. */
export interface RemoteHost {
  readonly id: string
  readonly name: string
  readonly host: string
  readonly port: number
  readonly username: string
  readonly authType: 'password' | 'privateKey'
  readonly password?: string
  readonly privateKeyPath?: string
  readonly passphrase?: string
}

/** One remote directory entry returned by the SFTP bridge. */
export interface RemoteFileItem {
  readonly name: string
  readonly path: string
  readonly directory: boolean
  readonly size: number | null
  readonly modifiedAt: number | null
}

/** Host bridge face handed to Desktop AI-Shell components. */
export interface RemoteBridgeApi {
  listHosts(): Promise<RemoteHost[]>
  saveHost(host: RemoteHost): Promise<RemoteHost[]>
  removeHost(id: string): Promise<RemoteHost[]>
  openShell(request: { hostId?: string; cols: number; rows: number }): Promise<string>
  writeShell(sessionId: string, input: string): Promise<void>
  readShell(sessionId: string): Promise<{ output: string; alive: boolean }>
  resizeShell(sessionId: string, cols: number, rows: number): Promise<void>
  closeShell(sessionId: string): Promise<void>
  /** Tell the Host bridge which terminal the user is currently viewing. */
  activateShell(sessionId: string): Promise<void>
  /** Type one command into the currently active terminal (no output wait). */
  runInActiveShell(command: string): Promise<void>
  /** List one remote directory. */
  sftpList(hostId: string, path: string): Promise<{ path: string; items: readonly RemoteFileItem[] }>
  /** Create a remote directory. */
  sftpMkdir(hostId: string, path: string): Promise<void>
  /** Delete one remote file or empty directory. */
  sftpDelete(hostId: string, path: string): Promise<void>
  /** Rename one remote entry. */
  sftpRename(hostId: string, path: string, newPath: string): Promise<void>
  /** Read one remote text file. */
  sftpRead(hostId: string, path: string): Promise<{ content: string; truncated: boolean }>
  /** The Host account's home directory, used to anchor the AI-Shell workspace. */
  hostHome(): Promise<string>
  /** Ensure the local workspace directory that groups one host's sessions. */
  ensureHostWorkspace(hostId: string): Promise<{ path: string; title: string }>
  /** Explicit AI session → host mapping recorded by the AI shell. */
  listSessionHosts(): Promise<Record<string, string>>
  /** Record that an AI session was created for a saved host. */
  setSessionHost(sessionId: string, hostId: string): Promise<Record<string, string>>
}

const ROUTE_PREFIX = '/_dsh/desktop/remote'

async function post<T>(route: string, body: object): Promise<T> {
  const response = await fetch(`${ROUTE_PREFIX}/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`remote bridge ${route} failed (${String(response.status)}) ${detail}`.trim())
  }
  return await response.json() as T
}

/** Same-origin facade over the Desktop remote bridge routes. */
export const remoteBridge: RemoteBridgeApi = {
  async listHosts(): Promise<RemoteHost[]> {
    return (await post<{ hosts: RemoteHost[] }>('hosts-list', {})).hosts
  },
  async saveHost(host: RemoteHost): Promise<RemoteHost[]> {
    return (await post<{ hosts: RemoteHost[] }>('hosts-save', { host })).hosts
  },
  async removeHost(id: string): Promise<RemoteHost[]> {
    const stub: RemoteHost = { id, name: '', host: '', port: 22, username: '', authType: 'password' }
    return (await post<{ hosts: RemoteHost[] }>('hosts-save', { host: stub, action: 'remove' })).hosts
  },
  async openShell(request): Promise<string> {
    return (await post<{ sessionId: string }>('shell-open', request)).sessionId
  },
  async writeShell(sessionId: string, input: string): Promise<void> {
    await post('shell-write', { sessionId, input })
  },
  async readShell(sessionId: string): Promise<{ output: string; alive: boolean }> {
    return await post<{ output: string; alive: boolean }>('shell-read', { sessionId })
  },
  async resizeShell(sessionId: string, cols: number, rows: number): Promise<void> {
    await post('shell-resize', { sessionId, cols, rows })
  },
  async closeShell(sessionId: string): Promise<void> {
    await post('shell-close', { sessionId })
  },
  async activateShell(sessionId: string): Promise<void> {
    await post('shell-activate', { sessionId })
  },
  async runInActiveShell(command: string): Promise<void> {
    await post('shell-exec', { command })
  },
  async sftpList(hostId: string, path: string): Promise<{ path: string; items: readonly RemoteFileItem[] }> {
    const response = await post<{ result: { path: string; items: RemoteFileItem[] } }>('sftp', { hostId, op: 'list', path })
    return { path: response.result.path, items: response.result.items }
  },
  async sftpMkdir(hostId: string, path: string): Promise<void> {
    await post('sftp', { hostId, op: 'mkdir', path })
  },
  async sftpDelete(hostId: string, path: string): Promise<void> {
    await post('sftp', { hostId, op: 'delete', path })
  },
  async sftpRename(hostId: string, path: string, newPath: string): Promise<void> {
    await post('sftp', { hostId, op: 'rename', path, newPath })
  },
  async sftpRead(hostId: string, path: string): Promise<{ content: string; truncated: boolean }> {
    const response = await post<{ result: { content: string; truncated: boolean } }>('sftp', { hostId, op: 'read', path })
    return response.result
  },
  async hostHome(): Promise<string> {
    return (await post<{ home: string }>('home', {})).home
  },
  async ensureHostWorkspace(hostId: string): Promise<{ path: string; title: string }> {
    return await post<{ path: string; title: string }>('host-workspace', { hostId })
  },
  async listSessionHosts(): Promise<Record<string, string>> {
    return (await post<{ sessions: Record<string, string> }>('session-hosts-list', {})).sessions
  },
  async setSessionHost(sessionId: string, hostId: string): Promise<Record<string, string>> {
    return (await post<{ sessions: Record<string, string> }>('session-host-set', { sessionId, hostId })).sessions
  },
}
