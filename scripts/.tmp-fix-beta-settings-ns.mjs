/**
 * Temporary: the desktop settings namespace is shared by both editions, so the
 * Beta profile spec must key its fixtures with `shell-desktop`, not the Beta
 * package name.
 */

import { readFileSync, writeFileSync } from 'node:fs'

const path = 'shell-desktop-beta/tests/profile.spec.ts'
const text = readFileSync(path, 'utf8')
const from = "'shell-desktop-beta':"
const to = "'shell-desktop':"
const hits = text.split(from).length - 1
if (hits === 0) throw new Error('no settings namespace keys found')
writeFileSync(path, text.split(from).join(to))
process.stdout.write(`reverted ${String(hits)} settings namespace keys\n`)
