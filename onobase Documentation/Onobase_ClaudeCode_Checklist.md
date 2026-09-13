# Onobase — Claude Code Master Checklist
**Obnet Pty Ltd © 2026**
Run this checklist top to bottom. Fix each item before moving to the next.
Paste each numbered prompt block directly into Claude Code.

---

## ── PRIORITY 0: FIX BLANK BLACK PAGE ──────────────────────────────────────

> **This must be done FIRST before any tier work.**

### PROMPT TO PASTE INTO CLAUDE CODE:

```
The Onobase app is rendering as a completely blank black page.
Diagnose and fix the root cause now.

Read this entire prompt before touching any file.

STEP 1 — Run the app and capture the error:
  npm run dev
  Open DevTools (F12) → Console tab
  Copy ALL red errors and paste them back to me.

STEP 2 — Check these common causes in order:

  A. Check src/main.tsx or src/index.tsx exists and has:
       import React from 'react'
       import ReactDOM from 'react-dom/client'
       import App from './App'
       ReactDOM.createRoot(
         document.getElementById('root')!
       ).render(<React.StrictMode><App /></React.StrictMode>)

  B. Check index.html has:
       <div id="root"></div>
       <script type="module" src="/src/main.tsx"></script>

  C. Check App.tsx returns visible JSX — not null, not empty fragment.
     If it conditionally renders based on state, add a fallback:
       if (loading) return <div style={{color:'white'}}>Loading...</div>

  D. Check CSS — if body or #root has:
       visibility: hidden
       opacity: 0
       display: none
     Remove or fix those rules.

  E. Check for a crash in useAppStore.ts or any Zustand store
     that runs on import. Wrap initialisation in try/catch.

  F. Check electron/main.ts — if using Electron, verify:
       mainWindow.loadURL('http://localhost:5173')
     OR for production:
       mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
     is correct and the dev server is actually running first.

  G. Check vite.config.ts — ensure base is '/' not './':
       export default defineConfig({ base: '/' })

STEP 3 — Run TypeScript check:
  npx tsc --noEmit
  Fix ALL errors before proceeding.

STEP 4 — Verify fix:
  npm run dev
  App must show the Onobase UI — not a blank page.
  Report: "Blank page fixed — root cause was: [X]"

DO NOT change Canvas.tsx, ModuleWindow.tsx, ModuleLayer.tsx.
```

**Checklist item:** ☐ App renders correctly (not blank)

---

## ── TIER 0: QUERY SAFETY ANALYSER ────────────────────────────────────────

### PROMPT TO PASTE INTO CLAUDE CODE:

```
Implement the Query Safety Analyser for Onobase.
Use the full instructions in: Complete_Remaining_Features___Tier0.txt

Read the entire file before touching any file.
Run npx tsc --noEmit after EVERY step.
Fix all errors before proceeding to next step.
Report each step as: "Step X complete — 0 errors"
```

Checklist items to verify after completion:

- ☐ `src/utils/queryAnalyzer.ts` exists with all exports
- ☐ `src/components/QueryWarningDialog.tsx` exists
- ☐ `QueryEditor.tsx` calls `analyseQuery()` before executing
- ☐ `pendingAnalysis` state gates execution when warnings exist
- ☐ Monaco inline squiggles show for danger/warning patterns
- ☐ Warning summary bar appears below editor (live, before Run)
- ☐ Default row limit changed to 5000 in `useAppStore.ts`
- ☐ Settings row limit is now a dropdown (500/1k/5k/10k/50k/100k/No Limit)
- ☐ No Limit shows red warning text in Settings
- ☐ `npx tsc --noEmit` = 0 errors

**Test scenarios to run manually:**

| Test | Query | Expected |
|------|-------|----------|
| A | `DELETE FROM users` | 🛑 dialog, cannot proceed without checkbox |
| B | `UPDATE users SET active = false` | 🛑 dialog, checkbox required |
| C | `DROP TABLE users` | 🛑 catastrophic dialog |
| D | `SELECT * FROM vendor_work_permits` | ⚠ dialog, auto-fix adds LIMIT 5000 |
| E | `SELECT * FROM users WHERE name LIKE '%john%'` | ⚠ full table scan warning |
| F | `SELECT id, name FROM users LIMIT 10` | ✅ runs immediately, no dialog |
| G | Any dangerous query | Warning bar visible below editor before Run |

---

## ── TIER 1: MUST-HAVE FEATURES ────────────────────────────────────────────

### PROMPT TO PASTE INTO CLAUDE CODE:

```
Implement Tier 1 features for Onobase.
Use the full instructions in: Complete_Remaining_Features___Tier1.txt

Read the entire file before touching any file.
Run npx tsc --noEmit after EVERY step.
Fix all errors before proceeding to next step.
Recompile electron after every IPC change:
  npx tsc -p tsconfig.electron.json
  npx tsc -p tsconfig.preload.json
Report each phase as: "Tier 1 Phase X complete — 0 errors"
```

