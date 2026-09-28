import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FilePanel, type FilePanelProps } from '../src/client/FilePanel.tsx'
import type { RemoteBridgeApi } from '../src/client/remote-api.ts'

/** Render the panel for one host (or without a host) as static markup. */
function render(hostId?: string): string {
  const api = {} as unknown as RemoteBridgeApi
  const props: FilePanelProps = { api, ...(hostId === undefined ? {} : { hostId }) }
  return renderToStaticMarkup(createElement(FilePanel, props))
}

describe('file panel', () => {
  it('offers an upload entry beside the directory actions', () => {
    const markup = render('h-1')

    expect(markup).toContain('上传文件')
    expect(markup).toContain('新建目录')
    expect(markup).toContain('远程路径')
    expect(markup).toContain('type="file"')
  })

  it('explains how to attach a host while none is active', () => {
    const markup = render()

    expect(markup).toContain('文件面板跟随当前连接的机器')
    expect(markup).not.toContain('上传文件')
  })
})
