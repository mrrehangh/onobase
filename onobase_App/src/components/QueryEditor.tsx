/**
 * SQL formatting powered by sql-formatter (MIT)
 * https://github.com/sql-formatter-org/sql-formatter
 *
 * Date formatting powered by date-fns (MIT)
 * https://github.com/date-fns/date-fns
 *
 * CSV export powered by PapaParse (MIT)
 * https://github.com/mholt/PapaParse
 */
import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { format as formatSQL } from 'sql-formatter'
import { formatDistanceToNow } from 'date-fns'
import Papa from 'papaparse'
import Editor, { useMonaco } from '@monaco-editor/react'
import type { editor, languages } from 'monaco-editor'
import type { SchemaData } from './ObjectExplorer'
// Results grid powered by AG Grid Community (MIT)
// https://www.ag-grid.com
import ResultsGrid from './ResultsGrid'
import SnippetPanel from './SnippetPanel'
import ExecutionPlan from './ExecutionPlan'
import BookmarkPanel from './BookmarkPanel'
import ResultChart from './ResultChart'
import { useAppStore } from '../store/useAppStore'
import { analyseQuery } from '../utils/queryAnalyzer'
import type { AnalysisResult } from '../utils/queryAnalyzer'
import QueryWarningDialog from './QueryWarningDialog'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  tabId?: string
  schema: SchemaData | null
  connected: boolean
  connection: { dbName: string; host: string; port: number } | null
  initialSql?: string | null
  onDirtyChange?: (dirty: boolean) => void
  onRunningChange?: (running: boolean) => void
}

interface QueryResult {
  rows: Record<string, unknown>[]
  fields: { name: string; dataTypeID: number }[]
  rowCount: number | null
  duration: number
  sql: string
  executedAt: string
  error?: string
}

interface QueryStats {
  duration: number
  rowCount: number | null
  rowsAffected: number | null
  executedAt: string
  sql: string
}

interface QueryTab {
  id: string
  title: string
  sql: string
  result: QueryResult | null
  messages: string[]
  stats: QueryStats | null
  isRunning: boolean
  isDirty: boolean
}

interface HistoryEntry {
  sql: string
  executedAt: string
  duration: number
  rowCount: number | null
  ok: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const HISTORY_KEY = 'onobase:queryHistory'
const MAX_HISTORY = 50
const MONO = "'JetBrains Mono', 'Cascadia Code', 'Courier New', monospace"

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}
function saveHistory(h: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY)))
}
function timeAgo(iso: string): string {
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }) } catch { return iso }
}
function truncateSql(sql: string, len = 60): string {
  const s = sql.replace(/\s+/g, ' ').trim()
  return s.length > len ? s.slice(0, len) + '…' : s
}
function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ── Monaco theme ──────────────────────────────────────────────────────────────

const ONOBASE_THEME: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword.sql',    foreground: '00E5B0', fontStyle: 'bold' },
    { token: 'string.sql',     foreground: 'CE9178' },
    { token: 'number',         foreground: 'B5CEA8' },
    { token: 'comment',        foreground: '6A737D', fontStyle: 'italic' },
    { token: 'operator.sql',   foreground: 'D4D4D4' },
    { token: 'identifier.sql', foreground: 'E6EDF3' },
  ],
  colors: {
    'editor.background':                     '#0D1117',
    'editor.foreground':                     '#E6EDF3',
    'editor.lineHighlightBackground':        '#161B22',
    'editorLineNumber.foreground':           '#484F58',
    'editorLineNumber.activeForeground':     '#8B949E',
    'editor.selectionBackground':            '#264F7840',
    'editorCursor.foreground':               '#00E5B0',
    'editorIndentGuide.background1':         '#21262D',
    'editorWidget.background':               '#161B22',
    'editorWidget.border':                   '#30363D',
    'list.hoverBackground':                  '#21262D',
    'editorSuggestWidget.background':        '#161B22',
    'editorSuggestWidget.border':            '#30363D',
    'editorSuggestWidget.selectedBackground':'#1C2128',
    'editorRuler.foreground':                '#1a1f27',
  },
}

// ── Shared button factory ─────────────────────────────────────────────────────

function mkBtn(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 5, color: '#8B949E',
    padding: '3px 9px', fontSize: 11, cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    ...extra,
  }
}

