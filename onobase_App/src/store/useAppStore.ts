import { create } from 'zustand'
import type { ToastMessage } from '../types'
import type { AiProvider } from '../utils/aiProviders'
import { type ThemeId, THEMES, applyTheme } from '../utils/themes'

// ── Bookmark type ──────────────────────────────────────────────────────────────

export interface QueryBookmark {
  id: string
  name: string
  sql: string
  tags: string[]
  createdAt: string
  lastUsedAt: string
  useCount: number
}

// ── Tab types ──────────────────────────────────────────────────────────────────

export interface AppTab {
  id: string
  type: 'query' | 'diagram' | 'dataview' | 'activity' | 'tabledesign' | 'compare' | 'querylog' | 'connections' | 'health'
  title: string
  isDirty: boolean
  queryContent?: string
  tableRef?: { schema: string; table: string }
}

// ── Connection group types ─────────────────────────────────────────────────────

export interface SavedConnection {
  id: string
  name: string
  host: string
  port: number
  database: string
  username: string
  password?: string
  dbType: 'postgresql' | 'mysql' | 'mssql' | 'sqlite'
  color: string
  groupId: string
  filePath?: string
  sshConfig?: {
    sshHost: string; sshPort: number; sshUser: string
    sshPassword?: string; sshPrivateKey?: string
    remoteHost: string; remotePort: number
  }
}

export interface ConnectionGroup {
  id: string
  name: string
  color: string
  connections: SavedConnection[]
}

// ── Store interface ────────────────────────────────────────────────────────────

interface AppStore {
  // Tabs
  tabs: AppTab[]
  activeTabId: string | null
  addTab: (type: AppTab['type'], extra?: Partial<AppTab>) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  setTabDirty: (id: string, dirty: boolean) => void
  updateTabContent: (id: string, content: string) => void

  // Toasts
  toasts: ToastMessage[]
  showToast: (message: string, type: ToastMessage['type']) => void
  dismissToast: (id: string) => void

  // Query stats (for status bar)
  lastQueryDuration: number | null
  lastRowCount: number | null
  setQueryStats: (duration: number, rowCount: number | null) => void

  // Presentation mode
  isPresentationMode: boolean
  togglePresentationMode: () => void

  // Canvas zoom
  zoom: number
  setZoom: (z: number) => void

  // Row limit
  rowLimit: number
  setRowLimit: (n: number) => void

  // Editor settings
  editorFontSize: number
  wordWrap: boolean
  showLineNumbers: boolean
  autoFormat: boolean
  setEditorFontSize: (n: number) => void
  setWordWrap: (v: boolean) => void
  setShowLineNumbers: (v: boolean) => void
  setAutoFormat: (v: boolean) => void

  // AI settings
  aiProvider: AiProvider
  aiModel: string
  aiBaseUrl: string
  aiApiKeys: Partial<Record<AiProvider, string>>
  setAiProvider: (p: AiProvider) => void
  setAiModel: (m: string) => void
  setAiBaseUrl: (u: string) => void
  setAiApiKey: (provider: AiProvider, key: string) => void

  // Theme
  themeId: ThemeId
  setTheme: (id: ThemeId) => void

  // Bookmarks
  bookmarks: QueryBookmark[]
  addBookmark: (name: string, sql: string, tags: string[]) => void
  removeBookmark: (id: string) => void
  updateBookmark: (id: string, patch: Partial<QueryBookmark>) => void

  // Connection groups
  connectionGroups: ConnectionGroup[]
  addGroup: (name: string, color: string) => void
  removeGroup: (id: string) => void
  updateGroup: (id: string, name: string, color: string) => void
  saveConnection: (conn: Omit<SavedConnection, 'id'>) => void
  updateConnection: (id: string, patch: Partial<SavedConnection>) => void
  removeConnection: (id: string) => void
}

// ── Counter for unique query tab ids ──────────────────────────────────────────

let queryTabCounter = 0

