import { describe, expect, it } from 'vitest'
import { proposedCommandOf } from '../src/client/plan-command.ts'

describe('proposedCommandOf', () => {
  it('reads the command and description from a running call', () => {
    expect(proposedCommandOf({ argsRaw: JSON.stringify({ command: 'df -h', description: 'check disk' }) }))
      .toEqual({ command: 'df -h', description: 'check disk' })
  })

  it('reads a settled call through its backfilled call head', () => {
    expect(proposedCommandOf({ call: { argsRaw: JSON.stringify({ command: 'ls -la' }) } }))
      .toEqual({ command: 'ls -la', description: '' })
  })

  it('trims the command and defaults a missing description', () => {
    expect(proposedCommandOf({ argsRaw: JSON.stringify({ command: '  uptime  ' }) }))
      .toEqual({ command: 'uptime', description: '' })
  })

  it.each([
    ['missing args', {}],
    ['empty args', { argsRaw: '' }],
    ['malformed json', { argsRaw: 'not json' }],
    ['blank command', { argsRaw: JSON.stringify({ command: '   ' }) }],
    ['non-string command', { argsRaw: JSON.stringify({ command: 42 }) }],
    ['missing command', { argsRaw: JSON.stringify({ description: 'no command' }) }],
  ])('returns undefined for %s', (_name, block) => {
    expect(proposedCommandOf(block)).toBeUndefined()
  })
})
