# AI Shell Desktop

English | [中文](README.zh.md)

`shell-desktop` runs DSH in Electron while remaining part of the ordinary Cordis composition. The installed application is named **AI Shell Desktop**. The package provides the `shell-desktop` executable and the `shell-desktop` alias; the registered npm package name is the reliable `npx` entry.

## Architecture

The Electron executable is minimal bootstrap code. It acquires the single-instance lock, resolves the selected DSH profile, provides the native runtime capability, and boots the Host Cordis root in the Electron main process. The `desktop-shell` Host plugin owns the `BrowserWindow`, navigation policy, settings namespace, and close-versus-quit lifecycle through Cordis effects. The native runtime owns the physical tray, while `desktop-shell`, `desktop-profiles`, and `desktop-terminal` contribute effect-scoped commands through its ordered item registry.

The AI Shell presentation reuses the existing Web carrier. The profile mounts the ordinary `dsh-base` and `dsh-web-app` bundles. The Host binds its HTTP and WebSocket surface to `127.0.0.1`, starting at port 43120 and walking upward when it is taken; Electron loads the loopback same-origin page in a sandboxed renderer. There is no Electron-owned plugin roster, preload bridge, or raw Electron API in the renderer.

The desktop package has normal Host and Web Client faces. Its Client face validates the platform and capability-gated material markers and installs the Desktop-owned AI Shell layout (activity rail, navigation column, terminal workbench, and the AI conversation column), while the official sidebar and conversation stay composed as official occupants. Third-party Web clients continue to use the ordinary DSH module graph.

The tray profile selector lists existing profiles and the lazily available `desktop` and `web` defaults. A selectable profile directly composes `dsh-base` before `dsh-web-app`; headless, malformed, or already desktop-embedded profiles remain visible but disabled. `desktop` is the only launcher-managed profile: its installation-owned prefix is repaired while third-party bundle order is preserved. Every other selected profile keeps its manifest, user patch, and dependencies unchanged. The launcher inserts its own desktop layer after `dsh-web-app` for the active generation and never persists that layer in the selected bundle list.

Profile selection is desktop-owned state under Electron user data, not another field inside a selected profile. An accepted switch persists the exact active profile and takes effect through an orderly restart. Startup never substitutes a last-known-good profile or automatically mutates configuration after failure. Instead, every healthy startup records one of three rotating checkpoints containing the active Profile's declarative package and patch files together with the shared Harness-home `settings.yaml` and `cordis.patch.yml`. Recovery always opens the Recovery page and requires the user to choose an exact slot; after a restore, the next healthy startup deliberately skips checkpoint replacement once. Version-two slots remain restorable but affect only their five original Profile files. Credentials, `.env`, sessions, storage, caches, and generated dependency state are never copied into these checkpoints. Official profiles use the same DSH home for sessions, settings, and storage by default, so switching does not copy or migrate records outside an explicit checkpoint restore. A custom profile patch may deliberately redirect one of those persistence roots.

Before Loader entries mount, the launcher registers the generation-scoped `ctx.desktopProfiles` service. Its immutable `current` value contains the active profile's `name` and absolute `dir`; `list()` performs read-only discovery, while `select(name)` serializes persistence-before-restart switching without changing the live generation in place. The service is a Desktop Host capability, not a renderer bridge or an active-profile API supplied by current upstream DSH.

Bare Cordis plugin imports resolve from the persistent profile. A narrow Node resolve hook applies only to imports issued by `@deepseek-ai/cordis-plugin-loader`, so profile-local third-party packages and the healed launcher fallback use the same resolution path even when packaged Electron does not expose Node's internal ESM loader.

Before profile preparation and Cordis boot, a packaged macOS or Linux launch runs the configured account shell in interactive login mode and recovers its exported `PATH`. This repairs the minimal `PATH` commonly supplied by Finder, LaunchServices, and other graphical launchers. It also fills only missing locale, toolchain, package-manager, and virtual-environment exports from a fixed allowlist; `PATH` alone always uses the shell value. Recovery supports absolute `zsh`, `bash`, and `fish` paths. Bash follows its standard login behavior, so `.bashrc` contributes only when a login profile sources it. Windows and unpackaged or development launches skip recovery. An unavailable or unsupported shell, timeout, capture failure, or missing `PATH` silently retains the inherited process environment.