### Phase 1 — Inline Data Editor

- ☐ `electron/main.ts` — `db:updateCell` IPC handler added
- ☐ `electron/main.ts` — `db:deleteRows` IPC handler added
- ☐ `electron/preload.ts` — `updateCell` and `deleteRows` exposed
- ☐ `src/components/DataViewer.tsx` created with AG Grid
- ☐ PK column detected via `information_schema`
- ☐ Cells editable (non-PK columns)
- ☐ PK column pinned left, teal background, not editable
- ☐ Edited rows highlighted yellow with left border
- ☐ Save Changes button shows pending count
- ☐ Delete rows shows confirmation dialog
- ☐ Pagination working (100/500/1000/5000 page sizes)
- ☐ Client-side filter input works
- ☐ `App.tsx` renders `<DataViewer>` for `tab.type === 'dataview'`
- ☐ ObjectExplorer right-click → "View Data" opens DataViewer tab
- ☐ `npx tsc --noEmit` = 0 errors

### Phase 2 — CSV Import Wizard

- ☐ `electron/main.ts` — `db:importCsv` IPC handler added
- ☐ `electron/preload.ts` — `importCsv` exposed
- ☐ `src/components/CsvImport.tsx` created (glass modal)
- ☐ File drop zone works (drag and drop CSV)
- ☐ PapaParse preview shows first 5 rows
- ☐ Column mapping UI (CSV column → DB column dropdowns)
- ☐ Import button runs with progress indicator
- ☐ Success toast: "X rows imported into tableName"
- ☐ ObjectExplorer right-click → "Import CSV" opens wizard
- ☐ `npx tsc --noEmit` = 0 errors

### Phase 3 — Global Full-Text Search

- ☐ `electron/main.ts` — `db:globalSearch` IPC handler added
- ☐ `electron/preload.ts` — `globalSearch` exposed
- ☐ `src/components/GlobalSearch.tsx` created (overlay modal)
- ☐ `Ctrl+Shift+F` opens search overlay
- ☐ `Escape` closes it
- ☐ Results show: table name, column, matching value snippet
- ☐ "Open Table" button opens DataViewer tab
- ☐ Empty state: "No results for 'X' across Y tables searched"
- ☐ Loading state: spinner + "Searching X tables..."
- ☐ Search icon added to main toolbar
- ☐ `npx tsc --noEmit` = 0 errors

### Phase 4 — Fake Data Generator

- ☐ `npm install @faker-js/faker` completed
- ☐ `src/utils/dataGenerator.ts` created
- ☐ `generateFakeValue()` maps column names to faker methods
- ☐ `generateFakeRows()` generates N rows
- ☐ `src/components/FakeDataGenerator.tsx` created (glass modal)
- ☐ Table selector dropdown works
- ☐ Row count input + presets [10] [100] [1000] [5000]
- ☐ Column preview table shows sample values live
- ☐ Preview section shows first 3 rows
- ☐ Generate button inserts rows and shows success toast
- ☐ ObjectExplorer right-click → "Generate Test Data" opens modal
- ☐ `npx tsc --noEmit` = 0 errors

**Tier 1 final test:**

- ☐ Right-click table → View Data → AG Grid opens with data
- ☐ Click cell → edit → Save → row updates in DB
- ☐ Select rows → Delete → confirmation → rows removed
- ☐ Import CSV → map columns → rows appear in table
- ☐ Ctrl+Shift+F → search → type value → results shown
- ☐ Generate Test Data → 100 rows → realistic data in table

---

## ── TIER 2: DIFFERENTIATOR FEATURES ───────────────────────────────────────

### PROMPT TO PASTE INTO CLAUDE CODE:

```
Implement Tier 2 features for Onobase.
Use the full instructions in: Complete_Remaining_Features___Tier2.txt

Read the entire file before touching any file.
Run npx tsc --noEmit after EVERY step.
Recompile electron after every IPC change.
Report each phase as: "Tier 2 Phase X complete — 0 errors"
```

### Phase 1 — Schema Comparison Tool

- ☐ `compareConn` variable added to `electron/main.ts`
- ☐ `db:connectCompare` IPC handler added
- ☐ `db:compareSchemas` IPC handler added (diffs tables + columns)
- ☐ `db:disconnectCompare` IPC handler added
- ☐ `electron/preload.ts` — all three exposed
- ☐ `src/components/SchemaComparison.tsx` created
- ☐ Two-panel layout (Connection A | Controls | Connection B)
- ☐ Summary cards: only-in-A, only-in-B, in-both, column-diffs
- ☐ Three result tabs: "Only in A" / "Only in B" / "Column Differences"
- ☐ AG Grid for column diffs with colour coding
- ☐ "Generate Migration Script" button opens SQL in new query tab
- ☐ GitCompare toolbar button added
- ☐ `npx tsc --noEmit` = 0 errors

