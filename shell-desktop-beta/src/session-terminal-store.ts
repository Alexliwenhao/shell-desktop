/**
 * Durable AI session -> terminal mapping for the Desktop AI shell. It lives
 * beside the saved hosts and records which concrete terminal a session owns, so
 * one session only ever drives its own terminal while other terminals stay with
 * their own sessions.
 */

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** On-disk document of the session -> terminal mapping. */
export interface SessionTerminalDocument {
  readonly version: 1
  readonly sessions: Record<string, string>
}

/**
 * Path of the mapping document inside a DSH home.
 * @param home - absolute DSH home directory.
 * @returns the mapping document path.
 */
export function sessionTerminalsFile(home: string): string {
  return join(home, 'remote', 'session-terminals.json')
}

/**
 * Read the mapping. A missing, unreadable, or malformed document reads as
 * empty; non-string values are dropped.
 * @param file - mapping document path.
 * @returns session id -> terminal id entries.
 */
export function readSessionTerminals(file: string): Record<string, string> {
  if (!existsSync(file)) return {}
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
    if (typeof parsed !== 'object' || parsed === null) return {}
    const sessions = (parsed as { sessions?: unknown }).sessions
    if (typeof sessions !== 'object' || sessions === null) return {}
    const result: Record<string, string> = {}
    for (const [sessionId, terminalId] of Object.entries(sessions)) {
      if (sessionId !== '' && typeof terminalId === 'string' && terminalId !== '') result[sessionId] = terminalId
    }
    return result
  } catch {
    return {}
  }
}

/**
 * Record one session's bound terminal, restricting the document to its owner
 * where POSIX modes apply.
 * @param file - mapping document path.
 * @param sessionId - AI session id.
 * @param terminalId - terminal id the session owns.
 */
export function writeSessionTerminal(file: string, sessionId: string, terminalId: string): void {
  const sessions = readSessionTerminals(file)
  sessions[sessionId] = terminalId
  mkdirSync(dirname(file), { recursive: true })
  const payload: SessionTerminalDocument = { version: 1, sessions }
  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 })
  try {
    chmodSync(file, 0o600)
  } catch {
    // Best effort: Windows ACLs do not map to POSIX modes.
  }
}
