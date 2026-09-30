# AI Shell Desktop 架构

## 总览

AI Shell Desktop 是一个薄的 Electron 宿主。它在 Electron main 进程中启动官方 DSH Host，Host 再通过 HTTP/WebSocket Web carrier 提供界面；carrier 只监听回环地址（`127.0.0.1`），仅本机可用。Desktop 没有另造一条 renderer IPC 插件系统，也不把 Electron API 暴露给页面。

```mermaid
flowchart LR
  User[用户] --> Native[Electron main / tray / window]
  Native --> Launcher[Profile launcher]
  Launcher --> Host[Host Cordis generation]
  Host --> Carrier[HTTP + WebSocket Web carrier]
  Carrier --> Renderer[Sandboxed Web renderer]
  Host --> Upstream[Upstream DSH services]
  Host --> Desktop[Desktop-owned plugins]
  Host --> ThirdParty[Third-party plugins]
  Launcher --> Services[desktopProfiles + desktopPnpm]
  Services --> ThirdParty
```

## 启动顺序

1. Electron 获取单实例锁，并读取 Desktop 私有的 profile 状态（设置文件里遗留的旧模式会被归一为 AI Shell）。
2. Launcher 准备激活 profile，但不会为了列举 profile 而改写用户 profile。
3. Launcher 提供当前 generation 的 native runtime、`desktopProfiles` bootstrap 和内置 pnpm 环境。
4. Host Cordis root 启动 Loader entries。Desktop service 在第三方插件可读取前注册。
5. 官方 `dsh-base`、`dsh-web-app` 和 profile 中的第三方 bundle 组成 Web carrier。
6. Host 绑定 loopback；Electron 创建 BrowserWindow 并从 loopback 地址加载同源页面。
7. Web surface 成功加载后才创建托盘并提交 profile 的 last-known-good 状态。

任何 profile 或模式切换都会 dispose 当前 generation，再启动新的 generation。Service reference、窗口对象和 subprocess handle 都不能跨 generation 缓存。

## Host、Client 和 native runtime

- **Upstream Host**：agent、model、tool、session、settings、webServer 和 subprocess 等官方能力。
- **Desktop Host**：窗口、托盘、profile、终端，以及对第三方开放的两个 service。
- **Web Client**：官方 Web UI 和第三方浏览器界面。它通过共享 Web carrier 工作，不直接调用 Electron。
- **Native runtime**：Electron BrowserWindow、系统托盘、文件/网络适配。`desktopRuntime` 只供 Desktop 自有 row 使用。

AI Shell 的 Client face 校验环境后接管 root slot，安装 Desktop 自有的 AI Shell 布局（活动栏、导航列、终端工作台、AI 对话列），upstream sidebar 与 conversation 以官方 occupant 身份继续由同一组合承载。启动时留存的多模式配置会被忽略并重新归一为 AI Shell。macOS 与 Windows 会按系统能力使用原生材质，同时不改变上游 occupant slot 的所有权。

Desktop 级确认、警告、错误与结果不会进入 Web Client 组件树。`DesktopDialogWindow` 会创建独立、沙箱化的模态 `BrowserWindow`，应用共享的空白 utility frame，并在可能时以当前 generation 窗口为 parent，只接受一次有界本地结果。恢复模式与新增 Profile 是使用同一套无标题 frame 的独立 Desktop-owned 窗口。恢复页面本身使用 shadcn，先展示原因，再提供四个工作流 Tab；破坏性恢复操作会把确认交回 `DesktopDialogWindow`。

### 原生 Shell generation 与平台 adapter

`ElectronRuntime` 负责协调 Host 与原生桌面环境，但不直接拥有窗口和托盘的细节。每次启动由一个 `ElectronShellGeneration` module 完整拥有 `BrowserWindow`、`Tray`、相关 Electron listener、导航限制、外链处理和缩放快捷键。释放 generation 必须通过其幂等 `release()` interface 完成，调用方不能跨 generation 缓存或单独销毁这些资源。

平台差异集中在启动时选择一次的 `ElectronPlatformStrategy` seam。Windows、macOS 与 Linux adapter 声明目录选择与平台相关的窗口能力，并负责各自的菜单、Dock 图标与原生材质操作。新的平台分支应进入对应 adapter；generation 与 runtime 中只保留各平台共享的生命周期流程。

## Profile 与服务边界

profile 的名字和绝对目录由 `desktopProfiles.current` 提供，不能从 argv、settings 或 URL 猜测。`list()` 是只读发现；`select()` 记录 pending target，并通过重启完成切换。

`desktopPnpm.run()` 直接跑内置 pnpm；`runPlugin()` 通过打包的 DSH CLI 维持 profile 初始化、相对 source 和 bundle reconcile。两者都属于当前 generation，并由 subprocess service 管理完整进程树。

Launcher 私有的 `desktopRuntime`、`desktopPnpmBootstrap`、Electron executable、Node helper 和 ABI 环境不是第三方 API。稳定包的公开 contract 是 `shell-desktop/profile-service` 与 `shell-desktop/pnpm`；Beta 包提供对应的 `shell-desktop-beta/*` 路径。

## 打包与运行时闭包

发布包使用 Electron Builder 和 `app.asar`，但需要物理 unpack 的依赖（例如 pnpm、node-pty、Windows ACL/native 文件）会放在 `app.asar.unpacked`。Packaged runtime gate 会检查 ASAR 入口和物理运行时入口，profile fallback 不能把符号链接指向无法被 Node 解析的虚拟 ASAR 路径。

根 workspace 使用 Yarn；固定的 `deepseek-harness/` 子模块保持上游自己的 pnpm workspace。稳定版与 Beta 的桌面代码分别位于 `shell-desktop/` 和 `shell-desktop-beta/`，共享功能由变体同步检查约束；两者都不修改上游子模块。

## 发行通道

稳定版与 Beta 是两个实体 npm 包和两个系统应用，不由 Git 分支区分。稳定版使用 `shell-desktop`、`AI Shell Desktop` 与 `com.shelldesktop.app`；Beta 使用 `shell-desktop-beta`、`AI Shell Desktop Beta` 与 `com.shelldesktop.app.beta`。`upstream.json` 同时记录两个通道的上游版本、提交和 vendored runtime 清单，根级精确 resolution 保证每个 workspace 只能解析自己的 DSH 运行时。发行包通过 [GitHub Releases](https://github.com/Alexliwenhao/shell-desktop/releases) 分发，应用内不提供自动更新入口。

## 维护者深入阅读

- [Desktop service contract](../shell-desktop/docs/plugin-services.md)
- [Package README](../shell-desktop/README.md)
