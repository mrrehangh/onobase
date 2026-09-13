/**
 * ResultsGrid.tsx
 * ─────────────────────────────────────────────────────
 * Data grid component for Onobase query results.
 *
 * BUILT WITH:
 * AG Grid Community Edition
 * © AG Grid Ltd.
 * GitHub: https://github.com/ag-grid/ag-grid
 * License: MIT
 * https://www.ag-grid.com
 *
 * AG Grid Community is free and open source.
 * No licence key required for community features.
 * Commercial use permitted under MIT licence.
 *
 * INSPIRATION:
 * Results grid UX pattern inspired by:
 * - Beekeeper Studio (GPLv3)
 *   https://github.com/beekeeper-studio/beekeeper-studio
 * - Outerbase Studio (MIT)
 *   https://github.com/outerbase/studio
 * - Microsoft SQL Server Management Studio (SSMS 22)
 *
 * Onobase implementation by Obnet Pty Ltd © 2026
 * ─────────────────────────────────────────────────────
 */

/**
 * Date formatting powered by date-fns (MIT)
 * https://github.com/date-fns/date-fns
 */
import { useMemo, useCallback, useState, useRef } from 'react'
import JsonViewer from './JsonViewer'
import { format as formatDate, isValid, parseISO } from 'date-fns'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GridReadyEvent, CellStyle, ITooltipParams, GetContextMenuItemsParams, MenuItemDef } from 'ag-grid-community'
import type { GridApi } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-balham.css'

interface QueryField {
  name: string
  dataTypeID?: number
}

interface Props {
  rows: Record<string, unknown>[]
  fields: QueryField[]
  rowCount: number | null
  duration: number
  running: boolean
  connected: boolean
  error?: string
  wasLimited?: boolean
  rowLimit?: number
}

// ── Cell helpers ──────────────────────────────────────────────────────────────

function getCellStyle(value: unknown): CellStyle {
  if (value === null || value === undefined) {
    return { color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }
  }
  if (typeof value === 'number') {
    return { color: '#B5CEA8', textAlign: 'right' }
  }
  if (typeof value === 'boolean') {
    return { color: value ? '#00E5B0' : '#EF4444' }
  }
  if (value instanceof Date ||
      (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))) {
    return { color: '#CE9178' }
  }
  return { color: '#C9D1D9' }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value instanceof Date && isValid(value)) return formatDate(value, 'yyyy-MM-dd HH:mm:ss')
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const parsed = parseISO(value)
    if (isValid(parsed)) return formatDate(parsed, 'yyyy-MM-dd HH:mm:ss')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// ── Component ─────────────────────────────────────────────────────────────────

