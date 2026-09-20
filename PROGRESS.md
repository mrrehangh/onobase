# Onobase — PROGRESS

Companion to `feature_list.json`. That file is the record; this one is the view.
When they disagree, `feature_list.json` wins — it carries the evidence.

First thing the next session reads (Phase 4, step 1). Leave it true.

⚠ **Dates are MM-DD-YYYY (RULES.md 44).**

⚠ **`feature_list.json` at this root is still the TEMPLATE COPY, verbatim.**
It holds F001, F002 and F003 exactly as the blank has them, all three false.
It is NOT Onobase's real feature list yet. That gets written in Phase 3 and
confirmed at Gate 3. F003 is the template's placeholder — angle-bracket text
that can never pass — and RULES.md 7 and 8 forbid rewording or deleting it, so
it stays and stays false. Any percentage read off this file therefore has a
ceiling below 100%, exactly as in Erudite itself.

| | |
|---|---|
| Last updated | 09-20-2026 by Cowork |
| Phase | **GATES 1, 2 AND 3 ALL APPROVED by Rehan 09-20-2026.** Docking complete through step 5c, committed as `7c8e26e`. Phase 4, the build loop, starts once the approved feature list is committed |
| Features passing | **1 of 41** once the approved list is committed. The file on disk still holds 1 of 3 — the real list is in `feature_list.proposed.json` and waits on the gate |

---

## Done

**GATES 1, 2 AND 3 WERE ALL APPROVED BY REHAN ON 09-20-2026**, with four answers
that changed the documents: connection passwords go in the Windows secure
credential store or are not saved at all, never as plain text; Oracle is out of
scope for now; Select Top 1000 Rows opens the query AND runs it, the way SSMS
does; and there are three must-NOT-haves, now features F039, F040 and F041.
`INTAKE.md` and `ARCHITECTURE.md` are stamped APPROVED. The feature list is
`feature_list.proposed.json`, 41 features, one passing, and it becomes the record
when the gate clears it.

Only features whose `passes` is true AND whose `evidence` holds a command and its
real output. Nothing reaches this section for having been built.

Onobase's own working code is still absent from this table, and stays absent until
each piece is proven. DOCKING.md step 7 is explicit: an existing project writes its
list as though nothing is built, because appearing to work is not evidence.
FAILURES.md F9 is what happens when that step is skipped. What is below is only what
a command was actually run against.

