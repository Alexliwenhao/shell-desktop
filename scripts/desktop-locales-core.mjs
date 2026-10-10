/**
 * Shared extraction, validation, and generation core for the Desktop language
 * packs. The pinned upstream checkout under deepseek-harness/ is the only
 * source of namespace keys and of the English/Chinese reference text; the
 * repository-root translations/ directory is the only source of translated
 * text. `sync-desktop-locales.mjs` renders the generated client modules;
 * `verify-desktop-locales.mjs` proves they are fresh and complete.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { register } from 'node:module'
import { join, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Repository root (the desktop workspace). */
export const ROOT = resolve(import.meta.dirname, '..')
/** Pinned upstream checkout root. */
export const UPSTREAM_ROOT = join(ROOT, 'deepseek-harness')
/** Translation source root. */
export const TRANSLATIONS_ROOT = join(ROOT, 'translations')
/** Generated modules under the Beta desktop package (the development home). */
export const BETA_GENERATED = join(ROOT, 'shell-desktop-beta', 'src', 'client', 'locales', 'generated')
/** Generated modules under the stable desktop package (kept byte-identical). */
export const STABLE_GENERATED = join(ROOT, 'shell-desktop', 'src', 'client', 'locales', 'generated')
/** Desktop-owned settings namespace string (upstream owns the host namespace). */
export const DESKTOP_SETTINGS_NAMESPACE = 'desktop.settings'

/**
 * Locales added by this language pack, in registration order. English and
 * Chinese are built into the upstream locale service and are never registered
 * by the Desktop (a duplicate `(namespace, locale)` registration throws).
 */
export const ADDED_LOCALES = ['zh-Hant', 'ja', 'ko', 'es', 'fr', 'de']

/**
 * Upstream namespace dictionaries shipped by the pinned client packages.
 * `module` is relative to the upstream checkout; `zh`/`en` name the exported
 * dictionaries. The completeness gate fails when the register-call scan
 * discovers a namespace outside this table.
 */
