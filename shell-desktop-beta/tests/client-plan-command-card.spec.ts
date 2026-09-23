import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlanCommandCard } from '../src/client/PlanCommandCard.tsx'

const t = (key: string): string => key

function render(block: unknown): string {
  return renderToStaticMarkup(createElement(PlanCommandCard, { block, t } as never))
}

describe('PlanCommandCard', () => {
  it('renders the command in a code box with an execute button', () => {
    const markup = render({ argsRaw: JSON.stringify({ command: 'df -h', description: '检查磁盘' }) })

    expect(markup).toContain('dshPlanCommandCode')
    expect(markup).toContain('df -h')
    expect(markup).toContain('检查磁盘')
    expect(markup).toContain('aishellPlanCommandTitle')
    expect(markup).toContain('aishellPlanCommandRun')
    expect(markup).toContain('dshPlanCommandRun')
  })

  it('omits the description when the proposal has none', () => {
    const markup = render({ argsRaw: JSON.stringify({ command: 'uptime' }) })
    expect(markup).not.toContain('dshPlanCommandDesc')
  })

  it('shows the invalid hint when the proposal has no usable command', () => {
    const markup = render({ argsRaw: 'not json' })
    expect(markup).toContain('aishellPlanCommandInvalid')
    expect(markup).not.toContain('dshPlanCommandCode')
  })
})
