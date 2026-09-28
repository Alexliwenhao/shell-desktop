/** Saved-host manager for the Desktop AI-Shell left panel. */

import { useCallback, useEffect, useState } from 'react'
import { Check, Pencil, PlugZap, Plus, Server, TerminalSquare, Trash2 } from 'lucide-react'
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
  /** Carried over from an edited host; there is no input for it yet. */
  passphrase: string
}

const EMPTY_FORM: HostFormState = {
  name: '', host: '', port: '22', username: '', authType: 'password', password: '', privateKeyPath: '', passphrase: '',
}

/**
 * Form state one already-saved host is edited through. Every field is filled
 * from the record — secrets included — so saving an edit cannot drop the
 * credential the host was created with.
 * @param host - saved host to edit.
 * @returns the form state to populate for that host.
 */
export function hostFormFrom(host: RemoteHost): HostFormState {
  return {
    name: host.name,
    host: host.host,
    port: String(host.port),
    username: host.username,
    authType: host.authType,
    password: host.password ?? '',
    privateKeyPath: host.privateKeyPath ?? '',
    passphrase: host.passphrase ?? '',
  }
}

/** Host list with a compact create form; sessions open in the terminal workspace. */
export function HostPanel({ api, onOpenHost, onOpenLocal }: HostPanelProps) {
  const [hosts, setHosts] = useState<readonly RemoteHost[]>([])
  const [form, setForm] = useState<HostFormState>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  /** Saved host being edited; the form saves back onto this id. */
  const [editingId, setEditingId] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  /** Host armed for removal: the button turns into a check and confirms on the next click. */
  const [confirmingId, setConfirmingId] = useState<string>()

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
        id: editingId ?? '',
        name: form.name,
        host: form.host,
        port: Number.isFinite(port) ? port : 22,
        username: form.username,
        authType: form.authType,
        ...(form.authType === 'password' ? { password: form.password } : { privateKeyPath: form.privateKeyPath }),
        ...(form.passphrase === '' ? {} : { passphrase: form.passphrase }),
      })
      setForm(EMPTY_FORM)
      setCreating(false)
      setEditingId(undefined)
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [api, editingId, form, refresh])

  /** Move one saved host into the form for editing. */
  const edit = useCallback((host: RemoteHost): void => {
    setConfirmingId(undefined)
    setCreating(false)
    setEditingId(host.id)
    setForm(hostFormFrom(host))
  }, [])

  /** Close the edit form without touching the saved host. */
  const cancelEdit = useCallback((): void => {
    setEditingId(undefined)
    setForm(EMPTY_FORM)
  }, [])

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
          onClick={() => {
            setEditingId(undefined)
            setForm(EMPTY_FORM)
            setCreating(value => !value)
          }}
        >
          <Plus aria-hidden="true" />
          <span>新建主机</span>
        </button>
      </div>

      {(creating || editingId !== undefined) && (
        <div className="dshAishellHostForm">
          {editingId !== undefined && <p className="dshAishellPanelHint">编辑已保存的主机：改完保存即覆盖原配置</p>}
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
          <div className="dshAishellFieldRow">
            <button
              type="button"
              className="dshAishellPanelAction dshAishellPrimaryAction"
              disabled={busy || form.host.trim() === '' || form.username.trim() === ''}
              onClick={() => { void save() }}
            >
              {editingId === undefined ? '保存主机' : '保存修改'}
            </button>
            {editingId !== undefined && (
              <button type="button" className="dshAishellPanelAction" disabled={busy} onClick={cancelEdit}>
                取消
              </button>
            )}
          </div>
        </div>
      )}

      <div className="dshAishellHostList">
        {hosts.length === 0 && <p className="dshAishellPanelHint">还没有主机。添加 SSH 主机后可在中央工作台打开终端，并让 AI 在同一台主机上执行。</p>}
        {hosts.map(host => {
          const confirming = confirmingId === host.id
          return (
          <div className="dshAishellHostRow" key={host.id}>
            <span className="dshAishellHostGlyph" aria-hidden="true"><Server /></span>
            <button
              type="button"
              className="dshAishellHostOpen"
              onClick={() => {
                setConfirmingId(undefined)
                onOpenHost(host)
              }}
            >
              <strong>{host.name}</strong>
              <small>{host.username}@{host.host}:{String(host.port)}</small>
            </button>
            <button
              type="button"
              className="dshAishellHostIconButton"
              title={`编辑 ${host.name}`}
              aria-label={`编辑 ${host.name}`}
              disabled={busy}
              onClick={() => { edit(host) }}
            >
              <Pencil aria-hidden="true" />
            </button>
            <button
              type="button"
              className="dshAishellHostIconButton dshAishellHostDeleteButton"
              data-confirm={confirming || undefined}
              title={confirming ? '再点一次确认删除' : `删除 ${host.name}`}
              aria-label={confirming ? `确认删除 ${host.name}` : `删除 ${host.name}`}
              disabled={busy}
              onClick={() => {
                if (!confirming) {
                  setConfirmingId(host.id)
                  return
                }
                setConfirmingId(undefined)
                void remove(host.id)
              }}
            >
              {confirming ? <Check aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
            </button>
            <button type="button" className="dshAishellHostIconButton" aria-label={`连接 ${host.name}`} disabled={busy} onClick={() => { onOpenHost(host) }}>
              <PlugZap aria-hidden="true" />
            </button>
          </div>
          )
        })}
      </div>

      {error !== undefined && <p className="dshAishellPanelError" role="alert">{error}</p>}
    </div>
  )
}
