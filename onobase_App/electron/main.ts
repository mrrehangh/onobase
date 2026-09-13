import { app, BrowserWindow, ipcMain, dialog, session } from 'electron'
import path from 'path'
import { readFile, writeFile } from 'fs/promises'
import fs from 'fs'
import net from 'net'
import { Pool as PgPool } from 'pg'
import mysql from 'mysql2/promise'
import * as mssql from 'mssql'
import Database from 'better-sqlite3'
import { Client as SshClient } from 'ssh2'

const isDev = process.env.NODE_ENV === 'development'

// ── Schema queries (copied from src/utils — electron cannot import from src) ──
const PG_TABLES = `
  SELECT table_schema, table_name
  FROM information_schema.tables
  WHERE table_schema NOT IN ('information_schema','pg_catalog')
    AND table_type = 'BASE TABLE'
  ORDER BY table_schema, table_name`

const PG_COLUMNS = `
  SELECT
    c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable,
    EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name = c.table_name
        AND tc.table_schema = c.table_schema
        AND kcu.column_name = c.column_name
    ) AS is_pk
  FROM information_schema.columns c
  WHERE c.table_schema NOT IN ('information_schema','pg_catalog')
  ORDER BY c.table_schema, c.table_name, c.ordinal_position`

const PG_FK = `
  SELECT
    kcu.table_schema AS source_schema, kcu.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_schema AS target_schema, ccu.table_name AS target_table,
    ccu.column_name AS target_column
  FROM information_schema.key_column_usage kcu
  JOIN information_schema.referential_constraints rc
    ON kcu.constraint_name = rc.constraint_name
   AND kcu.table_schema = rc.constraint_schema
  JOIN information_schema.constraint_column_usage ccu
    ON rc.unique_constraint_name = ccu.constraint_name
   AND rc.unique_constraint_schema = ccu.constraint_schema
  WHERE kcu.table_schema NOT IN ('information_schema','pg_catalog')`

const MYSQL_TABLES = `
  SELECT table_schema, table_name
  FROM information_schema.tables
  WHERE table_type = 'BASE TABLE'
    AND table_schema NOT IN ('information_schema','mysql','performance_schema','sys')
  ORDER BY table_schema, table_name`

const MYSQL_COLUMNS = `
  SELECT table_schema, table_name, column_name, data_type, is_nullable,
    IF(column_key='PRI', 1, 0) AS is_pk
  FROM information_schema.columns
  WHERE table_schema NOT IN ('information_schema','mysql','performance_schema','sys')
  ORDER BY table_schema, table_name, ordinal_position`

const MYSQL_FK = `
  SELECT
    table_schema AS source_schema, table_name AS source_table,
    column_name AS source_column,
    referenced_table_schema AS target_schema, referenced_table_name AS target_table,
    referenced_column_name AS target_column
  FROM information_schema.key_column_usage
  WHERE referenced_table_name IS NOT NULL`

const MSSQL_TABLES = `
  SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS table_name
  FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'
  ORDER BY TABLE_SCHEMA, TABLE_NAME`

const MSSQL_COLUMNS = `
  SELECT
    c.TABLE_SCHEMA AS table_schema, c.TABLE_NAME AS table_name,
    c.COLUMN_NAME AS column_name, c.DATA_TYPE AS data_type,
    c.IS_NULLABLE AS is_nullable,
    CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS is_pk
  FROM INFORMATION_SCHEMA.COLUMNS c
  LEFT JOIN (
    SELECT ku.TABLE_NAME, ku.COLUMN_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
      ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
    WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
  ) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
  ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION`

const MSSQL_FK = `
  SELECT
    fk.TABLE_SCHEMA AS source_schema, fk.TABLE_NAME AS source_table,
    cu.COLUMN_NAME AS source_column,
    pk.TABLE_SCHEMA AS target_schema, pk.TABLE_NAME AS target_table,
    pt.COLUMN_NAME AS target_column
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS fk ON rc.CONSTRAINT_NAME = fk.CONSTRAINT_NAME
  JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk ON rc.UNIQUE_CONSTRAINT_NAME = pk.CONSTRAINT_NAME
  JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE cu ON fk.CONSTRAINT_NAME = cu.CONSTRAINT_NAME
  JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pt ON pk.CONSTRAINT_NAME = pt.CONSTRAINT_NAME`

// ── Active connection ────────────────────────────────────────────────────────
type ActiveConnection =
  | { type: 'postgresql'; pool: InstanceType<typeof PgPool> }
  | { type: 'mysql';      conn: mysql.Connection }
  | { type: 'mssql';      pool: mssql.ConnectionPool }
  | { type: 'sqlite';     db: InstanceType<typeof Database> }

let activeConn:  ActiveConnection | null = null
let compareConn: ActiveConnection | null = null
let sshTunnel: {
  client: InstanceType<typeof SshClient>
  server: net.Server
  localPort: number
} | null = null

