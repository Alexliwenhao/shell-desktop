/**
 * Replacement for the conversation hero's workspace seat in the AI Shell: the
 * product has no workspace concept, so the seat renders nothing and the
 * official workspace picker never appears.
 */

import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

/** Hero-seat props: the framework runtime share only. */
export type WorkspaceHintProps = PropsRuntime<'conversation.hero.workspace'>

/** Occupies the hero's workspace seat without rendering any workspace UI. */
export function WorkspaceHint(_props: WorkspaceHintProps) {
  return null
}
