# AI Shell Desktop FAQ

[中文](faq.md)

This page answers common questions about installation, supported platforms, the bundled runtime, and plugins in the current stable release. The [latest GitHub Release](https://github.com/Alexliwenhao/shell-desktop/releases/latest) and [user guide](user-guide.en.md) define the shipped product scope.

## What is AI Shell Desktop?

AI Shell Desktop is an open-source DeepSeek Harness desktop client for Windows and macOS. It packages the official Harness Host, plugin system, and agent capabilities into a native desktop application presented as the **AI Shell** surface: terminals, files, and the AI conversation side by side, plus the system tray, a DSH terminal environment, and profile management.

## Is this an official DeepSeek product?

No. AI Shell Desktop is an independent, community-maintained open-source project. It is not affiliated with or endorsed by DeepSeek. The name only describes its technical relationship with the official [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

## Which operating systems are supported?

The currently published installers target Windows x64; the macOS packaging flow is included in the source tree but no macOS installer has been published yet, and there is no Linux installer. Cross-platform compatibility code in the source tree does not imply that an installer has been released for that platform.

## Do I need to install Node.js, pnpm, or DSH?

No. The installer includes Electron, Node.js, pnpm, and pinned DSH dependencies. Ordinary users can install and launch directly, and Desktop does not modify the global system PATH or user shell configuration.

## Does the first launch download a runtime?

No separate Node.js or Harness core download is required. The installer is larger because it contains the runtime and pinned dependencies, trading download size for a more deterministic first launch and dependency set. Cloud models and downloading new versions from GitHub Releases still require network access.

## Does AI Shell Desktop modify official Harness?

No. The repository pins an unmodified official Harness checkout; the desktop shell provides the AI Shell surface through the plugin/profile composition boundary and never edits upstream source.

## Is data stored locally?

The Desktop Host, profiles, and DSH home live on the local machine. Whether content is sent to an external service depends on the model or tool providers the user configures; requests to cloud models still go to those providers.

## Can I install DSH plugins?

Yes. AI Shell Desktop uses the official Harness plugin system. Open DSH Terminal from the tray and run `dsh plugin add`, `dsh plugin remove`, or `dsh plugin update`. These commands default to the active profile, and Desktop must be restarted after plugin changes.

## Does the Desktop profile automatically sync with an existing web profile?

No plugins are copied automatically. Each profile has its own bundle and dependency composition. After switching profiles, default plugin commands target the active profile; `--profile <name>` can always select one explicitly.

## How are updates installed?

Releases are distributed through [GitHub Releases](https://github.com/Alexliwenhao/shell-desktop/releases/latest): download the newer installer or portable archive and use it in place; upgrades never install silently. The tray's update check belongs to the previous distribution service (this project does not operate that endpoint); upgrade from GitHub Releases.

## Where can I download the app or report a problem?

Download from the [latest GitHub Release](https://github.com/Alexliwenhao/shell-desktop/releases/latest). Check the [troubleshooting section](user-guide.en.md#troubleshooting) first. If the problem remains, open a [GitHub Issue](https://github.com/Alexliwenhao/shell-desktop/issues/new/choose) with the operating system, app version, reproduction steps, and error details.
