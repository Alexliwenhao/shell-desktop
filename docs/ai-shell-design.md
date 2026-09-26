# AI Shell 产品设计（AI 版 MobaXterm）

> 目标：把 AI Shell Desktop 从"Agent 桌面"改造为**面向远端服务器的 AI 运维工作台**——用户连接机器、在可见终端里操作，AI 与用户共用同一会话，能读、能跑、能改文件。
> 状态：分区与终端会话已实现；SFTP 文件面板与"每机器一个 AI 会话"是下一步。

## 1. 定位与原则

- **会话即工作面**：一次连接 = 一个终端会话；AI 的所有操作落在"用户当前正在看的那个终端"里，命令可见、可打断。
- **不需要本地工作区**：产品面向远端服务器，DSH 的"选择工作区"不适用于本模式；会话的上下文应绑定主机（首页目录固定为远端家目录或根目录）。
- **AI 与用户同权**：AI 能执行命令、读写远端文件；危险操作走审批闸门（后续），不做静默执行。
- **一个界面看清全局**：连接状态、当前主机、当前路径都在左侧与状态条可见。

## 2. 信息架构（四区）

```
┌──────────────────────────────────────────────────────────────┐
│ Desktop 标题栏（原生 caption：拖拽 / 最小化 / 关闭）            │
├────┬──────────────┬───────────────────────────┬──────────────┤
│活动│ 左栏          │ 中央工作台                 │ 右栏 AI 对话  │
│栏  │ 会话/主机/文件│ 终端标签（xterm，SSH/本地）│ DSH 会话      │
│48px│              │                           │              │
│    │              │                           │              │
│ ⚙  │              │                           │              │
├────┴──────────────┴───────────────────────────┴──────────────┤
│ 状态条：当前会话 · 主机 · 路径                                 │
└──────────────────────────────────────────────────────────────┘
```

活动栏（从上到下）：**会话、主机、文件、AI 对话**；底部：**设置、导航（收起左栏）**。

- **会话**：当前打开的终端会话（每台机器一条）置顶；下方为官方会话导航（新建 AI 会话 / 历史）。
- **主机**：主机清单与新建（名称 / 地址 / 端口 / 用户 / 密码或私钥），点击即连。
- **文件**：跟随"当前会话主机"的 SFTP 浏览器（地址栏可输入路径跳转、目录列表、新建目录、删除、重命名、文本预览）。
- **AI 对话**：DSH 会话；工具集包含 `terminal_run`、`terminal_read`、`terminal_sessions`（已实现），下一步补 SFTP 工具。

## 3. 领域模型

| 概念 | 说明 | 现状 |
|---|---|---|
| 主机 Host | 一条 SSH 连接配置（hosts.json，含凭据） | 已实现（CRUD） |
| 终端会话 TerminalSession | 一次 PTY/SSH shell；标签即会话 | 已实现（open/write/read/resize/close/activate） |
| 活动会话 | 用户当前查看的终端；AI 默认操作对象 | 已实现（`shell-activate` 上报） |
| AI 会话 | DSH session；**应按主机一对一**（会话标题=主机，上下文=该主机） | **待实现** |
| 文件面板 | 针对活动主机的 SFTP 视图（cwd 状态） | 后端路由已实现，前端待实现 |

## 4. AI 能力清单

- 已实现：`terminal_run`（在可见终端执行并回收输出）、`terminal_read`（读最近输出）、`terminal_sessions`（列出会话并标记当前）。
- **终端专属工具域（已实现）**：aishell 模式下 `desktop-remote` 行带 `aishell: true`，每个 agent 创建时用 `ctx.tools.restrict({ allow })` 把工具目录收敛到 `terminal_*`、`propose_command`、计划/待办/检索与委派类工具（14 个），隐藏本机 shell（pwsh/bash）、本机文件与搜索、后台任务、goal/workflow/ralph 等；AI 无法再退回操作本机。被隐藏工具的 `tool:<name>` 提示词段落同时以空段落遮蔽，模型不会再读到用不了的指令。
- **运维专家人设（已实现）**：agent preset 的 `persona` 段落（"You are a coding agent…" + 本机工作目录）会在 agent 创建时被 `deployment:persona-prefix`/`suffix` 覆盖为 AI Shell 的 SRE 人设；aishell 下 `web-runtime.surfaceContext: false`，因此提示词里不含 harness 源码检出路径与 Web GUI 说明。
- **plan 模式即命令提案（已实现）**：aishell 人设要求 plan 模式下不执行命令，改用 `propose_command` 逐条提交；命令卡片由用户点「执行」按钮送入活动终端，模型再用 `terminal_read` 回收结果。
- 下一步：`sftp_list/read/write/mkdir/remove/rename`（与面板共用 `/_dsh/desktop/remote/sftp`），并对写操作加审批。
- 上下文：AI 需要知道"当前主机/路径"，由 `terminal_sessions` 与后续 `sftp_*` 返回；不引入本地工作区概念。

## 5. 下一步实现清单（按优先级）

1. **文件面板（P0）**：`client/FilePanel.tsx`——地址栏（输入路径 + 前往 + 上级）、目录列表（目录优先，双击进入）、新建目录、删除、文本预览；数据源 `POST /_dsh/desktop/remote/sftp`；无活动主机时显示引导。
2. **每机器一个 AI 会话（P0）**：连接主机/打开终端时，创建或复用该主机的 DSH 会话并切到右栏；会话标题为 `user@host`；隐藏"选择工作区"入口（AI Shell 内不出现 Workspace 选择）。
3. **会话历史与新建（P0）**：左栏"会话"中列出 AI 会话历史（标题/时间），提供"新建会话"。
4. **AI 文件工具（P1）**：把 sftp 操作暴露为模型工具，写操作走审批闸门。
5. **审批与安全（P1）**：危险命令（`rm -rf`、`sudo`、写系统路径）在终端与 AI 工具两侧统一拦截。
6. **传输能力（P2）**：上传/下载、拖拽、目录递归操作。

## 6. 技术落点（本仓库）

- Host 侧：`src/remote.ts`（`shell-desktop/remote`）——主机存储、ssh2 连接、shell 会话、SFTP 路由、AI 工具；私有路由前缀 `/_dsh/desktop/remote`，仅回环 + 同源。
- Client 侧：`src/client/AishellFrame.tsx`（四区框架）、`TerminalWorkspace.tsx`（xterm 标签）、`HostPanel.tsx`（主机清单）、`remote-api.ts`（同源调用）、`aishell-styles.ts`（样式）。
- 呈现模式：`aishell`（`shell-desktop.mode`），与 advanced 共用窗口/加载策略；`ui-layout` 关闭，座位 `sidebar/main/shell.overlay` 由本包接管。
- 限制：凭据暂存于 `~/.dsh/remote/hosts.json`（0600）；后续接入系统钥匙串。node-pty 不可用时降级为管道 shell（无窗口尺寸语义）。

## 7. 验收口径

- 连接一台真实 SSH 主机 → 终端可交互 → AI 对话中要求"看一下当前目录"，命令出现在用户终端且返回结果。
- 左栏"文件"可浏览该主机目录、输入路径跳转、打开文本文件预览。
- 同一主机再次连接时复用其 AI 会话；会话标题为 `user@host`；AI Shell 内不出现工作区选择。
