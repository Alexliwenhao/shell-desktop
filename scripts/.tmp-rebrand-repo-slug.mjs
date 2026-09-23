/**
 * Follow-up rebrand: the original repository slug was `shell-desktop`
 * (not `dsh-desktop`), so its URLs and fixture identifiers move to the new home.
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
  ['Alexliwenhao%2Fshell-desktop', 'Alexliwenhao%2Fshell-desktop'],
  ['https://github.com/Alexliwenhao/shell-desktop', 'https://github.com/Alexliwenhao/shell-desktop'],
  ['Alexliwenhao/shell-desktop', 'Alexliwenhao/shell-desktop'],
  ['shell-desktop', 'shell-desktop'],
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
      counts.push(`${from} x${String(hits)}`)
      totals.set(from, totals.get(from) + hits)
      after = after.split(from).join(to)
    }
    if (after === before) continue
    rows.push({ rel, counts })
    if (APPLY) writeFileSync(path, after)
  }
}

walk('.', '.')
for (const row of rows) process.stdout.write(`${row.rel}  ${row.counts.join('  ')}\n`)
process.stdout.write(`\nfiles: ${String(rows.length)}${APPLY ? ' (applied)' : ' (dry run)'}\n`)
for (const [from, hits] of totals) if (hits > 0) process.stdout.write(`  ${from}: ${String(hits)}\n`)
