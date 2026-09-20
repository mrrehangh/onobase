# Onobase — AGENTS

**Read `D:\Data\Folders\My_AI_Projects\Erudite\RULES.md` first, every session.**
It is the whole rulebook, not repeated here — two copies drift and then nobody
knows which is real. `Erudite\GATES.md` is where work stops.
`Erudite\FAILURES.md` says why each rule exists. Below is ONLY what is specific
to this project.

## PROJECT NAME AND ROOT PATH
<!-- SLOT --> Onobase · `D:\Data\Folders\My_AI_Projects\OnoBase`
The Erudite project root is the WHOLE repository, not `onobase_App`. The git
repository lives at this root; `onobase_App` has no `.git` folder of its own.
Branch: `dev`.

## CHECK COMMAND
<!-- SLOT --> `npm run typecheck` in `onobase_App`
Proven to FAIL on broken code on `09-20-2026` — blank means not yet trusted (F8).
Proven by Rehan, Windows PowerShell 5.1. `src\utils\colors.ts` line 3 was renamed,
the check reported 10 errors in 2 files naming `src\App.tsx` lines 31, 160 and 522
and `src\utils\colors.ts` lines 50 and 55, the break was undone and the check went
green again. Recorded at `evidence\F001.txt`.

The script is defined in `onobase_App\package.json` and runs three TypeScript
checks, then echoes a line so success is never silent:

```
tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.electron.json --noEmit && tsc -p tsconfig.preload.json --noEmit && echo typecheck: 0 errors
```

⚠ **Never point the check at `tsconfig.json`.** That file holds `"files": []`
and two references, so `tsc -p tsconfig.json --noEmit` compiles ZERO files and
exits 0 on any code at all. That is FAILURES.md F8 exactly — five files reported
clean by a command that compiled none of them. The three configs above are named
one by one on purpose: `tsconfig.app.json` covers `src` (the React side),
`tsconfig.electron.json` and `tsconfig.preload.json` cover `electron` (the main
process and the preload bridge, which vite never type-checks).

`$SilentCheckIsExpected` in `.githooks\pre-commit.ps1` is `$false`, and it must
stay `$false`. The trailing echo is what makes silence meaningful: if this check
ever prints nothing, something is wrong with it, and the hook is right to refuse.
Decided by Rehan 09-20-2026.

## HOW TO RUN A DATABASE SCRIPT
<!-- SLOT --> **Onobase has none, and this is not an omission.**
Onobase is a desktop application that connects to OTHER PEOPLE'S databases —
PostgreSQL, MySQL, SQL Server and SQLite. It has no database of its own, no
schema it owns, and no `.sql` file anywhere in the repository.

So there is nothing here for the agent to run and nothing to hand over. Gate 4
is not disabled by this — it still applies to any command that would change a
database. It simply has nothing of Onobase's own to stop.

⚠ **A user's database is not Onobase's database.** The app can be pointed at a
live production server by whoever is using it. Nothing the agent does may run a
schema change through the app against any real database. Gate 4, and
RULES.md 25.

## WHERE MIGRATIONS LIVE
<!-- SLOT --> **None. Onobase has no migrations folder, because it has no
database of its own.** See the section above. If Onobase ever gains one — a
local settings store, say — this slot gets a real path and the next free number
is found by looking in the folder, never by reading a number written here
(a number written down goes stale and the next migration collides with a file).

## THIS PROJECT'S OWN HARD RULES
<!-- SLOT -->
1. **`onobaseCom` IS OUT OF SCOPE.** `D:\Data\Folders\My_AI_Projects\OnoBase\onobaseCom`
   is the marketing website and it holds its OWN `.git` folder, on branch `main`,
   while this repository is on `dev`. There is no `.gitmodules` file, so it is not
   a submodule — it is a second, separate repository that happens to sit inside
   this folder. Do not read it, change it, or commit in it as part of Onobase
   work. The pre-commit hook installed at this root does NOT fire for commits made
   inside it, so anything committed there passes no check at all. Ruled by Rehan
   09-20-2026.
2. **ERUDITE'S RULES GOVERN, NOT `onobase_App\.claude`.** That folder holds
   `settings.json` and `settings.local.json` written for a different tool, and it
   is in `onobase_App\.gitignore`, so it is not even part of the repository. Where
   the two disagree, `Erudite\RULES.md` wins. Do not copy rules out of `.claude`
   into here, and do not edit `.claude` to match — two rulebooks drift and then
   nobody knows which is real. Ruled by Rehan 09-20-2026.
3. **NEVER PUT THE WORDS `DROP`, `DELETE FROM` OR `publish` IN A COMMIT MESSAGE OR
   A SHELL COMMAND.** The safety gate reads the text of every shell command, and
   three of its rules match on those words wherever they appear — rule 20 (DROP
   ANY DATABASE OBJECT), rule 22 (DELETE DATA WITHOUT A MIGRATION) and rules 9 and
   25 (PUBLISH A PACKAGE OR IMAGE). Onobase's own object-tree menu offers `DROP`
   as a scripting option, so this is easy to trip by accident: a commit message
   reading `fix DROP TABLE script` is REFUSED, and nothing is committed. The gate
   is not wrong to refuse it — it cannot tell a message from an instruction. Write
   the message another way: `fix drop-table scripting`. This governs command text
   only; the source code is untouched by it.
4. **`npm run build` IS A GATE 5 DECISION FOR REHAN.** It runs `electron-builder`
   and writes an installer into `onobase_App\release`. The gate does not refuse it,
   because packaging is not deploying — but the agent does not run it on its own
   initiative. Ask. And note that `npm run build -- --publish always` IS refused by
   the gate, correctly: that is publishing, which is Gate 5 and permanent.
   Ruled by Rehan 09-20-2026.
5. **THE SPEC IS OUT OF DATE AND READS AUTHORITATIVE.** `ONOBASE-SPEC.md` (21 March)
   says PostgreSQL only and lists multi-database support as not built. The code
   (23 March) has `pg`, `mysql2`, `mssql` and `better-sqlite3` all imported and
   branched on in `onobase_App\electron\main.ts`. When the two disagree, the code
   is what runs — RULES.md 16-18. Do not quote the spec for current state. This is
   FAILURES.md F1 in miniature: a confident file that answers wrongly.

Everything not in a slot above is governed by `Erudite\RULES.md`. If this project
needs a rule that contradicts Erudite, say so and stop — do not resolve it here.