// ── Store ──────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>((set) => ({
  // ── Tabs ────────────────────────────────────────────────────────────────────
  tabs: [],
  activeTabId: null,

  addTab: (type, extra) => set(s => {
    // Singletons — just activate if already exists
    const SINGLETONS: AppTab['type'][] = ['diagram', 'activity', 'compare', 'querylog', 'connections']
    if (SINGLETONS.includes(type)) {
      const existing = s.tabs.find(t => t.type === type)
      if (existing) return { activeTabId: existing.id }
      const titleMap: Record<string, string> = {
        diagram: 'Diagram', activity: 'Activity Monitor',
        compare: 'Schema Comparison', querylog: 'Query Log',
        connections: 'Connections', health: 'DB Health',
      }
      const id = type + '_1'
      const tab: AppTab = { id, type, title: titleMap[type] ?? type, isDirty: false, ...extra }
      return { tabs: [...s.tabs, tab], activeTabId: tab.id }
    }

    const queryCount = s.tabs.filter(t => t.type === 'query').length + 1
    const id = type + '_' + Date.now()
    const tab: AppTab = {
      id,
      type,
      title: extra?.title ?? (type === 'query' ? `Query ${queryCount}` : type),
      isDirty: false,
      queryContent: type === 'query' ? '-- New Query\nSELECT ' : undefined,
      ...extra,
    }
    return { tabs: [...s.tabs, tab], activeTabId: id }
  }),

  closeTab: (id) => set(s => {
    const tabs = s.tabs.filter(t => t.id !== id)
    let activeTabId = s.activeTabId
    if (activeTabId === id) {
      const idx = s.tabs.findIndex(t => t.id === id)
      activeTabId = tabs[idx - 1]?.id ?? tabs[idx]?.id ?? null
    }
    return { tabs, activeTabId }
  }),

  setActiveTab: (id) => set({ activeTabId: id }),

  setTabDirty: (id, dirty) => set(s => ({
    tabs: s.tabs.map(t => t.id === id ? { ...t, isDirty: dirty } : t),
  })),

  updateTabContent: (id, content) => set(s => ({
    tabs: s.tabs.map(t => t.id === id ? { ...t, queryContent: content } : t),
  })),

  // ── Toasts ──────────────────────────────────────────────────────────────────
  toasts: [],
  showToast: (message, type) => set(s => ({
    toasts: [...s.toasts, { id: Date.now().toString(), message, type }],
  })),
  dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // ── Query stats ─────────────────────────────────────────────────────────────
  lastQueryDuration: null,
  lastRowCount: null,
  setQueryStats: (lastQueryDuration, lastRowCount) =>
    set({ lastQueryDuration, lastRowCount }),

  // ── Presentation mode ────────────────────────────────────────────────────────
  isPresentationMode: false,
  togglePresentationMode: () => set(s => ({ isPresentationMode: !s.isPresentationMode })),

  // ── Canvas zoom ─────────────────────────────────────────────────────────────
  zoom: 1,
  setZoom: (zoom) => set({ zoom }),

  // ── Row limit ────────────────────────────────────────────────────────────────
  rowLimit: 5000,
  setRowLimit: (rowLimit) => set({ rowLimit }),

  // ── Editor settings ──────────────────────────────────────────────────────────
  editorFontSize: 13,
  wordWrap: true,
  showLineNumbers: true,
  autoFormat: false,
  setEditorFontSize: (editorFontSize) => set({ editorFontSize }),
  setWordWrap: (wordWrap) => set({ wordWrap }),
  setShowLineNumbers: (showLineNumbers) => set({ showLineNumbers }),
  setAutoFormat: (autoFormat) => set({ autoFormat }),

  // ── AI settings ───────────────────────────────────────────────────────────────
  aiProvider: (localStorage.getItem('onobase:ai:provider') as AiProvider) ?? 'anthropic',
  aiModel: localStorage.getItem('onobase:ai:model') ?? 'claude-sonnet-4-6',
  aiBaseUrl: localStorage.getItem('onobase:ai:baseUrl') ?? '',
  aiApiKeys: (() => { try { return JSON.parse(localStorage.getItem('onobase:ai:keys') ?? '{}') } catch { return {} } })(),
  setAiProvider: (aiProvider) => { localStorage.setItem('onobase:ai:provider', aiProvider); set({ aiProvider }) },
  setAiModel: (aiModel) => { localStorage.setItem('onobase:ai:model', aiModel); set({ aiModel }) },
  setAiBaseUrl: (aiBaseUrl) => { localStorage.setItem('onobase:ai:baseUrl', aiBaseUrl); set({ aiBaseUrl }) },
  setAiApiKey: (provider, key) => set(s => {
    const aiApiKeys = { ...s.aiApiKeys, [provider]: key }
    localStorage.setItem('onobase:ai:keys', JSON.stringify(aiApiKeys))
    return { aiApiKeys }
  }),

  // ── Theme ────────────────────────────────────────────────────────────────────
  themeId: (localStorage.getItem('onobase:theme') ?? 'dark') as ThemeId,

  setTheme: (themeId) => {
    localStorage.setItem('onobase:theme', themeId)
    const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]
    applyTheme(theme)
    set({ themeId })
  },

  // ── Bookmarks ─────────────────────────────────────────────────────────────────
  bookmarks: (() => {
    try { return JSON.parse(localStorage.getItem('onobase:bookmarks') ?? '[]') as QueryBookmark[] }
    catch { return [] }
  })(),

  addBookmark: (name, sql, tags) => set(s => {
    const bookmark: QueryBookmark = {
      id: Date.now().toString(), name, sql, tags,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      useCount: 0,
    }
    const bookmarks = [bookmark, ...s.bookmarks]
    localStorage.setItem('onobase:bookmarks', JSON.stringify(bookmarks))
    return { bookmarks }
  }),

  removeBookmark: (id) => set(s => {
    const bookmarks = s.bookmarks.filter(b => b.id !== id)
    localStorage.setItem('onobase:bookmarks', JSON.stringify(bookmarks))
    return { bookmarks }
  }),

  updateBookmark: (id, patch) => set(s => {
    const bookmarks = s.bookmarks.map(b => b.id === id ? { ...b, ...patch } : b)
    localStorage.setItem('onobase:bookmarks', JSON.stringify(bookmarks))
    return { bookmarks }
  }),

  // ── Connection groups ─────────────────────────────────────────────────────────
  connectionGroups: (() => {
    try { return JSON.parse(localStorage.getItem('onobase:connectionGroups') ?? '[]') as ConnectionGroup[] }
    catch { return [] }
  })(),

  addGroup: (name, color) => set(s => {
    const connectionGroups = [
      ...s.connectionGroups,
      { id: Date.now().toString(), name, color, connections: [] },
    ]
    localStorage.setItem('onobase:connectionGroups', JSON.stringify(connectionGroups))
    return { connectionGroups }
  }),

  removeGroup: (id) => set(s => {
    const connectionGroups = s.connectionGroups.filter(g => g.id !== id)
    localStorage.setItem('onobase:connectionGroups', JSON.stringify(connectionGroups))
    return { connectionGroups }
  }),

  updateGroup: (id, name, color) => set(s => {
    const connectionGroups = s.connectionGroups.map(g =>
      g.id === id ? { ...g, name, color } : g
    )
    localStorage.setItem('onobase:connectionGroups', JSON.stringify(connectionGroups))
    return { connectionGroups }
  }),

  saveConnection: (conn) => set(s => {
    const newConn: SavedConnection = { ...conn, id: Date.now().toString() }
    const connectionGroups = s.connectionGroups.map(g =>
      g.id === conn.groupId ? { ...g, connections: [...g.connections, newConn] } : g
    )
    localStorage.setItem('onobase:connectionGroups', JSON.stringify(connectionGroups))
    return { connectionGroups }
  }),

  updateConnection: (id, patch) => set(s => {
    const connectionGroups = s.connectionGroups.map(g => ({
      ...g,
      connections: g.connections.map(c => c.id === id ? { ...c, ...patch } : c),
    }))
    localStorage.setItem('onobase:connectionGroups', JSON.stringify(connectionGroups))
    return { connectionGroups }
  }),

  removeConnection: (id) => set(s => {
    const connectionGroups = s.connectionGroups.map(g => ({
      ...g,
      connections: g.connections.filter(c => c.id !== id),
    }))
    localStorage.setItem('onobase:connectionGroups', JSON.stringify(connectionGroups))
    return { connectionGroups }
  }),
}))
