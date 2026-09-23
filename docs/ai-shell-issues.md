# AI Shell 问题台账（提出 / 修复 / 验证）

> 目的：记录用户提出的每一个问题及其根因、修复与验证方式，避免重复排查或误改已修复的行为。
> 规则：新问题先追加一行到总表，再在下方补细节；修复后更新状态并写明证据（命令、日志、截图路径）。

## 状态总表

| # | 问题 | 状态 | 关键改动 |
|---|---|---|---|
| 1 | plan 模式查询打到了本机，应作用于已连接终端 | 已修复 | `src/remote.ts`：工具目录收敛到终端工具（`aishell` 白名单） |
| 2 | plan 模式要把命令变成可点击执行的卡片 | 已修复 | `propose_command` 卡片 + 回合末尾渲染（见 #8） |
| 3 | AI 会话任何输入都不得操作本机 | 已修复 | `restrict({ allow })` + 隐藏工具指引段落 |
| 4 | 系统提示词必须是运维专家（SRE）人设 | 已修复 | 遮蔽 `deployment:persona-prefix/-suffix`；`surfaceContext: false` |
| 5 | 工作区可在 设置→通用设置 中设置并支持切换 | 已修复 | `WorkspaceSettingsRow` + `shell-desktop.aishellWorkspace` |
| 6 | 工作区需支持路径配置（可输入/校验路径） | 已修复 | 路径输入 + 应用 + 原生选择器 + Host 校验 |
| 7 | 终端选中内容可引用到 AI 输入框 | 已修复 | `TerminalWorkspace.onQuote` + `setDraft` 追加引用块 |
| 8 | 待执行命令不要放在思考过程，要放在最后返回内容中 | 已修复 | `aishell-commands` 投影，锚定 `turn/end` |
| 9 | 点击终端 tab 应切回该终端绑定的最新会话 | 已修复 | `onActivate` 触发 + `latestBoundSession` 兜底 |
| 10 | plan 模式输出表格而不是命令卡片 | 已修复 | 遮蔽 `plan:policy`（仅 plan 激活时注入）+ 工具描述 |
| 11 | 卡片格式仍是表格，要之前的代码框格式 | 已修复 | 投影解析兼容字符串型 `turn` 与 JSON 字符串 `arguments` |
| 12 | 设置→通用设置 里看不到工作区路径设置 | 已修复 | `SettingsScope` 方法未绑定导致 slot 渲染崩溃，改为 `useCallback` 包装 |
| 13 | 只有 plan 模式才不直接操作主机（普通模式必须自己执行） | 已修复 | 人设新增“只有 plan 模式才提交卡片”约束 |
| 14 | “在新对话中分支”功能需要关闭 | 已修复 | AI Shell 聊天列隐藏该动作（CSS 按 aria-label） |
| 15 | 终端已有 AI 会话时，点“新建会话”无效（复用了旧会话） | 已修复（待人工确认） | `newSession` 强制新建并重绑终端 |
| 16 | 历史会话要支持删除 | 已修复（待人工确认） | 历史行删除按钮：点一次变 ✓（红），再点一次才真正删除；失败会在面板提示 |
| 17 | 文件的默认路径是 `/` | 已修复（待人工确认） | `FilePanel` 初始加载远端根目录 `/`（不再用 `.`） |
| 18 | 产品改名：Shell Desktop → Shell Desktop，窗口标题 AI Shell Desktop | 已修复 | 全包（`src`/`tests`/`scripts`/`build`/文档）改文案；保留机器键（`DSH-Desktop-*` 产物名、`X-DSH-Desktop-*` 头、`shell-desktop` 包名） |
| 19 | logo 全部换成 `JLY.png` | 已修复 | 矢量化四面体标 → `build/app-icon.png` / `tray-icon.svg` → 生成 ICO/托盘/应用图标；应用内占用 `conversation.hero.brand.mark` 槽位 |
| 20 | 首次启动的初始化向导要全部去掉（市场/手机连接/浏览器页删除） | 已修复 | 删除 Setup Wizard（窗口/契约/文案/状态/native-ui/vite 入口/测试）；启动直接进主界面，模式默认 AI Shell |
| 21 | 内测声明改为 Host 自动确认（不再弹给用户） | 已修复 | `src/desktop-onboarding.ts`：Host 启动即写入 `ui-onboarding.welcomeNoticeVersion` |
| 22 | 深色模式下终端内容看不见 | 已修复（待人工确认） | 终端改为跟随主题的独立调色板（深色=深底白字），由 `terminal-theme.ts` 提供 |
| 23 | 项目独立：整体改名 Shell Desktop，剥离 dsh-desktop | 已修复 | 新仓库 `Alexliwenhao/shell-desktop`；包名 `shell-desktop(-beta)`、appId `com.shelldesktop.app(.beta)`、目录与全部内部标识 `shell-desktop-*` |

