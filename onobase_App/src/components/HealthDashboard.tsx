/**
 * HealthDashboard.tsx
 * Database health metrics dashboard.
 * Charts powered by recharts (MIT)
 * https://github.com/recharts/recharts
 * Onobase — Obnet Pty Ltd © 2026
 */

import { useState, useEffect, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef } from 'ag-grid-community'
import {
  RadialBarChart, RadialBar,
  PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer,
} from 'recharts'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TableStat {
  schemaname: string
  table_name: string
  live_rows: number
  dead_rows: number
  dead_pct: number | null
  total_size: string
  last_vacuum: string | null
  last_analyze: string | null
}

interface IndexStat {
  schemaname: string
  table_name: string
  index_name: string
  scans: number
  index_size: string
}

interface ConnState {
  count: number
  state: string
}

interface HealthData {
  dbStat: Record<string, unknown>
  tableStats: TableStat[]
  indexStats: IndexStat[]
  cacheStats: { hits: number; reads: number; cache_hit_rate: number }
  connStats: ConnState[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONN_COLORS: Record<string, string> = {
  active: '#00E5B0',
  idle: '#484F58',
  'idle in transaction': '#EAB308',
  'idle in transaction (aborted)': '#EF4444',
}

function MetricCard({ label, value, sub, color = '#00E5B0' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '14px 16px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: 'var(--font-heading)', lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#8B949E', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HealthDashboard() {
  const [data, setData]         = useState<HealthData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const loadHealth = useCallback(async () => {
    setLoading(true); setError(null)
    const res = await window.electronAPI.getHealth()
    setLoading(false)
    if (res.ok) {
      setData(res as unknown as HealthData)
      setLastRefresh(new Date())
    } else {
      setError(res.error)
    }
  }, [])

  useEffect(() => { loadHealth() }, [loadHealth])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(loadHealth, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadHealth])

  const tableColDefs: ColDef[] = [
    { field: 'schemaname', headerName: 'Schema', width: 90 },
    { field: 'table_name', headerName: 'Table', flex: 1 },
    { field: 'live_rows', headerName: 'Live Rows', width: 100, type: 'numericColumn' },
    {
      field: 'dead_pct', headerName: 'Dead %', width: 80,
      cellStyle: (p: { value: number | null }) => ({
        color: p.value == null ? '#484F58' : p.value > 30 ? '#EF4444' : p.value > 10 ? '#EAB308' : '#8B949E',
        fontWeight: (p.value ?? 0) > 10 ? 700 : 400,
      }),
      valueFormatter: (p: { value: number | null }) => p.value != null ? `${p.value}%` : '—',
    },
    { field: 'total_size', headerName: 'Size', width: 90 },
    { field: 'last_vacuum', headerName: 'Last Vacuum', flex: 1, valueFormatter: (p: { value: string | null }) => p.value ? new Date(p.value).toLocaleDateString() : '—' },
  ]

  const indexColDefs: ColDef[] = [
    { field: 'schemaname', headerName: 'Schema', width: 90 },
    { field: 'table_name', headerName: 'Table', flex: 1 },
    { field: 'index_name', headerName: 'Index', flex: 1 },
    {
      field: 'scans', headerName: 'Scans', width: 80, type: 'numericColumn',
      cellStyle: (p: { value: number }) => ({ color: p.value === 0 ? '#EF4444' : '#8B949E', fontWeight: p.value === 0 ? 700 : 400 }),
    },
    { field: 'index_size', headerName: 'Size', width: 80 },
  ]

  const btn = (active = false): React.CSSProperties => ({
    background: active ? 'rgba(0,229,176,0.1)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${active ? 'rgba(0,229,176,0.3)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 5, color: active ? '#00E5B0' : '#8B949E',
    padding: '5px 12px', fontSize: 11, cursor: 'pointer',
    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
  })

  const cacheHit = Number(data?.cacheStats?.cache_hit_rate ?? 0)
  const cacheColor = cacheHit >= 95 ? '#00E5B0' : cacheHit >= 85 ? '#EAB308' : '#EF4444'

  const connPieData = (data?.connStats ?? []).map(c => ({
    name: c.state ?? 'unknown',
    value: Number(c.count),
  }))

  const gaugeData = [{ value: cacheHit, fill: cacheColor }]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#0D1117' }}>

      {/* Toolbar */}
      <div style={{ height: 38, flexShrink: 0, background: '#161B22', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8 }}>
        <button style={btn()} onClick={loadHealth} disabled={loading}>
          {loading ? 'Loading…' : '↺ Refresh'}
        </button>
        <button style={btn(autoRefresh)} onClick={() => setAutoRefresh(v => !v)}>
          {autoRefresh ? '⏸ Auto-refresh ON' : '▶ Auto-refresh'}
        </button>
        {lastRefresh && (
          <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-mono)', marginLeft: 4 }}>
            Last: {lastRefresh.toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <div style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          ⚠ {error}
        </div>
      )}

      {!data && loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10, color: '#8B949E', fontSize: 13 }}>
          <div style={{ width: 16, height: 16, border: '2px solid rgba(0,229,176,0.2)', borderTopColor: '#00E5B0', borderRadius: '50%', animation: 'hd-spin 0.7s linear infinite' }} />
          Loading health data…
        </div>
      )}

