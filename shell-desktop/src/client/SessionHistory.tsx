/** Host-grouped session tree for the Desktop AI-Shell left panel. */

import { useState } from 'react'
import { ChevronDown, ChevronRight, ListChecks, MessageSquare, Plus, Search, Server, TerminalSquare, Trash2, X } from 'lucide-react'
import { ConfirmDialog } from './ConfirmDialog.tsx'
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
  /** Remove conversations (one row or a batch); rejects when the Host refuses. */
  readonly onDeleteSessions: (ids: readonly string[]) => Promise<void>
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
 * host's open terminals before its AI session history. Removal always goes
 * through a confirmation dialog; batch mode turns the rows into a checkbox
 * list with its own select-all/delete bar.
 */
export function SessionHistory(props: SessionHistoryProps) {
  const {
    groups, collapsed, currentSessionId, search, onSearch,
    onToggle, onNewSession, onOpenSession, onDeleteSessions, onFocusTerminal, onCloseTerminal, t,
  } = props
  /** Non-blank query: the panel shows ranked search results instead of the tree. */
  const searching = search !== undefined && search.query.trim() !== ''
  /** Multi-select mode: rows grow checkboxes and the footer deletes the batch. */
  const [batching, setBatching] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  /** Row whose removal awaits confirmation, if any. */
  const [pendingDelete, setPendingDelete] = useState<{ readonly id: string; readonly title: string }>()
  /** Whether the batch confirmation dialog is open. */
  const [confirmingBatch, setConfirmingBatch] = useState(false)
  /** Removal in flight, so every destructive control stays disabled. */
  const [deleting, setDeleting] = useState(false)
  /** Removal failure surfaced in the panel instead of looking like a dead click. */
  const [deleteError, setDeleteError] = useState(false)

  const remove = (ids: readonly string[]): void => {
    if (deleting || ids.length === 0) return
    setDeleting(true)
    setDeleteError(false)
    void onDeleteSessions(ids).then(
      () => {
        setDeleting(false)
        setBatching(false)
        setSelected(new Set())
      },
      () => { setDeleting(false); setDeleteError(true) },
    )
  }

  /** Enter batch mode on a clean sheet: the search view gives way to the tree. */
  const startBatching = (): void => {
    onSearch?.('')
    setSelected(new Set())
    setBatching(true)
  }

  const stopBatching = (): void => {
    setBatching(false)
    setSelected(new Set())
  }

  const toggleSelected = (id: string): void => {
    setSelected(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = (): void => {
    setSelected(new Set(groups.flatMap(group => group.sessions.map(session => session.id))))
  }

  const selectedCount = selected.size
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
          disabled={batching}
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
        {batching ? (
          <>
            <button
              type="button"
              className="dshAishellPanelAction"
              disabled={deleting || groups.every(group => group.sessions.length === 0)}
              onClick={selectAll}
            >
              <ListChecks aria-hidden="true" />
              <span>{t('aishellSessionsBatchSelectAll')}</span>
            </button>
            <button type="button" className="dshAishellPanelAction" disabled={deleting} onClick={stopBatching}>
              <X aria-hidden="true" />
              <span>{t('aishellSessionsBatchCancel')}</span>
            </button>
          </>
        ) : (
          <>
            <button type="button" className="dshAishellPanelAction dshAishellPrimaryAction" onClick={onNewSession}>
              <Plus aria-hidden="true" />
              <span>{t('aishellSessionsNew')}</span>
            </button>
            <button type="button" className="dshAishellPanelAction" data-ghost="" onClick={startBatching}>
              <ListChecks aria-hidden="true" />
              <span>{t('aishellSessionsBatch')}</span>
            </button>
          </>
        )}
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
                  {group.sessions.map(session => (
                    <div className="dshAishellHostRow" key={session.id} data-current={session.id === currentSessionId || undefined}>
                      {batching && (
                        <input
                          type="checkbox"
                          className="dshAishellSelectBox"
                          checked={selected.has(session.id)}
                          disabled={deleting}
                          aria-label={`${t('aishellSessionsBatch')} ${session.title}`}
                          onChange={() => { toggleSelected(session.id) }}
                        />
                      )}
                      <span className="dshAishellHostGlyph" aria-hidden="true"><MessageSquare /></span>
                      <button
                        type="button"
                        className="dshAishellHostOpen"
                        onClick={() => {
                          if (batching) {
                            toggleSelected(session.id)
                            return
                          }
                          onOpenSession(session.id)
                        }}
                      >
                        <strong>{session.title}</strong>
                        <small>
                          {formatSessionTimestamp(session.updatedAt)}
                          {session.running ? ` · ${t('aishellSessionRunning')}` : session.completed ? ` · ${t('aishellSessionCompleted')}` : ''}
                        </small>
                      </button>
                      {!batching && (
                        <button
                          type="button"
                          className="dshAishellHostIconButton dshAishellHostDeleteButton"
                          title={t('aishellSessionDelete')}
                          aria-label={`${t('aishellSessionDelete')} ${session.title}`}
                          disabled={deleting}
                          onClick={() => { setPendingDelete({ id: session.id, title: session.title }) }}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
      {batching && (
        <div className="dshAishellPanelFooter dshAishellBatchBar">
          <button
            type="button"
            className="dshAishellPanelAction dshAishellDangerAction"
            disabled={deleting || selectedCount === 0}
            onClick={() => { setConfirmingBatch(true) }}
          >
            <Trash2 aria-hidden="true" />
            <span>{t('aishellSessionsDeleteSelected')} ({selectedCount})</span>
          </button>
        </div>
      )}
      {pendingDelete !== undefined && (
        <ConfirmDialog
          title={t('aishellSessionDeleteTitle')}
          body={t('aishellSessionDeleteBody').replace('{title}', pendingDelete.title)}
          confirmLabel={t('aishellDialogDelete')}
          cancelLabel={t('aishellDialogCancel')}
          busy={deleting}
          onCancel={() => { if (!deleting) setPendingDelete(undefined) }}
          onConfirm={() => { setPendingDelete(undefined); remove([pendingDelete.id]) }}
        />
      )}
      {confirmingBatch && (
        <ConfirmDialog
          title={t('aishellSessionsDeleteSelectedTitle')}
          body={t('aishellSessionsDeleteSelectedBody').replace('{count}', String(selectedCount))}
          confirmLabel={t('aishellDialogDelete')}
          cancelLabel={t('aishellDialogCancel')}
          busy={deleting}
          onCancel={() => { if (!deleting) setConfirmingBatch(false) }}
          onConfirm={() => { setConfirmingBatch(false); remove([...selected]) }}
        />
      )}
    </div>
  )
}
