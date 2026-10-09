/**
 * Split the normalized translation source into per-namespace files so
 * translation work can proceed file by file. Input is the output of
 * `desktop-locales-dump.mjs`; output lands next to it under `i18n-source/`.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { ROOT } from './desktop-locales-core.mjs'

const sourcePath = join(ROOT, 'artifacts', 'i18n-source.json')
const outRoot = join(ROOT, 'artifacts', 'i18n-source')
const source = JSON.parse(readFileSync(sourcePath, 'utf8'))

rmSync(outRoot, { recursive: true, force: true })
mkdirSync(join(outRoot, 'upstream'), { recursive: true })
for (const [namespace, entries] of Object.entries(source.upstream)) {
  writeFileSync(join(outRoot, 'upstream', `${namespace}.json`), `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
}
writeFileSync(join(outRoot, 'desktop.json'), `${JSON.stringify(source.desktop, null, 2)}\n`, 'utf8')
process.stdout.write(`desktop-locales-split: wrote ${String(Object.keys(source.upstream).length)} namespace files to ${outRoot}\n`)
void dirname
