/**
 * AI-Shell root: a MobaXterm-style partition realized on the Desktop layout's
 * seats — activity rail, a switchable navigation column (hosts / files /
 * official sessions), the xterm terminal workbench, and the AI conversation as
 * the right column.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FolderTree, ListTree, MessageSquare, PanelLeft, Server, Settings } from 'lucide-react'
import type { PropsRenderSlots, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from './contracts.ts'
import type { DesktopSettingsLocaleKey } from './desktop-settings-locales.ts'
import type { DesktopClientPlatform } from './environment.ts'
import { FilePanel } from './FilePanel.tsx'
import { HostPanel } from './HostPanel.tsx'
import { SessionHistory } from './SessionHistory.tsx'
import { TerminalWorkspace, type TerminalSessionEntry, type TerminalWorkspaceHandle } from './TerminalWorkspace.tsx'
import type { RemoteBridgeApi, RemoteHost } from './remote-api.ts'
import { buildSessionTree } from './session-groups.ts'
import { AISHELL_RAIL_WIDTH, DesktopLayoutState } from './layout-state.ts'

/** Left navigation views offered by the activity rail. */
type AishellLeftView = 'hosts' | 'files' | 'sessions'

/** The slice of the workspace snapshot this frame reads. */
interface WorkspaceArchiveSnapshot {
  readonly archivedSessionIds: readonly string[]
}

/** Global selector hook contributed by the workspace client plugin. */
type WorkspaceArchiveHook = <Selected>(
  selector: (snapshot: WorkspaceArchiveSnapshot) => Selected,
) => Selected

/**
 * Fallback for a composition without the workspace client plugin: no session is
 * archived there, so the tree filters nothing. Module-level for a stable hook
 * identity, because hook order must not depend on which composition is loaded.
 */
function useNoWorkspaceArchive<Selected>(
  selector: (snapshot: WorkspaceArchiveSnapshot) => Selected,
): Selected {
  return selector({ archivedSessionIds: [] })
}

/** Private values assembled by the AI-Shell root registration. */
export interface AishellFrameInjected {
  /** Desktop-owned panel state exposed through the standard layout service. */
  layout: DesktopLayoutState
  /** Host platform controlling native caption spacing. */
  platform: DesktopClientPlatform
  /** SSH/PTY bridge handed to the terminal workspace and host panel. */
  remote: RemoteBridgeApi
  /** Desktop settings dictionary bound to the current locale. */
  t: (key: DesktopSettingsLocaleKey) => string
  /**
   * Start a new AI session. With `bindKey` the new session is bound to that
   * terminal (its saved host, or `local`) so switching back to the terminal
   * reopens it; without one it is a standalone session.
   */
  newSession(bindKey?: string): void
  /** Open the AI session bound to one terminal key (a host id, or `local`). */
  openTerminalSession(key: string, terminalId?: string): void
  /** Open an existing AI session, e.g. from a history row. */
  openSession(sessionId: string): void
  /** Remove one conversation from the session history; rejects when the Host refuses. */
  deleteSession(sessionId: string): Promise<void>
  /** Append selected terminal text to the conversation draft as a reference. */
  quoteTerminalSelection(quote: { readonly label: string; readonly text: string }): void
  /**
   * Observe resolved product-theme changes. xterm keeps the palette it was
   * constructed with, so live terminals must be repainted when the theme
   * switches; the subscription returns its disposer.
   */
  subscribeTheme(listener: () => void): () => void
}

/** AI-Shell root slot props. */
export type AishellFrameProps = PropsRuntime<'root'>
  & PropsRenderSlots<'sidebar' | 'main' | 'shell.overlay'>
  & AishellFrameInjected

