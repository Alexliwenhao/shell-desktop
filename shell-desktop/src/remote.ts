/**
 * Desktop-owned remote bridge for the AI-Shell workspace: saved SSH hosts and
 * interactive shell sessions delivered to the Desktop renderer over private
 * loopback routes.
 *
 * The browser half polls the shell routes (open/write/read/resize/close), the
 * same request/response model the WaLiSSH client used for its terminal, so no
 * WebSocket protocol is added to the Web carrier. Host records live in
 * `<DSH home>/remote/hosts.json`; credentials are stored beside the profile,
 * not in the model-visible session log.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { PERSONA_PREFIX_SECTION, PERSONA_SUFFIX_SECTION } from '@deepseek-ai/dsh-system-prompt'
import { defineTool } from '@deepseek-ai/dsh-tools'
import z from '@deepseek-ai/schemastery'
import { Client as SshClient } from 'ssh2'
import { AI_SHELL_PERSONA_PREFIX, AI_SHELL_PLAN_POLICY } from './ai-shell-persona.ts'
import { readSessionHosts, sessionHostsFile, writeSessionHosts } from './session-host-store.ts'

/** Private route prefix reserved for the AI-Shell remote bridge. */
export const DESKTOP_REMOTE_ROUTE_PREFIX = '/_dsh/desktop/remote'

/** Exact route paths served by this plugin. */
export const DESKTOP_REMOTE_PATHS = Object.freeze({
  hostsList: `${DESKTOP_REMOTE_ROUTE_PREFIX}/hosts-list`,
  hostsSave: `${DESKTOP_REMOTE_ROUTE_PREFIX}/hosts-save`,
  shellOpen: `${DESKTOP_REMOTE_ROUTE_PREFIX}/shell-open`,
  shellWrite: `${DESKTOP_REMOTE_ROUTE_PREFIX}/shell-write`,
  shellRead: `${DESKTOP_REMOTE_ROUTE_PREFIX}/shell-read`,
  shellResize: `${DESKTOP_REMOTE_ROUTE_PREFIX}/shell-resize`,
  shellClose: `${DESKTOP_REMOTE_ROUTE_PREFIX}/shell-close`,
  shellActivate: `${DESKTOP_REMOTE_ROUTE_PREFIX}/shell-activate`,
  sftp: `${DESKTOP_REMOTE_ROUTE_PREFIX}/sftp`,
  home: `${DESKTOP_REMOTE_ROUTE_PREFIX}/home`,
  hostWorkspace: `${DESKTOP_REMOTE_ROUTE_PREFIX}/host-workspace`,
  sessionHostsList: `${DESKTOP_REMOTE_ROUTE_PREFIX}/session-hosts-list`,
  sessionHostSet: `${DESKTOP_REMOTE_ROUTE_PREFIX}/session-host-set`,
  shellExec: `${DESKTOP_REMOTE_ROUTE_PREFIX}/shell-exec`,
})

const MAX_BODY_BYTES = 64 * 1024
const READ_LIMIT_CHARS = 256 * 1024

/**
 * Wire name of the plan-mode command-proposal tool. The AI-Shell client
 * registers its tool card under the same key (see `client/plan-command.ts`);
 * the two must stay in sync.
 */
export const PROPOSE_COMMAND_TOOL = 'propose_command'

/** Prompt-section name of the plan-mode policy this deployment replaces. */
const PLAN_POLICY_SECTION = 'plan:policy'

/**
 * Model-facing tools an AI-Shell agent keeps when the bridge runs in
 * `terminalOnly` mode: the terminal bridge's own tools plus the conversation
 * tools that never touch the desktop host. Everything else the harness ships —
 * the local shells (pwsh/bash), the local filesystem tools and search, and the
 * background-job controls — stays outside this list, so a session can only act
 * through the terminals the user opened.
 */
export const AISHELL_AGENT_TOOLS: readonly string[] = Object.freeze([
  'terminal_run',
  'terminal_read',
  'terminal_sessions',
  PROPOSE_COMMAND_TOOL,
  'exit_plan_mode',
  'ask_user_question',
  'todo_write',
  'web_search',
  'web_fetch',
  // Delegation is not a local-host capability — a subagent joins this agent's
  // composition, so it inherits the same terminal-only catalog — and the
  // delegation runtime registers its own tool in the child's scope regardless.
  'subagent',
  'subagent_fork',
  'list_agents',
  'send_message',
  'interrupt_agent',
  'list_subagent_models',
])

/**
 * Guidance sections that do not follow the `tool:<tool name>` shape: the job
 * controls share `tool:jobs` and the goal tools share `tool:goal`, so hiding
 * one member is not enough — the family section goes away only when every
 * member is gone.
 */
const TOOL_FAMILY_GUIDANCE: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'tool:jobs': ['job_list', 'job_output', 'job_kill'],
  'tool:goal': ['create_goal', 'get_goal', 'update_goal'],
})

