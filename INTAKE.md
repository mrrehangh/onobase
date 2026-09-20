# Onobase — INTAKE

# ✅ APPROVED by Rehan 09-20-2026 (Gate 1)

Approval document for **Gate 1**. Written in Phase 1, read by Rehan, confirmed
before Phase 2 starts.

Every heading below has an answer or the words **NOT ANSWERED**. Nothing is
filled in from what seemed sensible — a cleaned-up intake is how a guess becomes
a requirement (FAILURES.md F10).

⚠ **This intake was written from the CODE, not from `ONOBASE-SPEC.md`.** That
spec is dated 21 March and says Onobase is PostgreSQL only. The code is dated
23 March and has four database drivers wired up. Where the two disagree, the code
is what runs (RULES.md 16-18).

⚠ **This was not a live interrogation.** Phase 1 asks for one question at a time,
answered by the person. Most of what is below was read off the repository, and
the goals in §3 come from what Rehan said when he asked for this draft. Anything
he has not said is marked **NOT ANSWERED** rather than guessed.

| | |
|---|---|
| Written | 09-20-2026 |
| Written by | Cowork |
| Answered by | Rehan, for §1 and §3; the rest read from the code |
| Status | **APPROVED by Rehan 09-20-2026 (Gate 1)** |
| Answers added | 09-20-2026 — must-NOT-haves, passwords, Oracle, Select Top 1000 behaviour |

---

## 1. Purpose

**What is this for?**
Onobase is a desktop database IDE — one program on one machine that connects to
many different kinds of database and lets a person look at them, query them and
change them, without needing a different tool for each kind.

**What happens today without it, and what is wrong with that?**
A person working across PostgreSQL, MySQL, SQL Server and SQLite needs a separate
tool for each: SSMS for SQL Server, pgAdmin for PostgreSQL, Workbench for MySQL,
something else again for SQLite. Each has its own habits, its own keyboard, its
own idea of what a result grid looks like. Rehan's stated goal is one tool that
connects to every database type, with the features SSMS has, so the habits carry
across.

---

## 2. Users

**Who opens it, and how many of each?**

| Who | How many | What they open it to finish |
|---|---:|---|
| Rehan | 1 | Work across the databases behind DokShield and his other projects without changing tools |
| Other developers or database people | **NOT ANSWERED** | **NOT ANSWERED** — it is not stated whether this is for one person, a team, or a product to sell |

**What do they use instead today?**
SSMS is the named bar to clear. Rehan asked for "SSMS-style features", which
makes SSMS the comparison, not a general idea of a database tool.

---

## 3. Must-have features

Numbered, so features in Phase 3 can cite them.

1. **Connect to every database type**, one database at a time, each one proven
   on its own. Stated by Rehan 09-20-2026: one database per feature.
2. **SSMS-style features** — the things a person coming from SSMS expects to
   find: an object tree, right-click actions on a table, a query window, a result
   grid, scripting a table as SELECT / INSERT / CREATE / DROP / ALTER.
3. **"Select Top 1000 Rows" from the right-click menu on a table in the object
   tree** — named by Rehan as the first new feature to build, PostgreSQL first.

**Which one, missing on launch day, means don't launch?**
Number 1. A universal database IDE that reaches one database is a PostgreSQL
tool with ambitions.

---

## 4. Must-NOT-haves

**Nobody volunteers this section. It was asked directly.**

**Answered by Rehan 09-20-2026.**

**What must this never do?**
- **MN-1. Onobase never changes a database unless the person pressed Run, or
  confirmed the change.** Nothing writes, updates, deletes or alters by itself —
  not on opening a table, not on a refresh, not on closing a tab.
- Already written down in `AGENTS.md` and repeated here because it belongs here:
  nothing the agent does may run a schema change through Onobase against any real
  database. The app can be pointed at a production server by whoever holds it.
  Gate 4, and RULES.md 25.

