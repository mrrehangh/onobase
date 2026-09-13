/**
 * CsvImportWizard.tsx
 * Import CSV data into database tables.
 * CSV parsing powered by PapaParse (MIT)
 * https://github.com/mholt/PapaParse
 * Onobase — Obnet Pty Ltd © 2026
 */

import { useState, useCallback, useRef } from 'react'
import Papa from 'papaparse'
import type { SchemaData } from './ObjectExplorer'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  schema: SchemaData | null
  connected: boolean
  onClose: () => void
}

type WizardStep = 1 | 2 | 3 | 4

interface TableColumn {
  name: string
  dataType: string
  isNullable: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function guessTypeMatch(csvValue: string, dataType: string): boolean {
  const dt = dataType.toLowerCase()
  if (dt.includes('int') || dt === 'numeric' || dt === 'decimal' || dt.includes('float') || dt === 'real') {
    return !isNaN(Number(csvValue)) && csvValue.trim() !== ''
  }
  return true
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CsvImportWizard({ schema, connected, onClose }: Props) {
  const [step, setStep]               = useState<WizardStep>(1)
  const [fileName, setFileName]       = useState('')
  const [csvHeaders, setCsvHeaders]   = useState<string[]>([])
  const [csvRows, setCsvRows]         = useState<Record<string, string>[]>([])
  const [targetSchema, setTargetSchema] = useState('')
  const [targetTable, setTargetTable] = useState('')
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([])
  const [mapping, setMapping]         = useState<Record<string, string>>({}) // csvCol -> tableCol
  const [importing, setImporting]     = useState(false)
  const [importResult, setImportResult] = useState<{ inserted: number } | { error: string } | null>(null)
  const [dragOver, setDragOver]       = useState(false)
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  // ── Step 1: Parse CSV ─────────────────────────────────────────────────────

  const parseFile = useCallback((file: File) => {
    setFileName(file.name)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? []
        setCsvHeaders(headers)
        setCsvRows(results.data)
        setStep(2)
      },
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }, [parseFile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  // ── Step 2: Select target table ───────────────────────────────────────────

  const handleTableSelect = useCallback((schemaName: string, tableName: string) => {
    setTargetSchema(schemaName)
    setTargetTable(tableName)
    if (!schema) return

    const cols = schema.columns
      .filter(c => c.table_schema === schemaName && c.table_name === tableName)
      .map(c => ({ name: c.column_name, dataType: c.data_type, isNullable: c.is_nullable === 'YES' }))
    setTableColumns(cols)

    // Auto-map by name (case-insensitive)
    const autoMap: Record<string, string> = {}
    for (const h of csvHeaders) {
      const match = cols.find(c => c.name.toLowerCase() === h.toLowerCase())
      autoMap[h] = match ? match.name : '__skip__'
    }
    setMapping(autoMap)
    setStep(3)
  }, [schema, csvHeaders])

  // ── Step 4: Import ────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!connected) return
    setImporting(true)
    setImportResult(null)

    try {
      // Build columns and rows from mapping
      const mappedEntries = Object.entries(mapping).filter(([, col]) => col !== '__skip__')
      const columns = mappedEntries.map(([, col]) => col)
      const rows: unknown[][] = csvRows.map(row =>
        mappedEntries.map(([csvCol]) => {
          const val = row[csvCol]
          return val === '' || val === undefined ? null : val
        })
      )

      const result = await window.electronAPI.insertRows({
        schema: targetSchema,
        table: targetTable,
        columns,
        rows,
      })

      if (result.ok) {
        setImportResult({ inserted: result.inserted })
      } else {
        setImportResult({ error: result.error })
      }
    } catch (err) {
      setImportResult({ error: String(err) })
    } finally {
      setImporting(false)
    }
  }

  // ── All tables from schema ────────────────────────────────────────────────

  const allTables = schema
    ? [...new Map(
        schema.tables.map(t => [`${t.table_schema}.${t.table_name}`, t])
      ).values()]
    : []

  // Group by schema
  const tablesBySchema = allTables.reduce<Record<string, typeof allTables>>((acc, t) => {
    if (!acc[t.table_schema]) acc[t.table_schema] = []
    acc[t.table_schema].push(t)
    return acc
  }, {})

  // ── Type mismatch warnings ────────────────────────────────────────────────

  const typeWarnings: Record<string, boolean> = {}
  if (csvRows.length > 0) {
    for (const [csvCol, tableCol] of Object.entries(mapping)) {
      if (tableCol === '__skip__') continue
      const col = tableColumns.find(c => c.name === tableCol)
      if (!col) continue
      const sampleVal = csvRows[0][csvCol] ?? ''
      typeWarnings[csvCol] = !guessTypeMatch(sampleVal, col.dataType)
    }
  }

  const mappedColCount = Object.values(mapping).filter(v => v !== '__skip__').length

  // ── Styles ────────────────────────────────────────────────────────────────

  const btn = (primary = false): React.CSSProperties => ({
    background: primary ? 'rgba(0,229,176,0.1)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${primary ? 'rgba(0,229,176,0.3)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 6, color: primary ? '#00E5B0' : '#8B949E',
    padding: '7px 16px', fontSize: 12, cursor: 'pointer',
    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
  })

  // ── Render ────────────────────────────────────────────────────────────────

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
          width: 520, maxHeight: '82vh',
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
              Import CSV
            </div>
            <div style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)', marginTop: 2 }}>
              Step {step} of 4 — {
                step === 1 ? 'Select File' :
                step === 2 ? 'Choose Target Table' :
                step === 3 ? 'Map Columns' :
                'Preview & Import'
              }
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#484F58', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        {/* Step progress */}
        <div style={{ display: 'flex', padding: '8px 18px 0', gap: 4 }}>
          {([1, 2, 3, 4] as const).map(s => (
            <div key={s} style={{
              flex: 1, height: 2, borderRadius: 1,
              background: s <= step ? '#00E5B0' : 'rgba(255,255,255,0.08)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>

          {/* ── STEP 1: Drop/select file ── */}
          {step === 1 && (
            <div>
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? '#00E5B0' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 10,
                  padding: '40px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: dragOver ? 'rgba(0,229,176,0.03)' : 'transparent',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
                <div style={{ fontSize: 13, color: '#8B949E', fontFamily: 'var(--font-body)', marginBottom: 6 }}>
                  Drop CSV file here or <span style={{ color: '#00E5B0' }}>click to browse</span>
                </div>
                <div style={{ fontSize: 11, color: '#484F58', fontFamily: 'var(--font-body)' }}>
                  Accepts .csv and .txt files
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {/* ── STEP 2: Select target table ── */}
          {step === 2 && (
            <div>
              <div style={{ marginBottom: 12, padding: 10, background: 'rgba(0,229,176,0.04)', border: '1px solid rgba(0,229,176,0.15)', borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: '#8B949E', fontFamily: 'var(--font-body)' }}>
                  📄 {fileName} — <span style={{ color: '#00E5B0' }}>{csvRows.length} rows</span>, {csvHeaders.length} columns
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#8B949E', marginBottom: 10, fontFamily: 'var(--font-body)' }}>
                Select the target table:
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6 }}>
                {Object.entries(tablesBySchema).map(([sName, tables]) => (
                  <div key={sName}>
                    <div style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.03)', fontSize: 9, color: '#484F58', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {sName}
                    </div>
                    {tables.map(t => (
                      <div
                        key={t.table_name}
                        onClick={() => handleTableSelect(t.table_schema, t.table_name)}
                        style={{
                          padding: '7px 14px', cursor: 'pointer',
                          fontSize: 12, fontFamily: 'var(--font-mono)', color: '#C9D1D9',
                          borderTop: '1px solid rgba(255,255,255,0.04)',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                      >
                        {t.table_name}
                      </div>
                    ))}
                  </div>
                ))}
                {allTables.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: '#484F58', fontSize: 12 }}>
                    No tables found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: Map columns ── */}
          {step === 3 && (
            <div>
              <div style={{ marginBottom: 12, fontSize: 11, color: '#8B949E', fontFamily: 'var(--font-body)' }}>
                Map CSV columns to table columns. Select <em style={{ color: '#484F58' }}>-- skip --</em> to ignore a column.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBottom: 4 }}>
                <div style={{ fontSize: 9, color: '#484F58', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 0' }}>CSV Column</div>
                <div style={{ fontSize: 9, color: '#484F58', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 0' }}>Table Column</div>
              </div>
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {csvHeaders.map(h => (
                  <div key={h} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 5, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {typeWarnings[h] && <span title="Type mismatch warning" style={{ color: '#EAB308', fontSize: 11 }}>⚠</span>}
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#C9D1D9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h}
                      </span>
                    </div>
                    <select
                      value={mapping[h] ?? '__skip__'}
                      onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value }))}
                      style={{
                        background: '#0D1117', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 4, padding: '4px 6px', fontSize: 11,
                        color: mapping[h] && mapping[h] !== '__skip__' ? '#C9D1D9' : '#484F58',
                        fontFamily: 'var(--font-mono)', cursor: 'pointer', width: '100%',
                      }}
                    >
                      <option value="__skip__">-- skip --</option>
                      {tableColumns.map(c => (
                        <option key={c.name} value={c.name}>{c.name} ({c.dataType})</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview rows */}
              {csvRows.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 10, color: '#484F58', marginBottom: 6, fontFamily: 'var(--font-body)' }}>
                    Preview (first 3 rows):
                  </div>
                  <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6 }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: 10, fontFamily: 'var(--font-mono)', width: '100%' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                          {csvHeaders.slice(0, 5).map(h => (
                            <th key={h} style={{ padding: '5px 8px', textAlign: 'left', color: '#8B949E', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvRows.slice(0, 3).map((row, i) => (
                          <tr key={i}>
                            {csvHeaders.slice(0, 5).map(h => (
                              <td key={h} style={{ padding: '4px 8px', color: '#C9D1D9', borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {row[h] ?? ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Preview & Import ── */}
          {step === 4 && (
            <div>
              {/* Summary */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#C9D1D9', marginBottom: 10, fontFamily: 'var(--font-heading)' }}>Import Summary</div>
                {[
                  ['Source', `${fileName} (${csvRows.length} rows)`],
                  ['Target', `${targetSchema}.${targetTable}`],
                  ['Mapped columns', `${mappedColCount} of ${csvHeaders.length}`],
                  ['Skipped columns', String(csvHeaders.length - mappedColCount)],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: '#484F58', fontFamily: 'var(--font-body)' }}>{label}</span>
                    <span style={{ fontSize: 11, color: '#C9D1D9', fontFamily: 'var(--font-mono)' }}>{value}</span>
                  </div>
                ))}
              </div>

              {importResult && 'inserted' in importResult && (
                <div style={{ background: 'rgba(0,229,176,0.08)', border: '1px solid rgba(0,229,176,0.25)', borderRadius: 6, padding: '10px 14px', marginBottom: 12, color: '#00E5B0', fontSize: 12, fontFamily: 'var(--font-body)' }}>
                  ✓ {importResult.inserted} rows imported successfully
                </div>
              )}

              {importResult && 'error' in importResult && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, padding: '10px 14px', marginBottom: 12, color: '#EF4444', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                  ⚠ {importResult.error}
                </div>
              )}

              {importing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8B949E', fontSize: 12, marginBottom: 12, fontFamily: 'var(--font-body)' }}>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(0,229,176,0.2)', borderTopColor: '#00E5B0', borderRadius: '50%', animation: 'csv-spin 0.7s linear infinite' }} />
                  Importing {csvRows.length} rows…
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            {step > 1 && !importResult && (
              <button style={btn()} onClick={() => setStep((step - 1) as WizardStep)}>
                ← Back
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btn()} onClick={onClose}>
              {importResult && 'inserted' in importResult ? 'Done' : 'Cancel'}
            </button>
            {step === 3 && (
              <button style={btn(true)} onClick={() => setStep(4)}>
                Preview →
              </button>
            )}
            {step === 4 && !importResult && (
              <button
                style={{ ...btn(true), opacity: importing ? 0.5 : 1 }}
                onClick={handleImport}
                disabled={importing || !connected}
              >
                {importing ? 'Importing…' : `Import ${csvRows.length} Rows`}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes csv-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