/** Remote-bridge configuration. */
export interface Config {
  /**
   * Compose every session as an AI-Shell operation: hide the harness tools that
   * read, write, or execute on the local desktop host, and install the
   * remote-operations persona in place of the preset's coding-agent identity.
   * The other desktop modes leave the harness composition untouched.
   */
  aishell: boolean
}

/** Validated remote-bridge configuration with the compatibility default. */
export const Config: z<Config> = z.object({
  aishell: z.boolean().default(false),
})

/** One saved SSH host. */
export interface RemoteHostRecord {
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

interface ShellSession {
  /** Output not yet consumed by the renderer poller. */
  pending: string
  /** Bounded transcript tail shared with the agent tools. */
  log: string
  alive: boolean
  /** Session origin label for the agent. */
  label: string
  hostId?: string
  write(input: string): void
  resize(cols: number, rows: number): void
  close(): void
}

const shells = new Map<string, ShellSession>()
const sshConnections = new Map<string, SshClient>()
let activeSessionId: string | undefined

const LOG_LIMIT_CHARS = 200_000

function appendOutput(session: ShellSession, data: string): void {
  session.pending += data
  session.log = session.log.length + data.length > LOG_LIMIT_CHARS
    ? (session.log + data).slice(-LOG_LIMIT_CHARS)
    : session.log + data
}

function homeDirectory(): string {
  const configured = process.env.DSH_HOME
  return configured !== undefined && configured.trim().length > 0 ? configured : join(homedir(), '.dsh')
}

function hostsFile(): string {
  return join(homeDirectory(), 'remote', 'hosts.json')
}

function isHostRecord(value: unknown): value is RemoteHostRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.id === 'string' && typeof record.name === 'string' && typeof record.host === 'string'
    && typeof record.username === 'string' && (record.authType === 'password' || record.authType === 'privateKey')
}

function readHosts(): RemoteHostRecord[] {
  const file = hostsFile()
  if (!existsSync(file)) return []
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
    return Array.isArray(parsed) ? parsed.filter(isHostRecord) : []
  } catch {
    return []
  }
}

