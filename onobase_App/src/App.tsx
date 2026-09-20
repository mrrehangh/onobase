import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Database, Plus, Zap, Share2, Unplug, Maximize2, Minimize2, Search, GitCompare, History, Server, HeartPulse } from 'lucide-react'
import Canvas from './components/Canvas'
import ConnectDialog from './components/ConnectDialog'
import ObjectExplorer, { type SchemaData } from './components/ObjectExplorer'
import QueryEditor from './components/QueryEditor'
import TabBar from './components/TabBar'
import DiagramView from './components/DiagramView'
import DataViewer from './components/DataViewer'
import ActivityMonitor from './components/ActivityMonitor'
import TableDesigner from './components/TableDesigner'
import AIAssistant from './components/AIAssistant'
import GitPanel from './components/GitPanel'
import GlobalSearch from './components/GlobalSearch'
import CsvImportWizard from './components/CsvImportWizard'
import FakeDataGenerator from './components/FakeDataGenerator'
import SchemaComparison from './components/SchemaComparison'
import QueryLog from './components/QueryLog'
import ConnectionManager from './components/ConnectionManager'
import HealthDashboard from './components/HealthDashboard'
import SaveDialog from './components/SaveDialog'
import { THEMES, applyTheme } from './utils/themes'
import ModuleNameDialog from './components/ModuleNameDialog'
import Settings from './components/Settings'
import Toast from './components/Toast'
import StatusBar from './components/StatusBar/StatusBar'
import { useModuleStore } from './store/useModuleStore'
import { useAppStore } from './store/useAppStore'
import { MODULE_COLORS, getModuleColor } from './utils/colors'
import type { OnoModule, TableInfo, FKRelation, Connection } from './types'

// ── Bridge: store Module → OnoModule ─────────────────────────────────────────
function storeModToOnoModule(m: ReturnType<typeof useModuleStore.getState>['modules'][number]): OnoModule {
  const c = getModuleColor(m.colorId, m.customHex)
  return {
    id: m.id, name: m.name, cid: c.id,
    x: m.position.x, y: m.position.y,
    width: m.size.width, height: m.size.height,
    collapsed: m.collapsed,
    tableIds: m.tableIds,
    tablePositions: m.tablePositions as Record<string, { x: number; y: number }>,
    conn: m.connections,
    customHex: m.customHex,
  }
}

interface AppConnection { dbName: string; host: string; port: number; color: string }

// ── Pending close state (for save dialog) ─────────────────────────────────────
interface PendingClose { tabId: string; tabTitle: string }

