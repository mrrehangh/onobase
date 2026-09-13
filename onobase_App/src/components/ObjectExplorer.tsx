import { useState, useMemo, useEffect } from 'react'

interface RawColumn {
  table_schema: string; table_name: string
  column_name: string; data_type: string
  is_nullable: string; is_pk: boolean
}
interface RawTable { table_schema: string; table_name: string }

export interface SchemaData {
  tables: RawTable[]
  columns: RawColumn[]
  fkRelations: {
    source_schema: string; source_table: string; source_column: string
    target_schema: string; target_table: string; target_column: string
  }[]
}

interface Props {
  connection: { dbName: string; host: string; port: number } | null
  schema: SchemaData | null
  assignedTableIds: Set<string>
  moduleColors: Map<string, { name: string; hex: string }>
  onViewData?: (schema: string, table: string) => void
  onOpenScript?: (sql: string, title: string) => void
  onDesignTable?: (schema: string, table: string) => void
  onImportCsv?: () => void
  onGenerateData?: (schema: string, table: string) => void
}

// ── SVG Icons ──────────────────────────────────────────────────────────────

const IconChevron = ({ open }: { open: boolean }) => (
  <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', color: '#8B949E' }}>
    <path d="M9 18l6-6-6-6" />
  </svg>
)

const IconServer = () => (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
    <rect x="2" y="3" width="20" height="5" rx="1" />
    <rect x="2" y="10" width="20" height="5" rx="1" />
    <rect x="2" y="17" width="20" height="5" rx="1" />
    <circle cx="19" cy="5.5" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12.5" r="0.8" fill="currentColor" stroke="none" />
  </svg>
)

const IconDatabase = () => (
  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v5c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
    <path d="M3 10v5c0 1.657 4.03 3 9 3s9-1.343 9-3v-5" />
  </svg>
)

const IconFolder = () => (
  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
)

const IconTable = () => (
  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="9" x2="9" y2="21" />
  </svg>
)

const IconKey = () => (
  <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <circle cx="8" cy="8" r="3" />
    <path d="M11 8h9M17 8v3" />
  </svg>
)

// ── Component ──────────────────────────────────────────────────────────────

