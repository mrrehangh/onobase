import { useState, useEffect, useCallback, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-balham.css'
import type { ColDef, GridReadyEvent } from 'ag-grid-community'

interface Session {
  pid: number
  usename: string
  datname: string
  application_name: string
  client_addr: string
  state: string
  wait_event_type: string | null
  wait_event: string | null
  query_start: string | null
  duration_seconds: number | null
  query: string
}

interface DbStats {
  numbackends: number
  xact_commit: number
  xact_rollback: number
  blks_hit: number
  blks_read: number
  tup_returned: number
  tup_fetched: number
  tup_inserted: number
  tup_updated: number
  tup_deleted: number
}

interface TableStat {
  schemaname: string
  relname: string
  seq_scan: number
  idx_scan: number
  n_live_tup: number
  n_dead_tup: number
  last_vacuum: string | null
  last_analyze: string | null
}

const SESSION_COLS: ColDef[] = [
  { field: 'pid',              headerName: 'PID',         width: 70 },
  { field: 'usename',          headerName: 'User',        width: 100 },
  { field: 'datname',          headerName: 'Database',    width: 120 },
  { field: 'application_name', headerName: 'Application', width: 130 },
  { field: 'state',            headerName: 'State',       width: 90,
    cellStyle: (p) => ({ color: p.value === 'active' ? '#00E5B0' : '#8B949E' }) },
  { field: 'wait_event_type',  headerName: 'Wait Type',   width: 100 },
  { field: 'wait_event',       headerName: 'Wait Event',  width: 110 },
  { field: 'duration_seconds', headerName: 'Duration (s)', width: 110, type: 'numericColumn',
    valueFormatter: p => p.value != null ? Number(p.value).toFixed(1) : '' },
  { field: 'query',            headerName: 'Query',       flex: 1, minWidth: 200 },
]

const TABLE_COLS: ColDef[] = [
  { field: 'schemaname', headerName: 'Schema',     width: 100 },
  { field: 'relname',    headerName: 'Table',      width: 160 },
  { field: 'seq_scan',   headerName: 'Seq Scans',  width: 110, type: 'numericColumn' },
  { field: 'idx_scan',   headerName: 'Idx Scans',  width: 110, type: 'numericColumn' },
  { field: 'n_live_tup', headerName: 'Live Rows',  width: 100, type: 'numericColumn' },
  { field: 'n_dead_tup', headerName: 'Dead Rows',  width: 100, type: 'numericColumn' },
  { field: 'last_vacuum',  headerName: 'Last Vacuum',  flex: 1, minWidth: 140,
    valueFormatter: p => p.value ? new Date(p.value).toLocaleString() : '—' },
  { field: 'last_analyze', headerName: 'Last Analyze', flex: 1, minWidth: 140,
    valueFormatter: p => p.value ? new Date(p.value).toLocaleString() : '—' },
]

export default function ActivityMonitor() {
  const [activeTab, setActiveTab] = useState<'sessions' | 'tables'>('sessions')
  const [sessions, setSessions]   = useState<Session[]>([])
  const [tableStats, setTableStats] = useState<TableStat[]>([])
  const [dbStats, setDbStats]     = useState<DbStats | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedPid, setSelectedPid] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await window.electronAPI.getActivity()
      if (res.ok) {
        setSessions(res.sessions as unknown as Session[])
        setDbStats(res.dbStats as unknown as DbStats)
        setTableStats(res.tableStats as unknown as TableStat[])
      } else {
        setError(res.error)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refresh, 5000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, refresh])

  const killQuery = async () => {
    if (!selectedPid) return
    const res = await window.electronAPI.killQuery(selectedPid)
    if (res.ok) {
      setSelectedPid(null)
      refresh()
    } else {
      setError(res.error ?? 'Kill failed')
    }
  }

  const onGridReady = (e: GridReadyEvent) => {
    e.api.sizeColumnsToFit()
  }

  const tabBtn = (t: 'sessions' | 'tables'): React.CSSProperties => ({
    background: 'transparent', border: 'none',
    borderBottom: activeTab === t ? '2px solid #00E5B0' : '2px solid transparent',
    color: activeTab === t ? '#00E5B0' : '#484F58',
    padding: '5px 14px', fontSize: 11, cursor: 'pointer',
    fontFamily: 'var(--font-body)', transition: 'color 0.1s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0D1117' }}>

      {/* Toolbar */}
      <div style={{
        height: 38, background: '#161B22', borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8, flexShrink: 0,
      }}>
        <button onClick={refresh} disabled={loading}
          style={{
            background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.3)',
            borderRadius: 5, color: '#00E5B0', padding: '3px 12px', fontSize: 11,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
          }}>
          {loading ? 'Refreshing…' : '↺ Refresh'}
        </button>

        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#8B949E', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ accentColor: '#00E5B0' }} />
          Auto (5s)
        </label>

        {selectedPid && (
          <button onClick={killQuery}
            style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: 5, color: '#EF4444', padding: '3px 12px', fontSize: 11,
              cursor: 'pointer', fontFamily: 'var(--font-body)', marginLeft: 8,
            }}>
            ✕ Kill PID {selectedPid}
          </button>
        )}

        {/* DB stats pills */}
        {dbStats && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
            <Stat label="Connections" value={dbStats.numbackends} />
            <Stat label="Commits" value={dbStats.xact_commit} />
            <Stat label="Rollbacks" value={dbStats.xact_rollback} />
            <Stat label="Cache Hit" value={dbStats.blks_read > 0 ? `${((dbStats.blks_hit / (dbStats.blks_hit + dbStats.blks_read)) * 100).toFixed(1)}%` : '—'} />
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <button style={tabBtn('sessions')} onClick={() => setActiveTab('sessions')}>Sessions</button>
        <button style={tabBtn('tables')}   onClick={() => setActiveTab('tables')}>Table Stats</button>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 12, fontFamily: 'var(--font-body)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="ag-theme-balham-dark" style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'sessions' ? (
          <AgGridReact
            rowData={sessions}
            columnDefs={SESSION_COLS}
            rowSelection="single"
            onRowSelected={e => {
              if (e.node.isSelected()) setSelectedPid((e.data as Session).pid)
              else setSelectedPid(null)
            }}
            onGridReady={onGridReady}
            defaultColDef={{ resizable: true, sortable: true, filter: true }}
          />
        ) : (
          <AgGridReact
            rowData={tableStats}
            columnDefs={TABLE_COLS}
            onGridReady={onGridReady}
            defaultColDef={{ resizable: true, sortable: true, filter: true }}
          />
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <span style={{ fontSize: 9, color: '#484F58', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#C9D1D9', fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  )
}
