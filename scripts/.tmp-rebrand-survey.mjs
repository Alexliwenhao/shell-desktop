/** Survey the repo for the project identity strings that a rebrand would touch. */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const SKIP_DIRS = new Set(['.git', 'node_modules', 'deepseek-harness', 'dist', 'lib', 'vendor', '.yarn'])
const TEXT = /\.(md|markdown|yml|yaml|json|ts|tsx|mjs|js|cjs|nsh|ps1|cmd|html|css|txt|i18n)$/u
const PATTERNS = [
  ['shell-desktop (slug)', /shell-desktop/gu],
  ['Shell Desktop (name)', /Shell Desktop/gu],
  ['Shell Desktop', /Shell Desktop/gu],
  ['shell-desktop', /shell-desktop/gu],
  ['com.shelldesktop.app', /ai\.deepseek\.dsh\.desktop/gu],
  ['dshdesktop.cn', /dshdesktop\.cn/gu],
  ['anywhere-labs', /anywhere-labs/gu],
  ['deepseek-harness', /deepseek-harness/gu],
  ['DeepSeek Harness', /DeepSeek Harness/gu],
]

const rows = new Map()
const byPattern = new Map(PATTERNS.map(([label]) => [label, { files: 0, hits: 0 }]))
const examples = new Map(PATTERNS.map(([label]) => [label, []]))

function walk(directory, base) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walk(path, base)
      continue
    }
    if (!TEXT.test(entry.name)) continue
    const text = readFileSync(path, 'utf8')
    const rel = relative(base, path).split(sep).join('/')
    const top = rel.split('/')[0]
    for (const [label, pattern] of PATTERNS) {
      const matches = text.match(pattern)
      if (matches === null) continue
      const row = rows.get(top) ?? new Map()
      row.set(label, (row.get(label) ?? 0) + matches.length)
      rows.set(top, row)
      const totals = byPattern.get(label)
      totals.files += 1
      totals.hits += matches.length
      if (examples.get(label).length < 6) examples.get(label).push(rel)
    }
  }
}

walk('.', '.')
const width = 26
process.stdout.write(`${'area'.padEnd(width)}${PATTERNS.map(([label]) => label.slice(0, 14).padStart(15)).join('')}\n`)
for (const [area, row] of [...rows].sort((a, b) => {
  const sum = map => [...map.values()].reduce((total, value) => total + value, 0)
  return sum(b[1]) - sum(a[1])
})) {
  process.stdout.write(`${area.padEnd(width)}${PATTERNS.map(([label]) => String(row.get(label) ?? 0).padStart(15)).join('')}\n`)
}
process.stdout.write('\ntotals per pattern:\n')
for (const [label, totals] of byPattern) {
  process.stdout.write(`  ${label}: ${String(totals.hits)} hits in ${String(totals.files)} files; e.g. ${examples.get(label).join(', ')}\n`)
}
