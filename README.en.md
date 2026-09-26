# AI Shell Desktop

An open-source Windows / macOS desktop client for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): it pins an upstream release and runs it unmodified, while the desktop shell itself composes as an ordinary DSH plugin.

> An independent community project. It is not affiliated with, partnered with, authorized by, or endorsed by DeepSeek.

## Features

- **AI-Shell layout**: activity rail, navigation column, terminal workbench, and AI conversation column in one window
- **Remote hosts**: SSH host management, SFTP file panel, and per-host terminal and AI sessions
- **Terminal workbench**: multi-tab sessions, quoting selected text into the conversation, and executable command cards at the end of a turn
- **Desktop surfaces**: system tray (window mode, profile switch, diagnostics export), update checks, safe mode, and startup recovery
- **Packaging**: Windows NSIS installer and portable archive; macOS app icon and DMG release flow

## Download

Installers are published on [GitHub Releases](https://github.com/Alexliwenhao/shell-desktop/releases/latest) (Windows x64 / macOS Universal). Builds are currently unsigned, so Windows may warn about an unknown publisher on first run.

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