### Phase 2 — Query Execution Log

- ☐ `queryLog.json` persisted to `app.getPath('userData')`
- ☐ `log:append` IPC handler added
- ☐ `log:load` IPC handler added (with search + date filter)
- ☐ `log:clear` IPC handler added
- ☐ `electron/preload.ts` — all three exposed
- ☐ `QueryEditor.tsx` calls `log:append` after every execution
- ☐ `src/components/QueryLog.tsx` created (full tab)
- ☐ AG Grid shows: status icon, time, duration, DB, rows, SQL preview
- ☐ Search input filters log
- ☐ Date range filter works
- ☐ Row click → side panel shows full SQL
- ☐ Double-click → opens SQL in new query tab
- ☐ History toolbar button added
- ☐ `npx tsc --noEmit` = 0 errors

### Phase 3 — SSH Tunnel Support

- ☐ `npm install ssh2` and `npm install --save-dev @types/ssh2` done
- ☐ `createSshTunnel()` function in `electron/main.ts`
- ☐ `ssh:connect` IPC handler added
- ☐ `ssh:disconnect` IPC handler added
- ☐ `electron/preload.ts` — both exposed
- ☐ `ConnectDialog.tsx` — SSH Tunnel tab added (third tab)
- ☐ SSH toggle enables/disables SSH fields
- ☐ Auth method: Password | Private Key selector
- ☐ Private Key has Browse button for file picker
- ☐ When SSH enabled: connects tunnel first, then DB via localhost:localPort
- ☐ StatusBar shows 🔒 SSH indicator when tunnel active
- ☐ `npx tsc --noEmit` = 0 errors

### Phase 4 — Connection Groups Manager

- ☐ `ConnectionGroup` and `SavedConnection` interfaces in store
- ☐ `connectionGroups` state in `useAppStore.ts`
- ☐ `addGroup`, `removeGroup`, `saveConnection`, `removeConnection` actions
- ☐ Persisted to `localStorage` key `onobase:connectionGroups`
- ☐ `src/components/ConnectionManager.tsx` created (full tab)
- ☐ Left panel: groups tree with colour dots
- ☐ Right panel: connections table for selected group
- ☐ Right-click group: rename, delete, change colour
- ☐ `ConnectDialog.tsx` — "Save to Group" checkbox on success
- ☐ Server toolbar button opens Connection Manager tab
- ☐ `npx tsc --noEmit` = 0 errors

**Tier 2 final test:**

- ☐ Compare Schemas → column diffs shown correctly
- ☐ Query Log tab → previous queries persist after restart
- ☐ SSH Tunnel → connects via jump host (or tested with mock)
- ☐ Connection Manager → groups visible, connections moveable

---

## ── TIER 3: POLISH FEATURES ────────────────────────────────────────────────

### PROMPT TO PASTE INTO CLAUDE CODE:

```
Implement Tier 3 features for Onobase.
Use the full instructions in: Complete_Remaining_Features___Tier3.txt

Read the entire file before touching any file.
Run npx tsc --noEmit after EVERY step.
Report each phase as: "Tier 3 Phase X complete — 0 errors"
```

### Phase 1 — Light & Dark Themes

- ☐ `src/utils/themes.ts` created with 5 themes
- ☐ Themes: dark, midnight, forest, ocean, light
- ☐ `applyTheme()` sets CSS variables on `document.documentElement`
- ☐ `themeId` and `setTheme()` added to `useAppStore.ts`
- ☐ Theme persisted to `localStorage` key `onobase:theme`
- ☐ `App.tsx` applies saved theme on mount
- ☐ Settings panel — Appearance section with theme grid
- ☐ Each theme card shows 3 colour dots + name + description
- ☐ Selected theme card has teal border
- ☐ Switching theme updates full UI instantly (no page reload)
- ☐ `npx tsc --noEmit` = 0 errors

### Phase 2 — Query Bookmarks

- ☐ `QueryBookmark` interface in store
- ☐ `bookmarks`, `addBookmark`, `removeBookmark`, `updateBookmark` in store
- ☐ Persisted to `localStorage` key `onobase:bookmarks`
- ☐ `QueryEditor.tsx` toolbar — Bookmark / BookmarkCheck icon button
- ☐ Clicking bookmark on unsaved query → prompts for name
- ☐ Clicking on already-bookmarked query → removes bookmark
- ☐ Bookmarks panel/sidebar accessible from toolbar
- ☐ Bookmark list shows name, tags, use count
- ☐ Clicking bookmark → loads SQL into active editor
- ☐ `npx tsc --noEmit` = 0 errors

