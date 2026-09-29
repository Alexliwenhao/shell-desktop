/** Host-grouped session tree for the Desktop AI-Shell left panel. */

import { useState } from 'react'
import { Check, ChevronDown, ChevronRight, MessageSquare, Plus, Search, Server, TerminalSquare, Trash2, X } from 'lucide-react'
import type { DesktopSettingsLocaleKey } from './desktop-settings-locales.ts'
import { formatSessionTimestamp, type SessionTreeGroup } from './session-groups.ts'
import type { SessionSearchPage } from './session-search.ts'

/** Live search state handed to the session panel. */
export interface SessionSearchPanel extends SessionSearchPage {
  /** Controlled input text (raw, before sanitizing). */
  readonly query: string
  readonly status: 'loading' | 'ready' | 'error'
  /** Protocol-owned maximum merged row count. */
  readonly limit: number
  /** Host failure detail shown instead of the generic retry copy. */
  readonly message?: string
}

/** Host-grouped session tree props. */
export interface SessionHistoryProps {
  /** Ordered, non-empty host groups. */
  readonly groups: readonly SessionTreeGroup[]
  /** Collapsed group keys; an absent key means expanded. */
  readonly collapsed: Readonly<Record<string, boolean>>
  /** Current AI session id, highlighted in the history rows. */
  readonly currentSessionId?: string
  readonly onToggle: (key: string) => void
  readonly onNewSession: () => void
  readonly onOpenSession: (id: string) => void
  /** Remove one conversation; rejects when the Host refuses the removal. */
  readonly onDeleteSession: (id: string) => Promise<void>
  readonly onFocusTerminal: (id: string) => void
  readonly onCloseTerminal: (id: string) => void
  /** Live search over session titles and Host message content, when composed. */
  readonly search?: SessionSearchPanel
  /** Update the controlled search text; an empty string closes the search view. */
  readonly onSearch?: (query: string) => void
  /** Desktop settings dictionary bound to the current locale. */
  readonly t: (key: DesktopSettingsLocaleKey) => string
}

/**
 * Render the session tree: one collapsible section per host, each listing the
 * host's open terminals before its AI session history.
 */