export default function App() {
  // ── Stores ─────────────────────────────────────────────────────────────────
  const {
    modules: storeModules, selectedModuleId, toasts: storToasts,
    addModule: storeAddModule, updateModule: storeUpdateModule,
    setSelectedModule, reset, dismissToast,
  } = useModuleStore()

  const {
    tabs, activeTabId,
    addTab, closeTab, setActiveTab, setTabDirty,
    showToast, toasts: appToasts,
    isPresentationMode, togglePresentationMode,
  } = useAppStore()

  // ── Connection state ───────────────────────────────────────────────────────
  const [connection, setConnection]   = useState<AppConnection | null>(null)
  const [rawSchema, setRawSchema]     = useState<SchemaData | null>(null)
  const [fkRelations, setFkRelations] = useState<FKRelation[]>([])
  const [showConnect, setShowConnect] = useState(false)
  const [showSettings, setShowSettings]         = useState(false)
  const [showAI, setShowAI]                     = useState(false)
  const [showGit, setShowGit]                   = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)
  const [showImport, setShowImport]             = useState(false)
  const [showFakeData, setShowFakeData]         = useState(false)
  const [fakeDataTarget, setFakeDataTarget]     = useState<{ schema: string; table: string } | null>(null)
  const [sshActive, setSshActive]               = useState(false)
  const [showModuleDialog, setShowModuleDialog] = useState(false)
  const [schemaLoading, setSchemaLoading]       = useState(false)

  // ── Layout save timer ──────────────────────────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!connection) return
    const key = `${connection.host}:${connection.port}/${connection.dbName}`
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      useModuleStore.getState().saveLayout(key)
    }, 1000)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [storeModules, connection])

  // ── Connection pulse ───────────────────────────────────────────────────────
  const [connectionPulse, setConnectionPulse] = useState(false)

  // ── Save dialog (pending close) ────────────────────────────────────────────
  const [pendingClose, setPendingClose] = useState<PendingClose | null>(null)

  // ── Colour picker ──────────────────────────────────────────────────────────
  const [showColourPicker, setShowColourPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showColourPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowColourPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColourPicker])

  useEffect(() => { setShowColourPicker(false) }, [selectedModuleId])

  // ── Bridge modules ─────────────────────────────────────────────────────────
  const modules = useMemo<OnoModule[]>(() => storeModules.map(storeModToOnoModule), [storeModules])
  const selectedModule = modules.find(m => m.id === selectedModuleId) ?? null

  const selectedStoreMod = selectedModuleId
    ? storeModules.find(m => m.id === selectedModuleId) ?? null
    : null
  const selectedColour = selectedStoreMod
    ? getModuleColor(selectedStoreMod.colorId, selectedStoreMod.customHex)
    : null

  // ── Table data ─────────────────────────────────────────────────────────────
  const tableData = useMemo<Map<string, TableInfo>>(() => {
    if (!rawSchema) return new Map()
    const fkSet = new Set(fkRelations.map(fk => `${fk.source_schema}.${fk.source_table}.${fk.source_column}`))
    const map = new Map<string, TableInfo>()
    for (const col of rawSchema.columns) {
      const key = `${col.table_schema}.${col.table_name}`
      if (!map.has(key)) map.set(key, { schema: col.table_schema, name: col.table_name, cols: [] })
      map.get(key)!.cols.push({
        name: col.column_name,
        type: col.data_type,
        isPk: col.is_pk,
        isFk: fkSet.has(`${col.table_schema}.${col.table_name}.${col.column_name}`),
        isNullable: col.is_nullable === 'YES',
      })
    }
    return map
  }, [rawSchema, fkRelations])

  const assignedTableIds = useMemo<Set<string>>(() => {
    const set = new Set<string>()
    for (const mod of storeModules) mod.tableIds.forEach(id => set.add(id))
    return set
  }, [storeModules])

  const moduleColors = useMemo<Map<string, { name: string; hex: string }>>(() => {
    const map = new Map<string, { name: string; hex: string }>()
    for (const mod of storeModules) {
      const color = MODULE_COLORS.find(c => c.id === mod.colorId) ?? MODULE_COLORS[0]
      mod.tableIds.forEach(id => map.set(id, { name: mod.name, hex: color.hex }))
    }
    return map
  }, [storeModules])

  const statusConnection = useMemo<Connection | null>(() => {
    if (!connection) return null
    return {
      id: 'active', name: connection.dbName, type: 'postgresql',
      host: connection.host, port: connection.port,
      database: connection.dbName, username: '',
      ssl: false, status: 'connected',
    }
  }, [connection])

  // ── Toast bridge ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (storToasts.length > 0) {
      const t = storToasts[storToasts.length - 1]
      showToast(t.message, t.type as 'warning' | 'info' | 'error')
      dismissToast(t.id)
    }
  }, [storToasts, showToast, dismissToast])

  // ── Apply saved theme on mount ────────────────────────────────────────────
  useEffect(() => {
    const { themeId } = useAppStore.getState()
    const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]
    applyTheme(theme)
  }, [])

  // ── Presentation mode F11 shortcut ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F11') { e.preventDefault(); togglePresentationMode() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePresentationMode])

  // ── Global search Ctrl+Shift+F shortcut ───────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        setShowGlobalSearch(v => !v)
      }
      if (e.key === 'Escape') setShowGlobalSearch(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Generate test data handler ────────────────────────────────────────────
  const handleGenerateData = useCallback((schema: string, table: string) => {
    setFakeDataTarget({ schema, table })
    setShowFakeData(true)
  }, [])

  // ── Connection handlers ────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async () => {
    await window.electronAPI.disconnectDB()
    if (sshActive) { await window.electronAPI.sshDisconnect(); setSshActive(false) }
    setConnection(null); setRawSchema(null); setFkRelations([])
    reset()
  }, [reset, sshActive])

  const handleConnected = useCallback(async (dbName: string, host: string, port: number, color: string, sshConnected = false) => {
    setSshActive(sshConnected)
    setShowConnect(false)
    setConnection({ dbName, host, port, color })
    reset()
    setConnectionPulse(true)
    setTimeout(() => setConnectionPulse(false), 1200)
    setSchemaLoading(true)
    try {
      const result = await window.electronAPI.getSchema()
      if (result.ok) {
        setRawSchema({ tables: result.tables, columns: result.columns, fkRelations: result.fkRelations })
        setFkRelations(result.fkRelations)
      }
      const layoutKey = `${host}:${port}/${dbName}`
      await useModuleStore.getState().loadLayout(layoutKey)
    } catch { /* non-fatal */ }
    finally { setSchemaLoading(false) }
  }, [reset])

  // ── View data handler ──────────────────────────────────────────────────────
  const handleViewData = useCallback((schema: string, table: string) => {
    addTab('dataview', { title: `${schema}.${table}`, tableRef: { schema, table } })
  }, [addTab])

  // ── Tab close handling (dirty check) ──────────────────────────────────────
  const handleCloseTab = useCallback((id: string) => {
    const tab = tabs.find(t => t.id === id)
    if (!tab) return
    if (tab.isDirty) {
      setPendingClose({ tabId: id, tabTitle: tab.title })
    } else {
      closeTab(id)
    }
  }, [tabs, closeTab])

  const handleSaveAndClose = useCallback(async () => {
    if (!pendingClose) return
    // find the tab's content
    const tab = tabs.find(t => t.id === pendingClose.tabId)
    if (tab?.queryContent) {
      await window.electronAPI.saveFile(tab.queryContent, `${tab.title}.sql`)
    }
    closeTab(pendingClose.tabId)
    setPendingClose(null)
  }, [pendingClose, tabs, closeTab])

  const handleDiscardAndClose = useCallback(() => {
    if (!pendingClose) return
    // Mark clean before closing so no re-trigger
    setTabDirty(pendingClose.tabId, false)
    closeTab(pendingClose.tabId)
    setPendingClose(null)
  }, [pendingClose, closeTab, setTabDirty])

  // ── Derived tab state ──────────────────────────────────────────────────────
  const hasTabs       = tabs.length > 0

  const noTabs        = !hasTabs  // canvas visible

  // ── Toolbar button style ───────────────────────────────────────────────────
  const tbBtn = (active?: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 5,
    background: active ? 'var(--accent)' : 'transparent',
    border: `1px solid ${active ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 6,
    color: active ? '#080C12' : 'var(--text-secondary)',
    padding: '4px 11px', fontSize: 12,
    fontFamily: 'var(--font-body)', fontWeight: active ? 600 : 400,
    cursor: 'pointer', transition: 'all 0.15s',
  })

  return (
    <ReactFlowProvider>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="onobase-texture-bg"
        style={{
          display: 'flex', flexDirection: 'column', height: '100vh',
          position: 'relative',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Watermark */}
        <div className="onobase-watermark">ON</div>

        {/* ════════ TOOLBAR ════════ */}
        <div style={{
          height: 44, flexShrink: 0,
          background: 'rgba(8,12,18,0.90)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          padding: '0 14px', gap: 6, zIndex: 30,
        }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginRight: 6 }}>
            <div style={{
              width: 28, height: 28, background: 'var(--accent)',
              borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#080C12',
              fontFamily: 'var(--font-heading)',
              boxShadow: '0 0 12px rgba(0,229,176,0.25)', flexShrink: 0,
            }}>1</div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>
              Onobase
            </span>
          </div>

          <Sep />

          {/* Connection pill */}
          {connection ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: `${connection.color}0F`,
                border: `1px solid ${connection.color}40`,
                borderRadius: 7, padding: '4px 10px', fontSize: 12,
                boxShadow: `0 0 12px ${connection.color}14`,
              }}>
                <motion.div
                  animate={connectionPulse ? {
                    boxShadow: [
                      `0 0 6px ${connection.color}B3`,
                      `0 0 18px ${connection.color}80`,
                      `0 0 6px ${connection.color}B3`,
                    ],
                  } : {}}
                  transition={{ duration: 0.4, repeat: connectionPulse ? 2 : 0 }}
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: schemaLoading ? '#EAB308' : connection.color,
                    boxShadow: schemaLoading ? 'none' : `0 0 6px ${connection.color}B3`,
                  }}
                />
                <Database size={11} color="var(--text-secondary)" />
                <span style={{ color: 'var(--text-mono)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                  {schemaLoading ? 'Loading schema…' : connection.dbName}
                </span>
                <span style={{
                  fontSize: 9, color: 'var(--accent)',
                  background: 'rgba(0,229,176,0.1)',
                  border: '1px solid rgba(0,229,176,0.2)',
                  borderRadius: 3, padding: '0 4px',
                  fontFamily: 'var(--font-mono)',
                }}>PG</span>
              </div>
              <button
                onClick={handleDisconnect}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'transparent',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 6, color: '#EF4444',
                  padding: '4px 9px', fontSize: 11, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <Unplug size={11} /> Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConnect(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 7, color: 'var(--text-secondary)',
                padding: '4px 11px', fontSize: 12, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'var(--accent)'; b.style.color = 'var(--accent)' }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = 'rgba(255,255,255,0.12)'; b.style.color = 'var(--text-secondary)' }}
            >
              <Database size={11} /> Connect to Database
            </button>
          )}

          <Sep />

          {/* ── Tab launchers ─────────────────────────────────────────── */}
          <button style={tbBtn(false)} onClick={() => addTab('query')}>
            <Zap size={11} /> New Query
          </button>
          <button style={tbBtn(false)} onClick={() => addTab('diagram')}>
            <Share2 size={11} /> Diagram
          </button>
          <button style={tbBtn(false)} onClick={() => addTab('activity')} title="Activity Monitor">
            ⚡ Activity
          </button>
          <button style={tbBtn(false)} onClick={() => setShowGit(v => !v)} title="Git Panel">
            ⎇ Git
          </button>
          <button
            style={tbBtn(showGlobalSearch)}
            onClick={() => setShowGlobalSearch(v => !v)}
            title="Search All Tables (Ctrl+Shift+F)"
          >
            <Search size={11} /> Search
          </button>
          <button style={tbBtn(false)} onClick={() => addTab('compare')} title="Compare Schemas">
            <GitCompare size={11} /> Compare
          </button>
          <button style={tbBtn(false)} onClick={() => addTab('querylog')} title="Query Log">
            <History size={11} /> Log
          </button>
          <button style={tbBtn(false)} onClick={() => addTab('connections')} title="Connection Manager">
            <Server size={11} /> Connections
          </button>
          <button style={tbBtn(false)} onClick={() => addTab('health')} title="Database Health">
            <HeartPulse size={11} /> Health
          </button>

          {/* ── Canvas background indicator ───────────────────────────── */}
          <div style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.2)',
            fontFamily: 'var(--font-mono)',
            padding: '0 6px',
            userSelect: 'none',
          }}>
            ⬡ canvas
          </div>

          {/* ── Right side controls ───────────────────────────────────── */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>

            {/* Canvas controls — only when no tabs open */}
            {noTabs && selectedModuleId && selectedModule && selectedColour && (
              <>
                <input
                  value={selectedModule.name}
                  onChange={e => storeUpdateModule(selectedModuleId, { name: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selectedColour.hex}40`,
                    borderRadius: 6,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    padding: '4px 9px',
                    width: 140,
                    outline: 'none',
                  }}
                  onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = selectedColour.hex }}
                  onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = `${selectedColour.hex}40` }}
                  onKeyDown={e => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur() }}
                  placeholder="Module name"
                />

                <div ref={pickerRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowColourPicker(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${selectedColour.hex}40`,
                      borderRadius: 6,
                      color: 'var(--text-secondary)',
                      padding: '4px 9px', fontSize: 12,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 12, height: 12, borderRadius: 3,
                      background: selectedColour.hex,
                      boxShadow: `0 0 6px ${selectedColour.hex}88`,
                      flexShrink: 0,
                    }} />
                    Colour
                  </button>

                  {showColourPicker && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                      background: '#161B22',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                      padding: 10,
                      zIndex: 9999,
                      width: 220,
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 5, marginBottom: 8 }}>
                        {MODULE_COLORS.map(col => {
                          const isActive   = selectedStoreMod?.colorId === col.id
                          const usedByOther = storeModules.some(m => m.id !== selectedModuleId && m.colorId === col.id)
                          return (
                            <div
                              key={col.id}
                              title={col.id}
                              onClick={() => {
                                if (usedByOther) return
                                storeUpdateModule(selectedModuleId, { colorId: col.id, customHex: undefined })
                                setShowColourPicker(false)
                              }}
                              style={{
                                width: 20, height: 20, borderRadius: 4,
                                background: col.hex,
                                opacity: usedByOther ? 0.25 : 1,
                                cursor: usedByOther ? 'not-allowed' : 'pointer',
                                outline: isActive ? `2px solid ${col.hex}` : 'none',
                                outlineOffset: 2,
                                boxShadow: isActive ? `0 0 8px ${col.hex}88` : 'none',
                                transition: 'transform 0.1s',
                              }}
                              onMouseEnter={e => { if (!usedByOther) (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.2)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)' }}
                            />
                          )
                        })}
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 8,
                      }}>
                        <span style={{ fontSize: 10, color: '#484F58', flexShrink: 0 }}>Custom</span>
                        <input
                          type="color"
                          defaultValue={selectedStoreMod?.customHex ?? selectedColour.hex}
                          onChange={e => {
                            const hex = e.target.value
                            storeUpdateModule(selectedModuleId, { colorId: `custom_${selectedModuleId}`, customHex: hex })
                          }}
                          style={{
                            width: 28, height: 22,
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 4, background: 'transparent',
                            cursor: 'pointer', padding: 2,
                          }}
                        />
                        <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-mono)' }}>
                          {selectedStoreMod?.customHex ?? ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Sep />
              </>
            )}

            {/* + Module button — only when canvas visible (no tabs) */}
            {noTabs && (
              <button
                onClick={() => setShowModuleDialog(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'rgba(0,229,176,0.08)',
                  border: '1px solid rgba(0,229,176,0.35)',
                  borderRadius: 6, color: 'var(--accent)',
                  padding: '4px 11px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,229,176,0.15)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,229,176,0.08)' }}
              >
                <Plus size={11} /> Module
              </button>
            )}

            {/* AI Assistant button */}
            <button
              onClick={() => setShowAI(v => !v)}
              title="AI Query Assistant"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: showAI ? 'rgba(0,229,176,0.1)' : 'transparent',
                border: `1px solid ${showAI ? 'rgba(0,229,176,0.35)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 5, color: showAI ? '#00E5B0' : '#484F58',
                padding: '4px 8px', cursor: 'pointer', fontSize: 11,
                fontFamily: 'var(--font-body)',
              }}
            >
              🤖 AI
            </button>

            {/* Presentation mode button */}
            <button
              onClick={togglePresentationMode}
              title={isPresentationMode ? 'Exit Presentation Mode (F11)' : 'Presentation Mode (F11)'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isPresentationMode ? 'rgba(0,229,176,0.1)' : 'transparent',
                border: `1px solid ${isPresentationMode ? 'rgba(0,229,176,0.35)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 5, color: isPresentationMode ? '#00E5B0' : '#484F58',
                padding: '4px 7px', cursor: 'pointer', fontSize: 12,
              }}
            >
              {isPresentationMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>

            {/* Settings button */}
            <button
              onClick={() => setShowSettings(true)}
              title="Settings"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 5, color: '#484F58', padding: '4px 7px',
                cursor: 'pointer', fontSize: 12,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#8B949E' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#484F58' }}
            >
              ⚙
            </button>
          </div>
        </div>

        {/* ════════ MAIN ════════ */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

          {!isPresentationMode && (
            <ObjectExplorer
              connection={connection}
              schema={rawSchema}
              assignedTableIds={assignedTableIds}
              moduleColors={moduleColors}
              onViewData={handleViewData}
              onOpenScript={(sql, title) => {
                addTab('query', { title, queryContent: sql })
              }}
              onDesignTable={(schema, table) => {
                addTab('tabledesign', { title: `Design: ${schema}.${table}`, tableRef: { schema, table } })
              }}
              onImportCsv={() => setShowImport(true)}
              onGenerateData={handleGenerateData}
            />
          )}

          {/* Right content area + optional AI sidebar */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Canvas + tabs */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

            {/* ── Canvas — always rendered, always behind ── */}
            <Canvas
              modules={modules}
              tableData={tableData}
              fkRelations={fkRelations}
              selectedId={selectedModuleId}
              onSelectModule={id => setSelectedModule(id)}
            />

            {/* ── Tab overlay — sits above canvas when tabs exist ── */}
            {hasTabs && activeTabId && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                zIndex: 20,
                background: 'var(--bg-primary)',
              }}>
                {/* Connection colour bar */}
                {connection && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: 3, zIndex: 10,
                    background: `linear-gradient(90deg, ${connection.color}CC 0%, ${connection.color}44 100%)`,
                    pointerEvents: 'none',
                  }} />
                )}
                <TabBar
                  tabs={tabs}
                  activeTabId={activeTabId}
                  onSelect={setActiveTab}
                  onClose={handleCloseTab}
                />

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {tabs.map(tab => (
                    <div
                      key={tab.id}
                      style={{
                        display: tab.id === activeTabId ? 'flex' : 'none',
                        flexDirection: 'column',
                        height: '100%',
                      }}
                    >
                      {tab.type === 'query' && (
                        <QueryEditor
                          key={tab.id}
                          tabId={tab.id}
                          schema={rawSchema}
                          connected={!!connection}
                          connection={connection}
                          initialSql={tab.queryContent ?? null}
                          onDirtyChange={(dirty: boolean) => setTabDirty(tab.id, dirty)}
                          onRunningChange={() => {}}
                        />
                      )}

                      {tab.type === 'diagram' && (
                        <DiagramView
                          schema={rawSchema}
                          connected={!!connection}
                        />
                      )}

                      {tab.type === 'dataview' && tab.tableRef && (
                        <DataViewer
                          key={tab.id}
                          tableName={tab.tableRef.table}
                          schemaName={tab.tableRef.schema}
                          connected={!!connection}
                        />
                      )}

                      {tab.type === 'activity' && (
                        <ActivityMonitor key={tab.id} />
                      )}

                      {tab.type === 'tabledesign' && tab.tableRef && (
                        <TableDesigner
                          key={tab.id}
                          schema={tab.tableRef.schema}
                          table={tab.tableRef.table}
                        />
                      )}

                      {tab.type === 'compare' && (
                        <SchemaComparison
                          key={tab.id}
                          connectionA={connection}
                          onOpenScript={(sql, title) => addTab('query', { title, queryContent: sql })}
                        />
                      )}

                      {tab.type === 'querylog' && (
                        <QueryLog
                          key={tab.id}
                          connection={connection}
                          onOpenQuery={(sql) => addTab('query', { title: 'From Log', queryContent: sql })}
                        />
                      )}

                      {tab.type === 'health' && (
                        <HealthDashboard key={tab.id} />
                      )}

                      {tab.type === 'connections' && (
                        <ConnectionManager
                          key={tab.id}
                          onConnect={async (saved) => {
                            const res = await window.electronAPI.connectDB({
                              host: saved.host, port: saved.port,
                              database: saved.database,
                              user: saved.username,
                              password: saved.password ?? '',
                              dbType: saved.dbType,
                              filePath: saved.filePath,
                            })
                            if (res.ok) {
                              handleConnected(saved.database, saved.host, saved.port, saved.color)
                            }
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Assistant sidebar */}
          {showAI && (
            <AIAssistant
              onClose={() => setShowAI(false)}
              schema={rawSchema}
            />
          )}

          {/* Git panel sidebar */}
          {showGit && (
            <GitPanel onClose={() => setShowGit(false)} />
          )}
          </div>
        </div>

        {/* ════════ STATUS BAR ════════ */}
        <StatusBar
          connection={statusConnection}
          tableCount={tableData.size}
          sshActive={sshActive}
        />

      </motion.div>

      {/* Settings modal */}
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}

      {/* Connect modal */}
      {showConnect && (
        <ConnectDialog
          onClose={() => setShowConnect(false)}
          onConnected={handleConnected}
        />
      )}

      {/* Save dialog */}
      {pendingClose && (
        <SaveDialog
          tabTitle={pendingClose.tabTitle}
          onSave={handleSaveAndClose}
          onDiscard={handleDiscardAndClose}
          onCancel={() => setPendingClose(null)}
        />
      )}

      {/* Global search overlay */}
      {showGlobalSearch && (
        <GlobalSearch
          schema={rawSchema}
          onClose={() => setShowGlobalSearch(false)}
          onOpenTable={(schema: string, table: string) => {
            addTab('dataview', { title: `${schema}.${table}`, tableRef: { schema, table } })
            setShowGlobalSearch(false)
          }}
        />
      )}

      {/* CSV Import Wizard */}
      {showImport && (
        <CsvImportWizard
          schema={rawSchema}
          connected={!!connection}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Fake Data Generator */}
      {showFakeData && (
        <FakeDataGenerator
          schema={rawSchema}
          connected={!!connection}
          initialSchema={fakeDataTarget?.schema}
          initialTable={fakeDataTarget?.table}
          onClose={() => { setShowFakeData(false); setFakeDataTarget(null) }}
        />
      )}

      {/* Module name dialog */}
      {showModuleDialog && (
        <ModuleNameDialog
          mode="create"
          existingModules={storeModules.map(m => ({
            name: m.name,
            color: getModuleColor(m.colorId, m.customHex).hex,
          }))}
          onConfirm={(name, hex) => {
            const id = storeAddModule()
            storeUpdateModule(id, { name, colorId: `custom_${id}`, customHex: hex })
            setShowModuleDialog(false)
          }}
          onCancel={() => setShowModuleDialog(false)}
        />
      )}

      {/* Toast stack */}
      <AnimatePresence>
        {appToasts.map((t, i) => (
          <div key={t.id} style={{ position: 'fixed', bottom: 40 + i * 52, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
            <Toast
              message={t.message}
              type={t.type as 'warning' | 'info' | 'error'}
              onClose={() => useAppStore.getState().dismissToast(t.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </ReactFlowProvider>
  )
}

function Sep() {
  return <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 3px', flexShrink: 0 }} />
}
