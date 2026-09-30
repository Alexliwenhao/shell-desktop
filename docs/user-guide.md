# AI Shell Desktop 用户指南

## 安装与首次启动

从 [GitHub Releases](https://github.com/Alexliwenhao/shell-desktop/releases/latest) 下载 Windows x64 安装包（`AI-Shell-Desktop-<版本>-x64-Setup.exe`）或免安装包（`AI-Shell-Desktop-<版本>-x64-Portable.zip`）。安装包自带运行所需的 Electron、Node 与 DSH 依赖，普通用户不需要另行安装 Node.js 或 pnpm。当前构建未签名，Windows 首次运行可能提示「未知发布者」。

首次启动时，应用会准备默认 profile，并在本机启动 DSH Host 与 AI Shell 界面。关闭窗口通常只会隐藏窗口；可以从托盘重新打开，选择「退出」才会结束应用和 Host 进程。

## Profile

Profile 是一组 DSH bundle、依赖和 patch 的组合。托盘中的 **Profile** 菜单会列出现有 profile，并可按需创建新的 profile。

选择 profile 后应用会有序重启。新 profile 在 Host 和窗口都成功启动后才会被记录为最近一次可用 profile；启动失败会回到上一次可用选择。官方 profile 默认使用同一个 DSH home，所以 sessions、settings 和 storage 通常不需要迁移。自定义配置（patch）如果主动改写持久化路径，则以该 profile 自己的设置为准。

切换 profile 不会把旧 profile 的插件偷偷复制到新 profile。要管理目标 profile，请在终端中显式写出 profile。

## 界面：AI Shell

当前产品只提供 **AI Shell** 一种界面：左侧活动栏（会话 / 主机 / 文件）、中央终端工作台、右侧 AI 对话同屏协同。启动时即使设置文件里留有旧的多模式配置，也会按 AI Shell 运行。

- **终端 ↔ 会话绑定**：每个终端标签绑定自己的 AI 会话，切换终端即切换对话；AI 只能操作它绑定的终端，跨终端互不可见。
- **计划模式**：输入 `/plan` 进入，AI 只把命令作为「待执行命令」卡片提交，点「执行」才会进入终端。
- **会话检索**：会话面板顶部可检索标题与会话内容。

## 本地服务

AI Shell Desktop 在本机启动 Host 服务，默认只监听 `127.0.0.1`，端口从 `43120` 开始（被占用时依次递增，最多尝试 32 个）。端口可以在设置文件中固定：

```yaml
shell-desktop:
  port: 43189
```

端口必须是 `0` 到 `65535` 之间的整数（`0` 表示由系统分配）。修改后应用会有序重启。服务不提供外网或局域网访问入口。

## 插件管理

插件是给 DSH 添加能力的扩展包，例如模型、工具、界面和工作流。AI Shell Desktop 使用的就是官方 Harness 的插件体系，官方插件可以直接安装使用；多个插件遵循统一的约定，可以一起安装、一起工作。

普通 DSH 插件仍使用官方 CLI 语义：

```sh
dsh plugin --profile desktop add <plugin>
dsh plugin --profile desktop remove <plugin>
dsh plugin --profile desktop update
```

在 AI Shell Desktop 托盘打开的终端中，裸 `dsh` 和不带 `--profile` 的 plugin 命令默认使用当前激活 profile：

```sh
dsh plugin add <plugin>
dsh plugin remove <plugin>
dsh plugin update
```

显式 `--profile <name>` 始终优先。插件变更后需要重启 AI Shell Desktop，才能让新的 bundle 进入 Loader 组合。

## 打开终端

可以从托盘的「打开 DSH 终端」打开带完整 DSH 环境的终端。macOS 会打开 Terminal，Windows 会优先使用 Windows Terminal，找不到时回退到 PowerShell 或命令提示符。

欢迎信息会显示：应用版本、当前 profile、profile 目录和 DSH home。Desktop 会在自己的 user-data 目录生成 `dsh`、`pnpm` 和 `node` 私有 shim，只对这个终端进程设置 PATH，不会修改系统 PATH 或用户 shell 配置。

## 更新

发行版通过 [GitHub Releases](https://github.com/Alexliwenhao/shell-desktop/releases/latest) 分发：下载新版本的安装包或免安装包覆盖使用即可。托盘中的更新检查来自旧版发行服务（本项目不运营该端点），升级请以 GitHub Releases 为准。

## 排查

Desktop 的确认、警告与操作结果会打开独立、基于 shadcn 的桌面级模态窗口，而不是侵入官方页面的 overlay。启动失败时应用会打开恢复窗口，先展示进入原因，再提供 **插件管理**、**回滚**、**切换配置** 与 **诊断** 四个 Tab。

- **应用能够进入托盘**：右键托盘图标，选择 **导出诊断信息…**。确认隐私提示后，Desktop 会生成 `diagnostics-*.zip` 并在文件管理器中显示它。
- **应用持续闪退，无法进入托盘**：在 PowerShell 中直接运行安装后的程序并加上恢复参数。默认安装位置的命令如下；如果安装时修改过目录，请替换为实际的 EXE 路径。

  ```powershell
  & "$env:LOCALAPPDATA\Programs\AI Shell Desktop\AI Shell Desktop.exe" --export-diagnostics
  ```

  通过 npm 安装时，稳定版可运行 `shell-desktop --export-diagnostics`，Beta 可运行 `shell-desktop-beta --export-diagnostics`。这个命令不会启动 Host、profile、插件或窗口；完成后会在终端输出诊断 ZIP 的绝对路径。
- **诊断包内容**：包含最近的应用日志、本地 Crashpad `.dmp`、当前运行标记和 `system-info.txt`。系统信息会记录 Desktop、Electron、Node、平台和架构版本。日志会对可识别的认证凭据脱敏，但本地路径、工作区 ID、会话 ID 和崩溃时的内存片段仍可能存在。公开上传前必须检查；不适合公开的 dump 应通过可信渠道提供。
- **窗口消失了**：先检查系统托盘，关闭窗口不是退出。
- **插件没有出现**：确认命令作用于目标 profile，并重启应用。
- **终端命令找不到**：从托盘重新打开 DSH 终端；系统 shell 的全局 PATH 不会被 Desktop 修改。
- **没有更新提示**：应用不主动弹出更新；请查看 [GitHub Releases](https://github.com/Alexliwenhao/shell-desktop/releases/latest)。

更底层的生命周期、打包和平台限制属于开发者文档，见[文档索引](README.md)。
