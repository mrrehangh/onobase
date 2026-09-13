/**
 * ConnectionManager.tsx
 * Manage and organise database connections.
 * Onobase — Obnet Pty Ltd © 2026
 */

import { useState } from 'react'
import { useAppStore, type ConnectionGroup, type SavedConnection } from '../store/useAppStore'
import { CONN_COLORS } from './SchemaComparison'

interface Props {
  onConnect?: (conn: SavedConnection) => void
}

const GROUP_COLORS = CONN_COLORS

type DbType = 'postgresql' | 'mysql' | 'mssql' | 'sqlite'

function defaultPort(t: DbType) { return t === 'mysql' ? 3306 : t === 'mssql' ? 1433 : t === 'sqlite' ? 0 : 5432 }

export default function ConnectionManager({ onConnect }: Props) {
  const {
    connectionGroups, addGroup, removeGroup, updateGroup,
    saveConnection, updateConnection, removeConnection,
  } = useAppStore()

  const [selectedGroupId, setSelectedGroupId]   = useState<string | null>(connectionGroups[0]?.id ?? null)
  const [showNewGroup, setShowNewGroup]          = useState(false)
  const [newGroupName, setNewGroupName]          = useState('')
  const [newGroupColor, setNewGroupColor]        = useState(CONN_COLORS[0])
  const [editingGroupId, setEditingGroupId]      = useState<string | null>(null)
  const [showNewConn, setShowNewConn]            = useState(false)
  const [editingConnId, setEditingConnId]        = useState<string | null>(null)
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<string | null>(null)
  const [confirmDeleteConn, setConfirmDeleteConn]   = useState<string | null>(null)

  // New/edit connection form state
  const [connForm, setConnForm] = useState<Omit<SavedConnection, 'id'>>({
    name: '', host: 'localhost', port: 5432, database: '',
    username: 'postgres', password: '', dbType: 'postgresql',
    color: '#00E5B0', groupId: selectedGroupId ?? '',
  })

  const selectedGroup = connectionGroups.find(g => g.id === selectedGroupId)

  const startEditGroup = (g: ConnectionGroup) => {
    setEditingGroupId(g.id)
    setNewGroupName(g.name)
    setNewGroupColor(g.color)
  }

  const startNewConn = () => {
    setConnForm({
      name: '', host: 'localhost', port: 5432, database: '',
      username: 'postgres', password: '', dbType: 'postgresql',
      color: '#00E5B0', groupId: selectedGroupId ?? '',
    })
    setEditingConnId(null)
    setShowNewConn(true)
  }

  const startEditConn = (conn: SavedConnection) => {
    setConnForm({ ...conn })
    setEditingConnId(conn.id)
    setShowNewConn(true)
  }

  const saveConnForm = () => {
    if (!connForm.name || !connForm.database) return
    if (editingConnId) {
      updateConnection(editingConnId, connForm)
    } else {
      saveConnection({ ...connForm, groupId: selectedGroupId ?? connForm.groupId })
    }
    setShowNewConn(false)
    setEditingConnId(null)
  }

  const inp: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 5, padding: '6px 8px', fontSize: 12,
    color: '#C9D1D9', fontFamily: 'var(--font-mono)', outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const btn = (primary = false, danger = false): React.CSSProperties => ({
    background: primary ? 'rgba(0,229,176,0.1)' : danger ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${primary ? 'rgba(0,229,176,0.3)' : danger ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 5, color: primary ? '#00E5B0' : danger ? '#EF4444' : '#8B949E',
    padding: '5px 12px', fontSize: 11, cursor: 'pointer',
    fontFamily: 'var(--font-body)', transition: 'all 0.12s', whiteSpace: 'nowrap',
  })
  const lbl: React.CSSProperties = {
    fontSize: 9, color: '#484F58', fontFamily: 'var(--font-body)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'block', marginBottom: 4,
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#0D1117' }}>

      {/* Left: groups tree */}
      <div style={{
        width: 220, flexShrink: 0,
        background: '#161B22',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Groups</span>
          <button style={{ background: 'none', border: 'none', color: '#00E5B0', cursor: 'pointer', fontSize: 16, lineHeight: 1 }} onClick={() => setShowNewGroup(true)} title="New Group">+</button>
        </div>

        {/* New group form */}
        {showNewGroup && (
          <div style={{ padding: 10, borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              style={{ ...inp, fontSize: 11 }}
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="Group name"
              onKeyDown={e => { if (e.key === 'Enter' && newGroupName) { addGroup(newGroupName, newGroupColor); setShowNewGroup(false); setNewGroupName('') } }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {GROUP_COLORS.map(c => (
                <div key={c} onClick={() => setNewGroupColor(c)} style={{ width: 14, height: 14, borderRadius: '50%', background: c, cursor: 'pointer', outline: newGroupColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={btn(true)} onClick={() => { if (newGroupName) { addGroup(newGroupName, newGroupColor); setShowNewGroup(false); setNewGroupName('') } }}>Add</button>
              <button style={btn()} onClick={() => setShowNewGroup(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {connectionGroups.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: '#484F58', fontSize: 11, fontFamily: 'var(--font-body)' }}>
              No groups yet.<br />Click + to create one.
            </div>
          )}
          {connectionGroups.map(g => (
            <div key={g.id}>
              {editingGroupId === g.id ? (
                <div style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <input style={{ ...inp, fontSize: 11, marginBottom: 6 }} value={newGroupName} onChange={e => setNewGroupName(e.target.value)} autoFocus />
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
                    {GROUP_COLORS.map(c => <div key={c} onClick={() => setNewGroupColor(c)} style={{ width: 12, height: 12, borderRadius: '50%', background: c, cursor: 'pointer', outline: newGroupColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />)}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button style={btn(true)} onClick={() => { updateGroup(g.id, newGroupName, newGroupColor); setEditingGroupId(null) }}>Save</button>
                    <button style={btn()} onClick={() => setEditingGroupId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setSelectedGroupId(g.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', cursor: 'pointer',
                    background: selectedGroupId === g.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                    borderLeft: `3px solid ${selectedGroupId === g.id ? g.color : 'transparent'}`,
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 11, fontFamily: 'var(--font-body)', color: '#C9D1D9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                  <span style={{ fontSize: 9, color: '#484F58', fontFamily: 'var(--font-mono)' }}>{g.connections.length}</span>
                  <div style={{ display: 'flex', gap: 2, opacity: 0 }} className="group-actions"
                    onClick={e => e.stopPropagation()}>
                    <button style={{ background: 'none', border: 'none', color: '#484F58', cursor: 'pointer', fontSize: 10, padding: '1px 3px' }} onClick={() => startEditGroup(g)} title="Rename">✎</button>
                    <button style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 10, padding: '1px 3px' }} onClick={() => setConfirmDeleteGroup(g.id)} title="Delete">×</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: connection list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {selectedGroup ? (
            <>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedGroup.color }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#C9D1D9', fontFamily: 'var(--font-heading)' }}>{selectedGroup.name}</span>
              <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-mono)' }}>{selectedGroup.connections.length} connection{selectedGroup.connections.length !== 1 ? 's' : ''}</span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: '#484F58', fontFamily: 'var(--font-body)' }}>Select a group</span>
          )}
          {selectedGroup && (
            <button style={{ ...btn(true), marginLeft: 'auto' }} onClick={startNewConn}>+ Add Connection</button>
          )}
        </div>

        {/* Connection list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {!selectedGroup ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#484F58', fontSize: 12, fontFamily: 'var(--font-body)' }}>
              Select or create a group on the left
            </div>
          ) : selectedGroup.connections.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8, color: '#484F58' }}>
              <span style={{ fontSize: 28 }}>🔌</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-body)' }}>No connections in this group</span>
              <button style={btn(true)} onClick={startNewConn}>+ Add Connection</button>
            </div>
          ) : selectedGroup.connections.map(conn => (
            <div key={conn.id} style={{
              background: '#161B22', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 8, padding: 12, marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 7, background: `${conn.color}15`, border: `1px solid ${conn.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: conn.color, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {conn.dbType === 'postgresql' ? 'PG' : conn.dbType === 'mysql' ? 'MY' : conn.dbType === 'mssql' ? 'MS' : 'SQ'}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#C9D1D9', fontFamily: 'var(--font-body)', marginBottom: 2 }}>{conn.name}</div>
                <div style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-mono)' }}>
                  {conn.dbType === 'sqlite' ? conn.filePath ?? conn.database : `${conn.host}:${conn.port} / ${conn.database}`}
                </div>
                {conn.username && <div style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-mono)' }}>User: {conn.username}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {onConnect && (
                  <button style={btn(true)} onClick={() => onConnect(conn)}>Connect</button>
                )}
                <button style={btn()} onClick={() => startEditConn(conn)}>Edit</button>
                <button style={btn(false, true)} onClick={() => setConfirmDeleteConn(conn.id)}>×</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New/Edit connection modal */}
      {showNewConn && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9991, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowNewConn(false)}>
          <div style={{ width: 440, background: '#161B22', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#C9D1D9', fontFamily: 'var(--font-heading)', marginBottom: 16 }}>
              {editingConnId ? 'Edit Connection' : 'Add Connection'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Connection Name</label>
                <input style={inp} value={connForm.name} onChange={e => setConnForm(f => ({ ...f, name: e.target.value }))} placeholder="My Production DB" />
              </div>
              <div>
                <label style={lbl}>DB Type</label>
                <select style={{ ...inp }} value={connForm.dbType} onChange={e => { const t = e.target.value as DbType; setConnForm(f => ({ ...f, dbType: t, port: defaultPort(t) })) }}>
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="mssql">SQL Server</option>
                  <option value="sqlite">SQLite</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Color</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', paddingTop: 4 }}>
                  {CONN_COLORS.map(c => <div key={c} onClick={() => setConnForm(f => ({ ...f, color: c }))} style={{ width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer', outline: connForm.color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />)}
                </div>
              </div>
              {connForm.dbType !== 'sqlite' && (<>
                <div>
                  <label style={lbl}>Host</label>
                  <input style={inp} value={connForm.host} onChange={e => setConnForm(f => ({ ...f, host: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Port</label>
                  <input style={inp} type="number" value={connForm.port} onChange={e => setConnForm(f => ({ ...f, port: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={lbl}>Database</label>
                  <input style={inp} value={connForm.database} onChange={e => setConnForm(f => ({ ...f, database: e.target.value }))} />
                </div>
                <div>
                  <label style={lbl}>Username</label>
                  <input style={inp} value={connForm.username} onChange={e => setConnForm(f => ({ ...f, username: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>Password</label>
                  <input style={inp} type="password" value={connForm.password ?? ''} onChange={e => setConnForm(f => ({ ...f, password: e.target.value }))} />
                </div>
              </>)}
              {connForm.dbType === 'sqlite' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>File Path</label>
                  <input style={inp} value={connForm.filePath ?? ''} onChange={e => setConnForm(f => ({ ...f, filePath: e.target.value, database: e.target.value.split(/[\\/]/).pop() ?? '' }))} placeholder="/path/to/database.db" />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button style={btn()} onClick={() => setShowNewConn(false)}>Cancel</button>
              <button style={btn(true)} onClick={saveConnForm} disabled={!connForm.name || !connForm.database}>
                {editingConnId ? 'Save Changes' : 'Add Connection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete group */}
      {confirmDeleteGroup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 24, minWidth: 300, boxShadow: '0 8px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', marginBottom: 8 }}>Delete Group?</div>
            <div style={{ fontSize: 12, color: '#8B949E', marginBottom: 20 }}>This will also delete all connections in this group.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btn()} onClick={() => setConfirmDeleteGroup(null)}>Cancel</button>
              <button style={btn(false, true)} onClick={() => { removeGroup(confirmDeleteGroup); if (selectedGroupId === confirmDeleteGroup) setSelectedGroupId(null); setConfirmDeleteGroup(null) }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete connection */}
      {confirmDeleteConn && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 24, minWidth: 300, boxShadow: '0 8px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', marginBottom: 8 }}>Delete Connection?</div>
            <div style={{ fontSize: 12, color: '#8B949E', marginBottom: 20 }}>This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btn()} onClick={() => setConfirmDeleteConn(null)}>Cancel</button>
              <button style={btn(false, true)} onClick={() => { removeConnection(confirmDeleteConn); setConfirmDeleteConn(null) }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        div:hover .group-actions { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
