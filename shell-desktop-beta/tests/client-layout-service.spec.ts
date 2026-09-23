import { afterEach, describe, expect, it, vi } from 'vitest'
import { installDesktopLayout } from '../src/client/layout-service.ts'
import { applyAdvancedShell } from '../src/client/advanced-shell.ts'
import { applyAishellShell } from '../src/client/aishell-shell.ts'
import { applyExtendedShell } from '../src/client/extended-shell.ts'
import { DesktopLayoutState } from '../src/client/layout-state.ts'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'

interface FakeStyleElement {
  id: string
  name: string
  textContent: string
  dataset: Record<string, string>
  isConnected: boolean
  content: string
  remove(): void
}

function stubDocument() {
  const byId = new Map<string, FakeStyleElement>()
  const dataset: Record<string, string | undefined> = {}
  const rootViewport = { id: 'root', dataset: {} as Record<string, string | undefined> }
  const fakeDocument = {
    getElementById: (id: string) => {
      if (id === 'root') return rootViewport
      return byId.get(id) ?? null
    },
    head: {
      appendChild(child: FakeStyleElement): void {
        byId.set(child.id, child)
      },
    },
    createElement: (_tag: string): FakeStyleElement => ({
      id: '',
      name: '',
      textContent: '',
      dataset: {},
      isConnected: true,
      content: '',
      remove() { byId.delete(this.id) },
    }),
    body: {
      dataset,
      style: { setProperty() {}, removeProperty() {} },
      setAttribute() {},
      removeAttribute() {},
    },
    documentElement: { style: { colorScheme: '', removeProperty() {}, setProperty() {} } },
  }
  vi.stubGlobal('document', fakeDocument)
  vi.stubGlobal('getComputedStyle', () => ({ backgroundColor: 'rgb(0, 0, 0)' }))
  return { byId, dataset }
}

function makeCtx() {
  return {
    reflect: { provide: vi.fn(), get: vi.fn() },
    // Cordis runs effect factories eagerly during the apply walk — mirror
    // that here so registration assertions observe real calls.
    effect: vi.fn((factory: () => unknown) => factory()),
    slots: {
      provideRoot: vi.fn((_props: unknown) => vi.fn()),
      subscribe: vi.fn((_name: string, _listener: () => void) => vi.fn()),
      entries: vi.fn(() => []),
      register: vi.fn(() => ({})),
      inject: vi.fn(),
    },
    theme: { getTheme: vi.fn(() => ({ active: { colorScheme: 'light', tokens: {} } })) },
    on: vi.fn(() => () => {}),
    // Service-gated registrations wait on `ctx.inject`; the fake runs nothing.
    inject: vi.fn(() => () => {}),
  }
}

afterEach(() => { vi.unstubAllGlobals() })

describe('installDesktopLayout', () => {
  it('installs ownership when no layout is registered', () => {
    const ctx = makeCtx()
    const dispose = vi.fn()
    ctx.reflect.provide.mockReturnValue(dispose)
    const panels = new Set(['files'])
    const layout = new DesktopLayoutState(id => panels.has(id))

    installDesktopLayout(ctx as never, layout as never)
    expect(ctx.reflect.get).toHaveBeenCalledWith('layout', false)
    expect(ctx.reflect.provide).toHaveBeenCalledWith('layout', layout)
    const { hooks: { panelInfo } } = ctx.slots.provideRoot.mock.calls[0]![0] as {
      hooks: { panelInfo: { getSnapshot(): unknown; subscribe(fn: () => void): () => void } }
    }
    const changed = vi.fn()
    const stop = panelInfo.subscribe(changed)
    layout.selectPanel('files' as MainPanelId)
    expect(panelInfo.getSnapshot()).toEqual({ activePanelId: 'files' })
    panels.clear()
    expect(ctx.slots.subscribe.mock.calls[0]![0]).toBe('main')
    ctx.slots.subscribe.mock.calls[0]![1]()
    expect(panelInfo.getSnapshot()).toEqual({ activePanelId: null })
    expect(changed).toHaveBeenCalledTimes(2)
    stop()

    // The disposal effect must be owned by the fiber so a later unload frees
    // the registration for whoever applies next; the factory result is what
    // cordis registers for uninstall.
    expect(ctx.effect).toHaveBeenCalledWith(expect.any(Function), 'desktop: layout service')
    const disposer = ctx.effect.mock.results[0]?.value
    expect(typeof disposer).toBe('function')
    ;(disposer as () => void)()
    expect(dispose).toHaveBeenCalled()
    expect(ctx.slots.provideRoot.mock.results[0]!.value).toHaveBeenCalledOnce()
    expect(ctx.slots.subscribe.mock.results[0]!.value).toHaveBeenCalledOnce()
  })

  it('rejects a layout already selected by another entry', () => {
    const ctx = makeCtx()
    ctx.reflect.get.mockReturnValue({ owner: 'third-party-layout' })

    expect(() => installDesktopLayout(ctx as never, {} as never))
      .toThrow('advanced and extended modes require exclusive layout ownership')
    expect(ctx.effect).not.toHaveBeenCalled()
    expect(ctx.reflect.provide).not.toHaveBeenCalled()
  })

  it('propagates registration failures', () => {
    const ctx = makeCtx()
    ctx.reflect.provide.mockImplementation(() => {
      throw new TypeError('cannot read properties of undefined')
    })
    expect(() => installDesktopLayout(ctx as never, {} as never)).toThrow(TypeError)
  })
})

