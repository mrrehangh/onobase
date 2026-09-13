/**
 * QueryLog.tsx
 * Persistent query execution log for Onobase.
 * Every query ever run is stored and searchable.
 * Onobase — Obnet Pty Ltd © 2026
 */

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string
  sql: string
  database: string
  host: string
  executedAt: string
  duration: number
  rowCount: number | null
  ok: boolean
  error: string | null
}

interface Props {
  onOpenQuery?: (sql: string) => void
  connection?: { dbName: string; host: string } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short' }) +
      ' ' + d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function QueryLog({ onOpenQuery }: Props) {
  const { showToast } = useAppStore()
  const [entries, setEntries]     = useState<LogEntry[]>([])
  const [total, setTotal]         = useState(0)
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<LogEntry | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const loadLog = useCallback(async () => {
    setLoading(true)
    const res = await window.electronAPI.logLoad({ limit: 500, search: search || undefined })
    if (res.ok) {
      setEntries(res.entries as unknown as LogEntry[])
      setTotal(res.total)
    }
    setLoading(false)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(loadLog, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [loadLog, search])

  const clearLog = async () => {
    await window.electronAPI.logClear()
    setEntries([]); setTotal(0); setSelected(null)
    setConfirmClear(false)
    showToast('Query log cleared', 'info')
  }

  const btn = (primary = false, danger = false): React.CSSProperties => ({
    background: primary ? 'rgba(0,229,176,0.1)' : danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${primary ? 'rgba(0,229,176,0.3)' : danger ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 5, color: primary ? '#00E5B0' : danger ? '#EF4444' : '#8B949E',
    padding: '4px 12px', fontSize: 11, cursor: 'pointer',
    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#0D1117' }}>

      {/* Toolbar */}
      <div style={{
        height: 38, flexShrink: 0, background: '#161B22',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8,
      }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search queries or databases…"
          style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4, padding: '4px 8px', fontSize: 11,
            fontFamily: 'var(--font-mono)', color: '#C9D1D9', outline: 'none', width: 260,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,229,176,0.4)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
        />
        <button style={btn()} onClick={loadLog}>↺ Refresh</button>
        <button style={btn(false, true)} onClick={() => setConfirmClear(true)}>🗑 Clear Log</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 10, color: '#00E5B0',
            background: 'rgba(0,229,176,0.08)',
            border: '1px solid rgba(0,229,176,0.2)',
            borderRadius: 3, padding: '1px 7px', fontFamily: 'var(--font-mono)',
          }}>
            {total.toLocaleString()} {search ? 'matching' : 'entries'}
          </span>
        </div>
      </div>

      {/* Main content — list + side panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Log list */}
        <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, gap: 8, color: '#8B949E', fontSize: 12 }}>
              <div style={{ width: 14, height: 14, border: '2px solid rgba(0,229,176,0.2)', borderTopColor: '#00E5B0', borderRadius: '50%', animation: 'ql-spin 0.7s linear infinite' }} />
              Loading log…
            </div>
          ) : entries.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 8, color: '#484F58' }}>
              <span style={{ fontSize: 28 }}>📋</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-body)' }}>
                {search ? `No results for "${search}"` : 'No queries logged yet'}
              </span>
            </div>
          ) : entries.map(entry => (
            <div
              key={entry.id}
              onClick={() => setSelected(entry)}
              onDoubleClick={() => { if (onOpenQuery) onOpenQuery(entry.sql) }}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 90px 60px 80px 90px 1fr',
                gap: 0,
                padding: '6px 10px',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                background: selected?.id === entry.id
                  ? 'rgba(0,229,176,0.06)'
                  : 'transparent',
                transition: 'background 0.1s',
                alignItems: 'center',
              }}
              onMouseEnter={e => { if (selected?.id !== entry.id) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (selected?.id !== entry.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              {/* Status */}
              <span style={{ fontSize: 12, color: entry.ok ? '#00E5B0' : '#EF4444' }}>
                {entry.ok ? '✓' : '✗'}
              </span>
              {/* Time */}
              <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fmtDate(entry.executedAt)}
              </span>
              {/* Duration */}
              <span style={{ fontSize: 10, color: '#00E5B0', fontFamily: 'var(--font-mono)' }}>
                {fmtDuration(entry.duration)}
              </span>
              {/* Database */}
              <span style={{ fontSize: 10, color: '#8B949E', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.database}
              </span>
              {/* Rows */}
              <span style={{ fontSize: 10, color: '#8B949E', fontFamily: 'var(--font-mono)' }}>
                {entry.rowCount !== null ? `${entry.rowCount} rows` : '—'}
              </span>
              {/* SQL preview */}
              <span style={{ fontSize: 11, color: entry.ok ? '#C9D1D9' : '#EF4444', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.error ?? entry.sql.replace(/\s+/g, ' ').slice(0, 100)}
              </span>
            </div>
          ))}
        </div>

        {/* Side panel */}
        {selected && (
          <div style={{
            width: 300, flexShrink: 0,
            borderLeft: '1px solid rgba(255,255,255,0.07)',
            background: '#161B22',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: selected.ok ? '#00E5B0' : '#EF4444', fontWeight: 600 }}>
                  {selected.ok ? '✓ Success' : '✗ Failed'}
                </span>
                <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-mono)' }}>
                  {fmtDuration(selected.duration)}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', color: '#484F58', cursor: 'pointer', fontSize: 14 }}
              >×</button>
            </div>
            {/* Meta */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 10, fontFamily: 'var(--font-mono)', color: '#484F58' }}>
              {selected.database} · {selected.host} · {fmtDate(selected.executedAt)}
              {selected.rowCount !== null && ` · ${selected.rowCount} rows`}
            </div>
            {/* SQL */}
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              <pre style={{
                margin: 0, fontSize: 11, fontFamily: 'var(--font-mono)',
                color: selected.ok ? '#C9D1D9' : '#FCA5A5',
                whiteSpace: 'pre-wrap', lineHeight: 1.6, userSelect: 'text',
              }}>
                {selected.error ?? selected.sql}
              </pre>
            </div>
            {/* Actions */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 6 }}>
              {onOpenQuery && (
                <button style={btn(true)} onClick={() => onOpenQuery(selected.sql)}>
                  Open in Editor
                </button>
              )}
              <button style={btn()} onClick={() => navigator.clipboard.writeText(selected.sql)}>
                Copy SQL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Column headers */}
      <div style={{
        position: 'absolute', top: 38, left: 0, right: 0,
        display: 'grid',
        gridTemplateColumns: '24px 90px 60px 80px 90px 1fr',
        padding: '4px 10px',
        background: '#161B22',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        fontSize: 9, fontFamily: 'var(--font-body)', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em', color: '#484F58',
        pointerEvents: 'none',
      }}>
        <span />
        <span>Time</span>
        <span>Duration</span>
        <span>Database</span>
        <span>Rows</span>
        <span>Query</span>
      </div>

      {/* Confirm clear */}
      {confirmClear && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 24, minWidth: 300, boxShadow: '0 8px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', marginBottom: 8 }}>Clear Query Log?</div>
            <div style={{ fontSize: 12, color: '#8B949E', marginBottom: 20 }}>This will permanently delete all {total.toLocaleString()} entries.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btn()} onClick={() => setConfirmClear(false)}>Cancel</button>
              <button style={btn(false, true)} onClick={clearLog}>Clear All</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes ql-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
