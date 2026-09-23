/**
 * Terminal palette. xterm keeps the palette it was constructed with, so the
 * terminal follows the product theme explicitly: a light palette in the light
 * theme and a dark palette with near-white text in the dark theme. The color
 * scheme is read from the desktop theme presenter's own document state rather
 * than from theme tokens, so the terminal never inherits a mismatched pair of
 * background and foreground colors.
 */

/** Palette keys xterm renders from. */
export interface TerminalThemePalette {
  readonly background: string
  readonly foreground: string
  readonly cursor: string
  readonly selectionBackground: string
}

/** CSS property carrying the palette background into the terminal surfaces. */
export const TERMINAL_BACKGROUND_PROPERTY = '--dsh-aishell-terminal-bg'

/** Light theme palette: the classic white terminal. */
export const LIGHT_TERMINAL_THEME: TerminalThemePalette = Object.freeze({
  background: '#ffffff',
  foreground: '#1f2329',
  cursor: '#1f2329',
  selectionBackground: '#d9d9d9',
})

/** Dark theme palette: near-white text on a dark terminal surface. */
export const DARK_TERMINAL_THEME: TerminalThemePalette = Object.freeze({
  background: '#1e1e1e',
  foreground: '#e8e8e8',
  cursor: '#e8e8e8',
  selectionBackground: '#3a3a3a',
})

/** Attribute the desktop theme presenter sets on the body for dark themes. */
const DARK_ATTRIBUTE = 'data-ds-dark-theme'

/**
 * Read the active color scheme from the document state the desktop theme
 * presenter owns: the inline `color-scheme` on the root element, then the body
 * dark attribute set beside it.
 * @returns the active scheme; light unless the document says otherwise.
 */
export function documentColorScheme(): 'light' | 'dark' {
  if (document.documentElement.style.colorScheme === 'dark') return 'dark'
  if (document.body.hasAttribute(DARK_ATTRIBUTE)) return 'dark'
  return 'light'
}

/**
 * Resolve the terminal palette for one color scheme.
 * @param scheme - active color scheme.
 * @returns the frozen palette for that scheme.
 */
export function themePalette(scheme: 'light' | 'dark'): TerminalThemePalette {
  return scheme === 'dark' ? DARK_TERMINAL_THEME : LIGHT_TERMINAL_THEME
}

/**
 * Publish the palette background for the terminal surfaces declared in
 * `aishell-styles.ts`, so the xterm canvas and the surrounding box never
 * disagree about the terminal color.
 * @param palette - palette in use.
 */
export function publishTerminalBackground(palette: TerminalThemePalette): void {
  document.documentElement.style.setProperty(TERMINAL_BACKGROUND_PROPERTY, palette.background)
}

/**
 * Resolve the palette for the live document and publish its surface color.
 * @returns the palette handed to xterm.
 */
export function documentTerminalTheme(): TerminalThemePalette {
  const palette = themePalette(documentColorScheme())
  publishTerminalBackground(palette)
  return palette
}
