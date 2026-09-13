# Onobase — Gap Analysis & Continuation Build Specification
**Document:** OBNET-ONO-CONT-2026-001  
**Version:** 1.0  
**Date:** March 2026  
**Author:** Rehan — Obnet Pty Ltd  
**For:** Claude Code — Phase 1 Completion + Phase 2 Build

---

## PASTE THIS FIRST — Claude Code Briefing

```
I am continuing development of Onobase — a universal desktop database IDE.
A Phase 1 scaffold has been built. This document tells you exactly what
was completed, what is broken or missing, and what to build next.

PRODUCT: Electron + React 18 + TypeScript + Vite 5 + Tailwind CSS v3
PROJECT PATH: D:\Data\Folders\My_AI_Projects\DevOps_Projects\onobase_App

DESIGN SYSTEM: Dark glassmorphism.
  --bg-primary: #080C12
  --bg-glass: rgba(13,17,23,0.75) + backdrop-filter: blur(20px)
  --accent: #00E5B0 (teal)
  --border: rgba(255,255,255,0.08)
  Fonts: Syne (headings), Inter (body), JetBrains Mono (code/data)

READ THIS ENTIRE DOCUMENT BEFORE TOUCHING ANY CODE.
```

---

## 1. What Was Built — Confirmed Working

The previous Claude Code session built a solid Phase 1 foundation.
The following files exist and are functionally correct:

### Infrastructure (Root)
| File | Status |
|------|--------|
| `package.json` | ✅ All deps present — pg, zustand, @xyflow/react, framer-motion, monaco |
| `vite.config.ts` | ✅ Correct |
| `tailwind.config.js` | ✅ Correct |
| `tsconfig.*.json` | ✅ All 4 configs correct |
| `index.html` | ✅ Fonts loaded correctly |
| `electron/main.ts` | ✅ IPC handlers for connect, disconnect, listDatabases, query, schema |
| `electron/preload.ts` | ✅ All 5 APIs exposed correctly |

### Source Files
| File | Status |
|------|--------|
| `src/main.tsx` | ✅ Standard React entry |
| `src/index.css` | ✅ CSS variables, glassmorphism utilities, animations |
| `src/types/index.ts` | ✅ All types defined correctly |
| `src/types.ts` | ⚠️ DUPLICATE legacy types file — conflicts with types/index.ts |
| `src/data.ts` | ⚠️ Legacy file with old OnoModule format — superseded |
| `src/utils/colors.ts` | ✅ MODULE_COLORS (10 colours), getModuleColor(), nextColor() |
| `src/utils/schemaToModules.ts` | ⚠️ Uses OLD OnoModule format (.tables[] not .tableIds[]) — NOT used |
| `src/store/useAppStore.ts` | ✅ activeView, toasts, zoom, lastQueryDuration |
| `src/store/useConnectionStore.ts` | ✅ Connection CRUD, dbTypeLabel/Badge helpers |
| `src/store/useModuleStore.ts` | ✅ Full module CRUD, table membership rules enforced |

### Components
| File | Status | Notes |
|------|--------|-------|
| `src/App.tsx` | ✅ Full layout — Toolbar, Canvas, PropsPanel, StatusBar |  |
| `src/components/Canvas.tsx` | ✅ ReactFlow canvas with FK edges, drag/drop, context menu |  |
| `src/components/ModuleGroupNode.tsx` | ✅ Resizable module container with coloured header |  |
| `src/components/TableCardNode.tsx` | ✅ Draggable table card, colour inheritance from module |  |
| `src/components/ModuleNode.tsx` | ⚠️ ORPHAN — not used anywhere in current app |  |
| `src/components/ObjectExplorer.tsx` | ✅ Tree sidebar with schema, drag-to-canvas, search |  |
| `src/components/PropsPanel.tsx` | ✅ Module name editing, colour picker, table list |  |
| `src/components/ConnectDialog.tsx` | ✅ PostgreSQL connect modal with history, database picker |  |
| `src/components/QueryEditor.tsx` | ✅ Monaco editor, custom theme, schema autocomplete, history |  |
| `src/components/Toast.tsx` | ✅ Warning/info/error toasts with auto-dismiss |  |
| `src/components/StatusBar/StatusBar.tsx` | ✅ Connection, modules, tables, zoom |  |
| `src/components/Sidebar.tsx` | ⚠️ ORPHAN — old legacy sidebar, not used in current app |  |