## 细节

### 1 / 3 终端专属工具域
- 现象：plan 模式里“查询内存”实际跑在本机（Windows），因为 preset 自带本机工具（`pwsh`、`read`、`glob`、`job_*` 等），而 `terminal_run` 在 plan 模式被拒。
- 修复：`src/remote.ts` 在 `agent/created` 时用 `agent.ctx.tools.restrict({ allow })` 把每个 agent 的工具目录收敛到 `AISHELL_AGENT_TOOLS`（`terminal_*`、`propose_command`、`exit_plan_mode`、`ask_user_question`、`todo_write`、`web_*`、委派族）；并用空段落遮蔽被隐藏工具的 `tool:<name>` 提示词段落（`tool:jobs`/`tool:goal` 为家族段落）。
- 证据：headless 探针（aishell 14 个工具、无本机工具；advanced 31 个工具不变）。

### 4 运维专家人设
- 根因：`standard` preset 的 `persona` 行会遮蔽部署级人设。
- 修复：`installAishellPersona()` 在 agent 自身作用域重注册 `deployment:persona-prefix`/`-suffix`；`profile.ts` 里 aishell 关闭 `web-runtime.surfaceContext`（提示词不再含 harness 检出路径 / Web GUI 说明）。
- 证据：提示词 5642 → 2525 字符，`HAS_CODING_AGENT=false`。

### 5 / 6 工作区设置与路径
- 修复：`shell-desktop.aishellWorkspace` 设置 + 设置→通用设置 的「工作区」行（路径输入 + 应用 + 选择目录… + 已有工作区下拉）；`switchWorkspace(path)` 先经 Host 校验，再确保工作区存在、持久化并打开；空路径表示跟随默认。
- 证据：窗口截图确认该行渲染；`typecheck` + 单测通过。

### 7 终端选中内容引用
- 修复：终端标签栏出现「引用选中内容」，把选中文本以「来源 + 栅栏代码块」追加进当前 AI 会话草稿（不覆盖原草稿；围栏长度自适应）。

### 8 / 11 待执行命令卡片
- 修复：新增 `aishell-commands` 会话节点，把本回合 `propose_command` 调用投影到 `turn/end` 之后的回合末尾（在过程折叠之外）渲染为代码框卡片，卡片自带「执行」按钮。
- 关键根因（#11）：客户端 `tool/call` 事件里 `turn` 可能是字符串、`arguments` 是 JSON 字符串，投影原先直接跳过 → `commands=0` 无卡片。
- 证据：宿主日志 `projection: matched proposal in turn=1` ×2、`buildViewNode turn=1 … commands=2`；截图可见卡片。

### 10 plan 模式输出表格
- 修复：遮蔽 harness 的 `plan:policy` 段落（仅 plan 激活时渲染），要求命令一律用 `propose_command` 提交、不得用文字/列表/表格；`propose_command` 描述同步加强。
- 证据：headless 探针（未开 plan 为空；`planMode.set(agent,true)` 后包含「可执行命令卡片」）。

### 9 终端 tab 切回绑定会话
- 根因：`AishellFrame` 用 `boundTerminalRef` 只在“终端 key 变化”时切换。
- 修复：`TerminalWorkspace.activate()` 每次用户激活（点 tab、聚焦、开新终端、关闭交接）都上报 `onActivate(key)`；`AishellFrame` 直接接 `openTerminalSession`；`latestBoundSession()` 在应用重启后用 Host 记录（`sessionHosts` + 会话列表 `updatedAt`）找回该主机最新会话。

### 12 工作区行不显示
- 根因：`SettingsScope.getSnapshot/subscribe` 是原型方法（内部读 `this.store`），被当作回调脱离实例传入 `useSyncExternalStore` → 渲染崩溃被 slot 边界吞掉。
- 修复：用 `useCallback` 包装后再传入（与 `DesktopSettingsSection`/`AdvancedFrame` 一致）。
- 证据：渲染器控制台不再出现 `Cannot read properties of undefined (reading 'store')`；截图确认该行出现。

### 13 只有 plan 模式才不直接操作主机
- 修复：人设新增“只有 plan 模式下才把命令作为待执行卡片提交给用户手动执行；普通模式必须自己用 `terminal_run` 执行并读取回显，不得要求用户手动执行”。