The capture starts from `@deepseek-ai/dsh-subprocess`'s `scrubbedParentEnv()`, and captured names pass the same `SENSITIVE_ENV_PATTERN` and `DSH_ENV_PREFIX` checks before the fixed allowlist is applied. Credentials, `DSH_*` values, proxy and SSH-agent settings, and process startup hooks learned only from shell rc files are therefore not imported into Electron. This recovery does not erase values already present in Electron's explicit launch environment. Ordinary DSH subprocesses apply the official scrub again; an explicit child environment may still deliberately add a value.

After login-shell recovery, the launcher creates the layered launch-environment snapshot. It then prepends a private command directory containing only the pinned bundled `pnpm` command to the current Electron main process `PATH`. Host and third-party plugins can therefore discover that package manager from startup, including through ordinary DSH subprocess providers, without requiring a system Node.js installation. This ambient path is a compatibility surface, not the formal plugin-management contract.

The `desktop-pnpm` Host row provides one package-manager capability against the immutable active profile: `ctx.desktopPnpm.run(argv, signal?)`. It executes the packaged pnpm entry directly with the active Profile directory as `cwd`. Every Desktop-owned pnpm operation process-locally applies exactly one `--config.minimumReleaseAge=0` at the final package-manager boundary; it never rewrites the user's pnpm configuration. Callers own the remaining command construction, Profile bundle reconciliation, receipts, validation, and user-facing progress. Desktop deliberately adds no plugin-specific retry, snapshot, or rollback to this interface; all recovery is handled by the three healthy-start checkpoints.

`run()` returns live stdout and stderr streams, a `done` promise that settles after the complete process tree exits, and `cancel()`. One operation may run per generation. The service uses the ordinary DSH subprocess provider, the exact packaged JavaScript entry, shell-free argv, and child-scoped DSH home, Electron-backed Node, CI, and native-module ABI values. The public runtime path still does not expose `node` or `dsh`; its private helper and the `ELECTRON_RUN_AS_NODE` and npm ABI variables exist only inside package-manager subprocess trees. The launcher does not modify the system `PATH`, shell startup files, profile configuration, or `.env` documents.

Plugin authors should use the supported contract imports, lifecycle rules, and adaptation patterns in the [Desktop plugin service architecture](docs/plugin-services.md).

## Settings and restart boundary

The DSH home `settings.yaml` document keeps one `shell-desktop` namespace; the shell is always AI Shell, and a stored legacy value (`compatibility`, `extended`, or `advanced`) is normalized to `aishell` at startup:

```yaml
shell-desktop:
  mode: aishell
  port: 43120
  macosMaterial: transparent # off or transparent
  windowsMaterial: mica # off, acrylic, or mica when supported
```

The launcher reads the same file resolved by the active `@deepseek-ai/dsh-settings-file` row before composing a generation. The Host registers the `shell-desktop` namespace with the standard settings service. There is no parallel mode value in the profile manifest.

Editing the document by hand changes what the settings provider observes. A committed change requests one orderly restart: the current Cordis tree disposes first, then Electron relaunches only after a successful zero-code shutdown. The application never hot-swaps root slots, native window materials, or Loader rows inside a live renderer generation.

## AI Shell presentation

AI Shell is an explicitly composed desktop presentation for macOS and Windows. After all user patches have been read, the launcher disables the official `ui-layout` Loader row while keeping the official `ui-sidebar` and `ui-conversation` rows enabled.

The Client provides a four-column partition: a fixed 48 CSS-pixel activity rail, the official sidebar, the conversation workbench, and the right dock. Below the native caption row, the rail offers conversation, files, right-dock, and navigation commands. The files command opens the right dock's file tree through `ctx.sidebarRight.openTab('files')`; the right-dock command toggles its expanded presentation; both are no-ops while no session surface is mounted. Sidebar and right-dock widths follow the existing resize and breakpoint rules, with the rail width excluded from the column solve.

The rail commands delegate to upstream services only: `ctx.layout` for panel selection and sidebar toggling, and `ctx.sidebarRight` for the file and dock commands. The presentation installs no renderer bridge and no third-party command surface.

The window keeps the platform's native caption band (32 CSS pixels on macOS and Windows) plus capability-gated native materials; Linux keeps its ordinary native frame. Within that layout, each terminal tab owns its own AI conversation, plan mode submits commands as human-clicked cards, and the sessions panel searches titles and message content.

On Windows, the launcher pins the browse directory-picker backend and keeps the full in-app directory panel. The desktop build patches that panel with a small system-folder icon whose same-origin route calls Electron's `dialog.showOpenDialog`; a selected path returns to the panel's existing workspace-adoption flow, while cancellation leaves the panel open. Ordinary browser and remote launches do not receive the desktop bridge. macOS and Linux retain the upstream adaptive chooser.

