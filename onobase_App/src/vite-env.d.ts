/// <reference types="vite/client" />

interface ElectronAPI {
  connectDB: (config: {
    host: string; port: number; database: string; user: string; password: string
    dbType: 'postgresql' | 'mysql' | 'mssql' | 'sqlite'
    filePath?: string
  }) => Promise<{ ok: true } | { ok: false; error: string }>

  disconnectDB: () => Promise<{ ok: boolean }>

  listDatabases: (config: {
    host: string; port: number; user: string; password: string
  }) => Promise<{ ok: true; databases: string[] } | { ok: false; error: string }>

  queryDB: (sql: string, params: unknown[]) => Promise<{
    ok: true
    rows: Record<string, unknown>[]
    fields: { name: string; dataTypeID: number }[]
    rowCount: number | null
  } | { ok: false; error: string }>

  getSchema: () => Promise<{
    ok: true
    tables: { table_schema: string; table_name: string }[]
    columns: {
      table_schema: string; table_name: string
      column_name: string; data_type: string
      is_nullable: string; is_pk: boolean
    }[]
    fkRelations: {
      source_schema: string; source_table: string; source_column: string
      target_schema: string; target_table: string; target_column: string
    }[]
  } | { ok: false; error: string }>

  saveFile: (content: string, defaultPath?: string) => Promise<
    { ok: true; filePath: string } | { ok: false; error?: string }
  >

  openFile: () => Promise<
    { ok: true; content: string; filePath: string } | { ok: false; error?: string; filePath?: string }
  >

  saveLayout: (connectionKey: string, layout: unknown) => Promise<{ ok: boolean; error?: string }>
  loadLayout: (connectionKey: string) => Promise<{ ok: boolean; layout: unknown | null }>
  getObjects: (type: string) => Promise<{
    ok: true; objects: { schema_name: string; object_name: string }[]
  } | { ok: false; error: string }>

  scriptObject: (config: {
    objectType: 'table' | 'view' | 'procedure' | 'function' | 'trigger'
    schemaName: string
    objectName: string
    scriptType: 'create' | 'drop' | 'select' | 'insert' | 'alter'
  }) => Promise<{ ok: true; sql: string } | { ok: false; error: string }>

  explainQuery: (sql: string) => Promise<{
    ok: true; plan: object; textPlan: string
  } | { ok: false; error: string }>

  getActivity: () => Promise<{
    ok: true
    sessions: Record<string, unknown>[]
    dbStats: Record<string, unknown>
    tableStats: Record<string, unknown>[]
  } | { ok: false; error: string }>

  killQuery: (pid: number) => Promise<{ ok: boolean; error?: string }>

  gitOpenRepo: () => Promise<{ ok: true; path: string } | { ok: false }>
  gitStatus: (repoPath: string) => Promise<{ ok: true; status: GitStatus } | { ok: false; error: string }>
  gitCommit: (config: { repoPath: string; message: string; files: string[] }) => Promise<{ ok: boolean; error?: string }>
  gitLog: (repoPath: string) => Promise<{ ok: true; log: GitLogEntry[] } | { ok: false; error: string }>

  updateCell: (config: {
    schema: string; table: string; pkColumn: string
    pkValue: unknown; column: string; newValue: unknown
  }) => Promise<{ ok: true; sql: string } | { ok: false; error: string }>

  deleteRows: (config: {
    schema: string; table: string; pkColumn: string; pkValues: unknown[]
  }) => Promise<{ ok: true } | { ok: false; error: string }>

  insertRows: (config: {
    schema: string; table: string; columns: string[]; rows: unknown[][]
  }) => Promise<{ ok: true; inserted: number } | { ok: false; error: string }>

  searchAll: (config: {
    searchText: string; schemas: string[]; maxResults: number
  }) => Promise<{
    ok: true
    results: {
      schema: string; table: string; column: string
      value: string; rowData: Record<string, unknown>
    }[]
  } | { ok: false; error: string }>

  // ── Schema comparison ──────────────────────────────────────────────────────
  connectCompare: (config: {
    host: string; port: number; database: string
    user: string; password: string
    dbType: 'postgresql' | 'mysql' | 'mssql' | 'sqlite'
    filePath?: string
  }) => Promise<{ ok: true } | { ok: false; error: string }>

  compareSchemas: () => Promise<{
    ok: true
    onlyInA: string[]; onlyInB: string[]; inBoth: string[]
    columnDiffs: { table: string; column: string; status: 'added' | 'removed' | 'changed'; detail: string }[]
    summary: { tablesOnlyInA: number; tablesOnlyInB: number; tablesInBoth: number; columnDiffs: number }
  } | { ok: false; error: string }>

  disconnectCompare: () => Promise<{ ok: true }>

  // ── Query log ──────────────────────────────────────────────────────────────
  logAppend: (entry: {
    id: string; sql: string; database: string; host: string
    executedAt: string; duration: number; rowCount: number | null; ok: boolean; error: string | null
  }) => Promise<{ ok: boolean }>

  logLoad: (config: {
    limit: number; search?: string; startDate?: string; endDate?: string
  }) => Promise<{
    ok: true; total: number
    entries: Record<string, unknown>[]
  } | { ok: false; error: string }>

  logClear: () => Promise<{ ok: boolean }>

  // ── SSH tunnel ─────────────────────────────────────────────────────────────
  sshConnect: (config: {
    sshHost: string; sshPort: number; sshUser: string
    sshPassword?: string; sshPrivateKey?: string
    remoteHost: string; remotePort: number
  }) => Promise<{ ok: true; localPort: number } | { ok: false; error: string }>

  sshDisconnect: () => Promise<{ ok: true }>

  getHealth: () => Promise<{
    ok: true
    dbStat: Record<string, unknown>
    tableStats: Record<string, unknown>[]
    indexStats: Record<string, unknown>[]
    cacheStats: Record<string, unknown>
    connStats: Record<string, unknown>[]
  } | { ok: false; error: string }>
}

interface GitStatus {
  modified: string[]
  created: string[]
  deleted: string[]
  not_added: string[]
  staged: string[]
}

interface GitLogEntry {
  hash: string
  date: string
  message: string
  author_name: string
}

interface Window {
  electronAPI: ElectronAPI
}
