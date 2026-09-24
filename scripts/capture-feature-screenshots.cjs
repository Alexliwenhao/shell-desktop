/**
 * Capture the AI-Shell feature screenshots used for product material.
 *
 * The shots follow the end-user flow: open the app, start a session, add a host,
 * work in its terminal, hand evidence to the AI, use plan mode to have the AI
 * propose commands and run one from a card, browse files, review history,
 * configure, switch appearance, and finally the safe-delete interactions.
 *
 * The application must already be running with remote debugging enabled:
 *
 *   shell-desktop/node_modules/electron/dist/electron.exe shell-desktop/lib/main.js \
 *     --remote-debugging-port=9222 \
 *     --disable-backgrounding-occluded-windows --disable-renderer-backgrounding \
 *     --disable-background-timer-throttling
 *
 * Then run:
 *
 *   node scripts/capture-feature-screenshots.cjs
 *
 * Shots land in `docs/screenshots/` in usage order (01–24). Steps are
 * independent: a failing step is reported and the remaining shots still run.
 * Set `SHELL_DESKTOP_ONLY='11,12,13,14'` to re-shoot a subset.
 *
 * Each shot is a CDP page capture. A minimized window paints no compositor
 * frames, so the runner restores the window first (`scripts/capture-window.ps1
 * -RestoreOnly`) and falls back to PrintWindow capture if the compositor
 * still does not produce a frame.
 */

const { execFileSync } = require('node:child_process')
const { mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')
const { chromium } = require('C:/Users/Administrator/.agents/skills/playwright-skill/node_modules/playwright-core')

const CDP = process.env.SHELL_DESKTOP_CDP ?? 'http://127.0.0.1:9222'
const OUT = join(__dirname, '..', 'docs', 'screenshots')
const WINDOW_CAPTURE = join(__dirname, 'capture-window.ps1')
/** Terminal text the capture types; harmless and ASCII. */
const TERMINAL_COMMANDS = ['hostname', 'uname -a']
/** Prompt that makes plan mode answer with command cards. */
const PLAN_PROMPT = '看一下这台机器的磁盘使用情况'

mkdirSync(OUT, { recursive: true })

/**
 * Raise and restore the application window. A minimized or occluded window
 * stops producing compositor frames, which both hangs CDP page captures and
 * blanks out PrintWindow.
 */
const restoreWindow = () => {
  try {
    execFileSync('powershell', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', WINDOW_CAPTURE,
      '-RestoreOnly',
    ], { stdio: ['ignore', 'ignore', 'pipe'] })
  } catch {
    // No window to restore (non-Windows host or headless CDP target).
  }
}

const shot = async (page, name) => {
  const out = join(OUT, name)
  await restoreWindow()
  await page.waitForTimeout(700)
  try {
    const client = await page.context().newCDPSession(page)
    const { data } = await Promise.race([
      client.send('Page.captureScreenshot', { format: 'png', fromSurface: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('capture timed out')), 20000)),
    ])
    writeFileSync(out, Buffer.from(data, 'base64'))
    await client.detach().catch(() => {})
  } catch (error) {
    // PrintWindow still renders the window, at the cost of clipping whatever
    // the screen cuts off.
    process.stdout.write(`  ${name}: compositor capture failed (${error.message}), using window capture\n`)
    execFileSync('powershell', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', WINDOW_CAPTURE,
      '-Out', out,
    ], { stdio: ['ignore', 'ignore', 'pipe'] })
  }
  process.stdout.write(`  saved ${name}\n`)
}

