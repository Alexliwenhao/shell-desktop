import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { SessionHistory, type SessionHistoryProps } from '../src/client/SessionHistory.tsx'
import { LOCAL_GROUP_KEY, type SessionTreeGroup } from '../src/client/session-groups.ts'
import type { DesktopSettingsLocaleKey } from '../src/client/desktop-settings-locales.ts'

const t = (key: DesktopSettingsLocaleKey): string => key

function render(overrides: Partial<SessionHistoryProps> = {}): string {
  const props: SessionHistoryProps = {
    groups: [],
    collapsed: {},
    onToggle: vi.fn(),
    onNewSession: vi.fn(),
    onOpenSession: vi.fn(),
    onDeleteSession: vi.fn(),
    onFocusTerminal: vi.fn(),
    onCloseTerminal: vi.fn(),
    t,
    ...overrides,
  }
  return renderToStaticMarkup(createElement(SessionHistory, props))
}

const GROUPS: readonly SessionTreeGroup[] = [
  {
    key: 'h-alpha',
    title: 'Alpha',
    terminals: [{ id: 't-1', title: 'Alpha terminal', subtitle: 'root@alpha:22', dead: false, active: true, hostId: 'h-alpha' }],
    sessions: [
      { id: 's-1', title: 'Deploy plan', updatedAt: new Date(2026, 8, 18, 9, 5).getTime(), running: true, completed: false, blank: false },
    ],
  },
  {
    key: LOCAL_GROUP_KEY,
    title: 'Local',
    terminals: [],
    sessions: [{ id: 's-2', title: 'Local chat', updatedAt: 0, running: false, completed: true, blank: false }],
  },
]

describe('SessionHistory', () => {
  it('shows the empty hint and the new-session action without groups', () => {
    const markup = render()
    expect(markup).toContain('aishellSessionsNew')
    expect(markup).toContain('aishellSessionsEmpty')
  })

  it('renders one section per host with its terminals before its AI history', () => {
    const markup = render({ groups: GROUPS })

    expect(markup).toContain('data-aishell-session-group="h-alpha"')
    expect(markup).toContain('data-aishell-session-group="local"')
    expect(markup).toContain('>Alpha<')
    expect(markup).toContain('>Local<')
    expect(markup).toContain('Alpha terminal')
    expect(markup).toContain('root@alpha:22')
    expect(markup).toContain('Deploy plan')
    expect(markup).toContain('09-18 09:05')
    expect(markup).toContain('aishellSessionRunning')
    expect(markup).toContain('aishellSessionCompleted')
    expect(markup).toContain('aishellSessionCurrent')
  })

  it('marks the current AI session and hides a collapsed group body', () => {
    const markup = render({ groups: GROUPS, collapsed: { 'h-alpha': true }, currentSessionId: 's-2' })

    expect(markup).toContain('aria-expanded="false"')
    expect(markup).not.toContain('Alpha terminal')
    expect(markup).toContain('Local chat')
    expect(markup).toContain('data-current="true"')
  })

  it('offers a delete action on every history row', () => {
    const markup = render({ groups: GROUPS })

    // One armed-state label per session row; the action always carries the
    // target title so the destructive control is unambiguous.
    expect(markup).toContain('aria-label="aishellSessionDelete Deploy plan"')
    expect(markup).toContain('aria-label="aishellSessionDelete Local chat"')
    expect(markup).not.toContain('data-danger')
  })

  it('shows the search box and the tree while no query is active', () => {
    const markup = render({ groups: GROUPS })

    expect(markup).toContain('aishellSearchPlaceholder')
    expect(markup).toContain('data-aishell-session-group="h-alpha"')
    expect(markup).not.toContain('data-aishell-search-result')
    expect(markup).not.toContain('aishellSearchClear')
  })

  it('replaces the tree with ranked results while a query is active', () => {
    const markup = render({
      groups: GROUPS,
      search: {
        query: '磁盘',
        status: 'ready',
        items: [
          { id: 's-9', title: '磁盘巡检', label: '生产机', snippet: 'df -h 显示根分区 82% 已用' },
          { id: 's-8', title: 'Another chat', label: '本机' },
        ],
        hasMore: false,
        limit: 20,
      },
      onSearch: vi.fn(),
    })

    expect(markup).toContain('data-aishell-search-result="s-9"')
    expect(markup).toContain('磁盘巡检')
    expect(markup).toContain('df -h 显示根分区 82% 已用')
    expect(markup).toContain('aishellSearchClear')
    expect(markup).not.toContain('data-aishell-session-group="h-alpha"')
    expect(markup).not.toContain('Deploy plan')
  })

  it('names every search status: loading, error, empty and more-results', () => {
    const base = { query: 'x', items: [], hasMore: false, limit: 20 }

    expect(render({ search: { ...base, status: 'loading' } })).toContain('aishellSearchLoading')
    expect(render({ search: { ...base, status: 'error' } })).toContain('aishellSearchFailed')
    expect(render({ search: { ...base, status: 'error', message: 'gateway boom' } })).toContain('gateway boom')
    expect(render({ search: { ...base, status: 'ready' } })).toContain('aishellSearchEmpty')
    const more = render({
      search: { ...base, status: 'ready', items: [{ id: 's-1', title: 't', label: 'l' }], hasMore: true },
    })
    expect(more).toContain('aishellSearchMore')
  })
})
