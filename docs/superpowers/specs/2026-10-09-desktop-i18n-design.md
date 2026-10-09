# AI Shell Desktop 国际化（i18n）设计

日期：2026-10-09
分支：`feat/i18n`
状态：已获批准，正在实施

## 目标

应用内提供 8 种语言的完整界面切换：English（默认）、中文、繁體中文、日本語、한국어、Español、Français、Deutsch。
语言选项出现在设置 → 通用 → 语言（上游既有语言行，自动列出已注册语言）。切换即时生效，无需重启。
默认英文：从未选择过语言时显示英文，用户手动选择后永久记住；已存储过选择的老用户不受影响。

## 背景与现状

- 应用界面绝大部分来自 pinned 上游 DSH Web 客户端（约 36 个命名空间，中/英双语词典），桌面自有文案约占少数：
  - 客户端 `desktop.settings` 命名空间（约 176 条）。
  - 原生主进程词典：托盘、应用菜单、原生弹窗、恢复窗口、通知等（约 300 条，类型为 `DesktopLocale = 'zh' | 'en'`）。
- 上游 `@deepseek-ai/dsh-client-locale` 提供语言服务：
  - 内置 `zh`/`en`；设置行注册在 `settings.general.item`；偏好持久化在 `locale` 设置命名空间。
  - `ctx.locale.addLanguage({ id, label, fallback })` 允许扩展语言目录；`fallback` 必须已注册且回退链最终到达英文。
  - `ctx.locale.register(ns, locale, dict)` 允许语言包注册任意命名空间词典（单语言非类型化重载）。
  - 查询按回退链在当前命名空间查找，再查 `common` 命名空间，最后显示 key。
- 桌面当前仅把上游偏好收窄为 `zh`/`en`，原生界面无偏好时跟随系统语言。

## 语言目录

| id | 显示名 | 回退 |
| --- | --- | --- |
| `en` | English | —（内置） |
| `zh` | 中文 | en（内置） |
| `zh-Hant` | 繁體中文 | zh → en |
| `ja` | 日本語 | en |
| `ko` | 한국어 | en |
| `es` | Español | en |
| `fr` | Français | en |
| `de` | Deutsch | en |

- `en`/`zh` 为上游内置，桌面不注册其词典（重复注册会抛错）。
- 新增 6 语言由桌面在客户端 `addLanguage` 注册，词典由桌面以语言包形式注册。
- 缺译文按回退链兜底，不崩溃、不显示 key。

## 默认英文策略

- 客户端在绑定 `locale` 设置作用域后，等待快照 `status === 'ready'`：
  - 若 `value.preference` 缺失（从未选择），调用 `ctx.locale.setLocale('en')` 写入一次偏好；不覆盖已有值。
  - 写入失败仅记录日志，保持上游浏览器探测结果。
- 原生主进程：`setLocalePreference(undefined)` → `en`；删除系统语言映射 `desktopLocaleFromLanguageTag()`；`desktopLocalePreference()` 放行 8 个语言 id。
- 启动阶段（Host 未启动、读不到偏好）的恢复/Profile 选择/创建窗口固定英文（已知限制）。
- macOS 应用菜单从“跟随系统语言”改为“跟随已保存偏好（默认英文）”。

## 运行时架构（渲染进程）

新增 `shell-desktop{,-beta}/src/client/locales/`：

- `catalog.ts`：8 种语言的 id/显示名/回退定义（与 `translations/locales.json` 一致）。
- `registry.ts`：`applyDesktopLocalePacks(ctx)`：
  - 为 6 种新语言 `addLanguage`；
  - 注册上游各命名空间词典与 `desktop.settings` 词典；
  - 所有注册挂在 `ctx.effect` 上，卸载/HMR 自动撤销。
- `generated/<locale>.ts`：生成物，每语言一个模块，导出 `{ upstream: Record<ns, Record<key,string>>, desktopSettings: Record<key,string> }`。`desktopSettings` 类型对齐 `DesktopSettingsLocaleKey`，编译期保证完整。
- `installEnglishDefaultLocale`：默认英文写入（见上节）。
- 在 `client/index.ts` 的 `apply()` 中、壳层注册前调用；`inject` 已包含 `locale`。

