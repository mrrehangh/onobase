# Onobase — ARCHITECTURE

# ✅ APPROVED by Rehan 09-20-2026 (Gate 2)

Approval document for **Gate 2**. Written in Phase 2 from `INTAKE.md`, approved
before Phase 3 starts. The last cheap moment to change the database or framework.

**Every choice cites the intake line that drove it.** A choice with no citation
is a preference wearing a justification, and it gets defended later as though it
were a requirement (FAILURES.md F3).

⚠ **THIS IS A RECORD, NOT A PROPOSAL.** Onobase is an existing project. Every
choice below was already made and is already in the code. DOCKING.md step 6 says
an existing project still writes this document, because writing down what was
chosen and what was rejected is usually the first time either has existed in
writing — and it is where the disagreements surface.

⚠ **`ONOBASE-SPEC.md` IS OUT OF DATE AND READS AUTHORITATIVE.** Dated 21 March,
it says Onobase supports PostgreSQL only and lists multi-database support as
Phase 2A, not built. The code, dated 23 March, imports and branches on four
drivers. This is FAILURES.md F1 in miniature: a confident file that answers
wrongly. The spec is useful for intent and for future design. It must not be
quoted for current state.

| | |
|---|---|
| Written | 09-20-2026 |
| From intake dated | 09-20-2026 |
| Status | **APPROVED by Rehan 09-20-2026 (Gate 2)** |
| Answers added | 09-20-2026 — password storage, Oracle out of scope, the three must-NOT-haves |

---

## 1. Language and framework

**Choice:** Electron, with React 18, TypeScript and Vite inside it.

Plainly: Electron is a way to build a desktop program using web technology. The
window is a web page; a second, hidden process has the run of the machine and
does the work the web page is not allowed to do — in this case, talking to
databases. React draws the window, TypeScript is JavaScript with type checking
added, and Vite is the tool that builds it.

**Because:** intake §1 says one program that reaches every kind of database, and
§2 names SSMS as the bar. A database driver cannot run inside a browser tab, so
the tool has to be a real installed program. Electron gives that while letting
one person build the whole interface in one language.

**Rejected:**

| Not chosen | Why not — on the intake, not on taste |
|---|---|
| A web application in a browser | Intake §1 requires direct connections to PostgreSQL, MySQL, SQL Server and SQLite. A browser tab cannot open a database port. It would need a server in the middle, which is a different product with a different threat model |
| A native Windows application (WPF, WinUI) | Would match SSMS most closely, and would tie Onobase to Windows. `package.json` already configures Windows, macOS and Linux builds, so cross-platform was wanted from the start |
| Tauri instead of Electron | Smaller output, but the database drivers in use are Node packages. Tauri would mean rewriting the whole data layer in Rust |

**Said plainly:** this is also the stack Rehan already works in. That is a
legitimate reason. An unstated one would not be.

---

## 2. Database

**Onobase has no database of its own.** This is the section that is different
from every other project, and it is the single most important line in this
document.

**Choice:** none. Onobase stores almost nothing. It connects to databases that
belong to other people and reads and writes through a live connection.

**Because:** intake §5 says the contents of the databases it connects to are held
by those databases, not by Onobase, and §6 says one user on one machine.

**The four it connects to, all wired up in `electron\main.ts`:**

| Database | Driver | What is in the code |
|---|---|---|
| PostgreSQL | `pg` | The complete path: connect, list databases, query, schema, scripting, EXPLAIN, activity monitor, kill query, health dashboard |
| MySQL | `mysql2` | Connect, query, schema introspection |
| SQL Server | `mssql` | Connect, query, schema introspection |
| SQLite | `better-sqlite3` | Connect by file path, query, schema by PRAGMA loop |
| Oracle | none | **OUT OF SCOPE FOR NOW — ruled by Rehan 09-20-2026.** The word `'oracle'` in the `DbType` list at `src\types\index.ts` line 2 and nowhere else. It stays in the type and is not built against. Recorded, not removed (RULES.md 31) |

**Relational or not, and why the data is or is not:** all four are relational.
Intake §1's SSMS comparison is a relational comparison — object tree, tables,
columns, SELECT.

**Where it runs:** on whatever machine the person points it at. **Erudite never
provisions any of it, and never runs a schema change through the app. Gate 4 and
Gate 5.** A user's production server is one connection dialog away.

**Rejected:**

| Not chosen | Why not |
|---|---|
| One abstraction layer over all databases (an ORM) | Intake §2 wants SSMS-style features, which are database-specific by nature. An ORM hides exactly the differences this tool exists to show |
| A local store for Onobase's own settings (SQLite) | Not rejected so much as not yet needed. Layouts and history are held in files today. If it is ever added, it becomes the first thing Onobase owns, and Gate 4 starts applying to Onobase itself |

---

## 3. Hosting target

**Choice:** none. It is installed on a machine.

`package.json` configures `electron-builder` for an NSIS installer on Windows, a
DMG on macOS and AppImage plus deb on Linux.

**Because:** intake §7 says it costs nothing to run, and §6 says one person on
one machine.

⚠ **Naming a target is not permission to deploy to it.** `npm run build` produces
an installer. **That is a Gate 5 decision for Rehan** and is already written into
`AGENTS.md` as this project's rule 4. `npm run build -- --publish always` is
refused outright by the gate, correctly.

---

## 4. Authentication approach

**ANSWERED 09-20-2026. This section read BLOCKED in the draft; Rehan ruled and it
no longer does.**

Onobase has no users of its own to authenticate. Whoever opens the program has
it. The authentication that matters is the database's own, and the credentials
are typed into the connect dialog by the person.

**Choice — how a password is held:** either in the **Windows secure credential
store**, or **not saved at all**. There is no third option, and plain text is
specifically excluded — not a file, not a settings entry, not the query log.

