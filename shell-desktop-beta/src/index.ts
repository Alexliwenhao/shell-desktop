/** Shell Desktop Host plugin: owns the selected native shell generation. */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-cmdline'
import {
  LOCALE_SETTINGS_NAMESPACE,
  type LocaleSettings,
} from '@deepseek-ai/dsh-client-locale'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-client-connection'
import {
  THEME_SETTINGS_NAMESPACE,
  type ThemeSettings,
} from '@deepseek-ai/dsh-client-ui-theme'
import {
  handleRendererBootRequest,
  RENDERER_BOOT_REPORT_PATH,
} from './renderer-boot.ts'
import {
  DESKTOP_DIRECTORY_PICKER_PATH,
  DESKTOP_DIRECTORY_VALIDATOR_PATH,
} from './directory-picker-contract.ts'
import {
  handleDesktopDirectoryPickerRequest,
  handleDesktopDirectoryValidationRequest,
} from './directory-picker-route.ts'
import {
  DESKTOP_DIAGNOSTICS_EXPORT_PATH,
  DESKTOP_DEVELOPER_TOOLS_TOGGLE_PATH,
  DESKTOP_AA_SELECT_PATH,
  DESKTOP_MARKET_SELECT_PATH,
  DESKTOP_PROFILE_CREATE_PATH,
  DESKTOP_PROFILE_DELETE_PATH,
  DESKTOP_PROFILE_SELECT_PATH,
  DESKTOP_RESTART_PATH,
  DESKTOP_RECOVERY_RESTART_PATH,
  DESKTOP_RENDERER_RELOAD_PATH,
  DESKTOP_SETTINGS_PATH,
  DESKTOP_TERMINAL_OPEN_PATH,
} from './desktop-settings-contract.ts'
import {
  handleDesktopDiagnosticsExportRequest,
  handleDesktopDeveloperToolsToggleRequest,
  handleDesktopAaSelectRequest,
  handleDesktopMarketSelectRequest,
  handleDesktopProfileCreateRequest,
  handleDesktopProfileDeleteRequest,
  handleDesktopProfileSelectRequest,
  handleDesktopRestartRequest,
  handleDesktopRecoveryRestartRequest,
  handleDesktopRendererReloadRequest,
  handleDesktopSettingsRequest,
  handleDesktopTerminalOpenRequest,
} from './desktop-settings-route.ts'
import type {} from './desktop-settings-controller.ts'
import { acknowledgeWelcomeNotice } from './desktop-onboarding.ts'
import { DESKTOP_LAN_HTTPS_CA_PATH } from './lan-https-runtime.ts'
import { desktopBootRecoveryInjections } from './desktop-boot-recovery.ts'
import type { DesktopLocale, DesktopShellMode } from './runtime.ts'
import type {} from './runtime.ts'
import { DESKTOP_DEFAULT_WEB_PORT } from './desktop-port.ts'
import {
  desktopBrowserAccessEnabled,
  desktopBrowserAccessAvailable,
  desktopNetworkExposureForBrowserAccess,
  desktopWebServerHost,
  type DesktopNetworkExposure,
} from './desktop-network.ts'
import { DESKTOP_FRAME_HEIGHT } from './window-chrome.ts'
import {
  DEFAULT_MACOS_WINDOW_MATERIAL,
  DEFAULT_WINDOWS_WINDOW_MATERIAL,
  effectiveDesktopWindowMaterial,
  type DesktopWindowMaterial,
  type MacosWindowMaterial,
  type PersistedWindowsWindowMaterial,
  windowsSupportsMica,
} from './window-material.ts'
import { DESKTOP_PRODUCT_NAME } from './product-identity.ts'

/** Stable Cordis plugin name. */
export const name = 'desktop-shell'

/** Services required before the shell can register its renderer generation. */
/** Services required by the desktop shell; `desktopRuntime` is probed, not required. */
export const inject = ['webServer', 'webRuntime', 'appExit', 'settings', 'connection']

/** Standard settings namespace shared by tray and configuration surfaces. */
export const DESKTOP_SETTINGS_NAMESPACE = 'shell-desktop'

const UI_THEME_SETTINGS_NAMESPACE = THEME_SETTINGS_NAMESPACE
const UI_LOCALE_SETTINGS_NAMESPACE = LOCALE_SETTINGS_NAMESPACE

/** Apply the official Connection trust and browser-auth fence before a private Desktop route. */
function rejectDesktopRequest(
  ctx: Context,
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  const rejection = ctx.connection.requestRejection(req)
  if (rejection === undefined) return false
  res.writeHead(rejection)
  res.end(rejection === 401 ? 'unauthorized' : 'forbidden')
  return true
}

