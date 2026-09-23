import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { DESKTOP_REMOTE_PATHS, PROPOSE_COMMAND_TOOL, apply } from '../src/remote.ts'

type ToolDefinition = { name: string; execute(args: unknown, exec: unknown): Promise<unknown> }

interface FakeContext {
  effect(factory: () => unknown): unknown
  logger: { info(): void; warn(): void }
  webServer: {
    port: number
    register(entry: { path: string; handler: (req: unknown, res: unknown) => void }): () => void
  }
  tools: { register(definition: ToolDefinition): () => void }
  get(name: string): unknown
  on(name: string, listener: (payload: { agent: unknown }) => void): () => void
}

function makeContext(
  planMode?: { get(agent: unknown): { active: boolean } },
  config?: { aishell: boolean },
) {
  const tools = new Map<string, ToolDefinition>()
  const routes = new Map<string, (req: unknown, res: unknown) => void>()
  const listeners = new Map<string, (payload: { agent: unknown }) => void>()
  const ctx: FakeContext = {
    effect: factory => factory(),
    logger: { info: () => {}, warn: () => {} },
    webServer: {
      port: 43120,
      register: entry => { routes.set(entry.path, entry.handler); return () => {} },
    },
    tools: {
      register: definition => { tools.set(definition.name, definition); return () => {} },
    },
    get: name => (name === 'planMode' ? planMode : undefined),
    on: (name, listener) => { listeners.set(name, listener); return () => {} },
  }
  apply(ctx as never, config as never)
  return { tools, routes, listeners }
}

const EXEC = { agent: { id: 'agent' }, signal: new AbortController().signal }

describe('plan-mode terminal tools', () => {
  it('refuses terminal_run while plan mode is active', async () => {
    const { tools } = makeContext({ get: () => ({ active: true }) })
    const terminalRun = tools.get('terminal_run')

    await expect(terminalRun?.execute({ command: 'rm -rf /' }, EXEC))
      .rejects.toThrow('plan 模式下不执行命令')
  })

  it('lets terminal_run reach the session check outside plan mode', async () => {
    const { tools } = makeContext({ get: () => ({ active: false }) })
    const terminalRun = tools.get('terminal_run')

    await expect(terminalRun?.execute({ command: 'ls' }, EXEC))
      .rejects.toThrow('没有可用的终端会话')
  })

  it('does not gate when no plan-mode service is composed', async () => {
    const { tools } = makeContext()
    const terminalRun = tools.get('terminal_run')

    await expect(terminalRun?.execute({ command: 'ls' }, EXEC))
      .rejects.toThrow('没有可用的终端会话')
  })

  it('proposes a command without executing it', async () => {
    const { tools } = makeContext()
    const propose = tools.get(PROPOSE_COMMAND_TOOL)

    await expect(propose?.execute({ command: 'df -h', description: '检查磁盘' }, {}))
      .resolves.toEqual({ command: 'df -h', description: '检查磁盘' })
  })

  it('rejects a blank proposed command', async () => {
    const { tools } = makeContext()
    const propose = tools.get(PROPOSE_COMMAND_TOOL)

    await expect(propose?.execute({ command: '   ' }, {}))
      .rejects.toThrow('propose_command 需要一条非空的命令')
  })
})