### 14 关闭“在新对话中分支”
- 定位：`dsh-client-ui-chat` 的 `TurnTailNodeView` 通过 `MessageIconActions` 渲染 `onBranch → forkAt(...)`，文案 `message.branch` =「在新对话中分支」。
- 修复：`src/client/aishell-styles.ts` 在 AI Shell 聊天列按 `aria-label`（中/英）隐藏该按钮。

### 15 新建会话无效（终端已有会话时）
- 根因：`openBoundSession(bindKey)` 在 key 已有内存绑定时直接 `openSession(existing)`，而“新建会话”按钮复用了这条路径 → 永远只是切回旧会话。
- 修复：`openBoundSession(bindKey, { fresh })`；`newSession(bindKey)` 传 `{ fresh: true }`：跳过复用与 `latestBoundSession`，在终端所属工作区**新建**会话并把该终端重绑到新会话（同时写 `sessionHosts` 以便按主机分组）。

### 16 历史会话删除
- 需求：左栏“会话”里的历史会话要能删除；为避免误删，需要二次确认（行内确认，不用弹窗）。
- 实现：每条 AI 会话行右侧删除按钮（`Trash2`）——**第一次点击**把该行按钮变成红色 ✓（`data-confirm`，标题“确认删除”），**再点一次**才真正删除；点击会话行本身会取消待确认状态。
- 删除路径：优先 `uiWorkspace.archiveSession(sessionId)`（官方 UI 路径），回退 `workspaces.archiveSession`；失败时 Promise reject，面板顶部显示「删除失败，该会话仍然保留。」（`dshAishellPanelAlert`），不再出现“点了没反应”。
- 连带处理：删除会清掉该会话与终端的绑定（`terminalSessions`）；若被删的是当前会话，则自动切到该终端的下一条历史会话（`latestBoundSession`），没有则新建一条。
- 涉及：`src/client/SessionHistory.tsx`、`src/client/AishellFrame.tsx`、`src/client/aishell-shell.ts`、`desktop-settings-locales.ts`（`aishellSessionDelete`/`aishellSessionDeleteConfirm`/`aishellSessionDeleteFailed`）、`aishell-styles.ts`（`[data-confirm]`、`.dshAishellPanelAlert`）。
- 证据：`typecheck` 通过；相关 spec 通过；应用已重启（待人工点击确认）。

### 17 文件面板默认路径
- 规则：文件（SFTP）面板的默认路径是远端根目录 `/`。
- 实现：`FilePanel` 初始 `cwd`/`draft` 为 `/`，进入面板或切换主机时加载 `/`（此前用 `.`，由 SFTP 解析成家目录）。
- 涉及：`src/client/FilePanel.tsx`。

## 排查与验证工具（本仓库约定）

- 启动（无需 corepack 时）：用 corepack 缓存的 Yarn 4.18.0 直接跑 `yarn workspace shell-desktop start`；后台进程需用 WMI 创建（`Invoke-CimMethod Win32_Process Create`），否则会随命令行子进程结束而被终止。
- 渲染器控制台：启动前设置 `ELECTRON_ENABLE_LOGGING=1`，日志进入启动输出文件。
- 宿主日志：`%APPDATA%\Shell Desktop\logs\host\dsh-YYYY-MM-DD.log`（`ctx.logger.*` 在这里，进程 stdout 看不到）。
- 会话日志：`~/.dsh/sessions/**/session.v3.jsonl.zstd`（多帧 zstd，逐帧解压）。
- 窗口截图/点击：`PrintWindow(hwnd, hdc, 2)`（`CopyFromScreen` 会截到覆盖窗口）；点击用 `SetCursorPos` + `mouse_event`。
- 打包（本机无 corepack 时）：`DSH_PACKAGE_CHECK_ALREADY_RAN=1`（先手动跑过 `check:win-package`）+ `yarn workspace shell-desktop dist:win` / `dist:win-portable`；AA 物料固定用 `DSH_AA_SOURCE_REF=pinned` 走本地 `vendor/agents-anywhere` 校验，避免联网重建。
- 产物：`shell-desktop/dist/DSH-Desktop-<version>-x64-Setup.exe`（NSIS，未签名）与 `...-Portable.zip`；解包目录 `dist/win-unpacked/Shell Desktop.exe`。

