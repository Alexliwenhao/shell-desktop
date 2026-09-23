/**
 * AI-Shell terminal workspace: one xterm.js tab per shell session served by the
 * Desktop remote bridge. Sessions are polled over the private loopback routes
 * (the WaLiSSH terminal model), so switching tabs keeps every session alive.
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Plus, TextQuote, X } from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { XTERM_CSS } from './xterm-styles.ts'
import { documentTerminalTheme } from './terminal-theme.ts'
import type { RemoteBridgeApi, RemoteHost } from './remote-api.ts'

/** One open terminal session as listed by the AI-Shell sessions panel. */
export interface TerminalSessionEntry {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  readonly dead: boolean
  readonly active: boolean
  /** Saved SSH host this session runs on; absent for local shells. */
  readonly hostId?: string
}

/** Imperative terminal actions the AI-Shell frame drives from the rail and panels. */
export interface TerminalWorkspaceHandle {
  /** Open a shell session on this machine. */
  openLocal(): void
  /** Open a shell session on a saved SSH host. */
  openHost(host: RemoteHost): void
  /** Focus an open session's tab. */
  focus(id: string): void
  /** Close an open session. */
  close(id: string): void
}

interface TerminalTabState {
  id: string
  title: string
  subtitle: string
  dead: boolean
  hostId?: string
}

interface TabRuntime {
  sessionId: string
  term: Terminal
  fit: FitAddon
  element: HTMLDivElement
  timer: number
}

const POLL_INTERVAL_MS = 60
const XTERM_STYLE_ID = 'dsh-aishell-xterm-styles'
const FALLBACK_COLUMNS = 100
const FALLBACK_ROWS = 28