**What must it never store, send, or connect to?**
- **MN-2. Onobase never saves a password as plain text.** A password is either
  held in the Windows secure credential store, or not saved at all. Those are the
  only two options — not a file, not a settings entry, not the query log.
- **MN-3. Onobase never sends data or queries anywhere online.** No telemetry, no
  crash reporting, no cloud sync, no calling home. The only network traffic it
  makes is the connection to the database the person asked for.

**What would make it unacceptable?**
Any of the three above being broken. Each is a promise about someone else's
production database or someone else's credentials, which is why each is written
as a feature of its own rather than left as an intention.

Each line here becomes a feature in Phase 3 that PROVES the thing does not
happen. A negative requirement nobody tested is a hope. **MN-1, MN-2 and MN-3 are
features F039, F040 and F041.**

---

## 5. Data it holds

| Kind of data | Personal? | Who may see it | Must never leave? |
|---|---|---|---|
| Connection details — host, port, user, database name | no | the person at the machine | **YES — they never go online (MN-3)** |
| Connection passwords | yes, in effect | the person at the machine | **YES — never as plain text.** Windows secure credential store, or not saved at all (MN-2) |
| Query history and query log | possibly — a query can contain real values | the person at the machine | **YES — it never goes online (MN-3)** |
| Saved module layouts, bookmarks, snippets | no | the person at the machine | **YES — they never go online (MN-3)** |
| The contents of the databases it connects to | depends entirely on the database | whoever the database lets in | Onobase holds none of it — it reads and writes through a live connection |

**Retention — how long is it kept, and what deletes it?**
**PARTLY ANSWERED 09-20-2026.** A password is kept in the Windows secure
credential store or not kept at all, so removing it is the credential store's job.
The query log has a clear action. How long everything else is kept, and whether
anything expires on its own, is still **NOT ANSWERED** — carried as open question 4.

---

## 6. Expected scale

| | Month one | Year one |
|---|---:|---:|
| Users | 1 | **NOT ANSWERED** |
| Records | not applicable — Onobase stores almost nothing of its own | not applicable |
| Concurrent sessions | 1 | **NOT ANSWERED** |

This is a desktop application, one copy per machine, one person at a time. The
scale question that actually matters is a different one and is **NOT ANSWERED**:
how large a result set must the grid handle without falling over? Today the data
viewer pages 500 rows at a time.

---

## 7. Budget limits

**What can this cost to run per month?** Nothing. It runs on the machine it is
installed on and calls no paid service.
**Hard ceiling?** Not applicable.
**Are paid services allowed at all?** **STILL NOT ANSWERED**, and it is why the AI
assistant component has no feature in the Phase 3 list. Nothing else in the code calls
one today. The AI assistant component takes a provider key from the person, which
would be their cost and not the application's.

Erudite never spends money whatever the answer (RULES.md 26-30, Gate 5).

---

## 8. Deadline

**When is it needed?** **NOT ANSWERED.**
**What happens if it is late?** **NOT ANSWERED.**
**Fixed date behind it — contract, audit, demo — or a preference?** **NOT ANSWERED.**

---

## What exists today — read from the code, on 09-20-2026

This section is not in the template. It is here because Onobase is an existing
project, and DOCKING.md step 7 says the feature list is written as though nothing
is built. That instruction only makes sense if what IS built is written down
somewhere, so it is written down here — and nothing in this section counts as
proof of anything. **Not one line of it has been watched working.**

**Shape.** An Electron desktop application: a Windows program with a web page
inside it. The window is React and TypeScript. The part that talks to databases
is a separate process, `electron\main.ts`, 1,104 lines, and the window asks it to
do things through 31 named messages listed in `electron\preload.ts`.

**Database drivers wired up, all four imported and branched on in `main.ts`:**
PostgreSQL (`pg`), MySQL (`mysql2`), SQL Server (`mssql`), SQLite
(`better-sqlite3`). Oracle appears once, as the word `'oracle'` in the `DbType`
list at `src\types\index.ts` line 2, and nowhere else — no driver, no handler.

