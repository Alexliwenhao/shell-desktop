// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  DARK_TERMINAL_THEME,
  LIGHT_TERMINAL_THEME,
  TERMINAL_BACKGROUND_PROPERTY,
  documentColorScheme,
  documentTerminalTheme,
  themePalette,
} from '../src/client/terminal-theme.ts'

afterEach(() => {
  document.documentElement.style.removeProperty('color-scheme')
  document.documentElement.style.removeProperty(TERMINAL_BACKGROUND_PROPERTY)
  document.body.removeAttribute('data-ds-dark-theme')
})

describe('terminal palette', () => {
  it('uses the light palette in the light theme', () => {
    expect(documentColorScheme()).toBe('light')
    expect(documentTerminalTheme()).toBe(LIGHT_TERMINAL_THEME)
  })

  it('uses near-white text on a dark surface in the dark theme', () => {
    document.documentElement.style.colorScheme = 'dark'
    expect(documentColorScheme()).toBe('dark')
    expect(documentTerminalTheme()).toBe(DARK_TERMINAL_THEME)
    expect(DARK_TERMINAL_THEME.background).toBe('#1e1e1e')
    expect(DARK_TERMINAL_THEME.foreground).toBe('#e8e8e8')
  })

  it('recognizes the body dark attribute the desktop theme presenter sets', () => {
    document.body.setAttribute('data-ds-dark-theme', '')
    expect(documentColorScheme()).toBe('dark')
    expect(documentTerminalTheme()).toBe(DARK_TERMINAL_THEME)
  })

  it('keeps foreground and background distinct in both palettes', () => {
    for (const palette of [LIGHT_TERMINAL_THEME, DARK_TERMINAL_THEME]) {
      expect(palette.foreground).not.toBe(palette.background)
      expect(palette.cursor).toBe(palette.foreground)
    }
  })

  it('publishes the surface color for the terminal stylesheet', () => {
    document.documentElement.style.colorScheme = 'dark'
    documentTerminalTheme()
    expect(document.documentElement.style.getPropertyValue(TERMINAL_BACKGROUND_PROPERTY))
      .toBe(DARK_TERMINAL_THEME.background)
    expect(themePalette('light')).toBe(LIGHT_TERMINAL_THEME)
  })
})
