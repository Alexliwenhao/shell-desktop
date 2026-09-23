/**
 * Pure derivation of the AI-Shell session tree. Open terminal sessions and AI
 * session history are grouped by host so the left "Sessions" pane answers
 * "which machine was this session used on" without a workspace detour.
 */

/** One open terminal session as the session tree needs it. */
export interface SessionTreeTerminal {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  readonly dead: boolean
  readonly active: boolean
  /** Saved SSH host this terminal runs on; absent for a local shell. */
  readonly hostId?: string
}

/** One AI session row as the session tree needs it. */
export interface SessionTreeSession {
  readonly id: string
  readonly title: string
  readonly updatedAt: number
  readonly running: boolean
  readonly completed: boolean
  readonly blank: boolean
  readonly origin?: 'subagent'
}

/** One host group holding that host's terminals and AI session history. */
export interface SessionTreeGroup {
  /** Saved host id, or {@link LOCAL_GROUP_KEY}. */
  readonly key: string
  /** Host name, or the localized local label. */
  readonly title: string
  readonly terminals: readonly SessionTreeTerminal[]
  readonly sessions: readonly SessionTreeSession[]
}

/** Group key for the local machine and for sessions with no resolvable host. */
export const LOCAL_GROUP_KEY = 'local'

/** Inputs of {@link buildSessionTree}. */
export interface BuildSessionTreeInput {
  /** Saved hosts in registry display order. */
  readonly hosts: readonly { readonly id: string; readonly name: string }[]
  readonly terminals: readonly SessionTreeTerminal[]
  readonly sessions: readonly SessionTreeSession[]
  /** Explicit AI session → host mapping recorded by the AI shell. */
  readonly sessionHosts: Readonly<Record<string, string>>
  /** Current session id; a blank session stays visible only while it is current. */
  readonly currentSessionId?: string
  /** Sessions the Host archive set holds; they leave every grouping surface. */
  readonly archivedSessionIds?: readonly string[]
  /** Localized title of the local-machine group. */
  readonly localLabel: string
}

interface MutableGroup {
  key: string
  title: string
  terminals: SessionTreeTerminal[]
  sessions: SessionTreeSession[]
}

/**
 * Group terminals and AI session history by host.
 *
 * Saved hosts keep their registry order; the local group comes last. A session
 * whose mapped host no longer exists, and a terminal whose host was deleted,
 * fall back to the local group. Groups with no rows are dropped. AI sessions
 * sort newest first inside a group; terminals keep their open order.
 * @param input - hosts, rows, explicit mapping, current session, local label.
 * @returns ordered, non-empty host groups.
 */
export function buildSessionTree(input: BuildSessionTreeInput): SessionTreeGroup[] {
  const hostsById = new Map(input.hosts.map(host => [host.id, host]))
  const groups = new Map<string, MutableGroup>()
  const ensure = (key: string, title: string): MutableGroup => {
    const existing = groups.get(key)
    if (existing !== undefined) return existing
    const created: MutableGroup = { key, title, terminals: [], sessions: [] }
    groups.set(key, created)
    return created
  }

  for (const host of input.hosts) ensure(host.id, host.name)

  const resolve = (hostId: string | undefined): { key: string; title: string } => {
    if (hostId !== undefined && hostId !== LOCAL_GROUP_KEY) {
      const host = hostsById.get(hostId)
      if (host !== undefined) return { key: host.id, title: host.name }
    }
    return { key: LOCAL_GROUP_KEY, title: input.localLabel }
  }

  for (const terminal of input.terminals) {
    const target = resolve(terminal.hostId)
    ensure(target.key, target.title).terminals.push(terminal)
  }

  const archived = new Set(input.archivedSessionIds ?? [])
  for (const session of input.sessions) {
    if (session.origin === 'subagent') continue
    if (archived.has(session.id)) continue
    if (session.blank && session.id !== input.currentSessionId) continue
    const target = resolve(input.sessionHosts[session.id])
    ensure(target.key, target.title).sessions.push(session)
  }

  const ordered: SessionTreeGroup[] = []
  const keys = [...input.hosts.map(host => host.id), LOCAL_GROUP_KEY]
  for (const key of keys) {
    const group = groups.get(key)
    if (group === undefined || (group.terminals.length === 0 && group.sessions.length === 0)) continue
    group.sessions.sort((left, right) => right.updatedAt - left.updatedAt)
    ordered.push(group)
  }
  return ordered
}

/**
 * Compact local timestamp (`MM-DD HH:mm`) for a session row.
 * @param updatedAt - epoch milliseconds; non-positive or non-finite yields an empty string.
 * @returns the formatted timestamp, or an empty string when there is no time.
 */
export function formatSessionTimestamp(updatedAt: number): string {
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return ''
  const date = new Date(updatedAt)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
