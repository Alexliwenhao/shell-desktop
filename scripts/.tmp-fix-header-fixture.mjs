/** Temporary: align the spoofed renderer header fixture with the renamed header. */

import { readFileSync, writeFileSync } from 'node:fs'

for (const path of [
  'shell-desktop/tests/electron-runtime.spec.ts',
  'shell-desktop-beta/tests/electron-runtime.spec.ts',
]) {
  const before = readFileSync(path, 'utf8')
  const after = before.split("'X-DSH-DESKTOP-RENDERER'").join("'X-SHELL-DESKTOP-RENDERER'")
  if (after !== before) writeFileSync(path, after)
  process.stdout.write(`${path} ${after === before ? 'unchanged' : 'updated'}\n`)
}