/** Narrow the upstream locale preference to the translations bundled by Desktop chrome. */
function desktopLocalePreference(preference: string | undefined): DesktopLocale | undefined {
  return preference === 'zh' || preference === 'en' ? preference : undefined
}

/** Desktop settings presented by the standard settings service. */
export interface DesktopSettings {
  /** Native presentation selected for the next application generation. */
  mode: DesktopShellMode
  /** Native translucency preference used on macOS custom-chrome modes. */
  macosMaterial: MacosWindowMaterial
  /** Native backdrop preference used on Windows custom-chrome modes. */
  windowsMaterial: PersistedWindowsWindowMaterial
  /** Loopback Web port selected for the next application generation; zero requests a random port. */
  port: number
  /** Whether Desktop advertises its marker-free compatibility client for browser use. */
  openBrowser: boolean
  /** Whether the next generation listens only on loopback or on every LAN interface. */
  networkExposure: DesktopNetworkExposure
  /** Log verbosity threshold applied to the file logger. */
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  /**
   * Directory of the workspace AI-Shell sessions start in. Empty defers to the
   * deployment default; the General settings row writes it when the user picks
   * or switches a workspace.
   */
  aishellWorkspace: string
}

/** Schema registered with the standard settings service. */
export const DesktopSettingsSchema: z<DesktopSettings> = z.object({
  mode: z.union(['compatibility', 'extended', 'advanced', 'aishell'] as const).default('aishell'),
  macosMaterial: z.union(['off', 'transparent'] as const).default(DEFAULT_MACOS_WINDOW_MATERIAL),
  windowsMaterial: z.union(['off', 'acrylic', 'mica'] as const).default(DEFAULT_WINDOWS_WINDOW_MATERIAL),
  port: z.number().step(1).min(0).max(65_535).default(DESKTOP_DEFAULT_WEB_PORT),
  openBrowser: z.boolean().default(false),
  networkExposure: z.union(['loopback', 'lan'] as const).default('loopback'),
  logLevel: z.union(['debug', 'info', 'warn', 'error'] as const).default('info'),
  aishellWorkspace: z.string().default(''),
})

/** Native window configuration. */
export interface Config {
  /** Native presentation mode selected before BrowserWindow construction. */
  mode: DesktopShellMode
  /** Native translucency preference used on macOS custom-chrome modes. */
  macosMaterial: MacosWindowMaterial
  /** Native backdrop preference used on Windows custom-chrome modes. */
  windowsMaterial: PersistedWindowsWindowMaterial
  /** Configured loopback Web port used to detect restart-applied settings changes. */
  port: number
  /** Configured listener exposure used to detect restart-applied settings changes. */
  networkExposure: DesktopNetworkExposure
  /** Initial window width in CSS pixels. */
  width: number
  /** Initial window height in CSS pixels. */
  height: number
  /** Minimum window width in CSS pixels. */
  minWidth: number
  /** Minimum window height in CSS pixels. */
  minHeight: number
}

/** Validated native window configuration. */
export const Config: z<Config> = z.object({
  mode: z.union(['compatibility', 'extended', 'advanced', 'aishell'] as const).default('aishell'),
  macosMaterial: z.union(['off', 'transparent'] as const).default(DEFAULT_MACOS_WINDOW_MATERIAL),
  windowsMaterial: z.union(['off', 'acrylic', 'mica'] as const).default(DEFAULT_WINDOWS_WINDOW_MATERIAL),
  port: z.number().step(1).min(0).max(65_535).default(DESKTOP_DEFAULT_WEB_PORT),
  networkExposure: z.union(['loopback', 'lan'] as const).default('loopback'),
  width: z.number().step(1).min(800).default(1280),
  height: z.number().step(1).min(600).default(840),
  minWidth: z.number().step(1).min(640).default(900),
  minHeight: z.number().step(1).min(480).default(640),
})

/**
 * Construct the unmodified upstream Web root URL.
 * @param port - active loopback Web server port.
 * @param mode - active native presentation mode.
 * @param platform - active Electron platform.
 * @returns the URL loaded by the BrowserWindow.
 */
