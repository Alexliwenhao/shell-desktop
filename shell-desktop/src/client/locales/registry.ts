/**
 * Desktop language packs: register the additional locales and their
 * dictionaries with the upstream locale service, and persist English as the
 * preference when the user never chose a language.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { LocaleSettings } from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { DESKTOP_SETTINGS_LOCALE_NAMESPACE } from '../desktop-settings.ts'
import { DESKTOP_ADDED_LOCALES, DESKTOP_DEFAULT_LOCALE, DESKTOP_LOCALE_PACKS } from './generated/index.ts'

/**
 * Upstream settings namespace owning the locale preference. The locale
 * package's client entry exports the type but not the constant, so the
 * namespace string is mirrored here.
 */
const LOCALE_SETTINGS_NAMESPACE = 'locale'

/**
 * Register the shipped language packs: the added languages themselves plus
 * every dictionary they carry (upstream namespaces and the desktop-owned
 * `desktop.settings` namespace). Every registration is an effect of the
 * calling plugin, so unload and HMR withdraw it; the addLanguage registrations
 * run first so a dictionary never lands on an unknown locale.
 * @param ctx - desktop client context.
 */
export function applyDesktopLocalePacks(ctx: ClientContext): void {
  ctx.effect(() => {
    const disposers = DESKTOP_ADDED_LOCALES.map(locale => ctx.locale.addLanguage({
      id: locale.id,
      label: locale.label,
      fallback: locale.fallback,
    }))
    for (const pack of DESKTOP_LOCALE_PACKS) {
      for (const [namespace, dict] of Object.entries(pack.upstream)) {
        disposers.push(ctx.locale.register(namespace, pack.id, dict))
      }
      disposers.push(ctx.locale.register(DESKTOP_SETTINGS_LOCALE_NAMESPACE, pack.id, pack.desktopSettings))
    }
    return () => {
      for (const dispose of disposers.reverse()) dispose()
    }
  }, 'shell-desktop: language packs')
}

/**
 * Persist English as the locale preference when the user never chose one. The
 * snapshot's `ready` status proves the settings mirror answered the Host, so
 * an absent user-layer preference is authoritative rather than "not loaded
 * yet"; the raw `user` layer is checked so a composition default could never
 * masquerade as a stored choice. Runs at most once per renderer boot.
 * @param ctx - desktop client context.
 */
export function installDesktopEnglishDefault(ctx: ClientContext): void {
  const scope = ctx.settingsScope.bind<LocaleSettings>({ namespace: LOCALE_SETTINGS_NAMESPACE })
  let attempted = false
  ctx.effect(() => {
    const apply = (): void => {
      const snapshot = scope.getSnapshot()
      if (snapshot.status !== 'ready' || snapshot.value?.preference !== undefined || attempted) return
      const user = snapshot.user
      if (typeof user === 'object' && user !== null && Object.prototype.hasOwnProperty.call(user, 'preference')) return
      attempted = true
      ctx.locale.setLocale(DESKTOP_DEFAULT_LOCALE)
    }
    const stop = scope.subscribe(apply)
    apply()
    return stop
  }, 'shell-desktop: default English locale')
}