**Because:** intake §4 MN-2 says so in those words. The credential store is the
operating system's own place for this; it is encrypted per Windows user account
and Onobase never has to hold the plain value itself.

**Rejected:**

| Not chosen | Why not — on the intake, not on taste |
|---|---|
| A password in a settings or history file, even obscured | Intake §4 MN-2 forbids plain text, and obscuring is plain text with a step in front of it |
| Onobase's own encrypted store with its own key | The key has to live somewhere, and that somewhere is a file on the same machine. The credential store already solves this and is maintained by Microsoft |
| Always prompting, never saving | Not rejected — it is the second permitted option, chosen per connection by the person |

⚠ **What is in the code today has NOT been checked against this ruling.**
`ConnectDialog.tsx` has a "remember password" option, and where that value goes is
not yet known. Feature F040 is what finds out, and it is written so that finding
plain text anywhere is a failure.

**Who can see what, and where it is enforced:**

| Who | May see | Enforced where |
|---|---|---|
| The person at the machine | Everything the database login they typed can see | The database server — always. Onobase enforces nothing |

**No longer blocked.** Intake open question 2 was answered on 09-20-2026 and the
answer is recorded above.

---

## 5. How it gets checked

**Command:** `npm run typecheck`
**Runs in:** `onobase_App`

In full, from `onobase_App\package.json`:

```
tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.electron.json --noEmit && tsc -p tsconfig.preload.json --noEmit && echo typecheck: 0 errors
```

**Proven to FAIL on deliberately broken code on:** `09-20-2026`

How it was proven:
1. Broke `src\utils\colors.ts` line 3 by renaming `MODULE_COLORS` to
   `MODULE_COLORS_BROKEN`.
2. Ran the command. It reported **10 errors in 2 files** and named them:
   `src\App.tsx` lines 31, 160 and 522, and `src\utils\colors.ts` lines 50 and 55.
   No `typecheck: 0 errors` line appeared.
3. Reverted. Ran again: `typecheck: 0 errors`, all three stages.

Recorded at `evidence\F001.txt`. This is feature F001, and it is the only feature
in the list that passes.

⚠ **Why the three configs are named one by one.** `onobase_App\tsconfig.json`
holds `"files": []` and two references. Pointing the check at it would compile
ZERO files and exit 0 on any code at all — FAILURES.md F8, five files reported
clean by a command that compiled none of them, sitting in the repository waiting.

⚠ **Why the check ends with an echo.** `tsc --noEmit` prints nothing when it
passes, and `pre-commit.ps1` refuses a commit when a check exits 0 having printed
nothing. Ruled by Rehan 09-20-2026: the check must speak.

**Rejected:**

| Not chosen | Why not |
|---|---|
| ESLint | `eslint.config.js` exists but there is no script to run it and it has never been proven to fail on broken code. It could be added later as a second check; it is not the one the hook runs |
| `npm run build` as the check | It runs `electron-builder` and writes an installer. Far slower, and it makes every commit a packaging run |

---

## Anything BLOCKED

| Decision | State | Who can answer |
|---|---|---|
| §4 Authentication — password storage | **CLEARED 09-20-2026.** Windows secure credential store, or not saved at all | — |
| Oracle | **CLEARED 09-20-2026.** Out of scope for now | — |
| Scope of the product | **STILL BLOCKED.** Whether Onobase is for Rehan, for a team, or to be sold. It does not block anything in the current feature list, but it decides what §4 has to become if it is ever more than one person's tool | Rehan |
| Paid services | **STILL BLOCKED.** Intake §7 does not say whether they are allowed, which is why the AI assistant component has no feature in the list | Rehan |

A blocked decision stops Phase 2. It does not get a provisional answer. Neither of
the two remaining blocks the approved feature list.

---

## Checked against the must-not-haves

Intake §4 was answered on 09-20-2026. Every line of it, and how this architecture
honours it.

| Must-not-have | How this architecture honours it | Proven by |
|---|---|---|
| **MN-1** — never changes a database unless the person pressed Run or confirmed | Every write path in `main.ts` sits behind an IPC message the window only sends on an action: `db:query`, `db:updateCell`, `db:deleteRows`, `db:insertRows`. Nothing in the read paths writes. Scripting and the table designer GENERATE text and do not execute it — which is why F008 and F030 say in the steps: do not run it | **F039** |
| **MN-2** — never saves a password as plain text | Windows secure credential store, or not saved at all. Recorded in §4 above with its rejected alternatives | **F040** |
| **MN-3** — never sends data or queries anywhere online | The only outbound connection Onobase makes is to the database the person named, plus an SSH tunnel where the person configured one. No telemetry, no crash reporting, no sync. ⚠ The AI assistant component is the one part that would talk to an outside service, and it has no feature in the list, because intake §7 has not said whether paid services are allowed | **F041** |
| Nothing the agent does may run a schema change through Onobase against a real database | Gate 4 and RULES.md 25. Already written into `AGENTS.md`. No feature in the list runs a schema change | Gate 4 itself |

---

## Two known limits, recorded rather than fixed

1. **Scripting and EXPLAIN are PostgreSQL-only, by an explicit refusal.**
   `main.ts` line 549 returns "Script generation requires PostgreSQL" and line 622
   "Explain requires PostgreSQL". Deliberate, not a defect. It is why
   "Select Top 1000 Rows" is a PostgreSQL feature first and a separate feature per
   database afterwards.
2. **Seven `as any` casts in `main.ts`** — lines 315, 931, 942, 967, 980, 1015 and
   1026, all around parameter arrays handed to a driver. They are already
   suppressing whatever the compiler would have said there. Pre-existing, recorded,
   not touched (RULES.md 31). Changing them is its own decision, not baseline work.