export default function ObjectExplorer({
  connection, schema, assignedTableIds, moduleColors,
  onViewData, onOpenScript, onDesignTable,
  onImportCsv, onGenerateData,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['server', 'db']))
  const [search, setSearch] = useState('')

  // ── DB object states ─────────────────────────────────────────────────────
  type ObjRow = { schema_name: string; object_name: string }
  const [views,      setViews]      = useState<ObjRow[]>([])
  const [procedures, setProcedures] = useState<ObjRow[]>([])
  const [functions,  setFunctions]  = useState<ObjRow[]>([])
  const [triggers,   setTriggers]   = useState<ObjRow[]>([])
  const [users,      setUsers]      = useState<ObjRow[]>([])
  const [roles,      setRoles]      = useState<ObjRow[]>([])

  useEffect(() => {
    if (!connection) {
      setViews([]); setProcedures([]); setFunctions([])
      setTriggers([]); setUsers([]); setRoles([])
      return
    }
    window.electronAPI.getObjects('views')      .then(r => { if (r.ok) setViews(r.objects) })
    window.electronAPI.getObjects('procedures') .then(r => { if (r.ok) setProcedures(r.objects) })
    window.electronAPI.getObjects('functions')  .then(r => { if (r.ok) setFunctions(r.objects) })
    window.electronAPI.getObjects('triggers')   .then(r => { if (r.ok) setTriggers(r.objects) })
    window.electronAPI.getObjects('users')      .then(r => { if (r.ok) setUsers(r.objects) })
    window.electronAPI.getObjects('roles')      .then(r => { if (r.ok) setRoles(r.objects) })
  }, [connection])

  // ── Context menu state ───────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<{
    tableId: string; tableName: string; schemaName: string; x: number; y: number
  } | null>(null)

  useEffect(() => {
    if (!ctxMenu) return
    const handler = () => setCtxMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [ctxMenu])

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const tree = useMemo(() => {
    if (!schema) return null
    const map = new Map<string, Map<string, RawColumn[]>>()
    for (const col of schema.columns) {
      if (!map.has(col.table_schema)) map.set(col.table_schema, new Map())
      const tmap = map.get(col.table_schema)!
      if (!tmap.has(col.table_name)) tmap.set(col.table_name, [])
      tmap.get(col.table_name)!.push(col)
    }
    return map
  }, [schema])

  const q = search.toLowerCase()

  // ── Not connected state ──────────────────────────────────────────────────

  if (!connection) {
    return (
      <div style={{
        width: 240, flexShrink: 0,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: 20, textAlign: 'center',
      }}>
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} strokeLinecap="round">
          <path d="M12 2v4M8 6H4v4h4M20 6h-4v4h4M12 10v4M8 14a4 4 0 008 0" />
          <path d="M12 18v4" />
        </svg>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
          Not connected
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)', opacity: 0.6, lineHeight: 1.5 }}>
          Connect to a database<br />to explore its schema
        </div>
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div style={{
      width: 240, flexShrink: 0,
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 7,
        }}>
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 10, fontWeight: 700,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Object Explorer
          </span>
          {onImportCsv && (
            <button
              onClick={onImportCsv}
              title="Import CSV"
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: 'rgba(0,229,176,0.06)',
                border: '1px solid rgba(0,229,176,0.25)',
                borderRadius: 4, color: '#00E5B0',
                padding: '2px 7px', fontSize: 10,
                fontFamily: 'var(--font-body)', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,229,176,0.14)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,229,176,0.06)' }}
            >
              ↑ Import
            </button>
          )}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter tables…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: 5, padding: '5px 8px',
            fontSize: 11, fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
            outline: 'none', transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
          onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />
      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>

        {/* Server row */}
        <TreeRow depth={0} open={expanded.has('server')} onClick={() => toggle('server')}
          icon={<IconServer />}
          label={`${connection.host}:${connection.port}`}
        />

        {expanded.has('server') && (
          <>
            {/* Database row */}
            <TreeRow depth={1} open={expanded.has('db')} onClick={() => toggle('db')}
              icon={<IconDatabase />}
              label={connection.dbName}
              accent="var(--accent)"
            />

            {expanded.has('db') && tree && [...tree.entries()].map(([schemaName, tableMap]) => {
              const schId = `s:${schemaName}`
              const tabId = `t:${schemaName}`

              const matching = [...tableMap.entries()].filter(([tName]) =>
                !q || tName.toLowerCase().includes(q) || schemaName.toLowerCase().includes(q)
              )
              if (q && matching.length === 0) return null

              return (
                <div key={schemaName}>
                  <TreeRow depth={2} open={expanded.has(schId)} onClick={() => toggle(schId)}
                    icon={<IconFolder />}
                    label={schemaName}
                    muted
                  />

                  {expanded.has(schId) && (
                    <>
                      <TreeRow depth={3} open={expanded.has(tabId)} onClick={() => toggle(tabId)}
                        icon={<IconFolder />}
                        label="Tables"
                        badge={String(matching.length)}
                        muted
                      />

                      {/* Views */}
                      {(() => {
                        const schViews = views.filter(v => v.schema_name === schemaName)
                        if (schViews.length === 0) return null
                        const vid = `views:${schemaName}`
                        return (
                          <>
                            <TreeRow depth={3} open={expanded.has(vid)} onClick={() => toggle(vid)}
                              icon={<IconFolder />} label="Views" badge={String(schViews.length)} muted />
                            {expanded.has(vid) && schViews.map(v => (
                              <LeafRow key={v.object_name} depth={4} label={v.object_name} />
                            ))}
                          </>
                        )
                      })()}

                      {/* Procedures */}
                      {(() => {
                        const schProcs = procedures.filter(v => v.schema_name === schemaName)
                        if (schProcs.length === 0) return null
                        const pid = `procs:${schemaName}`
                        return (
                          <>
                            <TreeRow depth={3} open={expanded.has(pid)} onClick={() => toggle(pid)}
                              icon={<IconFolder />} label="Procedures" badge={String(schProcs.length)} muted />
                            {expanded.has(pid) && schProcs.map(v => (
                              <LeafRow key={v.object_name} depth={4} label={v.object_name} />
                            ))}
                          </>
                        )
                      })()}

                      {/* Functions */}
                      {(() => {
                        const schFns = functions.filter(v => v.schema_name === schemaName)
                        if (schFns.length === 0) return null
                        const fid = `fns:${schemaName}`
                        return (
                          <>
                            <TreeRow depth={3} open={expanded.has(fid)} onClick={() => toggle(fid)}
                              icon={<IconFolder />} label="Functions" badge={String(schFns.length)} muted />
                            {expanded.has(fid) && schFns.map(v => (
                              <LeafRow key={v.object_name} depth={4} label={v.object_name} />
                            ))}
                          </>
                        )
                      })()}

                      {/* Triggers */}
                      {(() => {
                        const schTrigs = triggers.filter(v => v.schema_name === schemaName)
                        if (schTrigs.length === 0) return null
                        const trid = `trigs:${schemaName}`
                        return (
                          <>
                            <TreeRow depth={3} open={expanded.has(trid)} onClick={() => toggle(trid)}
                              icon={<IconFolder />} label="Triggers" badge={String(schTrigs.length)} muted />
                            {expanded.has(trid) && schTrigs.map(v => (
                              <LeafRow key={v.object_name} depth={4} label={v.object_name} />
                            ))}
                          </>
                        )
                      })()}

                      {/* Tables */}
                      {expanded.has(tabId) && matching.map(([tableName, cols]) => {
                        const tableId = `${schemaName}.${tableName}`
                        const tNodeId = `n:${tableId}`
                        const assigned = assignedTableIds.has(tableId)
                        const mod = moduleColors.get(tableId)

                        return (
                          <div key={tableName}>
                            <DraggableTableRow
                              depth={4}
                              tableName={tableName}
                              tableId={tableId}
                              assigned={assigned}
                              mod={mod}
                              colCount={cols.length}
                              open={expanded.has(tNodeId)}
                              onToggle={() => toggle(tNodeId)}
                              onCtxMenu={(x, y) => setCtxMenu({ tableId, tableName, schemaName, x, y })}
                            />
                            {expanded.has(tNodeId) && cols.map(col => (
                              <div key={col.column_name} style={{
                                display: 'flex', alignItems: 'center',
                                paddingLeft: 8 + 5 * 12, paddingRight: 8,
                                paddingTop: 2, paddingBottom: 2, gap: 5,
                              }}>
                                <span style={{ width: 8, flexShrink: 0, color: col.is_pk ? '#EAB308' : 'rgba(255,255,255,0.2)' }}>
                                  {col.is_pk ? <IconKey /> : <span style={{ fontSize: 7 }}>·</span>}
                                </span>
                                <span style={{
                                  fontSize: 10, fontFamily: 'var(--font-mono)',
                                  color: col.is_pk ? 'var(--text-mono)' : 'var(--text-secondary)',
                                  fontWeight: col.is_pk ? 500 : 300,
                                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {col.column_name}
                                </span>
                                <span style={{
                                  fontSize: 9, fontFamily: 'var(--font-mono)', fontStyle: 'italic',
                                  color: 'rgba(255,255,255,0.22)',
                                  background: 'rgba(255,255,255,0.04)',
                                  borderRadius: 3, padding: '1px 4px', flexShrink: 0,
                                }}>
                                  {col.data_type
                                    .replace('character varying', 'varchar')
                                    .replace('timestamp without time zone', 'ts')
                                    .replace('timestamp with time zone', 'tstz')
                                    .replace('integer', 'int4')
                                    .replace('bigint', 'int8')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              )
            })}

            {/* Users */}
            {users.length > 0 && (() => {
              const uid = 'users'
              return (
                <>
                  <TreeRow depth={2} open={expanded.has(uid)} onClick={() => toggle(uid)}
                    icon={<IconFolder />} label="Users" badge={String(users.length)} muted />
                  {expanded.has(uid) && users.map(u => (
                    <LeafRow key={u.object_name} depth={3} label={u.object_name} />
                  ))}
                </>
              )
            })()}

            {/* Roles */}
            {roles.length > 0 && (() => {
              const rid = 'roles'
              return (
                <>
                  <TreeRow depth={2} open={expanded.has(rid)} onClick={() => toggle(rid)}
                    icon={<IconFolder />} label="Roles" badge={String(roles.length)} muted />
                  {expanded.has(rid) && roles.map(r => (
                    <LeafRow key={r.object_name} depth={3} label={r.object_name} />
                  ))}
                </>
              )
            })()}
          </>
        )}
      </div>

      {/* Drag hint */}
      {schema && (
        <div style={{
          padding: '7px 10px',
          borderTop: '1px solid var(--border)',
          fontSize: 10, fontFamily: 'var(--font-body)',
          color: 'var(--text-secondary)', lineHeight: 1.5,
          opacity: 0.7,
        }}>
          Drag a table onto a module to assign it.
        </div>
      )}

      {/* Context menu */}
      {ctxMenu && (
        <div
          style={{
            position: 'fixed', zIndex: 9999,
            left: ctxMenu.x, top: ctxMenu.y,
            background: '#161B22',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            padding: '4px 0',
            minWidth: 200,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            padding: '5px 12px 4px', fontSize: 9,
            color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 4,
          }}>
            {ctxMenu.schemaName}.{ctxMenu.tableName}
          </div>

          <CtxItem label="View Data" icon="⬡" onClick={() => {
            onViewData?.(ctxMenu.schemaName, ctxMenu.tableName)
            setCtxMenu(null)
          }} />

          {onGenerateData && (
            <CtxItem label="Generate Test Data" icon="✦" onClick={() => {
              onGenerateData(ctxMenu.schemaName, ctxMenu.tableName)
              setCtxMenu(null)
            }} />
          )}

          {onDesignTable && (
            <CtxItem label="Design Table" icon="⊞" onClick={() => {
              onDesignTable(ctxMenu.schemaName, ctxMenu.tableName)
              setCtxMenu(null)
            }} />
          )}

          <CtxDivider label="Script Table As" />

          {(['SELECT', 'INSERT', 'CREATE', 'DROP', 'ALTER'] as const).map(label => (
            <CtxItem key={label} label={label} icon="…" onClick={async () => {
              const result = await window.electronAPI.scriptObject({
                objectType: 'table',
                schemaName: ctxMenu.schemaName,
                objectName: ctxMenu.tableName,
                scriptType: label.toLowerCase() as 'select' | 'insert' | 'create' | 'drop' | 'alter',
              })
              if (result.ok) {
                onOpenScript?.(result.sql, `Script: ${ctxMenu.tableName}`)
              }
              setCtxMenu(null)
            }} />
          ))}

          <CtxDivider />
          <CtxItem label="Copy Table Name" icon="⎘" onClick={() => {
            navigator.clipboard.writeText(`"${ctxMenu.schemaName}"."${ctxMenu.tableName}"`)
            setCtxMenu(null)
          }} />
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LeafRow({ depth, label }: { depth: number; label: string }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center',
        paddingLeft: 8 + depth * 12, paddingRight: 8,
        paddingTop: 2, paddingBottom: 2,
        background: hover ? 'rgba(255,255,255,0.03)' : 'transparent',
        userSelect: 'none',
      }}
    >
      <span style={{ width: 14, flexShrink: 0, fontSize: 8, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>·</span>
      <span style={{
        fontSize: 10, fontFamily: 'var(--font-mono)',
        color: 'var(--text-secondary)',
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </div>
  )
}

function TreeRow({ depth, open, icon, label, badge, muted, accent, onClick }: {
  depth: number; open: boolean; icon: React.ReactNode; label: string
  badge?: string; muted?: boolean; accent?: string; onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center',
        paddingLeft: 8 + depth * 12, paddingRight: 8,
        paddingTop: 3, paddingBottom: 3,
        cursor: 'pointer',
        background: hover ? 'rgba(255,255,255,0.04)' : 'transparent',
        gap: 5, userSelect: 'none',
        transition: 'background 0.1s',
      }}
    >
      <IconChevron open={open} />
      <span style={{ color: accent ?? (muted ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.55)'), flexShrink: 0 }}>
        {icon}
      </span>
      <span style={{
        fontSize: 11, fontFamily: 'var(--font-body)',
        color: accent ?? (muted ? 'var(--text-secondary)' : 'var(--text-mono)'),
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      {badge && (
        <span style={{
          fontSize: 9, fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 3, padding: '1px 4px', flexShrink: 0,
        }}>
          {badge}
        </span>
      )}
    </div>
  )
}

function DraggableTableRow({ depth, tableName, tableId, assigned, mod, colCount, open, onToggle, onCtxMenu }: {
  depth: number; tableName: string; tableId: string
  assigned: boolean; mod?: { name: string; hex: string }
  colCount: number; open: boolean; onToggle: () => void
  onCtxMenu?: (x: number, y: number) => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      draggable={true}
      onDragStart={e => {
        e.dataTransfer.setData('onobase/tableId', tableId)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      onClick={onToggle}
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onCtxMenu?.(e.clientX, e.clientY) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center',
        paddingLeft: 8 + depth * 12, paddingRight: 8,
        paddingTop: 3, paddingBottom: 3,
        cursor: 'grab',
        background: hover ? 'rgba(255,255,255,0.04)' : 'transparent',
        gap: 5, userSelect: 'none',
        transition: 'background 0.1s',
      }}
    >
      <IconChevron open={open} />
      <span style={{ color: assigned && mod ? mod.hex : 'rgba(255,255,255,0.45)', flexShrink: 0 }}>
        <IconTable />
      </span>
      <span style={{
        fontSize: 11, fontFamily: 'var(--font-mono)',
        color: 'var(--text-mono)',
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {tableName}
      </span>
      {assigned && mod ? (
        <span style={{
          fontSize: 9, fontFamily: 'var(--font-body)',
          color: mod.hex, background: `${mod.hex}1A`,
          border: `1px solid ${mod.hex}35`,
          borderRadius: 3, padding: '1px 5px', flexShrink: 0,
          maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={`In module: ${mod.name}`}>
          {mod.name}
        </span>
      ) : (
        <span style={{
          fontSize: 9, fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 3, padding: '1px 4px', flexShrink: 0,
        }}>
          {colCount}
        </span>
      )}
    </div>
  )
}

function CtxItem({ label, icon, onClick }: {
  label: string; icon: string; onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '6px 14px', fontSize: 12, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
        background: hover ? 'rgba(255,255,255,0.05)' : 'transparent',
        color: 'var(--text-mono)', fontFamily: 'var(--font-body)',
      }}
    >
      <span style={{ width: 14, textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)' }}>
        {icon}
      </span>
      {label}
    </div>
  )
}

function CtxDivider({ label }: { label?: string }) {
  return (
    <div style={{
      height: 1, background: 'rgba(255,255,255,0.07)',
      margin: label ? '8px 0 4px' : '3px 0', position: 'relative',
    }}>
      {label && (
        <span style={{
          position: 'absolute', left: 12, top: -8, fontSize: 9,
          color: 'var(--text-secondary)', background: '#161B22',
          padding: '0 4px', fontFamily: 'var(--font-body)', letterSpacing: '0.06em',
        }}>{label}</span>
      )}
    </div>
  )
}
