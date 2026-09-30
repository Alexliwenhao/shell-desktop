# AI Shell Desktop Documentation

[中文文档](README.md)

This directory is the product and developer documentation index for AI Shell Desktop. The root [`README.en.md`](../README.en.md) is the short product entry point; these pages explain why the project exists, how to use it, and how to build plugins for it. Want to contribute? See [Contributing](../CONTRIBUTING.en.md).

## Read by goal

Ordinary users can start with the [user guide](user-guide.en.md) and never need the developer documentation.

### User documentation

| Document | Covers |
| --- | --- |
| [User guide](user-guide.en.md) | Installation, profiles, modes, terminal, plugins, and updates |
| [FAQ](faq.en.md) | Direct answers about platforms, bundled runtime, project status, data, plugins, and updates |
| [Privacy Policy](../PRIVACY.md) | Official updates, downloads, local data, third-party services, and user choices |
| [Why Desktop](why-desktop.en.md) | The boundary with upstream Harness and the case for plugins |

### Developer and maintainer documentation

| Document | Covers |
| --- | --- |
| [Plugin ecosystem manifesto](plugin-ecosystem.en.md) | The vision of an open, composable, sustainable plugin ecosystem and its three principles |
| [Plugin development](plugin-development.en.md) | Ordinary DSH plugins, Desktop services, and lifecycle |
| [Architecture](architecture.en.md) | Electron, Host, the Web carrier, profiles, and packaging |
| [Desktop service reference](../shell-desktop/docs/plugin-services.md) | Stable `desktopProfiles` and `desktopPnpm` contracts with TypeScript examples |
| [Package reference](../shell-desktop/README.md) | Detailed build, runtime, release, and limitation notes |

## How the README files are organized

The outer repository has two formal product READMEs plus one legacy compatibility entry:

- [`README.md`](../README.md): the Chinese product entry point.
- [`README.en.md`](../README.en.md): the English product entry point with the same product scope.
- [`README.zh.md`](../README.zh.md): a legacy Chinese-path compatibility page with no independent content.

`README.i18n.yaml` records the bilingual blob hashes for those two formal entry points; it is not a user guide. `shell-desktop/README.md` and `shell-desktop/README.zh.md` ship with the npm package and are the more technical package reference. `shell-desktop/docs/` contains stable API contracts rather than marketing copy.

`deepseek-harness/` is the pinned upstream submodule. Its README and `docs/` belong to the upstream project, not to the Desktop product, and are excluded from the outer documentation inventory.

## Status convention

These pages distinguish shipped behavior, platform limits, and roadmap items. The product now ships a single **AI Shell** surface (activity rail, navigation column, terminal workbench, and the AI conversation column side by side); a stored legacy multi-mode preference is ignored at startup. The plugin marketplace is outside the current product scope, and capabilities such as Agents-Anywhere mobile remote are optional compositions rather than entries of the default installer.