export const UPSTREAM_SOURCES = [
  { namespace: 'common', module: 'packages/client/locale/src/locales/index.ts', zh: 'zh', en: 'en' },
  { namespace: 'settings.locale', module: 'packages/client/locale/src/locales/settings.ts', zh: 'zh', en: 'en' },
  { namespace: 'settings.agentPreset', module: 'packages/client/ui-agent-preset/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'slash.menu', module: 'packages/client/ui-input-trigger/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'approval', module: 'packages/client/ui-approval/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'permission.access', module: 'packages/client/ui-permission-presets/src/client/locales.ts', zh: 'accessZh', en: 'accessEn' },
  { namespace: 'settings.permission', module: 'packages/client/ui-permission-presets/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'conversation', module: 'packages/client/ui-conversation/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'goal', module: 'packages/client/ui-goal/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'schedule.catalog', module: 'packages/client/ui-schedule/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'open-in-app', module: 'packages/client/ui-open-in-app/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'command', module: 'packages/client/ui-commands/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'model', module: 'packages/client/ui-model-selection/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'workspace', module: 'packages/client/ui-workspace/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'deliverables', module: 'packages/client/ui-deliverables/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'feedback', module: 'packages/client/ui-message-feedback/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'reference', module: 'packages/client/ui-reference/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'plan', module: 'packages/client/ui-plan/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'job', module: 'packages/client/ui-jobs/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'workflowRun', module: 'packages/client/ui-workflow-run/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'settings.pluginInventory', module: 'packages/client/ui-settings-plugin-inventory/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'sidebarFiles', module: 'packages/client/ui-sidebar-files/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'settings', module: 'packages/client/ui-settings-general/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'sidebar', module: 'packages/client/ui-sidebar/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'settings.models', module: 'packages/client/ui-settings-models/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'chat', module: 'packages/client/ui-chat/src/client/locale.ts', zh: 'zh', en: 'en' },
  { namespace: 'sidebarCodePreview', module: 'packages/client/ui-sidebar-documentpreview/src/client/code/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'documentHtml', module: 'packages/client/ui-sidebar-documentpreview/src/client/html/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'settings.plugins', module: 'packages/client/ui-settings-plugins/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'sidebarPdf', module: 'packages/client/ui-sidebar-documentpreview/src/client/pdf/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'subagent', module: 'packages/client/ui-subagent/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'sidebarDocumentPreview', module: 'packages/client/ui-sidebar-documentpreview/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'documentMarkdown', module: 'packages/client/ui-sidebar-documentpreview/src/client/markdown/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'skill', module: 'packages/client/ui-skill/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'sidebarRight', module: 'packages/client/ui-sidebar-right/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'sidebarImage', module: 'packages/client/ui-sidebar-documentpreview/src/client/image/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'question', module: 'packages/client/ui-user-questions/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'settings.theme', module: 'packages/client/ui-theme/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'trajectory', module: 'packages/client/ui-trajectory/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'cordis', module: 'packages/extensions/ui-cordis/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'session-log-download', module: 'packages/session-query/session-log-export/src/client/locales.ts', zh: 'zh', en: 'en' },
  { namespace: 'agent-team', module: 'packages/experimental/client-ui-agent-team/src/client/locales.ts', zh: 'zh', en: 'en' },
]

/** Namespaces whose dictionaries live inline in an apply body. */
export const INLINE_SOURCES = [
  { namespace: 'directory-browser', file: 'packages/client/ui-directory-picker-browse/src/client/index.ts' },
]

/** Desktop-owned copy file that owns the key set of the `desktop.settings` namespace. */
export const DESKTOP_COPY_SOURCE = join(ROOT, 'shell-desktop-beta', 'src', 'client', 'desktop-settings-locales.ts')

/** Parsed upstream dictionaries: namespace -> { zh: Record, en: Record }. */
export async function extractUpstreamDictionaries() {
  const out = {}
  if (UPSTREAM_SOURCES.length > 0) {
    const specs = UPSTREAM_SOURCES.map(entry => ({
      namespace: entry.namespace,
      module: resolve(UPSTREAM_ROOT, entry.module),
      zh: entry.zh,
      en: entry.en,
    }))
    const imported = await importDictionaryModules(specs)
    Object.assign(out, imported)
  }
  for (const inline of INLINE_SOURCES) {
    const source = readFileSync(resolve(UPSTREAM_ROOT, inline.file), 'utf8')
    out[inline.namespace] = parseInlineDictionary(source, inline.namespace)
  }
  for (const [namespace, dicts] of Object.entries(out)) {
    assertDictionaryPair(namespace, dicts.zh, dicts.en)
  }
  return out
}

/** Import the given TypeScript modules and project the requested exports. */
async function importDictionaryModules(specs) {
  if (!process.features.typescript) {
    throw new Error('desktop-locales: this Node release cannot import TypeScript sources; use Node ^22.19 or >=24')
  }
  register('./desktop-locales-hooks.mjs', import.meta.url)
  const out = {}
  for (const spec of specs) {
    const module = await import(pathToFileURL(spec.module).href)
    out[spec.namespace] = { zh: module[spec.zh], en: module[spec.en] }
  }
  return out
}

/** Fail when one namespace's zh/en key sets or value types disagree. */
export function assertDictionaryPair(namespace, zh, en) {
  if (typeof zh !== 'object' || zh === null || Array.isArray(zh)) throw new Error(`upstream namespace "${namespace}": zh export is not an object`)
  if (typeof en !== 'object' || en === null || Array.isArray(en)) throw new Error(`upstream namespace "${namespace}": en export is not an object`)
  const zhKeys = Object.keys(zh)
  const enKeys = new Set(Object.keys(en))
  for (const key of zhKeys) {
    if (typeof zh[key] !== 'string') throw new Error(`upstream namespace "${namespace}": zh."${key}" is not a string`)
    if (!enKeys.has(key)) throw new Error(`upstream namespace "${namespace}": en misses key "${key}"`)
  }
  for (const key of enKeys) {
    if (typeof en[key] !== 'string') throw new Error(`upstream namespace "${namespace}": en."${key}" is not a string`)
    if (!(key in zh)) throw new Error(`upstream namespace "${namespace}": zh misses key "${key}"`)
  }
}

/**
 * Parse the inline `dictionaries` array of the directory-picker apply body:
 * `['zh', { 'key': 'value', ... }]` entries inside the annotated array.
 * @param source - client module source text.
 * @param namespace - namespace owning the block (for error messages).
 * @returns `{ zh, en }` dictionaries.
 */
export function parseInlineDictionary(source, namespace) {
  const anchor = source.indexOf('const dictionaries')
  if (anchor === -1) throw new Error(`inline namespace "${namespace}": no dictionaries array found`)
  const arrayStart = source.indexOf('[', source.indexOf('=', anchor))
  if (arrayStart === -1) throw new Error(`inline namespace "${namespace}": no array initializer found`)
  const dicts = {}
  let index = arrayStart + 1
  while (index < source.length) {
    while (index < source.length && /[\s,]/.test(source[index])) index += 1
    if (source[index] === ']') break
    if (source[index] !== '[') throw new Error(`inline namespace "${namespace}": expected an entry at offset ${index}`)
    const localeMatch = /^\['([A-Za-z0-9-]+)',\s*\{/.exec(source.slice(index, index + 64))
    if (!localeMatch) throw new Error(`inline namespace "${namespace}": expected ['locale', { at offset ${index}`)
    const locale = localeMatch[1]
    let cursor = index + localeMatch[0].length
    let depth = 1
    const bodyStart = cursor
    while (cursor < source.length && depth > 0) {
      const char = source[cursor]
      if (char === '{') depth += 1
      else if (char === '}') depth -= 1
      cursor += 1
    }
    if (depth !== 0) throw new Error(`inline namespace "${namespace}": unbalanced object literal`)
    dicts[locale] = parseObjectBody(source.slice(bodyStart, cursor - 1), namespace)
    while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1
    if (source[cursor] !== ']') throw new Error(`inline namespace "${namespace}": expected the entry to close at offset ${cursor}`)
    index = cursor + 1
  }
  if (dicts.zh === undefined || dicts.en === undefined) {
    throw new Error(`inline namespace "${namespace}": expected zh and en dictionaries`)
  }
  return { zh: dicts.zh, en: dicts.en }
}

/** Parse simple `'key': 'value',` object body lines, failing on anything else. */
export function parseObjectBody(body, label) {
  const out = {}
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('//') || line.startsWith('/*')) continue
    const match = /^(?:'(?:[^'\\]|\\.)*'|[A-Za-z_$][\w$]*):\s*'((?:[^'\\]|\\.)*)',?$/.exec(line)
    if (!match) throw new Error(`${label}: cannot parse line ${JSON.stringify(line)}`)
    const keyMatch = /^(?:'((?:[^'\\]|\\.)*)'|([A-Za-z_$][\w$]*)):/.exec(line)
    const key = unescapeTsString(keyMatch[1] ?? keyMatch[2])
    out[key] = unescapeTsString(match[1])
  }
  return out
}

/** Unescape a single-quoted TypeScript string body. */
export function unescapeTsString(value) {
  return value.replace(/\\(['\\])/g, '$1')
}

/**
 * Discover every namespace registered through `locale.register(...)` in the
 * pinned upstream packages by resolving the first argument either as a literal
 * or through same-file / one-level relative-import constants.
 * @returns entries `{ namespace, file, line }` for each call site.
 */
export function discoverRegisterNamespaces(packagesRoot = join(UPSTREAM_ROOT, 'packages')) {
  const sites = []
  for (const file of walkTypeScript(packagesRoot)) {
    const source = readFileSync(file, 'utf8')
    if (!source.includes('locale.register(')) continue
    const pattern = /locale\.register\(\s*(?:'([^']+)'|([A-Za-z_$][\w$]*))/g
    for (const match of source.matchAll(pattern)) {
      const namespace = match[1] ?? resolveNamespaceIdentifier(source, file, match[2])
      if (namespace === undefined) {
        throw new Error(`cannot resolve the namespace of locale.register in ${relative(ROOT, file)}:${lineAt(source, match.index)}`)
      }
      sites.push({ namespace, file: relative(UPSTREAM_ROOT, file).split(sep).join('/'), line: lineAt(source, match.index) })
    }
  }
  return sites
}

/** Resolve one identifier to a namespace literal via same-file or imported const. */
export function resolveNamespaceIdentifier(source, file, identifier) {
  const local = new RegExp(`(?:export\\s+)?const\\s+${identifier}\\s*(?::[^=]*)?=\\s*'([^']+)'`).exec(source)
  if (local) return local[1]
  const importPattern = /import\s*\{([^}]*)\}\s*from\s*'(\.[^']+)'/g
  for (const match of source.matchAll(importPattern)) {
    const names = match[1].split(',').map(name => name.trim().replace(/^type\s+/, ''))
    if (!names.includes(identifier)) continue
    const target = resolve(resolve(file, '..'), match[2])
    if (!existsSync(target)) continue
    const targetSource = readFileSync(target, 'utf8')
    const exported = new RegExp(`export\\s+const\\s+${identifier}\\s*(?::[^=]*)?=\\s*'([^']+)'`).exec(targetSource)
    if (exported) return exported[1]
  }
  return undefined
}

/** Compute the 1-based line number at one offset. */
export function lineAt(source, offset) {
  let line = 1
  for (let index = 0; index < offset && index < source.length; index += 1) {
    if (source[index] === '\n') line += 1
  }
  return line
}

/** Recursively list TypeScript files under a package tree, skipping build output. */
function walkTypeScript(directory) {
  const out = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'lib' || entry.name === 'dist' || entry.name === 'tests' || entry.name === '.git') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) out.push(...walkTypeScript(path))
    else if (entry.isFile() && entry.name.endsWith('.ts')) out.push(path)
  }
  return out
}

