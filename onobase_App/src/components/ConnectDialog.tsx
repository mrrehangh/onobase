import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

type DbType = 'postgresql' | 'mysql' | 'mssql' | 'sqlite'

interface ConnectConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  dbType: DbType
  filePath?: string
}

interface RecentEntry extends ConnectConfig {
  id: string
  label: string
  connectedAt: string
}

interface Props {
  onClose: () => void
  onConnected: (dbName: string, host: string, port: number, color: string, sshActive?: boolean) => void
}

// ── localStorage helpers ──────────────────────────────────────────────────────
const HISTORY_KEY = 'onobase_conn_history'

function loadHistory(): RecentEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}

function saveHistory(cfg: ConnectConfig) {
  const prev = loadHistory().filter(h =>
    !(h.host === cfg.host && h.port === cfg.port && h.user === cfg.user && h.database === cfg.database && h.dbType === cfg.dbType)
  )
  const entry: RecentEntry = {
    ...cfg,
    id: Date.now().toString(),
    label: cfg.dbType === 'sqlite' ? (cfg.filePath ?? cfg.database) : `${cfg.host}:${cfg.port} / ${cfg.database}`,
    connectedAt: new Date().toISOString(),
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...prev].slice(0, 10)))
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Default port per DB type ─────────────────────────────────────────────────
function defaultPort(t: DbType) {
  if (t === 'mysql') return 3306
  if (t === 'mssql') return 1433
  if (t === 'sqlite') return 0
  return 5432
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border-bright)',
  borderRadius: 5, padding: '7px 10px',
  fontSize: 12, color: 'var(--text-primary)',
  outline: 'none', width: '100%',
  fontFamily: 'var(--font-mono)', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = {
  fontSize: 10, fontFamily: 'var(--font-body)',
  fontWeight: 600, color: 'var(--text-secondary)',
  letterSpacing: '0.06em', textTransform: 'uppercase',
  marginBottom: 4, display: 'block',
}

// ── Connection string parser ──────────────────────────────────────────────────
function parseConnectionString(str: string): Partial<ConnectConfig> {
  try {
    const url = new URL(str)
    const scheme = url.protocol.replace(':', '')
    const dbType: DbType =
      scheme === 'mysql'  ? 'mysql'  :
      scheme === 'mssql' || scheme === 'sqlserver' ? 'mssql' : 'postgresql'
    return {
      dbType,
      host:     url.hostname,
      port:     parseInt(url.port) || defaultPort(dbType),
      user:     url.username,
      password: decodeURIComponent(url.password),
      database: url.pathname.replace('/', ''),
    }
  } catch { return {} }
}

// ── DB type label helpers ─────────────────────────────────────────────────────
function dbLabel(t: DbType) {
  if (t === 'mysql')  return 'MySQL'
  if (t === 'mssql')  return 'SQL Server'
  if (t === 'sqlite') return 'SQLite'
  return 'PostgreSQL'
}
function dbBadge(t: DbType) {
  if (t === 'mysql')  return 'MY'
  if (t === 'mssql')  return 'MS'
  if (t === 'sqlite') return 'SQ'
  return 'PG'
}

// ── Database dropdown (PostgreSQL only) ───────────────────────────────────────
function DbDropdown({ value, onChange, databases, loading, onLoad, canLoad }: {
  value: string; onChange: (v: string) => void
  databases: string[]; loading: boolean; onLoad: () => void; canLoad: boolean
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setFilter(value) }, [value])
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = databases.filter(db => db.toLowerCase().includes(filter.toLowerCase()))
  const select = (db: string) => { onChange(db); setFilter(db); setOpen(false) }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', gap: 6 }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <input style={{ ...inp }}
          value={filter} placeholder="database name"
          onChange={e => { setFilter(e.target.value); onChange(e.target.value); setOpen(true) }}
          onFocus={() => { if (databases.length) setOpen(true) }}
          onKeyDown={e => {
            if (e.key === 'Escape') setOpen(false)
            if (e.key === 'ArrowDown' && filtered.length) {
              (ref.current?.querySelector('[data-db-item]') as HTMLElement)?.focus()
            }
          }}
        />
        {databases.length > 0 && (
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#8B949E', fontSize: 10, pointerEvents: 'none' }}>▾</span>
        )}
        {open && filtered.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
            background: 'rgba(13,17,23,0.96)', backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)', border: '1px solid var(--border-bright)',
            borderRadius: 5, marginTop: 2, maxHeight: 160, overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          }}>
            {filtered.map(db => (
              <div key={db} data-db-item tabIndex={0}
                onClick={() => select(db)} onKeyDown={e => e.key === 'Enter' && select(db)}
                style={{
                  padding: '7px 10px', fontSize: 12, cursor: 'pointer',
                  color: db === value ? 'var(--accent)' : 'var(--text-mono)',
                  background: db === value ? 'var(--accent-dim)' : 'transparent',
                  fontFamily: 'var(--font-mono)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = db === value ? 'var(--accent-dim)' : 'transparent' }}
              >{db}</div>
            ))}
          </div>
        )}
      </div>
      <button onClick={onLoad} disabled={!canLoad || loading}
        style={{
          background: canLoad && !loading ? 'var(--accent-dim)' : 'transparent',
          border: '1px solid var(--border-bright)', borderRadius: 5,
          color: canLoad && !loading ? 'var(--accent)' : 'var(--text-secondary)',
          padding: '0 10px', fontSize: 11, cursor: canLoad && !loading ? 'pointer' : 'not-allowed',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >{loading ? '…' : 'Load'}</button>
    </div>
  )
}

