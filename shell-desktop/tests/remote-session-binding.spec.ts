import { describe, expect, it } from 'vitest'
import { resolveBoundTerminal, type BoundTerminalFacts } from '../src/remote.ts'

const T1 = 'local:11111111'
const T2 = 'local:22222222'
const OTHER = 'host-2:33333333'

const terminals: readonly BoundTerminalFacts[] = [
  { sessionId: T1, hostKey: 'local', alive: true },
  { sessionId: T2, hostKey: 'local', alive: true },
  { sessionId: OTHER, hostKey: 'host-2', alive: true },
]

describe('AI session terminal binding rules', () => {
  it('keeps a session on its recorded terminal even when another one is active', () => {
    expect(resolveBoundTerminal('', T1, 'local', T2, terminals)).toBe(T1)
  })

  it('falls back to the active terminal of its host once the recorded one is gone', () => {
    expect(resolveBoundTerminal('', 'local:99999999', 'local', T2, terminals)).toBe(T2)
  })

  it('takes the first live terminal of the host when none is active', () => {
    expect(resolveBoundTerminal('', undefined, 'local', undefined, terminals)).toBe(T1)
  })

  it('never crosses to a terminal of another host', () => {
    expect(resolveBoundTerminal('', undefined, 'host-9', undefined, terminals)).toBeUndefined()
    expect(resolveBoundTerminal(OTHER, undefined, 'local', undefined, terminals)).toBeUndefined()
  })

  it('accepts an explicit terminal only while it is the recorded one', () => {
    expect(resolveBoundTerminal(T2, T2, 'local', T1, terminals)).toBe(T2)
    expect(resolveBoundTerminal(T2, T1, 'local', T1, terminals)).toBeUndefined()
  })

  it('accepts an explicit terminal of its own host while nothing is recorded', () => {
    expect(resolveBoundTerminal(T2, undefined, 'local', undefined, terminals)).toBe(T2)
  })

  it('ignores an explicit terminal that is not open', () => {
    expect(resolveBoundTerminal('local:99999999', undefined, 'local', T1, terminals)).toBeUndefined()
  })

  it('skips dead terminals while one is alive', () => {
    const deadFirst: readonly BoundTerminalFacts[] = [
      { sessionId: T1, hostKey: 'local', alive: false },
      { sessionId: T2, hostKey: 'local', alive: true },
    ]
    expect(resolveBoundTerminal('', undefined, 'local', undefined, deadFirst)).toBe(T2)
  })

  it('still answers with a dead terminal when no live one remains', () => {
    const dead: readonly BoundTerminalFacts[] = [
      { sessionId: T1, hostKey: 'local', alive: false },
    ]
    expect(resolveBoundTerminal('', undefined, 'local', undefined, dead)).toBe(T1)
  })
})
