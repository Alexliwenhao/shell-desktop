import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readSessionHosts, sessionHostsFile, writeSessionHosts } from '../src/session-host-store.ts'

const homes: string[] = []

function tempHome(): string {
  const home = mkdtempSync(join(tmpdir(), 'dsh-session-hosts-'))
  homes.push(home)
  return home
}

afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true })
})

describe('session host store', () => {
  it('round-trips a mapping under <home>/remote/session-hosts.json', () => {
    const home = tempHome()
    const file = sessionHostsFile(home)

    expect(file).toBe(join(home, 'remote', 'session-hosts.json'))
    expect(readSessionHosts(file)).toEqual({})

    writeSessionHosts(file, { 's-1': 'h-1', 's-2': 'h-2' })

    expect(readSessionHosts(file)).toEqual({ 's-1': 'h-1', 's-2': 'h-2' })
  })

  it('replaces the previous mapping on write', () => {
    const home = tempHome()
    const file = sessionHostsFile(home)

    writeSessionHosts(file, { 's-1': 'h-1' })
    writeSessionHosts(file, { 's-2': 'h-2' })

    expect(readSessionHosts(file)).toEqual({ 's-2': 'h-2' })
  })

  it('reads a malformed document as empty', () => {
    const home = tempHome()
    const file = sessionHostsFile(home)
    writeSessionHosts(file, {})
    writeFileSync(file, 'not json', 'utf8')

    expect(readSessionHosts(file)).toEqual({})
  })

  it('drops non-string host values and empty session ids', () => {
    const home = tempHome()
    const file = sessionHostsFile(home)
    writeSessionHosts(file, {})
    writeFileSync(file, JSON.stringify({ version: 1, sessions: { 's-1': 'h-1', 's-2': 42, '': 'h-3' } }), 'utf8')

    expect(readSessionHosts(file)).toEqual({ 's-1': 'h-1' })
  })

  it('reads a document without a sessions object as empty', () => {
    const home = tempHome()
    const file = sessionHostsFile(home)
    writeSessionHosts(file, {})
    writeFileSync(file, JSON.stringify({ version: 1 }), 'utf8')

    expect(readSessionHosts(file)).toEqual({})
  })
})
