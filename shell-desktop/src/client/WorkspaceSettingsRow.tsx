/**
 * Settings → General row for the AI-Shell workspace: shows the directory the
 * conversation column starts sessions in, accepts a typed absolute path, opens
 * the composed native picker, and switches to an existing workspace.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { DesktopShellSettings } from './DesktopSettingsSection.tsx'

/** One selectable workspace as this row needs it. */
export interface WorkspaceOption {
  readonly workspaceId: string
  readonly path: string
  readonly title: string
}

/** Observable workspace list handed to the row by the AI-Shell shell. */
export interface WorkspaceOptionsStore {
  getSnapshot(): readonly WorkspaceOption[]
  subscribe(listener: () => void): () => void
}

/** Registration-side capabilities for the workspace row. */
export interface WorkspaceSettingsInjected {
  /** Desktop settings scope carrying the chosen workspace directory. */
  readonly settings: SettingsScope<DesktopShellSettings>
  /** Observable list of the Host's workspaces. */
  readonly workspaces: WorkspaceOptionsStore
  /**
   * Ensure the directory has a workspace, persist it, and open it. An empty
   * path clears the choice and returns to the deployment default.
   */
  switchWorkspace(path: string): Promise<void>
  /** Open the composed native directory picker; resolves null when cancelled. */
  pickDirectory(): Promise<string | null>
}

/** Renderer-composed workspace row props. */
export type WorkspaceSettingsRowProps =
  PropsRuntime<'settings.general.item'>
  & PropsLocale<'desktop.settings'>
  & InjectFace<WorkspaceSettingsInjected>

/**
 * One General row: the workspace path, its picker, and the workspace switcher.
 * @param props - slot runtime props plus the workspace capabilities.
 */
export function WorkspaceSettingsRow({
  settings,
  workspaces: options,
  switchWorkspace,
  pickDirectory,
  t,
}: WorkspaceSettingsRowProps) {
  // The settings scope exposes prototype methods that read `this.store`, so they
  // must be invoked through the scope rather than passed detached.
  const subscribeScope = useCallback((listener: () => void) => settings.subscribe(listener), [settings])
  const readScope = useCallback(() => settings.getSnapshot(), [settings])
  const subscribeOptions = useCallback((listener: () => void) => options.subscribe(listener), [options])
  const readOptions = useCallback(() => options.getSnapshot(), [options])
  const scope = useSyncExternalStore(subscribeScope, readScope)
  const workspaces = useSyncExternalStore(subscribeOptions, readOptions)
  const current = scope.value?.aishellWorkspace ?? ''
  const [draft, setDraft] = useState(current)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  // The persisted path is the source of truth; the field follows it whenever a
  // switch lands (or another window writes it).
  useEffect(() => { setDraft(current) }, [current])

  const apply = (path: string): void => {
    const next = path.trim()
    if (busy || next === current) return
    setBusy(true)
    setFailed(false)
    void switchWorkspace(next).catch(() => { setFailed(true) }).finally(() => { setBusy(false) })
  }

  const browse = (): void => {
    if (busy) return
    setBusy(true)
    setFailed(false)
    void pickDirectory().then(
      path => {
        if (path === null) return undefined
        setDraft(path)
        return switchWorkspace(path)
      },
      () => { setFailed(true) },
    ).catch(() => { setFailed(true) }).finally(() => { setBusy(false) })
  }

  const selectExisting = (path: string): void => {
    setDraft(path)
    apply(path)
  }

  return (
    <div className="dshAishellWorkspaceRow">
      <div className="dshAishellWorkspaceCopy">
        <span className="dshAishellWorkspaceTitle">{t('aishellWorkspaceTitle')}</span>
        <span className="dshAishellWorkspaceBody">{t('aishellWorkspaceBody')}</span>
      </div>
      <div className="dshAishellWorkspaceControls">
        <input
          className="dshAishellWorkspaceInput"
          value={draft}
          spellCheck={false}
          disabled={busy || scope.status === 'loading'}
          placeholder={t('aishellWorkspacePlaceholder')}
          aria-label={t('aishellWorkspaceTitle')}
          onChange={event => { setDraft(event.target.value) }}
          onKeyDown={event => { if (event.key === 'Enter') apply(draft) }}
        />
        <button
          type="button"
          className="dshAishellWorkspaceBrowse"
          disabled={busy || draft.trim() === current}
          onClick={() => { apply(draft) }}
        >
          {busy ? t('aishellWorkspaceSwitching') : t('aishellWorkspaceApply')}
        </button>
        <button type="button" className="dshAishellWorkspaceBrowse" disabled={busy} onClick={browse}>
          {t('aishellWorkspaceChoose')}
        </button>
      </div>
      <select
        className="dshAishellWorkspaceSelect"
        value={workspaces.some(item => item.path === current) ? current : ''}
        disabled={busy || scope.status === 'loading'}
        aria-label={t('aishellWorkspaceKnown')}
        onChange={event => { selectExisting(event.target.value) }}
      >
        <option value="">{t('aishellWorkspaceDefault')}</option>
        {workspaces.map(item => (
          <option key={item.workspaceId} value={item.path}>{item.title === '' ? item.path : item.title}</option>
        ))}
      </select>
      {failed && <span className="dshAishellWorkspaceError" role="alert">{t('aishellWorkspaceFailed')}</span>}
    </div>
  )
}