| What | What was proven | Proved by | Date |
|---|---|---|---|
| **THE CHECK COMMAND IS TRUSTED — it fails on broken code and passes on good code.** This is DOCKING.md step 4, the one it says not to skip | `src\utils\colors.ts` line 3 renamed to `MODULE_COLORS_BROKEN`: **10 errors in 2 files**, naming `src\App.tsx` lines 31, 160 and 522 and `src\utils\colors.ts` lines 50 and 55, and **no `typecheck: 0 errors` line**. It followed the reference out of one file into another, which is what proves it is reading the project rather than one file. Break undone: `typecheck: 0 errors`. **All three stages ran — app, electron and preload.** The electron and preload stages had never been reached before, because the app stage had always failed first and stopped the chain | `npm run typecheck` in `D:\Data\Folders\My_AI_Projects\OnoBase\onobase_App`, run by Rehan, Windows PowerShell 5.1. Recorded at `evidence\F001.txt` | 09-20-2026 |
| **GIT IS POINTED AT THE HOOKS FOLDER** | `git config --get core.hooksPath` printed `.githooks`. Until this was set the hook files existed and git was not calling them — a guard nobody pointed git at does not exist | `git config core.hooksPath .githooks`, run by Rehan | 09-20-2026 |
| **THE PRE-COMMIT HOOK REFUSED A COMMIT OF BROKEN CODE.** This is the half of DOCKING.md 5c that matters most: the other two guards run because someone chose to call them, and this one runs whether anyone remembered or not | With the same one-line break in place, `git commit` printed `pre-commit: FAILED (exit 2) - npm run typecheck`, listed the 10 errors, and printed `Commit refused.` **Nothing was committed, and `--no-verify` was not used.** ⚠ The `(exit 2)` in that header is the CHECK COMMAND'S exit code carried up by npm, not the hook's own — Erudite met the same confusion in `evidence\F005.txt`, where `-4058` was npm's errno and the hook returned 1 | `git add -A` then `git commit`, run by Rehan. Recorded at `evidence\F001.txt` | 09-20-2026 |
| **THE PRE-COMMIT HOOK ALLOWED A CLEAN COMMIT — so DOCKING.md 5c is now proven in BOTH directions.** A hook that has only ever been seen saying no is not yet trustworthy; the refusal only counts once the pass has been seen beside it | With the break undone, `git commit` ran the hook, the hook ran `npm run typecheck`, the check passed and the commit was **ALLOWED**. **Commit `7c8e26e` on `dev`**, pushed to the remote. `--no-verify` was not used. Both directions were seen on the same day, on the same machine, against the same one-line break | `git add -A`, `git commit`, `git push origin dev`, run by Rehan. Recorded at `evidence\F001.txt` | 09-20-2026 |
| **TEN PRE-EXISTING TYPE ERRORS IN ONOBASE WERE FOUND AND FIXED.** None was caused by docking; the check found faults that were already there. Each fix is the smallest change that leaves behaviour untouched | 1. `App.tsx:286` `isQueryActive` never read — removed. 2. `App.tsx:285` `activeTab`, unused once the first was gone — removed by Rehan. 3. `useAppStore.ts:133` `queryTabCounter` set to 0, never read, never incremented — removed. 4 and 5. `DiagramView.tsx:184` and `:185` `nodes` and `edges` never read — bindings dropped, hooks kept, because ReactFlow is given `memoNodes`/`memoEdges`. 6. `ExecutionPlan.tsx:123` `'{}' not assignable to 'PlanNode'` — fixed by declaring `Plan?: PlanNode` on the interface, which is also what PostgreSQL's `EXPLAIN (FORMAT JSON)` genuinely returns; **no `any`, no ts-ignore**. 7. `SchemaComparison.tsx:52` `bColor`/`setBColor` never read — line removed. 8. `TableDesigner.tsx:103` `'T'` never read inside an `infer T` that always resolved to `unknown` — annotation simplified. 9 and 10. `TableDesigner.tsx:183` and `ActivityMonitor.tsx:211` AgGridReact does not accept `style` — **the prop was never read by ag-grid-react at run time** (checked: `props.style` appears zero times in its shipped runtime; the supported props are `containerStyle` and `className`), so removing it changed nothing on screen. The wrapper div with `flex: 1` is what sizes both grids | `npm run typecheck`, run by Rehan | 09-20-2026 |

---

## In progress

**One feature. Not two.** If a second is listed, the first was abandoned rather
than finished — and abandoned work looks identical to finished work a week later.

| Feature | On which step | What is blocking it |
|---|---|---|
| — | **Nothing is in progress.** F001 is done and flipped; the next feature is F004 and it is not started | The approved 41-feature list has to be committed first. Until then `init.ps1` reads the old three-feature file and names the wrong next feature. |

---

## Next

In order. The top row is what gets picked up, and nothing else starts first.

| Order | Feature | Category | Why this one next |
|---:|---|---|---|
| 1 | F004 | data | Connect to PostgreSQL and see the object tree. It is the first thing a person does, and every other PostgreSQL feature stands on it. |
| 2 | F005 | data | Run a SELECT and see rows. F004 plus F005 is the app usable by one person for one task, which is what Phase 3 asks the first features to deliver. |
| 3 | F006–F012 | data, reporting, admin | The rest of the PostgreSQL path: View Data, editing, scripting, EXPLAIN, activity monitor, health, export. |
| 4 | F013–F018 | data | MySQL, SQL Server and SQLite — connect, then query. One database per feature, as ruled. |
| 5 | F019–F034 | mixed | The SSMS-style rest, proven on PostgreSQL first. |
| 6 | F035–F038 | ui | Select Top 1000 Rows, PostgreSQL first, then one per database. It opens the query AND runs it. |
| 7 | F039–F041 | security | The three must-NOT-haves. They can be taken at any point and should not wait until last — a promise nobody tested is a hope. |
| — | F002 | security | A short proof run against `Erudite\hooks\block-destructive.ps1`, whenever it suits. |
| — | F003 | — | Never. It is the template placeholder and can never pass (RULES.md 7 and 8). |