function environmentFor(mode: 'advanced' | 'extended' | 'aishell') {
  return { mode, platform: 'win32', material: 'off', micaSupported: false, version: '2.0.2' }
}

describe('applyAdvancedShell presentation ownership', () => {
  it('owns presentation when the selected layout is available', () => {
    stubDocument()
    const ctx = makeCtx()
    ctx.reflect.provide.mockReturnValue(vi.fn())

    applyAdvancedShell(ctx as never, environmentFor('advanced') as never)

    // layout service + brand mark + owned styles/markers + theme presenter + root slot
    expect(ctx.effect).toHaveBeenCalledTimes(5)
    expect(ctx.slots.register).toHaveBeenCalledTimes(1)
  })

  it('rejects a conflicting layout before installing partial Desktop state', () => {
    const { dataset } = stubDocument()
    const ctx = makeCtx()
    ctx.reflect.get.mockReturnValue({ owner: 'third-party-layout' })

    expect(() => applyAdvancedShell(ctx as never, environmentFor('advanced') as never))
      .toThrow('advanced and extended modes require exclusive layout ownership')

    expect(ctx.effect).not.toHaveBeenCalled()
    expect(ctx.slots.register).not.toHaveBeenCalled()
    expect(dataset.dshDesktopMode).toBeUndefined()
    expect(dataset.dshDesktopPlatform).toBeUndefined()
  })
})

describe('applyAishellShell presentation ownership', () => {
  function makeAishellCtx() {
    const ctx = makeCtx() as ReturnType<typeof makeCtx> & {
      locale: { bind: (namespace: string) => (key: string) => string }
      get: (name: string) => unknown
    }
    ctx.locale = { bind: () => key => key }
    ctx.get = () => undefined
    return ctx
  }

  it('owns the rail-bearing presentation when the selected layout is available', () => {
    stubDocument()
    vi.stubGlobal('window', {
      innerWidth: 1280,
      setInterval: () => 0,
      clearInterval: () => {},
      setTimeout: () => 0,
      clearTimeout: () => {},
    })
    const ctx = makeAishellCtx()
    ctx.reflect.provide.mockReturnValue(vi.fn())

    applyAishellShell(ctx as never, environmentFor('aishell') as never, {} as never)

    // layout service + brand mark + boot session + owned styles/markers + theme
    // presenter + workspace hint + workspace setting row + command projection +
    // command view + root slot
    expect(ctx.effect).toHaveBeenCalledTimes(10)
    expect(ctx.slots.register).toHaveBeenCalledTimes(1)
    const calls = ctx.slots.register.mock.calls as unknown as Array<[{ children?: Record<string, unknown> }]>
    expect(Object.keys(calls[0]?.[0]?.children ?? {})).toEqual(['sidebar', 'main', 'shell.overlay'])
  })

  it('rejects a conflicting layout before installing partial Desktop state', () => {
    const { dataset } = stubDocument()
    const ctx = makeAishellCtx()
    ctx.reflect.get.mockReturnValue({ owner: 'third-party-layout' })

    expect(() => applyAishellShell(ctx as never, environmentFor('aishell') as never, {} as never))
      .toThrow('advanced and extended modes require exclusive layout ownership')

    expect(ctx.effect).not.toHaveBeenCalled()
    expect(ctx.slots.register).not.toHaveBeenCalled()
    expect(dataset.dshDesktopMode).toBeUndefined()
    expect(dataset.dshDesktopPlatform).toBeUndefined()
  })
})

describe('applyExtendedShell presentation ownership', () => {
  it('owns the extended presentation and frames the selected layout', () => {
    stubDocument()
    const ctx = makeCtx()
    ctx.reflect.provide.mockReturnValue(vi.fn())

    applyExtendedShell(ctx as never, environmentFor('extended') as never)

    // layout + brand mark + owned styles + presenter + root slot + framed chrome styles
    expect(ctx.effect).toHaveBeenCalledTimes(6)
    expect(ctx.slots.register).toHaveBeenCalledTimes(1)
  })

  it('rejects a conflicting layout before installing the Desktop frame', () => {
    stubDocument()
    const ctx = makeCtx()
    ctx.reflect.get.mockReturnValue({ owner: 'third-party-layout' })

    expect(() => applyExtendedShell(ctx as never, environmentFor('extended') as never))
      .toThrow('advanced and extended modes require exclusive layout ownership')

    expect(ctx.effect).not.toHaveBeenCalled()
    expect(ctx.slots.register).not.toHaveBeenCalled()
    expect(ctx.slots.inject).not.toHaveBeenCalled()
  })
})
