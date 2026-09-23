/**
 * Capture the AI-Shell feature screenshots used for product material.
 *
 * The application must already be running with remote debugging enabled:
 *
 *   shell-desktop/node_modules/electron/dist/electron.exe shell-desktop/lib/main.js --remote-debugging-port=9222
 *
 * Then run:
 *
 *   node scripts/capture-feature-screenshots.cjs
 *
 * Shots land in `docs/screenshots/` in numbered order. Steps are independent:
 * a failing step is reported and the remaining shots still run.
 */

const { mkdirSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')
const { chromium } = require('C:/Users/Administrator/.agents/skills/playwright-skill/node_modules/playwright-core')

const CDP = process.env.SHELL_DESKTOP_CDP ?? 'http://127.0.0.1:9222'
const OUT = join(__dirname, '..', 'docs', 'screenshots')
/** Terminal text the capture types; keep it harmless and ASCII. */
const TERMINAL_COMMAND = 'hostname'
/** Interaction timeout: a missing element should not stall the whole run. */
const ACTION_TIMEOUT = 8000

mkdirSync(OUT, { recursive: true })

const shot = async (page, name) => {
  await page.bringToFront()
  const client = await page.context().newCDPSession(page)
  const { data } = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  writeFileSync(join(OUT, name), Buffer.from(data, 'base64'))
  await client.detach().catch(() => {})
  process.stdout.write(`  saved ${name}\n`)
}

const step = async (label, run) => {
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
  page.setDefaultTimeout(ACTION_TIMEOUT)
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

  await settle(2500)
  await dismissModals()

  await step('01 AI-Shell 总览（会话 + 工作台 + AI 对话）', async () => {
    await goRail('会话')
    await settle(1500)
    await shot(page, '01-aishell-overview.png')
  })

  await step('02 会话面板：按主机分组的历史会话', async () => {
    await goRail('会话')
    await settle(1200)
    await shot(page, '02-sessions-by-host.png')
  })

  await step('03 新建会话（空白对话）', async () => {
    await panelAction('新会话').click()
    await settle(3000)
    await shot(page, '03-new-session.png')
  })

  await step('04 主机面板：本地终端 / 新建主机 / 已保存主机', async () => {
    await goRail('主机')
    await settle(1500)
    await shot(page, '04-hosts-panel.png')
  })

  await step('05 新建主机表单', async () => {
    await panelAction('新建主机').click()
    await settle(1200)
    await shot(page, '05-host-form.png')
    await panelAction('新建主机').click().catch(() => {})
    await settle(600)
  })

  await step('06 文件面板：远端目录（行内无删除按钮）', async () => {
    await goRail('文件')
    await settle(2000)
    // Without a connected host the panel only shows its guidance hint; connect
    // the first saved host so the shot shows a real remote directory.
    if (await page.locator('.dshAishellPanelHint').count() > 0) {
      await goRail('主机')
      await settle(1000)
      const connect = page.locator('.dshAishellHostRow button[aria-label^="连接"]').first()
      if (await connect.count() > 0) await connect.click({ timeout: 10000 })
      await settle(5000)
      await goRail('文件')
      await settle(2500)
    }
    await shot(page, '06-file-panel.png')
  })

  await step('07 本地终端工作台', async () => {
    await goRail('主机')
    await settle(1000)
    await panelAction('本地终端').click()
    await settle(4000)
    await shot(page, '07-terminal-local.png')
  })

  await step('08 终端执行命令并回显', async () => {
    const tabs = page.locator('.dshAishellTerminalTab')
    if (await tabs.count() > 0) await tabs.last().click({ timeout: 10000 }).catch(() => {})
    const input = page.locator('[aria-label="Terminal input"]').last()
    await input.click({ timeout: 10000 })
    await page.keyboard.type(TERMINAL_COMMAND)
    await page.keyboard.press('Enter')
    await settle(3000)
    await shot(page, '08-terminal-command.png')
  })

  await step('09 终端选中文本 + 引用到 AI 对话', async () => {
    const box = await page.locator('.dshAishellTerminalHost').last().boundingBox()
    if (box === null) throw new Error('terminal host not visible')
    await page.mouse.move(box.x + 12, box.y + 70)
    await page.mouse.down()
    await page.mouse.move(box.x + 340, box.y + 70, { steps: 12 })
    await page.mouse.up()
    await settle(900)
    await shot(page, '09-terminal-selection.png')
    const quote = page.locator('.dshAishellTerminalQuote')
    if (await quote.count() === 0) throw new Error('quote action not offered for this selection')
    await quote.first().click()
    await settle(1500)
    await shot(page, '10-quote-into-conversation.png')
  })

  await step('11 AI 对话（需要可用的模型网关）', async () => {
    const composer = page.locator('[aria-label^="描述你"]').first()
    await composer.click()
    await page.keyboard.type('用一句话说明你能帮我做什么')
    await page.keyboard.press('Enter')
    await settle(20000)
    await shot(page, '11-ai-conversation.png')
    await settle(30000)
    await shot(page, '12-ai-conversation-settled.png')
  })

  await step('13 设置：通用设置（工作区 / 外观 / 字号）', async () => {
    await dismissModals()
    await goRail('会话')
    await settle(800)
    await panelAction('设置').click()
    await settle(2200)
    await shot(page, '13-settings-general.png')
  })

  await step('14 设置：模型', async () => {
    await dialogButton('模型').click()
    await settle(1800)
    await shot(page, '14-settings-models.png')
  })

  await step('15 深色外观（设置面板）', async () => {
    await dialogButton('通用设置').click()
    await settle(1000)
    await dialogButton('深色').click()
    await settle(1800)
    await shot(page, '15-theme-dark-settings.png')
    await dialogButton('关闭').click()
    await settle(1500)
  })

  await step('16 深色主题总览', async () => {
    await shot(page, '16-theme-dark-overview.png')
  })

  await step('17 深色主题下的终端可读性', async () => {
    await goRail('主机')
    await settle(1000)
    await shot(page, '17-theme-dark-terminal.png')
  })

  await step('18 浅色外观', async () => {
    await goRail('会话')
    await settle(800)
    await panelAction('设置').click()
    await settle(1800)
    await dialogButton('浅色').click()
    await settle(1500)
    await dialogButton('关闭').click()
    await settle(1500)
    await shot(page, '18-theme-light-overview.png')
  })

  await step('19 会话删除的行内二次确认', async () => {
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
    await shot(page, '19-session-delete-confirm.png')
    await page.keyboard.press('Escape')
    await settle(500)
  })

  await step('20 主机删除的行内二次确认', async () => {
    await goRail('主机')
    await settle(1200)
    const remove = page.locator('.dshAishellHostDeleteButton').first()
    if (await remove.count() === 0) throw new Error('no host with a delete button')
    await remove.click()
    await settle(900)
    await shot(page, '20-host-delete-confirm.png')
    await page.locator('.dshAishellHostOpen').first().click()
    await settle(500)
  })

  await browser.close()
  process.stdout.write(`\nshots written to ${OUT}\n`)
})().catch(error => { console.error('capture failed:', error.message); process.exit(1) })
