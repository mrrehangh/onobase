/**
 * DataViewer.tsx
 * Browse and edit table data without writing SQL.
 * Powered by AG Grid Community (MIT)
 * https://github.com/ag-grid/ag-grid
 * Onobase — Obnet Pty Ltd © 2026
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type {
  ColDef, CellValueChangedEvent, GridReadyEvent,
  GetRowIdParams, SelectionChangedEvent, RowStyle,
} from 'ag-grid-community'
import type { GridApi } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-balham.css'
import { RotateCcw, Plus, Trash2, Save, X } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  schemaName: string
  tableName: string
  connected: boolean
}

interface Field {
  name: string
  dataTypeID: number
}

interface PendingChange {
  pkValue: unknown
  column: string
  oldValue: unknown
  newValue: unknown
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZES = [100, 500, 1000, 5000]

// PostgreSQL OID type IDs for numeric types
const NUMERIC_TYPE_IDS = new Set([20, 21, 23, 700, 701, 1700, 790])

function getCellEditor(dataTypeID: number): string {
  if (NUMERIC_TYPE_IDS.has(dataTypeID)) return 'agNumberCellEditor'
  return 'agTextCellEditor'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DataViewer({ schemaName, tableName, connected }: Props) {
  const [rows, setRows]                     = useState<Record<string, unknown>[]>([])
  const [fields, setFields]                 = useState<Field[]>([])
  const [pkColumn, setPkColumn]             = useState<string | null>(null)
  const [loading, setLoading]               = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map())
  const [selectedPkValues, setSelectedPkValues] = useState<unknown[]>([])
  const [totalCount, setTotalCount]         = useState(0)
  const [page, setPage]                     = useState(0)
  const [pageSize, setPageSize]             = useState(500)
  const [filterText, setFilterText]         = useState('')
  const [error, setError]                   = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete]   = useState(false)
  const [saveMsg, setSaveMsg]               = useState('')
  const gridApiRef                          = useRef<GridApi | null>(null)

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async (pg: number, ps: number) => {
    if (!connected) return
    setLoading(true)
    setError(null)
    try {
      // 1. Detect PK column (PostgreSQL only; other DBs fall back to null)
      let pk: string | null = null
      const pkResult = await window.electronAPI.queryDB(
        `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND tc.table_schema = $1 AND tc.table_name = $2
         LIMIT 1`,
        [schemaName, tableName]
      )
      if (pkResult.ok && pkResult.rows.length > 0) {
        pk = String(pkResult.rows[0].column_name)
      }
      setPkColumn(pk)

      // 2. Total count
      const countResult = await window.electronAPI.queryDB(
        `SELECT COUNT(*) AS cnt FROM "${schemaName}"."${tableName}"`,
        []
      )
      if (countResult.ok) setTotalCount(Number(countResult.rows[0].cnt))

      // 3. Page data
      const orderBy = pk ? ` ORDER BY "${pk}"` : ''
      const dataResult = await window.electronAPI.queryDB(
        `SELECT * FROM "${schemaName}"."${tableName}"${orderBy} LIMIT ${ps} OFFSET ${pg * ps}`,
        []
      )
      if (dataResult.ok) {
        setRows(dataResult.rows)
        setFields(dataResult.fields)
      } else {
        setError(dataResult.error)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [connected, schemaName, tableName])

  useEffect(() => {
    setPage(0)
    setPendingChanges(new Map())
    loadData(0, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaName, tableName, connected])

  const refresh = useCallback(() => {
    setPendingChanges(new Map())
    loadData(page, pageSize)
  }, [loadData, page, pageSize])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    loadData(newPage, pageSize)
  }

  const handlePageSizeChange = (ps: number) => {
    setPageSize(ps)
    setPage(0)
    loadData(0, ps)
  }

  // ── Cell editing ──────────────────────────────────────────────────────────

  const handleCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    if (!pkColumn) return
    const pkVal = event.data[pkColumn]
    const col = event.colDef.field ?? ''
    const key = `${String(pkVal)}__${col}`
    setPendingChanges(prev => {
      const next = new Map(prev)
      next.set(key, { pkValue: pkVal, column: col, oldValue: event.oldValue, newValue: event.newValue })
      return next
    })
  }, [pkColumn])

  // ── Save / Discard ────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (pendingChanges.size === 0 || !pkColumn) return
    setSaving(true)
    let errorMsg = ''
    let count = 0
    for (const change of pendingChanges.values()) {
      const result = await window.electronAPI.updateCell({
        schema: schemaName, table: tableName,
        pkColumn, pkValue: change.pkValue,
        column: change.column, newValue: change.newValue,
      })
      if (result.ok) count++
      else errorMsg = result.error
    }
    setSaving(false)
    if (errorMsg) {
      setError(errorMsg)
    } else {
      setSaveMsg(`✓ ${count} cell${count !== 1 ? 's' : ''} saved`)
      setTimeout(() => setSaveMsg(''), 2500)
      setPendingChanges(new Map())
      loadData(page, pageSize)
    }
  }

  const handleDiscard = () => {
    setPendingChanges(new Map())
    loadData(page, pageSize)
  }

  // ── Delete rows ───────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (selectedPkValues.length === 0 || !pkColumn) return
    const result = await window.electronAPI.deleteRows({
      schema: schemaName, table: tableName,
      pkColumn, pkValues: selectedPkValues,
    })
    if (result.ok) {
      setConfirmDelete(false)
      setSelectedPkValues([])
      loadData(page, pageSize)
    } else {
      setError(result.error)
      setConfirmDelete(false)
    }
  }

  // ── Add empty row ─────────────────────────────────────────────────────────

  const handleAddRow = () => {
    if (!pkColumn) return
    const emptyRow: Record<string, unknown> = {}
    fields.forEach(f => { emptyRow[f.name] = null })
    setRows(prev => [emptyRow, ...prev])
    // Focus first non-PK cell
    setTimeout(() => {
      const firstNonPk = fields.find(f => f.name !== pkColumn)
      if (firstNonPk && gridApiRef.current) {
        gridApiRef.current.setFocusedCell(0, firstNonPk.name)
        gridApiRef.current.startEditingCell({ rowIndex: 0, colKey: firstNonPk.name })
      }
    }, 50)
  }

  // ── Column definitions ────────────────────────────────────────────────────

  const colDefs: ColDef[] = []

  // Checkbox selection column
  colDefs.push({
    checkboxSelection: true,
    headerCheckboxSelection: true,
    width: 38, minWidth: 38, maxWidth: 38,
    pinned: 'left' as const,
    sortable: false, filter: false,
    editable: false, resizable: false,
    headerName: '', suppressHeaderMenuButton: true,
  })

  if (fields.length > 0) {
    // PK column (pinned left, read-only, teal)
    if (pkColumn && fields.some(f => f.name === pkColumn)) {
      colDefs.push({
        field: pkColumn,
        headerName: `🔑 ${pkColumn}`,
        pinned: 'left' as const,
        editable: false,
        lockPinned: true,
        width: 130,
        cellStyle: {
          background: 'rgba(0,229,176,0.05)',
          color: '#00E5B0',
          fontFamily: 'var(--font-mono)',
          borderRight: '1px solid rgba(0,229,176,0.15)',
        },
      })
    }

    // All other columns — editable
    for (const f of fields) {
      if (f.name === pkColumn) continue
      colDefs.push({
        field: f.name,
        headerName: f.name,
        editable: true,
        cellEditor: getCellEditor(f.dataTypeID),
        flex: 1,
        minWidth: 100,
        ...(NUMERIC_TYPE_IDS.has(f.dataTypeID)
          ? { cellStyle: { textAlign: 'right', fontFamily: 'var(--font-mono)' } }
          : { cellStyle: { fontFamily: 'var(--font-mono)' } }),
        valueFormatter: (p: { value: unknown }) => {
          if (p.value === null || p.value === undefined) return 'NULL'
          if (typeof p.value === 'object') return JSON.stringify(p.value)
          return String(p.value)
        },
      })
    }
  }

  // ── Row styling (highlight pending-changed rows) ───────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getRowStyle = useCallback((params: any): RowStyle | undefined => {
    if (!pkColumn || !params.data) return undefined
    const pkVal = (params.data as Record<string, unknown>)[pkColumn]
    const hasChange = [...pendingChanges.values()].some(c => String(c.pkValue) === String(pkVal))
    return hasChange
      ? { background: 'rgba(234,179,8,0.06)', borderLeft: '2px solid #EAB308' } as RowStyle
      : undefined
  }, [pkColumn, pendingChanges])

  // ── Filtered rows (client-side) ───────────────────────────────────────────

  const filteredRows = filterText
    ? rows.filter(row =>
        Object.values(row).some(v =>
          v !== null && v !== undefined &&
          String(v).toLowerCase().includes(filterText.toLowerCase())
        )
      )
    : rows

  // ── Derived values ────────────────────────────────────────────────────────

  const totalPages        = Math.max(1, Math.ceil(totalCount / pageSize))
  const hasPendingChanges = pendingChanges.size > 0
  const showFrom          = totalCount === 0 ? 0 : page * pageSize + 1
  const showTo            = Math.min((page + 1) * pageSize, totalCount)

  // ── Styles ────────────────────────────────────────────────────────────────

  const btn = (active = false, danger = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 4,
    background: active
      ? 'rgba(0,229,176,0.12)'
      : danger
        ? 'rgba(239,68,68,0.08)'
        : 'rgba(255,255,255,0.05)',
    border: `1px solid ${active ? 'rgba(0,229,176,0.3)' : danger ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 5, color: active ? '#00E5B0' : danger ? '#EF4444' : '#8B949E',
    padding: '3px 9px', fontSize: 11,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer', transition: 'all 0.15s',
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#0D1117' }}>

      {/* ── Toolbar ── */}
      <div style={{
        height: 38, flexShrink: 0, background: '#161B22',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6,
      }}>
        {/* Left group */}
        <button style={btn()} onClick={refresh} title="Refresh (reload current page)" disabled={loading}>
          <RotateCcw size={11} /> Refresh
        </button>

        <button
          style={{ ...btn(), opacity: !pkColumn ? 0.4 : 1 }}
          onClick={handleAddRow}
          title={pkColumn ? 'Add blank row' : 'No PK detected — cannot add rows'}
          disabled={!pkColumn || loading}
        >
          <Plus size={11} /> Add Row
        </button>

        <button
          style={{ ...btn(false, true), opacity: selectedPkValues.length === 0 ? 0.4 : 1 }}
          onClick={() => setConfirmDelete(true)}
          title="Delete selected rows"
          disabled={selectedPkValues.length === 0}
        >
          <Trash2 size={11} />
          {selectedPkValues.length > 0
            ? `Delete (${selectedPkValues.length})`
            : 'Delete'}
        </button>

        <button
          style={{ ...btn(hasPendingChanges), opacity: !hasPendingChanges ? 0.4 : 1 }}
          onClick={handleSave}
          title="Save pending changes to database"
          disabled={!hasPendingChanges || saving}
        >
          <Save size={11} />
          {saving ? 'Saving…' : `Save${hasPendingChanges ? ` (${pendingChanges.size})` : ''}`}
        </button>

        {hasPendingChanges && (
          <button style={btn()} onClick={handleDiscard} title="Discard all pending changes">
            <X size={11} /> Discard
          </button>
        )}

        {saveMsg && (
          <span style={{ fontSize: 11, color: '#00E5B0', fontFamily: 'var(--font-mono)' }}>
            {saveMsg}
          </span>
        )}

        {/* Right group */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            placeholder="Filter rows…"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4, padding: '3px 8px',
              fontSize: 11, fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)', outline: 'none', width: 160,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,229,176,0.4)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
          />

          <select
            value={pageSize}
            onChange={e => handlePageSizeChange(Number(e.target.value))}
            style={{
              background: '#161B22', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4, padding: '3px 6px', fontSize: 11,
              color: '#8B949E', cursor: 'pointer',
            }}
          >
            {PAGE_SIZES.map(ps => <option key={ps} value={ps}>{ps} rows</option>)}
          </select>

          <button style={btn()} onClick={() => handlePageChange(Math.max(0, page - 1))} disabled={page === 0}>‹</button>
          <span style={{ fontSize: 11, color: '#8B949E', whiteSpace: 'nowrap', minWidth: 80, textAlign: 'center' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button style={btn()} onClick={() => handlePageChange(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>›</button>

          <span style={{
            fontSize: 10, color: '#00E5B0',
            background: 'rgba(0,229,176,0.08)',
            border: '1px solid rgba(0,229,176,0.2)',
            borderRadius: 3, padding: '1px 7px',
            fontFamily: 'var(--font-mono)',
          }}>
            {totalCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          padding: '5px 12px', background: 'rgba(239,68,68,0.1)',
          borderBottom: '1px solid rgba(239,68,68,0.2)',
          color: '#EF4444', fontSize: 11, fontFamily: 'var(--font-mono)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
            ×
          </button>
        </div>
      )}

      {/* ── Grid ── */}
      <div className="ag-theme-balham-dark" style={{ flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 10, color: '#8B949E', fontSize: 13,
          }}>
            <div style={{
              width: 16, height: 16,
              border: '2px solid rgba(0,229,176,0.2)',
              borderTopColor: '#00E5B0',
              borderRadius: '50%',
              animation: 'dv-spin 0.7s linear infinite',
            }} />
            Loading data…
          </div>
        ) : (
          <AgGridReact
            rowData={filteredRows}
            columnDefs={colDefs}
            defaultColDef={{ sortable: true, resizable: true, filter: false, minWidth: 80 }}
            onGridReady={(e: GridReadyEvent) => { gridApiRef.current = e.api }}
            onCellValueChanged={handleCellValueChanged}
            onSelectionChanged={(e: SelectionChangedEvent) => {
              if (!pkColumn) return
              const sel = e.api.getSelectedRows() as Record<string, unknown>[]
              setSelectedPkValues(sel.map(r => r[pkColumn]))
            }}
            rowSelection="multiple"
            suppressRowClickSelection
            getRowStyle={getRowStyle}
            getRowId={(p: GetRowIdParams) =>
              pkColumn
                ? String((p.data as Record<string, unknown>)[pkColumn])
                : JSON.stringify(p.data).slice(0, 80)
            }
            animateRows={false}
            rowHeight={26}
            headerHeight={32}
            domLayout="normal"
            overlayNoRowsTemplate="<span style='color:rgba(255,255,255,0.3);font-size:12px'>No rows</span>"
            stopEditingWhenCellsLoseFocus
          />
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{
        height: 24, flexShrink: 0, background: '#161B22',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center',
        padding: '0 12px', fontSize: 10,
        fontFamily: 'var(--font-mono)', color: '#484F58',
      }}>
        <span>Showing {showFrom}–{showTo} of {totalCount.toLocaleString()}</span>
        {hasPendingChanges && (
          <span style={{ margin: '0 auto', color: '#EAB308' }}>
            {pendingChanges.size} unsaved change{pendingChanges.size !== 1 ? 's' : ''}
          </span>
        )}
        <span style={{ marginLeft: 'auto' }}>
          <span style={{ color: '#484F58' }}>{schemaName}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>.</span>
          <span style={{ color: '#8B949E' }}>{tableName}</span>
        </span>
      </div>

      {/* ── Delete confirmation modal ── */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#161B22',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, padding: 24, minWidth: 340,
            boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#EF4444', marginBottom: 8 }}>
              ⚠ Delete {selectedPkValues.length} row{selectedPkValues.length !== 1 ? 's' : ''}?
            </div>
            <div style={{ fontSize: 12, color: '#8B949E', marginBottom: 20, lineHeight: 1.6 }}>
              Delete {selectedPkValues.length} selected row{selectedPkValues.length !== 1 ? 's' : ''} from{' '}
              <span style={{ color: '#C9D1D9', fontFamily: 'var(--font-mono)' }}>{tableName}</span>?
              <br />This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ ...btn(), padding: '6px 16px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{ ...btn(false, true), padding: '6px 16px', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AG Grid dark theme overrides ── */}
      <style>{`
        @keyframes dv-spin { to { transform: rotate(360deg) } }
        .ag-theme-balham-dark {
          --ag-background-color: #0D1117;
          --ag-header-background-color: #161B22;
          --ag-odd-row-background-color: rgba(255,255,255,0.015);
          --ag-row-hover-color: rgba(255,255,255,0.04);
          --ag-selected-row-background-color: rgba(0,229,176,0.06);
          --ag-border-color: rgba(255,255,255,0.07);
          --ag-header-foreground-color: #8B949E;
          --ag-foreground-color: #C9D1D9;
          --ag-font-family: var(--font-mono);
          --ag-font-size: 11px;
          --ag-cell-horizontal-padding: 10px;
          --ag-header-column-separator-color: rgba(255,255,255,0.07);
          --ag-row-border-color: rgba(255,255,255,0.04);
          --ag-range-selection-border-color: #00E5B0;
          --ag-input-focus-border-color: #00E5B0;
          --ag-cell-edit-input-border: 1px solid #00E5B0;
        }
        .ag-theme-balham-dark .ag-header-cell-text {
          font-family: var(--font-body);
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.02em; color: #8B949E;
        }
        .ag-theme-balham-dark .ag-row-selected {
          background-color: rgba(0,229,176,0.06) !important;
        }
        .ag-theme-balham-dark .ag-cell-inline-editing {
          background: #1C2333 !important;
          border: 1px solid #00E5B0 !important;
        }
      `}</style>
    </div>
  )
}