/** Read the Desktop-owned `zh`/`en` settings dictionaries from their TS source. */
export function readDesktopSettingsDictionaries(source = readFileSync(DESKTOP_COPY_SOURCE, 'utf8')) {
  return {
    zh: readTsDictionary(source, 'export const zh = {', 'desktop-settings-locales.ts zh'),
    en: readTsDictionary(source, 'export const en', 'desktop-settings-locales.ts en'),
  }
}

/** Read the key order of the Desktop-owned `zh` settings dictionary. */
export function readDesktopSettingsKeys(source) {
  return Object.keys(readDesktopSettingsDictionaries(source).zh)
}

/** Parse one `export const ... = { ... }` dictionary from a TypeScript source. */
function readTsDictionary(source, marker, label) {
  const start = source.indexOf(marker)
  if (start === -1) throw new Error(`${label}: marker ${JSON.stringify(marker)} not found`)
  const bodyStart = source.indexOf('{', start) + 1
  let depth = 1
  let cursor = bodyStart
  while (cursor < source.length && depth > 0) {
    if (source[cursor] === '{') depth += 1
    else if (source[cursor] === '}') depth -= 1
    cursor += 1
  }
  if (depth !== 0) throw new Error(`${label}: unbalanced object literal`)
  return parseObjectBody(source.slice(bodyStart, cursor - 1), label)
}

