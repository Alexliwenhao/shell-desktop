/**
 * Temporary: Beta specs that assert edition-specific composition and packaging
 * names (row names, linux executable path) need the full name mapping.
 */

import { readFileSync, writeFileSync } from 'node:fs'

const FILES = [
  'tests/profile.spec.ts',
  'tests/verify-electron-fuses.spec.ts',
]

const TRANSFORMS = [
  ['Shell Desktop Beta Beta', 'Shell Desktop Beta'],
  ['Shell Desktop', 'Shell Desktop Beta'],
  ['DSH-Desktop-Beta-Beta-', 'DSH-Desktop-Beta-'],
  ['DSH-Desktop-', 'DSH-Desktop-Beta-'],
  ['shell-desktop-beta-beta', 'shell-desktop-beta'],
  ['shell-desktop/', 'shell-desktop-beta/'],
  ["'shell-desktop'", "'shell-desktop-beta'"],
  ['`shell-desktop`', '`shell-desktop-beta`'],
]

for (const file of FILES) {
  const stable = readFileSync(`shell-desktop/${file}`, 'utf8')
  let beta = stable
  for (const [from, to] of TRANSFORMS) beta = beta.split(from).join(to)
  writeFileSync(`shell-desktop-beta/${file}`, beta)
  process.stdout.write(`re-synced ${file} with edition names\n`)
}
