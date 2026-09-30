# AI Shell Desktop 常见问题

[English](faq.en.md)

本页回答当前正式版本最常见的安装、平台、运行环境和插件问题。功能范围以[最新 GitHub Release](https://github.com/Alexliwenhao/shell-desktop/releases/latest)和[用户指南](user-guide.md)为准。

## AI Shell Desktop 是什么？

AI Shell Desktop 是面向 Windows 和 macOS 的开源 DeepSeek Harness 桌面客户端。它把官方 Harness 的 Host、插件系统与智能体能力装进原生桌面应用，并以 **AI Shell** 界面呈现：终端、文件与 AI 对话同屏，外加系统托盘、终端环境与 profile 管理。

## 这是 DeepSeek 官方产品吗？

不是。AI Shell Desktop 是社区维护的独立开源项目，不隶属于 DeepSeek，也未获得 DeepSeek 官方背书。项目名称仅用于说明它与官方 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的技术关系。

## 支持哪些操作系统？

当前发布的正式安装包为 Windows x64；macOS 的打包流程已内置，但尚未发布正式安装包；没有 Linux 安装包。不要根据源码中存在跨平台兼容代码推断已经发布了对应安装包。

## 需要安装 Node.js、pnpm 或 DSH 吗？

不需要。安装包已经包含 Electron、Node.js、pnpm 和固定版本的 DSH 依赖。普通用户下载安装后即可启动，Desktop 也不会修改系统全局 PATH 或用户的 shell 配置。

## 首次启动需要下载运行环境吗？

不需要另行下载 Node.js 或 Harness 核心。安装包较大，是因为运行时和固定版本依赖已经包含在内，以换取更确定的首次启动和版本组合。使用云端模型或从 GitHub Releases 下载新版本时仍然需要网络。

## AI Shell Desktop 会修改官方 Harness 吗？

不会。仓库固定一个未修改的官方 Harness 上游版本，桌面壳通过插件/profile composition 边界提供 AI Shell 界面，不直接修改上游源码。

## 数据是否保存在本地？

Desktop Host、profile 和 DSH home 位于本机。是否向外部服务发送内容取决于用户配置的模型或工具提供商；使用云端模型时，相应请求仍会发送给该提供商。

## 可以安装 DSH 插件吗？

可以。AI Shell Desktop 使用官方 Harness 插件体系。可以从托盘打开 DSH Terminal，然后运行 `dsh plugin add`、`dsh plugin remove` 和 `dsh plugin update`；命令默认作用于当前激活的 profile，插件变更后需要重启 Desktop。

## Desktop profile 和已有 web profile 会自动同步吗？

不会自动复制插件。每个 profile 都有自己的 bundle 和依赖组合；切换 profile 后，终端中的默认插件命令会作用于当前 profile，也可以使用 `--profile <name>` 显式指定目标。

## 应用如何更新？

发行版通过 [GitHub Releases](https://github.com/Alexliwenhao/shell-desktop/releases/latest) 分发：下载新版本的安装包或免安装包覆盖使用即可，升级不会静默进行。托盘中的更新检查来自旧版发行服务（本项目不运营该端点），升级请以 GitHub Releases 为准。

## 在哪里下载和报告问题？

从[最新 GitHub Release](https://github.com/Alexliwenhao/shell-desktop/releases/latest)下载安装包。遇到问题时先查看[用户指南的排查部分](user-guide.md#排查)，仍无法解决再提交 [GitHub Issue](https://github.com/Alexliwenhao/shell-desktop/issues/new/choose)，并附上操作系统、应用版本、复现步骤和错误信息。