---

## Broken or unverified

**Two different things, kept apart on purpose.**

- **BROKEN** — proven to fail. Something ran and came back red.
- **UNVERIFIED** — nobody knows. It was written and never exercised.

An unverified feature is not passing and is not broken. Recording it as "done
pending testing" is FAILURES.md F6: six steps ticked, 100% reported, a migration
that had never run.

Everything Onobase has, is here. Nothing has been proven under Erudite yet.

| Feature | BROKEN or UNVERIFIED | What is actually known | What would settle it |
|---|---|---|---|
| The hook's OWN exit code on a refusal | UNVERIFIED | The console showed `pre-commit: FAILED (exit 2) - npm run typecheck`, but that number is the check command's, carried up by npm. `pre-commit.ps1` returns 1 for a failed check and 2 for a misconfiguration, and which one it returned was not read. It was plainly a check failure — the check ran and printed its errors — but plainly is not proof. | `echo %ERRORLEVEL%` immediately after a refused commit. |
| PostgreSQL support | UNVERIFIED | The driver `pg` is imported in `electron\main.ts` and the connect, query, schema, scripting, explain, activity and health paths all branch on it. Nobody has watched it work under Erudite. | Connect to a real PostgreSQL database and read a table back. |
| MySQL, SQL Server and SQLite support | UNVERIFIED | All three drivers are imported and branched on in `electron\main.ts`. But `src\components\ConnectDialog.tsx` line 225 reads `canLoad = ... && dbType === 'postgresql'`, which switches the Load-databases button OFF for all three. Whether a connection completes without it is NOT KNOWN. | Connect to one of each and read a table back. |
| Oracle support | UNVERIFIED — almost certainly absent | The string `'oracle'` appears once, in the `DbType` list at `src\types\index.ts` line 2, and NOWHERE else. No driver, no handler. The spec lists it as a future plugin. | Nothing, until someone decides to build it. |
| Scripting and EXPLAIN | KNOWN LIMIT — in the code, not a defect | `electron\main.ts` line 549 returns "Script generation requires PostgreSQL" and line 622 "Explain requires PostgreSQL". Both refuse other databases on purpose. | Nothing. Recorded so the next reader does not report it as a bug. |
| `ONOBASE-SPEC.md` | BROKEN as a description of the present | It says PostgreSQL only and lists multi-database support as not built. The code disagrees and the code is newer. It is still useful for intent and for Phase 2 design. | The architecture document written at Gate 2 says plainly which parts of the spec are now historical. |

---

## Waiting on Rehan

Everything stopped at a gate. Nothing here counts toward Done, however finished
the file looks.

⚠ **A BLOCKER, NOT A PREFERENCE: COWORK CANNOT COMMIT IN THIS REPOSITORY.**
Cowork reaches this folder through a Linux workspace. The git hook shim
`.githooks\pre-commit` runs `powershell.exe`, and **`powershell.exe` does not exist
in that Linux workspace** — checked on 09-20-2026, along with `pwsh`, which is also
absent. A `git commit` issued from there would be refused by git because the hook
could not start, not because anything is wrong with the code. Cowork therefore did
NOT run `git add`, `git commit` or `git push`, and left the repository untouched.
The one thing it must never do is reach for `--no-verify`, which is the only way
round it and is forbidden by DOCKING.md 5c and by `block-destructive.ps1` rule 15.
The same limit applies to `verify-gate.ps1`, which is a PowerShell script.