function writeHosts(hosts: readonly RemoteHostRecord[]): void {
  const file = hostsFile()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(hosts, null, 2)}\n`, { mode: 0o600 })
  try {
    chmodSync(file, 0o600)
  } catch {
    // Best effort: Windows ACLs do not map to POSIX modes.
  }
}

async function connectSsh(host: RemoteHostRecord): Promise<SshClient> {
  const existing = sshConnections.get(host.id)
  if (existing !== undefined) return existing
  const options: Record<string, unknown> = {
    host: host.host,
    port: Number.isInteger(host.port) && host.port > 0 ? host.port : 22,
    username: host.username,
    readyTimeout: 20_000,
    keepaliveInterval: 10_000,
  }
  if (host.authType === 'privateKey') {
    if (host.privateKeyPath === undefined || host.privateKeyPath === '') throw new Error('privateKeyPath is required for privateKey auth')
    options.privateKey = readFileSync(host.privateKeyPath)
    if (host.passphrase !== undefined && host.passphrase !== '') options.passphrase = host.passphrase
  } else {
    options.password = host.password ?? ''
  }
  const client = new SshClient()
  await new Promise<void>((resolve, reject) => {
    let settled = false
    client.on('ready', () => {
      if (settled) return
      settled = true
      resolve()
    })
    client.on('error', (cause: Error) => {
      if (settled) return
      settled = true
      reject(cause)
    })
    client.on('close', () => {
      sshConnections.delete(host.id)
    })
    client.connect(options as never)
  })
  sshConnections.set(host.id, client)
  return client
}

function localShellCommand(): { command: string; args: string[] } {
  if (process.platform === 'win32') {
    const shell = process.env.ComSpec ?? 'cmd.exe'
    return { command: shell, args: [] }
  }
  return { command: process.env.SHELL ?? '/bin/bash', args: ['-l'] }
}

async function openLocalShell(cols: number, rows: number): Promise<ShellSession> {
  const { command, args } = localShellCommand()
  const cwd = homeDirectory()
  try {
    const pty = await import('node-pty')
    const terminal = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols: cols > 0 ? cols : 120,
      rows: rows > 0 ? rows : 30,
      cwd,
      env: { ...process.env } as Record<string, string>,
    })
    const session: ShellSession = {
      pending: '',
      log: '',
      alive: true,
      label: `本地终端 (${command})`,
      write: input => { terminal.write(input) },
      resize: (nextCols, nextRows) => { terminal.resize(nextCols > 0 ? nextCols : 120, nextRows > 0 ? nextRows : 30) },
      close: () => { try { terminal.kill() } catch { /* already exited */ } },
    }
    terminal.onData(data => { appendOutput(session, data) })
    terminal.onExit(() => { session.alive = false })
    return session
  } catch {
    // node-pty is unavailable under this Electron ABI; fall back to a piped
    // shell, which still executes commands without full terminal semantics.
    const child: ChildProcessWithoutNullStreams = spawn(command, args, {
      cwd,
      env: { ...process.env, TERM: 'xterm-256color' },
      windowsHide: true,
    })
    const session: ShellSession = {
      pending: '',
      log: '',
      alive: true,
      label: `本地终端 (${command})`,
      write: input => { child.stdin.write(input) },
      resize: () => { /* piped shells have no window size */ },
      close: () => { try { child.kill() } catch { /* already exited */ } },
    }
    child.stdout.on('data', (data: Buffer) => { appendOutput(session, data.toString('utf8')) })
    child.stderr.on('data', (data: Buffer) => { appendOutput(session, data.toString('utf8')) })
    child.on('close', () => { session.alive = false })
    return session
  }
}

async function openSshShell(host: RemoteHostRecord, cols: number, rows: number): Promise<ShellSession> {
  const client = await connectSsh(host)
  return await new Promise<ShellSession>((resolve, reject) => {
    client.shell({ term: 'xterm-256color', cols: cols > 0 ? cols : 120, rows: rows > 0 ? rows : 30 }, (cause, stream) => {
      if (cause !== undefined) {
        reject(cause)
        return
      }
      const session: ShellSession = {
        pending: '',
        log: '',
        alive: true,
        label: `${host.username}@${host.host}:${String(host.port)}`,
        hostId: host.id,
        write: input => { stream.write(input) },
        resize: (nextCols, nextRows) => { stream.setWindow(nextRows > 0 ? nextRows : 30, nextCols > 0 ? nextCols : 120, 0, 0) },
        close: () => { try { stream.end() } catch { /* already closed */ } },
      }
      stream.on('data', (data: Buffer) => { appendOutput(session, data.toString('utf8')) })
      stream.stderr.on('data', (data: Buffer) => { appendOutput(session, data.toString('utf8')) })
      stream.on('close', () => { session.alive = false })
      resolve(session)
    })
  })
}

const SFTP_READ_LIMIT_BYTES = 512 * 1024
const sftpHandles = new WeakMap<SshClient, import('ssh2').SFTPWrapper>()

function getSftp(client: SshClient): Promise<import('ssh2').SFTPWrapper> {
  const existing = sftpHandles.get(client)
  if (existing !== undefined) return Promise.resolve(existing)
  return new Promise((resolve, reject) => {
    client.sftp((cause, sftp) => {
      if (cause !== undefined) {
        reject(cause)
        return
      }
      sftpHandles.set(client, sftp)
      resolve(sftp)
    })
  })
}

function joinRemotePath(directory: string, name: string): string {
  const base = directory === '' || directory === '.' ? '/' : directory
  return `${base.replace(/\/+$/, '')}/${name}`.replace(/^\/{2,}/, '/')
}

/** Run one SFTP operation against the saved host's session. */
async function sftpOperation(client: SshClient, op: string, body: Record<string, unknown>): Promise<unknown> {
  const sftp = await getSftp(client)
  const path = asString(body.path)
  switch (op) {
    case 'list': {
      const list = await new Promise<import('ssh2').FileEntry[]>((resolve, reject) => {
        sftp.readdir(path === '' ? '.' : path, (cause, entries) => {
          if (cause !== undefined) reject(cause)
          else resolve(entries ?? [])
        })
      })
      const directory = path === '' ? '.' : path
      const items = list.map(entry => {
        const isDirectory = (entry.attrs.mode & 0o170000) === 0o040000
        return {
          name: entry.filename,
          path: joinRemotePath(directory, entry.filename),
          directory: isDirectory,
          size: isDirectory ? null : entry.attrs.size,
          modifiedAt: entry.attrs.mtime > 0 ? entry.attrs.mtime * 1000 : null,
        }
      })
      items.sort((left, right) => left.directory === right.directory
        ? left.name.localeCompare(right.name)
        : left.directory ? -1 : 1)
      return { path: directory, items }
    }
    case 'mkdir':
      await new Promise<void>((resolve, reject) => { sftp.mkdir(path, cause => { cause === undefined ? resolve() : reject(cause) }) })
      return { ok: true }
    case 'delete':
      await new Promise<void>((resolve, reject) => {
        sftp.unlink(path, cause => {
          if (cause === undefined) { resolve(); return }
          sftp.rmdir(path, dirCause => { dirCause === undefined ? resolve() : reject(dirCause) })
        })
      })
      return { ok: true }
    case 'rename':
      await new Promise<void>((resolve, reject) => { sftp.rename(path, asString(body.newPath), cause => { cause === undefined ? resolve() : reject(cause) }) })
      return { ok: true }
    case 'read': {
      const content = await new Promise<Buffer>((resolve, reject) => {
        sftp.readFile(path, (cause, data) => { cause === undefined ? resolve(data) : reject(cause) })
      })
      const truncated = content.length > SFTP_READ_LIMIT_BYTES
      return { content: content.subarray(0, SFTP_READ_LIMIT_BYTES).toString('utf8'), truncated }
    }
    default:
      throw new Error(`unsupported sftp op ${op}`)
  }
}

function finishJson(res: ServerResponse, statusCode: number, value: object): void {  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(value))
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_BODY_BYTES) throw new Error('request body is too large')
    chunks.push(buffer)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (raw.trim() === '') return {}
  const parsed: unknown = JSON.parse(raw)
  return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {}
}

function isLoopbackAddress(address: string | undefined): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asInt(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback
}

/** Register the AI-Shell remote bridge routes on the desktop Web server. */
function registerRoutes(ctx: Context): void {
  const origin = `http://127.0.0.1:${String(ctx.webServer.port)}`
  const guard = (req: IncomingMessage, res: ServerResponse): boolean => {
    if (req.method !== 'POST') {
      finishJson(res, 405, { error: 'method not allowed' })
      return false
    }
    if (!isLoopbackAddress(req.socket.remoteAddress) || req.headers.origin !== origin) {
      finishJson(res, 403, { error: 'forbidden' })
      return false
    }
    return true
  }
  const route = (path: string, handler: (body: Record<string, unknown>, res: ServerResponse) => Promise<void>): void => {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path,
      handler: (req, res) => {
        if (!guard(req, res)) return
        void (async () => {
          try {
            await handler(await readJsonBody(req), res)
          } catch (cause) {
            finishJson(res, 500, { error: cause instanceof Error ? cause.message : String(cause) })
          }
        })()
      },
    }), `shell-desktop/remote: ${path}`)
  }

  route(DESKTOP_REMOTE_PATHS.hostsList, async (_body, res) => {
    finishJson(res, 200, { hosts: readHosts() })
  })

  route(DESKTOP_REMOTE_PATHS.hostsSave, async (body, res) => {
    const incoming = body.host
    if (!isHostRecord(incoming)) {
      finishJson(res, 400, { error: 'invalid host record' })
      return
    }
    const record: RemoteHostRecord = {
      id: incoming.id === '' ? randomUUID() : incoming.id,
      name: incoming.name.trim() === '' ? incoming.host : incoming.name,
      host: incoming.host.trim(),
      port: asInt(incoming.port, 22),
      username: incoming.username.trim(),
      authType: incoming.authType,
      ...(incoming.password === undefined || incoming.password === '' ? {} : { password: incoming.password }),
      ...(incoming.privateKeyPath === undefined || incoming.privateKeyPath === '' ? {} : { privateKeyPath: incoming.privateKeyPath }),
      ...(incoming.passphrase === undefined || incoming.passphrase === '' ? {} : { passphrase: incoming.passphrase }),
    }
    if (asString(body.action) === 'remove') {
      writeHosts(readHosts().filter(host => host.id !== record.id))
      sshConnections.get(record.id)?.end()
      sshConnections.delete(record.id)
      finishJson(res, 200, { hosts: readHosts() })
      return
    }
    const hosts = readHosts().filter(host => host.id !== record.id)
    hosts.push(record)
    writeHosts(hosts)
    finishJson(res, 200, { hosts: readHosts() })
  })

  route(DESKTOP_REMOTE_PATHS.shellOpen, async (body, res) => {
    const cols = asInt(body.cols, 120)
    const rows = asInt(body.rows, 30)
    const hostId = asString(body.hostId)
    const session = hostId === ''
      ? await openLocalShell(cols, rows)
      : await openSshShell(readHosts().find(host => host.id === hostId) ?? (() => { throw new Error('unknown host') })(), cols, rows)
    const sessionId = randomUUID()
    shells.set(sessionId, session)
    activeSessionId = sessionId
    finishJson(res, 200, { sessionId })
  })

  route(DESKTOP_REMOTE_PATHS.shellActivate, async (body, res) => {
    const sessionId = asString(body.sessionId)
    if (shells.has(sessionId)) activeSessionId = sessionId
    finishJson(res, 200, { active: activeSessionId ?? null })
  })

  route(DESKTOP_REMOTE_PATHS.shellWrite, async (body, res) => {
    const session = shells.get(asString(body.sessionId))
    if (session === undefined) {
      finishJson(res, 404, { error: 'no such session' })
      return
    }
    session.write(asString(body.input))
    finishJson(res, 200, { ok: true })
  })

  route(DESKTOP_REMOTE_PATHS.shellRead, async (body, res) => {
    const session = shells.get(asString(body.sessionId))
    if (session === undefined) {
      finishJson(res, 404, { error: 'no such session' })
      return
    }
    const output = session.pending.length > READ_LIMIT_CHARS
      ? session.pending.slice(session.pending.length - READ_LIMIT_CHARS)
      : session.pending
    session.pending = ''
    finishJson(res, 200, { output, alive: session.alive })
  })

  route(DESKTOP_REMOTE_PATHS.shellResize, async (body, res) => {
    const session = shells.get(asString(body.sessionId))
    if (session === undefined) {
      finishJson(res, 404, { error: 'no such session' })
      return
    }
    session.resize(asInt(body.cols, 120), asInt(body.rows, 30))
    finishJson(res, 200, { ok: true })
  })

  route(DESKTOP_REMOTE_PATHS.shellClose, async (body, res) => {
    const sessionId = asString(body.sessionId)
    const session = shells.get(sessionId)
    if (session !== undefined) {
      session.close()
      shells.delete(sessionId)
    }
    finishJson(res, 200, { ok: true })
  })

  route(DESKTOP_REMOTE_PATHS.home, async (_body, res) => {
    finishJson(res, 200, { home: homedir() })
  })

  // The plan-mode command card's execute button types one proposed command
  // into the user's currently active terminal. It does not wait for output:
  // the command and its result stay in the visible terminal.
  route(DESKTOP_REMOTE_PATHS.shellExec, async (body, res) => {
    const command = asString(body.command)
    if (command.trim() === '') {
      finishJson(res, 400, { error: 'command is required' })
      return
    }
    const aiSessionId = asString(body.sessionId)
    const session = aiSessionId === '' ? pickSession(undefined) : pickBoundSession(aiSessionId, undefined)
    if (session === undefined) {
      finishJson(res, 404, { error: aiSessionId === '' ? 'no terminal session is available' : 'the session has no bound terminal' })
      return
    }
    session.write(`${command}\r`)
    const sessionId = [...shells.entries()].find(([, value]) => value === session)?.[0] ?? ''
    finishJson(res, 200, { sessionId })
  })

  // One local directory per saved host, used as the session workspace so the
  // session list groups a host's conversations under its name.
  route(DESKTOP_REMOTE_PATHS.hostWorkspace, async (body, res) => {
    const hostId = asString(body.hostId)
    const host = readHosts().find(candidate => candidate.id === hostId)
    if (host === undefined) {
      finishJson(res, 400, { error: 'unknown host' })
      return
    }
    const directory = join(homeDirectory(), 'remote-workspaces', hostId.replace(/[^a-zA-Z0-9_-]/g, ''))
    mkdirSync(directory, { recursive: true })
    finishJson(res, 200, { path: directory, title: host.name })
  })

  // Explicit AI session → host mapping recorded when the AI shell creates a
  // host-bound session. It survives reloads so the session tree can group a
  // host's history under its name without relying on workspace naming.
  route(DESKTOP_REMOTE_PATHS.sessionHostsList, async (_body, res) => {
    finishJson(res, 200, { sessions: readSessionHosts(sessionHostsFile(homeDirectory())) })
  })

  route(DESKTOP_REMOTE_PATHS.sessionHostSet, async (body, res) => {
    const sessionId = asString(body.sessionId)
    const hostId = asString(body.hostId)
    if (sessionId === '' || hostId === '') {
      finishJson(res, 400, { error: 'sessionId and hostId are required' })
      return
    }
    const file = sessionHostsFile(homeDirectory())
    const sessions = readSessionHosts(file)
    sessions[sessionId] = hostId
    writeSessionHosts(file, sessions)
    finishJson(res, 200, { sessions })
  })

  route(DESKTOP_REMOTE_PATHS.sftp, async (body, res) => {
    const hostId = asString(body.hostId)
    const host = readHosts().find(candidate => candidate.id === hostId)
    if (host === undefined) {
      finishJson(res, 400, { error: 'unknown host' })
      return
    }
    const client = await connectSsh(host)
    finishJson(res, 200, { result: await sftpOperation(client, asString(body.op), body) })
  })

  ctx.logger.info(`shell-desktop/remote: shell bridge on ${DESKTOP_REMOTE_ROUTE_PREFIX}`)
}

