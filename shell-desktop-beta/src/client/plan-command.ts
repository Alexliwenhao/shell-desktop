/**
 * Plan-mode command proposal helpers: the shared tool name and the argument
 * extraction the conversation card renders from. Pure — no React, no bridge.
 */

/**
 * Wire name of the Desktop plan-mode command-proposal tool. It mirrors
 * `PROPOSE_COMMAND_TOOL` in the Host bridge (`src/remote.ts`); the two must
 * stay in sync because the card registers under this key.
 */
export const PROPOSE_COMMAND_TOOL = 'propose_command'

/** One proposed command as the card renders it. */
export interface ProposedCommand {
  readonly command: string
  readonly description: string
}

/**
 * The subset of a running or settled tool-call block the parser reads: a
 * running call carries `argsRaw`, a settled one carries the backfilled call.
 */
export interface PlanCommandBlockLike {
  readonly argsRaw?: string
  readonly call?: { readonly argsRaw: string } | null
}

/**
 * Extract the proposed command from a tool-call block. Malformed JSON, a
 * missing call head, or a blank command yields undefined so the card can show
 * its invalid-call hint instead of an empty box.
 * @param block - running or settled tool-call block.
 * @returns the command and its optional description.
 */
export function proposedCommandOf(block: PlanCommandBlockLike): ProposedCommand | undefined {
  const raw = block.call?.argsRaw ?? block.argsRaw
  if (raw === undefined || raw === '') return undefined
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const command = typeof parsed.command === 'string' ? parsed.command.trim() : ''
    if (command === '') return undefined
    return { command, description: typeof parsed.description === 'string' ? parsed.description : '' }
  } catch {
    return undefined
  }
}
