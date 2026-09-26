# AI Shell Desktop

基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Windows / macOS 开源桌面客户端：固定上游版本并原样运行，桌面外壳本身也作为 DSH 插件组合。

> 独立的社区开源项目，与深度求索不存在隶属、合作、授权或背书关系。

## 功能

- **AI Shell 界面**：活动栏、导航列、终端工作台与 AI 对话列同屏协同
- **远端主机**：SSH 主机管理、SFTP 文件面板，终端与 AI 会话按主机绑定
- **终端工作台**：多标签会话，选中内容可引用进对话，回合末尾给出可执行命令卡片
- **桌面能力**：系统托盘（窗口模式 / 配置切换 / 诊断导出）、自动更新检查、安全模式与启动恢复
- **打包**：Windows NSIS 安装包与免安装 zip；macOS 应用图标与 DMG 发布流程

## 下载

安装包发布在 [GitHub Releases](https://github.com/Alexliwenhao/shell-desktop/releases/latest)（Windows x64 / macOS Universal）。当前构建未签名，Windows 首次运行可能提示「未知发布者」。

## 从源码构建

需要 Node.js 22.19+ 或 24+，以及 Corepack 提供的 Yarn 4：

```sh
git submodule update --init --recursive
corepack yarn install --immutable
corepack yarn dev            # 开发启动
corepack yarn check          # 构建 / 类型检查 / 测试
corepack yarn dist:win       # Windows 安装包（需在 Windows 上执行）
```

## 文档

| 目标 | 入口 |
| --- | --- |
| 安装与日常使用 | [用户指南](docs/user-guide.md) |
| 平台、环境与使用边界 | [常见问题](docs/faq.md) |
| 桌面宿主架构与发布边界 | [架构说明](docs/architecture.md) |
| 编写插件 / 桌面插件接口 | [插件开发](docs/plugin-development.md) · [桌面服务合同](shell-desktop/docs/plugin-services.zh.md) |
| 数据处理与隐私选择 | [隐私政策](PRIVACY.zh.md) |
| 参与贡献 | [CONTRIBUTING.md](CONTRIBUTING.md) |

## 与 DeepSeek Harness 的关系

上游提供智能体能力、插件系统与 Web UI；本项目负责桌面封装：应用外壳、本地服务的启动与恢复、窗口与托盘、安装包构建与发布。固定版本的 `deepseek-harness/` 子模块原样运行，桌面壳通过 DSH 的插件机制组合进同一运行时。

## License

[MIT](LICENSE)。「DeepSeek Harness」是深度求索公司的注册商标，本项目仅为说明技术来源与兼容性而使用该名称。
