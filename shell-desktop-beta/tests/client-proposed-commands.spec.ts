import { describe, expect, it } from 'vitest'
import { PROPOSE_COMMAND_TOOL } from '../src/client/plan-command.ts'
import { PROPOSED_COMMANDS_DEFINITION, PROPOSED_COMMANDS_NODE } from '../src/client/proposed-commands.ts'

/** The registered Definition, widened for direct engine-style invocation. */
function definitionOf(): {
  kind: string
  target?: string
  match(event: unknown): unknown
  start(context: unknown): unknown
  update(context: unknown, match: unknown): unknown
  publication(match: unknown): unknown
  buildViewNode(context: unknown): unknown
} {
  return PROPOSED_COMMANDS_DEFINITION as never
}

function turnStart(turn: number, seq: number) {
  return { role: 'start', location: { kind: 'unresolved' }, event: { type: 'turn/start', seq, data: { turn } } }
}

function toolCall(name: string, args: unknown, seq: number, turn = 1, callId = `call-${String(seq)}`) {
  return { role: 'update', location: { kind: 'unresolved' }, event: { type: 'tool/call', seq, data: { callId, name, arguments: args, turn, step: 1 } } }
}

function turnEnd(turn: number, seq: number) {
  return { role: 'update', location: { kind: 'unresolved' }, event: { type: 'turn/end', seq, data: { turn } } }
}

function contextFor(matches: readonly unknown[], state?: unknown) {
  return {
    key: 'chat',
    kind: PROPOSED_COMMANDS_NODE,
    id: '1',
    matches,
    start: matches[0],
    state,
    current: new Map(),
  }
}

describe('proposed commands projection', () => {
  it('keys command calls to their turn and ignores unrelated events', () => {
    const definition = definitionOf()

    expect(definition.match({ type: 'turn/start', data: { turn: 3 } })).toEqual({ id: '3', role: 'start' })
    expect(definition.match({ type: 'turn/end', data: { turn: 3 } })).toEqual({ id: '3', role: 'update' })
    expect(definition.match({ type: 'tool/call', data: { name: PROPOSE_COMMAND_TOOL, turn: 3 } })).toEqual({ id: '3', role: 'update' })
    expect(definition.match({ type: 'tool/call', data: { name: 'terminal_run', turn: 3 } })).toBeNull()
    expect(definition.match({ type: 'assistant/message', data: {} })).toBeNull()
  })

  it('collects only valid proposals across the turn', () => {
    const definition = definitionOf()
    const start = turnStart(1, 10)
    let state = definition.start(contextFor([start]))

    state = definition.update(contextFor([start], state), toolCall(PROPOSE_COMMAND_TOOL, { command: 'df -h', description: '检查磁盘' }, 11))
    state = definition.update(contextFor([start], state), toolCall('terminal_run', { command: 'uptime' }, 12))
    state = definition.update(contextFor([start], state), toolCall(PROPOSE_COMMAND_TOOL, { command: '   ' }, 13))
    state = definition.update(contextFor([start], state), toolCall(PROPOSE_COMMAND_TOOL, { command: 'free -m' }, 14))

    expect(state).toEqual({
      commands: [
        { callId: 'call-11', command: 'df -h', description: '检查磁盘' },
        { callId: 'call-14', command: 'free -m', description: '' },
      ],
    })
  })

  it('reads compact events carrying string ids and raw JSON arguments', () => {
    const definition = definitionOf()
    const start = { role: 'start', location: { kind: 'unresolved' }, event: { type: 'turn/start', seq: 10, data: { turn: '7' } } }
    const call = {
      role: 'update',
      location: { kind: 'unresolved' },
      event: {
        type: 'tool/call',
        seq: 11,
        data: { callId: 'call-11', name: PROPOSE_COMMAND_TOOL, turn: '7', step: 1, arguments: '{"command":"free -h","description":"内存"}' },
      },
    }
    let state = definition.start(contextFor([start]))
    state = definition.update(contextFor([start], state), call)

    expect(state).toEqual({ commands: [{ callId: 'call-11', command: 'free -h', description: '内存' }] })
  })

  it('materializes one node at the turn end carrying the proposals', () => {
    const definition = definitionOf()
    const start = turnStart(1, 10)
    const end = turnEnd(1, 30)
    const state = { commands: [{ callId: 'call-11', command: 'df -h', description: '' }] }

    const node = definition.buildViewNode(contextFor([start, toolCall(PROPOSE_COMMAND_TOOL, { command: 'df -h' }, 11), end], state))

    expect(node).toMatchObject({
      kind: PROPOSED_COMMANDS_NODE,
      target: 'chat',
      anchorSeq: 30,
      visibility: 'visible',
      data: { commands: [{ callId: 'call-11', command: 'df -h', description: '' }] },
    })
  })

  it('renders nothing for a turn without proposals', () => {
    const definition = definitionOf()

    expect(definition.buildViewNode(contextFor([turnStart(1, 10), turnEnd(1, 20)], { commands: [] }))).toBeNull()
  })

  it('publishes immediately only when the turn closes', () => {
    const definition = definitionOf()

    expect(definition.publication(turnEnd(1, 30))).toBe('immediate')
    expect(definition.publication(toolCall(PROPOSE_COMMAND_TOOL, { command: 'df -h' }, 11))).toBe('none')
  })
})
