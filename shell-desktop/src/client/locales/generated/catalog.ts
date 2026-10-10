/** Generated from translations/locales.json by scripts/sync-desktop-locales.mjs; do not edit. */

/** Locale id added by the Desktop language pack. */
export type DesktopAddedLocaleId = "zh-Hant" | "ja" | "ko" | "es" | "fr" | "de"

/** One selectable locale added by the Desktop language pack. */
export interface DesktopAddedLocale {
  /** Stable BCP 47-style id stored as the locale preference. */
  readonly id: DesktopAddedLocaleId
  /** Display name written in the represented language. */
  readonly label: string
  /** Registered language consulted when this language lacks a dictionary key. */
  readonly fallback: 'zh' | 'en'
}

/** Locale the Desktop shows when no explicit preference is stored. */
export const DESKTOP_DEFAULT_LOCALE = "en" as const

/** Added locales in registration order. */
export const DESKTOP_ADDED_LOCALES: readonly DesktopAddedLocale[] = [
  { id: "zh-Hant", label: "繁體中文", fallback: "zh" },
  { id: "ja", label: "日本語", fallback: "en" },
  { id: "ko", label: "한국어", fallback: "en" },
  { id: "es", label: "Español", fallback: "en" },
  { id: "fr", label: "Français", fallback: "en" },
  { id: "de", label: "Deutsch", fallback: "en" },
]