      {data && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Top row: metric cards */}
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            <MetricCard label="Database Size" value={String(data.dbStat.db_size ?? '—')} color="#00E5B0" />
            <MetricCard
              label="Active Connections"
              value={String(data.dbStat.active_connections ?? '0')}
              sub={`${data.dbStat.total_connections ?? 0} total`}
              color={Number(data.dbStat.active_connections ?? 0) > 10 ? '#EAB308' : '#00E5B0'}
            />
            <MetricCard
              label="Cache Hit Rate"
              value={`${cacheHit}%`}
              color={cacheColor}
              sub={cacheHit < 85 ? 'Consider tuning shared_buffers' : undefined}
            />
            <MetricCard label="User Tables" value={String(data.tableStats.length)} color="#8B5CF6" />
          </div>

          {/* Middle row */}
          <div style={{ display: 'flex', gap: 16, minHeight: 260 }}>

            {/* Table health grid */}
            <div style={{ flex: 2, background: '#161B22', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 11, fontWeight: 700, color: '#8B949E', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Table Health
              </div>
              <div className="ag-theme-balham-dark" style={{ flex: 1 }}>
                <AgGridReact
                  rowData={data.tableStats}
                  columnDefs={tableColDefs}
                  defaultColDef={{ sortable: true, resizable: true, filter: false }}
                  rowHeight={24}
                  headerHeight={28}
                  domLayout="normal"
                  animateRows={false}
                />
              </div>
            </div>

            {/* Cache hit gauge */}
            <div style={{ flex: 1, background: '#161B22', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8B949E', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Cache Hit Rate
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <RadialBarChart cx="50%" cy="70%" innerRadius="60%" outerRadius="90%" barSize={14} data={gaugeData} startAngle={180} endAngle={0}>
                  <RadialBar background dataKey="value" cornerRadius={6} fill={cacheColor} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 28, fontWeight: 800, color: cacheColor, fontFamily: 'var(--font-heading)', marginTop: -20 }}>
                {cacheHit}%
              </div>
              <div style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)', marginTop: 4 }}>
                {cacheHit >= 95 ? '✓ Excellent' : cacheHit >= 85 ? '⚠ Good' : '✗ Needs tuning'}
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: 'flex', gap: 16, minHeight: 220 }}>

            {/* Unused indexes grid */}
            <div style={{ flex: 2, background: '#161B22', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', fontSize: 11, fontWeight: 700, color: '#8B949E', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Least-Used Indexes
              </div>
              <div className="ag-theme-balham-dark" style={{ flex: 1 }}>
                <AgGridReact
                  rowData={data.indexStats}
                  columnDefs={indexColDefs}
                  defaultColDef={{ sortable: true, resizable: true, filter: false }}
                  rowHeight={24}
                  headerHeight={28}
                  domLayout="normal"
                  animateRows={false}
                />
              </div>
            </div>

            {/* Connection states pie */}
            <div style={{ flex: 1, background: '#161B22', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8B949E', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, alignSelf: 'flex-start' }}>
                Connection States
              </div>
              {connPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={connPieData} dataKey="value" cx="50%" cy="50%" outerRadius={60}>
                      {connPieData.map((entry) => (
                        <Cell key={entry.name} fill={CONN_COLORS[entry.name] ?? '#8B949E'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484F58', fontSize: 11 }}>No connections</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%', marginTop: 4 }}>
                {connPieData.map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: CONN_COLORS[c.name] ?? '#8B949E', flexShrink: 0 }} />
                    <span style={{ color: '#8B949E', flex: 1 }}>{c.name}</span>
                    <span style={{ color: '#C9D1D9', fontWeight: 600 }}>{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes hd-spin { to { transform: rotate(360deg) } }
        .ag-theme-balham-dark{--ag-background-color:#161B22;--ag-header-background-color:#1A2030;--ag-row-hover-color:rgba(255,255,255,0.04);--ag-border-color:rgba(255,255,255,0.07);--ag-foreground-color:#C9D1D9;--ag-font-family:var(--font-mono);--ag-font-size:11px;--ag-header-foreground-color:#8B949E}
      `}</style>
    </div>
  )
}
