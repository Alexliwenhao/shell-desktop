import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from '../src/client/ConfirmDialog.tsx'

describe('ConfirmDialog', () => {
  it('renders an accessible modal card with both actions', () => {
    const markup = renderToStaticMarkup(createElement(ConfirmDialog, {
      title: '删除会话',
      body: '删除「Deploy plan」？该操作不可撤销。',
      confirmLabel: '删除',
      cancelLabel: '取消',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    }))

    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
    expect(markup).toContain('data-aishell-confirm=""')
    expect(markup).toContain('删除会话')
    expect(markup).toContain('删除「Deploy plan」？该操作不可撤销。')
    expect(markup).toContain('dshAishellDangerAction')
    expect(markup).toContain('>删除</button>')
    expect(markup).toContain('>取消</button>')
  })

  it('omits the body when none is given', () => {
    const markup = renderToStaticMarkup(createElement(ConfirmDialog, {
      title: 't',
      confirmLabel: 'ok',
      cancelLabel: 'no',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    }))

    expect(markup).not.toContain('dshAishellDialogBody')
  })

  it('disables both actions while busy', () => {
    const markup = renderToStaticMarkup(createElement(ConfirmDialog, {
      title: 't',
      body: 'b',
      confirmLabel: 'ok',
      cancelLabel: 'no',
      busy: true,
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    }))

    expect((markup.match(/disabled/g) ?? []).length).toBe(2)
  })
})