/** Read the locale catalog authored in translations/locales.json. */
export function readLocaleCatalog() {
  const path = join(TRANSLATIONS_ROOT, 'locales.json')
  const catalog = JSON.parse(readFileSync(path, 'utf8'))
  if (catalog.default !== 'en') throw new Error('translations/locales.json: the default locale must be "en"')
  if (!Array.isArray(catalog.locales)) throw new Error('translations/locales.json: locales must be an array')
  const ids = new Set()
  for (const entry of catalog.locales) {
    if (typeof entry.id !== 'string' || typeof entry.label !== 'string' || entry.label === '') {
      throw new Error('translations/locales.json: every locale needs a non-empty id and label')
    }
    if (ids.has(entry.id)) throw new Error(`translations/locales.json: duplicate locale "${entry.id}"`)
    ids.add(entry.id)
  }
  return catalog
}

/** Read one translation JSON, failing on malformed content. */
export function readTranslationFile(path) {
  if (!existsSync(path)) throw new Error(`missing translation file: ${relative(ROOT, path)}`)
  const value = JSON.parse(readFileSync(path, 'utf8'))
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${relative(ROOT, path)}: expected a JSON object`)
  }
  return value
}

/**
 * Validate one locale's upstream translation file against the extracted
 * dictionaries: every upstream key present exactly once, no extra keys, and
 * non-empty string values.
 * @returns the number of translated entries.
 */
export function validateUpstreamTranslation(locale, dictionaries, translation) {
  let count = 0
  for (const [namespace, dicts] of Object.entries(dictionaries)) {
    const section = translation[namespace]
    if (typeof section !== 'object' || section === null || Array.isArray(section)) {
      throw new Error(`translations/upstream/${locale}.json: missing namespace "${namespace}"`)
    }
    for (const key of Object.keys(dicts.zh)) {
      const value = section[key]
      if (typeof value !== 'string' || value === '') {
        throw new Error(`translations/upstream/${locale}.json: "${namespace}.${key}" is missing or empty`)
      }
      count += 1
    }
    for (const key of Object.keys(section)) {
      if (!(key in dicts.zh)) throw new Error(`translations/upstream/${locale}.json: "${namespace}.${key}" no longer exists upstream`)
    }
  }
  for (const namespace of Object.keys(translation)) {
    if (!(namespace in dictionaries)) throw new Error(`translations/upstream/${locale}.json: unknown namespace "${namespace}"`)
  }
  return count
}

/** Validate one locale's Desktop-owned settings translation against the key set. */
export function validateDesktopTranslation(locale, desktopKeys, translation) {
  for (const key of desktopKeys) {
    const value = translation[key]
    if (typeof value !== 'string' || value === '') {
      throw new Error(`translations/desktop/${locale}.json: key "${key}" is missing or empty`)
    }
  }
  for (const key of Object.keys(translation)) {
    if (!desktopKeys.includes(key)) throw new Error(`translations/desktop/${locale}.json: unknown key "${key}"`)
  }
  return desktopKeys.length
}

/** Render the generated locale catalog module from translations/locales.json. */
export function renderCatalogModule(catalog) {
  const added = catalog.locales.filter(locale => locale.id !== 'en' && locale.id !== 'zh')
  const addedIds = added.map(locale => locale.id)
  if (addedIds.length !== ADDED_LOCALES.length || !addedIds.every((id, index) => id === ADDED_LOCALES[index])) {
    throw new Error(`translations/locales.json: the added locales must be exactly ${ADDED_LOCALES.join(', ')} in order`)
  }
  const lines = [
    '/** Generated from translations/locales.json by scripts/sync-desktop-locales.mjs; do not edit. */',
    '',
    '/** Locale id added by the Desktop language pack. */',
    `export type DesktopAddedLocaleId = ${addedIds.map(id => JSON.stringify(id)).join(' | ')}`,
    '',
    '/** One selectable locale added by the Desktop language pack. */',
    'export interface DesktopAddedLocale {',
    '  /** Stable BCP 47-style id stored as the locale preference. */',
    '  readonly id: DesktopAddedLocaleId',
    '  /** Display name written in the represented language. */',
    '  readonly label: string',
    '  /** Registered language consulted when this language lacks a dictionary key. */',
    "  readonly fallback: 'zh' | 'en'",
    '}',
    '',
    '/** Locale the Desktop shows when no explicit preference is stored. */',
    `export const DESKTOP_DEFAULT_LOCALE = ${JSON.stringify(catalog.default)} as const`,
    '',
    '/** Added locales in registration order. */',
    'export const DESKTOP_ADDED_LOCALES: readonly DesktopAddedLocale[] = [',
  ]
  for (const locale of added) {
    lines.push(`  { id: ${JSON.stringify(locale.id)}, label: ${JSON.stringify(locale.label)}, fallback: ${JSON.stringify(locale.fallback)} },`)
  }
  lines.push(']', '')
  return lines.join('\n')
}

/** Render one generated locale dictionary module. */
export function renderLocaleModule(locale, dictionaries, upstreamTranslation, desktopTranslation) {
  const lines = [
    `/** Generated from translations/ by scripts/sync-desktop-locales.mjs; do not edit. */`,
    '',
    "import type { DesktopSettingsLocaleKey } from '../../desktop-settings-locales.ts'",
    '',
    '/** Upstream namespace dictionaries, keyed by namespace then message key. */',
    'export const upstream: Readonly<Record<string, Readonly<Record<string, string>>>> = {',
  ]
  for (const [namespace, dicts] of Object.entries(dictionaries)) {
    const section = upstreamTranslation[namespace]
    lines.push(`  ${JSON.stringify(namespace)}: {`)
    for (const key of Object.keys(dicts.zh)) {
      lines.push(`    ${JSON.stringify(key)}: ${JSON.stringify(section[key])},`)
    }
    lines.push('  },')
  }
  lines.push('}', '')
  lines.push('/** Desktop-owned `desktop.settings` dictionary. */')
  lines.push('export const desktopSettings: Readonly<Record<DesktopSettingsLocaleKey, string>> = {')
  for (const key of Object.keys(desktopTranslation)) {
    lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(desktopTranslation[key])},`)
  }
  lines.push('}', '')
  return lines.join('\n')
}

