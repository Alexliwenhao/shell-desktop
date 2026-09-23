/**
 * Temporary: revert spec strings that were over-transformed to Beta. Shared
 * dialog copy comes from the shared source, so the Beta spec must assert the
 * same wording; only the product name and artifact names are edition-specific.
 */

import { readFileSync, writeFileSync } from 'node:fs'

// 1. Beta electron-runtime spec: shared dialog copy must not carry the edition suffix.
{
  const path = 'shell-desktop-beta/tests/electron-runtime.spec.ts'
  let text = readFileSync(path, 'utf8')
  const edits = [
    ["'Open DSH Terminal', 'Restart Shell Desktop Beta', 'Dismiss'", "'Open DSH Terminal', 'Restart Shell Desktop', 'Dismiss'"],
    ["title: 'Restart Shell Desktop Beta'", "title: 'Restart Shell Desktop'"],
    ["title: 'Shell Desktop Beta Is Up to Date'", "title: 'Shell Desktop Is Up to Date'"],
    ["title: 'Shell Desktop Beta Update Downloaded'", "title: 'Shell Desktop Update Downloaded'"],
  ]
  for (const [from, to] of edits) {
    if (!text.includes(from)) throw new Error(`electron-runtime beta: missing ${JSON.stringify(from)}`)
    text = text.split(from).join(to)
  }
  writeFileSync(path, text)
  process.stdout.write('beta electron-runtime copy reverted\n')
}

// 2. Mirror the remaining stale Beta specs from the aligned stable package.
{
  const FILES = [
    'tests/client-layout-service.spec.ts',
    'tests/profile.spec.ts',
    'tests/verify-electron-fuses.spec.ts',
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
  }
  process.stdout.write(`synced ${String(FILES.length)} beta specs\n`)
}
