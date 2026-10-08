// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionHistory, type SessionHistoryProps } from '../src/client/SessionHistory.tsx'
import { LOCAL_GROUP_KEY, type SessionTreeGroup } from '../src/client/session-groups.ts'
import type { DesktopSettingsLocaleKey } from '../src/client/desktop-settings-locales.ts'

const t = (key: DesktopSettingsLocaleKey): string => key

const GROUPS: readonly SessionTreeGroup[] = [
  {
    key: 'h-alpha',
    title: 'Alpha',
    terminals: [{ id: 't-1', title: 'Alpha terminal', subtitle: 'root@alpha:22', dead: false, active: true, hostId: 'h-alpha' }],
    sessions: [
      { id: 's-1', title: 'Deploy plan', updatedAt: 0, running: false, completed: false, blank: false },
      { id: 's-2', title: 'Disk check', updatedAt: 0, running: false, completed: false, blank: false },
    ],
  },
  {
    key: LOCAL_GROUP_KEY,
    title: 'Local',
    terminals: [],
    sessions: [{ id: 's-3', title: 'Local chat', updatedAt: 0, running: false, completed: false, blank: false }],
  },
]

declare global {
  // React only batches `act` updates while this flag is set.
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find(button => button.textContent === text)
}

describe('session batch deletion', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => { root.unmount() })
    container.remove()
  })

  async function mount(): Promise<{ onDeleteSessions: ReturnType<typeof vi.fn> }> {
    const onDeleteSessions = vi.fn(async () => {})
    const props: SessionHistoryProps = {
      groups: GROUPS,
      collapsed: {},
      onToggle: vi.fn(),
      onNewSession: vi.fn(),
      onOpenSession: vi.fn(),
      onDeleteSessions,
      onFocusTerminal: vi.fn(),
      onCloseTerminal: vi.fn(),
      t,
    }
    await act(async () => { root.render(createElement(SessionHistory, props)) })
    return { onDeleteSessions }
  }

  it('selects several sessions and deletes them after one confirmation', async () => {
    const { onDeleteSessions } = await mount()
    await act(async () => { buttonByText(container, 'aishellSessionsBatch')?.click() })

    const boxes = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
    expect(boxes).toHaveLength(3)
    await act(async () => { boxes[0]?.click() })
    await act(async () => { boxes[1]?.click() })
    await act(async () => { buttonByText(container, 'aishellSessionsDeleteSelected (2)')?.click() })

    expect(container.querySelector('[data-aishell-confirm]')?.textContent).toContain('aishellSessionsDeleteSelectedBody')
    await act(async () => { buttonByText(container, 'aishellDialogDelete')?.click() })

    expect(onDeleteSessions).toHaveBeenCalledWith(['s-1', 's-2'])
    expect(container.querySelector('[data-aishell-confirm]')).toBeNull()
  })

  it('deletes one row through the shared dialog', async () => {
    const { onDeleteSessions } = await mount()

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="aishellSessionDelete Disk check"]')?.click()
    })
    expect(container.querySelector('[data-aishell-confirm]')?.textContent).toContain('aishellSessionDeleteBody')

    await act(async () => { buttonByText(container, 'aishellDialogDelete')?.click() })

    expect(onDeleteSessions).toHaveBeenCalledWith(['s-2'])
  })

  it('cancelling the batch dialog keeps the selection', async () => {
    const { onDeleteSessions } = await mount()
    await act(async () => { buttonByText(container, 'aishellSessionsBatch')?.click() })
    await act(async () => { container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click() })
    await act(async () => { buttonByText(container, 'aishellSessionsDeleteSelected (1)')?.click() })
    await act(async () => { buttonByText(container, 'aishellDialogCancel')?.click() })

    expect(onDeleteSessions).not.toHaveBeenCalled()
    expect(container.querySelector('[data-aishell-confirm]')).toBeNull()
  })

  it('select-all covers every session and the footer count follows', async () => {
    await mount()
    await act(async () => { buttonByText(container, 'aishellSessionsBatch')?.click() })
    await act(async () => { buttonByText(container, 'aishellSessionsBatchSelectAll')?.click() })

    expect(buttonByText(container, 'aishellSessionsDeleteSelected (3)')).toBeDefined()
  })
})
