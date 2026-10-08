# AI Shell Desktop User Guide

## Installation and first launch

Download the Windows x64 installer (`AI-Shell-Desktop-<version>-x64-Setup.exe`) or the portable archive (`AI-Shell-Desktop-<version>-x64-Portable.zip`) from [GitHub Releases](https://github.com/Alexliwenhao/shell-desktop/releases/latest). AI Shell Desktop includes Electron, Node, and its pinned DSH dependencies, so normal users do not need to install Node.js or pnpm separately. Builds are currently unsigned, so Windows may warn about an unknown publisher on first run.

On first launch, the application prepares the default profile and starts the DSH Host and the AI Shell interface locally. Closing the window normally hides it; use **Quit** from the tray when you want to stop the application and Host process.

## Profiles

A profile is a composition of DSH bundles, dependencies, and patches. The tray **Profile** menu lists existing profiles and can create new ones.

Selecting a profile performs an orderly restart. The new profile becomes the last-known-good choice only after the Host and the window both start successfully; a failed startup returns to the previous working choice. Official profiles normally use the same DSH home, so sessions, settings, and storage do not need to be migrated. A custom configuration (patch) can deliberately redirect a persistence root, in which case that profile's configuration wins.

Switching profiles does not silently copy plugins from the old profile into the new one. Use an explicit profile in the terminal when preparing another profile.

## Interface: AI Shell

The product now ships a single **AI Shell** surface: the activity rail (sessions / hosts / files), the central terminal workbench, and the AI conversation column side by side. A stored legacy multi-mode preference is ignored at startup.

- **Terminal ↔ session binding**: every terminal tab owns its own AI conversation — switching terminals switches the chat, and each session can only operate its own terminal.
- **Plan mode**: type `/plan`; commands arrive as proposed-command cards and run only when a human clicks.
- **Session search**: the sessions panel searches titles and conversation content.

## Local service

AI Shell Desktop starts the Host service locally. It binds only to `127.0.0.1`, starting at port `43120` (and walking upward, up to 32 attempts, when the port is taken). The port can be pinned in the settings file:

```yaml
shell-desktop:
  port: 43189
```

The port must be an integer from `0` through `65535` (`0` lets the system choose). Changing it performs an orderly restart. The service exposes no LAN or internet entry point.

## Plugin management

Plugins are extensions that add capabilities to DSH, such as models, tools, interfaces, and workflows. AI Shell Desktop uses the same plugin system as official Harness, so official plugins install and work directly; multiple plugins follow the same conventions and can be installed and used together.

Ordinary DSH plugins use the upstream CLI semantics:

```sh
dsh plugin --profile desktop add <plugin>
dsh plugin --profile desktop remove <plugin>
dsh plugin --profile desktop update
```

An explicit `--profile <name>` always wins. Restart AI Shell Desktop after plugin changes so the new bundle enters the Loader composition. The desktop build offers no plugin-management UI; run the commands above through the official DSH CLI.

## Updates

Releases are distributed through [GitHub Releases](https://github.com/Alexliwenhao/shell-desktop/releases/latest): download the newer installer or portable archive and use it in place. The tray's update check belongs to the previous distribution service (this project does not operate that endpoint); upgrade from GitHub Releases.

## Troubleshooting

Desktop confirmations, warnings, and operation results open as separate shadcn-backed modal Desktop windows rather than as overlays inside the official page. When startup fails, the application opens the Recovery window: it first shows why it opened and then provides **Plugin management**, **Rollback**, **Switch Profile**, and **Diagnostics** tabs.

- **Export diagnostics**: run the installed executable directly with `--export-diagnostics`. The default Windows installation command is below; replace the path if you selected another installation directory.
- **The application crashes repeatedly**: use the same command; it does not start the Host, profiles, plugins, or a window, so it works after a crash.

  ```powershell
  & "$env:LOCALAPPDATA\Programs\AI Shell Desktop\AI Shell Desktop.exe" --export-diagnostics
  ```

  For npm installs, stable uses `shell-desktop --export-diagnostics` and Beta uses `shell-desktop-beta --export-diagnostics`. This command does not start Host, profiles, plugins, or a window. It prints the absolute diagnostics ZIP path when complete.
- **Diagnostic archive contents**: recent application logs, local Crashpad `.dmp` files, the active-run marker, and `system-info.txt`. System information records Desktop, Electron, Node, platform, and architecture versions. Recognized credentials are masked in logs, but local paths, workspace IDs, session IDs, and crash-time memory fragments may remain. Review the archive before public upload and send sensitive dumps only through a trusted channel.
- **The window disappeared**: check the system tray; closing the window is not quitting.
- **A plugin is missing**: confirm the command targeted the intended profile and restart the application.
- **No update prompt appeared**: the app does not raise update prompts; see [GitHub Releases](https://github.com/Alexliwenhao/shell-desktop/releases/latest).

The lower-level lifecycle, packaging, and platform limits belong to the developer documentation; see the [documentation index](README.md).
