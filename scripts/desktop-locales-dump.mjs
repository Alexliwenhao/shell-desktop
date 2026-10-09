/**
 * Write one normalized translation source file:
 * `{ upstream: { namespace: { key: { en, zh } } }, desktop: { key: { en, zh } } }`.
 * Used when authoring or refreshing translations; not part of the gates.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import {
  ROOT,
  assertManifestMatchesRegisterSites,
  discoverRegisterNamespaces,
  extractUpstreamDictionaries,
  readDesktopSettingsDictionaries,
} from './desktop-locales-core.mjs'

const outPath = resolve(process.argv[2] ?? join(ROOT, 'artifacts', 'i18n-source.json'))
const dictionaries = await extractUpstreamDictionaries()
assertManifestMatchesRegisterSites(dictionaries, discoverRegisterNamespaces())
const desktop = readDesktopSettingsDictionaries()

const upstream = {}
for (const [namespace, dicts] of Object.entries(dictionaries)) {
  upstream[namespace] = {}
  for (const key of Object.keys(dicts.zh)) upstream[namespace][key] = { en: dicts.en[key], zh: dicts.zh[key] }
}
const desktopSource = {}
for (const key of Object.keys(desktop.zh)) desktopSource[key] = { en: desktop.en[key], zh: desktop.zh[key] }

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, `${JSON.stringify({ upstream, desktop: desktopSource }, null, 2)}\n`, 'utf8')
process.stdout.write(`desktop-locales-dump: wrote ${outPath}\n`)
