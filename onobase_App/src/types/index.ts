// ── Database types ────────────────────────────────────────────────────────────
export type DbType = 'postgresql' | 'mysql' | 'mssql' | 'sqlite' | 'oracle'

export interface Connection {
  id: string
  name: string
  type: DbType
  host: string
  port: number
  database: string
  username: string
  password?: string
  ssl: boolean
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  errorMessage?: string
}

// ── Schema types ──────────────────────────────────────────────────────────────
export interface Column {
  name: string
  type: string
  nullable: boolean
  isPrimaryKey: boolean
  isForeignKey: boolean
  references?: { table: string; column: string }
  defaultValue?: string
}

export interface Table {
  id: string           // "schema.tableName"
  name: string
  schema: string
  columns: Column[]
  rowCount?: number
  position: { x: number; y: number }  // within module
}

export interface FKRelation {
  source_schema: string
  source_table: string
  source_column: string
  target_schema: string
  target_table: string
  target_column: string
}

// ── Module / Canvas types ─────────────────────────────────────────────────────
export interface ModuleColor {
  id: string
  hex: string
  bg: string
}

export interface Module {
  id: string
  name: string
  colorId: string
  customHex?: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  collapsed: boolean
  tableIds: string[]
  tablePositions: Record<string, { x: number; y: number; w?: number }>
  connections: string[]  // connected module ids
}

// ── Query types ───────────────────────────────────────────────────────────────
export interface QueryResult {
  rows: Record<string, unknown>[]
  columns: string[]
  rowCount: number | null
  duration: number
  error?: string
}

export interface QueryTab {
  id: string
  title: string
  sql: string
  result?: QueryResult
  isRunning: boolean
}

// ── Toast ─────────────────────────────────────────────────────────────────────
export interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

// ── App view ──────────────────────────────────────────────────────────────────
export type AppView = 'canvas' | 'query' | 'diagram'

// ── Legacy canvas bridge types (used by Canvas.tsx and App.tsx) ───────────────
/** Alias of ModuleColor — kept for Canvas/App compatibility */
export type OnoColor = ModuleColor

/** The "view" representation of a module passed to Canvas (bridged from Module store) */
export interface OnoModule {
  id: string
  name: string
  cid: string           // color id
  customHex?: string
  x: number
  y: number
  width: number
  height: number
  collapsed?: boolean
  tableIds: string[]
  tablePositions: Record<string, { x: number; y: number }>
  conn: string[]        // ids of connected modules
}

/** Render-time schema info for a single table */
export interface TableInfo {
  schema: string
  name: string
  cols: { name: string; type: string; isPk: boolean; isFk?: boolean; isNullable?: boolean }[]
}