/** Services required by the remote bridge. */
export const inject = ['webServer', 'tools']

const SETTLE_MS = 700
const DEFAULT_TIMEOUT_MS = 30_000
const MAX_TIMEOUT_MS = 120_000
const READ_TOOL_DEFAULT_CHARS = 8_000

/** AI-session id carried by one agent, when the runtime exposes it. */
function agentSessionId(agent: unknown): string | undefined {
  const session = (agent as { session?: { id?: unknown } } | undefined)?.session
  return typeof session?.id === 'string' && session.id !== '' ? session.id : undefined
}

/**
 * Resolve the terminal one AI session may operate. A session is bound to the
 * terminal of its own host (recorded in session-hosts.json, absent means the
 * local terminal); terminals of other hosts belong to their own sessions, so
 * parallel bindings never steal each other's commands.
 * @param aiSessionId - the calling AI session, when known.
 * @param requested - an explicit terminal id from the tool call, when given.
 * @returns the session's own terminal, or undefined when it is not attached.
 */
function pickBoundSession(aiSessionId: string | undefined, requested: unknown): ShellSession | undefined {
  if (aiSessionId === undefined) return pickSession(requested)
  const boundKey = readSessionHosts(sessionHostsFile(homeDirectory()))[aiSessionId] ?? 'local'
  const id = asString(requested)
  if (id !== '') {
    const requestedShell = shells.get(id)
    return requestedShell !== undefined && (requestedShell.hostId ?? 'local') === boundKey ? requestedShell : undefined
  }
  const candidates = [...shells.entries()].filter(([, shell]) => (shell.hostId ?? 'local') === boundKey)
  if (candidates.length === 0) return undefined
  const active = candidates.find(([sessionId]) => sessionId === activeSessionId)
  return active?.[1] ?? candidates.find(([, shell]) => shell.alive)?.[1] ?? candidates[0]?.[1]
}

