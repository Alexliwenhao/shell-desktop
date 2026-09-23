/**
 * Turn-footer projection for AI-Shell command proposals. Every `propose_command`
 * call is a durable `tool/call` session event; this Definition collects them per
 * turn and materializes one Chat node anchored at the turn's end, so the
 * executable cards sit with the final answer instead of inside the collapsed
 * turn-process disclosure.
 *
 * The Conversation and Chat client faces are not part of this package's client
 * compilation (their type graphs pull conflicting vendor faces), so the
 * contracts this module fills are described structurally and widened once at the
 * registration site.
 */

import { PROPOSE_COMMAND_TOOL } from './plan-command.ts'

/** Final Chat renderer kind owned by this contribution. */
export const PROPOSED_COMMANDS_NODE = 'aishell-commands'

/** One command the model proposed during a turn. */
export interface ProposedCommandEntry {
  readonly callId: string
  readonly command: string
  readonly description: string
}

/** One materialized Chat node as this contribution builds it. */
export interface ProposedCommandsNode {
  readonly key: string
  readonly kind: string
  readonly id: string
  readonly target: string
  readonly anchorSeq: number
  readonly location: unknown
  readonly visibility: 'visible'
  readonly data: { readonly commands: readonly ProposedCommandEntry[] }
}

/** State this Definition keeps for one turn. */
export interface ProposedCommandsState {
  readonly commands: readonly ProposedCommandEntry[]
}

/** Minimal view of one accepted session event. */
export interface CommandEventView {
  readonly type?: unknown
  readonly seq?: unknown
  readonly data?: {
    readonly turn?: unknown
    readonly name?: unknown
    readonly callId?: unknown
    readonly arguments?: unknown
  }
}

/** Minimal view of one accepted match: its event and resolved location. */
export interface CommandMatchView {
  readonly event: CommandEventView
  readonly location?: unknown
}

/** Minimal view of one assembled Definition Context. */
export interface CommandContextView {
  readonly key: string
  readonly id: string
  readonly matches: readonly CommandMatchView[]
  readonly start?: CommandMatchView | undefined
  readonly state?: ProposedCommandsState | undefined
}

/** Business Definition shape the Conversation registry accepts for this node. */
export interface ProposedCommandsDefinition {
  readonly kind: string
  readonly target: string
  match(event: CommandEventView): { readonly id: string; readonly role: 'start' | 'update' } | null
  start(context: CommandContextView): ProposedCommandsState
  update(context: CommandContextView, match: CommandMatchView): ProposedCommandsState
  publication(match: CommandMatchView): 'none' | 'immediate'
  buildViewNode(context: CommandContextView): ProposedCommandsNode | null
}

/** Read the turn identity carried by one event, when it has one. */
function turnOf(event: CommandEventView): number | undefined {
  const turn = event.data?.turn
  if (typeof turn === 'number' && Number.isFinite(turn)) return turn
  // A compact client event carries the same identity as text.
  if (typeof turn === 'string' && turn.trim() !== '') {
    const parsed = Number(turn)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

/**
 * Read one tool call's arguments. They arrive either as the decoded object or as
 * the raw JSON text the call carried on the wire.
 * @param value - the event's `arguments` field.
 * @returns the decoded argument object, or undefined when unusable.
 */
function argumentsOf(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return parsed !== null && typeof parsed === 'object' ? parsed as Record<string, unknown> : undefined
    } catch {
      return undefined
    }
  }
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : undefined
}

/**
 * Read the proposals carried by the accepted matches. Only this contribution's
 * tool name counts, and a malformed or blank proposal is skipped so the card
 * never renders an empty box.
 * @param matches - accepted matches in ascending log order.
 * @returns one entry per valid proposal, in call order.
 */
function proposedCommandsOf(matches: readonly CommandMatchView[]): readonly ProposedCommandEntry[] {
  const commands: ProposedCommandEntry[] = []
  for (const match of matches) {
    const data = match.event.data
    if (match.event.type !== 'tool/call' || data?.name !== PROPOSE_COMMAND_TOOL) continue
    const args = argumentsOf(data.arguments)
    if (args === undefined) continue
    const command = args['command']
    if (typeof command !== 'string' || command.trim() === '') continue
    const description = args['description']
    commands.push({
      callId: String(data.callId),
      command: command.trim(),
      description: typeof description === 'string' ? description : '',
    })
  }
  return commands
}

/**
 * Sort position for the turn's footer: the closing turn/end event sits after the
 * finalized answer, so the node renders outside the process disclosure. A turn
 * the log never closed falls back to its own first accepted event.
 * @param context - assembled Definition Context.
 * @returns the anchor sequence.
 */
function turnEndAnchor(context: CommandContextView): number {
  const end = context.matches.find(match => match.event.type === 'turn/end')?.event.seq
  const first = context.start?.event.seq ?? context.matches[0]?.event.seq
  return typeof end === 'number' ? end : (typeof first === 'number' ? first : 0)
}

/**
 * Build the turn's footer node.
 * @param context - assembled Definition Context.
 * @param commands - the turn's valid proposals.
 * @returns the materialized Chat node.
 */
function proposedCommandsNode(
  context: CommandContextView,
  commands: readonly ProposedCommandEntry[],
): ProposedCommandsNode {
  return {
    key: context.key,
    kind: PROPOSED_COMMANDS_NODE,
    id: context.id,
    target: 'chat',
    anchorSeq: turnEndAnchor(context),
    location: context.start?.location ?? context.matches[0]?.location ?? { kind: 'unresolved' },
    visibility: 'visible',
    data: { commands },
  }
}

/**
 * Definition projecting the turn's command proposals onto its end. Callers
 * register it with `ctx.uiConversation.events.register(definition)` once the
 * Conversation registry is available.
 */
export const PROPOSED_COMMANDS_DEFINITION: ProposedCommandsDefinition = {
  kind: PROPOSED_COMMANDS_NODE,
  target: 'chat',
  match: event => {
    const turn = turnOf(event)
    if (turn === undefined) return null
    if (event.type === 'turn/start') return { id: String(turn), role: 'start' }
    if (event.type === 'turn/end') return { id: String(turn), role: 'update' }
    if (event.type === 'tool/call' && event.data?.name === PROPOSE_COMMAND_TOOL) {
      return { id: String(turn), role: 'update' }
    }
    return null
  },
  start: context => ({ commands: proposedCommandsOf(context.matches) }),
  update: (context, match) => {
    const added = proposedCommandsOf([match])
    const previous = context.state?.commands ?? []
    return added.length === 0 ? { commands: previous } : { commands: [...previous, ...added] }
  },
  publication: match => (match.event.type === 'turn/end' ? 'immediate' : 'none'),
  buildViewNode: context => {
    const commands = context.state?.commands ?? []
    if (commands.length === 0) return null
    return proposedCommandsNode(context, commands)
  },
}