Windows PowerShell keeps the upstream `pwsh-sandbox` behavior and Windows ACL confinement in the AI Shell presentation. The launcher generation replaces only that Host provider with the `shell-desktop/windows-pwsh-sandbox` subpath from this same package. For the exact upstream ACL-runner argv, the adapter launches the packaged Electron executable in Node mode through a private trampoline. After validating the exact upstream runner and before importing it, the trampoline removes the Node-mode variable and ensures that its otherwise consoleless Windows process owns a hidden console. The restricted PowerShell process can then inherit that console instead of creating one while already running under the restricted token. Console allocation failure exits through the existing signed runner-failure path, and all ACL policy and subsequent failure handling remain delegated to the upstream runner. The desktop deploy root also retains its Yarn patch that combines `STARTF_USESHOWWINDOW` with the existing `STARTF_USESTDHANDLES` and `SW_HIDE` on both native restricted-process paths. It does not use the upstream-incompatible `CREATE_NO_WINDOW` or `CREATE_NEW_CONSOLE` flags. Direct `danger-full-access` PowerShell, macOS, and Linux execution are unchanged; there is no automatic unrestricted fallback when Windows confinement fails.

## Development

This package is managed by the Yarn workspace at the repository root. The sibling `deepseek-harness/` checkout remains an independent upstream pnpm project and is not part of the Yarn workspace. Install and verify AI Shell Desktop from the repository root:

```sh
yarn install
yarn check
```

The check verifies that every required first-party peer in the production graph is declared by the desktop deploy root. Headless Loader smokes activate the launcher-owned desktop row and a profile-local third-party row, then boot the published Web profile and inspect its loopback root and client manifest. Unit and type tests cover both profile compositions, restart fencing, client environment validation, desktop layout state, and platform-native window options.

Start the desktop application explicitly when a graphical session is available:

```sh
yarn dev
```

`dev` builds before launching. It does not require a separate manual build.

The headless-safe launcher surfaces can be exercised without importing or starting Electron:

```sh
node lib/bin.js --help
node lib/bin.js --version
```

## Plugin workflow

Manage any profile with the ordinary DSH command:

```sh
dsh plugin --profile desktop add third-party-plugin
dsh plugin --profile desktop remove third-party-plugin
dsh plugin --profile desktop update
```

The application starts with `desktop` by default. Choose another Web-capable profile from the tray's **Profile** submenu; switching profiles restarts the application. The generated DSH terminal defaults bare commands to the currently active profile, so the shorter forms below modify that profile directly:

```sh
dsh plugin add third-party-plugin
dsh plugin remove third-party-plugin
dsh plugin update
```

An explicit `--profile <name>` remains authoritative and is useful for preparing another profile before selecting it.

See [Plugin services for authors](docs/plugin-services.md) for required injection, optional Desktop adaptation, TypeScript examples, cancellation, and fallback guidance.

The package can then be launched from npm with:

```sh
npx shell-desktop
```

## Launching from the command line

The package installs two equivalent commands, `shell-desktop` and `shell-desktop`. Both launch the packaged Electron launcher (`lib/main.js`) when invoked without arguments.

- **Global install** — `npm install -g shell-desktop` installs the `electron` peer automatically, and `shell-desktop` then starts the application against the default DSH home:
  ```sh
  shell-desktop
  ```
- **Inside a profile** — after `dsh plugin --profile <name> add shell-desktop`, the command lives in the profile's `node_modules/.bin`. pnpm does not install the `electron` peer automatically; add it when you want the command to launch:
  ```sh
  dsh plugin --profile <name> add electron
  ```
  Native build approvals (node-pty, koffi, electron, and others) follow pnpm's usual `allowBuilds` rules.
- **Electron missing** — the command prints a short installation guide instead of failing with a module error.