**Screens and panels present in `src\components\`, 38 files.** Object explorer
with a right-click menu; query editor with Monaco; result grid and data viewer
with paging and inline cell editing; table designer; schema diagram and a module
canvas; schema comparison between two servers; query execution plan; activity
monitor; health dashboard; query log; global search; CSV import wizard; fake data
generator; result charts; JSON viewer; bookmarks; snippets; connection manager;
SSH tunnel; a git panel; an AI assistant; themes; keyboard shortcuts.

**Two limits that are in the code on purpose, not defects:** scripting a table
refuses anything but PostgreSQL (`main.ts` line 549, "Script generation requires
PostgreSQL") and so does EXPLAIN (line 622, "Explain requires PostgreSQL").

**One limit that looks unfinished:** `src\components\ConnectDialog.tsx` line 225
reads `canLoad = ... && dbType === 'postgresql'`, which switches the
load-databases button off for MySQL, SQL Server and SQLite. Whether a connection
completes without pressing it is not known.

**Seven `as any` casts in `main.ts`** — lines 315, 931, 942, 967, 980, 1015 and
1026, all around parameter arrays handed to a driver. Pre-existing, recorded, not
touched (RULES.md 31).

---

## Open questions

**This is the Gate 6 list.** Every item left here is a future stop mid-build.

**Four of the eight were answered on 09-20-2026.** They are kept here, marked
ANSWERED, rather than deleted — a list that shows only what is still open hides
what was decided and when.

| # | Question | Status | Blocks which phase |
|---:|---|---|---|
| 1 | Is Onobase for Rehan alone, for a team, or a product to be sold? | **OPEN** | 2 and 3 |
| 2 | May connection passwords be stored on disk, and if so how? | **ANSWERED 09-20-2026** — never as plain text; Windows secure credential store, or not saved at all. Becomes MN-2 and feature F040 | — |
| 3 | What are the must-NOT-haves? | **ANSWERED 09-20-2026** — three of them, MN-1, MN-2 and MN-3 in §4, proven by F039, F040 and F041 | — |
| 4 | How large a result set must the grid survive? Paging is 500 rows today. Retention of everything but passwords is also still open | **OPEN** | 3 and 4 |
| 5 | Does "SSMS-style features" mean a specific list, or the ones already in the code? The Phase 3 list assumes the second | **OPEN, but not blocking** — Gate 3 was approved with that assumption | 3 |
| 6 | Is Oracle in scope? | **ANSWERED 09-20-2026 — OUT OF SCOPE FOR NOW.** The word `'oracle'` stays in `DbType` at `src\types\index.ts` line 2 and is not built against. Recorded, not removed | — |
| 7 | Does "Select Top 1000 Rows" open the query, or open AND run it? | **ANSWERED 09-20-2026 — it opens the query AND RUNS IT**, which is what SSMS does. F035 to F038 are written that way | — |
| 8 | Is there a deadline? | **OPEN** | — |
| 9 | Are paid services allowed at all? §7 is unanswered, which is why the AI assistant has no feature | **OPEN** | 3 |

---

## What was heard, in one paragraph

Onobase is a desktop database IDE that Rehan is building so that one tool reaches
every kind of database he works with, instead of a different tool for each. The
bar it has to clear is SSMS, so it should feel familiar to someone who lives in
SSMS: an object tree, right-click actions on a table, a query window, a result
grid. A great deal is already built and none of it has been proven, so the work
now is to walk what exists one database at a time, prove each one, and then add
the first new thing — "Select Top 1000 Rows" on the right-click menu of a table,
PostgreSQL first, opening the query and running it the way SSMS does. Oracle is
out of scope for now. And Onobase makes three promises it must never break: it
changes nothing unless the person pressed Run or confirmed it, it never writes a
password as plain text, and it never sends data or queries anywhere online. Each
of those three is a feature that has to be proven, not an intention.
