/**
 * ResultChart.tsx
 * Visualise query results as charts.
 * Powered by recharts (MIT)
 * https://github.com/recharts/recharts
 * Onobase — Obnet Pty Ltd © 2026
 */

import { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  rows: Record<string, unknown>[]
  fields: { name: string; dataTypeID?: number }[]
}

type ChartType = 'bar' | 'line' | 'pie'

// ── Colour schemes ────────────────────────────────────────────────────────────

const PALETTES: Record<string, string[]> = {
  teal:   ['#00E5B0', '#00B89B', '#008F7A', '#005F52', '#003B33'],
  blue:   ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#2563EB'],
  sunset: ['#F97316', '#EF4444', '#EC4899', '#8B5CF6', '#EAB308'],
  mono:   ['#C9D1D9', '#8B949E', '#484F58', '#30363D', '#161B22'],
}

// ── Numeric OIDs ──────────────────────────────────────────────────────────────

const NUMERIC_OIDS = new Set([20, 21, 23, 700, 701, 1700, 790])

function isNumericField(field: { name: string; dataTypeID?: number }, rows: Record<string, unknown>[]): boolean {
  if (field.dataTypeID && NUMERIC_OIDS.has(field.dataTypeID)) return true
  const sample = rows.slice(0, 5).map(r => r[field.name])
  return sample.some(v => v !== null && !isNaN(Number(v)))
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResultChart({ rows, fields }: Props) {
  const [chartType, setChartType]     = useState<ChartType>('bar')
  const [xAxis, setXAxis]             = useState<string>(fields[0]?.name ?? '')
  const [yAxis, setYAxis]             = useState<string>('')
  const [palette, setPalette]         = useState<string>('teal')

  const numericFields = useMemo(() => fields.filter(f => isNumericField(f, rows)), [fields, rows])
  const textFields    = useMemo(() => fields.filter(f => !isNumericField(f, rows)), [fields, rows])

  // Default Y axis to first numeric field
  const effectiveY = yAxis || numericFields[0]?.name || ''
  const effectiveX = xAxis || textFields[0]?.name || fields[0]?.name || ''

  const COLORS = PALETTES[palette] ?? PALETTES.teal

  const chartData = rows.slice(0, 200).map(row => ({
    ...row,
    [effectiveX]: String(row[effectiveX] ?? ''),
    [effectiveY]: Number(row[effectiveY] ?? 0),
  }))

  const tooltipStyle: React.CSSProperties = {
    background: '#161B22',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6, fontSize: 11,
    fontFamily: 'var(--font-mono)', color: '#C9D1D9',
  }

  const axisStyle = { fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'var(--font-mono)' }

  const hasNumeric = numericFields.length > 0
  const hasData    = rows.length > 0 && effectiveY

  const btnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? 'rgba(0,229,176,0.1)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${active ? 'rgba(0,229,176,0.3)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 5, color: active ? '#00E5B0' : '#8B949E',
    padding: '4px 12px', fontSize: 11, cursor: 'pointer',
    fontFamily: 'var(--font-body)', transition: 'all 0.12s',
  })

  const selStyle: React.CSSProperties = {
    background: '#161B22', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 4, padding: '4px 8px', fontSize: 11,
    color: '#C9D1D9', fontFamily: 'var(--font-mono)', cursor: 'pointer', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0D1117' }}>

      {/* Controls bar */}
      <div style={{
        height: 42, flexShrink: 0, background: '#161B22',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10,
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['bar', 'line', 'pie'] as ChartType[]).map(t => (
            <button key={t} style={btnStyle(chartType === t)} onClick={() => setChartType(t)}>
              {t === 'bar' ? '▊ Bar' : t === 'line' ? '📈 Line' : '◉ Pie'}
            </button>
          ))}
        </div>

        {chartType !== 'pie' && (
          <>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)' }}>X:</span>
              <select style={selStyle} value={effectiveX} onChange={e => setXAxis(e.target.value)}>
                {fields.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)' }}>Y:</span>
              <select style={selStyle} value={effectiveY} onChange={e => setYAxis(e.target.value)}>
                {numericFields.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
              </select>
            </div>
          </>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)' }}>Palette:</span>
          <select style={selStyle} value={palette} onChange={e => setPalette(e.target.value)}>
            {Object.keys(PALETTES).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Chart area */}
      <div style={{ flex: 1, padding: 16, overflow: 'hidden' }}>
        {!hasData || !hasNumeric ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 8, color: '#484F58',
          }}>
            <span style={{ fontSize: 28 }}>📊</span>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-body)' }}>
              {rows.length === 0
                ? 'Run a query to chart the results'
                : 'No numeric columns found for charting. Run a query with at least one numeric column.'}
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey={effectiveX} tick={axisStyle} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis tick={axisStyle} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#8B949E' }} />
                <Bar dataKey={effectiveY} fill={COLORS[0]} radius={[3, 3, 0, 0]} />
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey={effectiveX} tick={axisStyle} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis tick={axisStyle} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#8B949E' }} />
                <Line type="monotone" dataKey={effectiveY} stroke={COLORS[0]} strokeWidth={2} dot={{ fill: COLORS[0], r: 3 }} />
              </LineChart>
            ) : (
              <PieChart>
                <Pie
                  data={chartData.slice(0, 10)}
                  dataKey={effectiveY}
                  nameKey={effectiveX}
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(1)}%`
                  }
                  labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                >
                  {chartData.slice(0, 10).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#8B949E' }} />
              </PieChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