function pickSession(requested: unknown): ShellSession | undefined {
  const id = asString(requested)
  if (id !== '') return shells.get(id)
  if (activeSessionId !== undefined) {
    const active = shells.get(activeSessionId)
    if (active !== undefined) return active
  }
  for (const session of shells.values()) if (session.alive) return session
  return undefined
}

/**
 * Whether plan mode is active for the calling agent. The service is optional:
 * a composition without `dsh-plan-mode` never gates terminal execution.
 * @param ctx - Host context carrying the optional plan-mode service.
 * @param agent - the calling agent, when the call has one.
 * @returns true only when plan mode is logged active for that agent.
 */
function planModeActive(ctx: Context, agent: unknown): boolean {
  if (agent === undefined) return false
  return agentPlanModeActive(ctx, agent as Agent)
}

/**
 * Narrow one agent's tool catalog to the terminal bridge. The restriction is
 * registered through the agent's own scoped context, so it covers that agent
 * and every subagent it starts, unwinds with the agent, and never touches the
 * catalog another session sees. Names this composition does not register are
 * skipped rather than fatal, and an empty intersection leaves the catalog
 * untouched instead of denying every tool.
 * @param ctx - Host context used for diagnostics.
 * @param agent - the newly created agent whose catalog is narrowed.
 */