let tabCounter = 2
function makeTab(overrides: Partial<QueryTab> = {}): QueryTab {
  const n = tabCounter++
  return {
    id: `q${n}`, title: `SQLQuery${n}`, sql: '-- New Query\nSELECT ',
    result: null, messages: [], stats: null, isRunning: false, isDirty: false,
    ...overrides,
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QueryEditor({ tabId: _tabId, schema, connected, connection, initialSql, onDirtyChange, onRunningChange }: Props) {
  const monaco = useMonaco()
  const editorRef   = useRef<editor.IStandaloneCodeEditor | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Settings from store ──────────────────────────────────────────────────────
  const rowLimit       = useAppStore(s => s.rowLimit)
  const editorFontSize = useAppStore(s => s.editorFontSize)
  const wordWrap       = useAppStore(s => s.wordWrap)
  const showLineNumbers = useAppStore(s => s.showLineNumbers)

  // ── Tab state ───────────────────────────────────────────────────────────────
  const [tabs, setTabs] = useState<QueryTab[]>([{
    id: 'q1', title: 'SQLQuery1', sql: '-- New Query\nSELECT ',
    result: null, messages: [], stats: null, isRunning: false, isDirty: false,
  }])
  const [activeTabId, setActiveTabId] = useState('q1')
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null)
  const [renameValue, setRenameValue]     = useState('')

  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0]

  function patchTab(id: string, patch: Partial<QueryTab>) {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  // ── Layout state ────────────────────────────────────────────────────────────
  const [editorHeight, setEditorHeight] = useState(280)
  const [showHistory, setShowHistory]         = useState(false)
  const [showSnippets, setShowSnippets]       = useState(false)
  const [showBookmarks, setShowBookmarks]     = useState(false)
  const [showBookmarkInput, setShowBookmarkInput] = useState(false)
  const [bookmarkName, setBookmarkName]       = useState('')
  const [resultTab, setResultTab]             = useState<'results' | 'messages' | 'stats' | 'plan' | 'chart'>('results')
  const { bookmarks, addBookmark, removeBookmark } = useAppStore()
  const [explainResult, setExplainResult] = useState<{ plan: object; textPlan: string } | null>(null)
  const [history, setHistory]           = useState<HistoryEntry[]>(loadHistory)
  const [wasLimited, setWasLimited]     = useState(false)
  const [pendingAnalysis, setPendingAnalysis] = useState<{
    analysis: AnalysisResult
    sql: string
  } | null>(null)

  // ── Monaco theme + autocomplete ─────────────────────────────────────────────
  useEffect(() => {
    if (!monaco) return
    monaco.editor.defineTheme('onobase-dark', ONOBASE_THEME)
    monaco.editor.setTheme('onobase-dark')
  }, [monaco])

  useEffect(() => {
    if (!monaco || !schema) return
    const tables    = schema.tables.map(t => `${t.table_schema}.${t.table_name}`)
    const tableNames = [...new Set(schema.tables.map(t => t.table_name))]
    const colNames   = [...new Set(schema.columns.map(c => c.column_name))]
    const provider = monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        const word  = model.getWordUntilPosition(position)
        const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }
        const suggestions: languages.CompletionItem[] = [
          ...tableNames.map(name => ({ label: name, kind: monaco.languages.CompletionItemKind.Class,  insertText: name, detail: 'table',                range })),
          ...tables.map(fqn     => ({ label: fqn,  kind: monaco.languages.CompletionItemKind.Class,  insertText: fqn,  detail: 'table (fully qualified)', range })),
          ...colNames.map(name  => ({ label: name, kind: monaco.languages.CompletionItemKind.Field,  insertText: name, detail: 'column',               range })),
        ]
        return { suggestions }
      },
    })
    return () => provider.dispose()
  }, [monaco, schema])

  // ── Sync initialSql ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialSql) return
    patchTab(activeTabId, { sql: initialSql })
    editorRef.current?.setValue(initialSql)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSql])

  // ── Snippet insert listener ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const { sql } = (e as CustomEvent<{ sql: string }>).detail
      const ed = editorRef.current
      if (!ed) return
      const selection = ed.getSelection()
      if (selection && !selection.isEmpty()) {
        ed.executeEdits('snippet', [{ range: selection, text: sql }])
      } else {
        const model = ed.getModel()
        if (!model) return
        const line = model.getLineCount()
        const col  = model.getLineMaxColumn(line)
        const pos  = { lineNumber: line, column: col }
        ed.executeEdits('snippet', [{ range: { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column }, text: '\n' + sql }])
      }
      ed.focus()
    }
    document.addEventListener('onobase:insertSnippet', handler)
    return () => document.removeEventListener('onobase:insertSnippet', handler)
  }, [])

  // ── Execute query (actual DB call) ───────────────────────────────────────────
  const executeQuery = useCallback(async (query: string, explainOnly = false) => {
    if (!connected) return
    setWasLimited(false)

    // ── Row limit guard ────────────────────────────────────────────────────────
    const isSelect = query.trim().toUpperCase().startsWith('SELECT')
    const hasLimitClause = /\bLIMIT\b/i.test(query)
    const hasTop   = /\bTOP\b/i.test(query)
    const limited  = isSelect && !hasLimitClause && !hasTop && !explainOnly
    const safeSql  = limited ? `${query}\nLIMIT ${rowLimit}` : query
    setWasLimited(limited)

    const tabId = activeTabId
    patchTab(tabId, { isRunning: true })
    onRunningChange?.(true)
    const start = Date.now()

    try {
      const res = await window.electronAPI.queryDB(safeSql, [])
      const duration = Date.now() - start
      const executedAt = new Date().toISOString()
      const entry: HistoryEntry = {
        sql: query, executedAt, duration,
        rowCount: res.ok ? (res.rowCount ?? null) : null,
        ok: res.ok,
      }
      const updated = [entry, ...loadHistory()]
      saveHistory(updated)
      setHistory(updated)

      // Persistent log (fire-and-forget)
      window.electronAPI.logAppend({
        id: Date.now().toString(),
        sql: query,
        database: connection?.dbName ?? '',
        host: connection?.host ?? '',
        executedAt,
        duration,
        rowCount: res.ok ? (res.rowCount ?? null) : null,
        ok: res.ok,
        error: res.ok ? null : (res as { ok: false; error: string }).error,
      }).catch(() => {})

      if (res.ok) {
        const newMsgs = [
          `(${res.rowCount ?? 0} rows affected)`,
          'Command completed successfully.',
          `Completion time: ${executedAt}`,
        ]
        setTabs(prev => prev.map(t => t.id === tabId ? {
          ...t,
          result: { rows: res.rows, fields: res.fields, rowCount: res.rowCount, duration, sql: query, executedAt },
          messages: [...t.messages, ...newMsgs],
          stats: { duration, rowCount: res.rowCount ?? null, rowsAffected: null, executedAt, sql: query },
          isRunning: false, isDirty: false,
        } : t))
      } else {
        const errMsg = (res as { ok: false; error: string }).error
        const newMsgs = [`Msg 0, Level 16`, errMsg, `Completion time: ${executedAt}`]
        setTabs(prev => prev.map(t => t.id === tabId ? {
          ...t,
          result: { rows: [], fields: [], rowCount: null, duration, sql: query, executedAt, error: errMsg },
          messages: [...t.messages, ...newMsgs],
          stats: { duration, rowCount: null, rowsAffected: null, executedAt, sql: query },
          isRunning: false,
        } : t))
      }
    } catch (err) {
      const duration = Date.now() - start
      const executedAt = new Date().toISOString()
      const errMsg = String(err)
      setTabs(prev => prev.map(t => t.id === tabId ? {
        ...t,
        result: { rows: [], fields: [], rowCount: null, duration, sql: query, executedAt, error: errMsg },
        messages: [...t.messages, errMsg, `Completion time: ${executedAt}`],
        stats: { duration, rowCount: null, rowsAffected: null, executedAt, sql: query },
        isRunning: false,
      } : t))
    } finally {
      onRunningChange?.(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, activeTabId, onRunningChange, rowLimit])

  // ── Run query — analyses first, then executes ─────────────────────────────
  const runQuery = useCallback(async (explainOnly = false) => {
    const ed = editorRef.current
    if (!ed || !connected) return
    const sel = ed.getSelection()
    const hasSelection = sel && !sel.isEmpty()
    const fullSql = ed.getValue()
    const rawSql  = hasSelection ? ed.getModel()?.getValueInRange(sel) ?? fullSql : fullSql
    const query = (explainOnly ? 'EXPLAIN ' + rawSql : rawSql).trim()
    if (!query) return

    // ── Step 1: Analyse before running (skip for EXPLAIN) ────────────────────
    if (!explainOnly) {
      const analysis = analyseQuery(query, rowLimit)
      if (analysis.warnings.length > 0) {
        setPendingAnalysis({ analysis, sql: query })
        return
      }
    }

    // No warnings (or explain mode) — run immediately
    await executeQuery(query, explainOnly)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, rowLimit, executeQuery])

  // keep runQuery fresh in a ref for Monaco keybindings
  const runQueryRef = useRef(runQuery)
  useEffect(() => { runQueryRef.current = runQuery }, [runQuery])

  // ── Explain / plan ───────────────────────────────────────────────────────────
  const runExplain = useCallback(async () => {
    const ed = editorRef.current
    if (!ed || !connected) return
    const sel = ed.getSelection()
    const sql = (sel && !sel.isEmpty() ? ed.getModel()?.getValueInRange(sel) : ed.getValue()) ?? ''
    if (!sql.trim()) return
    const res = await window.electronAPI.explainQuery(sql.trim())
    if (res.ok) {
      setExplainResult({ plan: res.plan, textPlan: res.textPlan })
      setResultTab('plan')
    }
  }, [connected])

  // ── Format SQL ───────────────────────────────────────────────────────────────
  const handleFormatSQL = useCallback(() => {
    const ed = editorRef.current
    if (!ed) return
    try {
      const formatted = formatSQL(ed.getValue(), { language: 'postgresql', tabWidth: 2, keywordCase: 'upper' })
      ed.setValue(formatted)
    } catch {
      // if sql-formatter can't parse, leave as-is
    }
  }, [])

  // keep handleFormatSQL fresh in a ref for Monaco keybindings
  const formatSQLRef = useRef(handleFormatSQL)
  useEffect(() => { formatSQLRef.current = handleFormatSQL }, [handleFormatSQL])

  // ── Monaco inline warning markers (Step 4) ───────────────────────────────────
  useEffect(() => {
    if (!monaco || !editorRef.current) return
    const model = editorRef.current.getModel()
    if (!model) return

    const currentSql = editorRef.current.getValue()
    const analysis = analyseQuery(currentSql, rowLimit)

    const errorMarkers = analysis.warnings
      .filter(w => w.severity === 'danger')
      .map(w => ({
        severity: monaco.MarkerSeverity.Error,
        message: `${w.title}: ${w.message}`,
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: currentSql.split('\n')[0].length + 1,
      }))

    const warningMarkers = analysis.warnings
      .filter(w => w.severity === 'warning')
      .map(w => ({
        severity: monaco.MarkerSeverity.Warning,
        message: `${w.title}: ${w.message}`,
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: currentSql.split('\n')[0].length + 1,
      }))

    monaco.editor.setModelMarkers(
      model,
      'onobase-analyser',
      [...errorMarkers, ...warningMarkers]
    )
  }, [activeTab.sql, monaco, rowLimit])

  // ── Editor mount ─────────────────────────────────────────────────────────────
  const handleEditorMount = useCallback((ed: editor.IStandaloneCodeEditor) => {
    editorRef.current = ed
    setTimeout(() => ed.focus(), 150)
    // Ctrl+Enter
    ed.addAction({ id: 'onobase.run', label: 'Run Query', keybindings: [2051], run: () => runQueryRef.current() })
    // F5
    ed.addAction({ id: 'onobase.runF5', label: 'Run Query (F5)', keybindings: [60], run: () => runQueryRef.current() })
    // Ctrl+Shift+F
    ed.addAction({
      id: 'onobase.format', label: 'Format SQL',
      keybindings: [2048 | 1024 | 36], // CtrlCmd+Shift+F
      run: () => formatSQLRef.current(),
    })
  }, [])

  // ── Tab switching ────────────────────────────────────────────────────────────
  const switchTab = useCallback((id: string) => {
    const target = tabs.find(t => t.id === id)
    if (!target) return
    setActiveTabId(id)
    editorRef.current?.setValue(target.sql)
  }, [tabs])

  // ── Export ───────────────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const r = activeTab.result
    if (!r || r.rows.length === 0) return
    const csv = Papa.unparse(r.rows, { columns: r.fields.map(f => f.name) })
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `query-result-${Date.now()}.csv`; a.click()
  }, [activeTab.result])

  const exportJSON = useCallback(() => {
    const r = activeTab.result
    if (!r || r.rows.length === 0) return
    const blob = new Blob([JSON.stringify(r.rows, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `query-result-${Date.now()}.json`; a.click()
  }, [activeTab.result])

  // ── Drag resize ──────────────────────────────────────────────────────────────
  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY; const startH = editorHeight
    const containerH = containerRef.current?.clientHeight ?? 600
    const onMove = (ev: MouseEvent) => setEditorHeight(Math.max(120, Math.min(containerH - 140, startH + ev.clientY - startY)))
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }, [editorHeight])

  const hasResults = !!(activeTab.result && !activeTab.result.error && activeTab.result.rows.length > 0)

  // ── Live analysis for warning bar (Step 5) ───────────────────────────────────
  const liveAnalysis = useMemo(
    () => analyseQuery(activeTab.sql, rowLimit),
    [activeTab.sql, rowLimit]
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#0D1117' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes tabDot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .ono-row:hover td { background: rgba(255,255,255,0.04) !important }
        .ono-th-resize { position:relative }
        .ono-th-resize::after { content:''; position:absolute; right:0; top:20%; height:60%; width:3px; cursor:col-resize; background:transparent }
        .ono-th-resize:hover::after { background:rgba(255,255,255,0.12) }
      `}</style>

      {/* ═══ TOOLBAR ═══ */}
      <Toolbar
        connected={connected}
        connection={connection}
        running={activeTab.isRunning}
        hasResults={hasResults}
        historyCount={history.length}
        showHistory={showHistory}
        showSnippets={showSnippets}
        showBookmarks={showBookmarks}
        bookmarkCount={bookmarks.length}
        isBookmarked={bookmarks.some(b => b.sql.trim() === activeTab.sql.trim())}
        showBookmarkInput={showBookmarkInput}
        bookmarkName={bookmarkName}
        onBookmarkNameChange={setBookmarkName}
        onSaveBookmark={() => {
          if (bookmarkName.trim()) {
            addBookmark(bookmarkName.trim(), activeTab.sql, [])
            setBookmarkName('')
            setShowBookmarkInput(false)
          }
        }}
        onToggleBookmark={() => {
          const bm = bookmarks.find(b => b.sql.trim() === activeTab.sql.trim())
          if (bm) { removeBookmark(bm.id) }
          else { setShowBookmarkInput(v => !v) }
        }}
        onRun={() => runQuery()}
        onStop={() => patchTab(activeTabId, { isRunning: false })}
        onParse={() => runQuery(true)}
        onExplain={runExplain}
        onExportCSV={exportCSV}
        onExportJSON={exportJSON}
        onToggleHistory={() => setShowHistory(h => !h)}
        onToggleSnippets={() => setShowSnippets(s => !s)}
        onToggleBookmarks={() => setShowBookmarks(v => !v)}
        onFormat={handleFormatSQL}
        onClear={() => { patchTab(activeTabId, { sql: '' }); editorRef.current?.setValue('') }}
      />

      {/* ═══ TAB BAR ═══ */}
      <div style={{ height: 32, background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', overflowX: 'auto', flex: 1 }}>
          {tabs.map(tab => (
            <QueryTabEl
              key={tab.id}
              tab={tab}
              active={tab.id === activeTabId}
              isRenaming={renamingTabId === tab.id}
              renameValue={renameValue}
              onRenameChange={setRenameValue}
              onRenameCommit={() => {
                if (renameValue.trim()) patchTab(tab.id, { title: renameValue.trim() })
                setRenamingTabId(null)
              }}
              onClick={() => switchTab(tab.id)}
              onDoubleClick={() => { setRenamingTabId(tab.id); setRenameValue(tab.title) }}
              onClose={e => {
                e.stopPropagation()
                if (tabs.length === 1) return
                const idx = tabs.findIndex(t => t.id === tab.id)
                const next = tabs[idx + 1] ?? tabs[idx - 1]
                setTabs(prev => prev.filter(t => t.id !== tab.id))
                if (activeTabId === tab.id) switchTab(next.id)
              }}
            />
          ))}
        </div>
        <button
          title="New query tab"
          onClick={() => {
            const t = makeTab()
            setTabs(prev => [...prev, t])
            setActiveTabId(t.id)
            setTimeout(() => editorRef.current?.setValue(t.sql), 0)
          }}
          style={{ padding: '4px 10px', background: 'transparent', border: 'none', color: '#484F58', cursor: 'pointer', fontSize: 16, flexShrink: 0, alignSelf: 'center' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#00E5B0' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#484F58' }}
        >+</button>
      </div>

      {/* ═══ BODY (editor + results + optional history) ═══ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }} ref={containerRef}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          {/* Editor */}
          <div style={{ height: editorHeight, flexShrink: 0, overflow: 'hidden' }}>
            <Editor
              height="100%"
              defaultLanguage="sql"
              value={activeTab.sql}
              theme="onobase-dark"
              onChange={v => { patchTab(activeTabId, { sql: v ?? '', isDirty: true }); onDirtyChange?.(true) }}
              onMount={handleEditorMount}
              options={{
                fontSize: editorFontSize,
                fontFamily: MONO,
                fontLigatures: true,
                lineHeight: 20,
                lineNumbers: showLineNumbers ? 'on' : 'off',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: wordWrap ? 'on' : 'off',
                tabFocusMode: false,
                padding: { top: 12, bottom: 12 },
                suggestOnTriggerCharacters: true,
                quickSuggestions: { other: true, strings: false, comments: false },
                renderLineHighlight: 'line',
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                renderWhitespace: 'none',
                folding: false,
                lineNumbersMinChars: 3,
                rulers: [{ column: 80, color: 'rgba(255,255,255,0.06)' }],
              }}
            />
          </div>

          {/* ── Warning summary bar (Step 5) ── */}
          {liveAnalysis.warnings.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px',
              background: liveAnalysis.isDangerous
                ? 'rgba(239,68,68,0.08)'
                : 'rgba(234,179,8,0.06)',
              borderTop: `1px solid ${
                liveAnalysis.isDangerous
                  ? 'rgba(239,68,68,0.2)'
                  : 'rgba(234,179,8,0.2)'
              }`,
              flexShrink: 0,
              flexWrap: 'wrap',
            }}>
              {liveAnalysis.warnings
                .filter(w => w.severity === 'danger')
                .map(w => (
                  <span key={w.id} style={{
                    fontSize: 11,
                    color: '#EF4444',
                    fontFamily: 'var(--font-body)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    🛑 {w.title}
                  </span>
                ))
              }
              {liveAnalysis.warnings
                .filter(w => w.severity === 'warning')
                .map(w => (
                  <span key={w.id} style={{
                    fontSize: 11,
                    color: '#EAB308',
                    fontFamily: 'var(--font-body)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    ⚠ {w.title}
                  </span>
                ))
              }
              {liveAnalysis.warnings
                .filter(w => w.severity === 'info')
                .map(w => (
                  <span key={w.id} style={{
                    fontSize: 11,
                    color: '#3B82F6',
                    fontFamily: 'var(--font-body)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    ℹ {w.title}
                  </span>
                ))
              }
            </div>
          )}

          {/* Drag handle */}
          <div
            onMouseDown={onDividerMouseDown}
            style={{
              height: 6, flexShrink: 0, cursor: 'row-resize',
              background: 'rgba(255,255,255,0.03)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{ width: 32, height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.2)' }} />
          </div>

          {/* Results area */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 140 }}>
            {/* Results sub-tab bar */}
            <div style={{ height: 28, background: '#0D1117', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', padding: '0 4px', gap: 2, flexShrink: 0 }}>
              {(['results', 'messages', 'stats', 'plan', 'chart'] as const).map(tab => {
                const label = tab === 'results'
                  ? `Results${activeTab.result && !activeTab.result.error ? ` (${activeTab.result.rows.length})` : ''}`
                  : tab === 'messages'
                  ? `Messages${activeTab.messages.length > 0 ? ` (${activeTab.messages.length})` : ''}`
                  : tab === 'plan'
                  ? `Plan${explainResult ? ' ✓' : ''}`
                  : tab === 'chart'
                  ? '📊 Chart'
                  : 'Statistics'
                return (
                  <button
                    key={tab}
                    onClick={() => setResultTab(tab)}
                    style={{
                      padding: '0 10px', height: 28, background: 'transparent', border: 'none',
                      borderBottom: resultTab === tab ? '2px solid #00E5B0' : '2px solid transparent',
                      color: resultTab === tab ? '#00E5B0' : '#484F58',
                      fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)',
                      transition: 'color 0.1s',
                    }}
                  >{label}</button>
                )
              })}
            </div>

            {/* Results content */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              {resultTab === 'results' && (
                <ResultsGrid
                  rows={activeTab.result?.rows ?? []}
                  fields={activeTab.result?.fields ?? []}
                  rowCount={activeTab.result?.rowCount ?? null}
                  duration={activeTab.result?.duration ?? 0}
                  running={activeTab.isRunning}
                  connected={connected}
                  error={activeTab.result?.error}
                  wasLimited={wasLimited}
                  rowLimit={rowLimit}
                />
              )}
              {resultTab === 'messages' && (
                <MessagesPanel
                  messages={activeTab.messages}
                  onClear={() => patchTab(activeTabId, { messages: [] })}
                />
              )}
              {resultTab === 'stats' && (
                <StatisticsPanel
                  stats={activeTab.stats}
                  connection={connection}
                />
              )}
              {resultTab === 'plan' && explainResult && (
                <ExecutionPlan plan={explainResult.plan} textPlan={explainResult.textPlan} />
              )}
              {resultTab === 'plan' && !explainResult && (
                <Placeholder icon="plan" text="Click 'Plan' to visualise the execution plan" />
              )}
              {resultTab === 'chart' && (
                <ResultChart
                  rows={activeTab.result?.rows ?? []}
                  fields={activeTab.result?.fields ?? []}
                />
              )}
            </div>
          </div>
        </div>

        {/* Bookmarks panel */}
        {showBookmarks && (
          <BookmarkPanel
            onInsert={(sql) => {
              editorRef.current?.setValue(sql)
              setShowBookmarks(false)
            }}
            onClose={() => setShowBookmarks(false)}
          />
        )}

        {/* History panel */}
        {showHistory && (
          <HistoryPanel
            history={history}
            onSelect={entry => { patchTab(activeTabId, { sql: entry.sql }); editorRef.current?.setValue(entry.sql) }}
            onClear={() => { saveHistory([]); setHistory([]) }}
          />
        )}

        {/* Snippet panel */}
        {showSnippets && (
          <SnippetPanel onClose={() => setShowSnippets(false)} />
        )}
      </div>

      {/* ── Query Warning Dialog (Step 3) ── */}
      {pendingAnalysis && (
        <QueryWarningDialog
          analysis={pendingAnalysis.analysis}
          sql={pendingAnalysis.sql}
          onProceed={() => {
            const querySql = pendingAnalysis.sql
            setPendingAnalysis(null)
            executeQuery(querySql)
          }}
          onCancel={() => setPendingAnalysis(null)}
          onAutoFix={fixedSql => {
            editorRef.current?.setValue(fixedSql)
            patchTab(activeTabId, { sql: fixedSql })
            setPendingAnalysis(null)
            executeQuery(fixedSql)
          }}
        />
      )}
    </div>
  )
}

// ── TOOLBAR ───────────────────────────────────────────────────────────────────

function Toolbar({
  connected, connection, running, hasResults, historyCount, showHistory, showSnippets,
  showBookmarks, bookmarkCount, isBookmarked, showBookmarkInput, bookmarkName,
  onBookmarkNameChange, onSaveBookmark, onToggleBookmark,
  onRun, onStop, onParse, onExplain, onExportCSV, onExportJSON,
  onToggleHistory, onToggleSnippets, onToggleBookmarks, onFormat, onClear,
}: {
  connected: boolean; connection: { dbName: string; host: string; port: number } | null
  running: boolean; hasResults: boolean; historyCount: number; showHistory: boolean; showSnippets: boolean
  showBookmarks: boolean; bookmarkCount: number; isBookmarked: boolean
  showBookmarkInput: boolean; bookmarkName: string
  onBookmarkNameChange(v: string): void; onSaveBookmark(): void; onToggleBookmark(): void
  onRun(): void; onStop(): void; onParse(): void; onExplain(): void
  onExportCSV(): void; onExportJSON(): void; onToggleBookmarks(): void
  onToggleHistory(): void; onToggleSnippets(): void; onFormat(): void; onClear(): void
}) {
  return (
    <div style={{
      height: 38, background: '#161B22',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6, flexShrink: 0,
    }}>
      {/* Execute */}
      <button
        onClick={running ? onStop : onRun}
        disabled={!connected && !running}
        title={running ? 'Stop (cancels query)' : 'Execute (Ctrl+Enter / F5)'}
        style={{
          ...mkBtn({
            background: running ? 'rgba(239,68,68,0.12)' : connected ? 'rgba(0,229,176,0.12)' : 'rgba(48,54,61,0.5)',
            border: running ? '1px solid rgba(239,68,68,0.35)' : connected ? '1px solid rgba(0,229,176,0.35)' : '1px solid rgba(48,54,61,0.8)',
            color: running ? '#EF4444' : connected ? '#00E5B0' : '#484F58',
            fontWeight: 700, padding: '4px 12px',
            cursor: connected || running ? 'pointer' : 'not-allowed',
          }),
        }}
      >
        {running ? (
          <>
            <span style={{ display: 'inline-block', width: 10, height: 10, border: '2px solid rgba(239,68,68,0.3)', borderTopColor: '#EF4444', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            Stop
          </>
        ) : (
          <>
            <svg width={9} height={9} viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
            Execute
          </>
        )}
      </button>

      {/* Parse */}
      <button onClick={onParse} disabled={!connected} title="Parse / EXPLAIN query without executing"
        style={mkBtn({ cursor: connected ? 'pointer' : 'not-allowed', opacity: connected ? 1 : 0.4 })}>
        Parse
      </button>

      {/* Plan */}
      <button onClick={onExplain} disabled={!connected} title="Visualise execution plan (EXPLAIN ANALYZE)"
        style={mkBtn({ cursor: connected ? 'pointer' : 'not-allowed', opacity: connected ? 1 : 0.4 })}>
        Plan
      </button>

      <Sep />

      {/* Connection indicator — center */}
      <div style={{ margin: '0 auto', display: 'flex', alignItems: 'center', gap: 5 }}>
        {connection ? (
          <>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5B0', boxShadow: '0 0 5px rgba(0,229,176,0.6)' }} />
            <span style={{ fontFamily: MONO, fontSize: 11, color: '#8B949E' }}>{connection.dbName}</span>
          </>
        ) : (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Not connected</span>
        )}
      </div>

      {/* Right group */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
        <button onClick={onExportCSV} disabled={!hasResults} title="Export results as CSV"
          style={mkBtn({ opacity: hasResults ? 1 : 0.35, cursor: hasResults ? 'pointer' : 'default' })}>↓ CSV</button>
        <button onClick={onExportJSON} disabled={!hasResults} title="Export results as JSON"
          style={mkBtn({ opacity: hasResults ? 1 : 0.35, cursor: hasResults ? 'pointer' : 'default' })}>↓ JSON</button>
        <Sep />
        <button onClick={onToggleHistory} title="Toggle query history"
          style={mkBtn({
            background: showHistory ? 'rgba(0,229,176,0.1)' : 'transparent',
            border: showHistory ? '1px solid rgba(0,229,176,0.35)' : '1px solid rgba(255,255,255,0.1)',
            color: showHistory ? '#00E5B0' : '#8B949E',
          })}>
          History{historyCount > 0 ? ` (${historyCount})` : ''}
        </button>
        <button onClick={onToggleSnippets} title="SQL snippet library"
          style={mkBtn({
            background: showSnippets ? 'rgba(0,229,176,0.1)' : 'transparent',
            border: showSnippets ? '1px solid rgba(0,229,176,0.35)' : '1px solid rgba(255,255,255,0.1)',
            color: showSnippets ? '#00E5B0' : '#8B949E',
          })}>
          📄 Snippets
        </button>
        <div style={{ position: 'relative' }}>
          <button
            onClick={onToggleBookmark}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark this query'}
            style={mkBtn({
              background: isBookmarked ? 'rgba(234,179,8,0.1)' : 'transparent',
              border: isBookmarked ? '1px solid rgba(234,179,8,0.4)' : '1px solid rgba(255,255,255,0.1)',
              color: isBookmarked ? '#EAB308' : '#8B949E',
            })}
          >
            {isBookmarked ? '🔖' : '🔖'} {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>
          {showBookmarkInput && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', right: 0,
              background: '#161B22', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 7, padding: 10, zIndex: 200, width: 240,
              boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
            }}>
              <input
                autoFocus
                value={bookmarkName}
                onChange={e => onBookmarkNameChange(e.target.value)}
                placeholder="Bookmark name…"
                onKeyDown={e => {
                  if (e.key === 'Enter') onSaveBookmark()
                  if (e.key === 'Escape') onToggleBookmark()
                }}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#0D1117', border: '1px solid rgba(0,229,176,0.4)',
                  borderRadius: 4, padding: '5px 8px', fontSize: 11,
                  fontFamily: 'var(--font-body)', color: '#C9D1D9', outline: 'none',
                }}
              />
              <div style={{ fontSize: 9, color: '#484F58', marginTop: 4, fontFamily: 'var(--font-body)' }}>Press Enter to save · Esc to cancel</div>
            </div>
          )}
        </div>
        <button
          onClick={onToggleBookmarks}
          title="Bookmarks panel"
          style={mkBtn({
            background: showBookmarks ? 'rgba(0,229,176,0.1)' : 'transparent',
            border: showBookmarks ? '1px solid rgba(0,229,176,0.35)' : '1px solid rgba(255,255,255,0.1)',
            color: showBookmarks ? '#00E5B0' : '#8B949E',
          })}
        >
          📚 {bookmarkCount > 0 ? `(${bookmarkCount})` : ''}
        </button>
        <button onClick={onFormat} title="Format SQL (Ctrl+Shift+F)" style={mkBtn()}>Format</button>
        <button onClick={onClear}  title="Clear editor" style={mkBtn()}>Clear</button>
      </div>
    </div>
  )
}

// ── QUERY TAB ELEMENT ─────────────────────────────────────────────────────────

function QueryTabEl({
  tab, active, isRenaming, renameValue,
  onRenameChange, onRenameCommit,
  onClick, onDoubleClick, onClose,
}: {
  tab: QueryTab; active: boolean; isRenaming: boolean
  renameValue: string; onRenameChange(v: string): void; onRenameCommit(): void
  onClick(): void; onDoubleClick(): void
  onClose(e: React.MouseEvent): void
}) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={tab.title}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '0 10px', height: 32, cursor: 'pointer',
        borderBottom: active ? '2px solid #00E5B0' : '2px solid transparent',
        background: active ? 'rgba(255,255,255,0.07)' : hover ? 'rgba(255,255,255,0.03)' : 'transparent',
        color: active ? '#C9D1D9' : '#484F58',
        fontSize: 11, fontFamily: 'var(--font-body)',
        whiteSpace: 'nowrap', flexShrink: 0, position: 'relative',
        transition: 'background 0.1s, color 0.1s',
        userSelect: 'none',
      }}
    >
      {/* Running dot */}
      {tab.isRunning && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5B0', display: 'inline-block', animation: 'tabDot 1s ease-in-out infinite', flexShrink: 0 }} />
      )}
      {/* Dirty dot */}
      {tab.isDirty && !tab.isRunning && (
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'inline-block', flexShrink: 0 }} />
      )}

      {isRenaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={e => onRenameChange(e.target.value)}
          onBlur={onRenameCommit}
          onKeyDown={e => { if (e.key === 'Enter') onRenameCommit(); if (e.key === 'Escape') onRenameCommit() }}
          onClick={e => e.stopPropagation()}
          style={{
            background: '#0D1117', border: '1px solid rgba(0,229,176,0.4)', borderRadius: 3,
            color: '#C9D1D9', fontSize: 11, padding: '1px 4px', outline: 'none', width: 90,
          }}
        />
      ) : (
        <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.title}</span>
      )}

      {/* Close button */}
      <span
        onClick={onClose}
        title="Close tab"
        style={{
          marginLeft: 2, opacity: hover || active ? 0.5 : 0,
          fontSize: 14, lineHeight: 1, color: '#C9D1D9',
          borderRadius: 3, padding: '0 2px',
          transition: 'opacity 0.1s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.opacity = '1'; (e.currentTarget as HTMLSpanElement).style.color = '#EF4444' }}
        onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.opacity = '0.5'; (e.currentTarget as HTMLSpanElement).style.color = '#C9D1D9' }}
      >×</span>
    </div>
  )
}


// ── MESSAGES PANEL ────────────────────────────────────────────────────────────

function MessagesPanel({ messages, onClear }: { messages: string[]; onClear(): void }) {
  if (messages.length === 0) {
    return <Placeholder icon="msg" text="No messages" />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '4px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
        <button onClick={onClear} style={mkBtn({ fontSize: 10, padding: '2px 7px' })}>Clear</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', fontFamily: MONO, fontSize: 12, lineHeight: 1.8 }}>
        {messages.map((msg, i) => {
          let color = '#C9D1D9'
          if (msg.startsWith('(') && msg.includes('rows affected')) color = '#C9D1D9'
          else if (msg === 'Command completed successfully.') color = '#00E5B0'
          else if (msg.startsWith('Completion time:')) color = '#484F58'
          else if (msg.startsWith('Msg ') || /error/i.test(msg)) color = '#EF4444'
          return <div key={i} style={{ color }}>{msg}</div>
        })}
      </div>
    </div>
  )
}

// ── STATISTICS PANEL ──────────────────────────────────────────────────────────

function StatisticsPanel({ stats, connection }: {
  stats: QueryStats | null
  connection: { dbName: string; host: string; port: number } | null
}) {
  if (!stats) return <Placeholder icon="stats" text="No statistics available" />
  const rows: [string, string][] = [
    ['Query',         stats.sql.slice(0, 80) + (stats.sql.length > 80 ? '…' : '')],
    ['Executed At',   fmtDate(stats.executedAt)],
    ['Duration',      `${stats.duration}ms`],
    ['Rows Returned', stats.rowCount !== null ? String(stats.rowCount) : '—'],
    ['Rows Affected', stats.rowsAffected !== null ? String(stats.rowsAffected) : '—'],
    ['Connection',    connection ? `${connection.host}:${connection.port} / ${connection.dbName}` : '—'],
    ['Database',      connection?.dbName ?? '—'],
  ]
  return (
    <div style={{ overflow: 'auto', height: '100%', background: '#0D1117' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(([label, value], i) => (
            <tr key={label} style={{ background: i % 2 === 0 ? '#0D1117' : 'rgba(255,255,255,0.015)' }}>
              <td style={{ width: 160, padding: '5px 16px', fontSize: 11, color: 'var(--text-secondary, #8B949E)', fontFamily: 'var(--font-body)', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'top' }}>{label}</td>
              <td style={{ padding: '5px 16px', fontSize: 11, color: 'var(--text-mono, #C9D1D9)', fontFamily: MONO, borderBottom: '1px solid rgba(255,255,255,0.04)', wordBreak: 'break-all' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── HISTORY PANEL ─────────────────────────────────────────────────────────────

function HistoryPanel({ history, onSelect, onClear }: {
  history: HistoryEntry[]
  onSelect(entry: HistoryEntry): void
  onClear(): void
}) {
  return (
    <div style={{ width: 280, background: '#161B22', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#C9D1D9', fontFamily: 'var(--font-heading)' }}>Query History</span>
        {history.length > 0 && (
          <button onClick={onClear} style={{ background: 'transparent', border: 'none', color: '#8B949E', fontSize: 11, cursor: 'pointer', padding: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#EF4444' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#8B949E' }}>
            Clear all
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {history.length === 0 ? (
          <div style={{ padding: 14, fontSize: 11, color: '#484F58' }}>No history yet.</div>
        ) : history.map((entry, i) => (
          <div key={i} onClick={() => onSelect(entry)}
            style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#1C2128' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: entry.ok ? '#00E5B0' : '#EF4444', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#484F58' }}>{timeAgo(entry.executedAt)}</span>
              {entry.rowCount !== null && <span style={{ fontSize: 10, color: '#484F58', marginLeft: 'auto' }}>{entry.rowCount} rows</span>}
              <span style={{ fontSize: 10, color: '#484F58' }}>{entry.duration}ms</span>
            </div>
            <div style={{ fontSize: 11, color: '#8B949E', fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {truncateSql(entry.sql)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SHARED SUB-COMPONENTS ─────────────────────────────────────────────────────

function Placeholder({ text }: { icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 8, color: 'rgba(255,255,255,0.15)' }}>
      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="9" x2="9" y2="21" />
      </svg>
      <span style={{ fontSize: 12 }}>{text}</span>
    </div>
  )
}

function Sep() {
  return <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 2px', flexShrink: 0 }} />
}
