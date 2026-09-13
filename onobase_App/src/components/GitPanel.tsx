import { useState, useCallback, useEffect } from 'react'

interface GitStatusData {
  modified: string[]
  created: string[]
  deleted: string[]
  not_added: string[]
  staged: string[]
}

interface GitLogEntry {
  hash: string
  date: string
  message: string
  author_name: string
}

interface Props {
  onClose(): void
}

export default function GitPanel({ onClose }: Props) {
  const [repoPath, setRepoPath] = useState<string | null>(null)
  const [status, setStatus] = useState<GitStatusData | null>(null)
  const [log, setLog] = useState<GitLogEntry[]>([])
  const [commitMsg, setCommitMsg] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'changes' | 'history'>('changes')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const openRepo = useCallback(async () => {
    const res = await window.electronAPI.gitOpenRepo()
    if (res.ok) {
      setRepoPath(res.path)
      setError(null)
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!repoPath) return
    setLoading(true); setError(null)
    try {
      const [statusRes, logRes] = await Promise.all([
        window.electronAPI.gitStatus(repoPath),
        window.electronAPI.gitLog(repoPath),
      ])
      if (statusRes.ok) {
        setStatus(statusRes.status)
        // Auto-stage all changed files
        const all = [...statusRes.status.modified, ...statusRes.status.created, ...statusRes.status.deleted, ...statusRes.status.not_added]
        setSelectedFiles(new Set(all))
      } else { setError(statusRes.error) }
      if (logRes.ok) setLog(logRes.log)
    } finally {
      setLoading(false)
    }
  }, [repoPath])

  useEffect(() => { if (repoPath) refresh() }, [repoPath, refresh])

  const commit = useCallback(async () => {
    if (!repoPath || !commitMsg.trim() || selectedFiles.size === 0) return
    setLoading(true); setError(null); setSuccess(null)
    const res = await window.electronAPI.gitCommit({
      repoPath, message: commitMsg.trim(),
      files: [...selectedFiles],
    })
    setLoading(false)
    if (res.ok) {
      setCommitMsg('')
      setSuccess('Committed successfully')
      setTimeout(() => setSuccess(null), 2000)
      refresh()
    } else {
      setError(res.error ?? 'Commit failed')
    }
  }, [repoPath, commitMsg, selectedFiles, refresh])

  const allFiles = status
    ? [
        ...status.modified.map(f => ({ file: f, status: 'M' })),
        ...status.created.map(f => ({ file: f, status: 'A' })),
        ...status.deleted.map(f => ({ file: f, status: 'D' })),
        ...status.not_added.map(f => ({ file: f, status: '?' })),
      ]
    : []

  const tabBtn = (t: 'changes' | 'history'): React.CSSProperties => ({
    background: 'transparent', border: 'none',
    borderBottom: activeTab === t ? '2px solid #00E5B0' : '2px solid transparent',
    color: activeTab === t ? '#00E5B0' : '#484F58',
    padding: '5px 12px', fontSize: 11, cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  })

  const statusColor = (s: string) =>
    s === 'M' ? '#EAB308' : s === 'A' ? '#00E5B0' : s === 'D' ? '#EF4444' : '#8B949E'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: 320, height: '100%',
      background: '#0D1117',
      borderLeft: '1px solid rgba(255,255,255,0.07)',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        height: 38, display: 'flex', alignItems: 'center',
        padding: '0 10px', gap: 8,
        background: '#161B22',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: '#00E5B0', fontFamily: 'var(--font-mono)' }}>⎇</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#C9D1D9', fontFamily: 'var(--font-body)', flex: 1 }}>
          Git
          {repoPath && <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-mono)', marginLeft: 6 }}>{repoPath.split(/[\\/]/).pop()}</span>}
        </span>
        {repoPath && (
          <button onClick={refresh} disabled={loading}
            style={{ background: 'transparent', border: 'none', color: '#484F58', cursor: 'pointer', fontSize: 12, padding: '2px 4px' }}
            title="Refresh">↺</button>
        )}
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none',
          color: '#484F58', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px',
        }}>×</button>
      </div>

      {!repoPath ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 }}>
          <div style={{ fontSize: 11, color: '#484F58', fontFamily: 'var(--font-body)', textAlign: 'center' }}>
            Open a Git repository to view changes and history
          </div>
          <button onClick={openRepo}
            style={{ background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.3)', borderRadius: 5, color: '#00E5B0', padding: '6px 16px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Open Repository
          </button>
        </div>
      ) : (
        <>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
            <button style={tabBtn('changes')} onClick={() => setActiveTab('changes')}>
              Changes{allFiles.length > 0 ? ` (${allFiles.length})` : ''}
            </button>
            <button style={tabBtn('history')} onClick={() => setActiveTab('history')}>
              History{log.length > 0 ? ` (${log.length})` : ''}
            </button>
          </div>

          {error && (
            <div style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 11, fontFamily: 'var(--font-body)', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ padding: '6px 10px', background: 'rgba(0,229,176,0.08)', color: '#00E5B0', fontSize: 11, fontFamily: 'var(--font-body)', borderBottom: '1px solid rgba(0,229,176,0.15)' }}>
              {success}
            </div>
          )}

          {activeTab === 'changes' && (
            <>
              {/* File list */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {allFiles.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#484F58', fontSize: 11, fontFamily: 'var(--font-body)' }}>
                    {loading ? 'Loading…' : 'No changes'}
                  </div>
                ) : allFiles.map(({ file, status: s }) => (
                  <div key={file} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                  }}
                    onClick={() => setSelectedFiles(prev => {
                      const next = new Set(prev)
                      if (next.has(file)) next.delete(file); else next.add(file)
                      return next
                    })}
                  >
                    <input type="checkbox" checked={selectedFiles.has(file)}
                      onChange={() => {}}
                      style={{ accentColor: '#00E5B0', flexShrink: 0 }}
                      onClick={e => e.stopPropagation()}
                    />
                    <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(s), fontFamily: 'var(--font-mono)', width: 12, flexShrink: 0 }}>{s}</span>
                    <span style={{ fontSize: 11, color: '#8B949E', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file}>
                      {file.split(/[\\/]/).pop()}
                    </span>
                    <span style={{ fontSize: 9, color: '#2a2f38', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'right' }}>
                      {file.split(/[\\/]/).slice(0, -1).join('/')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Commit area */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: 10, flexShrink: 0 }}>
                <textarea
                  value={commitMsg}
                  onChange={e => setCommitMsg(e.target.value)}
                  placeholder="Commit message…"
                  rows={3}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 5, padding: '6px 8px',
                    fontSize: 11, color: '#C9D1D9',
                    fontFamily: 'var(--font-body)', resize: 'none', outline: 'none', lineHeight: 1.5,
                  }}
                  onFocus={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'rgba(0,229,176,0.4)' }}
                  onBlur={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
                <button onClick={commit}
                  disabled={loading || !commitMsg.trim() || selectedFiles.size === 0}
                  style={{
                    marginTop: 6, width: '100%',
                    background: commitMsg.trim() && selectedFiles.size > 0 ? 'var(--accent)' : 'rgba(0,229,176,0.2)',
                    border: 'none', borderRadius: 5,
                    color: commitMsg.trim() && selectedFiles.size > 0 ? '#0D1117' : '#484F58',
                    padding: '6px 0', fontSize: 12, fontWeight: 600,
                    cursor: commitMsg.trim() && selectedFiles.size > 0 ? 'pointer' : 'not-allowed',
                    fontFamily: 'var(--font-body)',
                  }}>
                  {loading ? 'Committing…' : `Commit ${selectedFiles.size > 0 ? `(${selectedFiles.size})` : ''}`}
                </button>
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {log.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#484F58', fontSize: 11, fontFamily: 'var(--font-body)' }}>
                  {loading ? 'Loading…' : 'No commits'}
                </div>
              ) : log.map(entry => (
                <div key={entry.hash} style={{
                  padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#00E5B0', background: 'rgba(0,229,176,0.1)', borderRadius: 3, padding: '0 4px' }}>
                      {entry.hash.slice(0, 7)}
                    </span>
                    <span style={{ fontSize: 9, color: '#484F58', fontFamily: 'var(--font-body)' }}>
                      {new Date(entry.date).toLocaleDateString()}
                    </span>
                    <span style={{ fontSize: 9, color: '#484F58', fontFamily: 'var(--font-body)', marginLeft: 'auto' }}>
                      {entry.author_name}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#C9D1D9', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
                    {entry.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