切换即时生效：上游 locale 服务 republish → 上游界面与桌面组件（`t` 座位）一起刷新；原生界面由 Host `settings/updated` 监听触发重建。

## 翻译数据流水线（单一可信源）

仓库根部 `translations/`：

- `locales.json`：语言目录（id/显示名/回退），生成物与运行时目录的单一来源。
- `upstream/<locale>.json`：按命名空间分组的上游文案（6 种新语言）。
- `desktop/<locale>.json`：`desktop.settings` 文案（6 种新语言；en/zh 保持现有 TS）。
- `GLOSSARY.md`：跨语言术语表（Profile、工作区、会话、插件等），约束翻译一致性。
- `README.md`：新增语言与重新生成的流程；繁體中文由简体经 OpenCC s2t 一次性转换后作为已审校数据提交（不引入运行时依赖）。

脚本（根 `scripts/`，接入 `check:layout`）：

- `sync-desktop-locales.mjs`：
  1. 从 pinned 上游子模块抽取「命名空间 → key」全集与中英原文（命名空间映射表 + 未映射文件报错）；
  2. 校验各语言翻译源覆盖度（缺 key 失败、上游已删 key 失败）；
  3. 生成 `generated/<locale>.ts` 到 `shell-desktop-beta`，并同步到 `shell-desktop`（两变体字节一致）。
- `verify-desktop-locales.mjs`：覆盖度/无过期 key/生成物与翻译源一致；缺失或漂移即失败。
- `desktop-locales.test.mjs`：抽取、合并、生成逻辑单测。

门禁接入：`check:layout` 增加 `check:desktop-locales`（测试 + verify）。上游升级引入新 key 时门禁失败并列出缺口。

## 原生主进程界面

- `DesktopLocale` 扩展为 8 个 id，所有 `Record<DesktopLocale, ...>` 由编译器强制补齐：
  - `tray-locale.ts`（托盘标签、重启确认、诊断隐私、恢复文案）、`native-dialog-copy.ts`、`recovery-copy.ts`、`profile-create-copy.ts`、`notifications.ts`、`update-lifecycle.ts`、`workspace-admission.ts`。
  - `native-menu.ts`：`NativeMenuLocale` 直接用 `DesktopLocale`；删除系统探测。
- 原生 UI 窗口（`native-ui/*`）通过既有 `locale` 属性选取扩展后的词典；compatibility-chrome 引入生成词典。
- `package.json`（两变体）`build.mac.extendInfo.CFBundleLocalizations` 增加 `zh_TW/ja/ko/es/fr/de`。
- 安装器（NSIS）UI 语言不在本次范围。

## 错误处理与边界

- 缺译文 → 回退链；未知语言 id（手工改设置）→ 上游回退到探测值（记录为边界行为）。
- 重复注册 → fail-loud，由单测保证不发生。
- 默认英文写入失败 → 日志告警，不阻塞启动。
- 局域网浏览器在新 Profile 首次访问、桌面从未启动过时可能按浏览器语言显示；桌面启动写入默认后统一为共享偏好。

## 测试与验证

- 单测：语言包注册（6 语言 + 词典 + 可撤销）；默认英文（只写一次/不覆盖已有）；原生词典逐 key 对齐；native-menu 8 语言；相关既有测试更新。
- 生成器单测 + `verify-desktop-locales` 门禁；变体一致性由既有 `check:desktop-variants` 覆盖。
- 手工验证：`corepack yarn dev` 切换 8 种语言，检查设置弹窗、AI Shell 壳层、托盘、原生弹窗、对话界面；补语言切换截图。
- 构建/测试保持 headless 安全；客户端 bundle 预计增大 1–2MB（词典内联打包）。

## 实施分期

1. 流水线 + 运行时注册机制 + 默认英文（en/zh 行为不变，门禁就位）。
2. 桌面自有文案 6 语言（客户端 `desktop.settings` + 原生 8 语言词典）。
3. 上游翻译包按语言分批（zh-Hant → ja → ko → es → fr → de），每批过覆盖度门禁。
4. 测试补齐、文档、变体同步、截图。

## 范围外

- NSIS 安装器 UI 本地化。
- 翻译内容的人工母语审校（本阶段为 AI 生成 + 术语表约束 + 门禁校验）。
- 上游本体修改（子模块只读）。