function restrictAgentToTerminalTools(ctx: Context, agent: Agent): void {
  const tools = agent.ctx.tools
  const visible = [...new Set(tools.schemas(agent).map(schema => schema.name))]
  const allow = AISHELL_AGENT_TOOLS.filter(name => visible.includes(name))
  if (allow.length === 0) {
    ctx.logger.warn(`shell-desktop/remote: agent ${agent.id} sees none of the terminal tools; its catalog stays unrestricted`)
    return
  }
  tools.restrict({ allow })
  dropHiddenToolGuidance(agent, visible.filter(name => !allow.includes(name)))
}

/**
 * Each tool contributes its model guidance as a `tool:<name>` prompt section.
 * A tool this session can no longer call must not leave its instructions in the
 * prompt, so every hidden name gets an empty section in the agent's own scope:
 * the nearer scope shadows the ancestor contribution and the empty section is
 * dropped when the prompt renders.
 * @param agent - the agent whose prompt is trimmed.
 * @param hidden - tool names that just left the agent's catalog.
 */
function dropHiddenToolGuidance(agent: Agent, hidden: readonly string[]): void {
  if (hidden.length === 0) return
  const gone = new Set(hidden)
  const sections = new Set(hidden.map(name => `tool:${name}`))
  for (const [section, family] of Object.entries(TOOL_FAMILY_GUIDANCE)) {
    // One section carries the guidance for a whole family, so it goes away
    // only once every member has left the catalog.
    if (family.every(name => gone.has(name))) sections.add(section)
  }
  const prompt = agent.ctx.systemPrompt
  for (const name of sections) {
    prompt.section({ name, order: 0, text: '' })
  }
}

/**
 * Install the AI-Shell operator identity for one agent. An agent preset's
 * `persona` row registers the same section names with the coding-agent text and
 * a local-working-directory suffix, and a nearer scope shadows a farther one —
 * so registering here, in the agent's own scope, replaces that identity for
 * this session whatever preset it runs. The empty suffix drops the preset's
 * working-directory sentence: the deployment's workspace directory is a local
 * detail the operator never works from.
 * @param agent - the newly created agent whose persona is replaced.
 */
function installAishellPersona(agent: Agent): void {
  const prompt = agent.ctx.systemPrompt
  prompt.section({
    name: PERSONA_PREFIX_SECTION,
    order: prompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX'),
    text: AI_SHELL_PERSONA_PREFIX,
  })
  prompt.section({
    name: PERSONA_SUFFIX_SECTION,
    order: prompt.getSectionOrder('DEPLOYMENT_PERSONA_SUFFIX'),
    text: '',
  })
}

/**
 * Whether plan mode is logged active for one agent. The state lives in the
 * agent's preset composition, so the preset-scoped service wins over the
 * host-plane instance; callers outside a preset fall back to the host one.
 * @param ctx - Host context carrying the preset roster and the plan-mode service.
 * @param agent - the agent whose plan state is read.
 * @returns true only when plan mode is active for that agent.
 */