async function exportExcel(rows: Record<string, unknown>[], fields: QueryField[], filename = 'results') {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Results')
  ws.columns = fields.map(f => ({ header: f.name, key: f.name, width: 16 }))
  rows.forEach(row => ws.addRow(row))
  ws.getRow(1).font = { bold: true }
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${filename}.xlsx`; a.click()
}

export default function ResultsGrid({
  rows, fields, rowCount, duration,
  running, connected, error, wasLimited, rowLimit,
}: Props) {

  const [zoom, setZoom] = useState(1)
  const [jsonModal, setJsonModal] = useState<{ title: string; content: string } | null>(null)
  const gridApiRef = useRef<GridApi | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey) return
    e.preventDefault()
    setZoom(z => Math.min(2, Math.max(0.5, z + (e.deltaY < 0 ? 0.1 : -0.1))))
  }, [])

  const columnDefs = useMemo<ColDef[]>(() => {
    if (!fields || fields.length === 0) return []
    return [
      // Row number column
      {
        headerName: '#',
        valueGetter: 'node.rowIndex + 1',
        width: 60,
        minWidth: 50,
        pinned: 'left' as const,
        sortable: false,
        filter: false,
        resizable: false,
        cellStyle: {
          color: 'rgba(255,255,255,0.25)',
          textAlign: 'right',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
        } as CellStyle,
      },
      // Data columns
      ...fields.map(field => ({
        field: field.name,
        headerName: field.name,
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 80,
        flex: 1,
        cellStyle: (params: { value: unknown }) => ({
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          ...getCellStyle(params.value),
        }),
        valueFormatter: (params: { value: unknown }) => formatValue(params.value),
        tooltipValueGetter: (params: ITooltipParams) => {
          if (params.value === null || params.value === undefined) return 'NULL'
          if (typeof params.value === 'object') return JSON.stringify(params.value, null, 2)
          return String(params.value)
        },
      })),
    ]
  }, [fields])

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 80,
  }), [])

  const onGridReady = useCallback((params: GridReadyEvent) => {
    gridApiRef.current = params.api
    params.api.sizeColumnsToFit()
  }, [])

  const getContextMenuItems = useCallback((params: GetContextMenuItemsParams): (MenuItemDef | string)[] => {
    const cellValue = params.value
    const rowData = params.node?.data as Record<string, unknown> | undefined
    return [
      {
        name: 'Copy Cell',
        action: () => { navigator.clipboard.writeText(cellValue != null ? String(cellValue) : '') },
        icon: '<span>⎘</span>',
      },
      {
        name: 'Copy Row as JSON',
        disabled: !rowData,
        action: () => { if (rowData) navigator.clipboard.writeText(JSON.stringify(rowData, null, 2)) },
        icon: '<span>{}</span>',
      },
      {
        name: 'Copy Row as CSV',
        disabled: !rowData,
        action: () => {
          if (!rowData) return
          const keys = fields.map(f => f.name)
          const values = keys.map(k => {
            const v = rowData[k]
            if (v === null || v === undefined) return ''
            const s = String(v)
            return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
          })
          navigator.clipboard.writeText(values.join(','))
        },
        icon: '<span>CSV</span>',
      },
      { separator: true, name: '' } as unknown as MenuItemDef,
      {
        name: 'Export Excel',
        action: () => exportExcel(rows, fields),
        icon: '<span>XLS</span>',
      },
      { separator: true, name: '' } as unknown as MenuItemDef,
      {
        name: 'View as JSON',
        disabled: !cellValue || typeof cellValue !== 'object' && !(typeof cellValue === 'string' && (cellValue.trim().startsWith('{') || cellValue.trim().startsWith('['))),
        action: () => {
          const raw = typeof cellValue === 'object' ? JSON.stringify(cellValue, null, 2) : String(cellValue ?? '')
          setJsonModal({ title: String(params.column?.getId() ?? 'JSON'), content: raw })
        },
        icon: '<span>{}</span>',
      },
    ]
  }, [rows, fields])

  // ── Empty / loading states ─────────────────────────────────────────────────

  if (!connected) {
    return (
      <div style={emptyStyle}>
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.15)" strokeWidth={1.5}>
          <path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
          Connect to a database to run queries
        </span>
      </div>
    )
  }

  if (running) {
    return (
      <div style={emptyStyle}>
        <div style={{
          width: 18, height: 18,
          border: '2px solid rgba(0,229,176,0.2)',
          borderTopColor: '#00E5B0',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <span style={{ fontSize: 12, color: '#8B949E' }}>Executing query…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 8, padding: '12px 16px',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#EF4444',
            marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>Query Error</div>
          <pre style={{
            margin: 0, fontSize: 12, color: '#FCA5A5',
            fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap',
            lineHeight: 1.6, userSelect: 'text',
          }}>{error}</pre>
        </div>
      </div>
    )
  }

  if (!rows || rows.length === 0) {
    return (
      <div style={emptyStyle}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.15)" strokeWidth={1.5}>
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="3" y1="15" x2="21" y2="15"/>
          <line x1="9" y1="9" x2="9" y2="21"/>
        </svg>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
          {rows ? 'Query executed. No rows returned.' : 'Results will appear here'}
        </span>
        {rows !== null && duration > 0 && (
          <span style={{ fontSize: 11, color: '#00E5B0', fontFamily: 'var(--font-mono)' }}>
            {duration}ms
          </span>
        )}
      </div>
    )
  }

  const displayCount = rowCount ?? rows.length

  return (
    <div ref={wrapperRef} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      onWheel={handleWheel}
    >

      {/* Row limit warning */}
      {wasLimited && (
        <div style={{
          background: 'rgba(234,179,8,0.08)',
          border: '1px solid rgba(234,179,8,0.25)',
          borderRadius: 6,
          margin: '6px 8px 0',
          padding: '6px 12px',
          fontSize: 11,
          color: '#EAB308',
          fontFamily: 'var(--font-body)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}>
          ⚠ Results limited to {rowLimit} rows. Add LIMIT to your query to see more.
        </div>
      )}

      {/* AG Grid */}
      <div
        className="ag-theme-balham-dark"
        style={{ flex: 1, width: '100%', minHeight: 0, fontSize: `${zoom * 11}px` }}
      >
        <AgGridReact
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          rowSelection="multiple"
          suppressRowClickSelection={false}
          enableCellTextSelection={true}
          tooltipShowDelay={300}
          domLayout="normal"
          suppressMovableColumns={false}
          animateRows={false}
          rowHeight={Math.round(26 * zoom)}
          headerHeight={Math.round(32 * zoom)}
          overlayNoRowsTemplate="<span style='color:rgba(255,255,255,0.3)'>No rows</span>"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          getContextMenuItems={getContextMenuItems as any}
        />
      </div>

      {/* Footer status */}
      <div style={{
        height: 24, background: '#161B22',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 16, flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#8B949E' }}>
          <span style={{ color: '#00E5B0', fontWeight: 600 }}>
            {displayCount.toLocaleString()}
          </span>
          {' '}row{displayCount !== 1 ? 's' : ''}
        </span>
        {duration > 0 && (
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#484F58' }}>
            {duration}ms
          </span>
        )}
        {zoom !== 1 && (
          <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)', color: '#484F58', cursor: 'pointer' }}
            onClick={() => setZoom(1)} title="Reset zoom (click)">
            {Math.round(zoom * 100)}% ×
          </span>
        )}
        <span style={{ marginLeft: zoom !== 1 ? 0 : 'auto', fontSize: 10, color: '#2a2f38', fontFamily: 'var(--font-body)' }}>Ctrl+Scroll to zoom</span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }

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
          --ag-cell-horizontal-padding: 12px;
          --ag-header-column-separator-color: rgba(255,255,255,0.07);
          --ag-row-border-color: rgba(255,255,255,0.04);
          --ag-range-selection-border-color: #00E5B0;
          --ag-input-focus-border-color: #00E5B0;
        }

        .ag-theme-balham-dark .ag-header-cell-text {
          font-family: var(--font-body);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #8B949E;
        }

        .ag-theme-balham-dark .ag-row-selected {
          background-color: rgba(0,229,176,0.06) !important;
        }
      `}</style>

      {/* JSON Viewer Modal */}
      {jsonModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9995, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setJsonModal(null)}
        >
          <div
            style={{ width: 540, maxHeight: '80vh', background: '#161B22', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, boxShadow: '0 20px 60px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#8B949E', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{jsonModal.title}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => navigator.clipboard.writeText(jsonModal.content)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#8B949E', padding: '3px 10px', fontSize: 10, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >⎘ Copy</button>
                <button
                  onClick={() => setJsonModal(null)}
                  style={{ background: 'none', border: 'none', color: '#484F58', cursor: 'pointer', fontSize: 16 }}
                >×</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 200 }}>
              <JsonViewer content={jsonModal.content} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const emptyStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  height: '100%', gap: 10,
  background: '#0D1117',
}
