import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readSessionTerminals, sessionTerminalsFile, writeSessionTerminal } from '../src/session-terminal-store.ts'

const homes: string[] = []

function tempHome(): string {
  const home = mkdtempSync(join(tmpdir(), 'dsh-session-terminals-'))
  homes.push(home)
  return home
}

afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
})

describe('session terminal store', () => {
  it('round-trips a mapping under <home>/remote/session-terminals.json', () => {
    const home = tempHome()
    const file = sessionTerminalsFile(home)

    expect(file).toBe(join(home, 'remote', 'session-terminals.json'))
    expect(readSessionTerminals(file)).toEqual({})

    writeSessionTerminal(file, 's-1', 'local:aaaa')
    writeSessionTerminal(file, 's-2', 'local:bbbb')

    expect(readSessionTerminals(file)).toEqual({ 's-1': 'local:aaaa', 's-2': 'local:bbbb' })
  })

  it('moves a terminal to its new owner so one terminal belongs to one session', () => {
    const home = tempHome()
    const file = sessionTerminalsFile(home)

    writeSessionTerminal(file, 's-1', 'local:aaaa')
    writeSessionTerminal(file, 's-2', 'local:aaaa')

    expect(readSessionTerminals(file)).toEqual({ 's-2': 'local:aaaa' })
  })

  it('keeps other terminal bindings when one session is rebound', () => {
    const home = tempHome()
    const file = sessionTerminalsFile(home)

    writeSessionTerminal(file, 's-1', 'local:aaaa')
    writeSessionTerminal(file, 's-2', 'local:bbbb')
    writeSessionTerminal(file, 's-1', 'local:cccc')

    expect(readSessionTerminals(file)).toEqual({ 's-1': 'local:cccc', 's-2': 'local:bbbb' })
  })

  it('reads a malformed document as empty', () => {
    const home = tempHome()
    const file = sessionTerminalsFile(home)
    writeSessionTerminal(file, 's-1', 'local:aaaa')
    writeFileSync(file, 'not json', 'utf8')

    expect(readSessionTerminals(file)).toEqual({})
  })

  it('drops non-string terminal values and empty session ids', () => {
    const home = tempHome()
    const file = sessionTerminalsFile(home)
    writeSessionTerminal(file, 's-1', 'local:aaaa')
    writeFileSync(file, JSON.stringify({ version: 1, sessions: { 's-1': 'local:aaaa', 's-2': 42, '': 'local:bbbb' } }), 'utf8')

    expect(readSessionTerminals(file)).toEqual({ 's-1': 'local:aaaa' })
  })
})