function agentPlanModeActive(ctx: Context, agent: Agent): boolean {
  const lookup = ctx as unknown as { get(name: string): unknown }
  const presets = lookup.get('agentPresets') as
    { serviceFor?(agent: unknown, name: string): unknown } | undefined
  const read = (service: unknown): boolean => (service as
    { get?(agent: unknown): { active?: boolean } } | undefined)?.get?.(agent)?.active === true
  try {
    const scoped = presets?.serviceFor?.(agent, 'planMode')
    if (scoped !== undefined) return read(scoped)
  } catch {
    // The agent may not join a preset yet; the host-plane service answers.
  }
  return read(lookup.get('planMode'))
}

/**
 * Replace the harness plan policy with the AI-Shell one for this agent. The
 * harness section is registered by the preset's plan-mode row under the same
 * name, and a nearer scope shadows it; the text stays empty outside plan mode
 * so the policy never leaks into ordinary turns.
 * @param ctx - Host context carrying the preset roster.
 * @param agent - the agent whose plan policy is replaced.
 */
function installAishellPlanPolicy(ctx: Context, agent: Agent): void {
  const prompt = agent.ctx.systemPrompt
  prompt.section({
    name: PLAN_POLICY_SECTION,
    order: prompt.getSectionOrder('PLAN_POLICY'),
    text: () => (agentPlanModeActive(ctx, agent) ? AI_SHELL_PLAN_POLICY : ''),
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => { setTimeout(resolve, ms) })
}

/** Type one command into the visible session and resolve once output settles. */
async function runInTerminal(session: ShellSession, command: string, timeoutMs: number): Promise<{ output: string; timedOut: boolean }> {
  const startedOffset = session.log.length
  session.write(`${command}\r`)
  const deadline = Date.now() + timeoutMs
  let lastLength = session.log.length
  let lastChange = Date.now()
  while (Date.now() < deadline) {
    await sleep(120)
    const length = session.log.length
    if (length !== lastLength) {
      lastLength = length
      lastChange = Date.now()
      continue
    }
    if (Date.now() - lastChange >= SETTLE_MS) break
  }
  const output = session.log.length > startedOffset
    ? session.log.slice(startedOffset)
    : session.log.slice(-READ_TOOL_DEFAULT_CHARS)
  return { output, timedOut: Date.now() >= deadline }
}

/** Register the model-facing tools that drive the user's visible terminals. */
function registerTerminalTools(ctx: Context): void {
  ctx.effect(() => ctx.tools.register(defineTool({
    name: 'terminal_run',
    description: '在用户当前打开的终端会话里执行一条 shell 命令，返回该会话新增的输出。终端通常是用户通过 SSH 连接的远程主机；命令会真实输入到用户可见的同一个会话里，用户能看到你执行的命令。优先用它完成用户要求的运维、排查、部署等操作。plan 模式下不要使用本工具，改用 propose_command 把命令提交给用户手动执行。',
    parameters: {
      command: { type: 'string', required: true, description: '要执行的 shell 命令（单行；需要多步时逐条执行）。' },
      timeoutSeconds: { type: 'integer', description: '等待输出稳定的最长秒数，默认 30，最大 120。' },
      sessionId: { type: 'string', description: '目标终端会话 id；省略时使用用户当前激活的终端。' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          output: { type: 'string', required: true },
          sessionId: { type: 'string', required: true },
          label: { type: 'string', required: true },
          alive: { type: 'boolean', required: true },
          timedOut: { type: 'boolean', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.output.trim() === '' ? '(命令已发送，终端没有新的输出)' : value.output }],
    },
    async execute(args, exec) {
      if (planModeActive(ctx, exec.agent)) {
        throw new Error('plan 模式下不执行命令：请改用 propose_command，把命令作为待执行卡片提交给用户，由用户点击卡片上的“执行”按钮。')
      }
      const agentSession = agentSessionId(exec.agent)
      const session = pickBoundSession(agentSession, args.sessionId)
      if (session === undefined) {
        throw new Error(agentSession === undefined
          ? '没有可用的终端会话：请先在 AI Shell 中打开本地终端或连接一台主机'
          : '该会话绑定的终端不可用：一个会话只能操作它绑定终端（其他终端属于其他会话）；请先在对应终端里打开本地终端或连接主机')
      }
      const requested = typeof args.timeoutSeconds === 'number' ? args.timeoutSeconds * 1000 : DEFAULT_TIMEOUT_MS
      const timeoutMs = Math.min(Math.max(requested, 1_000), MAX_TIMEOUT_MS)
      const { output, timedOut } = await runInTerminal(session, args.command, timeoutMs)
      const sessionId = [...shells.entries()].find(([, value]) => value === session)?.[0] ?? ''
      return { output, sessionId, label: session.label, alive: session.alive, timedOut }
    },
  })), 'shell-desktop/remote: terminal_run tool')

  // Plan-mode command proposal: the model submits one command for the user to
  // execute from the conversation instead of running it in the terminal. The
  // tool never executes; the card's button calls the shell-exec route.
  ctx.effect(() => ctx.tools.register(defineTool({
    name: PROPOSE_COMMAND_TOOL,
    description: '在 plan 模式下向用户提交一条待执行的 shell 命令。命令会以代码卡片显示在对话末尾，用户点击卡片上的“执行”按钮后才会在可见终端里运行。plan 模式下列出要执行的命令时必须使用本工具逐条提交，不要用文字、列表或表格罗列命令；也不要使用 terminal_run 执行命令。',
    parameters: {
      command: { type: 'string', required: true, description: '要提交给用户执行的单行 shell 命令。' },
      description: { type: 'string', description: '这条命令的作用或意图，帮助用户判断是否执行。' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          command: { type: 'string', required: true },
          description: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.description.trim() === '' ? `待执行命令：${value.command}` : `${value.description}：${value.command}`,
      }],
    },
    async execute(args) {
      const command = args.command.trim()
      if (command === '') throw new Error('propose_command 需要一条非空的命令')
      return { command, description: args.description?.trim() ?? '' }
    },
  })), 'shell-desktop/remote: propose_command tool')

  ctx.effect(() => ctx.tools.register(defineTool({
    name: 'terminal_read',
    description: '读取终端会话最近的输出（不执行任何命令）。用于查看用户终端当前屏幕内容或之前命令的结果。',
    parameters: {
      sessionId: { type: 'string', description: '目标终端会话 id；省略时使用用户当前激活的终端。' },
      maxChars: { type: 'integer', description: '最多返回的字符数，默认 8000。' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          output: { type: 'string', required: true },
          sessionId: { type: 'string', required: true },
          label: { type: 'string', required: true },
          alive: { type: 'boolean', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.output.trim() === '' ? '(终端暂无输出)' : value.output }],
    },
    async execute(args, exec) {
      const agentSession = agentSessionId(exec.agent)
      const session = pickBoundSession(agentSession, args.sessionId)
      if (session === undefined) {
        throw new Error(agentSession === undefined
          ? '没有可用的终端会话：请先在 AI Shell 中打开本地终端或连接一台主机'
          : '该会话绑定的终端不可用：一个会话只能操作它绑定终端（其他终端属于其他会话）；请先在对应终端里打开本地终端或连接主机')
      }
      const maxChars = typeof args.maxChars === 'number' ? Math.max(200, args.maxChars) : READ_TOOL_DEFAULT_CHARS
      const sessionId = [...shells.entries()].find(([, value]) => value === session)?.[0] ?? ''
      return {
        output: session.log.length > maxChars ? session.log.slice(-maxChars) : session.log,
        sessionId,
        label: session.label,
        alive: session.alive,
      }
    },
  })), 'shell-desktop/remote: terminal_read tool')

  ctx.effect(() => ctx.tools.register(defineTool({
    name: 'terminal_sessions',
    description: '列出用户当前打开的终端会话（本地或 SSH），并标记用户正在查看的那个。',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          sessions: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                sessionId: { type: 'string', required: true },
                label: { type: 'string', required: true },
                alive: { type: 'boolean', required: true },
                active: { type: 'boolean', required: true },
              },
            },
          },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.sessions.length === 0
          ? '(当前没有打开的终端会话)'
          : value.sessions.map(session => `${session.active ? '* ' : '  '}${session.label} [${session.sessionId}] ${session.alive ? '' : '(已结束)'}`).join('\n'),
      }],
    },
    async execute() {
      return {
        sessions: [...shells.entries()].map(([sessionId, session]) => ({
          sessionId,
          label: session.label,
          alive: session.alive,
          active: sessionId === activeSessionId,
        })),
      }
    },
  })), 'shell-desktop/remote: terminal_sessions tool')

  ctx.logger.info('shell-desktop/remote: terminal tools registered (terminal_run, terminal_read, terminal_sessions, propose_command)')
}

