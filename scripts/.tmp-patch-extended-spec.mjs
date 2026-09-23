/** Temporary: finish the extended-shell spec alignment (brand mark registers first). */

import { readFileSync, writeFileSync } from 'node:fs'

const path = 'shell-desktop/tests/client-environment.spec.ts'
let text = readFileSync(path, 'utf8')
const from = `      expect(occupants[0]).toBe(ExtendedFrame)
      expect(registrations).toHaveLength(1)
      expect(ctx.slots.inject).not.toHaveBeenCalled()`
const to = `      expect(occupants[registrations.indexOf(root as Record<string, unknown>)]).toBe(ExtendedFrame)
      expect(registrations.filter(options => options.name === 'root')).toHaveLength(1)
      // Only the hero brand mark occupies its own slot beside the root.
      expect(ctx.slots.inject.mock.calls.map(([name]: [string]) => name))
        .toEqual(['conversation.hero.brand.mark'])`

if (text.includes(from)) {
  writeFileSync(path, text.split(from).join(to))
  process.stdout.write('extended spec aligned\n')
} else if (text.includes(to)) {
  process.stdout.write('already aligned\n')
} else {
  throw new Error('neither the old nor the new assertion block was found')
}