---

## 2. What Is Missing or Incomplete

### 2A. Missing from Spec — Not Built at All

These items from the original spec (OBNET-ONO-SPEC-2026-001) do not exist:

#### Missing Component Files
| Spec Requirement | Status |
|-----------------|--------|
| `src/components/Toolbar/Toolbar.tsx` | ❌ Toolbar is inline in App.tsx — not extracted |
| `src/components/Toolbar/ConnectionPill.tsx` | ❌ Not extracted |
| `src/components/Canvas/RelationshipEdge.tsx` | ❌ Using default smoothstep edges instead of custom |
| `src/components/Canvas/ColumnRow.tsx` | ❌ Column rendering is inline in TableCardNode |
| `src/components/Editor/ResultsGrid.tsx` | ❌ Results grid inlined in QueryEditor |
| `src/components/Editor/QueryHistory.tsx` | ❌ History panel inlined in QueryEditor |
| `src/components/PropsPanel/ModuleProps.tsx` | ❌ Not extracted |
| `src/components/PropsPanel/TableProps.tsx` | ❌ Not built |
| `src/components/PropsPanel/ColumnProps.tsx` | ❌ Not built |
| `src/components/Modals/NewModuleModal.tsx` | ❌ Modules added via button directly — no modal |
| `src/components/Modals/AddTableModal.tsx` | ❌ Uses inline picker in Canvas instead |
| `src/components/shared/ColorPicker.tsx` | ❌ Colour picker is inline in PropsPanel |
| `src/components/shared/ContextMenu.tsx` | ❌ Context menu is inline in Canvas |
| `src/hooks/useDatabase.ts` | ❌ Not created |
| `src/hooks/useSchema.ts` | ❌ Not created |

#### Missing Features
| Feature | Spec Section | Status |
|---------|-------------|--------|
| Multi-DB support (MySQL, SQL Server, SQLite) | §2, §12 | ❌ PostgreSQL only |
| ConnectModal for non-PostgreSQL databases | §9 | ❌ Dialog hardcoded to PG |
| Module collapse/expand toggle | §7, §9 | ❌ Store has `collapsed` field but UI ignores it |
| MiniMap on canvas | §9 | ❌ Not rendered |
| Framer Motion animations (all 10 listed) | §11 | ❌ framer-motion installed but never used |
| App launch fade-in animation | §11 | ❌ |
| Connection success pulse animation | §11 | ❌ |
| Results row stagger-in animation | §11 | ❌ |
| Query results export (CSV / JSON / Excel) | §9, §12 | ❌ |
| PropsPanel — Table selected view | §9 | ❌ Only module selection implemented |
| PropsPanel — Column selected view | §9 | ❌ Not implemented |
| PropsPanel — Nothing selected: stats view | §9 | ❌ Shows "select a module" text only |
| StatusBar canvas position (x, y) display | §9 | ❌ Only zoom shown |
| Row count (live) on selected table | §9 | ❌ |
| View Data button on table | §9 | ❌ |
| Copy DDL button on table | §9 | ❌ |
| Right-click sidebar connection: Disconnect, Edit, Delete | §9 | ❌ |
| Diagram view (3rd tab) | §9 | ❌ Tab exists but renders same as canvas |

### 2B. Technical Issues to Fix

