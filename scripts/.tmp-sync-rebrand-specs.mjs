/**
 * Temporary: mirror the rebrand-aligned Desktop specs into the Beta package with
 * only the declared edition differences (product and artifact names). Shared
 * internal identifiers keep their `shell-desktop-*` spelling in both editions.
 */

import { readFileSync, writeFileSync } from 'node:fs'

const FILES = [
  'tests/client-environment.spec.ts',
  'tests/client-desktop-settings.spec.ts',
  'tests/local-window-policy.spec.ts',
  'tests/profile-create-window.spec.ts',
  'tests/electron-runtime.spec.ts',
]

const TRANSFORMS = [
  ['Shell Desktop Beta Beta', 'Shell Desktop Beta'],
  ['Shell Desktop', 'Shell Desktop Beta'],
  ['DSH-Desktop-Beta-Beta-', 'DSH-Desktop-Beta-'],
  ['DSH-Desktop-', 'DSH-Desktop-Beta-'],
]

for (const file of FILES) {
  const stable = readFileSync(`shell-desktop/${file}`, 'utf8')
  let beta = stable
  for (const [from, to] of TRANSFORMS) beta = beta.split(from).join(to)
  writeFileSync(`shell-desktop-beta/${file}`, beta)
  process.stdout.write(`synced ${file}\n`)
}
