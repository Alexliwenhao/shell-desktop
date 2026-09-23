/**
 * SFTP browser for the AI-Shell left panel: a remote path bar, the directory
 * listing of the session host, and a text preview for readable files.
 */

import { useCallback, useEffect, useState } from 'react'
import { ArrowUp, FileText, Folder, FolderPlus, RefreshCw, Trash2, X } from 'lucide-react'
import type { RemoteBridgeApi, RemoteFileItem } from './remote-api.ts'

/** Remote file browser props. */
export interface FilePanelProps {
  /** Remote bridge facade. */
  readonly api: RemoteBridgeApi
  /** Host whose filesystem is browsed; absent when no SSH session is active. */
  readonly hostId?: string
}

function parentPath(path: string): string {
  if (path === '/' || path === '.' || path === '') return '/'
  const trimmed = path.replace(/\/+$/, '')
  const index = trimmed.lastIndexOf('/')
  return index <= 0 ? '/' : trimmed.slice(0, index)
}

function formatSize(size: number | null): string {
  if (size === null) return ''
  if (size < 1024) return `${String(size)} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

/** Path bar plus directory listing for the active SSH host. */
export function FilePanel({ api, hostId }: FilePanelProps) {
  // The browser opens at the remote filesystem root; navigating up from any
  // directory also lands there, so `.` never appears in the path bar.
  const [cwd, setCwd] = useState('/')
  const [draft, setDraft] = useState('/')
  const [items, setItems] = useState<readonly RemoteFileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [preview, setPreview] = useState<{ name: string; content: string; truncated: boolean }>()

  const load = useCallback(async (path: string): Promise<void> => {
    if (hostId === undefined) return
    setLoading(true)
    try {
      const result = await api.sftpList(hostId, path)
      setItems(result.items)
      setCwd(result.path)
      setDraft(result.path)
      setError(undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLoading(false)
    }
  }, [api, hostId])

  useEffect(() => {
    setPreview(undefined)
    setItems([])
    setCwd('/')
    setDraft('/')
    void load('/')
  }, [load])

  if (hostId === undefined) {
    return (
      <div className="dshAishellPanelBody">
        <p className="dshAishellPanelHint">文件面板跟随当前连接的机器。先在“主机”里连接一台 SSH 主机，再回到这里浏览远程目录。</p>
      </div>
    )
  }

  const openEntry = (item: RemoteFileItem): void => {
    if (item.directory) {
      void load(item.path)
      return
    }
    void api.sftpRead(hostId, item.path)
      .then(result => { setPreview({ name: item.name, content: result.content, truncated: result.truncated }) })
      .catch(cause => { setError(cause instanceof Error ? cause.message : String(cause)) })
  }

  const remove = (item: RemoteFileItem): void => {
    void api.sftpDelete(hostId, item.path)
      .then(() => load(cwd))
      .catch(cause => { setError(cause instanceof Error ? cause.message : String(cause)) })
  }

  const mkdir = (): void => {
    const name = window.prompt('新建目录名称')
    if (name === null || name.trim() === '') return
    const base = cwd === '.' ? '' : cwd.replace(/\/+$/, '')
    void api.sftpMkdir(hostId, `${base}/${name.trim()}`)
      .then(() => load(cwd))
      .catch(cause => { setError(cause instanceof Error ? cause.message : String(cause)) })
  }

  return (
    <div className="dshAishellPanelBody dshAishellFilePane">
      <div className="dshAishellPathBar">
        <button type="button" className="dshAishellHostIconButton" aria-label="上级目录" onClick={() => { void load(parentPath(cwd)) }}>
          <ArrowUp aria-hidden="true" />
        </button>
        <input
          className="dshAishellField dshAishellPathField"
          value={draft}
          spellCheck={false}
          aria-label="远程路径"
          onChange={event => { setDraft(event.target.value) }}
          onKeyDown={event => { if (event.key === 'Enter') void load(draft) }}
        />
        <button type="button" className="dshAishellHostIconButton" aria-label="刷新" disabled={loading} onClick={() => { void load(cwd) }}>
          <RefreshCw aria-hidden="true" />
        </button>
        <button type="button" className="dshAishellHostIconButton" aria-label="新建目录" onClick={mkdir}>
          <FolderPlus aria-hidden="true" />
        </button>
      </div>

      <div className="dshAishellFileList">
        {items.length === 0 && !loading && <p className="dshAishellPanelHint">目录为空。</p>}
        {items.map(item => (
          <div className="dshAishellFileRow" key={item.path}>
            <span className="dshAishellHostGlyph" aria-hidden="true">{item.directory ? <Folder /> : <FileText />}</span>
            <button type="button" className="dshAishellHostOpen" title={item.path} onClick={() => { openEntry(item) }}>
              <strong>{item.name}</strong>
              <small>{item.directory ? '目录' : formatSize(item.size)}</small>
            </button>
            <button type="button" className="dshAishellHostIconButton" aria-label={`删除 ${item.name}`} onClick={() => { remove(item) }}>
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {preview !== undefined && (
        <div className="dshAishellFilePreview">
          <div className="dshAishellFilePreviewHeader">
            <strong>{preview.name}</strong>
            <button type="button" className="dshAishellHostIconButton" aria-label="关闭预览" onClick={() => { setPreview(undefined) }}>
              <X aria-hidden="true" />
            </button>
          </div>
          <pre>{preview.content}{preview.truncated ? '\n…（已截断）' : ''}</pre>
        </div>
      )}

      {error !== undefined && <p className="dshAishellPanelError" role="alert">{error}</p>}
    </div>
  )
}