// ── Main dialog ───────────────────────────────────────────────────────────────
export default function ConnectDialog({ onClose, onConnected }: Props) {
  const [tab, setTab] = useState<'recent' | 'connection' | 'ssh'>('recent')
  const [propTab, setPropTab] = useState<'properties' | 'string'>('properties')

  const [dbType, setDbType] = useState<DbType>('postgresql')

  const [cfg, setCfg] = useState<ConnectConfig>(() => {
    const h = loadHistory()
    return h[0] ?? { host: 'localhost', port: 5432, user: 'postgres', password: '', database: '', dbType: 'postgresql' }
  })
  const [rememberPw, setRememberPw] = useState(false)

  // ── SSH tunnel state ───────────────────────────────────────────────────────
  const [useSSH, setUseSSH]           = useState(false)
  const [sshHost, setSshHost]         = useState('')
  const [sshPort, setSshPort]         = useState(22)
  const [sshUser, setSshUser]         = useState('')
  const [sshAuthMethod, setSshAuthMethod] = useState<'password' | 'key'>('password')
  const [sshPassword, setSshPassword] = useState('')
  const [sshPrivateKey, setSshPrivateKey] = useState('')
  const [sshRemoteHost, setSshRemoteHost] = useState('')
  const [sshRemotePort, setSshRemotePort] = useState(0)

  const [databases, setDatabases] = useState<string[]>([])
  const [dbLoading, setDbLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const history = loadHistory()

  const set = <K extends keyof ConnectConfig>(k: K, v: ConnectConfig[K]) =>
    setCfg(c => ({ ...c, [k]: v }))

  // Sync dbType into cfg
  useEffect(() => { setCfg(c => ({ ...c, dbType })) }, [dbType])

  const canLoad = Boolean(cfg.host && cfg.port && cfg.user) && dbType === 'postgresql'

  const loadDbs = async () => {
    if (!canLoad) return
    setDbLoading(true); setError(null)
    const res = await window.electronAPI.listDatabases({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password })
    if (res.ok) {
      setDatabases(res.databases)
      if (!cfg.database && res.databases.length) set('database', res.databases[0])
    } else { setError(res.error) }
    setDbLoading(false)
  }

  const connect = async () => {
    if (dbType === 'sqlite') {
      if (!cfg.filePath && !cfg.database.trim()) { setError('Select or enter a SQLite database file path.'); return }
    } else {
      if (!cfg.database.trim()) { setError('Select or enter a database name.'); return }
    }
    setConnecting(true); setError(null)

    let connectHost = cfg.host
    let connectPort = cfg.port

    // ── SSH tunnel ───────────────────────────────────────────────────────────
    if (useSSH && sshHost && sshUser) {
      const sshRes = await window.electronAPI.sshConnect({
        sshHost, sshPort, sshUser,
        sshPassword: sshAuthMethod === 'password' ? sshPassword : undefined,
        sshPrivateKey: sshAuthMethod === 'key' ? sshPrivateKey : undefined,
        remoteHost: sshRemoteHost || cfg.host,
        remotePort: sshRemotePort || cfg.port,
      })
      if (!sshRes.ok) { setError(`SSH Error: ${sshRes.error}`); setConnecting(false); return }
      connectHost = '127.0.0.1'
      connectPort = sshRes.localPort
    }

    const payload = { ...cfg, dbType, host: connectHost, port: connectPort, filePath: cfg.filePath }
    const res = await window.electronAPI.connectDB(payload)
    if (!res.ok) { setError(res.error); setConnecting(false); return }
    saveHistory({ ...cfg, dbType, password: rememberPw ? cfg.password : '' })
    const displayName = dbType === 'sqlite'
      ? (cfg.filePath ?? cfg.database).split(/[\\/]/).pop() ?? 'sqlite'
      : cfg.database
    onConnected(displayName, cfg.host, cfg.port, '#00E5B0', useSSH && !!sshHost)
  }

  const fillFromHistory = (entry: RecentEntry) => {
    setCfg(entry)
    setDbType(entry.dbType ?? 'postgresql')
    setTab('connection')
  }

  const connStringPrefix = dbType === 'mysql' ? 'mysql' : dbType === 'mssql' ? 'sqlserver' : 'postgresql'
  const connString = `${connStringPrefix}://${cfg.user}:${cfg.password}@${cfg.host}:${cfg.port}/${cfg.database}`
  const [connStringDraft, setConnStringDraft] = useState(connString)
  useEffect(() => { setConnStringDraft(connString) }, [connString])

  const activeTabStyle: React.CSSProperties = {
    background: 'transparent', color: 'var(--text-primary)',
    border: 'none', borderBottom: '2px solid var(--accent)',
    padding: '8px 14px', fontSize: 11, cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontWeight: 600,
  }
  const inactiveTabStyle: React.CSSProperties = {
    ...activeTabStyle, color: 'var(--text-secondary)',
    borderBottom: '2px solid transparent', fontWeight: 400,
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{
          background: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)', border: '1px solid var(--border-bright)',
          borderRadius: 10, width: 480,
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>

        {/* Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 26, height: 26, background: 'var(--accent)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#0D1117', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            {dbBadge(dbType)}
          </div>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>
            Connect to {dbLabel(dbType)}
          </span>
          <button style={{ marginLeft: 'auto', background: 'transparent', border: 'none', fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, lineHeight: 1 }} onClick={onClose}>✕</button>
        </div>

        {/* Top tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
          <button style={tab === 'recent' ? activeTabStyle : inactiveTabStyle} onClick={() => setTab('recent')}>History</button>
          <button style={tab === 'connection' ? activeTabStyle : inactiveTabStyle} onClick={() => setTab('connection')}>Connection</button>
          <button
            style={{
              ...(tab === 'ssh' ? activeTabStyle : inactiveTabStyle),
              ...(useSSH ? { color: '#8B5CF6', borderBottomColor: '#8B5CF6' } : {}),
            }}
            onClick={() => setTab('ssh' as typeof tab)}
          >
            🔒 SSH Tunnel{useSSH ? ' ●' : ''}
          </button>
        </div>

        {/* Recent tab */}
        {tab === 'recent' && (
          <div style={{ padding: '10px 0', minHeight: 180, maxHeight: 320, overflowY: 'auto' }}>
            {history.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-body)' }}>
                No recent connections.<br />
                <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setTab('connection')}>
                  Create a new connection →
                </span>
              </div>
            ) : history.map(entry => (
              <div key={entry.id} onClick={() => fillFromHistory(entry)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <div style={{ width: 22, height: 22, background: 'rgba(0,229,176,0.15)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  {dbBadge(entry.dbType ?? 'postgresql')}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {entry.dbType === 'sqlite'
                      ? (entry.filePath ?? entry.database).split(/[\\/]/).pop()
                      : <>{entry.host}:{entry.port} — <span style={{ color: 'var(--accent)' }}>{entry.database}</span></>
                    }
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {dbLabel(entry.dbType ?? 'postgresql')} · {entry.user || 'n/a'} · {timeAgo(entry.connectedAt)}
                  </div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', opacity: 0.6 }}>→</span>
              </div>
            ))}
          </div>
        )}

        {/* Connection tab */}
        {tab === 'connection' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>

            {/* DB type selector */}
            <div style={{ display: 'flex', gap: 6, padding: '12px 16px 0' }}>
              {(['postgresql', 'mysql', 'mssql', 'sqlite'] as const).map(type => (
                <button key={type}
                  onClick={() => { setDbType(type); setCfg(c => ({ ...c, dbType: type, port: defaultPort(type) })) }}
                  style={{
                    background: dbType === type ? 'var(--accent-dim)' : 'transparent',
                    border: `1px solid ${dbType === type ? 'var(--accent)' : 'var(--border)'}`,
                    color: dbType === type ? 'var(--accent)' : 'var(--text-secondary)',
                    borderRadius: 5, padding: '4px 10px', fontSize: 11,
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >{dbLabel(type)}</button>
              ))}
            </div>

            {/* Sub-tabs (only for non-SQLite) */}
            {dbType !== 'sqlite' && (
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', gap: 0, marginTop: 4 }}>
                {(['properties', 'string'] as const).map(t => (
                  <button key={t} onClick={() => setPropTab(t)}
                    style={{
                      background: 'transparent', border: 'none',
                      borderBottom: `2px solid ${propTab === t ? 'var(--accent)' : 'transparent'}`,
                      color: propTab === t ? 'var(--text-mono)' : 'var(--text-secondary)',
                      padding: '7px 12px', fontSize: 11, cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}>
                    {t === 'properties' ? 'Connection Properties' : 'Connection String'}
                  </button>
                ))}
              </div>
            )}

            {/* SQLite: file path input */}
            {dbType === 'sqlite' ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={lbl}>Database File</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inp, flex: 1 }}
                      value={cfg.filePath ?? cfg.database}
                      placeholder="path/to/database.db"
                      onChange={e => { set('filePath', e.target.value); set('database', e.target.value) }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#00E5B0' }}
                      onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                    />
                    <button
                      onClick={async () => {
                        const result = await window.electronAPI.openFile()
                        if (result.ok && result.filePath) {
                          set('filePath', result.filePath)
                          set('database', result.filePath.split(/[\\/]/).pop() ?? result.filePath)
                        }
                      }}
                      style={{
                        background: 'var(--accent-dim)', border: '1px solid var(--accent)',
                        color: 'var(--accent)', borderRadius: 5, padding: '0 12px',
                        fontSize: 12, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                      }}
                    >Browse</button>
                  </div>
                </div>
              </div>

            ) : propTab === 'string' ? (
              <div style={{ padding: 16 }}>
                <textarea value={connStringDraft} rows={3} spellCheck={false}
                  onChange={e => {
                    setConnStringDraft(e.target.value)
                    const parsed = parseConnectionString(e.target.value)
                    if (parsed.dbType)   setDbType(parsed.dbType)
                    if (parsed.host)     set('host', parsed.host)
                    if (parsed.port)     set('port', parsed.port)
                    if (parsed.user)     set('user', parsed.user)
                    if (parsed.password !== undefined) set('password', parsed.password)
                    if (parsed.database) set('database', parsed.database)
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border-bright)' }}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-bright)',
                    borderRadius: 5, padding: '10px', fontSize: 11, color: 'var(--accent)',
                    fontFamily: 'var(--font-mono)', resize: 'none', outline: 'none',
                    lineHeight: 1.6, wordBreak: 'break-all',
                  }}
                />
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 6, fontFamily: 'var(--font-body)' }}>
                  Paste a connection string to auto-fill all fields.
                </div>
              </div>

            ) : (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Server + Port */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={lbl}>Server Name</label>
                    <input style={inp} value={cfg.host}
                      onChange={e => set('host', e.target.value)}
                      onFocus={e => { e.currentTarget.style.borderColor = '#00E5B0' }}
                      onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                    />
                  </div>
                  <div style={{ width: 76 }}>
                    <label style={lbl}>Port</label>
                    <input style={inp} type="number" value={cfg.port}
                      onChange={e => set('port', parseInt(e.target.value) || defaultPort(dbType))}
                      onFocus={e => { e.currentTarget.style.borderColor = '#00E5B0' }}
                      onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                    />
                  </div>
                </div>

                {/* Auth label */}
                <div>
                  <label style={lbl}>Authentication</label>
                  <div style={{ ...inp, color: 'var(--text-secondary)', cursor: 'default' }}>Password Authentication</div>
                </div>

                {/* Username */}
                <div>
                  <label style={lbl}>User Name</label>
                  <input style={inp} value={cfg.user}
                    onChange={e => set('user', e.target.value)}
                    onFocus={e => { e.currentTarget.style.borderColor = '#00E5B0' }}
                    onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label style={lbl}>Password</label>
                  <input style={inp} type="password" value={cfg.password}
                    onChange={e => set('password', e.target.value)}
                    onFocus={e => { e.currentTarget.style.borderColor = '#00E5B0' }}
                    onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={rememberPw} onChange={e => setRememberPw(e.target.checked)} style={{ accentColor: '#00E5B0' }} />
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>Remember password</span>
                  </label>
                </div>

                {/* Database */}
                <div>
                  <label style={lbl}>Database Name</label>
                  {dbType === 'postgresql' ? (
                    <>
                      <DbDropdown value={cfg.database} onChange={v => set('database', v)}
                        databases={databases} loading={dbLoading} onLoad={loadDbs} canLoad={canLoad} />
                      <div style={{ fontSize: 10, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', marginTop: 4 }}>
                        Click <strong style={{ color: 'var(--text-mono)' }}>Load</strong> to fetch available databases.
                      </div>
                    </>
                  ) : (
                    <input style={inp} value={cfg.database}
                      onChange={e => set('database', e.target.value)}
                      onFocus={e => { e.currentTarget.style.borderColor = '#00E5B0' }}
                      onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                    />
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* SSH Tunnel tab */}
        {tab === 'ssh' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useSSH}
                onChange={e => setUseSSH(e.target.checked)}
                style={{ accentColor: '#8B5CF6', width: 14, height: 14 }}
              />
              <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: '#C9D1D9', fontWeight: 600 }}>
                Use SSH Tunnel
              </span>
              {useSSH && (
                <span style={{ fontSize: 9, color: '#8B5CF6', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 3, padding: '1px 6px', fontFamily: 'var(--font-mono)' }}>
                  ACTIVE
                </span>
              )}
            </label>

            {useSSH && (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={lbl}>SSH Host</label>
                    <input style={inp} value={sshHost} onChange={e => setSshHost(e.target.value)} placeholder="bastion.example.com"
                      onFocus={e => { e.currentTarget.style.borderColor = '#8B5CF6' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }} />
                  </div>
                  <div style={{ width: 64 }}>
                    <label style={lbl}>Port</label>
                    <input style={inp} type="number" value={sshPort} onChange={e => setSshPort(Number(e.target.value))}
                      onFocus={e => { e.currentTarget.style.borderColor = '#8B5CF6' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }} />
                  </div>
                </div>

                <div>
                  <label style={lbl}>SSH Username</label>
                  <input style={inp} value={sshUser} onChange={e => setSshUser(e.target.value)} placeholder="ubuntu"
                    onFocus={e => { e.currentTarget.style.borderColor = '#8B5CF6' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }} />
                </div>

                <div>
                  <label style={lbl}>Auth Method</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['password', 'key'] as const).map(m => (
                      <button key={m} onClick={() => setSshAuthMethod(m)} style={{
                        background: sshAuthMethod === m ? 'rgba(139,92,246,0.1)' : 'transparent',
                        border: `1px solid ${sshAuthMethod === m ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.15)'}`,
                        borderRadius: 5, color: sshAuthMethod === m ? '#8B5CF6' : 'var(--text-secondary)',
                        padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)',
                      }}>
                        {m === 'password' ? '🔑 Password' : '📄 Private Key'}
                      </button>
                    ))}
                  </div>
                </div>

                {sshAuthMethod === 'password' ? (
                  <div>
                    <label style={lbl}>SSH Password</label>
                    <input style={inp} type="password" value={sshPassword} onChange={e => setSshPassword(e.target.value)}
                      onFocus={e => { e.currentTarget.style.borderColor = '#8B5CF6' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }} />
                  </div>
                ) : (
                  <div>
                    <label style={lbl}>Private Key Path</label>
                    <input style={inp} value={sshPrivateKey} onChange={e => setSshPrivateKey(e.target.value)} placeholder="~/.ssh/id_rsa"
                      onFocus={e => { e.currentTarget.style.borderColor = '#8B5CF6' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }} />
                  </div>
                )}

                <div style={{ paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)', marginBottom: 8 }}>
                    Remote address (leave blank to use DB host/port)
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Remote Host</label>
                      <input style={inp} value={sshRemoteHost} onChange={e => setSshRemoteHost(e.target.value)} placeholder={cfg.host || 'same as DB host'}
                        onFocus={e => { e.currentTarget.style.borderColor = '#8B5CF6' }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }} />
                    </div>
                    <div style={{ width: 76 }}>
                      <label style={lbl}>Remote Port</label>
                      <input style={inp} type="number" value={sshRemotePort || cfg.port || ''} onChange={e => setSshRemotePort(Number(e.target.value))}
                        placeholder={String(cfg.port || '')}
                        onFocus={e => { e.currentTarget.style.borderColor = '#8B5CF6' }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ margin: '8px 16px 0', fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 5, padding: '8px 10px', lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border)', gap: 8, marginTop: 4 }}>
          <button
            onClick={() => { setCfg({ host: 'localhost', port: defaultPort(dbType), user: '', password: '', database: '', dbType }); setDatabases([]); setError(null) }}
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text-secondary)', padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >Reset</button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose}
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text-secondary)', padding: '7px 18px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Cancel
          </button>
          <button onClick={connect} disabled={connecting}
            style={{ background: connecting ? 'rgba(0,229,176,0.5)' : 'var(--accent)', border: 'none', borderRadius: 5, color: '#0D1117', padding: '7px 22px', fontSize: 12, fontWeight: 700, cursor: connecting ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}>
            {connecting ? 'Connecting…' : 'Connect'}
          </button>
        </div>

      </motion.div>
    </div>
  )
}
