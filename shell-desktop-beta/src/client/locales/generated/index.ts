/** Generated from translations/ by scripts/sync-desktop-locales.mjs; do not edit. */

import { desktopSettings as zhHantDesktop, upstream as zhHantUpstream } from './zh-Hant.ts'
import { desktopSettings as jaDesktop, upstream as jaUpstream } from './ja.ts'
import { desktopSettings as koDesktop, upstream as koUpstream } from './ko.ts'
import { desktopSettings as esDesktop, upstream as esUpstream } from './es.ts'
import { desktopSettings as frDesktop, upstream as frUpstream } from './fr.ts'
import { desktopSettings as deDesktop, upstream as deUpstream } from './de.ts'

export { DESKTOP_ADDED_LOCALES, DESKTOP_DEFAULT_LOCALE } from './catalog.ts'
export type { DesktopAddedLocale, DesktopAddedLocaleId } from './catalog.ts'

/** One generated locale pack. */
export interface DesktopLocalePack {
  /** Stable locale id. */
  readonly id: string
  /** Upstream namespace dictionaries, keyed by namespace then message key. */
  readonly upstream: Readonly<Record<string, Readonly<Record<string, string>>>>
  /** Desktop-owned `desktop.settings` dictionary. */
  readonly desktopSettings: Readonly<Record<string, string>>
}

/** Generated locale packs in registration order. */
export const DESKTOP_LOCALE_PACKS: readonly DesktopLocalePack[] = [
  { id: "zh-Hant", upstream: zhHantUpstream, desktopSettings: zhHantDesktop },
  { id: "ja", upstream: jaUpstream, desktopSettings: jaDesktop },
  { id: "ko", upstream: koUpstream, desktopSettings: koDesktop },
  { id: "es", upstream: esUpstream, desktopSettings: esDesktop },
  { id: "fr", upstream: frUpstream, desktopSettings: frDesktop },
  { id: "de", upstream: deUpstream, desktopSettings: deDesktop },
]
