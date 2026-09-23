/**
 * Project rebrand: shell-desktop / shell-desktop -> Shell Desktop / shell-desktop.
 *
 * Historical records (`.agents/notes`, `docs/evidence`, `_deprecated`) are left
 * untouched on purpose: they document the project as it was. The upstream
 * harness identity (`deepseek-harness`, `DeepSeek Harness`, `@deepseek-ai/*`,
 * `@agents-anywhere/*`, `DSH_*` env vars) is deliberately preserved.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const APPLY = process.argv.includes('--apply')
const SKIP_DIRS = new Set([
  '.git', '.yarn', 'node_modules', 'deepseek-harness', 'dist', 'lib', 'vendor',
  '_deprecated', 'notes',
])
const SKIP_PATHS = ['docs/evidence/', '.agents/notes/']
const TEXT = /\.(md|markdown|yml|yaml|json|ts|tsx|mjs|js|cjs|nsh|ps1|cmd|html|css|txt|i18n|patch)$/u

const REPLACEMENTS = [
  // Repository identity first: the owner moved, so the URL is not a rename of
  // the slug.
  ['https://github.com/Alexliwenhao/shell-desktop', 'https://github.com/Alexliwenhao/shell-desktop'],
  ['github.com/Alexliwenhao/shell-desktop', 'github.com/Alexliwenhao/shell-desktop'],
  ['Alexliwenhao/shell-desktop', 'Alexliwenhao/shell-desktop'],
  // Desktop package identities (Beta first: it contains the stable name).
  ['shell-desktop-beta', 'shell-desktop-beta'],
  ['shell-desktop', 'shell-desktop'],
  // CLI, identifiers, settings namespace, IPC channels, query keys, cache names.
  ['shell-desktop-beta', 'shell-desktop-beta'],
  ['shell-desktop', 'shell-desktop'],
  // Application ids.
  ['com.shelldesktop.app.beta', 'com.shelldesktop.app.beta'],
  ['com.shelldesktop.app', 'com.shelldesktop.app'],
  // Project name in prose.
  ['Shell Desktop Beta', 'Shell Desktop Beta'],
  ['Shell Desktop', 'Shell Desktop'],
]

const rows = []
const totals = new Map(REPLACEMENTS.map(([from]) => [from, 0]))

function walk(directory, base) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walk(path, base)
      continue
    }
    if (!TEXT.test(entry.name)) continue
    const rel = relative(base, path).split(sep).join('/')
    if (SKIP_PATHS.some(prefix => rel.startsWith(prefix))) continue
    if (rel === 'yarn.lock') continue
    const before = readFileSync(path, 'utf8')
    let after = before
    const counts = []
    for (const [from, to] of REPLACEMENTS) {
      const hits = after.split(from).length - 1
      if (hits === 0) continue
      counts.push(`${from}->${to} x${String(hits)}`)
      totals.set(from, totals.get(from) + hits)
      after = after.split(from).join(to)
    }
    if (after === before) continue
    rows.push({ rel, counts })
    if (APPLY) writeFileSync(path, after)
  }
}

walk('.', '.')
rows.sort((a, b) => b.counts.length - a.counts.length)
for (const row of rows) process.stdout.write(`${row.rel}  ${row.counts.join('  ')}\n`)
process.stdout.write(`\nfiles: ${String(rows.length)}${APPLY ? ' (applied)' : ' (dry run)'}\n`)
for (const [from, hits] of totals) {
  if (hits > 0) process.stdout.write(`  ${from}: ${String(hits)}\n`)
}
