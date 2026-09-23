/**
 * Temporary: fix the client specs after the rebrand alignment — drop imports the
 * rewritten tests no longer use and assert through a local spy.
 */

import { readFileSync, writeFileSync } from 'node:fs'

{
  const path = 'shell-desktop/tests/client-desktop-settings.spec.ts'
  let text = readFileSync(path, 'utf8')
  const edits = [
    ['  DesktopSettingsSection,\n', ''],
    ["import { DesktopTerminalSettingsAction } from '../src/client/DesktopTerminalSettingsAction.tsx'\n", ''],
    ['  DESKTOP_SETTINGS_LOCALE_NAMESPACE,\n', ''],
  ]
  for (const [from, to] of edits) {
    if (!text.includes(from)) throw new Error(`client-desktop-settings: missing ${JSON.stringify(from.slice(0, 50))}`)
    text = text.split(from).join(to)
  }
  writeFileSync(path, text)
  process.stdout.write('client-desktop-settings.spec.ts: imports trimmed\n')
}

{
  const path = 'shell-desktop/tests/client-environment.spec.ts'
  let text = readFileSync(path, 'utf8')
  const edits = [
    [
      `      slots: {
        provideRoot: vi.fn(() => () => {}),
        subscribe: vi.fn(() => () => {}),
        inject: vi.fn((_name: string, mount: () => unknown) => mount()),
        register: vi.fn((options: Record<string, unknown>, occupant: unknown) => {
          registrations.push(options)
          occupants.push(occupant)
          return () => {}
        }),
      },`,
      `      slots: {
        provideRoot: vi.fn(() => () => {}),
        subscribe: vi.fn(() => () => {}),
        inject,
        register: vi.fn((options: Record<string, unknown>, occupant: unknown) => {
          registrations.push(options)
          occupants.push(occupant)
          return () => {}
        }),
      },`,
    ],
    [
      `    vi.stubGlobal('getComputedStyle', () => ({ backgroundColor: 'rgb(0, 0, 0)' }))
    const ctx = {
      effect: vi.fn((mount: () => void | (() => void)) => {
        const dispose = mount()
        if (typeof dispose === 'function') disposers.push(dispose)
      }),
      logger: { warn: vi.fn(), error: vi.fn() },
      reflect: { get: vi.fn(), provide: vi.fn(() => () => {}) },
      theme: {
        getTheme: vi.fn(() => ({ active: { colorScheme: 'dark', tokens: {} } })),
      },
      on: vi.fn(() => () => {}),
      slots: {
        provideRoot: vi.fn(() => () => {}),
        subscribe: vi.fn(() => () => {}),
        inject,`,
      `    vi.stubGlobal('getComputedStyle', () => ({ backgroundColor: 'rgb(0, 0, 0)' }))
    const inject = vi.fn((_name: string, mount: () => unknown) => mount())
    const ctx = {
      effect: vi.fn((mount: () => void | (() => void)) => {
        const dispose = mount()
        if (typeof dispose === 'function') disposers.push(dispose)
      }),
      logger: { warn: vi.fn(), error: vi.fn() },
      reflect: { get: vi.fn(), provide: vi.fn(() => () => {}) },
      theme: {
        getTheme: vi.fn(() => ({ active: { colorScheme: 'dark', tokens: {} } })),
      },
      on: vi.fn(() => () => {}),
      slots: {
        provideRoot: vi.fn(() => () => {}),
        subscribe: vi.fn(() => () => {}),
        inject,`,
    ],
    [
      `      expect(ctx.slots.inject.mock.calls.map(([name]: [string]) => name))
        .toEqual(['conversation.hero.brand.mark'])`,
      `      expect(inject.mock.calls.map(([name]) => name)).toEqual(['conversation.hero.brand.mark'])`,
    ],
  ]
  for (const [from, to] of edits) {
    if (!text.includes(from)) throw new Error(`client-environment: missing ${JSON.stringify(from.slice(0, 60))}`)
    text = text.split(from).join(to)
  }
  writeFileSync(path, text)
  process.stdout.write('client-environment.spec.ts: spy extracted\n')
}