| Gate | What | Full path | Kind | Handed over |
|---|---|---|---|---|
| — | **Commit the approved 41-feature list.** `feature_list.proposed.json` holds it. Run `verify-gate.ps1` with NO `-Evidence` — nothing flips, so none is needed — and only on EXIT=0 does the proposed file replace the real one and get committed. If the gate refuses, stop and report; never work around it | `D:\Data\Folders\My_AI_Projects\OnoBase` | test, then git — run by Rehan | 09-20-2026 |
| 1 | **INTAKE.md — APPROVED 09-20-2026** | `D:\Data\Folders\My_AI_Projects\OnoBase\INTAKE.md` | decision | closed |
| 2 | **ARCHITECTURE.md — APPROVED 09-20-2026** | `D:\Data\Folders\My_AI_Projects\OnoBase\ARCHITECTURE.md` | decision | closed |
| 3 | **The feature list — APPROVED 09-20-2026**, 41 features, 1 passing | `D:\Data\Folders\My_AI_Projects\OnoBase\feature_list.proposed.json` | decision | closed, pending the commit above |

---

## Notes for the next session

**Never point the check at `tsconfig.json`.** It holds `"files": []` and two
references. `tsc -p tsconfig.json --noEmit` compiles ZERO files and exits 0 on
any code at all — FAILURES.md F8 sitting in the repository, waiting. The check
names `tsconfig.app.json`, `tsconfig.electron.json` and `tsconfig.preload.json`
one by one for exactly that reason.

**The check ends with an echo on purpose.** `tsc --noEmit` prints nothing when it
passes, and `pre-commit.ps1` treats a command that exits 0 having printed nothing
as suspicious and refuses the commit with exit 2 — it ignores npm's own `> `
header lines, so `npm run` does not rescue it. Rehan ruled on 09-20-2026 that the
check must SPEAK: `$SilentCheckIsExpected` stays `$false` and the script ends with
`echo typecheck: 0 errors`. If that line ever stops appearing, something is wrong
with the check itself and the hook is right to refuse.

**Three words are traps in command text.** `DROP`, `DELETE FROM` and `publish`
are matched by gate rules 20, 22 and 9/25 wherever they appear — including inside
a commit message. Onobase's own object-tree menu offers `DROP` as a scripting
option, so this WILL come up. Write the message another way.

**`onobaseCom` is a separate repository inside this one**, on branch `main`, with
no `.gitmodules` anywhere. Out of scope by Rehan's ruling 09-20-2026. The hook at
this root does not fire for commits made inside it.

**What has now been run, and by whom.** Rehan ran `npm run typecheck` three times
and one refused `git commit` on 09-20-2026, on Windows PowerShell 5.1, and pasted
the results back. Cowork wrote the files and recorded those results; Cowork has run
no git command, no npm command and nothing against any database in this repository,
at any point.

**Cowork cannot commit here, and the reason is worth remembering.** Its workspace is
Linux and has no `powershell.exe`, which is what `.githooks\pre-commit` execs. This
is not a temporary outage and it will be true every session. Commits in Onobase are
Rehan's, the same way migrations are.

**THE THREE MUST-NOT-HAVES ARE PROMISES, NOT SETTINGS.** MN-1 Onobase changes
nothing unless the person pressed Run or confirmed; MN-2 no password as plain
text, ever; MN-3 nothing goes online. F039, F040 and F041 prove them, and each is
written so a failure is recognisable — F040 says to search every file Onobase
writes for a password you will recognise on sight. A negative requirement nobody
tested is a hope.

**TWO THINGS ARE DELIBERATELY ABSENT FROM THE FEATURE LIST.** Oracle, because it
is out of scope for now — the word `'oracle'` stays in `DbType` at
`src\types\index.ts` line 2 and is not built against. And the AI assistant,
because intake §7 has not said whether paid services are allowed, and writing a
feature for it would be choosing. Both are recorded gaps, RULES.md 31.

**The check command is now trusted, and that is the foundation everything else
stands on.** It was proven in both directions on 09-20-2026 before a single line of
Onobase's own work was claimed. That ordering is the whole point of DOCKING.md
step 4 being step 4.