### 18 产品改名（Shell Desktop）
- 范围：`src/**`、`tests/**`、`scripts/**`、`build/installer.nsh`、`build/assistedMessages.yml`、包内 README/THIRD_PARTY_NOTICES/plugin-services 文档；`DeepSeek Harness Desktop → AI Shell Desktop`、`Shell Desktop(Beta) → Shell Desktop(Beta)`。
- 刻意不改（机器键）：产物名 `DSH-Desktop-*`、更新请求头 `X-DSH-Desktop-*`、npm 包名/bin 别名 `shell-desktop`(`-beta`)/`shell-desktop`、`appId`。
- 连带影响：应用数据目录从 `%APPDATA%\Shell Desktop` 变为 `%APPDATA%\Shell Desktop`；旧目录数据不会自动迁移（首启会进安装向导）。本机已手工把旧目录中的 profile-setup/profile-selection/preferences/identity 等拷入新目录。
- 变体校验：`scripts/verify-desktop-variants.mjs` 的 `normalizeIdentity` 已由 `Shell Desktop Beta` 改为 `Shell Desktop Beta`；`check:desktop-variants` 通过（203 个共享源文件对齐）。

### 19 logo 更换（JLY.png）
- 来源：仓库根 `JLY.png`（441×442，透明底、蓝系多面标记）。处理：按 5 色（`#0062a4/#9dd3ed/#009ad7/#1eaadd/#55bbe5`）分类 → 逐面描边成 SVG → `build/app-icon.png`（1024² RGBA16 + sRGB ICC）与 `build/tray-icon.svg`（单色 `#4D6BFE` 剪影，50×50）。
- 派生：`generate-windows-app-icon.mjs`（ICO 16–256，≤40px 用剪影黑/白圆角底）、`generate-mac-app-icon.mjs`（824px 内缩，trim 后 824×823，`trimOffsetTop=-101`）、`generate-tray-icons.mjs`（蓝/黑模板 PNG）。Beta 版按历史规则 = 稳定版 RGB 反相（alpha 不变）。
- 应用内：`src/client/BrandMark.tsx` 用描边路径注册 `conversation.hero.brand.mark`（single/root）替换官方鱼标；在 AI Shell 模式下启动即打开会话，hero 一般不出现，界面内可见品牌位以托盘/任务栏图标为主。
- 测试：`tests/package.spec.ts` 图标摘要与 macOS 内缩断言已更新（stable `d629cf2f…`，beta `c43abe99…`）。

### 20 首次启动向导全部移除
- 决策（用户）：首启流程全去掉；市场/手机连接/浏览器访问页删除；API Key 引导保留给用户自己填；不做旧数据目录迁移。
- 实现：删除 `setup-wizard-window/contract/copy/state`、`native-ui/setup-wizard/**`、`vite.native-ui.config.ts` 入口、5 个 wizard spec；`main.ts` 不再有向导门禁与运行块；`profile-channel-admission` 只以 checkpoint 作为使用证据（去掉 wizard 标记回退）。
- 默认值：`DesktopSettingsSchema.mode` 与 `Config.mode` 默认改为 `aishell`（与 `profile.ts` 的 `DEFAULT_DESKTOP_SHELL_MODE` 一致），否则组合层与设置层不一致会导致重启循环；`desktop-setup-settings.ts`（原 setup-wizard-settings）保留设置文档读写与迁移。
- 保留入口：模式/材质/市场/AA/通知/浏览器访问仍可在 设置→桌面设置 修改。
- 证据：清空 `%APPDATA%\Shell Desktop` 冷启动只出现 `AI Shell Desktop` 主窗口（无 `Set up Shell Desktop`），hero 显示新 logo；`check:win-package` 通过；两个包 typecheck 通过。

### 21 内测声明
- 现象：首次进入弹出上游「内测声明」模态（`settings.onboarding` 的 `welcome-notice` 步骤，order −100），由 `ui-onboarding.welcomeNoticeVersion` 精确比对控制。
- 修复：Host 启动时写入已确认版本（`src/desktop-onboarding.ts`，等待上游 section 注册，最多 40×500ms；已确认则不再写）。属于“以部署方名义确认”，不改上游代码。
- 证据：删除 settings.yaml 中该字段后重启，字段被 Host 重新写回；窗口截图无该模态；打包产物 Host chunk 含 `ui-onboarding`。

### 22 深色模式终端不可见
- 根因：xterm 的主题只在 `new Terminal({ theme })` 时读取一次；切换深色后 `.dshAishellTerminal*` 容器的 `background-color` 跟随 `--dsw-alias-bg-base` 变暗，而终端仍用旧（浅色）调色板 → 暗底 + 暗色前景，内容看不见。
- 修复：新增 `src/client/terminal-theme.ts`（从 `document.documentElement` 读 token，缺失时回退浅色）；`aishell-shell` 通过 root 注入 `subscribeTheme`（`ctx.on('theme/change')`）→ `AishellFrame` → `TerminalWorkspace`，主题变化时为每个活动终端重设 `term.options.theme`。
- 证据：`tests/client-terminal-theme.spec.ts` 5 例通过（两版一致）；typecheck/变体门禁通过；打包产物 client bundle 含 `documentTerminalTheme`。视觉确认需在有交互桌面的机器上进行（本会话无前台窗口，无法注入点击/键盘）。