| Issue | Priority |
|-------|----------|
| **Duplicate type system** — `src/types.ts` and `src/types/index.ts` both exist. `App.tsx` imports from both. `schemaToModules.ts` uses the old `OnoModule` type with `.tables[]` array instead of `.tableIds[]`. | HIGH |
| **Orphan files** — `Sidebar.tsx` and `ModuleNode.tsx` are dead code, not imported anywhere | MEDIUM |
| **Zoom sync broken** — `useAppStore.zoom` is stored but Canvas never calls `setZoom` on viewport change — StatusBar always shows 100% | HIGH |
| **Module collapse ignored** — `Module` type has `collapsed: boolean` in store but nothing in the UI reads or toggles it | MEDIUM |
| **useConnectionStore unused** — fully built but App.tsx uses local `useState` for connection instead of the store | MEDIUM |
| **schemaToModules.ts unused** — never called; schema loads into ObjectExplorer only, no auto-module creation | LOW |
| **MiniMap missing** — `<MiniMap>` not rendered in Canvas.tsx | LOW |
| **Diagram tab** — clicking "Diagram" tab changes `activeView` to 'diagram' but Canvas renders for both 'canvas' and 'diagram' — no distinction | LOW |

---

## 3. Build Instructions — Phase 1 Completion

Complete these tasks before moving to Phase 2. Fix HIGH priority issues first.

### Task 1 — Fix Duplicate Type System

Delete `src/types.ts`. Update all files that import from it:

