/**
 * Plan-mode command proposal card: renders one command the model proposed in
 * plan mode as a code box with an execute button. Clicking the button types the
 * command into the user's active terminal; the model never executes it.
 */

import { useState } from 'react'
import { Check, Play } from 'lucide-react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { proposedCommandOf } from './plan-command.ts'
import { remoteBridge } from './remote-api.ts'

type PlanCommandCardProps = ToolCallViewProps & PropsLocale<'desktop.settings'>

type RunState = 'idle' | 'sending' | 'sent' | 'failed'

/** One proposed command with its manual execute button. */
export function PlanCommandCard({ block, t }: PlanCommandCardProps) {
  const proposed = proposedCommandOf(block)
  const [state, setState] = useState<RunState>('idle')

  if (proposed === undefined) {
    return (
      <div className="dshPlanCommandCard" data-state="invalid">
        <p className="dshPlanCommandHint">{t('aishellPlanCommandInvalid')}</p>
      </div>
    )
  }

  const run = (): void => {
    setState('sending')
    void remoteBridge.runInActiveShell(proposed.command).then(
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
      {proposed.description.trim() !== '' && <p className="dshPlanCommandDesc">{proposed.description}</p>}
      <pre className="dshPlanCommandCode"><code>{proposed.command}</code></pre>
      {state === 'failed' && <p className="dshPlanCommandError" role="alert">{t('aishellPlanCommandFailed')}</p>}
    </div>
  )
}
