/**
 * Locale-aware native formatting shared by the main process and the native
 * pages: BCP 47 tags for Intl, checkpoint slot labels, item counts, and the
 * URL locale carried by auxiliary windows.
 */

import { DESKTOP_DEFAULT_LOCALE, DESKTOP_LOCALES, type DesktopLocale } from './runtime.ts'

/** BCP 47 tag used by Intl formatting for each Desktop locale. */
const INTL_TAGS: Readonly<Record<DesktopLocale, string>> = {
  en: 'en-US',
  zh: 'zh-CN',
  'zh-Hant': 'zh-TW',
  ja: 'ja-JP',
  ko: 'ko-KR',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
}

const SLOT_LABELS: Readonly<Record<DesktopLocale, (slot: number) => string>> = {
  en: slot => `Slot ${String(slot)}`,
  zh: slot => `槽位 ${String(slot)}`,
  'zh-Hant': slot => `槽位 ${String(slot)}`,
  ja: slot => `スロット ${String(slot)}`,
  ko: slot => `슬롯 ${String(slot)}`,
  es: slot => `Ranura ${String(slot)}`,
  fr: slot => `Emplacement ${String(slot)}`,
  de: slot => `Slot ${String(slot)}`,
}

const COUNTS: Readonly<Record<DesktopLocale, (value: number) => string>> = {
  en: value => value.toLocaleString('en-US'),
  zh: value => `${value.toLocaleString('zh-CN')} 个`,
  'zh-Hant': value => `${value.toLocaleString('zh-TW')} 個`,
  ja: value => `${value.toLocaleString('ja-JP')} 個`,
  ko: value => `${value.toLocaleString('ko-KR')} 개`,
  es: value => value.toLocaleString('es-ES'),
  fr: value => value.toLocaleString('fr-FR'),
  de: value => value.toLocaleString('de-DE'),
}

/** Whether a value is one of the shipped Desktop locale ids. */
export function isDesktopLocale(value: string | null | undefined): value is DesktopLocale {
  return value !== null && value !== undefined && (DESKTOP_LOCALES as readonly string[]).includes(value)
}

/** BCP 47 tag for Intl formatting in one Desktop locale. */
export function nativeIntlTag(locale: DesktopLocale): string {
  return INTL_TAGS[locale]
}

/** Checkpoint slot label, e.g. "Slot 2" or "槽位 2". */
export function nativeSlotLabel(locale: DesktopLocale, slot: number): string {
  return SLOT_LABELS[locale](slot)
}

/** Item count with the locale's counter where one is conventional. */
export function nativeCount(locale: DesktopLocale, value: number): string {
  return COUNTS[locale](value)
}

/**
 * Resolve the locale carried on an auxiliary window's URL, defaulting to
 * English so a missing or hand-edited parameter can never pick a stale locale.
 */
export function nativeLocaleFromUrl(): DesktopLocale {
  if (typeof window === 'undefined') return DESKTOP_DEFAULT_LOCALE
  const candidate = new URLSearchParams(window.location.search).get('locale')
  return isDesktopLocale(candidate) ? candidate : DESKTOP_DEFAULT_LOCALE
}
