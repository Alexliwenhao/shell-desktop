/**
 * Resolution hook for the extraction child process. Upstream locale modules
 * are self-contained except for `ui-agent-preset`, which re-exports a helper
 * from `@deepseek-ai/dsh-agent-presets`. Bare package specifiers resolve
 * against the desktop workspace's installed packages — the same pinned
 * runtime release the application ships.
 */

import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(new URL('../shell-desktop-beta/package.json', import.meta.url))

/**
 * Resolve bare specifiers through the desktop workspace, delegating relative,
 * absolute, file, and builtin specifiers to the default resolver.
 * @param specifier - requested module specifier.
 * @param context - resolution context from the loader.
 * @param next - default resolver.
 * @returns the resolved module record.
 */
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('node:') || specifier.startsWith('file:') || specifier.startsWith('data:')) {
    return next(specifier, context)
  }
  try {
    return { url: pathToFileURL(require.resolve(specifier)).href, shortCircuit: true }
  } catch {
    return next(specifier, context)
  }
}