- `src/data.ts` — imports `OnoColor`, `OnoModule` → update to `src/types/index.ts`
- `src/utils/schemaToModules.ts` — uses old `OnoModule` format → delete this file (it's unused)

After deletion, also delete `src/data.ts` (superseded by `utils/colors.ts` and `types/index.ts`).
Delete `src/components/Sidebar.tsx` (replaced by ObjectExplorer).
Delete `src/components/ModuleNode.tsx` (replaced by ModuleGroupNode + TableCardNode).

### Task 2 — Fix Zoom Sync

In `src/components/Canvas.tsx`, import `setZoom` from `useAppStore` and wire it to ReactFlow's viewport change:

```typescript
import { useAppStore } from '../store/useAppStore'

// Inside CanvasInner component:
const setZoom = useAppStore(s => s.setZoom)

// Add to <ReactFlow> component:
onMoveEnd={(_, viewport) => setZoom(viewport.zoom)}
```

### Task 3 — Add MiniMap to Canvas

In `Canvas.tsx`, import and render `<MiniMap>` inside `<ReactFlow>`:

```typescript
import { ..., MiniMap } from '@xyflow/react'

// Inside <ReactFlow>, after <Controls />:
<MiniMap
  style={{
    background: 'var(--bg-glass)',
    border: '1px solid var(--border)',
    borderRadius: 8,
  }}
  maskColor="rgba(8,12,18,0.7)"
  nodeColor={(node) => {
    if (node.type === 'moduleGroup') return 'rgba(0,229,176,0.3)'
    return 'rgba(255,255,255,0.1)'
  }}
/>
```

### Task 4 — Module Collapse Toggle

In `ModuleGroupNodeData` interface, add `onToggle: (id: string) => void`.

In `ModuleGroupNode.tsx` header, add a collapse button:

```typescript
<div
  onClick={e => { e.stopPropagation(); onToggle(mod.id) }}
  style={{ color: `${c.hex}66`, cursor: 'pointer', padding: '2px 3px', borderRadius: 3, fontSize: 11 }}
  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.color = c.hex }}
  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.color = `${c.hex}66` }}
>
  {mod.collapsed ? '▶' : '▼'}
</div>
```

In `Canvas.tsx`, pass the toggle callback and set collapsed module height to 32px:

```typescript
// In node building loop for moduleGroup:
style: { width: mod.width, height: mod.collapsed ? 32 : mod.height },

// In data:
onToggle: (id: string) => useModuleStore.getState().updateModule(id, { collapsed: !mod.collapsed })
```

### Task 5 — PropsPanel Table & Column Selection

Extend `PropsPanel.tsx` to handle three selection states.

**Add to App.tsx state:**
```typescript
const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
const [selectedColumnName, setSelectedColumnName] = useState<string | null>(null)
```

Pass `selectedTableId` and `selectedColumnName` to PropsPanel.

**TableProps section** (show when table is selected):
- Table name in JetBrains Mono
- Schema and database name
- Live row count: call `window.electronAPI.queryDB('SELECT COUNT(*) FROM "schema"."table"', [])` on mount
- Column list with type badges and PK/FK indicators
- Button: "Query Table" → switch to Query view with `SELECT * FROM "schema"."table" LIMIT 500` pre-filled
- Button: "Copy DDL" → generate and copy a CREATE TABLE statement to clipboard

**ColumnProps section** (show when column is selected):
- Column name, data type
- Nullable badge (YES/NO)
- PK badge if primary key
- FK badge + referenced table.column if foreign key
- Default value (if any)

### Task 6 — Add Framer Motion Animations

`framer-motion` is already installed. Add the animations specified in §11:

```typescript
import { motion } from 'framer-motion'

// App.tsx root div — launch fade-in:
<motion.div
  initial={{ opacity: 0, scale: 0.98 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
  style={{ display:'flex', flexDirection:'column', height:'100vh', ... }}
>

// ConnectDialog inner panel — modal open:
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.22, ease: 'easeOut' }}
>

// Toast — fade up:
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 8 }}
  transition={{ duration: 0.18 }}
>

// Connection success — pulse the status dot in Toolbar (2 pulses):
<motion.div
  animate={{ boxShadow: ['0 0 6px rgba(0,229,176,0.7)', '0 0 18px rgba(0,229,176,0.5)', '0 0 6px rgba(0,229,176,0.7)'] }}
  transition={{ duration: 0.4, repeat: 2 }}
/>
```

### Task 7 — Export Results CSV / JSON

In `QueryEditor.tsx`, add export functions and buttons:

```typescript
const exportCSV = () => {
  if (!result || result.rows.length === 0) return
  const cols = result.fields.map(f => f.name)
  const header = cols.join(',')
  const rows = result.rows.map(r =>
    cols.map(c => {
      const v = r[c]
      if (v === null || v === undefined) return ''
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  )
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `query-result-${Date.now()}.csv`
  a.click()
}

const exportJSON = () => {
  if (!result || result.rows.length === 0) return
  const blob = new Blob([JSON.stringify(result.rows, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `query-result-${Date.now()}.json`
  a.click()
}
```

Add buttons next to the History button in the results toolbar:
```typescript
{result && !result.error && result.rows.length > 0 && (
  <>
    <button onClick={exportCSV} style={exportBtnStyle}>↓ CSV</button>
    <button onClick={exportJSON} style={exportBtnStyle}>↓ JSON</button>
  </>
)}
```

### Task 8 — Wire useConnectionStore to App.tsx

Currently App.tsx uses local `useState` for connection. Wire it to the store so connection
state is accessible globally (needed for StatusBar, PropsPanel, multi-connection support later).

In `App.tsx`, replace:
```typescript
const [connection, setConnection] = useState<AppConnection | null>(null)
```

With:
```typescript
const { addConnection, setActive, updateConnection, getActive } = useConnectionStore()
```

Update `handleConnected` to call `addConnection(...)` and `setActive(id)`.
Update `handleDisconnect` to call `updateConnection(id, { status: 'disconnected' })`.

---

## 4. Build Instructions — Phase 2

After all Phase 1 completion tasks are done, build Phase 2.

### Phase 2A — Multi-Database Support

**Install:**
```bash
npm install mysql2 mssql better-sqlite3
npm install --save-dev @types/better-sqlite3
```

**In `electron/main.ts`**, extend IPC handlers to accept `dbType`:

```typescript
ipcMain.handle('db:connect', async (_, config: {
  host: string; port: number; database: string
  user: string; password: string; ssl?: boolean
  dbType: 'postgresql' | 'mysql' | 'mssql' | 'sqlite'
  filePath?: string  // sqlite only
}) => { ... })
```

Create separate driver handlers:
- `connectPostgres(config)` — existing pg Pool
- `connectMySQL(config)` — mysql2 createPool
- `connectMSSQL(config)` — mssql ConnectionPool with `sql.connect()`
- `connectSQLite(filePath)` — better-sqlite3 `new Database(filePath)`

Normalise all query results to the same shape:
```typescript
{ ok: true, rows: Record<string,unknown>[], fields: {name:string}[], rowCount: number|null }
```

**In `ConnectDialog.tsx`**, update to support all 4 database types:
- Add DB type selector buttons at top (PG / MySQL / MSSQL / SQLite)
- Auto-change default port on type switch (PG:5432, MySQL:3306, MSSQL:1433)
- For SQLite: replace host/port/user/password with a file path input + Browse button (via Electron dialog)

### Phase 2B — Schema Introspection Per DB Type

Create `src/utils/schemaQueries.ts` with introspection SQL per database type:

```typescript
export const SCHEMA_QUERIES = {
  postgresql: {
    tables:     `SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema','pg_catalog') AND table_type='BASE TABLE' ORDER BY table_schema, table_name`,
    columns:    `SELECT c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable, EXISTS(SELECT 1 FROM information_schema.key_column_usage k JOIN information_schema.table_constraints tc ON k.constraint_name=tc.constraint_name WHERE tc.constraint_type='PRIMARY KEY' AND k.table_name=c.table_name AND k.column_name=c.column_name) as is_pk FROM information_schema.columns c WHERE c.table_schema NOT IN ('information_schema','pg_catalog') ORDER BY c.table_schema, c.table_name, c.ordinal_position`,
    fkRelations: `SELECT kcu.table_schema as source_schema, kcu.table_name as source_table, kcu.column_name as source_column, ccu.table_schema as target_schema, ccu.table_name as target_table, ccu.column_name as target_column FROM information_schema.key_column_usage kcu JOIN information_schema.referential_constraints rc ON kcu.constraint_name=rc.constraint_name JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name=ccu.constraint_name WHERE kcu.table_schema NOT IN ('information_schema','pg_catalog')`,
  },
  mysql: {
    tables:     `SELECT table_schema, table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema NOT IN ('information_schema','mysql','performance_schema','sys') ORDER BY table_schema, table_name`,
    columns:    `SELECT table_schema, table_name, column_name, data_type, is_nullable, IF(column_key='PRI',1,0) as is_pk FROM information_schema.columns WHERE table_schema NOT IN ('information_schema','mysql','performance_schema','sys') ORDER BY table_schema, table_name, ordinal_position`,
    fkRelations: `SELECT table_schema as source_schema, table_name as source_table, column_name as source_column, referenced_table_schema as target_schema, referenced_table_name as target_table, referenced_column_name as target_column FROM information_schema.key_column_usage WHERE referenced_table_name IS NOT NULL`,
  },
  mssql: {
    tables:     `SELECT TABLE_SCHEMA as table_schema, TABLE_NAME as table_name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_SCHEMA, TABLE_NAME`,
    columns:    `SELECT c.TABLE_SCHEMA as table_schema, c.TABLE_NAME as table_name, c.COLUMN_NAME as column_name, c.DATA_TYPE as data_type, c.IS_NULLABLE as is_nullable, CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as is_pk FROM INFORMATION_SCHEMA.COLUMNS c LEFT JOIN (SELECT ku.TABLE_NAME, ku.COLUMN_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ON tc.CONSTRAINT_NAME=ku.CONSTRAINT_NAME WHERE tc.CONSTRAINT_TYPE='PRIMARY KEY') pk ON c.TABLE_NAME=pk.TABLE_NAME AND c.COLUMN_NAME=pk.COLUMN_NAME ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION`,
    fkRelations: `SELECT fk.TABLE_SCHEMA as source_schema, fk.TABLE_NAME as source_table, cu.COLUMN_NAME as source_column, pk.TABLE_SCHEMA as target_schema, pk.TABLE_NAME as target_table, pt.COLUMN_NAME as target_column FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS fk ON rc.CONSTRAINT_NAME=fk.CONSTRAINT_NAME JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk ON rc.UNIQUE_CONSTRAINT_NAME=pk.CONSTRAINT_NAME JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE cu ON fk.CONSTRAINT_NAME=cu.CONSTRAINT_NAME JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pt ON pk.CONSTRAINT_NAME=pt.CONSTRAINT_NAME`,
  },
  // SQLite: must use PRAGMA per table — handled in IPC handler by looping tables
  sqlite: {
    tables:     `SELECT 'main' as table_schema, name as table_name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  },
}
```

For SQLite, the IPC handler must loop through each table and call:
- `PRAGMA table_info(tableName)` → columns
- `PRAGMA foreign_key_list(tableName)` → FK relations

### Phase 2C — Persistent Query History

Move query history from `localStorage` to Electron's `userData` folder:

**In `electron/main.ts`:**
```typescript
import fs from 'fs'
const historyPath = path.join(app.getPath('userData'), 'queryHistory.json')

ipcMain.handle('history:load', () => {
  try { return JSON.parse(fs.readFileSync(historyPath, 'utf-8')) }
  catch { return [] }
})
ipcMain.handle('history:save', (_, entries: object[]) => {
  fs.writeFileSync(historyPath, JSON.stringify(entries.slice(0, 100)))
  return { ok: true }
})
```

**In `electron/preload.ts`**, add:
```typescript
loadHistory:  ()                 => ipcRenderer.invoke('history:load'),
saveHistory:  (e: object[])      => ipcRenderer.invoke('history:save', e),
```

**In `QueryEditor.tsx`**, replace `localStorage` calls with `window.electronAPI.loadHistory()` and `window.electronAPI.saveHistory(entries)`.

### Phase 2D — Persistent Module Layouts

Save module positions and table assignments so they survive app restarts.

**In `electron/main.ts`:**
```typescript
const layoutsPath = path.join(app.getPath('userData'), 'layouts.json')

ipcMain.handle('layout:load', (_, connectionKey: string) => {
  try {
    const all = JSON.parse(fs.readFileSync(layoutsPath, 'utf-8'))
    return { ok: true, layout: all[connectionKey] ?? null }
  } catch { return { ok: true, layout: null } }
})
ipcMain.handle('layout:save', (_, connectionKey: string, layout: object) => {
  try {
    let all: Record<string,object> = {}
    try { all = JSON.parse(fs.readFileSync(layoutsPath, 'utf-8')) } catch {}
    all[connectionKey] = layout
    fs.writeFileSync(layoutsPath, JSON.stringify(all))
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: String(err) }
  }
})
```

**In `electron/preload.ts`**, add:
```typescript
loadLayout: (connectionKey: string)          => ipcRenderer.invoke('layout:load', connectionKey),
saveLayout: (connectionKey: string, layout: object) => ipcRenderer.invoke('layout:save', connectionKey, layout),
```

**In `useModuleStore.ts`**, add `saveLayout` action that debounces 1000ms and calls the IPC.
Call `loadLayout` in `App.tsx` after a successful connection. The layout key should be `"host:port/database"` (e.g. `"localhost:5432/mydb"`).

---

## 5. Target File Structure After Completion

```
src/
  components/
    Canvas/
      Canvas.tsx           ← existing (clean up inline sub-components)
      ModuleGroupNode.tsx  ← existing (add collapse toggle)
      TableCardNode.tsx    ← existing
      ColumnRow.tsx        ← EXTRACT from TableCardNode
      RelationshipEdge.tsx ← BUILD custom styled edge
    Editor/
      QueryEditor.tsx      ← existing (add export buttons)
      ResultsGrid.tsx      ← EXTRACT from QueryEditor
      QueryHistory.tsx     ← EXTRACT from QueryEditor
    PropsPanel/
      PropsPanel.tsx       ← existing (add table/column selection)
      ModuleProps.tsx      ← EXTRACT from PropsPanel
      TableProps.tsx       ← BUILD
      ColumnProps.tsx      ← BUILD
    Modals/
      ConnectModal.tsx     ← RENAME ConnectDialog + multi-DB support
    ObjectExplorer/
      ObjectExplorer.tsx   ← existing
    StatusBar/
      StatusBar.tsx        ← existing (add canvas x,y position)
    Toolbar/
      Toolbar.tsx          ← EXTRACT from App.tsx
      ConnectionPill.tsx   ← EXTRACT from App.tsx
    shared/
      Toast.tsx            ← existing
      ColorPicker.tsx      ← EXTRACT from PropsPanel
      ContextMenu.tsx      ← EXTRACT from Canvas
  hooks/
    useDatabase.ts         ← BUILD (wrap electronAPI calls)
    useSchema.ts           ← BUILD (schema loading + caching)
  store/
    useAppStore.ts         ← existing
    useConnectionStore.ts  ← existing (wire up to App.tsx)
    useModuleStore.ts      ← existing (add layout persistence)
  types/
    index.ts               ← existing — ONLY type file (delete src/types.ts)
  utils/
    colors.ts              ← existing
    schemaQueries.ts       ← BUILD (per-DB introspection SQL)
  App.tsx                  ← existing (simplify after extractions)
  main.tsx                 ← existing
  index.css                ← existing
electron/
  main.ts                  ← existing (extend for multi-DB, history, layout)
  preload.ts               ← existing (extend for new IPC channels)
```

---

## 6. Phase Completion Checklist

### Phase 1 Completion — Fix First
- [ ] Delete orphan/legacy files: `src/types.ts`, `src/data.ts`, `src/utils/schemaToModules.ts`, `src/components/Sidebar.tsx`, `src/components/ModuleNode.tsx`
- [ ] Fix zoom sync — Canvas viewport onMoveEnd → `useAppStore.setZoom`
- [ ] Add MiniMap to Canvas
- [ ] Wire module collapse toggle (store + ModuleGroupNode + Canvas height)
- [ ] Build TableProps view in PropsPanel (live row count, column list, Query/DDL buttons)
- [ ] Build ColumnProps view in PropsPanel (type, nullable, PK/FK badges)
- [ ] Add export CSV/JSON buttons to QueryEditor results toolbar
- [ ] Add framer-motion animations (app launch, modal open, connection success, toast)
- [ ] Wire `useConnectionStore` to App.tsx (replace local state)
- [ ] Test: `npm run dev` — full PostgreSQL connection, schema display, module canvas, query editor

### Phase 2 Completion
- [ ] Install mysql2, mssql, better-sqlite3
- [ ] Multi-DB IPC handlers in `electron/main.ts`
- [ ] Update ConnectModal for all 4 DB types
- [ ] Build `src/utils/schemaQueries.ts`
- [ ] Persistent query history via Electron `userData`
- [ ] Persistent module layouts (load on connect, save on change, debounced)
- [ ] Test: MySQL connection and schema display
- [ ] Test: SQLite file open and schema display
- [ ] Test: SQL Server connection and schema display

### Phase 3 (Future)
- [ ] Universal Query Language (UQL) translation layer
- [ ] Visual query builder
- [ ] Oracle plugin
- [ ] Data viewer (browse table rows without writing SQL)

### Phase 4 (Packaging)
- [ ] App settings panel
- [ ] electron-builder — Windows NSIS installer
- [ ] electron-builder — Mac DMG
- [ ] electron-builder — Linux AppImage

---

## 7. Design Continuity Rules

All new code MUST follow these conventions:

- **All panels:** glassmorphism — `rgba(13,17,23,0.75)` bg + `blur(20px)` + `rgba(255,255,255,0.08)` border
- **Module colour inheritance:** header bg = `hex + '20'`, header text = `hex` at 100%, table header bg = `hex + '15'`
- **Fonts:** `var(--font-heading)` (Syne) for labels/titles, `var(--font-body)` (Inter) for text, `var(--font-mono)` (JetBrains Mono) for code/data/values
- **Accent colour:** `#00E5B0` teal — active states, selected borders, CTA buttons, glow effects
- **Canvas background:** `#080C12`
- **Toolbar background:** `rgba(8,12,18,0.90)`
- **Do NOT** introduce Bootstrap, MUI, Chakra, Ant Design, or any other component library

---

*Onobase — One Base for Every Database*  
*Obnet Pty Ltd © 2026 — onobase.com*  
*Continuation document: OBNET-ONO-CONT-2026-001*