### 23 项目独立改名（Shell Desktop）
- 目标（用户）：整套独立为开源项目，剥离 dsh-desktop；新仓库 `https://github.com/Alexliwenhao/shell-desktop`；包名与 appId 全部替换；保留 `deepseek-harness` 技术归属。
- 范围：文本层 352 个文件 / 约 2200 处 + 仓库 slug 18 个文件 / 58 处（旧 slug 是 `deepseek-harness-desktop`，不是 `dsh-desktop`）；目录 `dsh-plugin-desktop/` → `shell-desktop/`、`dsh-plugin-desktop-beta/` → `shell-desktop-beta/`；`yarn install` 刷新 lockfile 与 patch。
- 改名清单：包名/bin（`shell-desktop`、`shell-desktop-beta`）、appId（`com.shelldesktop.app` / `.beta`）、本地窗口 session partition（`shell-desktop-*` + `local-window-policy` 正则）、渲染器访问头（`x-shell-desktop-renderer`）、设置命名空间（`shell-desktop` / `shell-desktop-notifications`）、profile patch row 名、CI/脚本/文档/README/PRIVACY/issue 模板/upstream.json。
- 有意保留：`DSH_DESKTOP_*`/`__DSH_DESKTOP_*` 环境变量与桥接全局、`X-DSH-Desktop-*` 请求头、`DSH-Desktop-*` 产物名、`dsh-community-market`/`dsh-community-fabric` 包名、`dshdesktop.cn` 服务地址（属旧官方服务）、`deepseek-harness`/`DeepSeek Harness`/`@deepseek-ai/*`/`@agents-anywhere/*`、`.agents/notes/**` 与 `docs/evidence/**` 历史记录、`_deprecated/**`。
- 连带修复（改名暴露的既有问题）：① 托盘「窗口模式」子菜单在上一轮改动中丢失 → 恢复并加入 `aishell` 模式；② 桌面设置页（`settings.section`/`settings.action`）早前被有意移除 → 相关测试改为按现状断言；③ `installBrandMark` 需要 client logger 且会多注册一个槽位 → 客户端 spec 补 logger 并按名字筛选注册；④ 本地窗口 partition 前缀统一，policy 正则同步。
- 验证：stable 全量 1373 例 / beta 全量 — 失败数 20 / 19，**逐条对照 HEAD 基线 worktree（`git worktree add` + 依赖 junction）确认全部为 Windows 平台预存失败**（`module-resolution` 用 POSIX `file:///tmp` URL、`compatibility-shell` 用正斜杠正则、pnpm PATH 断言、NSIS 产物依赖等），无改名引入的失败；`check:desktop-variants`/`check:vendored-runtime`/`check:architecture`/`verify-layout`/两包 typecheck 均通过。

## 已知未完成 / 待确认

- #15 需要人工确认体验（点“新建会话”应出现空白新对话，且左栏仍归在该主机分组下）。
- 「选择目录…」在 AI Shell 下走的是 Desktop 原生选择器（Host 校验路径）；原生弹窗是否按预期出现尚未截图确认。
- #22 深色终端修复需人工确认：打开终端 → 设置→外观 切浅色/深色，终端文字应始终可读。
- 改名后的待办：① 桌面设置页（模式/材质/市场通知/浏览器访问）在早前 AI Shell 改动中已被移除，目前只有托盘能切窗口模式——浏览器访问、通知、材质暂无 UI 入口，需要产品决策是否恢复该页；② `dshdesktop.cn` 更新服务仍是旧官方地址，独立项目需自建或关闭（代码里的请求地址保留原值以保持功能可用）；③ `.agents/notes/**`、`docs/evidence/**` 保留旧名（历史记录），如需一并改名请另行确认；④ 本机开发工作目录仍叫 `dsh-desktop`，重命名目录/推送新仓库由你完成。
- 打包产物为未签名安装包：新机器首启可能出现 SmartScreen「未知发布者」。
- 本机 `~/.dsh/settings.yaml` 的 `ui-theme.preference` 目前为 `dark`（排查问题时所改），可自行切回 `system`。
