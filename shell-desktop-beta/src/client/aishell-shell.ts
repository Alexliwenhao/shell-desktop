/** AI-Shell presentation: exclusive layout ownership plus the rail-bearing root. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from './contracts.ts'
import { AishellFrame } from './AishellFrame.tsx'
import { installBrandMark } from './BrandMark.tsx'
import type { DesktopSettingsClientControl } from './desktop-settings.ts'
import { DESKTOP_SETTINGS_LOCALE_NAMESPACE } from './desktop-settings.ts'
import type { DesktopClientEnvironment } from './environment.ts'
import { PROPOSED_COMMANDS_DEFINITION, PROPOSED_COMMANDS_NODE } from './proposed-commands.ts'
import { ProposedCommandsView } from './ProposedCommandsView.tsx'
import { remoteBridge } from './remote-api.ts'
import { installAishellStyles } from './aishell-styles.ts'
import type { WorkspaceOption, WorkspaceOptionsStore } from './WorkspaceSettingsRow.tsx'
import { WorkspaceSettingsRow } from './WorkspaceSettingsRow.tsx'
import { requestDesktopDirectory, requestDesktopDirectoryValidation } from './directory-picker.ts'
import { DesktopLayoutState } from './layout-state.ts'
import { installDesktopLayout } from './layout-service.ts'
import { installDesktopOwnedStyles } from './styles.ts'
import { DesktopThemePresenter } from './theme-presenter.ts'
import { WorkspaceHint } from './WorkspaceHint.tsx'

/** Wrap arbitrary text in a Markdown fence its own backticks cannot close. */
function fenced(text: string): string {
  const longest = [...text.matchAll(/`+/gu)].reduce((width, match) => Math.max(width, match[0].length), 0)
  const ticks = '`'.repeat(Math.max(3, longest + 1))
  return `${ticks}\n${text}\n${ticks}`
}

/** Workspace service face this shell resolves lazily (Host-owned service). */
interface ShellWorkspaces {
  list?: {
    getSnapshot?(): { items?: readonly { workspaceId?: unknown; path?: string; title?: string }[] }
    subscribe?(listener: () => void): () => void
  }
  create?(input: { path: string }): Promise<{ workspaceId?: unknown }>
  archiveSession?(sessionId: unknown): Promise<void>
}

/** Own the AI-Shell root: activity rail, navigation column, terminal workbench, AI conversation. */
export function applyAishellShell(
  ctx: ClientContext,
  environment: DesktopClientEnvironment,
  desktop: DesktopSettingsClientControl,
): void {
  if (environment.mode !== 'aishell') {
    throw new Error(`shell-desktop: AI-Shell received mode ${JSON.stringify(environment.mode)}`)
  }


  const desktopLayout = new DesktopLayoutState(id => ctx.slots.entries('main').some(entry => entry.options.key === id))
  installDesktopLayout(ctx, desktopLayout)
  ctx.effect(() => installBrandMark(ctx), 'desktop: brand mark')

  // The AI shell targets remote machines and never asks the user to pick a
  // local workspace: the deployment's workspace is created automatically when
  // none exists — anchored at the Host home directory reported by the desktop
  // bridge — and every connected machine gets a session of its own.
  const rawContext = ctx as unknown as { get(name: string): unknown }
  /** Bound AI session per terminal key (a saved host id, or `local`). */
  const terminalSessions = new Map<string, unknown>()

  const workspacesFace = (): ShellWorkspaces | undefined => rawContext.get('workspaces') as ShellWorkspaces | undefined

  /** Find or create the workspace standing for one directory. */
  const ensureWorkspaceAt = async (path: string): Promise<unknown> => {
    const workspaces = workspacesFace()
    if (workspaces === undefined || path === '') return undefined
    const findByPath = (): unknown => workspaces.list?.getSnapshot?.().items?.find(item => item.path === path)?.workspaceId
    const existing = findByPath()
    if (existing !== undefined) return existing
    if (workspaces.create === undefined) return undefined
    const created = await workspaces.create({ path })
    return created?.workspaceId ?? findByPath()
  }

  /** The workspace directory chosen in Settings → General; empty defers to the deployment default. */
  const configuredWorkspacePath = (): string => desktop.shellSettings.getSnapshot().value?.aishellWorkspace ?? ''

  const ensureWorkspaceId = async (): Promise<unknown> => {
    const configured = configuredWorkspacePath()
    if (configured !== '') {
      const chosen = await ensureWorkspaceAt(configured)
      if (chosen !== undefined) return chosen
    }
    const workspaces = workspacesFace()
    const existing = workspaces?.list?.getSnapshot?.().items?.[0]?.workspaceId
    if (existing !== undefined) return existing
    if (workspaces?.create === undefined) return undefined
    const home = await remoteBridge.hostHome().catch(() => '')
    if (home === '') {
      ctx.logger.warn('shell-desktop: AI-Shell cannot resolve a workspace path')
      return undefined
    }
    const created = await workspaces.create({ path: home })
    return created?.workspaceId ?? workspaces?.list?.getSnapshot?.().items?.[0]?.workspaceId
  }

  /**
   * The workspace a new session belongs to: one standing workspace per saved
   * host (titled with the host name, so the session list groups by host), and
   * the deployment workspace for everything else.
   */
  const workspaceFor = async (bindKey?: string): Promise<unknown> => {
    if (bindKey !== undefined && bindKey !== 'local') {
      const ensured = await remoteBridge.ensureHostWorkspace(bindKey).catch(() => undefined)
      const workspaces = rawContext.get('workspaces') as {
        list?: { getSnapshot?(): { items?: readonly { workspaceId?: unknown; path?: string; title?: string }[] } }
        create?(input: { path: string }): Promise<{ workspaceId?: unknown }>
        rename?(workspaceId: unknown, title: string): Promise<unknown>
      } | undefined
      if (ensured !== undefined && workspaces?.create !== undefined) {
        const existing = workspaces.list?.getSnapshot?.().items?.find(item => item.path === ensured.path)
        if (existing?.workspaceId !== undefined) {
          if (existing.title !== ensured.title && workspaces.rename !== undefined) {
            await workspaces.rename(existing.workspaceId, ensured.title).catch(() => {})
          }
          return existing.workspaceId
        }
        const created = await workspaces.create({ path: ensured.path })
        if (created?.workspaceId !== undefined && workspaces.rename !== undefined) {
          await workspaces.rename(created.workspaceId, ensured.title).catch(() => {})
        }
        return created?.workspaceId
      }
    }
    return await ensureWorkspaceId()
  }

  /**
   * Most recent session the Host still records for one terminal key, used when
   * this renderer has no in-memory binding yet (a reload or a fresh window).
   * @param bindKey - saved host id the sessions were recorded under.
   * @param claimed - session ids another open terminal already shows; skipped so
   *   two terminals never display the same conversation.
   * @returns the newest recorded session id, or undefined when none exists.
   */
  const latestBoundSession = async (bindKey: string, claimed: ReadonlySet<string> = new Set()): Promise<unknown> => {
    const sessions = rawContext.get('sessions') as {
      list?: {
        getSnapshot?(): {
          ids?: readonly unknown[]
          byId?: Record<string, { updatedAt?: number } | undefined>
        }
      }
    } | undefined
    const snapshot = sessions?.list?.getSnapshot?.()
    const ids = snapshot?.ids
    const byId = snapshot?.byId
    if (ids === undefined || byId === undefined) return undefined
    const recorded: Readonly<Record<string, string>> = await remoteBridge
      .listSessionHosts()
      .catch(() => ({} as Readonly<Record<string, string>>))
    let newest: { id: unknown; updatedAt: number } | undefined
    for (const id of ids) {
      const key = String(id)
      if (recorded[key] !== bindKey) continue
      if (claimed.has(key)) continue
      const updatedAt = byId[key]?.updatedAt ?? 0
      if (newest === undefined || updatedAt > newest.updatedAt) newest = { id, updatedAt }
    }
    return newest?.id
  }

  /**
   * Open an AI session bound to `bindKey`. The default reuses the conversation
   * already bound to that terminal and only creates one when none is bound;
   * `fresh` starts a new conversation regardless and rebinds the terminal to it.
   * @param bindKey - terminal key (a saved host id, or `local`), when the session belongs to a terminal.
   * @param options - `fresh` forces a new session for an explicit new-session action;
   *   `terminalId` is the concrete terminal tab the session becomes bound to.
   */
  const openBoundSession = (bindKey?: string, options: { readonly fresh?: boolean; readonly terminalId?: string } = {}): void => {
    const fresh = options.fresh === true
    const bindTarget = options.terminalId ?? bindKey
    void (async () => {
      try {
        const sessions = rawContext.get('sessions') as
          { create?(input: { workspaceId: unknown }): Promise<string> } | undefined
        const navigation = rawContext.get('uiWorkspace') as { openSession?(id: unknown): void } | undefined
        if (sessions?.create === undefined || navigation?.openSession === undefined) {
          ctx.logger.warn('shell-desktop: AI-Shell session services are not ready')
          return
        }
        // Terminal activation reuses the conversation already bound to that
        // terminal; an explicit "new session" always starts one, even when the
        // terminal has a conversation, and rebinds the terminal to it.
        if (bindTarget !== undefined && fresh !== true) {
          const existing = terminalSessions.get(bindTarget)
          if (existing !== undefined) {
            navigation.openSession(existing)
            return
          }
          // No binding in this renderer yet: return to the host's newest
          // recorded conversation no other open terminal already shows, and
          // hand it this terminal so its commands keep targeting this terminal
          // instead of starting a second conversation for a host the user
          // already worked with.
          if (bindKey !== undefined && bindKey !== 'local') {
            const claimed = new Set([...terminalSessions.values()].map(value => String(value)))
            const recorded = await latestBoundSession(bindKey, claimed)
            if (recorded !== undefined) {
              terminalSessions.set(bindTarget, recorded)
              if (options.terminalId !== undefined) {
                void remoteBridge.setSessionTerminal(String(recorded), options.terminalId).catch(() => {})
              }
              navigation.openSession(recorded)
              return
            }
          }
        }
        const workspaceId = await workspaceFor(bindKey)
        if (workspaceId === undefined) {
          ctx.logger.warn('shell-desktop: AI-Shell found no usable workspace')
          return
        }
        const sessionId = await sessions.create({ workspaceId })
        if (bindTarget !== undefined) {
          terminalSessions.set(bindTarget, sessionId)
          if (options.terminalId !== undefined) {
            void remoteBridge.setSessionTerminal(sessionId, options.terminalId).catch(() => {})
          }
          // Record the explicit host association so the session tree can group
          // this session under its host after a reload.
          if (bindKey !== undefined && bindKey !== 'local') {
            void remoteBridge.setSessionHost(sessionId, bindKey).catch(() => {})
          }
        }
        navigation.openSession(sessionId)
      } catch (cause) {
        ctx.logger.warn(`shell-desktop: AI-Shell session for ${bindKey ?? 'new'} failed: ${cause instanceof Error ? cause.message : String(cause)}`)
      }
    })()
  }

  /** Open an already-created session (a history row) without creating one. */
  const openExistingSession = (sessionId: string): void => {
    const navigation = rawContext.get('uiWorkspace') as { openSession?(id: unknown): void } | undefined
    navigation?.openSession?.(sessionId)
  }

  /**
   * Remove one conversation from the history. The Host archive set is the
   * authority — the session log itself is retained — and the UI-facing
   * `uiWorkspace` path is preferred over the controller service because it is
   * the one the shipped sidebar uses. The shell also forgets any terminal bound
   * to that conversation and, when it was the current one, hands the column to
   * the terminal's next conversation or to a fresh one.
   * @param sessionId - the conversation to remove from the history.
   * @returns fulfillment once the Host accepted the removal; rejects otherwise so
   *   the caller can report it instead of leaving a dead-looking click.
   */
  const deleteSession = async (sessionId: string): Promise<void> => {
    const navigation = rawContext.get('uiWorkspace') as
      { archiveSession?(id: unknown): Promise<void> } | undefined
    const workspaces = workspacesFace()
    const archive = navigation?.archiveSession ?? workspaces?.archiveSession
    if (archive === undefined) {
      throw new Error('shell-desktop: AI-Shell found no session removal service')
    }
    let boundKey: string | undefined
    for (const [key, bound] of terminalSessions) {
      if (bound !== sessionId) continue
      boundKey = key
      terminalSessions.delete(key)
    }
    await archive.call(navigation?.archiveSession !== undefined ? navigation : workspaces, sessionId)
    const sessions = rawContext.get('sessions') as {
      list?: { getSnapshot?(): { current?: unknown } }
    } | undefined
    if (String(sessions?.list?.getSnapshot?.().current ?? '') === sessionId) openBoundSession(boundKey)
  }

  // Boot: wait for the client workspace/session services, then open (creating
  // when needed) the deployment workspace's session so the conversation column
  // starts on a live session instead of the workspace hero.
  ctx.effect(() => {
    let attempts = 0
    let started = false
    const timer = window.setInterval(() => {
      attempts += 1
      try {
        const workspaces = rawContext.get('workspaces') as unknown
        const sessions = rawContext.get('sessions') as unknown
        const navigation = rawContext.get('uiWorkspace') as { openWorkspace?(id: unknown): Promise<void> } | undefined
        if (!started && workspaces !== undefined && sessions !== undefined && navigation?.openWorkspace !== undefined) {
          started = true
          window.clearInterval(timer)
          void (async () => {
            try {
              const workspaceId = await ensureWorkspaceId()
              if (workspaceId !== undefined) await navigation.openWorkspace?.(workspaceId)
            } catch (cause) {
              ctx.logger.warn(`shell-desktop: AI-Shell default session failed: ${cause instanceof Error ? cause.message : String(cause)}`)
            }
          })()
          return
        }
        if (attempts >= 60) window.clearInterval(timer)
      } catch {
        window.clearInterval(timer)
      }
    }, 700)
    return () => { window.clearInterval(timer) }
  }, 'desktop: AI-Shell default session')

  ctx.effect(() => {
    document.body.dataset.dshDesktopMode = 'aishell'
    document.body.dataset.dshDesktopPlatform = environment.platform
    document.body.dataset.dshDesktopMaterial = environment.material
    const removeStyles = installDesktopOwnedStyles()
    const removeAishellStyles = installAishellStyles()
    return () => {
      removeAishellStyles()
      removeStyles()
      delete document.body.dataset.dshDesktopMode
      delete document.body.dataset.dshDesktopPlatform
      delete document.body.dataset.dshDesktopMaterial
    }
  }, 'desktop: AI-Shell styles')

  ctx.effect(() => {
    const presenter = new DesktopThemePresenter()
    presenter.apply(ctx.theme.getTheme())
    const off = ctx.on('theme/change', snapshot => { presenter.apply(snapshot) })
    return () => {
      off()
      presenter.dispose()
    }
  }, 'desktop: AI-Shell theme presenter')

  const t = ctx.locale.bind(DESKTOP_SETTINGS_LOCALE_NAMESPACE)
  const newSession = (bindKey?: string, terminalId?: string): void => { openBoundSession(bindKey, { fresh: true, ...(terminalId === undefined ? {} : { terminalId }) }) }
  const openTerminalSession = (key: string, terminalId?: string): void => { openBoundSession(key, { ...(terminalId === undefined ? {} : { terminalId }) }) }
  const openSession = (sessionId: string): void => { openExistingSession(sessionId) }

  /**
   * Append one terminal selection to the conversation draft as a fenced
   * reference. The active session owns the draft, and the write goes through
   * the standard conversation input facade so the composer updates in place.
   */
  const quoteTerminalSelection = (quote: { readonly label: string; readonly text: string }): void => {
    void (async () => {
      const sessions = rawContext.get('sessions') as {
        list?: { getSnapshot?(): { current?: unknown } }
        scope?(sessionId: unknown): unknown
      } | undefined
      const current = sessions?.list?.getSnapshot?.().current
      const actx = (current === undefined ? undefined : sessions?.scope?.(current)) as
        { get?(name: string): unknown } | undefined
      const conversation = actx?.get?.('conversation') as {
        input?: {
          for?(ctx: unknown): {
            state?: { getSnapshot?(): { draft?: unknown } }
            setDraft?(text: string): void
          } | undefined
        }
      } | undefined
      const input = conversation?.input?.for?.(actx)
      if (input?.setDraft === undefined) {
        ctx.logger.warn('shell-desktop: AI-Shell found no conversation input to quote into')
        return
      }
      const draft = input.state?.getSnapshot?.().draft
      const reference = `${t('aishellQuotePrefix').replace('{label}', quote.label)}\n${fenced(quote.text)}`
      input.setDraft(typeof draft === 'string' && draft !== '' ? `${draft}\n${reference}` : reference)
    })()
  }

  // The right column must never ask for a workspace: replace the hero's
  // workspace seat with the AI-Shell orientation hint. A conflicting occupant
  // or a late declaration must not break boot, so failures are contained.
  ctx.effect(() => {
    try {
      return ctx.slots.inject('conversation.hero.workspace', () => ctx.slots.register({
        name: 'conversation.hero.workspace',
        // The shipped picker already occupies this single slot, and only a lower
        // priority may shadow it; the AI shell replaces it with its own hint.
        priority: -1,
      }, WorkspaceHint))
    } catch (cause) {
      ctx.logger.warn(`shell-desktop: AI-Shell workspace hint failed: ${cause instanceof Error ? cause.message : String(cause)}`)
      return () => {}
    }
  }, 'desktop: AI-Shell workspace hint')

  /** Ensure the directory has a workspace, persist the choice, and open it. */
  const switchWorkspace = async (path: string): Promise<void> => {
    const trimmed = path.trim()
    if (trimmed === '') {
      // An empty path is the deployment default, not a workspace to create.
      await desktop.shellSettings.set('aishellWorkspace', '')
      return
    }
    // The Host owns the workspace-path policy; a refused directory keeps the
    // previous choice and surfaces the failure in the row.
    const allowed = await requestDesktopDirectoryValidation(trimmed).catch(() => true)
    if (!allowed) {
      throw new Error(`shell-desktop: ${trimmed} is not an allowed workspace directory`)
    }
    const workspaceId = await ensureWorkspaceAt(trimmed)
    if (workspaceId === undefined) {
      throw new Error(`shell-desktop: AI-Shell found no workspace service for ${trimmed}`)
    }
    await desktop.shellSettings.set('aishellWorkspace', trimmed)
    const navigation = rawContext.get('uiWorkspace') as { openWorkspace?(id: unknown): Promise<void> } | undefined
    await navigation?.openWorkspace?.(workspaceId)
  }

  /**
   * Open the platform folder chooser for the workspace row. The AI shell does
   * not compose the browse picker's dialog host, so the Desktop-owned native
   * chooser is the primary path and the composed picker is the fallback.
   */
  const pickDirectory = async (): Promise<string | null> => {
    try {
      return await requestDesktopDirectory()
    } catch (cause) {
      ctx.logger.warn(`shell-desktop: AI-Shell native folder chooser unavailable: ${cause instanceof Error ? cause.message : String(cause)}`)
    }
    const navigation = rawContext.get('uiWorkspace') as { pickDirectory?(): Promise<string | null> } | undefined
    if (navigation?.pickDirectory === undefined) return null
    return await navigation.pickDirectory()
  }

  // The settings row reads the workspace list through a cached projection: the
  // global hook belongs to a client plugin this shell does not type against, and
  // `useSyncExternalStore` needs one stable snapshot per change.
  const workspaceCache: { options: readonly WorkspaceOption[] } = { options: [] }
  const projectWorkspaces = (): void => {
    const items = workspacesFace()?.list?.getSnapshot?.().items ?? []
    workspaceCache.options = items.map(item => ({
      workspaceId: String(item.workspaceId ?? ''),
      path: item.path ?? '',
      title: item.title ?? '',
    }))
  }
  const workspaceOptions: WorkspaceOptionsStore = {
    getSnapshot: () => workspaceCache.options,
    subscribe: listener => {
      const list = workspacesFace()?.list
      if (list?.subscribe === undefined) return () => {}
      projectWorkspaces()
      const stop = list.subscribe(() => {
        projectWorkspaces()
        listener()
      })
      return () => { stop() }
    },
  }

  // Settings → General owns the AI-Shell workspace: the row shows the chosen
  // directory, lists existing workspaces to switch to, and opens the picker.
  ctx.effect(() => {
    try {
      return ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'desktop-aishell-workspace',
        order: 5,
        locale: DESKTOP_SETTINGS_LOCALE_NAMESPACE,
        inject: () => ({
          settings: desktop.shellSettings,
          workspaces: workspaceOptions,
          switchWorkspace,
          pickDirectory,
        }),
      }, WorkspaceSettingsRow))
    } catch (cause) {
      ctx.logger.warn(`shell-desktop: AI-Shell workspace row failed: ${cause instanceof Error ? cause.message : String(cause)}`)
      return () => {}
    }
  }, 'desktop: AI-Shell workspace setting row')

  // Command proposals are part of the answer, not of the process disclosure:
  // the projection collects the turn's propose_command calls and this renderer
  // places their cards at the turn's end, each owning its own execute button.
  // The Host tool never runs the command itself.
  // The Conversation registry arrives with the conversation client plugin. The
  // registration has to beat the first materialization of an opened session (a
  // later one never sees that session's already-consumed events), so it waits on
  // the service instead of polling.
  const injectService = ctx as unknown as {
    inject(names: readonly string[], callback: (scoped: unknown) => unknown): () => void
  }
  ctx.effect(() => injectService.inject(['uiConversation'], scoped => {
    const conversation = (scoped as {
      uiConversation?: { events?: { register?(definition: unknown): () => void } }
    }).uiConversation
    const register = conversation?.events?.register
    if (register === undefined) {
      ctx.logger.warn('shell-desktop: AI-Shell found no Conversation event registry')
      return () => {}
    }
    try {
      return register.call(conversation?.events, PROPOSED_COMMANDS_DEFINITION)
    } catch (cause) {
      ctx.logger.warn(`shell-desktop: AI-Shell command projection failed: ${cause instanceof Error ? cause.message : String(cause)}`)
      return () => {}
    }
  }), 'desktop: AI-Shell proposed commands projection')
  ctx.effect(() => {
    return ctx.slots.inject('conversation.chat.node', () => {
      // The chat client face is not part of this package's client compilation
      // (its type graph pulls conflicting vendor faces), so the keyed
      // registration is widened once here against that face's own contract.
      const slots = ctx.slots as unknown as {
        register(options: unknown, component: unknown): () => void
      }
      try {
        return slots.register({
          name: 'conversation.chat.node',
          key: PROPOSED_COMMANDS_NODE,
          locale: DESKTOP_SETTINGS_LOCALE_NAMESPACE,
        }, ProposedCommandsView)
      } catch (cause) {
        ctx.logger.warn(`shell-desktop: AI-Shell proposed commands view failed: ${cause instanceof Error ? cause.message : String(cause)}`)
        return () => {}
      }
    })
  }, 'desktop: AI-Shell proposed commands view')

  ctx.effect(() => ctx.slots.register({
    name: 'root',
    children: {
      'sidebar': { kind: 'single', scope: 'root' },
      'main': { kind: 'keyed', scope: 'root' },
      'shell.overlay': { kind: 'list', scope: 'root' },
    },
    inject: () => ({
      layout: desktopLayout,
      platform: environment.platform,
      remote: remoteBridge,
      t,
      newSession,
      openTerminalSession,
      openSession,
      deleteSession,
      quoteTerminalSelection,
      subscribeTheme: (listener: () => void) => ctx.on('theme/change', () => { listener() }),
    }),
  }, AishellFrame), 'desktop: AI-Shell root slot')
}
