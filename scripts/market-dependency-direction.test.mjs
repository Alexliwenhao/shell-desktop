import assert from 'node:assert/strict'
import { test } from 'node:test'
import { verifyMarketDependencyDirection } from './market-dependency-direction.mjs'

test('allows product-name data in Market source', () => {
  assert.deepEqual(verifyMarketDependencyDirection([
    ['dsh-community-market/src/install.ts', "const blocked = new Set(['shell-desktop'])\n"],
  ]), { fileCount: 1 })
})

test('rejects Market imports of Desktop implementation', () => {
  assert.throws(() => verifyMarketDependencyDirection([
    ['dsh-community-market/src/index.ts', "import type { DesktopRuntime } from 'shell-desktop/runtime'\n"],
    ['dsh-community-market/src/beta.ts', "import type { DesktopRuntime } from 'shell-desktop-beta/runtime'\n"],
  ]), /must not import Desktop implementation/u)
  assert.throws(() => verifyMarketDependencyDirection([
    ['dsh-community-market/src/index.ts', "const desktop = await import('shell-desktop')\n"],
  ]), /must not import Desktop implementation/u)
  assert.throws(() => verifyMarketDependencyDirection([
    ['dsh-community-market/src/index.ts', "export { runtime } from '../../shell-desktop/src/runtime.js'\n"],
  ]), /must not import Desktop implementation/u)
})
