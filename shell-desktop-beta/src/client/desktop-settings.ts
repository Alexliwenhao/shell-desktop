/** Official Settings Slot registration for Desktop-owned preferences. */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { DesktopNotificationSettings, DesktopShellSettings } from './DesktopSettingsSection.tsx'
import { createDesktopSettingsApi } from './desktop-settings-api.ts'
import { en, zh, type DesktopSettingsLocaleKey } from './desktop-settings-locales.ts'
import { installDesktopSettingsStyles } from './desktop-settings-styles.ts'
import type { DesktopClientEnvironment } from './environment.ts'

/** Locale namespace owned by the Desktop settings page. */
export const DESKTOP_SETTINGS_LOCALE_NAMESPACE = 'desktop.settings'

/** Host settings namespaces bound through the standard client settings service. */
export const DESKTOP_SHELL_SETTINGS_NAMESPACE = 'shell-desktop'
export const DESKTOP_NOTIFICATIONS_SETTINGS_NAMESPACE = 'shell-desktop-notifications'

/** Shared client controls consumed by settings and Desktop-owned window chrome. */
export interface DesktopSettingsClientControl {
  readonly api: ReturnType<typeof createDesktopSettingsApi>
  /** Bound `shell-desktop` scope: shell presentation and the AI-Shell workspace. */
  readonly shellSettings: SettingsScope<DesktopShellSettings>
  setMode(mode: DesktopShellSettings['mode']): Promise<void>
}

/**
 * Persist a native mode choice without leaving browser access in a mode the
 * marker-free client cannot render. Custom modes withdraw browser and LAN
 * access in ordered writes; the Host compares only effective generation state.
 */
export async function persistDesktopModeSelection(
  desktopSettings: Pick<SettingsScope<DesktopShellSettings>, 'set'>,
  mode: DesktopShellSettings['mode'],
): Promise<void> {
  if (mode === 'compatibility') {
    await desktopSettings.set('mode', mode)
    return
  }
  // The titlebar is interactive before the settings mirror necessarily reaches
  // ready. Always withdraw both browser capabilities for a custom mode instead
  // of treating an unavailable or stale snapshot as browser access being off.
  // Withdraw the listener first so every intermediate persisted state remains
  // valid while compatibility mode is still selected.
  await desktopSettings.set('networkExposure', 'loopback')
  await desktopSettings.set('openBrowser', false)
  await desktopSettings.set('mode', mode)
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Desktop-only settings page copy. */
    'desktop.settings': DesktopSettingsLocaleKey
  }
}

/** Register the Desktop settings namespace bindings without a settings page. */
export function applyDesktopSettings(
  ctx: ClientContext,
  _environment: DesktopClientEnvironment,
): DesktopSettingsClientControl {
  const desktopSettings = ctx.settingsScope.bind<DesktopShellSettings>({
    namespace: DESKTOP_SHELL_SETTINGS_NAMESPACE,
  })
  ctx.settingsScope.bind<DesktopNotificationSettings>({
    namespace: DESKTOP_NOTIFICATIONS_SETTINGS_NAMESPACE,
  })
  const api = createDesktopSettingsApi()
  const setMode = async (mode: DesktopShellSettings['mode']): Promise<void> => {
    await persistDesktopModeSelection(desktopSettings, mode)
  }

  ctx.effect(
    () => ctx.locale.register(DESKTOP_SETTINGS_LOCALE_NAMESPACE, { zh, en }),
    'shell-desktop: settings dictionaries',
  )
  ctx.effect(
    () => installDesktopSettingsStyles(),
    'shell-desktop: settings styles',
  )
  // The AI shell exposes no settings page of its own and no settings actions:
  // terminal, restart, developer, and window-mode controls stay out of the
  // settings dialog entirely.

  return Object.freeze({
    api,
    shellSettings: desktopSettings,
    setMode,
  })
}
