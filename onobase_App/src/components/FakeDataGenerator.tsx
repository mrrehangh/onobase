/**
 * FakeDataGenerator.tsx
 * Generate realistic test data for database tables.
 * Powered by @faker-js/faker (MIT)
 * https://github.com/faker-js/faker
 * Onobase — Obnet Pty Ltd © 2026
 */

import { useState, useEffect, useCallback } from 'react'
import type { SchemaData } from './ObjectExplorer'
import { generateFakeRows, generateFakeValue, type ColumnInfo } from '../utils/dataGenerator'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  schema: SchemaData | null
  connected: boolean
  initialSchema?: string
  initialTable?: string
  onClose: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FakeDataGenerator({
  schema, connected, initialSchema, initialTable, onClose,
}: Props) {
  const [selectedSchema, setSelectedSchema] = useState(initialSchema ?? '')
  const [selectedTable, setSelectedTable]   = useState(initialTable ?? '')
  const [rowCount, setRowCount]             = useState(100)
  const [columns, setColumns]               = useState<ColumnInfo[]>([])
  const [included, setIncluded]             = useState<Set<string>>(new Set())
  const [preview, setPreview]               = useState<Record<string, unknown>[]>([])
  const [generating, setGenerating]         = useState(false)
  const [result, setResult]                 = useState<{ inserted: number } | { error: string } | null>(null)

  // All unique tables from schema
  const allTables = schema
    ? [...new Map(schema.tables.map(t => [`${t.table_schema}.${t.table_name}`, t])).values()]
    : []
  const tablesBySchema = allTables.reduce<Record<string, typeof allTables>>((acc, t) => {
    if (!acc[t.table_schema]) acc[t.table_schema] = []
    acc[t.table_schema].push(t)
    return acc
  }, {})

  // Load columns when table selection changes
  useEffect(() => {
    if (!selectedSchema || !selectedTable || !schema) {
      setColumns([])
      setIncluded(new Set())
      setPreview([])
      return
    }
    const cols: ColumnInfo[] = schema.columns
      .filter(c => c.table_schema === selectedSchema && c.table_name === selectedTable)
      .map(c => ({
        name: c.column_name,
        dataType: c.data_type,
        isNullable: c.is_nullable === 'YES',
        isPk: c.is_pk,
      }))
    setColumns(cols)
    setIncluded(new Set(cols.filter(c => !c.isPk).map(c => c.name)))
  }, [selectedSchema, selectedTable, schema])

  // Regenerate preview when columns, rowCount, or included changes
  const regeneratePreview = useCallback(() => {
    if (columns.length === 0) return
    const visibleCols = columns.filter(c => !c.isPk && included.has(c.name))
    setPreview(generateFakeRows(visibleCols, Math.min(3, rowCount)))
  }, [columns, rowCount, included])

  useEffect(() => {
    regeneratePreview()
  }, [regeneratePreview])

  const toggleColumn = (colName: string) => {
    setIncluded(prev => {
      const next = new Set(prev)
      next.has(colName) ? next.delete(colName) : next.add(colName)
      return next
    })
  }

  const handleGenerate = async () => {
    if (!connected || !selectedTable) return
    setGenerating(true)
    setResult(null)

    try {
      const visibleCols = columns.filter(c => !c.isPk && included.has(c.name))
      const rows: unknown[][] = generateFakeRows(visibleCols, rowCount).map(row =>
        visibleCols.map(c => row[c.name] ?? null)
      )

      const res = await window.electronAPI.insertRows({
        schema: selectedSchema,
        table: selectedTable,
        columns: visibleCols.map(c => c.name),
        rows,
      })

      if (res.ok) {
        setResult({ inserted: res.inserted })
      } else {
        setResult({ error: res.error })
      }
    } catch (err) {
      setResult({ error: String(err) })
    } finally {
      setGenerating(false)
    }
  }

  const ROW_PRESETS = [10, 100, 1000, 5000]

  const btn = (primary = false, disabled = false): React.CSSProperties => ({
    background: primary ? 'rgba(0,229,176,0.1)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${primary ? 'rgba(0,229,176,0.3)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 6, color: primary ? '#00E5B0' : '#8B949E',
    padding: '7px 16px', fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
    opacity: disabled ? 0.4 : 1,
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9991,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 540, maxHeight: '84vh',
          background: '#161B22',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#C9D1D9', fontFamily: 'var(--font-heading)' }}>
              ✦ Generate Test Data
            </div>
            <div style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)', marginTop: 2 }}>
              Powered by @faker-js/faker
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#484F58', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>

          {/* Table selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Target Table
            </label>
            <select
              value={`${selectedSchema}.${selectedTable}`}
              onChange={e => {
                const [s, t] = e.target.value.split('.', 2)
                setSelectedSchema(s ?? '')
                setSelectedTable(t ?? '')
                setResult(null)
              }}
              style={{
                width: '100%', background: '#0D1117',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, padding: '7px 10px',
                fontSize: 12, color: '#C9D1D9',
                fontFamily: 'var(--font-mono)', cursor: 'pointer',
              }}
            >
              <option value=".">-- Select a table --</option>
              {Object.entries(tablesBySchema).map(([sName, tables]) => (
                <optgroup key={sName} label={sName}>
                  {tables.map(t => (
                    <option key={t.table_name} value={`${t.table_schema}.${t.table_name}`}>
                      {t.table_name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Row count */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
              Row Count
            </label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="number" min={1} max={10000}
                value={rowCount}
                onChange={e => setRowCount(Math.min(10000, Math.max(1, Number(e.target.value))))}
                style={{
                  background: '#0D1117', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 5, padding: '5px 8px',
                  fontSize: 12, color: '#C9D1D9', fontFamily: 'var(--font-mono)',
                  width: 80, outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                {ROW_PRESETS.map(n => (
                  <button key={n} onClick={() => setRowCount(n)} style={{
                    background: rowCount === n ? 'rgba(0,229,176,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${rowCount === n ? 'rgba(0,229,176,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 4, color: rowCount === n ? '#00E5B0' : '#484F58',
                    padding: '4px 9px', fontSize: 10, cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', transition: 'all 0.12s',
                  }}>
                    {n >= 1000 ? `${n / 1000}k` : n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Column list with sample values */}
          {columns.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                Columns — uncheck to skip
              </label>
              <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 80px 1fr', gap: 8, padding: '5px 10px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['', 'Column', 'Type', 'Sample'].map((h, i) => (
                    <span key={i} style={{ fontSize: 9, color: '#484F58', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                  ))}
                </div>
                {columns.map(col => {
                  const sampleVal = generateFakeValue(col)
                  const sample = sampleVal === undefined ? '(PK — skipped)' :
                    sampleVal === null ? 'null' :
                    typeof sampleVal === 'object' ? JSON.stringify(sampleVal).slice(0, 30) :
                    String(sampleVal).slice(0, 30)
                  return (
                    <div key={col.name} style={{
                      display: 'grid', gridTemplateColumns: '24px 1fr 80px 1fr', gap: 8,
                      padding: '5px 10px', alignItems: 'center',
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                      background: col.isPk ? 'rgba(0,229,176,0.02)' : 'transparent',
                      opacity: col.isPk ? 0.5 : 1,
                    }}>
                      <input
                        type="checkbox"
                        checked={!col.isPk && included.has(col.name)}
                        disabled={col.isPk}
                        onChange={() => !col.isPk && toggleColumn(col.name)}
                        style={{ cursor: col.isPk ? 'not-allowed' : 'pointer' }}
                      />
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: col.isPk ? '#00E5B0' : '#C9D1D9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {col.name} {col.isPk && <span style={{ fontSize: 9, color: '#484F58' }}>(PK)</span>}
                      </span>
                      <span style={{ fontSize: 9, color: '#484F58', fontFamily: 'var(--font-mono)', fontStyle: 'italic' }}>
                        {col.dataType.replace('character varying', 'varchar').slice(0, 12)}
                      </span>
                      <span style={{ fontSize: 10, color: '#8B949E', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {col.isPk ? '—' : sample}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Preview (first 3 rows)
                </label>
                <button
                  onClick={regeneratePreview}
                  style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4, color: '#484F58', padding: '2px 8px', fontSize: 10,
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
                  ↺ Regenerate
                </button>
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6 }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 10, fontFamily: 'var(--font-mono)', width: '100%' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {Object.keys(preview[0] ?? {}).slice(0, 5).map(k => (
                        <th key={k} style={{ padding: '5px 8px', textAlign: 'left', color: '#8B949E', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).slice(0, 5).map((val, j) => (
                          <td key={j} style={{ padding: '4px 8px', color: '#C9D1D9', borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {val === null ? <span style={{ color: '#484F58' }}>null</span> : String(val).slice(0, 30)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && 'inserted' in result && (
            <div style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.25)', borderRadius: 6, padding: '10px 14px', color: '#00E5B0', fontSize: 12, fontFamily: 'var(--font-body)' }}>
              ✓ {result.inserted} rows inserted into {selectedTable}
            </div>
          )}
          {result && 'error' in result && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, padding: '10px 14px', color: '#EF4444', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
              ⚠ {result.error}
            </div>
          )}
          {generating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8B949E', fontSize: 12, fontFamily: 'var(--font-body)' }}>
              <div style={{ width: 14, height: 14, border: '2px solid rgba(0,229,176,0.2)', borderTopColor: '#00E5B0', borderRadius: '50%', animation: 'fdg-spin 0.7s linear infinite' }} />
              Generating {rowCount} rows…
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button style={btn()} onClick={onClose}>
            {result && 'inserted' in result ? 'Done' : 'Cancel'}
          </button>
          <button
            style={btn(true, !selectedTable || !connected || generating)}
            onClick={handleGenerate}
            disabled={!selectedTable || !connected || generating}
          >
            {generating ? 'Generating…' : `Generate ${rowCount.toLocaleString()} Rows`}
          </button>
        </div>
      </div>

      <style>{`@keyframes fdg-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