/** Render the generated aggregate module with every locale pack. */
export function renderIndexModule(localeIds) {
  const lines = [
    '/** Generated from translations/ by scripts/sync-desktop-locales.mjs; do not edit. */',
    '',
  ]
  for (const locale of localeIds) {
    lines.push(`import { desktopSettings as ${identifier(locale)}Desktop, upstream as ${identifier(locale)}Upstream } from './${locale}.ts'`)
  }
  lines.push('')
  lines.push("export { DESKTOP_ADDED_LOCALES, DESKTOP_DEFAULT_LOCALE } from './catalog.ts'")
  lines.push("export type { DesktopAddedLocale, DesktopAddedLocaleId } from './catalog.ts'")
  lines.push('')
  lines.push('/** One generated locale pack. */')
  lines.push('export interface DesktopLocalePack {')
  lines.push('  /** Stable locale id. */')
  lines.push('  readonly id: string')
  lines.push('  /** Upstream namespace dictionaries, keyed by namespace then message key. */')
  lines.push('  readonly upstream: Readonly<Record<string, Readonly<Record<string, string>>>>')
  lines.push('  /** Desktop-owned `desktop.settings` dictionary. */')
  lines.push('  readonly desktopSettings: Readonly<Record<string, string>>')
  lines.push('}')
  lines.push('')
  lines.push('/** Generated locale packs in registration order. */')
  lines.push('export const DESKTOP_LOCALE_PACKS: readonly DesktopLocalePack[] = [')
  for (const locale of localeIds) {
    lines.push(`  { id: ${JSON.stringify(locale)}, upstream: ${identifier(locale)}Upstream, desktopSettings: ${identifier(locale)}Desktop },`)
  }
  lines.push(']', '')
  return lines.join('\n')
}

