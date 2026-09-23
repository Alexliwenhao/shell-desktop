/**
 * Durable AI session → host mapping for the Desktop AI shell. It lives beside
 * the saved hosts; the AI shell records a session's host when it creates a
 * host-bound session so the session tree can group history after a reload
 * without depending on workspace naming.
 */

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** On-disk document of the session → host mapping. */
export interface SessionHostDocument {
  readonly version: 1
  readonly sessions: Record<string, string>
}

/**
 * Path of the mapping document inside a DSH home.
 * @param home - absolute DSH home directory.
 * @returns the mapping document path.
 */
export function sessionHostsFile(home: string): string {
  return join(home, 'remote', 'session-hosts.json')
}

/**
 * Read the mapping. A missing, unreadable, or malformed document reads as
 * empty; non-string host values are dropped.
 * @param file - mapping document path.
 * @returns session id → host id entries.
 */
export function readSessionHosts(file: string): Record<string, string> {
  if (!existsSync(file)) return {}
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
    if (typeof parsed !== 'object' || parsed === null) return {}
    const sessions = (parsed as { sessions?: unknown }).sessions
    if (typeof sessions !== 'object' || sessions === null) return {}
    const result: Record<string, string> = {}
    for (const [sessionId, hostId] of Object.entries(sessions)) {
      if (sessionId !== '' && typeof hostId === 'string') result[sessionId] = hostId
    }
    return result
  } catch {
    return {}
  }
}

/**
 * Write the mapping, restricting the document to its owner where POSIX modes apply.
 * @param file - mapping document path.
 * @param sessions - session id → host id entries.
 */
export function writeSessionHosts(file: string, sessions: Record<string, string>): void {
  mkdirSync(dirname(file), { recursive: true })
  const payload: SessionHostDocument = { version: 1, sessions }
  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 })
  try {
    chmodSync(file, 0o600)
  } catch {
    // Best effort: Windows ACLs do not map to POSIX modes.
  }
}
