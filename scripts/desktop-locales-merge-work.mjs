/**
 * Assemble one locale's translated work files into the committed translation
 * source. Work layout (under artifacts/i18n-work/<locale>/):
 *   upstream/<namespace>.json  — same keys as artifacts/i18n-source/upstream/*
 *   desktop.json               — same keys as artifacts/i18n-source/desktop.json
 * The merge keeps the source key order and fails on missing or extra keys.
 * Run `corepack yarn locale:sync` afterwards to validate and regenerate.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './desktop-locales-core.mjs'

const locale = process.argv[2]
if (locale === undefined) throw new Error('usage: node scripts/desktop-locales-merge-work.mjs <locale>')
const source = JSON.parse(readFileSync(join(ROOT, 'artifacts', 'i18n-source.json'), 'utf8'))
const workRoot = join(ROOT, 'artifacts', 'i18n-work', locale)

const upstream = {}
for (const [namespace, entries] of Object.entries(source.upstream)) {
  const path = join(workRoot, 'upstream', `${namespace}.json`)
  if (!existsSync(path)) throw new Error(`missing work file: ${path}`)
  const translated = JSON.parse(readFileSync(path, 'utf8'))
  const section = {}
  for (const key of Object.keys(entries)) {
    const value = translated[key]
    if (typeof value !== 'string' || value === '') throw new Error(`${path}: "${key}" is missing or not a translated string`)
    section[key] = value
  }
  for (const key of Object.keys(translated)) {
    if (!(key in entries)) throw new Error(`${path}: unexpected key "${key}"`)
  }
  upstream[namespace] = section
}

const desktopPath = join(workRoot, 'desktop.json')
if (!existsSync(desktopPath)) throw new Error(`missing work file: ${desktopPath}`)
const desktopTranslated = JSON.parse(readFileSync(desktopPath, 'utf8'))
const desktop = {}
for (const key of Object.keys(source.desktop)) {
  const value = desktopTranslated[key]
  if (typeof value !== 'string' || value === '') throw new Error(`${desktopPath}: "${key}" is missing or not a translated string`)
  desktop[key] = value
}
for (const key of Object.keys(desktopTranslated)) {
  if (!(key in source.desktop)) throw new Error(`${desktopPath}: unexpected key "${key}"`)
}

mkdirSync(join(ROOT, 'translations', 'upstream'), { recursive: true })
mkdirSync(join(ROOT, 'translations', 'desktop'), { recursive: true })
writeFileSync(join(ROOT, 'translations', 'upstream', `${locale}.json`), `${JSON.stringify(upstream, null, 2)}\n`, 'utf8')
writeFileSync(join(ROOT, 'translations', 'desktop', `${locale}.json`), `${JSON.stringify(desktop, null, 2)}\n`, 'utf8')
process.stdout.write(`desktop-locales-merge-work: assembled ${locale} (${String(Object.keys(upstream).length)} namespaces, ${String(Object.keys(desktop).length)} desktop strings)\n`)