export function desktopRendererUrl(
  port: number,
  mode: DesktopShellMode,
  platform: Context['desktopRuntime']['platform'],
  appVersion: string,
  material: DesktopWindowMaterial = 'off',
  windowsBuild?: number,
): string {
  const url = new URL(`http://127.0.0.1:${String(port)}/`)
  url.searchParams.set('shell-desktop-mode', mode)
  url.searchParams.set('shell-desktop-platform', platform)
  url.searchParams.set('shell-desktop-version', appVersion)
  url.searchParams.set('shell-desktop-material', material)
  if (mode === 'extended' || (mode === 'compatibility' && platform !== 'linux')) {
    // Body-level plugin portals do not inherit the framed root's geometry.
    // Publish the exact content boundary so they can yield Desktop chrome.
    url.searchParams.set('shell-desktop-titlebar-inset', String(DESKTOP_FRAME_HEIGHT))
  }
  if (platform === 'win32') {
    url.searchParams.set('shell-desktop-mica', windowsSupportsMica(windowsBuild) ? '1' : '0')
  }
  return url.href
}

/**
 * Register the Electron shell from active Web carrier values.
 * @param ctx - Host context carrying the Electron adapter and Web carrier.
 * @param config - validated native window values.
 */
export function apply(ctx: Context, config: Config): void {
  const runtime = ctx.get('desktopRuntime')
  if (runtime === undefined) {
    process.stderr.write(
      'shell-desktop: this profile is composed with the Shell Desktop shell, which requires the desktop launcher (desktopRuntime).\n'
      + 'Start it with `shell-desktop`, or select this profile inside the packaged Shell Desktop application.\n'
      + 'The desktop terminal, profile, and update rows stay inactive in an ordinary DSH boot.\n',
    )
    return
  }
  const appExit = ctx.get('appExit')
  if (appExit === undefined) {
    throw new Error('shell-desktop: the launcher did not provide ctx.appExit')
  }
  const browserAccess = ctx.get('desktopBrowserAccess')
  if (browserAccess === undefined) {
    throw new Error('shell-desktop: the launcher did not provide ctx.desktopBrowserAccess')
  }
  const lanHttps = ctx.get('desktopLanHttps')
  if (lanHttps === undefined) {
    throw new Error('shell-desktop: the launcher did not provide ctx.desktopLanHttps')
  }
  if (ctx.webServer.host !== desktopWebServerHost(config.networkExposure)) {
    throw new Error('shell-desktop: desktop shell WebServer host does not match networkExposure')
  }
  lanHttps.attach(ctx.webServer.port)
  const iconFilename = runtime.platform === 'darwin'
    ? 'app-icon-mac.png'
    : 'app-icon.png'
  const iconPath = fileURLToPath(new URL(`../build/${iconFilename}`, import.meta.url))
  const trayIcons = {
    templatePath: fileURLToPath(new URL('../build/tray-iconTemplate.png', import.meta.url)),
    bluePath: fileURLToPath(new URL('../build/tray-icon-blue.png', import.meta.url)),
  }
  const settings = ctx.settings.register(
    DESKTOP_SETTINGS_NAMESPACE,
    DesktopSettingsSchema,
    {
      applies: 'restart',
      validate: (value) => {
        if (!desktopBrowserAccessAvailable(value.mode) && value.openBrowser) {
          throw new Error('shell-desktop: browser access requires compatibility mode')
        }
        if (value.mode !== 'compatibility' && runtime.platform === 'linux') {
          throw new Error('shell-desktop: custom desktop shell modes are supported on macOS and Windows')
        }
      },
    },
  )

  // The browser surface opens its internal-testing notice on first run; the
  // desktop product accepts that copy revision so an AI-Shell launch is never
  // gated behind a modal the user cannot dismiss without reading it.
  ctx.effect(
    () => acknowledgeWelcomeNotice(ctx.settings, {
      onFailure: (cause) => {
        ctx.logger.warn(`shell-desktop: internal-testing notice acknowledgement failed: ${cause instanceof Error ? cause.message : String(cause)}`)
      },
    }),
    'desktop: internal-testing notice',
  )

  const rendererOrigin = `http://127.0.0.1:${String(ctx.webServer.port)}`
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: DESKTOP_LAN_HTTPS_CA_PATH,
      handler: (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.statusCode = 405
          res.setHeader('allow', 'GET, HEAD')
          res.setHeader('cache-control', 'no-store')
          res.end('method not allowed')
          return
        }
        const caCertificate = lanHttps.caCertificate
        if (caCertificate === null) {
          res.statusCode = 503
          res.setHeader('cache-control', 'no-store')
          res.end(req.method === 'HEAD' ? undefined : 'LAN HTTPS certificate unavailable')
          return
        }
        res.statusCode = 200
        res.setHeader('cache-control', 'no-store')
        res.setHeader('content-type', 'application/x-x509-ca-cert')
        res.setHeader('content-disposition', 'attachment; filename="shell-desktop-local-ca.crt"')
        res.setHeader('content-length', String(Buffer.byteLength(caCertificate)))
        res.setHeader('x-content-type-options', 'nosniff')
        res.end(req.method === 'HEAD' ? undefined : caCertificate)
      },
    }),
    'shell-desktop: public LAN HTTPS CA route',
  )
  ctx.on('webserver/index-inject', table => {
    table.push(...desktopBootRecoveryInjections())
  })
  const desktopSettings = ctx.get('desktopSettingsController')
  if (desktopSettings !== undefined) {
    const reportSettingsError = (operation: string, cause: unknown): void => {
      ctx.logger.error(
        `shell-desktop: failed to ${operation}: ${cause instanceof Error ? cause.message : String(cause)}`,
      )
    }
    const settingsRoutes = [
      [DESKTOP_SETTINGS_PATH, handleDesktopSettingsRequest],
      [DESKTOP_PROFILE_CREATE_PATH, handleDesktopProfileCreateRequest],
      [DESKTOP_PROFILE_DELETE_PATH, handleDesktopProfileDeleteRequest],
      [DESKTOP_PROFILE_SELECT_PATH, handleDesktopProfileSelectRequest],
      [DESKTOP_AA_SELECT_PATH, handleDesktopAaSelectRequest],
      [DESKTOP_MARKET_SELECT_PATH, handleDesktopMarketSelectRequest],
      [DESKTOP_TERMINAL_OPEN_PATH, handleDesktopTerminalOpenRequest],
      [DESKTOP_RESTART_PATH, handleDesktopRestartRequest],
      [DESKTOP_RECOVERY_RESTART_PATH, handleDesktopRecoveryRestartRequest],
      [DESKTOP_RENDERER_RELOAD_PATH, handleDesktopRendererReloadRequest],
      [DESKTOP_DEVELOPER_TOOLS_TOGGLE_PATH, handleDesktopDeveloperToolsToggleRequest],
      [DESKTOP_DIAGNOSTICS_EXPORT_PATH, handleDesktopDiagnosticsExportRequest],
    ] as const
    for (const [path, handler] of settingsRoutes) {
      ctx.effect(
        () => ctx.webServer.register({
          kind: 'exact',
          path,
          handler: (req, res) => {
            if (rejectDesktopRequest(ctx, req, res)) return
            return handler(
              req,
              res,
              rendererOrigin,
              desktopSettings,
              reportSettingsError,
            )
          },
        }),
        `shell-desktop: private settings route ${path}`,
      )
    }
  }
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: RENDERER_BOOT_REPORT_PATH,
      handler: (req, res) => {
        if (rejectDesktopRequest(ctx, req, res)) return
        return handleRendererBootRequest(
          req,
          res,
          rendererOrigin,
          report => { runtime.reportRendererBoot(report) },
        )
      },
    }),
    'shell-desktop: renderer boot report route',
  )
  if (runtime.platform === 'win32') {
    ctx.effect(
      () => ctx.webServer.register({
        kind: 'exact',
        path: DESKTOP_DIRECTORY_PICKER_PATH,
        handler: (req, res) => {
          if (rejectDesktopRequest(ctx, req, res)) return
          return handleDesktopDirectoryPickerRequest(
            req,
            res,
            rendererOrigin,
            () => runtime.pickDirectory(),
            cause => {
              ctx.logger.error(`shell-desktop: native directory picker failed: ${cause instanceof Error ? cause.message : String(cause)}`)
            },
          )
        },
      }),
      'shell-desktop: native directory picker route',
    )
    ctx.effect(
      () => ctx.webServer.register({
        kind: 'exact',
        path: DESKTOP_DIRECTORY_VALIDATOR_PATH,
        handler: (req, res) => {
          if (rejectDesktopRequest(ctx, req, res)) return
          return handleDesktopDirectoryValidationRequest(
            req,
            res,
            rendererOrigin,
            path => runtime.validateDirectory(path),
            cause => {
              ctx.logger.error(`shell-desktop: workspace directory validation failed: ${cause instanceof Error ? cause.message : String(cause)}`)
            },
          )
        },
      }),
      'shell-desktop: workspace directory validation route',
    )
  }
  ctx.effect(() => {
    let pending: ReturnType<typeof setImmediate> | undefined
    const updateLiveWebAccess = (
      browserEnabled: boolean,
      exposure: DesktopNetworkExposure,
    ): void => {
      browserAccess.setOrdinaryBrowserEnabled(browserEnabled)
      void lanHttps.setEnabled(browserEnabled && exposure === 'lan').then((snapshot) => {
        if (snapshot.state === 'failed') {
          ctx.logger.error(
            `shell-desktop: LAN HTTPS edge failed to start (${snapshot.errorCode ?? 'unknown'})`,
          )
        }
      }).catch((cause: unknown) => {
        ctx.logger.error(
          `shell-desktop: LAN HTTPS edge transition failed: ${cause instanceof Error ? cause.message : String(cause)}`,
        )
      })
    }
    updateLiveWebAccess(browserAccess.ordinaryBrowserEnabled, config.networkExposure)
    const stopWatching = settings.watch((next) => {
      const nextBrowserAccess = desktopBrowserAccessEnabled(
        next.mode,
        next.openBrowser,
        next.networkExposure,
      )
      const nextNetworkExposure = desktopNetworkExposureForBrowserAccess(
        nextBrowserAccess,
        next.networkExposure,
      )
      updateLiveWebAccess(nextBrowserAccess, nextNetworkExposure)
      if (next.mode === config.mode
        && next.port === config.port
        && next.macosMaterial === config.macosMaterial
        && next.windowsMaterial === config.windowsMaterial) {
        if (pending !== undefined) clearImmediate(pending)
        pending = undefined
        return
      }
      pending ??= setImmediate(() => {
        pending = undefined
        void runtime.requestRestart().catch((cause: unknown) => {
          ctx.logger.error('shell-desktop: failed to restart after startup setting change')
          ctx.logger.error(cause)
        })
      })
    })
    return () => {
      stopWatching()
      if (pending !== undefined) clearImmediate(pending)
      void lanHttps.stop()
    }
  }, 'shell-desktop: live browser access and restart-applied native settings')
  if (runtime.platform !== 'linux') {
    ctx.on('settings/updated', (namespace, next) => {
      if (namespace !== UI_THEME_SETTINGS_NAMESPACE) return
      runtime.setThemeSource((next as ThemeSettings).preference)
    })
  }
  ctx.on('settings/updated', (namespace, next) => {
    if (namespace !== UI_LOCALE_SETTINGS_NAMESPACE) return
    runtime.setLocalePreference(desktopLocalePreference((next as LocaleSettings).preference))
  })
  ctx.effect(
    () => {
      const material = effectiveDesktopWindowMaterial(
        config.mode,
        runtime.platform,
        config.macosMaterial,
        config.windowsMaterial,
        runtime.windowsBuild,
      )
      const url = desktopRendererUrl(
        ctx.webServer.port,
        config.mode,
        runtime.platform,
        runtime.updates.currentVersion,
        material,
        runtime.windowsBuild,
      )
      return runtime.schedule({
        ...config,
        material,
        ...(runtime.windowsBuild === undefined ? {} : { windowsBuild: runtime.windowsBuild }),
        url,
        authenticationUrl: ctx.connection.authenticatedUrl(new URL(url).origin),
        rendererAccessHeader: browserAccess.rendererHeader,
        productName: DESKTOP_PRODUCT_NAME,
        windowTitle: 'AI Shell Desktop',
        iconPath,
        trayIcons,
        readLocalePreference: () => {
          return desktopLocalePreference(
            (ctx.settings.get(UI_LOCALE_SETTINGS_NAMESPACE) as LocaleSettings | undefined)?.preference,
          )
        },
        readThemeSource: () => {
          const theme = ctx.settings.get(UI_THEME_SETTINGS_NAMESPACE) as ThemeSettings | undefined
          if (theme === undefined) {
            throw new Error('shell-desktop: custom shell requires the ui-theme settings namespace')
          }
          return theme.preference
        },
        ...(desktopSettings === undefined ? {} : {
          readRemoteControl: async () => {
            const aa = desktopSettings.read().aa
            return aa?.requested === true || aa?.effective === true
          },
          enableRemoteControl: async () => {
            const result = await desktopSettings.selectAa(true)
            result.afterResponse?.()
          },
        }),
        requestQuit: appExit,
        requestModeChange: async mode => {
          const current = settings.get()
          const storedBrowserCapability = current.openBrowser || current.networkExposure === 'lan'
          await settings.update(mode !== 'compatibility' && storedBrowserCapability
            ? { mode, openBrowser: false, networkExposure: 'loopback' }
            : { mode })
        },
      })
    },
    'shell-desktop: native shell generation',
  )
}
