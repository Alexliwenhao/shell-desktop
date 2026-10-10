import '../shared/theme.css'
import './style.css'
import { CSPProvider } from '@base-ui/react/csp-provider'
import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import type { CompatibilityChromeBridge, CompatibilityChromeCommand, CompatibilityChromeState } from '../../compatibility-chrome-contract.ts'
import { DesktopFrameTitlebarView } from '../../client/DesktopFrameTitlebarView.tsx'
import { en, zh, type DesktopSettingsLocaleKey } from '../../client/desktop-settings-locales.ts'
import { DESKTOP_LOCALE_PACKS } from '../../client/locales/generated/index.ts'
import { installChromeOverlay } from './overlay.ts'

declare global {
  interface Window { desktopChrome: CompatibilityChromeBridge }
}

const invoke = async (command: CompatibilityChromeCommand): Promise<void> => { await window.desktopChrome.invoke(command) }
const api = {
  openTerminal: () => invoke('terminal'),
  restart: () => invoke('restart'),
  restartToRecovery: () => invoke('restart-recovery'),
  reloadRenderer: () => invoke('reload'),
  toggleDeveloperTools: () => invoke('developer'),
  checkForUpdates: () => invoke('check-for-updates'),
}

/** Resolve the desktop-settings dictionary for one active locale. */
function copyFor(locale: CompatibilityChromeState['locale'] | undefined): Record<DesktopSettingsLocaleKey, string> {
  if (locale === 'zh') return zh
  const pack = DESKTOP_LOCALE_PACKS.find(candidate => candidate.id === locale)
  return (pack?.desktopSettings as Record<DesktopSettingsLocaleKey, string> | undefined) ?? en
}

/** Map a locale id to the document language used by the served markup. */
function documentLanguage(locale: CompatibilityChromeState['locale'] | undefined): string {
  if (locale === 'zh') return 'zh-CN'
  if (locale === 'zh-Hant') return 'zh-TW'
  return locale ?? 'en'
}

export function Chrome() {
  const [state, setState] = useState<CompatibilityChromeState>()
  const [generation, setGeneration] = useState(0)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const off = window.desktopChrome.subscribe(setState)
    const dismiss = (): void => { setGeneration(value => value + 1) }
    const offDismiss = window.desktopChrome.onDismiss(dismiss)
    const offOverlay = installChromeOverlay(invoke, dismiss, () => { setFailed(true) })
    void window.desktopChrome.invoke('state').then(value => { if (value) setState(value) }).catch(() => { setFailed(true) })
    return () => { off(); offDismiss(); offOverlay() }
  }, [])
  useEffect(() => {
    document.documentElement.lang = documentLanguage(state?.locale)
  }, [state?.locale])
  const copy = copyFor(state?.locale)
  if (!state) return <header className="dshDesktopFrameTitlebar">AI Shell Desktop {failed && <span role="alert">{copy.operationFailed}</span>}</header>
  return <DesktopFrameTitlebarView
    key={generation}
    api={api}
    {...(state.remoteControl && !state.remoteControl.enabled ? { remoteControl: {
      seen: state.remoteControl.seen,
      open: () => invoke('remote-control'),
    } } : {})}
    t={key => copy[key]}
    environment={{ ...state, material: state.material === 'off' ? 'off' : state.platform === 'darwin' ? 'transparent' : 'mica', micaSupported: state.material === 'mica' }}
  />
}

const root = document.getElementById('root')
if (root === null) throw new Error('shell-desktop: missing chrome root')
createRoot(root).render(<CSPProvider disableStyleElements><Chrome /></CSPProvider>)