export function SessionHistory(props: SessionHistoryProps) {
  const {
    groups, collapsed, currentSessionId, search, onSearch,
    onToggle, onNewSession, onOpenSession, onDeleteSession, onFocusTerminal, onCloseTerminal, t,
  } = props
  /** Non-blank query: the panel shows ranked search results instead of the tree. */
  const searching = search !== undefined && search.query.trim() !== ''
  /** Row armed for removal: the button turns into a check and confirms on the next click. */
  const [confirmingId, setConfirmingId] = useState<string>()
  /** Row whose removal is in flight, so its button can stay disabled. */
  const [deletingId, setDeletingId] = useState<string>()
  /** Removal failure surfaced in the panel instead of looking like a dead click. */
  const [deleteError, setDeleteError] = useState(false)

  const remove = (id: string): void => {
    if (deletingId !== undefined) return
    setDeletingId(id)
    setDeleteError(false)
    void onDeleteSession(id).then(
      () => { setDeletingId(undefined) },
      () => { setDeletingId(undefined); setDeleteError(true) },
    )
  }
  return (
    <div className="dshAishellPanelBody dshAishellSessionPane" data-aishell-session-pane="">
      <div className="dshAishellSearchBar">
        <Search aria-hidden="true" />
        <input
          className="dshAishellSearchInput"
          type="search"
          value={search?.query ?? ''}
          placeholder={t('aishellSearchPlaceholder')}
          aria-label={t('aishellSearchLabel')}
          spellCheck={false}
          onChange={event => { onSearch?.(event.target.value) }}
          onKeyDown={event => { if (event.key === 'Escape') onSearch?.('') }}
        />
        {searching && (
          <button
            type="button"
            className="dshAishellHostIconButton"
            aria-label={t('aishellSearchClear')}
            onClick={() => { onSearch?.('') }}
          >
            <X aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="dshAishellPanelActions dshAishellSessionActions">
        <button type="button" className="dshAishellPanelAction dshAishellPrimaryAction" onClick={onNewSession}>
          <Plus aria-hidden="true" />
          <span>{t('aishellSessionsNew')}</span>
        </button>
      </div>
      <div className="dshAishellSessionTree" data-aishell-session-tree="">
        {searching && search !== undefined && (
          <>
            {search.status === 'loading' && <p className="dshAishellPanelHint">{t('aishellSearchLoading')}</p>}
            {search.status === 'error' && <p className="dshAishellPanelAlert" role="alert">{search.message ?? t('aishellSearchFailed')}</p>}
            {search.status === 'ready' && search.items.length === 0 && <p className="dshAishellPanelHint">{t('aishellSearchEmpty')}</p>}
            {search.items.map(item => (
              <div className="dshAishellHostRow" key={item.id} data-current={item.id === currentSessionId || undefined} data-aishell-search-result={item.id}>
                <span className="dshAishellHostGlyph" aria-hidden="true"><MessageSquare /></span>
                <button type="button" className="dshAishellHostOpen" onClick={() => { onOpenSession(item.id) }}>
                  <strong>{item.title}</strong>
                  <small>
                    {item.label}
                    {item.snippet === undefined ? '' : ` · ${item.snippet}`}
                  </small>
                </button>
              </div>
            ))}
            {search.status === 'ready' && search.hasMore && (
              <p className="dshAishellPanelHint">{t('aishellSearchMore').replace('{count}', String(search.limit))}</p>
            )}
          </>
        )}
        {!searching && deleteError && <p className="dshAishellPanelAlert" role="alert">{t('aishellSessionDeleteFailed')}</p>}
        {!searching && groups.length === 0 && <p className="dshAishellPanelHint">{t('aishellSessionsEmpty')}</p>}
        {!searching && groups.map(group => {
          const isCollapsed = collapsed[group.key] === true
          return (
            <section className="dshAishellSessionGroup" key={group.key} data-aishell-session-group={group.key}>
              <button
                type="button"
                className="dshAishellSessionGroupHeader"
                aria-expanded={!isCollapsed}
                onClick={() => { onToggle(group.key) }}
              >
                {isCollapsed ? <ChevronRight aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                <Server aria-hidden="true" />
                <span className="dshAishellSessionGroupTitle">{group.title}</span>
                <span className="dshAishellSessionGroupCount">{group.terminals.length + group.sessions.length}</span>
              </button>
              {!isCollapsed && (
                <div className="dshAishellSessionGroupBody">
                  {group.terminals.map(terminal => (
                    <div className="dshAishellHostRow" key={terminal.id}>
                      <span className="dshAishellHostGlyph" aria-hidden="true"><TerminalSquare /></span>
                      <button type="button" className="dshAishellHostOpen" onClick={() => { onFocusTerminal(terminal.id) }}>
                        <strong>{terminal.title}</strong>
                        <small>
                          {terminal.subtitle}
                          {terminal.dead ? ` · ${t('aishellSessionEnded')}` : terminal.active ? ` · ${t('aishellSessionCurrent')}` : ''}
                        </small>
                      </button>
                      <button
                        type="button"
                        className="dshAishellHostIconButton"
                        aria-label={`${t('aishellSessionClose')} ${terminal.title}`}
                        onClick={() => { onCloseTerminal(terminal.id) }}
                      >
                        <X aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {group.sessions.map(session => {
                    const confirming = confirmingId === session.id
                    return (
                    <div className="dshAishellHostRow" key={session.id} data-current={session.id === currentSessionId || undefined}>
                      <span className="dshAishellHostGlyph" aria-hidden="true"><MessageSquare /></span>
                      <button
                        type="button"
                        className="dshAishellHostOpen"
                        onClick={() => {
                          setConfirmingId(undefined)
                          onOpenSession(session.id)
                        }}
                      >
                        <strong>{session.title}</strong>
                        <small>
                          {formatSessionTimestamp(session.updatedAt)}
                          {session.running ? ` · ${t('aishellSessionRunning')}` : session.completed ? ` · ${t('aishellSessionCompleted')}` : ''}
                        </small>
                      </button>
                      <button
                        type="button"
                        className="dshAishellHostIconButton dshAishellHostDeleteButton"
                        data-confirm={confirming || undefined}
                        title={confirming ? t('aishellSessionDeleteConfirm') : t('aishellSessionDelete')}
                        aria-label={confirming
                          ? `${t('aishellSessionDeleteConfirm')} ${session.title}`
                          : `${t('aishellSessionDelete')} ${session.title}`}
                        disabled={deletingId === session.id}
                        onClick={() => {
                          if (!confirming) {
                            setConfirmingId(session.id)
                            return
                          }
                          setConfirmingId(undefined)
                          remove(session.id)
                        }}
                      >
                        {confirming ? <Check aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                      </button>
                    </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
