/**
 * Regenerate the Desktop language-pack client modules from the translation
 * source, writing byte-identical files into both desktop variants. Run after
 * editing anything under translations/. `verify-desktop-locales.mjs` checks
 * freshness in CI.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  ADDED_LOCALES,
  BETA_GENERATED,
  STABLE_GENERATED,
  loadValidatedTranslations,
  renderGeneratedFiles,
  ROOT,
} from './desktop-locales-core.mjs'

const { catalog, dictionaries, upstream, desktop } = await loadValidatedTranslations()
const generated = renderGeneratedFiles({ catalog, dictionaries, upstream, desktop })

let upstreamEntries = 0
for (const dicts of Object.values(dictionaries)) upstreamEntries += Object.keys(dicts.zh).length

for (const target of [BETA_GENERATED, STABLE_GENERATED]) {
  mkdirSync(target, { recursive: true })
  for (const [name, content] of generated) {
    writeFileSync(join(target, name), content, 'utf8')
  }
}

process.stdout.write(
  `sync-desktop-locales: rendered ${String(generated.size)} modules for ${String(ADDED_LOCALES.length)} locales `
  + `(${String(upstreamEntries)} upstream strings and ${String(Object.keys(desktop.get(ADDED_LOCALES[0])).length)} desktop settings strings per locale) `
  + `into ${relative(ROOT, BETA_GENERATED)} and ${relative(ROOT, STABLE_GENERATED)}\n`,
)