Booting a profile that is composed with the desktop shell under an ordinary `dsh` invocation (without the launcher's `desktopRuntime` service) prints a reminder telling you to start it with `shell-desktop` or from the packaged application; the shell registers nothing in that case.

A third-party Host plugin only needs its normal `dsh.bundle` patch. A plugin with browser UI also publishes the normal `dsh.client` metadata with `platform: "web"` and an exported `./client` artifact. The upstream Web client module graph discovers it in every mode; Electron does not require a separate client build or a desktop-specific registration API. Enhanced-mode contributions must target services and slots that exist in that explicit composition rather than assuming the official layout or sidebar occupant owns them.

## Desktop operations

When the Desktop window is unfocused, a direct user turn that reaches `completed` raises a native completion notification; `error` and `max-tokens` endings raise a needs-attention notification. Completed and failed background jobs use the same native attention path. Aborted, blocked, interrupted, killed, plugin-initiated, continuation-only, mismatched, and subagent activity stays silent. Clicking a notification reveals and focuses the window. macOS and Linux increment the application badge, while Windows flashes the taskbar button; showing, focusing, or releasing the window clears that attention. The live `shell-desktop-notifications` settings namespace provides independent `notifyOnTurnCompletion`, `notifyOnTurnFailure`, `notifyOnJobCompletion`, and `notifyOnJobFailure` switches, all enabled by default. Notification text is deliberately generic and never includes prompts, responses, errors, job labels, commands, paths, session IDs, model or provider names, tool data, or output.
Desktop confirmations, warnings, errors, and results use one shadcn-backed `DesktopDialogWindow`. Each dialog is a separate sandboxed modal `BrowserWindow`, parented to the active Desktop window when available; it is not a component or portal inside the official Web page. A parented action-only dialog has no caption controls and therefore renders no empty frame; a standalone dialog with native traffic lights or caption controls uses the shared empty 36-pixel utility frame. Escape or an available window close maps to the bounded cancel action, and only a one-shot local result reaches the main process. Operating-system file-open and file-save pickers remain native because they select system paths rather than present a Desktop operation.
Recovery mode also uses an independent Desktop-owned window with an empty 36-pixel frame whenever macOS traffic lights or Windows caption controls are present. Its shadcn page first explains why Recovery opened, then separates actions into **Plugin management**, **Rollback**, **Switch Profile**, and **Diagnostics** tabs. Profile creation uses the same title-free utility frame only when its window exposes those controls. Recovery mutations and every restart request open a `DesktopDialogWindow` confirmation instead of placing a modal inside the recovery page.

## Logs and diagnostics

After healthy startup, a main-process watchdog checks visible application content every five seconds. Two consecutive empty-page observations or unanswered probes trigger bounded automatic recovery even if the renderer has not exited. An unresponsive renderer is terminated and reloaded into a new process. Visible recovery also requires meaningful content in the viewport; plugin activation alone is insufficient. Checks pause for hidden/minimized windows, navigation, and recovery before page/Loader readiness. Each probe has a ten-second deadline, and stale navigation results and long suspension delays are discarded. Probes inspect DOM visibility, not screenshot pixels, and do not diagnose GPU-only display faults.

After a healthy startup, an unexpected interface-process exit (including out-of-memory) silently reloads the existing window without restarting the Host, opening a prompt, or revealing a hidden window. Recovery succeeds only after both page loading and the client Loader's healthy report; an unresponsive recovery attempt times out after 30 seconds. There are at most three automatic attempts, with no initial delay and subsequent delays of one and three seconds. The retry budget resets only after a recovered client remains healthy for one minute. Repeated failures pause automatic recovery and open a system-native fallback prompt: **Try recovery again** authorizes another bounded cycle, while **Not now** leaves the background service running. Choose **Open AI Shell Desktop** from the tray to return to that prompt, or **Export Diagnostics…** to investigate. Reloading can briefly interrupt the display and lose unsent input; this recovery does not fix the underlying crash or memory growth. Startup failures retain their existing recovery flow; intentional renderer termination and application shutdown do not initiate automatic recovery.

AI Shell Desktop writes UTF-8 logs under Electron's user-data directory: `%APPDATA%\AI Shell Desktop\logs` on Windows and `~/Library/Application Support/AI Shell Desktop/logs` on macOS. Full logs use `dsh-YYYY-MM-DD.log`; warnings and errors are also written to `dsh-YYYY-MM-DD.error.log`. Files rotate at 10 MiB, files older than seven days are removed at startup, and the directory is kept below 200 MiB. The `shell-desktop.logLevel` setting controls verbosity and defaults to `info`.

On macOS and Windows, choose **Export Diagnostics…** from the tray to create a ZIP under the sibling `diagnostics` directory and reveal it in the system file manager. Export runs outside Electron's main thread, collects recent owned logs and local Crashpad `.dmp` files under a shared 50 MiB evidence cap, includes the `crash-evidence/active-run.json` marker when present, adds `system-info.txt`, and retains the three newest ZIP files. The confirmation dialog explains the privacy boundary before any archive is created. Recognized credentials are masked, but logs can still contain local paths, workspace IDs, session IDs, prompts, tool output, or third-party plugin messages; crash dumps can contain fragments of process memory. Review the ZIP before sharing it, especially before uploading it publicly.

## Native lifecycle

Closing the window hides it while the Host Cordis tree continues running. The tray reopens the window, selects the active profile, opens the isolated DSH terminal, checks for a stable release, changes mode through the standard settings namespace, or requests an explicit quit. Profile and mode changes both dispose the current Cordis tree before Electron relaunches. Native quit, `SIGINT`, and `SIGTERM` also request disposal before exit; a five-second deadline or a repeated request forces the final exit. Navigation and redirects remain on the exact loopback origin; external HTTP, HTTPS, and mail links open in the operating system, while the renderer uses `contextIsolation`, the Chromium sandbox, and no Node integration.

## Packaging

Stable and Beta disable ASAR on Windows, macOS, and Linux. Packaged Electron smokes verify bundled Cordis skills through the local filesystem backend.

`yarn package:dir` creates an unpacked directory for the current host platform. The packaged-runtime gate rejects an application directory that omits the desktop update and terminal modules, the DSH CLI bootstrap, the bundled pnpm entry, or the physical deployment package. Electron Builder emits the root manifest, desktop runtime, and complete dependency tree under `resources/app/` (`Contents/Resources/app/` on macOS); both Host profile boot and the CLI bootstrap use this physical tree so DSH profile-fallback symlinks never target a virtual ASAR directory. `build/app-icon.png` remains the unmodified iOS Default source and the Linux application icon. The build derives a Windows-specific `build/app-icon.ico` with exact high-DPI frames, a simplified vector treatment at small sizes, and compatibility DIB payloads below 256 pixels; the application executable, NSIS installer, and uninstaller all use that icon. It also runs `scripts/generate-mac-app-icon.mjs` to center the source artwork at 824 by 824 pixels on a transparent 1024 by 1024 canvas; macOS packaging and the live Dock both use the generated `build/app-icon-mac.png`. `build/tray-icon.svg` is the brand-blue tray source: the build derives a macOS template image that the system colors automatically and fixed brand-blue Windows and Linux tray images.

### WSL Linux headless checks

WSL2 is suitable for Linux headless build, typecheck, and unit-test coverage from a Windows workstation. Use a Linux Node.js installation inside WSL, not the Windows Node.js or Corepack shims that WSL can inherit through the mounted Windows `PATH`. When using `nvm`, start each shell with `source ~/.nvm/nvm.sh` before running Corepack commands:

```bash
source ~/.nvm/nvm.sh
git submodule update --init --recursive
corepack yarn install --immutable
corepack yarn workspace shell-desktop typecheck
corepack yarn workspace shell-desktop test
corepack yarn build
```

Commands run from `/mnt/<drive>` are valid but slower than a checkout stored on WSL's native ext4 filesystem. WSL does not replace a real Linux desktop session for tray, window-manager, `.desktop` integration, or installed-package smoke tests.

### Local Windows x64 installer

Use a native Windows x64 machine with Git and x64 Node `22.23.2` (the same release used by CI). The packaging command accepts Node `22.19+` and Node `24.x`, whose official distributions include the required Corepack command. From PowerShell in a fresh `v2` checkout, run:

```powershell
git submodule update --init --recursive
corepack.cmd yarn install --immutable
corepack.cmd yarn dist:win
```

Python and Visual Studio C++ Build Tools are not required. The Windows command uses `node-pty`'s bundled x64 Node-API binaries instead of asking Electron Builder to rebuild them from source, and the packaged-runtime gate rejects an installer staging tree that omits those binaries.

`dist:win` refuses non-Windows and non-x64 hosts, runs a Windows-safe gate containing the build, all TypeScript compiler faces, packaging and native-shell focused tests, and the runtime-closure verifier, then builds an assisted NSIS installer and verifies both generated PE files. The full cross-platform suite remains CI-owned because some POSIX execution tests are not Windows programs. The installer allows a per-user or elevated all-users installation, permits changing the installation directory, creates Start Menu and desktop shortcuts, and preserves DSH user data when the application is uninstalled. Version `2.0.5` is written to `shell-desktop\dist\AI-Shell-Desktop-2.0.5-x64-Setup.exe`; the unpacked application remains at `shell-desktop\dist\win-unpacked\AI Shell Desktop.exe` for smoke testing.

This local command deliberately strips Windows certificate variables and sets `signExecutable=false`. Its output is installable for testing but has no Authenticode publisher, so Windows can display an Unknown publisher or SmartScreen warning. A signed Windows release, certificate verification, installer upgrade/uninstall testing, and native UI/sandbox smoke remain separate release gates.

### Windows x64 portable ZIP

Use `yarn dist:win-portable` on a native Windows x64 machine to create an unsigned portable ZIP:

```powershell
corepack.cmd yarn dist:win-portable
```

The output is `shell-desktop\\dist\\AI-Shell-Desktop-<version>-x64-Portable.zip`. Extract it to any writable directory and launch `AI Shell Desktop.exe` without an installer, administrator access, Start Menu registration, or uninstall step. The application still keeps its profiles, logs, and caches in the normal Windows user-data directory, so this is portable distribution rather than a self-contained data sandbox. Portable archives carry no updater and must be replaced manually when a new version is released. Local builds are unsigned and may trigger an Unknown publisher or SmartScreen warning; signed portable artifacts remain a release gate.

### macOS DMG smoke

`yarn dist:mac-smoke` builds one unsigned universal DMG on a native macOS host. The same package runs natively on Intel and Apple Silicon Macs. The command refuses non-macOS hosts and runs the complete product gate before packaging: repository layout and community-contract checks, the Market build and check, then the Desktop build, every TypeScript compiler face, the full unit-test suite, runtime-closure verification, CLI/Loader/profile headless smokes, and the license audit. This includes the real login-shell tests for each supported shell installed on the macOS runner. It then packages without code-signing material, mounts the DMG, and verifies the property list, executable bit, both `x86_64` and `arm64` slices, and the `Contents/Resources/app/` runtime entries. It mirrors `dist:win`'s secret discipline by stripping every Electron Builder macOS signing and notarization variable, sets `CSC_IDENTITY_AUTO_DISCOVERY=false`, disables notarization, and never publishes. The artifact has no Developer ID signature, so Gatekeeper will block it on other machines; it exists so packaging regressions fail in CI before a manual release. The signed and notarized universal release remains `yarn dist:mac` on a credentialed macOS machine and writes its artifact to `shell-desktop/dist/mac-release/`.

## Model Experience

None. The desktop package changes application composition and native presentation; it does not add model-visible instructions, tools, events, or request fields.

#### KV Cache effect

None. The same DSH Host and client feature plugins assemble model requests.

## Known Limitations and Deferred Work

- Adding or removing a profile bundle requires restarting AI Shell Desktop; the launcher does not watch profile manifests. Selecting another profile from the tray performs that restart automatically.
- Changing the native material preference always restarts the application by design; a live generation never hot-swaps Loader rows, slot ownership, or native materials.
- The Host runtime exposes the bundled `pnpm` command on the current Electron process `PATH` for ambient compatibility and provides the managed `desktopPnpm` service; none of these commands are added to the system `PATH`.
- On Windows, the ambient `pnpm` command and lifecycle Node helper are `.cmd` shims. `desktopPnpm.run()` avoids shell lookup for the manager process by launching the exact packaged pnpm entry, while upstream `dsh plugin`, PowerShell, and Command Prompt can resolve ambient shims through a command interpreter. A third-party plugin that calls Node `spawn('pnpm', { shell: false })`, or a lifecycle script that directly executes its `.cmd` `npm_node_execpath` with `shell: false`, remains non-portable and should use the service or a shell-aware launch path.
- Installers are unsigned. Signed artifacts, Authenticode/publisher verification, SmartScreen reputation, and native upgrade testing remain release gates.
- The shared carrier is HTTP and WebSocket, not Electron IPC. It binds to loopback only. Replacing the carrier requires transport extension points in upstream DSH and is outside this standalone package.
- This project pins both the published DSH `0.1.5-rc.2` family and the corresponding official `deepseek-harness/` release source. Product builds consume the checked-in official-profile runtime tarballs recorded in `upstream.json`, rather than linking the source checkout.
- DSH `0.1.5-rc.2` migrates supported historical sessions to V3 while preserving the original logs. Sessions written after upgrading cannot be read by the previous `0.1.2-rc.1` runtime.
- `package:dir` is an unpacked smoke artifact. `dist:win` adds an unsigned NSIS test installer but does not establish Authenticode identity or SmartScreen reputation. Installation and upgrade behavior, native notifications and terminals, the Windows ACL sandbox, and native-material appearance remain target-platform verification boundaries.
