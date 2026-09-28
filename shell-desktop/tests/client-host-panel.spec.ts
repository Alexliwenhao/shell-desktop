// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HostPanel, hostFormFrom, type HostPanelProps } from '../src/client/HostPanel.tsx'
import type { RemoteBridgeApi, RemoteHost } from '../src/client/remote-api.ts'

const HOST: RemoteHost = {
  id: 'h-1',
  name: '生产机',
  host: '10.0.0.8',
  port: 22,
  username: 'root',
  authType: 'password',
  password: 's3cret',
}

declare global {
  // React only batches `act` updates while this flag is set.
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

/** Set an input's value the way a user typing would, reaching React's state. */
function typeInto(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find(button => button.textContent === text)
}

describe('host panel editing', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => { root.unmount() })
    container.remove()
  })

  async function mount(): Promise<{ saveHost: ReturnType<typeof vi.fn> }> {
    const saveHost = vi.fn(async () => [HOST])
    const api = {
      listHosts: vi.fn(async () => [HOST]),
      saveHost,
    } as unknown as RemoteBridgeApi
    const props: HostPanelProps = { api, onOpenHost: vi.fn(), onOpenLocal: vi.fn() }
    await act(async () => { root.render(createElement(HostPanel, props)) })
    return { saveHost }
  }

  async function openEditor(): Promise<void> {
    const edit = container.querySelector<HTMLButtonElement>('button[aria-label="编辑 生产机"]')
    expect(edit).not.toBeNull()
    await act(async () => { edit?.click() })
  }

  it('opens the form prefilled from a saved host, secrets included', async () => {
    await mount()
    await openEditor()

    expect(container.querySelector<HTMLInputElement>('input[placeholder="名称（可选）"]')?.value).toBe('生产机')
    expect(container.querySelector<HTMLInputElement>('input[placeholder="主机地址"]')?.value).toBe('10.0.0.8')
    expect(container.querySelector<HTMLInputElement>('input[placeholder="用户"]')?.value).toBe('root')
    expect(container.querySelector<HTMLInputElement>('input[type="password"]')?.value).toBe('s3cret')
    expect(buttonByText(container, '保存修改')).toBeDefined()
    expect(buttonByText(container, '取消')).toBeDefined()
  })

  it('saves an edit back onto the same host with its credential intact', async () => {
    const { saveHost } = await mount()
    await openEditor()

    const name = container.querySelector<HTMLInputElement>('input[placeholder="名称（可选）"]')
    await act(async () => { if (name !== null) typeInto(name, '生产机 2') })
    await act(async () => { buttonByText(container, '保存修改')?.click() })

    expect(saveHost).toHaveBeenCalledWith(expect.objectContaining({
      id: 'h-1',
      name: '生产机 2',
      host: '10.0.0.8',
      username: 'root',
      authType: 'password',
      password: 's3cret',
    }))
  })

  it('closes the edit form without saving on cancel', async () => {
    const { saveHost } = await mount()
    await openEditor()

    await act(async () => { buttonByText(container, '取消')?.click() })

    expect(saveHost).not.toHaveBeenCalled()
    expect(container.querySelector('input[placeholder="名称（可选）"]')).toBeNull()
  })

  it('maps a saved host into the edit form with key material intact', () => {
    const keyed: RemoteHost = {
      id: HOST.id,
      name: HOST.name,
      host: HOST.host,
      port: HOST.port,
      username: HOST.username,
      authType: 'privateKey',
      privateKeyPath: 'C:/keys/id_ed25519',
      passphrase: 'p-a-s-s',
    }

    expect(hostFormFrom(keyed)).toMatchObject({
      authType: 'privateKey',
      privateKeyPath: 'C:/keys/id_ed25519',
      passphrase: 'p-a-s-s',
      password: '',
    })
  })
})
