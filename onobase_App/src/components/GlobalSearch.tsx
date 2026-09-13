/**
 * GlobalSearch.tsx
 * Full-text search across all database tables.
 * Onobase — Obnet Pty Ltd © 2026
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { SchemaData } from './ObjectExplorer'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  schema: string
  table: string
  column: string
  value: string
  rowData: Record<string, unknown>
}

interface Props {
  schema: SchemaData | null
  onClose: () => void
  onOpenTable: (schema: string, table: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GlobalSearch({ schema, onClose, onOpenTable }: Props) {
  const [searchText, setSearchText]     = useState('')
  const [results, setResults]           = useState<SearchResult[]>([])
  const [loading, setLoading]           = useState(false)
  const [searched, setSearched]         = useState(false)
  const [selectedSchemas, setSelectedSchemas] = useState<Set<string>>(new Set())
  const inputRef                        = useRef<HTMLInputElement>(null)

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Build list of unique schemas from schema data
  const schemaNames = schema
    ? [...new Set(schema.tables.map(t => t.table_schema))]
    : []

  // Default: all schemas selected
  useEffect(() => {
    if (schemaNames.length > 0 && selectedSchemas.size === 0) {
      setSelectedSchemas(new Set(schemaNames))
    }
  }, [schemaNames.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSchema = (s: string) => {
    setSelectedSchemas(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const handleSearch = useCallback(async () => {
    if (!searchText.trim()) return
    setLoading(true)
    setSearched(true)
    setResults([])
    try {
      const schemas = selectedSchemas.size > 0 ? [...selectedSchemas] : schemaNames
      const result = await window.electronAPI.searchAll({
        searchText: searchText.trim(),
        schemas,
        maxResults: 200,
      })
      if (result.ok) {
        setResults(result.results)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [searchText, selectedSchemas, schemaNames])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
      e.preventDefault()
      handleSearch()
    }
    if (e.key === 'Escape') onClose()
  }

  // Group results by table
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const key = `${r.schema}.${r.table}`
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  const tableCount = Object.keys(grouped).length

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 80,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 620, maxHeight: '75vh',
          background: '#161B22',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search bar */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#00E5B0" strokeWidth={2} strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search across all tables… (Enter to search)"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 15, color: '#C9D1D9', fontFamily: 'var(--font-body)',
              }}
            />
            <button
              onClick={handleSearch}
              disabled={!searchText.trim() || loading}
              style={{
                background: searchText.trim() ? 'rgba(0,229,176,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${searchText.trim() ? 'rgba(0,229,176,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 6, color: searchText.trim() ? '#00E5B0' : '#484F58',
                padding: '5px 14px', fontSize: 12, cursor: 'pointer',
                fontFamily: 'var(--font-body)', transition: 'all 0.15s',
              }}
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>

          {/* Schema filters */}
          {schemaNames.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)' }}>Schemas:</span>
              {schemaNames.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSchema(s)}
                  style={{
                    background: selectedSchemas.has(s) ? 'rgba(0,229,176,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${selectedSchemas.has(s) ? 'rgba(0,229,176,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 4, color: selectedSchemas.has(s) ? '#00E5B0' : '#484F58',
                    padding: '2px 8px', fontSize: 10, cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', transition: 'all 0.12s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 120, gap: 10, color: '#8B949E', fontSize: 13,
            }}>
              <div style={{
                width: 16, height: 16,
                border: '2px solid rgba(0,229,176,0.2)',
                borderTopColor: '#00E5B0',
                borderRadius: '50%',
                animation: 'gs-spin 0.7s linear infinite',
              }} />
              Searching tables…
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              height: 120, gap: 8, color: '#484F58',
            }}>
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-body)' }}>
                No results for <span style={{ color: '#8B949E', fontFamily: 'var(--font-mono)' }}>'{searchText}'</span>
              </span>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div style={{ padding: '8px 0' }}>
              <div style={{
                padding: '4px 16px 8px',
                fontSize: 10, color: '#484F58',
                fontFamily: 'var(--font-body)', borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                {results.length} match{results.length !== 1 ? 'es' : ''} across {tableCount} table{tableCount !== 1 ? 's' : ''}
              </div>

              {Object.entries(grouped).map(([tableKey, tableResults]) => {
                const [tSchema, tTable] = tableKey.split('.', 2)
                return (
                  <div key={tableKey} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {/* Table header */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 16px 4px',
                      background: 'rgba(255,255,255,0.02)',
                    }}>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#8B949E' }}>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>{tSchema}.</span>
                        <span style={{ color: '#C9D1D9', fontWeight: 600 }}>{tTable}</span>
                        <span style={{
                          marginLeft: 6, fontSize: 9,
                          background: 'rgba(0,229,176,0.08)',
                          border: '1px solid rgba(0,229,176,0.2)',
                          borderRadius: 3, padding: '1px 5px', color: '#00E5B0',
                        }}>
                          {tableResults.length}
                        </span>
                      </span>
                      <button
                        onClick={() => onOpenTable(tSchema, tTable)}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(0,229,176,0.2)',
                          borderRadius: 4, color: '#00E5B0',
                          padding: '2px 8px', fontSize: 10, cursor: 'pointer',
                          fontFamily: 'var(--font-body)', transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,229,176,0.1)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        Open Table →
                      </button>
                    </div>

                    {/* Result rows */}
                    {tableResults.slice(0, 5).map((r, i) => (
                      <div key={i} style={{
                        padding: '5px 16px 5px 28px',
                        borderTop: '1px solid rgba(255,255,255,0.03)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontSize: 9, color: '#00E5B0',
                            background: 'rgba(0,229,176,0.06)',
                            borderRadius: 3, padding: '1px 5px',
                            fontFamily: 'var(--font-mono)', flexShrink: 0,
                          }}>
                            {r.column}
                          </span>
                          <span style={{
                            fontSize: 11, color: '#C9D1D9',
                            fontFamily: 'var(--font-mono)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            flex: 1,
                          }}>
                            {r.value.length > 100 ? `${r.value.slice(0, 100)}…` : r.value}
                          </span>
                        </div>
                      </div>
                    ))}
                    {tableResults.length > 5 && (
                      <div style={{ padding: '4px 28px 6px', fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)' }}>
                        +{tableResults.length - 5} more matches
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!loading && !searched && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              height: 120, gap: 6, color: '#484F58',
            }}>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-body)' }}>
                Press <kbd style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 4, padding: '1px 6px', fontSize: 10, color: '#8B949E',
                }}>Enter</kbd> to search all text columns
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)',
        }}>
          <span>Ctrl+Shift+F to toggle · Esc to close</span>
          <span>Searches text columns in PostgreSQL</span>
        </div>
      </div>

      <style>{`
        @keyframes gs-spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
