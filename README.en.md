# AI Shell Desktop

An open-source Windows / macOS desktop client for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): terminals, files, and an AI conversation in one window — the AI works only in the real terminals you opened.

> An independent community project. It is not affiliated with, partnered with, authorized by, or endorsed by DeepSeek.

## Screenshots

![AI Shell Desktop overview](docs/screenshots/01-aishell-overview.png)

### Start a session, reach a host

| New session | Hosts panel |
| --- | --- |
| ![New session](docs/screenshots/02-new-session.png) | ![Hosts panel](docs/screenshots/03-hosts-panel.png) |
| Add a host (password or key) | A remote terminal, ready on connect |
| ![Add host](docs/screenshots/04-host-form.png) | ![Remote terminal](docs/screenshots/05-terminal-remote.png) |

### Terminal work and AI collaboration

| Run commands in the terminal | Select live output |
| --- | --- |
| ![Terminal command](docs/screenshots/06-terminal-command.png) | ![Selection](docs/screenshots/07-terminal-selection.png) |
| Quote it into the chat | AI conversation |
| ![Quote into chat](docs/screenshots/08-quote-into-conversation.png) | ![AI conversation](docs/screenshots/09-ai-conversation.png) |

### AI answers and plan mode

| Answer settled (thinking expandable) | Type `/plan` to enter plan mode |
| --- | --- |
| ![AI answer](docs/screenshots/10-ai-conversation-settled.png) | ![Plan mode entry](docs/screenshots/11-plan-mode-entry.png) |
| Plan mode active | A proposed command card |
| ![Plan mode](docs/screenshots/12-plan-mode-active.png) | ![Command card](docs/screenshots/13-plan-command-card.png) |
| Click Run; the command lands in the terminal | |
| ![Command executed](docs/screenshots/14-plan-command-executed.png) | |

### Files, sessions, and settings

| File panel (follows the connected host) | Sessions grouped by host |
| --- | --- |
| ![File panel](docs/screenshots/15-file-panel.png) | ![Sessions by host](docs/screenshots/16-sessions-by-host.png) |
| General settings | Model settings |
| ![General settings](docs/screenshots/17-settings-general.png) | ![Model settings](docs/screenshots/18-settings-models.png) |
| Dark theme · overview | Light theme · overview |
| ![Dark overview](docs/screenshots/20-theme-dark-overview.png) | ![Light overview](docs/screenshots/22-theme-light-overview.png) |

### Theme details and safe deletion

| Dark theme · settings | Dark theme · terminal |
| --- | --- |
| ![Dark settings](docs/screenshots/19-theme-dark-settings.png) | ![Dark terminal](docs/screenshots/21-theme-dark-terminal.png) |
| Delete a session · inline confirm | Delete a host · inline confirm |
| ![Session delete confirm](docs/screenshots/23-session-delete-confirm.png) | ![Host delete confirm](docs/screenshots/24-host-delete-confirm.png) |

All 24 screenshots, per-shot narration, and a storyboard live in [`docs/screenshots/README.md`](docs/screenshots/README.md).

## Highlights

- **The terminal is the context**: select live output in a terminal and quote it into the conversation; the AI reads the real echo instead of a second-hand copy.
- **One terminal, one session**: every terminal tab owns its own AI conversation — switching terminals switches the chat, and each session stays bound to exactly its own terminal.
- **Humans gate the risky work**: in `/plan` mode the AI only submits command cards; clicking "Run" pastes them into the terminal.
- **The AI cannot touch this machine**: a session can only act through the terminals you opened; local shells and local files are out of its reach.

## Features

- **AI-Shell layout**: activity rail, navigation column (sessions / hosts / files), central terminal workbench, and the AI conversation column in one window
- **Remote hosts**: save, edit, and two-step-delete SSH hosts; an SFTP panel that browses, previews, creates directories, and **uploads local files**
- **Terminal workbench**: parallel tabs; the same experience for local and remote shells; quote selections into the chat
- **Session management**: sessions grouped by host, with **full-text search over titles and content**, and two-step inline delete
- **Plan mode**: type `/plan`; commands arrive as cards and run only when a human clicks
- **Appearance**: light / dark / system, with a terminal that stays readable in dark mode
- **Desktop surfaces**: system tray (profile switch, diagnostics export) and startup recovery
- **Packaging**: Windows NSIS installer and portable zip; the macOS packaging flow is included

## Download

Windows x64 builds are published on [GitHub Releases](https://github.com/Alexliwenhao/shell-desktop/releases/latest):

| Artifact | Notes |
| --- | --- |
| `AI-Shell-Desktop-<version>-x64-Setup.exe` | NSIS installer; builds are currently unsigned, so Windows may warn about an unknown publisher on first run |
| `AI-Shell-Desktop-<version>-x64-Portable.zip` | Portable archive; extract it and run `AI Shell Desktop.exe` inside |

## Build from source

Requires Node.js 22.19+ or 24+, with Yarn 4 through Corepack:

```sh
git submodule update --init --recursive
corepack yarn install --immutable
corepack yarn dev            # develop
corepack yarn check          # build, typecheck, tests
corepack yarn dist:win       # Windows installer (run on Windows)
```

## Documentation

| Goal | Entry point |
| --- | --- |
| Install and daily use | [User guide](docs/user-guide.en.md) |
| Platform, environment, and boundaries | [FAQ](docs/faq.en.md) |
| Desktop host architecture and release boundary | [Architecture](docs/architecture.en.md) |
| Writing plugins / desktop plugin contract | [Plugin development](docs/plugin-development.en.md) · [Desktop services](shell-desktop/docs/plugin-services.md) |
| Data processing and privacy choices | [Privacy policy](PRIVACY.md) |
| Contributing | [CONTRIBUTING.en.md](CONTRIBUTING.en.md) |

## Relationship to DeepSeek Harness

Upstream provides the agent capabilities, plugin system, and Web UI; this project owns the desktop packaging: application shell, local service lifecycle, windows and tray, and installer builds. The pinned `deepseek-harness/` submodule runs unmodified, and the desktop shell joins the same runtime through the DSH plugin mechanism.

## License

[MIT](LICENSE). “DeepSeek Harness” is a registered trademark of DeepSeek; this project uses the name only to describe its technical origin and compatibility.