/** Install the inlined xterm stylesheet once per document. */
function installXtermStyles(): void {
  if (document.getElementById(XTERM_STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = XTERM_STYLE_ID
  style.textContent = XTERM_CSS
  document.head.appendChild(style)
}

/** One non-empty terminal selection offered for quotation into the conversation. */
interface TerminalQuote {
  /** Title of the terminal the selection came from. */
  readonly label: string
  readonly text: string
}

/** Terminal workbench with tab management and session polling. */
export const TerminalWorkspace = forwardRef<TerminalWorkspaceHandle, {
  /** Remote bridge facade. */
  readonly api: RemoteBridgeApi
  /** Reports the open sessions for the left-panel session list. */
  readonly onSessions?: (sessions: readonly TerminalSessionEntry[]) => void
  /** Receives the selected terminal text the user wants to reference in the conversation. */
  readonly onQuote?: (quote: TerminalQuote) => void
  /**
   * Reports every user-driven activation of a terminal, keyed by its saved host
   * (or `local`). Fires on repeats too, so the conversation can return to the
   * session bound to the terminal the user just clicked.
   */
  readonly onActivate?: (key: string) => void
  /**
   * Observe product-theme changes. xterm keeps the palette it was constructed
   * with, so every live terminal is repainted when the theme switches; the
   * subscription returns its disposer.
   */
  readonly subscribeTheme?: (listener: () => void) => () => void
  /** Localized label of the quote action. */
  readonly quoteLabel: string
}>(function TerminalWorkspace({ api, onSessions, onQuote, onActivate, subscribeTheme, quoteLabel }, ref) {
  const [tabs, setTabs] = useState<readonly TerminalTabState[]>([])
  const [activeId, setActiveId] = useState<string>()
  const [status, setStatus] = useState('准备就绪 · 点击“本地终端”或左侧主机开始')
  const [error, setError] = useState<string>()
  const [quote, setQuote] = useState<TerminalQuote>()
  const runtimes = useRef(new Map<string, TabRuntime>())
  const stackRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<string>()
  activeRef.current = activeId
  const tabsRef = useRef<readonly TerminalTabState[]>([])
  tabsRef.current = tabs

  /** Make one tab active and report its terminal key to the frame. */
  const activate = useCallback((tab: TerminalTabState | undefined): void => {
    if (tab === undefined) return
    setActiveId(tab.id)
    onActivate?.(tab.hostId ?? 'local')
  }, [onActivate])

  useEffect(() => { installXtermStyles() }, [])

  // The palette is derived from the presenter's color-scheme state, so a theme
  // switch repaints every live terminal instead of leaving the previous
  // background and foreground pair in place.
  useEffect(() => {
    if (subscribeTheme === undefined) return
    return subscribeTheme(() => {
      const theme = documentTerminalTheme()
      for (const runtime of runtimes.current.values()) runtime.term.options.theme = theme
    })
  }, [subscribeTheme])

  const applyActive = useCallback((id: string | undefined): void => {
    for (const [tabId, runtime] of runtimes.current) {
      const isActive = tabId === id
      runtime.element.style.display = isActive ? 'block' : 'none'
      if (!isActive) continue
      try {
        runtime.fit.fit()
        void api.resizeShell(runtime.sessionId, runtime.term.cols, runtime.term.rows)
        void api.activateShell(runtime.sessionId)
      } catch {
        // The stack had no measurable size yet; the next resize settles it.
      }
      runtime.term.focus()
    }
  }, [api])

  useEffect(() => {
    // Selections belong to the terminal the user is looking at; switching tabs
    // retires the previous one's offer.
    setQuote(undefined)
    applyActive(activeId)
  }, [activeId, applyActive])

  useEffect(() => {
    onSessions?.(tabs.map(tab => ({
      id: tab.id,
      title: tab.title,
      subtitle: tab.subtitle,
      dead: tab.dead,
      active: tab.id === activeId,
      ...(tab.hostId === undefined ? {} : { hostId: tab.hostId }),
    })))
  }, [tabs, activeId, onSessions])

  useEffect(() => {
    const stack = stackRef.current
    if (stack === null) return
    let raf: number | null = null
    const observer = new ResizeObserver(() => {
      raf ??= requestAnimationFrame(() => {
        raf = null
        const id = activeRef.current
        if (id === undefined) return
        const runtime = runtimes.current.get(id)
        if (runtime === undefined) return
        try {
          runtime.fit.fit()
          void api.resizeShell(runtime.sessionId, runtime.term.cols, runtime.term.rows)
        } catch {
          // Ignore transient zero-size measurements during layout.
        }
      })
    })
    observer.observe(stack)
    return () => {
      observer.disconnect()
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [api])

  useEffect(() => () => {
    for (const runtime of runtimes.current.values()) {
      window.clearInterval(runtime.timer)
      runtime.term.dispose()
      runtime.element.remove()
    }
    runtimes.current.clear()
  }, [])

  const closeTab = useCallback((id: string): void => {
    const runtime = runtimes.current.get(id)
    if (runtime !== undefined) {
      window.clearInterval(runtime.timer)
      void api.closeShell(runtime.sessionId).catch(() => {})
      runtime.term.dispose()
      runtime.element.remove()
      runtimes.current.delete(id)
    }
    const remaining = tabsRef.current.filter(tab => tab.id !== id)
    setTabs(remaining)
    if (activeRef.current === id) activate(remaining.at(-1))
  }, [api, activate])

  const openTab = useCallback(async (host?: RemoteHost): Promise<void> => {
    setError(undefined)
    try {
      const sessionId = await api.openShell(host === undefined
        ? { cols: FALLBACK_COLUMNS, rows: FALLBACK_ROWS }
        : { hostId: host.id, cols: FALLBACK_COLUMNS, rows: FALLBACK_ROWS })
      const id = `${host?.id ?? 'local'}:${sessionId.slice(0, 8)}`
      const title = host?.name ?? '本地终端'
      const subtitle = host === undefined ? 'local' : `${host.username}@${host.host}`
      const element = document.createElement('div')
      element.className = 'dshAishellTerminalHost'
      const term = new Terminal({
        fontSize: 12.5,
        fontFamily: 'Consolas, "Cascadia Mono", "Courier New", monospace',
        cursorBlink: true,
        scrollback: 5000,
        convertEol: true,
        theme: documentTerminalTheme(),
      })
      const fit = new FitAddon()
      term.loadAddon(fit)
      term.open(element)
      stackRef.current?.appendChild(element)
      term.onData(input => { void api.writeShell(sessionId, input).catch(() => {}) })
      term.onSelectionChange(() => {
        if (activeRef.current !== id) return
        const text = term.getSelection()
        setQuote(text.trim() === '' ? undefined : { label: title, text })
      })
      const timer = window.setInterval(() => {
        void api.readShell(sessionId).then(({ output, alive }) => {
          if (output !== '') term.write(output)
          if (!alive) {
            window.clearInterval(timer)
            term.write('\r\n\x1b[2m[会话已结束]\x1b[0m\r\n')
            setTabs(current => current.map(tab => tab.id === id ? { ...tab, dead: true } : tab))
          }
        }).catch(() => { /* one failed poll; the next one retries */ })
      }, POLL_INTERVAL_MS)
      runtimes.current.set(id, { sessionId, term, fit, element, timer })
      setTabs(current => [...current, { id, title, subtitle, dead: false, ...(host === undefined ? {} : { hostId: host.id }) }])
      setActiveId(id)
      void api.activateShell(sessionId)
      setStatus(host === undefined ? '本地终端已就绪' : `已连接到 ${subtitle}`)
      onActivate?.(host?.id ?? 'local')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [api, onActivate])

  useImperativeHandle(ref, () => ({
    openLocal: () => { void openTab() },
    openHost: host => { void openTab(host) },
    focus: id => { activate(tabsRef.current.find(tab => tab.id === id)) },
    close: id => { closeTab(id) },
  }), [openTab, closeTab, activate])

  return (
    <div className="dshAishellTerminal" data-aishell-terminal="">
      <div className="dshAishellTabBar" role="tablist" aria-label="终端标签">
        {tabs.map(tab => (
          <div
            className="dshAishellTab"
            data-active={tab.id === activeId || undefined}
            data-dead={tab.dead || undefined}
            key={tab.id}
          >
            <button type="button" className="dshAishellTabLabel" role="tab" aria-selected={tab.id === activeId} onClick={() => { activate(tab) }}>
              <strong>{tab.title}</strong>
              <small>{tab.subtitle}</small>
            </button>
            <button type="button" className="dshAishellTabClose" aria-label={`关闭 ${tab.title}`} onClick={() => { closeTab(tab.id) }}>
              <X aria-hidden="true" />
            </button>
          </div>
        ))}
        {quote !== undefined && onQuote !== undefined && (
          <button
            type="button"
            className="dshAishellTerminalQuote"
            onClick={() => { onQuote(quote) }}
          >
            <TextQuote aria-hidden="true" />
            <span>{quoteLabel}</span>
          </button>
        )}
        <button type="button" className="dshAishellTabAdd" aria-label="新建本地终端" onClick={() => { void openTab() }}>
          <Plus aria-hidden="true" />
        </button>
      </div>
      <div className="dshAishellTerminalStack" ref={stackRef} />
      {error !== undefined && <div className="dshAishellTerminalError" role="alert">{error}</div>}
      <div className="dshAishellStatusBar">{status}</div>
    </div>
  )
})
