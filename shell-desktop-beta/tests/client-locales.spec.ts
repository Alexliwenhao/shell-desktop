import { describe, expect, it, vi } from 'vitest'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { DESKTOP_SETTINGS_LOCALE_NAMESPACE } from '../src/client/desktop-settings.ts'
import { DESKTOP_ADDED_LOCALES, DESKTOP_LOCALE_PACKS } from '../src/client/locales/generated/index.ts'
import { applyDesktopLocalePacks, installDesktopEnglishDefault } from '../src/client/locales/registry.ts'

interface EffectContext {
  readonly effect: ReturnType<typeof vi.fn>
  readonly disposers: (() => void)[]
}

function createEffectContext(): EffectContext {
  const disposers: (() => void)[] = []
  const effect = vi.fn((callback: () => void | (() => void)) => {
    const dispose = callback()
    if (typeof dispose === 'function') disposers.push(dispose)
  })
  return { effect, disposers }
}

describe('Desktop language packs', () => {
  it('registers every added language before its dictionaries', () => {
    const { effect, disposers } = createEffectContext()
    const languageDisposers = DESKTOP_ADDED_LOCALES.map(() => vi.fn())
    const dictDisposers: ReturnType<typeof vi.fn>[] = []
    const addLanguage = vi.fn(() => languageDisposers.shift()!)
    const register = vi.fn(() => {
      const dispose = vi.fn()
      dictDisposers.push(dispose)
      return dispose
    })
    const ctx = { effect, locale: { addLanguage, register } } as unknown as ClientContext

    applyDesktopLocalePacks(ctx)

    expect(addLanguage.mock.calls).toEqual(DESKTOP_ADDED_LOCALES.map(locale => [
      { id: locale.id, label: locale.label, fallback: locale.fallback },
    ]))
    let expectedRegistrations = 0
    for (const pack of DESKTOP_LOCALE_PACKS) {
      for (const [namespace, dict] of Object.entries(pack.upstream)) {
        expect(register).toHaveBeenCalledWith(namespace, pack.id, dict)
        expectedRegistrations += 1
      }
      expect(register).toHaveBeenCalledWith(DESKTOP_SETTINGS_LOCALE_NAMESPACE, pack.id, pack.desktopSettings)
      expectedRegistrations += 1
    }
    expect(register).toHaveBeenCalledTimes(expectedRegistrations)

    expect(disposers).toHaveLength(1)
    for (const dispose of disposers) dispose()
    for (const dispose of languageDisposers) expect(dispose).toHaveBeenCalledOnce()
    for (const dispose of dictDisposers) expect(dispose).toHaveBeenCalledOnce()
  })
})

interface FakeSnapshot {
  status: 'loading' | 'ready' | 'unavailable'
  value: { preference?: string } | undefined
  user: unknown
}

function createLocaleContext(initial: FakeSnapshot): {
  readonly ctx: ClientContext
  readonly setLocale: ReturnType<typeof vi.fn>
  readonly notify: () => void
  readonly setSnapshot: (next: FakeSnapshot) => void
} {
  let snapshot = initial
  let listener: (() => void) | undefined
  const setLocale = vi.fn()
  const scope = {
    getSnapshot: () => snapshot,
    subscribe: (fn: () => void) => {
      listener = fn
      return vi.fn()
    },
  }
  const ctx = {
    locale: { setLocale },
    settingsScope: { bind: vi.fn(() => scope) },
    effect: (callback: () => void | (() => void)) => {
      const dispose = callback()
      void dispose
    },
  } as unknown as ClientContext
  return {
    ctx,
    setLocale,
    notify: () => { listener?.() },
    setSnapshot: (next) => { snapshot = next },
  }
}

describe('Desktop default English locale', () => {
  it('stores English once when the user layer has no preference', () => {
    const { ctx, setLocale, notify } = createLocaleContext({ status: 'ready', value: undefined, user: {} })

    installDesktopEnglishDefault(ctx)

    expect(setLocale).toHaveBeenCalledOnce()
    expect(setLocale).toHaveBeenCalledWith('en')
    notify()
    notify()
    expect(setLocale).toHaveBeenCalledOnce()
  })

  it('waits for the settings mirror before deciding', () => {
    const { ctx, setLocale, notify, setSnapshot } = createLocaleContext({ status: 'loading', value: undefined, user: undefined })

    installDesktopEnglishDefault(ctx)
    expect(setLocale).not.toHaveBeenCalled()

    setSnapshot({ status: 'ready', value: undefined, user: undefined })
    notify()
    expect(setLocale).toHaveBeenCalledOnce()
    expect(setLocale).toHaveBeenCalledWith('en')
  })

  it('never overrides a stored or resolved preference', () => {
    const stored = createLocaleContext({ status: 'ready', value: { preference: 'ja' }, user: { preference: 'ja' } })
    installDesktopEnglishDefault(stored.ctx)
    stored.notify()
    expect(stored.setLocale).not.toHaveBeenCalled()

    const resolved = createLocaleContext({ status: 'ready', value: { preference: 'de' }, user: {} })
    installDesktopEnglishDefault(resolved.ctx)
    resolved.notify()
    expect(resolved.setLocale).not.toHaveBeenCalled()

    const userLayerOnly = createLocaleContext({ status: 'ready', value: undefined, user: { preference: '' } })
    installDesktopEnglishDefault(userLayerOnly.ctx)
    userLayerOnly.notify()
    expect(userLayerOnly.setLocale).not.toHaveBeenCalled()
  })
})