/** Convert one locale id to a generated import identifier. */
export function identifier(locale) {
  return locale.replace(/[^A-Za-z0-9]/g, '')
}

/**
 * Load and validate every translation file plus the upstream extraction.
 * @returns everything the generator and verifier need.
 */
export async function loadValidatedTranslations() {
  const catalog = readLocaleCatalog()
  const dictionaries = await extractUpstreamDictionaries()
  const sites = discoverRegisterNamespaces()
  assertManifestMatchesRegisterSites(dictionaries, sites)
  const desktopKeys = readDesktopSettingsKeys()
  const upstream = new Map()
  const desktop = new Map()
  for (const locale of ADDED_LOCALES) {
    const upstreamTranslation = readTranslationFile(join(TRANSLATIONS_ROOT, 'upstream', `${locale}.json`))
    validateUpstreamTranslation(locale, dictionaries, upstreamTranslation)
    upstream.set(locale, upstreamTranslation)
    const desktopTranslation = readTranslationFile(join(TRANSLATIONS_ROOT, 'desktop', `${locale}.json`))
    validateDesktopTranslation(locale, desktopKeys, desktopTranslation)
    desktop.set(locale, desktopTranslation)
  }
  return { catalog, dictionaries, desktopKeys, upstream, desktop, registerSites: sites }
}

/** Fail when upstream registers a namespace outside the maintained table (or the reverse). */
export function assertManifestMatchesRegisterSites(dictionaries, sites) {
  const manifest = new Set([...Object.keys(dictionaries), ...INLINE_SOURCES.map(source => source.namespace)])
  const discovered = new Set(sites.map(site => site.namespace))
  const missing = [...discovered].filter(namespace => !manifest.has(namespace)).sort()
  if (missing.length > 0) {
    const detail = sites.filter(site => missing.includes(site.namespace)).map(site => `${site.namespace} (${site.file}:${site.line})`)
    throw new Error(`upstream registers namespaces outside the Desktop language-pack manifest: ${detail.join(', ')}`)
  }
  const stale = [...manifest].filter(namespace => !discovered.has(namespace)).sort()
  if (stale.length > 0) {
    throw new Error(`the Desktop language-pack manifest lists namespaces upstream no longer registers: ${stale.join(', ')}`)
  }
}

/** Render every generated module for the two desktop variants. */
export function renderGeneratedFiles({ catalog, dictionaries, upstream, desktop }) {
  const files = new Map()
  for (const locale of ADDED_LOCALES) {
    files.set(
      `${locale}.ts`,
      renderLocaleModule(locale, dictionaries, upstream.get(locale), desktop.get(locale)),
    )
  }
  files.set('catalog.ts', renderCatalogModule(catalog))
  files.set('index.ts', renderIndexModule(ADDED_LOCALES))
  return files
}