const LEFT_DEFAULT = 300
/** Registered key of the official settings main panel. */
const SETTINGS_PANEL_ID = 'settings' as MainPanelId
const LEFT_MIN = 220
const LEFT_MAX = 460
const CHAT_DEFAULT = 380
const CHAT_MIN = 300
const CHAT_MAX = 640

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function RailButton(props: {
  readonly label: string
  readonly active?: boolean
  readonly onClick: () => void
  readonly children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className="dshAishellRailButton"
      data-aishell-rail-button=""
      data-active={props.active || undefined}
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}

function ActivityRail(props: {
  readonly view: AishellLeftView
  readonly chatVisible: boolean
  readonly leftVisible: boolean
  readonly onView: (view: AishellLeftView) => void
  readonly onToggleChat: () => void
  readonly onToggleLeft: () => void
  readonly t: (key: DesktopSettingsLocaleKey) => string
}) {
  return (
    <nav className="dshAishellRail" data-aishell-rail="" aria-label={props.t('aishellRail')}>
      <div className="dshAishellRailGroup">
        <RailButton label={props.t('aishellRailSessions')} active={props.leftVisible && props.view === 'sessions'} onClick={() => { props.onView('sessions') }}>
          <ListTree aria-hidden="true" />
        </RailButton>
        <RailButton label={props.t('aishellRailHosts')} active={props.leftVisible && props.view === 'hosts'} onClick={() => { props.onView('hosts') }}>
          <Server aria-hidden="true" />
        </RailButton>
        <RailButton label={props.t('aishellRailFiles')} active={props.leftVisible && props.view === 'files'} onClick={() => { props.onView('files') }}>
          <FolderTree aria-hidden="true" />
        </RailButton>
        <RailButton label={props.t('aishellRailAi')} active={props.chatVisible} onClick={props.onToggleChat}>
          <MessageSquare aria-hidden="true" />
        </RailButton>
      </div>
      <div className="dshAishellRailGroup">
        <RailButton label={props.t('aishellRailNavigation')} active={!props.leftVisible} onClick={props.onToggleLeft}>
          <PanelLeft aria-hidden="true" />
        </RailButton>
      </div>
    </nav>
  )
}

/** AI-Shell owner: rail, navigation column, terminal workbench, AI conversation. */
export function AishellFrame(props: AishellFrameProps) {
  const { layout, platform, remote, renderSlot, t, usePanelInfo, useSessions, newSession, openTerminalSession, openSession, deleteSession, quoteTerminalSelection, subscribeTheme } = props
  const frameRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<TerminalWorkspaceHandle>(null)
  const [viewport, setViewport] = useState(() => window.innerWidth)
  const [leftView, setLeftView] = useState<AishellLeftView>('sessions')
  const [leftVisible, setLeftVisible] = useState(true)
  const [chatVisible, setChatVisible] = useState(true)
  const [leftWidth, setLeftWidth] = useState(LEFT_DEFAULT)
  const [chatWidth, setChatWidth] = useState(CHAT_DEFAULT)
  const [dragging, setDragging] = useState<'left' | 'chat'>()
  const dragBase = useRef(0)
  const [sessionTabs, setSessionTabs] = useState<readonly TerminalSessionEntry[]>([])
  const [hosts, setHosts] = useState<readonly RemoteHost[]>([])
  const [sessionHosts, setSessionHosts] = useState<Readonly<Record<string, string>>>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Readonly<Record<string, boolean>>>({})
  const sessionList = useSessions(state => state)
  const currentSessionId = sessionList.current
  // The Host archive set is the authority for deletions: an archived session
  // leaves every grouping surface, so this panel filters it out of the tree. The
  // hook arrives as a global standard prop from the workspace client plugin.
  const useWorkspaceArchive = (props as { readonly useWorkspaces?: WorkspaceArchiveHook }).useWorkspaces
    ?? useNoWorkspaceArchive
  const archivedSessionIds = useWorkspaceArchive(snapshot => snapshot.archivedSessionIds)

  useEffect(() => {
    const element = frameRef.current
    if (element === null) return
    let raf: number | null = null
    const observer = new ResizeObserver(() => {
      raf ??= requestAnimationFrame(() => {
        raf = null
        const width = element.getBoundingClientRect().width
        if (width > 0) setViewport(width)
      })
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [])

  const collapsed = !leftVisible
  const collapsedRailWidth = 0
  const resolvedLeft = collapsed ? collapsedRailWidth : clamp(leftWidth, LEFT_MIN, LEFT_MAX)
  const resolvedChat = chatVisible ? clamp(chatWidth, CHAT_MIN, Math.min(CHAT_MAX, Math.max(CHAT_MIN, viewport - 520))) : 0
  useEffect(() => { layout.setNarrow(viewport < 1024) }, [layout, viewport])

  const onDragStart = useCallback((side: 'left' | 'chat', base: number) => {
    dragBase.current = base
    setDragging(side)
  }, [])
  const onDragMove = useCallback((side: 'left' | 'chat', dx: number) => {
    if (side === 'left') setLeftWidth(clamp(dragBase.current + dx, LEFT_MIN, LEFT_MAX))
    else setChatWidth(clamp(dragBase.current - dx, CHAT_MIN, CHAT_MAX))
  }, [])
  const onDragEnd = useCallback(() => { setDragging(undefined) }, [])

  const leftBase = useRef(0)
  const chatBase = useRef(0)

  const conversation = renderSlot('main', {}, { entryKey: 'conversation' })
  const activePanelId = usePanelInfo(info => info.activePanelId)
  const openSettings = useCallback(() => {
    // The official settings shell lives at the bottom of the sidebar and opens
    // its dialog from its own trigger. The AI shell replaces that trigger with
    // this footer button (the original stays in the DOM, visually hidden), so
    // the click is forwarded to it after the sessions view is mounted.
    setLeftView('sessions')
    setLeftVisible(true)
    const attempt = (retriesLeft: number): void => {
      const trigger = document.querySelector<HTMLElement>(
        '[class*="xmPW5W_trigger"]:not([class*="triggerLabel"]):not([class*="triggerRow"])',
      )
      if (trigger !== null) {
        trigger.click()
        return
      }
      if (retriesLeft > 0) window.setTimeout(() => { attempt(retriesLeft - 1) }, 80)
    }
    window.setTimeout(() => { attempt(12) }, 60)
  }, [])
  const activeTerminal = sessionTabs.find(session => session.active)
  const activeHostId = activeTerminal?.hostId
  const activeTerminalKey = activeTerminal === undefined ? undefined : (activeTerminal.hostId ?? 'local')

  const refreshHistory = useCallback(async (): Promise<void> => {
    try {
      const [nextHosts, nextSessionHosts] = await Promise.all([
        remote.listHosts(),
        remote.listSessionHosts(),
      ])
      setHosts(nextHosts)
      setSessionHosts(nextSessionHosts)
    } catch {
      // The bridge may not answer yet; the next session-list change retries.
    }
  }, [remote])

  useEffect(() => {
    if (leftView !== 'sessions') return
    void refreshHistory()
  }, [leftView, refreshHistory, sessionList.ids])

  const groups = useMemo(() => buildSessionTree({
    hosts: hosts.map(host => ({ id: host.id, name: host.name })),
    terminals: sessionTabs,
    sessions: sessionList.ids.flatMap(id => {
      const summary = sessionList.byId[id]
      if (summary === undefined) return []
      return [{
        id: summary.id,
        title: summary.displayTitle,
        updatedAt: summary.updatedAt,
        running: summary.running,
        completed: summary.completed === true,
        blank: summary.blank,
        ...(summary.origin === undefined ? {} : { origin: summary.origin }),
      }]
    }),
    sessionHosts,
    ...(currentSessionId === undefined ? {} : { currentSessionId }),
    archivedSessionIds,
    localLabel: t('aishellSessionsLocal'),
  }), [hosts, sessionTabs, sessionList, sessionHosts, currentSessionId, archivedSessionIds, t])

  const toggleGroup = useCallback((key: string): void => {
    setCollapsedGroups(current => ({ ...current, [key]: current[key] !== true }))
  }, [])

  return (
    <div
      ref={frameRef}
      className="dshAishellFrame"
      data-desktop-mode="aishell"
      data-desktop-platform={platform}
      data-dragging={dragging || undefined}
      style={{ gridTemplateColumns: `${AISHELL_RAIL_WIDTH}px ${resolvedLeft}px minmax(0, 1fr) ${resolvedChat}px` }}
    >
      {platform !== 'linux' && <div className="dshAishellCaptionRow" data-aishell-caption="" aria-hidden="true" />}
      <ActivityRail
        view={leftView}
        leftVisible={leftVisible}
        chatVisible={chatVisible}
        onView={setLeftView}
        onToggleChat={() => { setChatVisible(value => !value) }}
        onToggleLeft={() => { setLeftVisible(value => !value) }}
        t={t}
      />

      {leftVisible && (
        <aside className="dshAishellLeftPanel" data-aishell-left-panel={leftView}>
          <header className="dshAishellPanelHeader">
            {leftView === 'hosts' ? t('aishellRailHosts') : leftView === 'files' ? t('aishellRailFiles') : t('aishellRailSessions')}
          </header>
          {leftView === 'hosts' && (
            <HostPanel
              api={remote}
              onOpenHost={host => {
                terminalRef.current?.openHost(host)
              }}
              onOpenLocal={() => { terminalRef.current?.openLocal() }}
            />
          )}
          {leftView === 'files' && (
            <FilePanel api={remote} {...(activeHostId === undefined ? {} : { hostId: activeHostId })} />
          )}
          {leftView === 'sessions' && (
            <>
              <SessionHistory
                groups={groups}
                collapsed={collapsedGroups}
                {...(currentSessionId === undefined ? {} : { currentSessionId })}
                onToggle={toggleGroup}
                onNewSession={() => { newSession(activeTerminalKey) }}
                onOpenSession={openSession}
                onDeleteSession={deleteSession}
                onFocusTerminal={id => { terminalRef.current?.focus(id) }}
                onCloseTerminal={id => { terminalRef.current?.close(id) }}
                t={t}
              />
              {/* The official sidebar stays mounted off-screen so its hidden
                  settings trigger keeps answering the footer button's click. */}
              <div className="dshAishellUpstreamSidebar" data-hidden="">
                {renderSlot('sidebar', { collapsed: false, width: resolvedLeft })}
              </div>
            </>
          )}
          <div className="dshAishellPanelFooter">
            <button type="button" className="dshAishellPanelAction" onClick={openSettings} data-active={activePanelId === SETTINGS_PANEL_ID || undefined}>
              <Settings aria-hidden="true" />
              <span>{t('aishellRailSettings')}</span>
            </button>
          </div>
        </aside>
      )}

      <main className="dshAishellWorkspace">
        <div className="dshAishellWorkspaceStack" data-hidden={activePanelId !== null || undefined}>
          <TerminalWorkspace
            api={remote}
            ref={terminalRef}
            onSessions={setSessionTabs}
            onQuote={quoteTerminalSelection}
            onActivate={(key, terminalId) => { openTerminalSession(key, terminalId) }}
            subscribeTheme={subscribeTheme}
            quoteLabel={t('aishellQuoteSelection')}
          />
        </div>
        {activePanelId !== null && (
          <div className="dshAishellPanelSurface" data-aishell-panel-surface={activePanelId}>
            {renderSlot('main', {}, { entryKey: activePanelId })}
          </div>
        )}
      </main>

      {chatVisible && (
        <aside className="dshAishellChatColumn" data-aishell-chat="">
          <header className="dshAishellPanelHeader">{t('aishellRailAi')}</header>
          <div className="dshAishellChatBody">{conversation}</div>
        </aside>
      )}

      <div className="dshDesktopOverlay" data-shell-overlay>
        {renderSlot('shell.overlay', {})}
      </div>

      {leftVisible && (
        <div
          className="dshDesktopResizeHandle"
          data-side="sidebar"
          data-dragging={dragging === 'left' || undefined}
          style={{ left: AISHELL_RAIL_WIDTH + resolvedLeft }}
          onPointerDown={event => {
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            leftBase.current = resolvedLeft
            onDragStart('left', leftBase.current)
          }}
          onPointerMove={event => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
            onDragMove('left', event.clientX - (AISHELL_RAIL_WIDTH + leftBase.current))
          }}
          onPointerUp={event => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
            event.currentTarget.releasePointerCapture(event.pointerId)
            onDragEnd()
          }}
        />
      )}
      {chatVisible && (
        <div
          className="dshDesktopResizeHandle"
          data-side="rightbar"
          data-dragging={dragging === 'chat' || undefined}
          style={{ left: viewport - resolvedChat }}
          onPointerDown={event => {
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            chatBase.current = resolvedChat
            onDragStart('chat', chatBase.current)
          }}
          onPointerMove={event => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
            onDragMove('chat', event.clientX - (viewport - chatBase.current))
          }}
          onPointerUp={event => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
            event.currentTarget.releasePointerCapture(event.pointerId)
            onDragEnd()
          }}
        />
      )}
    </div>
  )
}
