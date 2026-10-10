import { app, Menu } from 'electron'
import type { BrowserWindow, MenuItemConstructorOptions, NativeImage } from 'electron'
import { macApplicationMenuTemplate } from './native-menu.ts'
import type { DesktopLocale, DesktopPlatform } from './runtime.ts'
import type { DesktopWindowMaterial } from './window-material.ts'
import type { DesktopDownloadPlatform } from './update-download.ts'

/** Native presentation and capability differences selected once at startup. */
export interface ElectronPlatformStrategy {
  readonly platform: DesktopPlatform
  readonly updateDownloadPlatform: DesktopDownloadPlatform | undefined
  readonly canPickDirectory: boolean
  configureApplication(
    icon: NativeImage,
    productName: string,
    applicationMenuItems: readonly MenuItemConstructorOptions[],
    locale: DesktopLocale,
  ): void
  refreshApplicationMenu(applicationMenuItems: readonly MenuItemConstructorOptions[], locale: DesktopLocale): void
  configureWindow(window: BrowserWindow): void
  refreshThemeMaterial(window: BrowserWindow, material: DesktopWindowMaterial): void
}

class WindowsPlatformStrategy implements ElectronPlatformStrategy {
  readonly platform = 'win32'
  readonly updateDownloadPlatform = 'win32'
  readonly canPickDirectory = true

  configureApplication(
    _icon: NativeImage,
    _productName: string,
    _applicationMenuItems: readonly MenuItemConstructorOptions[] = [],
    _locale: DesktopLocale = 'en',
  ): void {}

  refreshApplicationMenu(_applicationMenuItems: readonly MenuItemConstructorOptions[], _locale: DesktopLocale): void {}

  configureWindow(window: BrowserWindow): void {
    window.removeMenu()
  }

  refreshThemeMaterial(window: BrowserWindow, material: DesktopWindowMaterial): void {
    if (material === 'mica') window.setBackgroundMaterial(material)
  }
}

class MacPlatformStrategy implements ElectronPlatformStrategy {
  readonly platform = 'darwin'
  readonly updateDownloadPlatform = 'darwin'
  readonly canPickDirectory = false

  private applicationName: string | undefined

  configureApplication(
    icon: NativeImage,
    productName: string,
    applicationMenuItems: readonly MenuItemConstructorOptions[] = [],
    locale: DesktopLocale = 'en',
  ): void {
    app.dock?.setIcon(icon)
    this.applicationName = productName
    this.refreshApplicationMenu(applicationMenuItems, locale)
  }

  refreshApplicationMenu(applicationMenuItems: readonly MenuItemConstructorOptions[], locale: DesktopLocale): void {
    const applicationName = this.applicationName
    if (applicationName === undefined) return
    Menu.setApplicationMenu(Menu.buildFromTemplate(macApplicationMenuTemplate(
      applicationName,
      locale,
      applicationMenuItems,
    )))
  }

  configureWindow(_window: BrowserWindow): void {}

  refreshThemeMaterial(_window: BrowserWindow, _material: DesktopWindowMaterial): void {}
}

class LinuxPlatformStrategy implements ElectronPlatformStrategy {
  readonly platform = 'linux'
  readonly updateDownloadPlatform = undefined
  readonly canPickDirectory = false

  configureApplication(
    _icon: NativeImage,
    _productName: string,
    _applicationMenuItems: readonly MenuItemConstructorOptions[] = [],
    _locale: DesktopLocale = 'en',
  ): void {}

  refreshApplicationMenu(_applicationMenuItems: readonly MenuItemConstructorOptions[], _locale: DesktopLocale): void {}

  configureWindow(_window: BrowserWindow): void {}

  refreshThemeMaterial(_window: BrowserWindow, _material: DesktopWindowMaterial): void {}
}

/** Select the only platform adapter used by one Electron runtime generation. */
export function electronPlatformStrategy(platform: NodeJS.Platform = process.platform): ElectronPlatformStrategy {
  if (platform === 'win32') return new WindowsPlatformStrategy()
  if (platform === 'darwin') return new MacPlatformStrategy()
  if (platform === 'linux') return new LinuxPlatformStrategy()
  throw new Error(`shell-desktop: unsupported Electron platform ${platform}`)
}
