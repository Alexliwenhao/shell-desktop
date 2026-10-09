/** Unit tests for the Desktop language-pack extraction and generation core. */

import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  assertDictionaryPair,
  lineAt,
  parseInlineDictionary,
  parseObjectBody,
  renderCatalogModule,
  renderLocaleModule,
  resolveNamespaceIdentifier,
  unescapeTsString,
  validateDesktopTranslation,
  validateUpstreamTranslation,
} from './desktop-locales-core.mjs'

test('parseObjectBody reads bare and quoted keys with escapes', () => {
  const body = [
    "  remoteControl: '远程控制',",
    "  'profileName': 'Profile \\'name\\'',",
    "  empty: '',",
    '  // comment',
  ].join('\n')
  assert.deepEqual(parseObjectBody(body, 'test'), {
    remoteControl: '远程控制',
    profileName: "Profile 'name'",
    empty: '',
  })
})

test('parseObjectBody fails loudly on unparsable lines', () => {
  assert.throws(() => parseObjectBody('  key: SOME_CONST,', 'test'), /cannot parse line/)
})

test('parseInlineDictionary reads locale entries and tolerates braces in strings', () => {
  const source = [
    'const dictionaries: [locale: string, dict: Record<string, string>][] = [',
    "  ['zh', {",
    "    'browser.title': '选择目录',",
    "    'browser.createIn': '在\"{name}\"中新建',",
    '  }],',
    "  ['en', {",
    "    'browser.title': 'Select directory',",
    "    'browser.createIn': 'New in \"{name}\"',",
    '  }],',
    ']',
  ].join('\n')
  const parsed = parseInlineDictionary(source, 'directory-browser')
  assert.deepEqual(parsed.zh, {
    'browser.title': '选择目录',
    'browser.createIn': '在"{name}"中新建',
  })
  assert.deepEqual(parsed.en, {
    'browser.title': 'Select directory',
    'browser.createIn': 'New in "{name}"',
  })
})

test('parseInlineDictionary fails when a locale is missing', () => {
  const source = "const dictionaries = [\n  ['zh', {\n    'a': 'b',\n  }],\n]"
  assert.throws(() => parseInlineDictionary(source, 'x'), /expected zh and en/)
})

test('unescapeTsString restores escaped quotes and backslashes only', () => {
  assert.equal(unescapeTsString("session\\'s \\\\ path"), "session's \\ path")
  assert.equal(unescapeTsString('{name} stays'), '{name} stays')
})

test('resolveNamespaceIdentifier resolves same-file and imported constants', () => {
  const dir = mkdtempSync(join(tmpdir(), 'desktop-locales-'))
  const dictionary = join(dir, 'locales.ts')
  writeFileSync(dictionary, "export const NS = 'conversation'\n", 'utf8')
  const consumer = join(dir, 'apply.ts')
  const consumerSource = "import { en, NS, zh } from './locales.ts'\nregister(NS)\n"
  writeFileSync(consumer, consumerSource, 'utf8')
  assert.equal(resolveNamespaceIdentifier(consumerSource, consumer, 'NS'), 'conversation')

  const local = "const MENU_NS = 'slash.menu'\nregister(MENU_NS)\n"
  assert.equal(resolveNamespaceIdentifier(local, consumer, 'MENU_NS'), 'slash.menu')
  assert.equal(resolveNamespaceIdentifier('register(UNKNOWN)\n', consumer, 'UNKNOWN'), undefined)
})

test('lineAt counts from one', () => {
  assert.equal(lineAt('a\nb\nc', 0), 1)
  assert.equal(lineAt('a\nb\nc', 2), 2)
  assert.equal(lineAt('a\nb\nc', 4), 3)
})

test('assertDictionaryPair rejects key drift and non-strings', () => {
  assert.doesNotThrow(() => assertDictionaryPair('x', { a: '1' }, { a: '2' }))
  assert.throws(() => assertDictionaryPair('x', { a: '1' }, {}), /en misses key "a"/)
  assert.throws(() => assertDictionaryPair('x', {}, { a: '2' }), /zh misses key "a"/)
  assert.throws(() => assertDictionaryPair('x', { a: 1 }, { a: '2' }), /not a string/)
})

test('validateUpstreamTranslation enforces exact coverage', () => {
  const dictionaries = { model: { zh: { a: '甲', b: '乙' }, en: { a: 'A', b: 'B' } } }
  assert.equal(validateUpstreamTranslation('ja', dictionaries, { model: { a: 'あ', b: 'い' } }), 2)
  assert.throws(
    () => validateUpstreamTranslation('ja', dictionaries, { model: { a: 'あ' } }),
    /"model.b" is missing or empty/,
  )
  assert.throws(
    () => validateUpstreamTranslation('ja', dictionaries, { model: { a: 'あ', b: 'い', c: 'う' } }),
    /"model.c" no longer exists upstream/,
  )
  assert.throws(
    () => validateUpstreamTranslation('ja', dictionaries, {}),
    /missing namespace "model"/,
  )
})

test('validateDesktopTranslation enforces exact coverage', () => {
  const keys = ['title', 'intro']
  assert.equal(validateDesktopTranslation('ja', keys, { title: '題', intro: '説明' }), 2)
  assert.throws(() => validateDesktopTranslation('ja', keys, { title: '題' }), /"intro" is missing or empty/)
  assert.throws(() => validateDesktopTranslation('ja', keys, { title: '題', intro: '説明', extra: 'x' }), /unknown key "extra"/)
})

test('renderCatalogModule emits the added locale catalog', () => {
  const catalog = {
    default: 'en',
    locales: [
      { id: 'en', label: 'English' },
      { id: 'zh', label: '中文' },
      { id: 'zh-Hant', label: '繁體中文', fallback: 'zh' },
    ],
  }
  assert.throws(() => renderCatalogModule(catalog), /added locales must be exactly/)
})

test('renderLocaleModule emits typed dictionaries with placeholders intact', () => {
  const dictionaries = { model: { zh: { 'a.b': '甲 {name}' }, en: { 'a.b': 'A {name}' } } }
  const rendered = renderLocaleModule('ja', dictionaries, { model: { 'a.b': 'あ {name}' } }, { title: '題' })
  assert.match(rendered, /"a\.b": "あ \{name\}"/)
  assert.match(rendered, /import type \{ DesktopSettingsLocaleKey \}/)
  assert.match(rendered, /"title": "題"/)
})
