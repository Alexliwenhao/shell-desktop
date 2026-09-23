/** Saved-host manager for the Desktop AI-Shell left panel. */

import { useCallback, useEffect, useState } from 'react'
import { PlugZap, Plus, Server, TerminalSquare, Trash2 } from 'lucide-react'
import type { RemoteBridgeApi, RemoteHost } from './remote-api.ts'

/** Left-panel host manager props. */
export interface HostPanelProps {
  /** Remote bridge facade. */
  readonly api: RemoteBridgeApi
  /** Open a terminal session on the saved host. */
  readonly onOpenHost: (host: RemoteHost) => void
  /** Open a session on the local machine. */
  readonly onOpenLocal: () => void
}

interface HostFormState {
  name: string
  host: string
  port: string
  username: string
  authType: 'password' | 'privateKey'
  password: string
  privateKeyPath: string
}

const EMPTY_FORM: HostFormState = {
  name: '', host: '', port: '22', username: '', authType: 'password', password: '', privateKeyPath: '',
}

/** Host list with a compact create form; sessions open in the terminal workspace. */
export function HostPanel({ api, onOpenHost, onOpenLocal }: HostPanelProps) {
  const [hosts, setHosts] = useState<readonly RemoteHost[]>([])
  const [form, setForm] = useState<HostFormState>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setHosts(await api.listHosts())
      setError(undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [api])

  useEffect(() => { void refresh() }, [refresh])

  const save = useCallback(async (): Promise<void> => {
    setBusy(true)
    try {
      const port = Number.parseInt(form.port, 10)
      await api.saveHost({
        id: '',
        name: form.name,
        host: form.host,
        port: Number.isFinite(port) ? port : 22,
        username: form.username,
        authType: form.authType,
        ...(form.authType === 'password' ? { password: form.password } : { privateKeyPath: form.privateKeyPath }),
      })
      setForm(EMPTY_FORM)
      setCreating(false)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [api, form, refresh])

  const remove = useCallback(async (id: string): Promise<void> => {
    setBusy(true)
    try {
      await api.removeHost(id)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [api, refresh])

  return (
    <div className="dshAishellPanelBody" data-aishell-panel-body="hosts">
      <div className="dshAishellPanelActions">
        <button type="button" className="dshAishellPanelAction" onClick={onOpenLocal}>
          <TerminalSquare aria-hidden="true" />
          <span>本地终端</span>
        </button>
        <button
          type="button"
          className="dshAishellPanelAction"
          data-ghost=""
          onClick={() => { setCreating(value => !value) }}
        >
          <Plus aria-hidden="true" />
          <span>新建主机</span>
        </button>
      </div>

      {creating && (
        <div className="dshAishellHostForm">
          <input className="dshAishellField" placeholder="名称（可选）" value={form.name} onChange={event => { setForm({ ...form, name: event.target.value }) }} />
          <input className="dshAishellField" placeholder="主机地址" value={form.host} onChange={event => { setForm({ ...form, host: event.target.value }) }} />
          <div className="dshAishellFieldRow">
            <input className="dshAishellField" placeholder="用户" value={form.username} onChange={event => { setForm({ ...form, username: event.target.value }) }} />
            <input className="dshAishellField dshAishellFieldPort" placeholder="22" value={form.port} onChange={event => { setForm({ ...form, port: event.target.value }) }} />
          </div>
          <select
            className="dshAishellField"
            value={form.authType}
            onChange={event => { setForm({ ...form, authType: event.target.value === 'privateKey' ? 'privateKey' : 'password' }) }}
          >
            <option value="password">密码认证</option>
            <option value="privateKey">私钥认证</option>
          </select>
          {form.authType === 'password'
            ? <input className="dshAishellField" type="password" placeholder="密码" value={form.password} onChange={event => { setForm({ ...form, password: event.target.value }) }} />
            : <input className="dshAishellField" placeholder="私钥文件路径" value={form.privateKeyPath} onChange={event => { setForm({ ...form, privateKeyPath: event.target.value }) }} />}
          <button
            type="button"
            className="dshAishellPanelAction dshAishellPrimaryAction"
            disabled={busy || form.host.trim() === '' || form.username.trim() === ''}
            onClick={() => { void save() }}
          >
            保存主机
          </button>
        </div>
      )}

      <div className="dshAishellHostList">
        {hosts.length === 0 && <p className="dshAishellPanelHint">还没有主机。添加 SSH 主机后可在中央工作台打开终端，并让 AI 在同一台主机上执行。</p>}
        {hosts.map(host => (
          <div className="dshAishellHostRow" key={host.id}>
            <span className="dshAishellHostGlyph" aria-hidden="true"><Server /></span>
            <button type="button" className="dshAishellHostOpen" onClick={() => { onOpenHost(host) }}>
              <strong>{host.name}</strong>
              <small>{host.username}@{host.host}:{String(host.port)}</small>
            </button>
            <button type="button" className="dshAishellHostIconButton" aria-label={`删除 ${host.name}`} disabled={busy} onClick={() => { void remove(host.id) }}>
              <Trash2 aria-hidden="true" />
            </button>
            <button type="button" className="dshAishellHostIconButton" aria-label={`连接 ${host.name}`} disabled={busy} onClick={() => { onOpenHost(host) }}>
              <PlugZap aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {error !== undefined && <p className="dshAishellPanelError" role="alert">{error}</p>}
    </div>
  )
}