### Phase 3 — Result Set Charts

- ☐ `npm install recharts` (if not already installed)
- ☐ `src/components/ResultChart.tsx` created
- ☐ Chart type selector: Bar | Line | Pie
- ☐ X axis and Y axis column selectors
- ☐ Chart renders from query result data
- ☐ Chart tab appears alongside Results tab after query runs
- ☐ Colours use `var(--accent)` and theme palette
- ☐ `npx tsc --noEmit` = 0 errors

### Phase 4 — JSON / XML / Image Viewer

- ☐ `src/components/CellViewer.tsx` created
- ☐ Detects JSON strings → renders collapsible tree
- ☐ Detects XML strings → renders formatted/highlighted XML
- ☐ Detects base64 image strings → renders `<img>` preview
- ☐ Triggered on cell double-click or click on large cell
- ☐ Opens as a side panel or modal
- ☐ Copy button copies raw cell value
- ☐ `npx tsc --noEmit` = 0 errors

### Phase 5 — Database Health Dashboard

- ☐ `db:health` IPC handler added to `electron/main.ts`
- ☐ Queries: `pg_stat_user_tables`, `pg_stat_user_indexes`, `pg_stat_database`, `pg_stat_activity`
- ☐ `electron/preload.ts` — `getHealth` exposed
- ☐ `src/components/HealthDashboard.tsx` created
- ☐ Top row: 4 metric cards (DB size, connections, cache hit rate, tables)
- ☐ Middle left: Table Health AG Grid (dead %, vacuum, size)
- ☐ Middle right: Cache hit rate gauge (RadialBarChart)
- ☐ Bottom left: Unused Indexes AG Grid with "Script DROP" button
- ☐ Bottom right: Connection activity PieChart
- ☐ Refresh button + auto-refresh toggle
- ☐ HeartPulse toolbar button added
- ☐ `npx tsc --noEmit` = 0 errors

### Phase 6 — Keyboard Shortcuts Panel

- ☐ `src/utils/shortcuts.ts` created with all shortcuts
- ☐ Settings panel — "Keyboard Shortcuts" section added
- ☐ Categories: Query Editor, Application, Canvas
- ☐ Keys rendered as styled `<kbd>`-style badges
- ☐ `npx tsc --noEmit` = 0 errors

**Tier 3 final test:**

- ☐ Switch to Light theme → entire UI updates
- ☐ Switch back to Dark → persists after reload
- ☐ Bookmark query → appears in bookmarks panel
- ☐ Run SELECT → Chart tab renders bar chart
- ☐ Click JSON cell → tree viewer opens
- ☐ Health tab → metrics and charts load
- ☐ Settings → Shortcuts section visible with key badges

---

## ── FINAL STEPS ────────────────────────────────────────────────────────────

### PROMPT TO PASTE INTO CLAUDE CODE (after all tiers done):

```
Run final checks and commit for Onobase.

STEP 1 — Recompile electron:
  npx tsc -p tsconfig.electron.json
  npx tsc -p tsconfig.preload.json

STEP 2 — Final TypeScript check:
  npx tsc --noEmit
  Must be 0 errors.

STEP 3 — Update CREDITS.md with:
  ## @faker-js/faker — MIT — https://github.com/faker-js/faker
  ## recharts — MIT — https://github.com/recharts/recharts
  ## ssh2 — MIT — https://github.com/mscdex/ssh2

STEP 4 — Final git commit:
  git add -A
  git commit -m "feat: Onobase complete — all tiers implemented
    - Blank page fixed
    - Tier 0: Query safety analyser
    - Tier 1: DataViewer, CSV import, global search, fake data
    - Tier 2: Schema compare, query log, SSH tunnel, connection groups
    - Tier 3: 5 themes, bookmarks, charts, cell viewer, health dashboard, shortcuts"

STEP 5 — Final smoke test:
  npm run dev
  Verify app launches and is not blank.
```

- ☐ `npx tsc --noEmit` = 0 errors (final)
- ☐ CREDITS.md updated
- ☐ Git commit made
- ☐ App launches correctly

---

## ── RULES (apply to all prompts) ──────────────────────────────────────────

1. Run `npx tsc --noEmit` after EVERY step
2. Fix ALL TypeScript errors before next step
3. Recompile electron after any IPC change
4. Never modify: `Canvas.tsx`, `ModuleWindow.tsx`, `ModuleLayer.tsx`, `ModuleLayer.tsx`, `ObjectExplorer.tsx`, `useModuleStore.ts`, `ConnectDialog.tsx`, `StatusBar.tsx`, `Toast.tsx` — unless the tier instruction explicitly states it
5. Add Obnet copyright comment to every new file created
6. Do not install packages not listed in the tier instructions
7. Report completion of each step with error count

---

*Onobase — Obnet Pty Ltd © 2026*
