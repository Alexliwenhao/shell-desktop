/**
 * Temporary: align the desktop client environment spec with the shipped client
 * surface — the brand-mark registration adds a slot registration and needs a
 * logger, and the settings page is gone.
 */

import { readFileSync, writeFileSync } from 'node:fs'

const path = 'shell-desktop/tests/client-environment.spec.ts'
let text = readFileSync(path, 'utf8')

const edits = [
  // Both shell-frame tests need the client logger the brand mark writes to.
  [
    `      reflect: { get: vi.fn(), provide: vi.fn(() => () => {}) },
      theme: {`,
    `      logger: { warn: vi.fn(), error: vi.fn() },
      reflect: { get: vi.fn(), provide: vi.fn(() => () => {}) },
      theme: {`,
  ],
  // Select the root registration by name: the brand mark occupies the hero slot too.
  [
    `      expect(registrations[0]).toMatchObject({
        name: 'root',`,
    `      const root = registrations.find(options => options.name === 'root')
      expect(root).toMatchObject({
        name: 'root',`,
  ],
  [
    `      expect(registrations[0]?.inject).toBeTypeOf('function')
      const rootInject = (registrations[0]?.inject as () => Record<string, unknown>)()`,
    `      expect(root?.inject).toBeTypeOf('function')
      const rootInject = (root?.inject as () => Record<string, unknown>)()`,
  ],
]

for (const [from, to] of edits) {
  const hits = text.split(from).length - 1
  if (hits === 0) throw new Error(`missing edit: ${JSON.stringify(from.slice(0, 60))}`)
  text = text.split(from).join(to)
  process.stdout.write(`applied x${String(hits)}: ${JSON.stringify(from.slice(0, 48))}\n`)
}

// Advanced-shell assertions counted registrations by index; the brand mark now
// registers first, so count only the root registration.
const advanced = [
  [
    `      expect(registrations).toHaveLength(1)
      expect(occupants).toEqual([AdvancedFrame])
      const rootInject = (registrations[0]?.inject as () => Record<string, unknown>)()`,
    `      const rootIndex = registrations.findIndex(options => options.name === 'root')
      expect(rootIndex).toBeGreaterThanOrEqual(0)
      expect(occupants[rootIndex]).toBe(AdvancedFrame)
      const rootInject = (registrations[rootIndex]?.inject as () => Record<string, unknown>)()`,
  ],
]
for (const [from, to] of advanced) {
  if (!text.includes(from)) throw new Error(`missing advanced edit: ${JSON.stringify(from.slice(0, 60))}`)
  text = text.split(from).join(to)
}

const extended = [
  [
    `      expect(occupants[0]).toBe(ExtendedFrame)
      expect(registrations).toHaveLength(1)
      expect(ctx.slots.inject).not.toHaveBeenCalled()`,
    `      expect(occupants[registrations.indexOf(root as Record<string, unknown>)]).toBe(ExtendedFrame)
      expect(registrations.filter(options => options.name === 'root')).toHaveLength(1)
      // Only the hero brand mark occupies its own slot beside the root.
      expect(ctx.slots.inject.mock.calls.map(([name]: [string]) => name))
        .toEqual(['conversation.hero.brand.mark'])`,
  ],
]
for (const [from, to] of extended) {
  if (!text.includes(from)) throw new Error(`missing extended edit: ${JSON.stringify(from.slice(0, 60))}`)
  text = text.split(from).join(to)
}

writeFileSync(path, text)
process.stdout.write('client-environment.spec.ts patched\n')