// ── SSH tunnel factory ────────────────────────────────────────────────────────
async function createSshTunnel(config: {
  sshHost: string; sshPort: number; sshUser: string
  sshPassword?: string; sshPrivateKey?: string
  remoteHost: string; remotePort: number
}): Promise<number> {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient()
    const localPort = 54320 + Math.floor(Math.random() * 1000)
    ssh.on('ready', () => {
      const server = net.createServer(sock => {
        ssh.forwardOut('127.0.0.1', localPort, config.remoteHost, config.remotePort, (err, stream) => {
          if (err) { sock.end(); return }
          sock.pipe(stream); stream.pipe(sock)
        })
      })
      server.listen(localPort, '127.0.0.1', () => {
        sshTunnel = { client: ssh, server, localPort }
        resolve(localPort)
      })
    })
    ssh.on('error', reject)
    const connectConfig: import('ssh2').ConnectConfig = {
      host: config.sshHost, port: config.sshPort, username: config.sshUser,
    }
    if (config.sshPassword)   connectConfig.password   = config.sshPassword
    if (config.sshPrivateKey) connectConfig.privateKey = config.sshPrivateKey
    ssh.connect(connectConfig)
  })
}

// ── Window factory ───────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    backgroundColor: '#0D1117',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Onobase',
  })

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Onobase] Renderer failed to load:', errorCode, errorDescription)
  })

  // Suppress CSP warning in development only
  if (isDev) {
    app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors')
  }

  // Set a permissive CSP for dev so Vite HMR and inline scripts work
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
        ],
      },
    })
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// ── IPC handlers ─────────────────────────────────────────────────────────────
function registerIpcHandlers() {

// ── db:connect ───────────────────────────────────────────────────────────────
ipcMain.handle('db:connect', async (_, config: {
  host: string; port: number; database: string
  user: string; password: string
  dbType: 'postgresql' | 'mysql' | 'mssql' | 'sqlite'
  filePath?: string
}) => {
  // Close existing connection
  if (activeConn) {
    try {
      if (activeConn.type === 'postgresql') await activeConn.pool.end()
      else if (activeConn.type === 'mysql')  await activeConn.conn.end()
      else if (activeConn.type === 'mssql')  await activeConn.pool.close()
      else if (activeConn.type === 'sqlite') activeConn.db.close()
    } catch {}
    activeConn = null
  }

  try {
    if (config.dbType === 'postgresql') {
      const pool = new PgPool({
        host: config.host, port: config.port,
        database: config.database,
        user: config.user, password: config.password,
        connectionTimeoutMillis: 5000,
      })
      await pool.query('SELECT 1')
      activeConn = { type: 'postgresql', pool }

    } else if (config.dbType === 'mysql') {
      const conn = await mysql.createConnection({
        host: config.host, port: config.port,
        database: config.database,
        user: config.user, password: config.password,
        connectTimeout: 5000,
      })
      await conn.query('SELECT 1')
      activeConn = { type: 'mysql', conn }

    } else if (config.dbType === 'mssql') {
      const pool = await mssql.connect({
        server: config.host, port: config.port,
        database: config.database,
        user: config.user, password: config.password,
        options: { trustServerCertificate: true, connectTimeout: 5000 },
      })
      activeConn = { type: 'mssql', pool }

    } else if (config.dbType === 'sqlite') {
      const db = new Database(config.filePath ?? config.database)
      activeConn = { type: 'sqlite', db }
    }

    return { ok: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('DB CONNECT ERROR:', msg)
    return { ok: false, error: msg }
  }
})

// ── db:listDatabases (PostgreSQL only) ───────────────────────────────────────
ipcMain.handle('db:listDatabases', async (_, config: {
  host: string; port: number; user: string; password: string
}) => {
  const tryDbs = ['postgres', 'template1']
  for (const database of tryDbs) {
    const pool = new PgPool({ ...config, database, connectionTimeoutMillis: 5000 })
    try {
      const result = await pool.query<{ datname: string }>(
        `SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname`
      )
      await pool.end()
      return { ok: true, databases: result.rows.map(r => r.datname) }
    } catch {
      try { await pool.end() } catch {}
    }
  }
  return { ok: false, error: 'Could not list databases.' }
})

// ── db:disconnect ────────────────────────────────────────────────────────────
ipcMain.handle('db:disconnect', async () => {
  if (activeConn) {
    try {
      if (activeConn.type === 'postgresql') await activeConn.pool.end()
      else if (activeConn.type === 'mysql')  await activeConn.conn.end()
      else if (activeConn.type === 'mssql')  await activeConn.pool.close()
      else if (activeConn.type === 'sqlite') activeConn.db.close()
    } catch {}
    activeConn = null
  }
  return { ok: true }
})

// ── db:query ─────────────────────────────────────────────────────────────────
ipcMain.handle('db:query', async (_, sql: string, params: unknown[]) => {
  if (!activeConn) return { ok: false, error: 'Not connected' }
  try {
    if (activeConn.type === 'postgresql') {
      const r = await activeConn.pool.query(sql, params)
      return {
        ok: true,
        rows: r.rows,
        fields: r.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
        rowCount: r.rowCount,
      }
    } else if (activeConn.type === 'mysql') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [rows, fields] = await activeConn.conn.execute(sql, params as any)
      return {
        ok: true,
        rows: rows as Record<string, unknown>[],
        fields: (fields as { name: string }[]).map(f => ({ name: f.name, dataTypeID: 0 })),
        rowCount: (rows as unknown[]).length,
      }
    } else if (activeConn.type === 'mssql') {
      const r = await activeConn.pool.request().query(sql)
      const colNames = r.recordset.columns ? Object.keys(r.recordset.columns) : []
      return {
        ok: true,
        rows: r.recordset as Record<string, unknown>[],
        fields: colNames.map(name => ({ name, dataTypeID: 0 })),
        rowCount: r.rowsAffected[0],
      }
    } else if (activeConn.type === 'sqlite') {
      const stmt = activeConn.db.prepare(sql)
      const rows = stmt.all(...(params as Parameters<typeof stmt.all>))
      const fields = rows.length > 0
        ? Object.keys(rows[0] as object).map(name => ({ name, dataTypeID: 0 }))
        : []
      return { ok: true, rows: rows as Record<string, unknown>[], fields, rowCount: rows.length }
    }
    return { ok: false, error: 'Unknown connection type' }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── db:schema ─────────────────────────────────────────────────────────────────
ipcMain.handle('db:schema', async () => {
  if (!activeConn) return { ok: false, error: 'Not connected' }
  try {
    if (activeConn.type === 'postgresql') {
      const tables     = await activeConn.pool.query(PG_TABLES)
      const columns    = await activeConn.pool.query(PG_COLUMNS)
      const fkRelations = await activeConn.pool.query(PG_FK)
      return { ok: true, tables: tables.rows, columns: columns.rows, fkRelations: fkRelations.rows }

    } else if (activeConn.type === 'mysql') {
      const [tables]     = await activeConn.conn.execute(MYSQL_TABLES)
      const [columns]    = await activeConn.conn.execute(MYSQL_COLUMNS)
      const [fkRelations] = await activeConn.conn.execute(MYSQL_FK)
      return {
        ok: true,
        tables: tables as Record<string, unknown>[],
        columns: columns as Record<string, unknown>[],
        fkRelations: fkRelations as Record<string, unknown>[],
      }

    } else if (activeConn.type === 'mssql') {
      const tables     = await activeConn.pool.request().query(MSSQL_TABLES)
      const columns    = await activeConn.pool.request().query(MSSQL_COLUMNS)
      const fkRelations = await activeConn.pool.request().query(MSSQL_FK)
      return {
        ok: true,
        tables: tables.recordset as Record<string, unknown>[],
        columns: columns.recordset as Record<string, unknown>[],
        fkRelations: fkRelations.recordset as Record<string, unknown>[],
      }

    } else if (activeConn.type === 'sqlite') {
      // SQLite: PRAGMA-based schema introspection
      const tableList = activeConn.db.prepare(
        `SELECT name AS table_name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
      ).all() as { table_name: string }[]

      const tables = tableList.map(t => ({
        table_schema: 'main', table_name: t.table_name,
      }))

      const columns: Record<string, unknown>[] = []
      for (const t of tableList) {
        const cols = activeConn.db.prepare(`PRAGMA table_info("${t.table_name}")`).all() as {
          cid: number; name: string; type: string; notnull: number; pk: number
        }[]
        for (const c of cols) {
          columns.push({
            table_schema: 'main', table_name: t.table_name,
            column_name: c.name, data_type: c.type || 'TEXT',
            is_nullable: c.notnull ? 'NO' : 'YES', is_pk: c.pk > 0,
          })
        }
      }

      const fkRelations: Record<string, unknown>[] = []
      for (const t of tableList) {
        const fks = activeConn.db.prepare(`PRAGMA foreign_key_list("${t.table_name}")`).all() as {
          from: string; table: string; to: string
        }[]
        for (const fk of fks) {
          fkRelations.push({
            source_schema: 'main', source_table: t.table_name, source_column: fk.from,
            target_schema: 'main', target_table: fk.table, target_column: fk.to,
          })
        }
      }

      return { ok: true, tables, columns, fkRelations }
    }

    return { ok: false, error: 'Unknown connection type' }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── db:objects ────────────────────────────────────────────────────────────────
ipcMain.handle('db:objects', async (_, type: 'views' | 'procedures' | 'functions' | 'triggers' | 'users' | 'roles') => {
  if (!activeConn) return { ok: false, error: 'Not connected' }

  const pgQueries: Record<string, string> = {
    views: `
      SELECT table_schema AS schema_name, table_name AS object_name
      FROM information_schema.views
      WHERE table_schema NOT IN ('information_schema','pg_catalog')
      ORDER BY table_schema, table_name`,
    procedures: `
      SELECT routine_schema AS schema_name, routine_name AS object_name
      FROM information_schema.routines
      WHERE routine_type = 'PROCEDURE'
        AND routine_schema NOT IN ('information_schema','pg_catalog')
      ORDER BY routine_schema, routine_name`,
    functions: `
      SELECT routine_schema AS schema_name, routine_name AS object_name
      FROM information_schema.routines
      WHERE routine_type = 'FUNCTION'
        AND routine_schema NOT IN ('information_schema','pg_catalog')
      ORDER BY routine_schema, routine_name`,
    triggers: `
      SELECT trigger_schema AS schema_name, trigger_name AS object_name
      FROM information_schema.triggers
      WHERE trigger_schema NOT IN ('information_schema','pg_catalog')
      ORDER BY trigger_schema, trigger_name`,
    users: `
      SELECT usename AS object_name, 'public' AS schema_name
      FROM pg_user ORDER BY usename`,
    roles: `
      SELECT rolname AS object_name, 'public' AS schema_name
      FROM pg_roles WHERE rolname NOT LIKE 'pg_%' ORDER BY rolname`,
  }

  try {
    if (activeConn.type !== 'postgresql') return { ok: true, objects: [] }
    const sql = pgQueries[type]
    if (!sql) return { ok: false, error: 'Unknown type' }
    const r = await activeConn.pool.query<{ schema_name: string; object_name: string }>(sql)
    return { ok: true, objects: r.rows }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── layout:save ───────────────────────────────────────────────────────────────
ipcMain.handle('layout:save', async (_, connectionKey: string, layout: unknown) => {
  try {
    const dir  = app.getPath('userData')
    const file = path.join(dir, 'layouts.json')
    let all: Record<string, unknown> = {}
    try { all = JSON.parse(fs.readFileSync(file, 'utf-8')) } catch {}
    all[connectionKey] = layout
    fs.writeFileSync(file, JSON.stringify(all, null, 2))
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── layout:load ───────────────────────────────────────────────────────────────
ipcMain.handle('layout:load', async (_, connectionKey: string) => {
  try {
    const dir  = app.getPath('userData')
    const file = path.join(dir, 'layouts.json')
    const all  = JSON.parse(fs.readFileSync(file, 'utf-8'))
    return { ok: true, layout: all[connectionKey] ?? null }
  } catch {
    return { ok: true, layout: null }
  }
})

// ── dialog:saveFile ───────────────────────────────────────────────────────────
ipcMain.handle('dialog:saveFile', async (_, content: string, defaultPath?: string) => {
  const win = BrowserWindow.getFocusedWindow()
  const result = await dialog.showSaveDialog(win!, {
    defaultPath: defaultPath ?? 'query.sql',
    filters: [
      { name: 'SQL Files', extensions: ['sql'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  if (result.canceled || !result.filePath) return { ok: false }
  try {
    await writeFile(result.filePath, content, 'utf-8')
    return { ok: true, filePath: result.filePath }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── dialog:openFile ───────────────────────────────────────────────────────────
ipcMain.handle('dialog:openFile', async () => {
  const win = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(win!, {
    title: 'Open File',
    properties: ['openFile'],
    filters: [
      { name: 'SQLite Databases', extensions: ['db', 'sqlite', 'sqlite3'] },
      { name: 'SQL Files', extensions: ['sql'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  if (result.canceled || result.filePaths.length === 0) return { ok: false }
  try {
    const filePath = result.filePaths[0]
    // For SQL files, return content; for DB files just return path
    if (filePath.endsWith('.sql')) {
      const content = await readFile(filePath, 'utf-8')
      return { ok: true, content, filePath }
    }
    return { ok: true, content: '', filePath }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── db:scriptObject ───────────────────────────────────────────────────────────
ipcMain.handle('db:scriptObject', async (_, config: {
  objectType: 'table' | 'view' | 'procedure' | 'function' | 'trigger'
  schemaName: string
  objectName: string
  scriptType: 'create' | 'drop' | 'select' | 'insert' | 'alter'
}) => {
  if (!activeConn) return { ok: false, error: 'Not connected' }
  if (activeConn.type !== 'postgresql') return { ok: false, error: 'Script generation requires PostgreSQL' }
  try {
    let sql = ''
    const pool = activeConn.pool
    const full = `"${config.schemaName}"."${config.objectName}"`

    if (config.scriptType === 'select') {
      const cols = await pool.query<{ column_name: string }>(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [config.schemaName, config.objectName])
      const colList = cols.rows.map(r => `  "${r.column_name}"`).join(',\n')
      sql = `SELECT\n${colList}\nFROM ${full};`

    } else if (config.scriptType === 'insert') {
      const cols = await pool.query<{ column_name: string; data_type: string }>(`
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [config.schemaName, config.objectName])
      const colNames = cols.rows.map(r => `"${r.column_name}"`).join(', ')
      const values   = cols.rows.map(r => `<${r.data_type}>`).join(', ')
      sql = `INSERT INTO ${full}\n  (${colNames})\nVALUES\n  (${values});`

    } else if (config.scriptType === 'drop') {
      sql = `DROP ${config.objectType.toUpperCase()} IF EXISTS ${full};`

    } else if (config.scriptType === 'create') {
      const result = await pool.query<{ ddl: string }>(`
        SELECT
          'CREATE TABLE ' || quote_ident(n.nspname) || '.' || quote_ident(c.relname)
          || E'\n(\n' ||
          array_to_string(array_agg(
            '  ' || quote_ident(a.attname)
            || ' ' || pg_catalog.format_type(a.atttypid, a.atttypmod)
            || CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END
            || CASE WHEN ad.adbin IS NOT NULL
               THEN ' DEFAULT ' || pg_catalog.pg_get_expr(ad.adbin, ad.adrelid) ELSE '' END
            ORDER BY a.attnum
          ), E',\n') || E'\n);' AS ddl
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
        LEFT JOIN pg_catalog.pg_attrdef ad ON ad.adrelid = c.oid AND ad.adnum = a.attnum
        WHERE n.nspname = $1 AND c.relname = $2
        GROUP BY n.nspname, c.relname
      `, [config.schemaName, config.objectName])
      sql = result.rows[0]?.ddl ?? `-- Could not generate DDL for ${full}`

    } else if (config.scriptType === 'alter') {
      sql = `ALTER TABLE ${full}\n  ADD COLUMN new_column VARCHAR(255);\n-- Modify as needed`
    }

    return { ok: true, sql }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── db:explain ────────────────────────────────────────────────────────────────
ipcMain.handle('db:explain', async (_, sql: string) => {
  if (!activeConn) return { ok: false, error: 'Not connected' }
  if (activeConn.type !== 'postgresql') return { ok: false, error: 'Explain requires PostgreSQL' }
  try {
    const pool = activeConn.pool
    const json = await pool.query(`EXPLAIN (FORMAT JSON, ANALYZE false) ${sql}`)
    const text = await pool.query(`EXPLAIN ${sql}`)
    return {
      ok: true,
      plan: json.rows[0]['QUERY PLAN'][0] as object,
      textPlan: (text.rows as Array<{ 'QUERY PLAN': string }>).map(r => r['QUERY PLAN']).join('\n'),
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── db:activity ───────────────────────────────────────────────────────────────
ipcMain.handle('db:activity', async () => {
  if (!activeConn || activeConn.type !== 'postgresql')
    return { ok: false, error: 'Not connected to PostgreSQL' }
  try {
    const pool = activeConn.pool
    const sessions = await pool.query(`
      SELECT pid, usename, datname, application_name, client_addr::text, state,
        wait_event_type, wait_event,
        EXTRACT(EPOCH FROM (NOW() - query_start))::INT AS duration_seconds,
        LEFT(query, 100) AS query
      FROM pg_stat_activity
      WHERE pid <> pg_backend_pid()
      ORDER BY query_start DESC NULLS LAST
    `)
    const dbStats = await pool.query(`
      SELECT numbackends, xact_commit, xact_rollback,
        blks_read, blks_hit,
        tup_returned, tup_fetched, tup_inserted, tup_updated, tup_deleted
      FROM pg_stat_database WHERE datname = current_database()
    `)
    const tableStats = await pool.query(`
      SELECT schemaname, relname, seq_scan, idx_scan,
        n_live_tup, n_dead_tup,
        last_vacuum, last_analyze
      FROM pg_stat_user_tables ORDER BY seq_scan + idx_scan DESC LIMIT 20
    `)
    return { ok: true, sessions: sessions.rows, dbStats: dbStats.rows[0], tableStats: tableStats.rows }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── db:killQuery ──────────────────────────────────────────────────────────────
ipcMain.handle('db:killQuery', async (_, pid: number) => {
  if (!activeConn || activeConn.type !== 'postgresql')
    return { ok: false, error: 'Not connected to PostgreSQL' }
  try {
    await activeConn.pool.query('SELECT pg_cancel_backend($1)', [pid])
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── git:* ─────────────────────────────────────────────────────────────────────
ipcMain.handle('git:openRepo', async () => {
  const win = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(win!, {
    title: 'Open Git Repository', properties: ['openDirectory'],
  })
  if (result.canceled) return { ok: false }
  return { ok: true, path: result.filePaths[0] }
})

ipcMain.handle('git:status', async (_, repoPath: string) => {
  try {
    const { default: simpleGit } = await import('simple-git')
    const git = simpleGit(repoPath)
    const status = await git.status()
    return { ok: true, status }
  } catch (err: unknown) { return { ok: false, error: String(err) } }
})

ipcMain.handle('git:commit', async (_, config: { repoPath: string; message: string; files: string[] }) => {
  try {
    const { default: simpleGit } = await import('simple-git')
    const git = simpleGit(config.repoPath)
    await git.add(config.files)
    await git.commit(config.message)
    return { ok: true }
  } catch (err: unknown) { return { ok: false, error: String(err) } }
})

ipcMain.handle('git:log', async (_, repoPath: string) => {
  try {
    const { default: simpleGit } = await import('simple-git')
    const git = simpleGit(repoPath)
    const log = await git.log({ maxCount: 20 })
    return { ok: true, log: log.all }
  } catch (err: unknown) { return { ok: false, error: String(err) } }
})


// ── db:health ─────────────────────────────────────────────────────────────────
ipcMain.handle('db:health', async () => {
  if (!activeConn || activeConn.type !== 'postgresql')
    return { ok: false, error: 'Requires an active PostgreSQL connection' }
  try {
    const [dbStat, tableStats, indexStats, cacheStats, connStats] = await Promise.all([
      activeConn.pool.query(`
        SELECT
          pg_size_pretty(pg_database_size(current_database())) AS db_size,
          (SELECT count(*) FROM pg_stat_activity WHERE state != 'idle') AS active_connections,
          (SELECT count(*) FROM pg_stat_activity) AS total_connections`),
      activeConn.pool.query(`
        SELECT schemaname, relname AS table_name, n_live_tup AS live_rows, n_dead_tup AS dead_rows,
          ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 1) AS dead_pct,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size,
          last_vacuum, last_analyze
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC LIMIT 20`),
      activeConn.pool.query(`
        SELECT schemaname, relname AS table_name, indexrelname AS index_name,
          idx_scan AS scans, pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
        FROM pg_stat_user_indexes ORDER BY idx_scan ASC LIMIT 10`),
      activeConn.pool.query(`
        SELECT sum(blks_hit) AS hits, sum(blks_read) AS reads,
          ROUND(sum(blks_hit)::numeric / NULLIF(sum(blks_hit) + sum(blks_read), 0) * 100, 2) AS cache_hit_rate
        FROM pg_stat_database WHERE datname = current_database()`),
      activeConn.pool.query(`SELECT count(*) AS count, state FROM pg_stat_activity GROUP BY state`),
    ])
    return {
      ok: true,
      dbStat: dbStat.rows[0],
      tableStats: tableStats.rows,
      indexStats: indexStats.rows,
      cacheStats: cacheStats.rows[0],
      connStats: connStats.rows,
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── db:connectCompare ─────────────────────────────────────────────────────────
ipcMain.handle('db:connectCompare', async (_, config: {
  host: string; port: number; database: string
  user: string; password: string
  dbType: 'postgresql' | 'mysql' | 'mssql' | 'sqlite'
  filePath?: string
}) => {
  if (compareConn) {
    try {
      if (compareConn.type === 'postgresql') await compareConn.pool.end()
      else if (compareConn.type === 'mysql')  await compareConn.conn.end()
      else if (compareConn.type === 'mssql')  await compareConn.pool.close()
      else if (compareConn.type === 'sqlite') compareConn.db.close()
    } catch {}
    compareConn = null
  }
  try {
    if (config.dbType === 'postgresql') {
      const pool = new PgPool({ host: config.host, port: config.port, database: config.database, user: config.user, password: config.password, connectionTimeoutMillis: 5000 })
      await pool.query('SELECT 1')
      compareConn = { type: 'postgresql', pool }
    } else if (config.dbType === 'mysql') {
      const conn = await mysql.createConnection({ host: config.host, port: config.port, database: config.database, user: config.user, password: config.password, connectTimeout: 5000 })
      await conn.query('SELECT 1')
      compareConn = { type: 'mysql', conn }
    } else if (config.dbType === 'mssql') {
      const pool = await mssql.connect({ server: config.host, port: config.port, database: config.database, user: config.user, password: config.password, options: { trustServerCertificate: true, connectTimeout: 5000 } })
      compareConn = { type: 'mssql', pool }
    } else if (config.dbType === 'sqlite') {
      compareConn = { type: 'sqlite', db: new Database(config.filePath ?? config.database) }
    }
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── db:compareSchemas ─────────────────────────────────────────────────────────
ipcMain.handle('db:compareSchemas', async () => {
  if (!activeConn || !compareConn)
    return { ok: false, error: 'Both connections required' }
  try {
    type SchemaRow = { table_schema: string; table_name: string }
    type ColRow = { table_schema: string; table_name: string; column_name: string; data_type: string }

    async function getSchema(conn: ActiveConnection) {
      if (conn.type !== 'postgresql') return { tables: [] as SchemaRow[], columns: [] as ColRow[] }
      const tables  = await conn.pool.query<SchemaRow>(`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema','pg_catalog') AND table_type='BASE TABLE' ORDER BY table_schema, table_name`)
      const columns = await conn.pool.query<ColRow>(`SELECT table_schema, table_name, column_name, data_type FROM information_schema.columns WHERE table_schema NOT IN ('information_schema','pg_catalog') ORDER BY table_schema, table_name, ordinal_position`)
      return { tables: tables.rows, columns: columns.rows }
    }

    const [schemaA, schemaB] = await Promise.all([getSchema(activeConn), getSchema(compareConn)])
    const tablesA = new Set(schemaA.tables.map(t => `${t.table_schema}.${t.table_name}`))
    const tablesB = new Set(schemaB.tables.map(t => `${t.table_schema}.${t.table_name}`))
    const onlyInA = [...tablesA].filter(t => !tablesB.has(t))
    const onlyInB = [...tablesB].filter(t => !tablesA.has(t))
    const inBoth  = [...tablesA].filter(t => tablesB.has(t))

    const columnDiffs: { table: string; column: string; status: 'added' | 'removed' | 'changed'; detail: string }[] = []
    for (const tbl of inBoth) {
      const [schema, table] = tbl.split('.', 2)
      const colsA = schemaA.columns.filter(c => c.table_schema === schema && c.table_name === table)
      const colsB = schemaB.columns.filter(c => c.table_schema === schema && c.table_name === table)
      const mapA  = new Map(colsA.map(c => [c.column_name, c]))
      const mapB  = new Map(colsB.map(c => [c.column_name, c]))
      for (const [name, colA] of mapA) {
        if (!mapB.has(name)) {
          columnDiffs.push({ table: tbl, column: name, status: 'removed', detail: 'Removed from B' })
        } else {
          const colB = mapB.get(name)!
          if (colA.data_type !== colB.data_type)
            columnDiffs.push({ table: tbl, column: name, status: 'changed', detail: `${colA.data_type} → ${colB.data_type}` })
        }
      }
      for (const [name] of mapB) {
        if (!mapA.has(name)) columnDiffs.push({ table: tbl, column: name, status: 'added', detail: 'Added in B' })
      }
    }
    return { ok: true, onlyInA, onlyInB, inBoth, columnDiffs,
      summary: { tablesOnlyInA: onlyInA.length, tablesOnlyInB: onlyInB.length, tablesInBoth: inBoth.length, columnDiffs: columnDiffs.length } }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── db:disconnectCompare ──────────────────────────────────────────────────────
ipcMain.handle('db:disconnectCompare', async () => {
  if (compareConn) {
    try {
      if (compareConn.type === 'postgresql') await compareConn.pool.end()
      else if (compareConn.type === 'mysql')  await compareConn.conn.end()
      else if (compareConn.type === 'mssql')  await compareConn.pool.close()
      else if (compareConn.type === 'sqlite') compareConn.db.close()
    } catch {}
    compareConn = null
  }
  return { ok: true }
})

// ── log:append ────────────────────────────────────────────────────────────────
ipcMain.handle('log:append', (_, entry: object) => {
  try {
    const logPath = path.join(app.getPath('userData'), 'queryLog.json')
    let log: object[] = []
    try { log = JSON.parse(fs.readFileSync(logPath, 'utf-8')) } catch {}
    log.unshift(entry)
    fs.writeFileSync(logPath, JSON.stringify(log.slice(0, 5000)))
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── log:load ──────────────────────────────────────────────────────────────────
ipcMain.handle('log:load', (_, config: { limit: number; search?: string }) => {
  try {
    const logPath = path.join(app.getPath('userData'), 'queryLog.json')
    let log: Record<string, unknown>[] = []
    try { log = JSON.parse(fs.readFileSync(logPath, 'utf-8')) } catch {}
    let filtered = log
    if (config.search) {
      const q = config.search.toLowerCase()
      filtered = filtered.filter(e =>
        (typeof e.sql === 'string' && e.sql.toLowerCase().includes(q)) ||
        (typeof e.database === 'string' && e.database.toLowerCase().includes(q))
      )
    }
    return { ok: true, entries: filtered.slice(0, config.limit), total: filtered.length }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── log:clear ─────────────────────────────────────────────────────────────────
ipcMain.handle('log:clear', () => {
  try {
    fs.writeFileSync(path.join(app.getPath('userData'), 'queryLog.json'), '[]')
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── ssh:connect ───────────────────────────────────────────────────────────────
ipcMain.handle('ssh:connect', async (_, config: {
  sshHost: string; sshPort: number; sshUser: string
  sshPassword?: string; sshPrivateKey?: string
  remoteHost: string; remotePort: number
}) => {
  if (sshTunnel) { sshTunnel.server.close(); sshTunnel.client.end(); sshTunnel = null }
  try {
    const localPort = await createSshTunnel(config)
    return { ok: true, localPort }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── ssh:disconnect ────────────────────────────────────────────────────────────
ipcMain.handle('ssh:disconnect', async () => {
  if (sshTunnel) { sshTunnel.server.close(); sshTunnel.client.end(); sshTunnel = null }
  return { ok: true }
})

// ── db:updateCell ─────────────────────────────────────────────────────────────
ipcMain.handle('db:updateCell', async (_, config: {
  schema: string; table: string; pkColumn: string
  pkValue: unknown; column: string; newValue: unknown
}) => {
  if (!activeConn) return { ok: false, error: 'Not connected' }
  try {
    let sql = ''
    if (activeConn.type === 'postgresql') {
      sql = `UPDATE "${config.schema}"."${config.table}" SET "${config.column}" = $1 WHERE "${config.pkColumn}" = $2`
      await activeConn.pool.query(sql, [config.newValue, config.pkValue])
    } else if (activeConn.type === 'mysql') {
      sql = `UPDATE \`${config.schema}\`.\`${config.table}\` SET \`${config.column}\` = ? WHERE \`${config.pkColumn}\` = ?`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await activeConn.conn.execute(sql, [config.newValue, config.pkValue] as any)
    } else if (activeConn.type === 'mssql') {
      sql = `UPDATE [${config.schema}].[${config.table}] SET [${config.column}] = @newValue WHERE [${config.pkColumn}] = @pkValue`
      await activeConn.pool.request()
        .input('newValue', config.newValue)
        .input('pkValue', config.pkValue)
        .query(sql)
    } else if (activeConn.type === 'sqlite') {
      sql = `UPDATE "${config.table}" SET "${config.column}" = ? WHERE "${config.pkColumn}" = ?`
      const stmt = activeConn.db.prepare(sql)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stmt.run(...([config.newValue, config.pkValue] as any[]))
    }
    return { ok: true, sql }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── db:deleteRows ─────────────────────────────────────────────────────────────
ipcMain.handle('db:deleteRows', async (_, config: {
  schema: string; table: string; pkColumn: string; pkValues: unknown[]
}) => {
  if (!activeConn) return { ok: false, error: 'Not connected' }
  try {
    if (activeConn.type === 'postgresql') {
      const ph = config.pkValues.map((_, i) => `$${i + 1}`).join(', ')
      await activeConn.pool.query(
        `DELETE FROM "${config.schema}"."${config.table}" WHERE "${config.pkColumn}" IN (${ph})`,
        config.pkValues
      )
    } else if (activeConn.type === 'mysql') {
      const ph = config.pkValues.map(() => '?').join(', ')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await activeConn.conn.execute(
        `DELETE FROM \`${config.schema}\`.\`${config.table}\` WHERE \`${config.pkColumn}\` IN (${ph})`,
        config.pkValues as any
      )
    } else if (activeConn.type === 'mssql') {
      const ph = config.pkValues.map((_, i) => `@pk${i}`).join(', ')
      const req = activeConn.pool.request()
      config.pkValues.forEach((v, i) => req.input(`pk${i}`, v))
      await req.query(`DELETE FROM [${config.schema}].[${config.table}] WHERE [${config.pkColumn}] IN (${ph})`)
    } else if (activeConn.type === 'sqlite') {
      const ph = config.pkValues.map(() => '?').join(', ')
      const stmt = activeConn.db.prepare(
        `DELETE FROM "${config.table}" WHERE "${config.pkColumn}" IN (${ph})`
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stmt.run(...(config.pkValues as any[]))
    }
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── db:insertRows ─────────────────────────────────────────────────────────────
ipcMain.handle('db:insertRows', async (_, config: {
  schema: string; table: string; columns: string[]; rows: unknown[][]
}) => {
  if (!activeConn) return { ok: false, error: 'Not connected' }
  try {
    let inserted = 0
    const batchSize = 100
    for (let i = 0; i < config.rows.length; i += batchSize) {
      const batch = config.rows.slice(i, i + batchSize)
      if (activeConn.type === 'postgresql') {
        const values = batch.map((row, ri) =>
          `(${row.map((_, ci) => `$${ri * config.columns.length + ci + 1}`).join(', ')})`
        ).join(', ')
        const cols = config.columns.map(c => `"${c}"`).join(', ')
        await activeConn.pool.query(
          `INSERT INTO "${config.schema}"."${config.table}" (${cols}) VALUES ${values}`,
          batch.flat()
        )
        inserted += batch.length
      } else if (activeConn.type === 'mysql') {
        const cols = config.columns.map(c => `\`${c}\``).join(', ')
        const rowPh = `(${config.columns.map(() => '?').join(', ')})`
        const values = batch.map(() => rowPh).join(', ')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await activeConn.conn.execute(
          `INSERT INTO \`${config.schema}\`.\`${config.table}\` (${cols}) VALUES ${values}`,
          batch.flat() as any
        )
        inserted += batch.length
      } else if (activeConn.type === 'sqlite') {
        const cols = config.columns.map(c => `"${c}"`).join(', ')
        const ph = `(${config.columns.map(() => '?').join(', ')})`
        const stmt = activeConn.db.prepare(
          `INSERT INTO "${config.table}" (${cols}) VALUES ${ph}`
        )
        for (const row of batch) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          stmt.run(...(row as any[]))
          inserted++
        }
      }
    }
    return { ok: true, inserted }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

// ── db:searchAll ──────────────────────────────────────────────────────────────
ipcMain.handle('db:searchAll', async (_, config: {
  searchText: string; schemas: string[]; maxResults: number
}) => {
  if (!activeConn || activeConn.type !== 'postgresql')
    return { ok: false, error: 'Full-text search requires an active PostgreSQL connection' }
  try {
    const colResult = await activeConn.pool.query(`
      SELECT c.table_schema, c.table_name, c.column_name, c.data_type
      FROM information_schema.columns c
      WHERE c.table_schema = ANY($1)
        AND c.data_type IN ('text','character varying','character','name','uuid','citext')
      ORDER BY c.table_schema, c.table_name, c.ordinal_position
    `, [config.schemas])

    const tableMap = new Map<string, { schema: string; table: string; cols: string[] }>()
    for (const row of colResult.rows) {
      const key = `${row.table_schema}.${row.table_name}`
      if (!tableMap.has(key)) tableMap.set(key, { schema: row.table_schema, table: row.table_name, cols: [] })
      tableMap.get(key)!.cols.push(row.column_name)
    }

    const results: {
      schema: string; table: string; column: string
      value: string; rowData: Record<string, unknown>
    }[] = []

    for (const [, info] of tableMap) {
      if (results.length >= config.maxResults) break
      const conditions = info.cols.map(c => `"${c}"::text ILIKE $1`).join(' OR ')
      if (!conditions) continue
      try {
        const res = await (activeConn as { type: 'postgresql'; pool: InstanceType<typeof PgPool> }).pool.query(
          `SELECT * FROM "${info.schema}"."${info.table}" WHERE ${conditions} LIMIT 10`,
          [`%${config.searchText}%`]
        )
        for (const row of res.rows) {
          for (const col of info.cols) {
            const val = row[col]
            if (val !== null && String(val).toLowerCase().includes(config.searchText.toLowerCase())) {
              results.push({ schema: info.schema, table: info.table, column: col, value: String(val), rowData: row })
              if (results.length >= config.maxResults) break
            }
          }
          if (results.length >= config.maxResults) break
        }
      } catch { continue }
    }
    return { ok: true, results }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
})

} // end registerIpcHandlers

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