describe('AI-Shell agent composition', () => {
  function agentWith(visible: readonly string[]) {
    const restricted: { allow: readonly string[] }[] = []
    const sections: { name: string; order?: number; text: string | (() => string) }[] = []
    return {
      restricted,
      sections,
      agent: {
        id: 'agent-1',
        ctx: {
          tools: {
            schemas: () => visible.map(name => ({ name })),
            restrict: (filter: { allow: readonly string[] }) => { restricted.push(filter); return () => {} },
          },
          systemPrompt: {
            section: (section: { name: string; order?: number; text: string | (() => string) }) => { sections.push(section); return () => {} },
            getSectionOrder: () => 0,
          },
        },
      },
    }
  }

  it('narrows a new agent to the tools it shares with the terminal allowlist', () => {
    const { restricted, agent } = agentWith(['terminal_run', 'pwsh', 'read', 'propose_command', 'exit_plan_mode'])
    const { listeners } = makeContext(undefined, { aishell: true })

    listeners.get('agent/created')?.({ agent })

    expect(restricted).toEqual([{ allow: ['terminal_run', 'propose_command', 'exit_plan_mode'] }])
  })

  it('drops the guidance of every tool that left the catalog', () => {
    const { sections, agent } = agentWith(['terminal_run', 'pwsh', 'web_search'])
    const { listeners } = makeContext(undefined, { aishell: true })

    listeners.get('agent/created')?.({ agent })

    expect(sections.filter(section => section.name.startsWith('tool:')))
      .toEqual([{ name: 'tool:pwsh', order: 0, text: '' }])
  })

  it('drops a shared family section only once every member is gone', () => {
    const { sections, agent } = agentWith(['terminal_run', 'job_list', 'job_output', 'job_kill'])
    const { listeners } = makeContext(undefined, { aishell: true })

    listeners.get('agent/created')?.({ agent })

    expect(sections.map(section => section.name)).toContain('tool:jobs')
  })

  it('keeps a family section while one of its tools stays callable', () => {
    const { sections, agent } = agentWith(['terminal_run', 'job_list', 'job_output'])
    const { listeners } = makeContext(undefined, { aishell: true })

    listeners.get('agent/created')?.({ agent })

    expect(sections.map(section => section.name)).not.toContain('tool:jobs')
  })

  it('replaces the preset persona with the remote-operations identity', () => {
    const { sections, agent } = agentWith(['terminal_run'])
    const { listeners } = makeContext(undefined, { aishell: true })

    listeners.get('agent/created')?.({ agent })

    expect(sections.map(section => section.name))
      .toEqual(['deployment:persona-prefix', 'deployment:persona-suffix', 'plan:policy'])
    expect(sections[0]?.text).toContain('运维专家')
    expect(sections[0]?.text).toContain('propose_command')
    expect(sections[1]?.text).toBe('')
  })

  it('renders the AI-Shell plan policy only while plan mode is active', () => {
    const { sections, agent } = agentWith(['terminal_run'])
    const planMode = { get: () => ({ active: false }) }
    const { listeners } = makeContext(planMode, { aishell: true })

    listeners.get('agent/created')?.({ agent })

    const policy = sections.find(section => section.name === 'plan:policy')
    expect(typeof policy?.text).toBe('function')
    const render = policy?.text as unknown as () => string
    expect(render()).toBe('')

    planMode.get = () => ({ active: true })
    expect(render()).toContain('可执行命令卡片')
    expect(render()).toContain('propose_command')
  })

  it('leaves the harness composition untouched when the AI-Shell mode is off', () => {
    const { restricted, sections, agent } = agentWith(['terminal_run', 'pwsh'])
    const { listeners } = makeContext()

    expect(listeners.has('agent/created')).toBe(false)
    expect(restricted).toEqual([])
    expect(sections).toEqual([])
    expect(agent.ctx.tools.schemas()).toHaveLength(2)
  })

  it('keeps the catalog when no terminal tool is registered', () => {
    const { restricted, agent } = agentWith(['pwsh', 'read'])
    const { listeners } = makeContext(undefined, { aishell: true })

    listeners.get('agent/created')?.({ agent })

    expect(restricted).toEqual([])
  })
})

function jsonRequest(body: unknown): IncomingMessage {
  const req = Readable.from([JSON.stringify(body)]) as IncomingMessage
  req.method = 'POST'
  req.headers = { origin: 'http://127.0.0.1:43120', 'content-type': 'application/json' }
  ;(req as unknown as { socket: { remoteAddress: string } }).socket = { remoteAddress: '127.0.0.1' }
  return req
}

function fakeResponse() {
  const res = {
    statusCode: 200,
    body: '',
    setHeader: vi.fn(),
    end: vi.fn((body?: string) => { res.body = body ?? '' }),
  }
  return res as unknown as ServerResponse & typeof res
}

describe('shell-exec route', () => {
  it('rejects a blank command', async () => {
    const { routes } = makeContext()
    const handler = routes.get(DESKTOP_REMOTE_PATHS.shellExec)
    const res = fakeResponse()

    handler?.(jsonRequest({ command: '   ' }), res)

    await vi.waitFor(() => { expect(res.statusCode).toBe(400) })
    expect(JSON.parse(res.body)).toEqual({ error: 'command is required' })
  })

  it('reports when no terminal session is available', async () => {
    const { routes } = makeContext()
    const handler = routes.get(DESKTOP_REMOTE_PATHS.shellExec)
    const res = fakeResponse()

    handler?.(jsonRequest({ command: 'df -h' }), res)

    await vi.waitFor(() => { expect(res.statusCode).toBe(404) })
    expect(JSON.parse(res.body)).toEqual({ error: 'no terminal session is available' })
  })
})