/**
 * Plugin body: serve the hosts and shell routes for the desktop renderer, and
 * register the agent tools that operate the user's visible terminals.
 * @param ctx - Host context carrying the desktop Web server and tool registry.
 * @param config - bridge configuration; `aishell` composes AI-Shell sessions.
 */
export function apply(ctx: Context, config: Config = { aishell: false }): void {
  registerRoutes(ctx)
  registerTerminalTools(ctx)
  if (!config.aishell) return
  /** Containment for one composition step: a failure must never veto publication. */
  const compose = (label: string, step: () => void): void => {
    try {
      step()
    } catch (cause) {
      ctx.logger.warn(`shell-desktop/remote: ${label} for one agent failed: ${cause instanceof Error ? cause.message : String(cause)}`)
    }
  }
  ctx.effect(() => {
    const stop =     ctx.on('agent/created', ({ agent }) => {
      compose(`terminal-only catalog (${agent.id})`, () => { restrictAgentToTerminalTools(ctx, agent) })
      compose(`operator persona (${agent.id})`, () => { installAishellPersona(agent) })
      compose(`plan policy (${agent.id})`, () => { installAishellPlanPolicy(ctx, agent) })
    })
    return () => { stop() }
  }, 'shell-desktop/remote: AI-Shell agent composition')
}
