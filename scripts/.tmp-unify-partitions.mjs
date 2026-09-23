/**
 * Temporary: unify the Desktop local-window session partition prefix with the
 * product name (`shell-desktop-*`) and update its policy plus tests.
 */

import { readFileSync, writeFileSync } from 'node:fs'

const edits = [
  ['shell-desktop/src/profile-create-window.ts', [["partition: 'dsh-profile-create'", "partition: 'shell-desktop-profile-create'"]]],
  ['shell-desktop/src/profile-selection-window.ts', [["partition: 'dsh-profile-selector'", "partition: 'shell-desktop-profile-selector'"]]],
  ['shell-desktop/src/startup-recovery-window.ts', [["partition: 'dsh-recovery'", "partition: 'shell-desktop-recovery'"]]],
  ['shell-desktop/src/local-window-policy.ts', [
    ['/^dsh-[a-z0-9-]+$/u', '/^shell-desktop-[a-z0-9-]+$/u'],
    ['dedicated in-memory dsh-* partition', 'dedicated in-memory shell-desktop-* partition'],
  ]],
  ['shell-desktop/tests/local-window-policy.spec.ts', [
    ["partition: 'dsh-local-action'", "partition: 'shell-desktop-local-action'"],
    ["'persist:dsh-local-action'", "'persist:shell-desktop-local-action'"],
    ['dedicated in-memory dsh-* partition', 'dedicated in-memory shell-desktop-* partition'],
  ]],
]

for (const [path, replacements] of edits) {
  let text = readFileSync(path, 'utf8')
  for (const [from, to] of replacements) {
    if (!text.includes(from)) throw new Error(`${path}: missing ${JSON.stringify(from)}`)
    text = text.split(from).join(to)
  }
  writeFileSync(path, text)
  process.stdout.write(`updated ${path}\n`)
}
