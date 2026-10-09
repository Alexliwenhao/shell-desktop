/**
 * Verify the Desktop language packs: translation coverage against the pinned
 * upstream dictionaries, generated-module freshness, and byte equality across
 * both desktop variants. Fails with an actionable report; `check:layout`
 * runs it.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  ADDED_LOCALES,
  BETA_GENERATED,
  STABLE_GENERATED,
  loadValidatedTranslations,
  renderGeneratedFiles,
  ROOT,
} from './desktop-locales-core.mjs'

const { catalog, dictionaries, upstream, desktop, registerSites } = await loadValidatedTranslations()
const generated = renderGeneratedFiles({ catalog, dictionaries, upstream, desktop })

const problems = []
for (const target of [BETA_GENERATED, STABLE_GENERATED]) {
  for (const [name, expected] of generated) {
    const path = join(target, name)
    if (!existsSync(path)) {
      problems.push(`${relative(ROOT, path)} is missing — run corepack yarn locale:sync`)
      continue
    }
    const actual = readFileSync(path, 'utf8')
    if (actual !== expected) problems.push(`${relative(ROOT, path)} is stale — run corepack yarn locale:sync`)
  }
}

for (const name of generated.keys()) {
  const beta = readFileSync(join(BETA_GENERATED, name), 'utf8')
  const stable = readFileSync(join(STABLE_GENERATED, name), 'utf8')
  if (beta !== stable) problems.push(`${name} differs between shell-desktop-beta and shell-desktop`)
}

if (problems.length > 0) {
  throw new Error(`verify-desktop-locales:\n${problems.map(problem => `- ${problem}`).join('\n')}`)
}

let upstreamEntries = 0
for (const dicts of Object.values(dictionaries)) upstreamEntries += Object.keys(dicts.zh).length
const desktopEntries = Object.keys(desktop.get(ADDED_LOCALES[0])).length
process.stdout.write(
  `verify-desktop-locales: ${String(Object.keys(dictionaries).length)} upstream namespaces `
  + `(${String(upstreamEntries)} strings) and ${String(desktopEntries)} desktop settings strings are fully translated `
  + `into ${String(ADDED_LOCALES.length)} locales across ${String(registerSites.length)} upstream register sites; generated modules are fresh\n`,
)