const ONLY = (process.env.SHELL_DESKTOP_ONLY ?? '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)
const step = async (label, run) => {
  const number = label.split(' ')[0]
  if (ONLY.length > 0 && !ONLY.includes(number)) return
  process.stdout.write(`- ${label}\n`)
  try {
    await run()
  } catch (error) {
    process.stdout.write(`  SKIPPED: ${error.message.split('\n')[0]}\n`)
  }
}

;(async () => {
  const browser = await chromium.connectOverCDP(CDP)
  const page = browser.contexts()[0].pages()[0]
  page.setDefaultTimeout(15000)
  const rail = label => page.locator(`[data-aishell-rail-button][aria-label="${label}"]`)
  const panelAction = label => page.locator(`.dshAishellPanelAction:has-text("${label}")`)
  const dialogButton = label => page.locator(`[role="dialog"] button:has-text("${label}")`)
  const settle = (ms = 1200) => page.waitForTimeout(ms)

  /** Close any modal left open by a previous step or run. */
  const dismissModals = async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (await page.locator('[role="dialog"]').count() === 0) return
      const close = page.locator('[role="dialog"] button:has-text("关闭")')
      if (await close.count() > 0) await close.first().click({ timeout: 5000 }).catch(() => {})
      else await page.keyboard.press('Escape')
      await settle(700)
    }
  }

  /** Rail navigation that tolerates a modal left open by an earlier step. */
  const goRail = async label => {
    await dismissModals()
    await rail(label).click({ timeout: 15000 })
  }

  /** Connect the first saved host and wait for its terminal tab. */
  const connectFirstHost = async () => {
    const connect = page.locator('.dshAishellHostRow button[aria-label^="连接"]').first()
    if (await connect.count() === 0) return false
    await connect.click({ timeout: 15000 })
    await settle(6000)
    return true
  }

  /** Close every open terminal tab so the workbench starts clean. */
  const closeAllTerminalTabs = async () => {
    for (let guard = 0; guard < 12; guard += 1) {
      const close = page.locator('.dshAishellTabClose')
      if (await close.count() === 0) return
      await close.first().click({ timeout: 5000 }).catch(() => {})
      await settle(400)
    }
  }

  await restoreWindow()
  await settle(2500)
  await dismissModals()
  await closeAllTerminalTabs()
  // The plan-mode steps need a live terminal, and connecting one switches the
  // conversation panel to that host's session; do it before the new-session
  // step so the plan exchange stays in the empty session.
  if (await page.locator('.dshAishellTab').count() === 0) {
    await goRail('主机')
    await settle(1000)
    await connectFirstHost()
    await settle(4000)
  }

  await step('01 总览：一屏三栏（会话 + 终端 + AI 对话）', async () => {
    await goRail('会话')
    await settle(1500)
    await shot(page, '01-aishell-overview.png')
  })

  await step('02 新建会话（空白对话）', async () => {
    await goRail('会话')
    await settle(1200)
    await panelAction('新会话').click()
    await settle(3000)
    await shot(page, '02-new-session.png')
  })

  await step('03 主机面板：本地终端 / 新建主机 / 已保存主机', async () => {
    await goRail('主机')
    await settle(1500)
    await shot(page, '03-hosts-panel.png')
  })

  await step('04 新建主机表单', async () => {
    await panelAction('新建主机').click()
    await settle(1200)
    await shot(page, '04-host-form.png')
    await panelAction('新建主机').click().catch(() => {})
    await settle(600)
  })

  await step('05 远端终端：连接 SSH 主机后的工作台', async () => {
    await goRail('主机')
    await settle(1000)
    if (!await connectFirstHost()) {
      await panelAction('本地终端').click()
      await settle(4000)
    }
    await shot(page, '05-terminal-remote.png')
  })

  await step('06 终端执行命令并回显', async () => {
    const tabs = page.locator('.dshAishellTab')
    if (await tabs.count() > 0) await tabs.last().click({ timeout: 10000 }).catch(() => {})
    const input = page.locator('[aria-label="Terminal input"]').last()
    await input.click({ timeout: 15000 })
    for (const command of TERMINAL_COMMANDS) {
      await page.keyboard.type(command)
      await page.keyboard.press('Enter')
      await settle(1200)
    }
    await shot(page, '06-terminal-command.png')
  })

  await step('07 终端选中输出（准备交给 AI）', async () => {
    const box = await page.locator('.dshAishellTerminalHost').last().boundingBox()
    if (box === null) throw new Error('terminal host not visible')
    await page.mouse.move(box.x + 12, box.y + 50)
    await page.mouse.down()
    await page.mouse.move(box.x + 440, box.y + 100, { steps: 20 })
    await page.mouse.up()
    await settle(900)
    await shot(page, '07-terminal-selection.png')
  })

  await step('08 引用选中内容到 AI 对话', async () => {
    const quote = page.locator('.dshAishellTerminalQuote')
    if (await quote.count() === 0) throw new Error('quote action not offered for this selection')
    await quote.first().click()
    await settle(1500)
    await shot(page, '08-quote-into-conversation.png')
  })

  await step('09 AI 对话：提问（需要可用的模型网关）', async () => {
    const composer = page.locator('[aria-label^="描述你"]').first()
    await composer.click({ timeout: 15000 })
    await page.keyboard.type('用一句话说明你能帮我做什么')
    await page.keyboard.press('Enter')
    await settle(20000)
    await shot(page, '09-ai-conversation.png')
  })

  await step('10 AI 回答完成（含思考过程与用量）', async () => {
    await settle(30000)
    await shot(page, '10-ai-conversation-settled.png')
  })

  await step('11 计划模式：/plan 指令入口', async () => {
    // Keep the conversation panel on the session the previous step opened: the
    // 主机 rail switches it to that host's session.
    if (await page.locator('.dshAishellTab').count() === 0) {
      throw new Error('no terminal tab is open; connect a host before the plan steps')
    }
    // Plan mode toggles, so a leftover activation from an earlier run leaves
    // the session the wrong way round: leave it first.
    const activeChip = page.locator('button[aria-label*="plan mode 已开启"]')
    if (await activeChip.count() > 0) {
      await activeChip.first().click()
      await settle(2500)
    }
    const composer = page.locator('[aria-label^="描述你"], [aria-label^="发消息"]').first()
    await composer.click({ timeout: 15000 })
    await page.keyboard.press('Control+a')
    await page.keyboard.press('Backspace')
    await page.keyboard.type('/plan')
    await settle(1500)
    await shot(page, '11-plan-mode-entry.png')
  })

  await step('12 计划模式已激活（输入行出现 Plan 标识）', async () => {
    const plan = page.locator('[role="option"]:has-text("plan")').first()
    if (await plan.count() === 0) throw new Error('plan option missing from the slash palette')
    await plan.click({ timeout: 15000 })
    await settle(700)
    await page.keyboard.press('Enter')
    await settle(3000)
    if (await page.locator('button[aria-label*="plan mode 已开启"]').count() === 0) {
      throw new Error('plan chip did not appear')
    }
    await shot(page, '12-plan-mode-active.png')
  })

  await step('13 计划模式：AI 提交待执行命令卡片', async () => {
    const composer = page.locator('[aria-label^="描述你"], [aria-label^="发消息"]').first()
    await composer.click({ timeout: 15000 })
    await page.keyboard.press('Control+a')
    await page.keyboard.press('Backspace')
    await page.keyboard.type(PLAN_PROMPT)
    await page.keyboard.press('Enter')
    // The turn has to reach the proposal tool call; a local gateway answers in
    // well under a minute but slow routes need the extra attempts. Only a card
    // beyond the ones the session already carried counts.
    const before = await page.locator('.dshPlanCommandCard').count()
    let cards = before
    for (let attempt = 0; attempt < 24; attempt += 1) {
      await settle(5000)
      cards = await page.locator('.dshPlanCommandCard').count()
      if (cards > before) break
    }
    if (cards <= before) throw new Error('no command card appeared for the plan prompt')
    await settle(1500)
    await shot(page, '13-plan-command-card.png')
  })

  await step('14 计划模式：手动执行卡片命令（终端回显）', async () => {
    const execute = page.locator('.dshPlanCommandCard:visible .dshPlanCommandRun:visible')
      .filter({ hasText: '执行' })
      .last()
    if (await execute.count() === 0) throw new Error('no command card with an execute button')
    await execute.click({ timeout: 15000 })
    await settle(12000)
    await shot(page, '14-plan-command-executed.png')
  })

  await step('15 文件面板：远端目录（行内无删除按钮）', async () => {
    await goRail('文件')
    await settle(2000)
    if (await page.locator('.dshAishellPanelHint').count() > 0) {
      await goRail('主机')
      await settle(1000)
      await connectFirstHost()
      await goRail('文件')
      await settle(2500)
    }
    await shot(page, '15-file-panel.png')
  })

  await step('16 会话面板：按主机分组的历史会话', async () => {
    await goRail('会话')
    await settle(1500)
    await shot(page, '16-sessions-by-host.png')
  })

  await step('17 设置：通用设置（工作区 / 外观 / 字号）', async () => {
    await panelAction('设置').click()
    await settle(2200)
    await shot(page, '17-settings-general.png')
  })

  await step('18 设置：模型', async () => {
    await dialogButton('模型').click()
    await settle(1800)
    await shot(page, '18-settings-models.png')
  })

  await step('19 深色外观（设置面板）', async () => {
    await dialogButton('通用设置').click()
    await settle(1000)
    await dialogButton('深色').click()
    await settle(1800)
    await shot(page, '19-theme-dark-settings.png')
    await dialogButton('关闭').click()
    await settle(1500)
  })

  await step('20 深色主题总览', async () => {
    await shot(page, '20-theme-dark-overview.png')
  })

  await step('21 深色主题下的终端可读性', async () => {
    await goRail('主机')
    await settle(1000)
    await shot(page, '21-theme-dark-terminal.png')
  })

  await step('22 浅色外观', async () => {
    await goRail('会话')
    await settle(800)
    await panelAction('设置').click()
    await settle(1800)
    await dialogButton('浅色').click()
    await settle(1500)
    await dialogButton('关闭').click()
    await settle(1500)
    await shot(page, '22-theme-light-overview.png')
  })

  await step('23 会话删除的行内二次确认', async () => {
    await goRail('会话')
    await settle(1000)
    for (const header of await page.locator('.dshAishellSessionGroupHeader[aria-expanded="false"]').all()) {
      await header.click({ timeout: 5000 }).catch(() => {})
      await settle(400)
    }
    const remove = page.locator('.dshAishellHostDeleteButton').first()
    if (await remove.count() === 0) throw new Error('no session row with a delete button')
    await remove.click()
    await settle(900)
    await shot(page, '23-session-delete-confirm.png')
    await page.keyboard.press('Escape')
    await settle(500)
  })

  await step('24 主机删除的行内二次确认', async () => {
    await goRail('主机')
    await settle(1200)
    const remove = page.locator('.dshAishellHostDeleteButton').first()
    if (await remove.count() === 0) throw new Error('no host with a delete button')
    await remove.click()
    await settle(900)
    await shot(page, '24-host-delete-confirm.png')
    await page.locator('.dshAishellHostOpen').first().click()
    await settle(500)
  })

  await browser.close()
  process.stdout.write(`\nshots written to ${OUT}\n`)
})().catch(error => { console.error('capture failed:', error.message); process.exit(1) })
