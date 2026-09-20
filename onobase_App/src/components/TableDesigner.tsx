import { useState, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-balham.css'
import type { ColDef, GridReadyEvent, ICellRendererParams } from 'ag-grid-community'

interface ColumnDef {
  id: string
  name: string
  type: string
  length: string
  nullable: boolean
  default: string
  isPk: boolean
  isUnique: boolean
  comment: string
}

interface Props {
  schema: string
  table: string
}

const PG_TYPES = [
  'bigint', 'bigserial', 'boolean', 'bytea', 'character varying', 'date',
  'double precision', 'integer', 'json', 'jsonb', 'numeric', 'real',
  'serial', 'smallint', 'text', 'timestamp', 'timestamptz', 'uuid', 'varchar',
]

function makeRow(overrides: Partial<ColumnDef> = {}): ColumnDef {
  return {
    id: `col_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name: '', type: 'text', length: '', nullable: true,
    default: '', isPk: false, isUnique: false, comment: '',
    ...overrides,
  }
}

function CheckboxRenderer(props: ICellRendererParams) {
  const checked = !!props.value
  return (
    <input type="checkbox" checked={checked}
      style={{ accentColor: '#00E5B0', cursor: 'pointer' }}
      onChange={() => {
        props.node.setDataValue(props.colDef?.field ?? '', !checked)
      }}
    />
  )
}

function TypeSelectRenderer(props: ICellRendererParams) {
  return (
    <select
      value={props.value}
      style={{
        background: '#0D1117', border: 'none', color: '#C9D1D9',
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11, width: '100%',
        outline: 'none', cursor: 'pointer',
      }}
      onChange={e => props.node.setDataValue(props.colDef?.field ?? '', e.target.value)}
    >
      {PG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
  )
}

const COLUMN_DEFS: ColDef[] = [
  { field: 'isPk',     headerName: 'PK',       width: 50,  cellRenderer: CheckboxRenderer, cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } },
  { field: 'name',     headerName: 'Column Name', width: 160, editable: true },
  { field: 'type',     headerName: 'Data Type',  width: 150, cellRenderer: TypeSelectRenderer },
  { field: 'length',   headerName: 'Length',     width: 80,  editable: true },
  { field: 'nullable', headerName: 'Nullable',   width: 80,  cellRenderer: CheckboxRenderer, cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } },
  { field: 'isUnique', headerName: 'Unique',     width: 80,  cellRenderer: CheckboxRenderer, cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' } },
  { field: 'default',  headerName: 'Default',    width: 120, editable: true },
  { field: 'comment',  headerName: 'Comment',    flex: 1,    editable: true },
]

function buildSQL(schema: string, table: string, cols: ColumnDef[]): string {
  if (cols.length === 0) return '-- Add columns first'
  const pkCols = cols.filter(c => c.isPk).map(c => c.name)
  const lines = cols.map(c => {
    const len = c.length ? `(${c.length})` : ''
    const nullable = c.nullable ? '' : ' NOT NULL'
    const def = c.default ? ` DEFAULT ${c.default}` : ''
    const unique = c.isUnique && !c.isPk ? ' UNIQUE' : ''
    return `  ${c.name || '<name>'} ${c.type}${len}${nullable}${def}${unique}`
  })
  if (pkCols.length > 0) lines.push(`  PRIMARY KEY (${pkCols.join(', ')})`)
  return `CREATE TABLE IF NOT EXISTS ${schema}.${table} (\n${lines.join(',\n')}\n);`
}

export default function TableDesigner({ schema, table }: Props) {
  const [rows, setRows] = useState<ColumnDef[]>([
    makeRow({ name: 'id', type: 'bigserial', nullable: false, isPk: true }),
  ])
  const [activeTab, setActiveTab] = useState<'grid' | 'sql'>('grid')
  const [copied, setCopied] = useState(false)

  const addRow = useCallback(() => {
    setRows(r => [...r, makeRow()])
  }, [])

  const deleteSelected = useCallback((api: unknown) => {
    void api
  }, [])
  void deleteSelected

  const [gridApi, setGridApi] = useState<GridReadyEvent['api'] | null>(null)

  const onGridReady = (e: GridReadyEvent) => {
    setGridApi(e.api)
    e.api.sizeColumnsToFit()
  }

  const onCellValueChanged = useCallback(() => {
    if (!gridApi) return
    const newRows: ColumnDef[] = []
    gridApi.forEachNode(n => newRows.push(n.data as ColumnDef))
    setRows(newRows)
  }, [gridApi])

  const deleteRow = useCallback(() => {
    if (!gridApi) return
    const selected = gridApi.getSelectedRows() as ColumnDef[]
    if (selected.length === 0) return
    const ids = new Set(selected.map(r => r.id))
    setRows(prev => prev.filter(r => !ids.has(r.id)))
  }, [gridApi])

  const sql = buildSQL(schema, table, rows)

  const copySQL = async () => {
    await navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const tabBtn = (t: 'grid' | 'sql'): React.CSSProperties => ({
    background: 'transparent', border: 'none',
    borderBottom: activeTab === t ? '2px solid #00E5B0' : '2px solid transparent',
    color: activeTab === t ? '#00E5B0' : '#484F58',
    padding: '5px 14px', fontSize: 11, cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0D1117' }}>

      {/* Header */}
      <div style={{
        height: 38, background: '#161B22',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 10, flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#C9D1D9', fontFamily: 'var(--font-body)' }}>
          Table Designer — <span style={{ color: '#00E5B0', fontFamily: 'var(--font-mono)' }}>{schema}.{table}</span>
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={addRow}
            style={{ background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.3)', borderRadius: 5, color: '#00E5B0', padding: '3px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            + Add Column
          </button>
          <button onClick={deleteRow} disabled={!gridApi}
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 5, color: '#EF4444', padding: '3px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Delete Selected
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <button style={tabBtn('grid')} onClick={() => setActiveTab('grid')}>Columns</button>
        <button style={tabBtn('sql')}  onClick={() => setActiveTab('sql')}>Generated SQL</button>
      </div>

      {/* Content */}
      {activeTab === 'grid' ? (
        <div className="ag-theme-balham-dark" style={{ flex: 1, overflow: 'hidden' }}>
          <AgGridReact
            rowData={rows}
            columnDefs={COLUMN_DEFS}
            rowSelection="single"
            singleClickEdit
            onGridReady={onGridReady}
            onCellValueChanged={onCellValueChanged}
            defaultColDef={{ resizable: true }}
            getRowId={p => (p.data as ColumnDef).id}
          />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={copySQL}
              style={{ background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.3)', borderRadius: 5, color: '#00E5B0', padding: '3px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              {copied ? '✓ Copied!' : '⎘ Copy SQL'}
            </button>
          </div>
          <pre style={{
            flex: 1, overflowY: 'auto',
            fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
            fontSize: 12, color: '#C9D1D9', lineHeight: 1.7,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 6, padding: 16, margin: 0,
          }}>
            {sql}
          </pre>
        </div>
      )}
    </div>
  )
}
