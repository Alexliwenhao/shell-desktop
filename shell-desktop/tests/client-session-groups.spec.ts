import { describe, expect, it } from 'vitest'
import {
  LOCAL_GROUP_KEY,
  buildSessionTree,
  formatSessionTimestamp,
  type SessionTreeSession,
  type SessionTreeTerminal,
} from '../src/client/session-groups.ts'

const HOSTS = [
  { id: 'h-alpha', name: 'Alpha' },
  { id: 'h-beta', name: 'Beta' },
]

function terminal(id: string, hostId?: string): SessionTreeTerminal {
  return {
    id,
    title: id,
    subtitle: hostId ?? 'local',
    dead: false,
    active: false,
    ...(hostId === undefined ? {} : { hostId }),
  }
}

function session(id: string, updatedAt: number, extra: Partial<SessionTreeSession> = {}): SessionTreeSession {
  return {
    id,
    title: id,
    updatedAt,
    running: false,
    completed: false,
    blank: false,
    ...extra,
  }
}

describe('buildSessionTree archived sessions', () => {
  it('drops archived sessions from every group', () => {
    const groups = buildSessionTree({
      hosts: [{ id: 'h-1', name: 'Alpha' }],
      terminals: [],
      sessions: [
        { id: 's-keep', title: 'Keep', updatedAt: 20, running: false, completed: true, blank: false },
        { id: 's-gone', title: 'Gone', updatedAt: 30, running: false, completed: true, blank: false },
      ],
      sessionHosts: { 's-gone': 'h-1', 's-keep': 'h-1' },
      archivedSessionIds: ['s-gone'],
      localLabel: 'Local',
    })

    expect(groups.flatMap(group => group.sessions.map(session => session.id))).toEqual(['s-keep'])
  })
})

describe('buildSessionTree', () => {
  it('groups terminals and AI history by host, hosts first and local last', () => {
    const groups = buildSessionTree({
      hosts: HOSTS,
      terminals: [terminal('t-alpha', 'h-alpha'), terminal('t-local')],
      sessions: [
        session('s-alpha', 100),
        session('s-beta', 200),
        session('s-orphan', 300),
      ],
      sessionHosts: { 's-alpha': 'h-alpha', 's-beta': 'h-beta', 's-orphan': 'deleted-host' },
      localLabel: 'Local',
    })

    expect(groups.map(group => group.key)).toEqual(['h-alpha', 'h-beta', LOCAL_GROUP_KEY])
    expect(groups.map(group => group.title)).toEqual(['Alpha', 'Beta', 'Local'])
    expect(groups[0]!.terminals.map(row => row.id)).toEqual(['t-alpha'])
    expect(groups[0]!.sessions.map(row => row.id)).toEqual(['s-alpha'])
    expect(groups[1]!.sessions.map(row => row.id)).toEqual(['s-beta'])
    expect(groups[2]!.terminals.map(row => row.id)).toEqual(['t-local'])
    expect(groups[2]!.sessions.map(row => row.id)).toEqual(['s-orphan'])
  })

  it('drops hosts and the local group when they have no rows', () => {
    const groups = buildSessionTree({
      hosts: HOSTS,
      terminals: [],
      sessions: [session('s-beta', 100)],
      sessionHosts: { 's-beta': 'h-beta' },
      localLabel: 'Local',
    })

    expect(groups.map(group => group.key)).toEqual(['h-beta'])
  })

  it('sorts AI history newest first inside a group and keeps terminal order', () => {
    const groups = buildSessionTree({
      hosts: [{ id: 'h', name: 'H' }],
      terminals: [terminal('t-1', 'h'), terminal('t-2', 'h')],
      sessions: [session('older', 10), session('newer', 30), session('middle', 20)],
      sessionHosts: { older: 'h', newer: 'h', middle: 'h' },
      localLabel: 'Local',
    })

    expect(groups[0]!.sessions.map(row => row.id)).toEqual(['newer', 'middle', 'older'])
    expect(groups[0]!.terminals.map(row => row.id)).toEqual(['t-1', 't-2'])
  })

  it('hides subagent sessions and blank sessions that are not current', () => {
    const groups = buildSessionTree({
      hosts: [{ id: 'h', name: 'H' }],
      terminals: [],
      sessions: [
        session('sub', 40, { origin: 'subagent' }),
        session('blank', 30, { blank: true }),
        session('current-blank', 20, { blank: true }),
        session('normal', 10),
      ],
      sessionHosts: { sub: 'h', blank: 'h', 'current-blank': 'h', normal: 'h' },
      currentSessionId: 'current-blank',
      localLabel: 'Local',
    })

    expect(groups[0]!.sessions.map(row => row.id)).toEqual(['current-blank', 'normal'])
  })

  it('falls back to local for a terminal whose host was deleted', () => {
    const groups = buildSessionTree({
      hosts: HOSTS,
      terminals: [terminal('t-gone', 'deleted-host')],
      sessions: [],
      sessionHosts: {},
      localLabel: 'Local',
    })

    expect(groups).toHaveLength(1)
    expect(groups[0]!.key).toBe(LOCAL_GROUP_KEY)
    expect(groups[0]!.terminals.map(row => row.id)).toEqual(['t-gone'])
  })

  it('returns no groups when there is nothing to show', () => {
    expect(buildSessionTree({
      hosts: HOSTS,
      terminals: [],
      sessions: [],
      sessionHosts: {},
      localLabel: 'Local',
    })).toEqual([])
  })
})

describe('formatSessionTimestamp', () => {
  it('formats a positive epoch as a compact local timestamp', () => {
    const date = new Date(2026, 8, 18, 9, 5)
    expect(formatSessionTimestamp(date.getTime())).toBe('09-18 09:05')
  })

  it('returns an empty string without a usable time', () => {
    expect(formatSessionTimestamp(0)).toBe('')
    expect(formatSessionTimestamp(Number.NaN)).toBe('')
  })
})
