import {
  ADVANCED_MACOS_DRAG_REGION_HEIGHT,
  ADVANCED_WINDOWS_TITLEBAR_HEIGHT,
  WINDOWS_CAPTION_CONTROLS_WIDTH,
} from '../window-chrome.ts'

/** AI-Shell presentation stylesheet, independent from the enhanced/extended chrome. */
const AISHELL_STYLES = `
html, body, #root { width: 100%; height: 100%; }
/* The AI shell page is opaque: painting the theme base on the body keeps the
   dark BrowserWindow backdrop from showing as a bottom strip wherever the
   page does not cover the window. */
body[data-shell-desktop-mode="aishell"] { margin: 0; background: var(--dsw-alias-bg-base, #ffffff) !important; }
.dshAishellFrame { position: relative; display: grid; grid-template-rows: 100%; width: 100%; height: 100%; overflow: hidden; background: transparent; transition: grid-template-columns var(--ds-transition-duration-slow) var(--ds-ease-in-out); }
.dshAishellFrame[data-dragging] { transition: none; }
.dshAishellCaptionRow { grid-column: 1 / -1; grid-row: 1; position: relative; min-width: 0; background: var(--dsw-alias-bg-base); user-select: none; }
.dshAishellFrame:is([data-desktop-platform="darwin"], [data-desktop-platform="win32"]) { grid-template-rows: ${ADVANCED_MACOS_DRAG_REGION_HEIGHT}px minmax(0, 1fr); }
.dshAishellFrame[data-desktop-platform="win32"] { grid-template-rows: ${ADVANCED_WINDOWS_TITLEBAR_HEIGHT}px minmax(0, 1fr); }
.dshAishellFrame[data-desktop-platform="win32"] .dshAishellCaptionRow { -webkit-app-region: drag; }
.dshAishellFrame[data-desktop-platform="win32"] .dshAishellCaptionRow::before { content: ""; position: absolute; inset: 0 ${WINDOWS_CAPTION_CONTROLS_WIDTH}px 0 0; -webkit-app-region: drag; }
.dshAishellRail,
.dshAishellLeftPanel,
.dshAishellWorkspace,
.dshAishellChatColumn { grid-row: 1; }
.dshAishellFrame:is([data-desktop-platform="darwin"], [data-desktop-platform="win32"]) .dshAishellRail,
.dshAishellFrame:is([data-desktop-platform="darwin"], [data-desktop-platform="win32"]) .dshAishellLeftPanel,
.dshAishellFrame:is([data-desktop-platform="darwin"], [data-desktop-platform="win32"]) .dshAishellWorkspace,
.dshAishellFrame:is([data-desktop-platform="darwin"], [data-desktop-platform="win32"]) .dshAishellChatColumn { grid-row: 2; }

.dshAishellRail { grid-column: 1; display: flex; flex-direction: column; justify-content: space-between; align-items: center; gap: 4px; box-sizing: border-box; padding: 6px 0; background: var(--dsw-alias-bg-layer-2); border-right: 1px solid var(--dsw-alias-border-l1); }
.dshAishellRailGroup { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.dshAishellRailButton { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; -webkit-app-region: no-drag; }
.dshAishellRailButton:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshAishellRailButton[data-active] { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-brand-primary); }
.dshAishellRailButton svg { width: 18px; height: 18px; }

.dshAishellLeftPanel { grid-column: 2; display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow: hidden; background: var(--dsw-alias-bg-layer-1); border-right: 1px solid var(--dsw-alias-border-l1); }
.dshAishellPanelHeader { display: flex; align-items: center; height: 34px; padding: 0 12px; font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary); border-bottom: 1px solid var(--dsw-alias-border-l1); flex: none; }
.dshAishellPanelBody { display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0; padding: 10px; overflow: auto; }
.dshAishellPanelActions { display: flex; gap: 6px; flex-wrap: wrap; }
.dshAishellPanelAction { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: transparent; color: var(--dsw-alias-label-primary); font-size: 12px; cursor: pointer; }
.dshAishellPanelAction:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshAishellPanelAction[data-ghost] { color: var(--dsw-alias-label-secondary); }
.dshAishellPanelAction svg { width: 15px; height: 15px; }
.dshAishellPanelAction:disabled { opacity: 0.5; cursor: default; }
.dshAishellPrimaryAction { background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); border-color: transparent; justify-content: center; }
.dshAishellField { box-sizing: border-box; width: 100%; height: 30px; padding: 0 8px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font-size: 12px; }
.dshAishellFieldRow { display: flex; gap: 6px; }
.dshAishellFieldPort { width: 72px; flex: none; }
.dshAishellHostForm { display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-base); }
.dshAishellHostList { display: flex; flex-direction: column; gap: 2px; }
.dshAishellHostRow { display: flex; align-items: center; gap: 4px; padding: 4px; border-radius: 8px; }
.dshAishellHostRow:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshAishellHostGlyph { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; flex: none; color: var(--dsw-alias-label-secondary); }
.dshAishellHostGlyph svg { width: 16px; height: 16px; }
.dshAishellHostOpen { display: flex; flex: 1; min-width: 0; flex-direction: column; align-items: flex-start; gap: 1px; padding: 0; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.dshAishellHostOpen strong { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; font-weight: 600; }
.dshAishellHostOpen small { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.dshAishellHostIconButton { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.dshAishellHostIconButton:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshAishellHostIconButton svg { width: 14px; height: 14px; }
.dshAishellHostDeleteButton:hover:not(:disabled) { color: var(--dsw-alias-state-error-primary); }
.dshAishellHostDeleteButton[data-confirm] { color: var(--dsw-alias-state-error-primary); background: var(--dsw-alias-interactive-bg-hover); }
.dshAishellHostDeleteButton:disabled { opacity: 0.5; cursor: default; }
.dshAishellPanelAlert { margin: 6px 4px 0; font-size: 11.5px; line-height: 1.5; color: var(--dsw-alias-state-error-primary); }
.dshAishellPanelHint { margin: 0; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-tertiary); }
.dshAishellPanelError { margin: 0; font-size: 12px; color: var(--dsw-alias-label-primary-bluish); }
.dshAishellSessionPane { position: relative; padding: 0; gap: 0; overflow: hidden; }
.dshAishellSessionActions { padding: 8px 8px 6px; }
.dshAishellSessionActions .dshAishellPanelAction { flex: 1; justify-content: center; }
.dshAishellSessionTree { display: flex; flex: 1; min-height: 0; flex-direction: column; gap: 2px; overflow: auto; padding: 2px 6px 8px; }
.dshAishellSessionGroup { display: flex; flex-direction: column; gap: 1px; }
.dshAishellSessionGroupHeader { display: flex; align-items: center; gap: 5px; width: 100%; padding: 5px 6px; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 11.5px; font-weight: 600; text-align: left; cursor: pointer; }
.dshAishellSessionGroupHeader:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshAishellSessionGroupHeader svg { width: 14px; height: 14px; flex: none; }
.dshAishellSessionGroupTitle { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshAishellSessionGroupCount { flex: none; padding: 0 6px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-tertiary); font-weight: 500; }
.dshAishellSessionGroupBody { display: flex; flex-direction: column; gap: 1px; padding-left: 8px; }
.dshAishellHostRow[data-current] { background: var(--dsw-alias-interactive-bg-hover); }
.dshAishellPanelFooter { display: flex; align-items: center; flex: none; width: 100%; box-sizing: border-box; padding: 6px 8px; border-top: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); }
.dshAishellPanelFooter .dshAishellPanelAction { flex: 1; justify-content: center; }
.dshAishellPanelFooter .dshAishellPanelAction[data-active] { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-brand-primary); }
.dshAishellHeroHint { display: flex; flex-direction: column; align-items: center; gap: 12px; max-width: 420px; margin: 0 auto; padding: 24px; text-align: center; }
.dshAishellHeroHint p { margin: 0; font-size: 13px; line-height: 1.7; color: var(--dsw-alias-label-secondary); }
/* The AI shell never picks a local workspace. Hide the upstream hero workspace
   chip ("选择工作区", HeroShell module prefix sro9dq) and the workspace-trigger
   composer card (InputBar module prefix p_FcLG) shown while no session exists.
   Sessions are started from the left panel instead. */
.dshAishellChatColumn [class*="sro9dq_workspace"] { display: none !important; }
.dshAishellChatColumn [class*="p_FcLG_cardWorkspaceTrigger"] { display: none !important; }
/* The AI shell keeps exactly one new-session entry point (the panel's primary
   button) and one settings entry point (the panel footer): hide the official
   sidebar's duplicates. The hidden settings trigger stays in the DOM and keeps
   answering programmatic clicks for the footer button to forward to. */
.dshAishellLeftPanel [class*="EXfQ3q_newSession"] { display: none !important; }
.dshAishellLeftPanel [class*="xmPW5W_trigger"]:not([class*="triggerLabel"]):not([class*="triggerRow"]) { display: none !important; }
.dshAishellLeftPanel [aria-label$="中新建会话"] { display: none !important; }
.dshAishellLeftPanel [aria-label^="New session in"] { display: none !important; }
/* The AI shell has no workspace concept of its own: hide the section header
   and the workspace row actions, but keep the group rows so a host's sessions
   stay grouped under the host name. */
.dshAishellLeftPanel [class*="_9HtRwG_sectionHeader"] { display: none !important; }
.dshAishellLeftPanel [class*="gHIxMG_rowActions"] { display: none !important; }
.dshAishellUpstreamSidebar { flex: 1; min-height: 0; }
/* The replaced official sidebar stays mounted off-screen: its settings panel is
   a fixed-position descendant, and the panel footer forwards its hidden
   trigger's click, so removing it outright would break settings access. */
.dshAishellUpstreamSidebar[data-hidden] { position: absolute; left: -10000px; top: 0; width: 320px; height: 100%; overflow: hidden; }

.dshAishellFilePane { gap: 6px; padding: 8px; overflow: hidden; }
.dshAishellPathBar { display: flex; align-items: center; gap: 4px; flex: none; }
.dshAishellPathField { flex: 1; min-width: 0; font-family: Consolas, "Cascadia Mono", monospace; font-size: 12px; }
.dshAishellFileList { display: flex; flex: 1; min-height: 0; flex-direction: column; gap: 1px; overflow: auto; }
.dshAishellFileRow { display: flex; align-items: center; gap: 4px; padding: 3px 4px; border-radius: 6px; }
.dshAishellFileRow:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshAishellFileRow .dshAishellHostOpen strong { font-weight: 500; }
.dshAishellFilePreview { display: flex; flex: none; max-height: 42%; flex-direction: column; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; overflow: hidden; background: var(--dsw-alias-bg-base); }
.dshAishellFilePreviewHeader { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 4px 6px 4px 10px; border-bottom: 1px solid var(--dsw-alias-border-l1); font-size: 12px; }
.dshAishellFilePreview pre { margin: 0; padding: 8px 10px; overflow: auto; font-family: Consolas, "Cascadia Mono", monospace; font-size: 11.5px; line-height: 1.5; }

.dshAishellWorkspace { grid-column: 3; display: flex; min-width: 0; min-height: 0; background: var(--dsw-alias-bg-base); }
.dshAishellWorkspaceStack { display: flex; flex: 1; min-width: 0; min-height: 0; }
.dshAishellWorkspaceStack[data-hidden] { display: none; }
.dshAishellPanelSurface { display: flex; flex: 1; min-width: 0; min-height: 0; overflow: hidden; }
.dshAishellTerminal { display: flex; flex-direction: column; width: 100%; height: 100%; min-width: 0; }
.dshAishellTabBar { display: flex; align-items: stretch; gap: 2px; flex: none; height: 34px; padding: 4px 6px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); overflow-x: auto; background: var(--dsw-alias-bg-base); }
.dshAishellTab { display: flex; align-items: center; max-width: 230px; height: 100%; padding: 0 4px 0 8px; border: 1px solid transparent; border-bottom: none; border-radius: 8px 8px 0 0; }
.dshAishellTab[data-active] { background: var(--dsw-alias-bg-layer-1); border-color: var(--dsw-alias-border-l1); }
.dshAishellTab[data-dead] { opacity: 0.6; }
.dshAishellTabLabel { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; min-width: 0; padding: 0; border: 0; background: transparent; color: var(--dsw-alias-label-primary); cursor: pointer; }
.dshAishellTabLabel strong { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 600; }
.dshAishellTabLabel small { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10.5px; color: var(--dsw-alias-label-tertiary); }
.dshAishellTabClose, .dshAishellTabAdd { display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.dshAishellTabClose:hover, .dshAishellTabAdd:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshAishellTabAdd { margin-left: 4px; }
.dshAishellTabClose svg, .dshAishellTabAdd svg { width: 14px; height: 14px; }
.dshAishellTerminalStack { position: relative; flex: 1; min-height: 0; }
.dshAishellTerminalHost { position: absolute; inset: 0; padding: 6px 0 2px 8px; }
.dshAishellTerminalHost .xterm { height: 100%; }
/* The terminal follows the product theme through its own palette
   (terminal-theme.ts): xterm paints a light or dark canvas and these rules keep
   the surrounding box on the same surface color, so a partially filled terminal
   (its height is a whole number of rows) never shows a mismatched strip. */
.dshAishellTerminal .xterm,
.dshAishellTerminal .xterm-viewport,
.dshAishellTerminal .xterm-screen { background-color: var(--dsh-aishell-terminal-bg, #ffffff); }
.dshAishellTerminalHost { background: var(--dsh-aishell-terminal-bg, #ffffff); }
.dshAishellTerminalError { flex: none; padding: 6px 10px; font-size: 12px; color: #d4380d; }
.dshAishellStatusBar { display: flex; align-items: center; flex: none; height: 24px; padding: 0 10px; font-size: 11.5px; color: var(--dsw-alias-label-tertiary); border-top: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1); }

.dshAishellChatColumn { grid-column: 4; display: flex; flex-direction: column; min-width: 0; min-height: 0; overflow: hidden; background: var(--dsw-alias-bg-base); border-left: 1px solid var(--dsw-alias-border-l1); }
.dshAishellChatBody { display: flex; flex: 1; min-height: 0; flex-direction: column; overflow: hidden; }

/* Plan-mode command proposal card (conversation toolview). */
.dshPlanCommandCard { display: flex; flex-direction: column; gap: 6px; box-sizing: border-box; margin: 4px 0; padding: 8px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
.dshPlanCommandHead { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dshPlanCommandTitle { font-size: 11.5px; font-weight: 600; color: var(--dsw-alias-label-secondary); }
.dshPlanCommandRun { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 10px; border: 1px solid transparent; border-radius: 8px; background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); font-size: 12px; cursor: pointer; }
.dshPlanCommandRun:hover:not(:disabled) { opacity: 0.9; }
.dshPlanCommandRun:disabled { opacity: 0.6; cursor: default; }
.dshPlanCommandRun svg { width: 13px; height: 13px; }
.dshPlanCommandDesc { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.dshPlanCommandCode { margin: 0; padding: 8px 10px; overflow: auto; border-radius: 8px; background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l1); font-family: Consolas, "Cascadia Mono", monospace; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-primary); white-space: pre-wrap; word-break: break-all; }
.dshPlanCommandHint { margin: 0; font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.dshPlanCommandError { margin: 0; font-size: 12px; color: #d4380d; }

/* Turn footer: the commands the model proposed during the turn. */
.dshAishellProposedCommands { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }

/* The AI shell keeps one conversation per terminal, so branching a conversation
   into a new one is not part of the product: retire the message action the chat
   tail contributes. Both locales are listed because the label is the only stable
   hook the shipped button exposes. */
.dshAishellChatColumn [aria-label="在新对话中分支"],
.dshAishellChatColumn [aria-label="Branch into a new conversation"] { display: none; }

/* Terminal tab bar: quote the current selection into the conversation. */
.dshAishellTerminalQuote { display: inline-flex; align-items: center; gap: 5px; height: 26px; margin-left: auto; padding: 0 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-primary); font-size: 12px; cursor: pointer; }
.dshAishellTerminalQuote:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshAishellTerminalQuote svg { width: 13px; height: 13px; }

/* Settings → General: the AI-Shell workspace row. */
.dshAishellWorkspaceRow { display: flex; flex-direction: column; gap: 10px; padding: 16px 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2); }
.dshAishellWorkspaceCopy { display: flex; flex-direction: column; gap: 4px; min-width: 0; padding-right: 48px; }
.dshAishellWorkspaceTitle { font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-primary); }
.dshAishellWorkspaceBody { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dshAishellWorkspaceControls { display: flex; align-items: center; gap: 8px; min-width: 0; }
.dshAishellWorkspaceSelect { flex: 1; min-width: 0; height: 32px; padding: 0 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-primary); font-size: 13px; }
.dshAishellWorkspaceBrowse { flex: none; height: 32px; padding: 0 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: transparent; color: var(--dsw-alias-label-primary); font-size: 13px; cursor: pointer; }
.dshAishellWorkspaceBrowse:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.dshAishellWorkspaceBrowse:disabled { opacity: 0.6; cursor: default; }
.dshAishellWorkspaceError { font-size: 12px; color: #d4380d; }

@media (prefers-reduced-motion: reduce) {
  .dshAishellFrame { transition: none !important; }
}
`

/** Install the AI-Shell frame stylesheet. @returns the disposer removing the stylesheet element. */
export function installAishellStyles(): () => void {
  const style = document.createElement('style')
  style.dataset.plugin = 'shell-desktop'
  style.dataset.pluginCss = 'shell-desktop/aishell-layout'
  style.textContent = AISHELL_STYLES
  document.head.appendChild(style)
  return () => { style.remove() }
}
