/**
 * Turn-footer card list for AI-Shell command proposals: the commands the model
 * proposed this turn, each with the execute button that types it into the
 * user's active terminal. Rendered at the end of the turn, outside the collapsed
 * process disclosure.
 */

import { useState } from 'react'
import { Check, Play } from 'lucide-react'
import type { DesktopSettingsLocaleKey } from './desktop-settings-locales.ts'
import type { ProposedCommandEntry, ProposedCommandsNode } from './proposed-commands.ts'
import { remoteBridge } from './remote-api.ts'

/** Renderer props as the Chat target supplies them for this node kind. */
export interface ProposedCommandsViewProps {
  /** This contribution's own node, materialized at the turn's end. */
  readonly node: ProposedCommandsNode
  /** Desktop settings dictionary bound to the current locale. */
  readonly t: (key: DesktopSettingsLocaleKey) => string
  /** Session that owns this conversation; its terminal is the only target. */
  readonly sessionId?: string | undefined
}

type RunState = 'idle' | 'sending' | 'sent' | 'failed'

/** One proposed command with its manual execute button. */
function CommandCard({ entry, t, sessionId }: { readonly entry: ProposedCommandEntry, readonly t: ProposedCommandsViewProps['t'], readonly sessionId?: string | undefined }) {
  const [state, setState] = useState<RunState>('idle')
  const run = (): void => {
    setState('sending')
    void remoteBridge.runInActiveShell(entry.command, sessionId).then(
      () => { setState('sent') },
      () => { setState('failed') },
    )
  }
  const done = state === 'sent'
  return (
    <div className="dshPlanCommandCard" data-state={state}>
      <div className="dshPlanCommandHead">
        <span className="dshPlanCommandTitle">{t('aishellPlanCommandTitle')}</span>
        <button
          type="button"
          className="dshPlanCommandRun"
          disabled={state === 'sending' || done}
          onClick={run}
        >
          {done ? <Check aria-hidden="true" /> : <Play aria-hidden="true" />}
          <span>{done ? t('aishellPlanCommandSent') : t('aishellPlanCommandRun')}</span>
        </button>
      </div>
      {entry.description.trim() !== '' && <p className="dshPlanCommandDesc">{entry.description}</p>}
      <pre className="dshPlanCommandCode"><code>{entry.command}</code></pre>
      {state === 'failed' && <p className="dshPlanCommandError" role="alert">{t('aishellPlanCommandFailed')}</p>}
    </div>
  )
}

/** The turn's command proposals, rendered after the final answer. */
export function ProposedCommandsView({ node, t, sessionId }: ProposedCommandsViewProps) {
  const { commands } = node.data
  if (commands.length === 0) return null
  return (
    <div className="dshAishellProposedCommands">
      {commands.map(entry => <CommandCard key={entry.callId} entry={entry} t={t} sessionId={sessionId} />)}
    </div>
  )
}
