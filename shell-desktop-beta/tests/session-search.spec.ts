import { describe, expect, it } from 'vitest'
import {
  SESSION_SEARCH_QUERY_MAX_CODE_UNITS,
  deriveSessionSearch,
  sanitizeSearchQuery,
  type SessionSearchSession,
} from '../src/client/session-search.ts'

const sessions: readonly SessionSearchSession[] = [
  { id: 's-1', title: '磁盘巡检', label: '生产机', updatedAt: 300, blank: false },
  { id: 's-2', title: 'nginx reload', label: '生产机', updatedAt: 200, blank: false },
  { id: 's-3', title: '本地调试', label: '本机', updatedAt: 100, blank: false },
  { id: 's-4', title: '空的', label: '本机', updatedAt: 400, blank: true },
  { id: 's-5', title: '子代理', label: '生产机', updatedAt: 500, blank: false, origin: 'subagent' },
]

describe('session search query sanitizing', () => {
  it('drops NUL characters and caps the query at the wire bound', () => {
    expect(sanitizeSearchQuery('a\u0000b')).toBe('ab')
    expect(sanitizeSearchQuery('x'.repeat(SESSION_SEARCH_QUERY_MAX_CODE_UNITS + 10)))
      .toHaveLength(SESSION_SEARCH_QUERY_MAX_CODE_UNITS)
  })

  it('never leaves half of a surrogate pair at the cut', () => {
    const pair = '\u{1F600}'
    const sanitized = sanitizeSearchQuery('a'.repeat(SESSION_SEARCH_QUERY_MAX_CODE_UNITS - 2) + pair + pair)

    expect(sanitized).toHaveLength(SESSION_SEARCH_QUERY_MAX_CODE_UNITS)
    expect(sanitized.endsWith(pair)).toBe(true)
  })
})

describe('AI-Shell session search derivation', () => {
  it('returns nothing for a blank query', () => {
    expect(deriveSessionSearch({ sessions, query: '   ', limit: 20 })).toEqual({ items: [], hasMore: false })
  })

  it('matches titles case-insensitively', () => {
    const page = deriveSessionSearch({ sessions, query: 'NGINX', limit: 20 })

    expect(page.items.map(item => item.id)).toEqual(['s-2'])
  })

  it('matches the host label too', () => {
    const page = deriveSessionSearch({ sessions, query: '本机', limit: 20 })

    expect(page.items.map(item => item.id)).toEqual(['s-3'])
  })

  it('never matches blank, archived or subagent rows', () => {
    expect(deriveSessionSearch({ sessions, query: '空', limit: 20 }).items).toEqual([])
    expect(deriveSessionSearch({ sessions, query: '子代理', limit: 20 }).items).toEqual([])
    expect(deriveSessionSearch({ sessions, query: '磁盘', archivedSessionIds: ['s-1'], limit: 20 }).items).toEqual([])
  })

  it('appends content matches after local rows with their snippet', () => {
    const page = deriveSessionSearch({
      sessions,
      query: '磁盘',
      hits: [
        { sessionId: 's-2', snippet: '  nginx 配置里提到\n磁盘告警  ' },
        { sessionId: 's-3', snippet: '' },
      ],
      limit: 20,
    })

    expect(page.items.map(item => item.id)).toEqual(['s-1', 's-2', 's-3'])
    expect(page.items[0]).not.toHaveProperty('snippet')
    expect(page.items[1]?.snippet).toBe('nginx 配置里提到 磁盘告警')
    // A content hit without an excerpt still lists the session, without a snippet.
    expect(page.items[2]).not.toHaveProperty('snippet')
  })

  it('keeps one row when a session matches locally and by content', () => {
    const page = deriveSessionSearch({
      sessions,
      query: 'nginx',
      hits: [{ sessionId: 's-2', snippet: 'reload 完成' }],
      limit: 20,
    })

    expect(page.items).toEqual([{ id: 's-2', title: 'nginx reload', label: '生产机', snippet: 'reload 完成' }])
  })

  it('bounds the page and reports more', () => {
    const page = deriveSessionSearch({ sessions, query: '机', limit: 1 })

    expect(page.items).toHaveLength(1)
    expect(page.items[0]?.id).toBe('s-1')
    expect(page.hasMore).toBe(true)
    expect(deriveSessionSearch({ sessions, query: '磁盘', hasMore: true, limit: 20 }).hasMore).toBe(true)
  })

  it('ignores content hits that are not visible sessions', () => {
    const page = deriveSessionSearch({
      sessions,
      query: '无',
      hits: [{ sessionId: 'missing' }, { sessionId: 's-4' }],
      limit: 20,
    })

    expect(page.items).toEqual([])
  })
})
