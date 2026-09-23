/**
 * Temporary: mirror every shared Desktop source file from the stable package
 * into the Beta package while preserving the declared Beta identity tokens.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const root = process.cwd()
const stableRoot = join(root, 'shell-desktop', 'src')
const betaRoot = join(root, 'shell-desktop-beta', 'src')
const SKIP = new Set(['product-identity.ts'])

const TRANSFORMS = {
  'bin.ts': [
    ['Usage: shell-desktop ', 'Usage: shell-desktop-beta '],
    ['Launch Shell Desktop with', 'Launch Shell Desktop Beta with'],
  ],
  'desktop-terminal.ts': [
    ['start "Shell Desktop"', 'start "Shell Desktop Beta"'],
  ],
  'diagnostic-export-worker.ts': [
    ["'app: shell-desktop'", "'app: shell-desktop-beta'"],
  ],
  'safe-mode.ts': [
    ["const BIN_NAME = 'shell-desktop'", "const BIN_NAME = 'shell-desktop-beta'"],
  ],
}

function files(directory, base = directory) {
  const result = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) result.push(...files(path, base))
    else if (entry.isFile()) result.push(relative(base, path).split(sep).join('/'))
  }
  return result
}

let written = 0
for (const path of files(stableRoot).sort()) {
  if (SKIP.has(path)) continue
  let content = readFileSync(join(stableRoot, path), 'utf8')
  for (const [from, to] of TRANSFORMS[path] ?? []) {
    if (!content.includes(from)) throw new Error(`${path}: missing Beta transform source ${JSON.stringify(from)}`)
    content = content.split(from).join(to)
  }
  const target = join(betaRoot, path)
  let existing
  try { existing = readFileSync(target, 'utf8') } catch { existing = undefined }
  if (existing === content) continue
  writeFileSync(target, content)
  written += 1
  process.stdout.write(`synced src/${path}\n`)
}
process.stdout.write(`synced ${String(written)} source files\n`)
