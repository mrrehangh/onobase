# Onobase - Project Context Memory

The shared background every agent reads before a job on Onobase. Two parts: the completed Statement of
Intent, and the decisions Rehan approved earlier. Nothing here is a guess; every line is Rehan's answer or
the intent he was interviewed for.

| | |
|---|---|
| Written | 10-01-2026, by Claude Code, on Rehan's instruction |
| Intent source | Erudite intake 32 (Project 3, Onobase), the interview of 10-01-2026 |
| Answers | the five open questions, answered by Rehan on 10-01-2026, written in word for word |
| Earlier decisions | `INTAKE.md`, approved by Rehan 09-20-2026 (Gate 1) |
| Status of the intent | completed, NOT yet approved at Gate 1 |

---

<!-- INTENT START: the Statement of Intent, as it is given to Erudite -->
# Onobase - Statement of Intent

## Purpose
A cross-database management tool (working name: Onobase) that addresses three gaps in existing SSMS-like tools: (1) SSMS only works with SQL Server, (2) competing tools (DBeaver, DataGrip, Azure Data Studio) cannot convert one database format to another and expose different SQL dialects per engine, and (3) their interfaces are hard for inexperienced users. Onobase aims to let users work across many database engines, convert schemas and migrate data between them, and offer an interface approachable to people with no prior database experience.

## Users
The owner (Rehan) is the sole user during concept maturation; once stable, the tool will be sold publicly. Target buyers are professionals, individuals, and DBAs who are shifting databases from expensive cloud offerings to free or low-cost alternatives and need to move their data across engines.

Answered by Rehan 10-01-2026:
Users: the first three buyers are (a) a DBA moving a company database from SQL Server to PostgreSQL; day one: connect both and move one database. (b) A developer; day one: connect, browse tables, run queries. (c) A beginner with no database experience; day one: connect and view data without writing SQL.

## Must-have features
- Free-form SQL querying that is very fast across all CRUD operations.
- Connect to two databases simultaneously and transfer data from one to the other.
- Create database diagrams that show relationships between tables, including module-wise diagrams showing links/relations to other application modules.
- Connect to and convert between "all most used famous databases in the world," including free and paid engines.
- High-capacity data grids that can hold large result sets without crashing.
- A UI/UX designed by inspecting weaknesses of existing tools and resolving them, approachable to users with no database experience.

Answered by Rehan 10-01-2026:
Databases for version 1: SQL Server, PostgreSQL, MySQL, SQLite. Oracle comes later. First conversion: SQL Server to PostgreSQL, then MySQL to PostgreSQL.

## Must-NOT-haves
- Must never have a bad UI/UX.
- Must secure connection strings (must not expose or mishandle them).
- Must never collect usage telemetry.

## Data it holds
The only data the tool itself will store is records of scenarios where the user faces trouble using the software, or where the software was unable to handle the user's issue, kept for the purpose of improving later versions.

Answered by Rehan 10-01-2026:
Trouble records: stored only on the user's machine, never sent automatically; the user can choose to export them. No passwords or query text inside. Kept 90 days. Connection strings are stored only in the Windows secure store.

## Expected scale
Answered by Rehan 10-01-2026:
Scale: desktop tool, so user numbers do not affect it. Migrations tested up to 10 GB (about 50 million rows), moving data in chunks so there is no hard limit.

## Constraints
- No fixed technology stack; free to use open-source code and pre-made tools / integrations rather than reinventing the wheel.
- Must run on Windows, at least initially.

## Budget
Will use only free (but mature and stable) tools and components, so the project can be built cheaply.

Answered by Rehan 10-01-2026:
Budget: $0 a month, free open-source tools only, no paid services for now.

## Open questions
None. The five open questions of the interview were answered by Rehan on 10-01-2026, and each answer is
written in word for word under its topic above: Users, Must-have features, Data it holds, Expected scale
and Budget.
<!-- INTENT END -->

---

# Earlier approved decisions

Approved by Rehan 09-20-2026 at Gate 1 (`INTAKE.md`, section 4 and open question 6). They still hold, and
every job must keep them.

1. **Passwords are never stored as plain text** (MN-2). A password is held in the Windows secure credential
   store, or not saved at all - not a file, not a settings entry, not the query log. The 10-01-2026 answer
   adds: connection strings are stored only in the Windows secure store.
2. **Onobase never changes a database unless the user pressed Run** (MN-1), or confirmed the change.
   Nothing writes, updates, deletes or alters by itself - not on opening a table, not on a refresh, not on
   closing a tab.
3. **Onobase never sends data or queries online** (MN-3). No telemetry, no crash reporting, no cloud sync, no
   calling home. The only network traffic is the connection to the database the user asked for. Trouble
   records leave the machine only when the user chooses to export them (10-01-2026 answer).
4. **Oracle is out of scope for version 1.** The word `'oracle'` stays in `DbType`
   (`onobase_App\src\types\index.ts` line 2) and is not built against. The 10-01-2026 answer confirms it:
   "Oracle comes later."

For anything not covered here - the check command, branches, how agents work in this repository - read
`AGENTS.md`.
