<#
  Erudite - init.template.ps1

  Session opener for Phase 4. Copy to <project>\init.ps1 and set $ProjectRoot.

  READ ONLY. It checks a path, reads git, and reads feature_list.json. It writes
  nothing, creates nothing, deletes nothing, runs no migration and deploys
  nothing. If you are adding a write to this file you are building a different
  script - RULES.md 25-30, FAILURES.md F11.

  WHAT IT ANSWERS, IN ORDER
      1. Does the project root exist where I think it does?
      2. What is committed, and what is sitting uncommitted right now?
         Is the pre-commit hook installed? (warns only - DOCKING.md step 5c)
      3. What is the ONE feature I am working on?

  Question 3 is the point. It prints ONE feature - the first with passes false -
  because RULES.md 1 says one unfinished feature at a time, and a list of nine
  open features is how a second one gets started.

  EXIT CODES
      0   ran cleanly.
      2   could not run: root missing, or feature_list.json missing or unreadable.
#>

# ============================================================
# EDIT THIS WHEN DOCKING.
# ============================================================
$ProjectRoot = 'D:\Data\Folders\My_AI_Projects\OnoBase'
$FeatureList = 'feature_list.json'

# ------------------------------------------------------------

$ErrorActionPreference = 'Stop'
$name = Split-Path $ProjectRoot -Leaf

Write-Host ''
Write-Host '============================================================'
Write-Host " $name - session start"
Write-Host '============================================================'

# ── 1. The root ─────────────────────────────────────────────
if (-not (Test-Path -LiteralPath $ProjectRoot -PathType Container)) {
    Write-Host ''
    Write-Host '[1] PROJECT ROOT: NOT FOUND' -ForegroundColor Red
    Write-Host "    $ProjectRoot"
    Write-Host ''
    Write-Host '    Nothing else was read. Fix $ProjectRoot at the top of this file.'
    exit 2
}
Write-Host ''
Write-Host '[1] PROJECT ROOT: found'
Write-Host "    $ProjectRoot"

# ── 2. git ──────────────────────────────────────────────────
Write-Host ''
Write-Host '[2] GIT'

Push-Location -LiteralPath $ProjectRoot
try {
    # 'Continue' for this call only: on Windows PowerShell 5.1 git's error text must never stop the script.
    $branch = & { $ErrorActionPreference = 'Continue'; & git rev-parse --abbrev-ref HEAD 2>$null }
    if ($LASTEXITCODE -ne 0) {
        Write-Host '    Not a git repository, or git is not on PATH.'
    }
    else {
        Write-Host "    branch: $branch"
        Write-Host ''
        Write-Host '    last 5 commits:'
        & git log --oneline -5 2>$null | ForEach-Object { Write-Host "      $_" }

        Write-Host ''
        $status = & git status --short 2>&1
        if ([string]::IsNullOrWhiteSpace(($status | Out-String))) {
            Write-Host '    working tree clean'
        }
        else {
            Write-Host '    uncommitted:'
            $status | ForEach-Object { Write-Host "      $_" }
        }

        # Untracked files exist in nobody else's clone and are invisible in the
        # log. Called out separately because starting work on top of one means
        # you cannot tell your change from the previous session's.
        $untracked = @(& git ls-files --others --exclude-standard 2>$null)
        if ($untracked.Count -gt 0) {
            Write-Host ''
            Write-Host "    $($untracked.Count) UNTRACKED file(s) - in nobody else's clone:"
            $untracked | ForEach-Object { Write-Host "      $_" }
        }
    }
}
finally {
    Pop-Location
}

# ── 2b. The pre-commit hook (READ ONLY - warns, never stops, changes nothing) ──
# A docked project with no hook commits without its check ever running.
try {
    $hooksPath = "$(& { $ErrorActionPreference = 'Continue'; & git -C $ProjectRoot config --get core.hooksPath 2>$null })".Trim()
    $hookProblems = @()
    if ($hooksPath -eq '') {
        $hookProblems += "git setting core.hooksPath is not set (it should be '.githooks')"
    }
    elseif ($hooksPath -ne '.githooks') {
        $hookProblems += "git setting core.hooksPath is '$hooksPath' (it should be '.githooks')"
    }
    foreach ($hookFile in @('pre-commit', 'pre-commit.ps1')) {
        $hookFilePath = Join-Path (Join-Path $ProjectRoot '.githooks') $hookFile
        if (-not (Test-Path -LiteralPath $hookFilePath -PathType Leaf)) {
            $hookProblems += "file missing: $hookFilePath"
        }
    }
    Write-Host ''
    if ($hookProblems.Count -gt 0) {
        Write-Host '    WARNING: the pre-commit hook is NOT installed. Git will commit without running the check.' -ForegroundColor Yellow
        $hookProblems | ForEach-Object { Write-Host "      - $_" -ForegroundColor Yellow }
        Write-Host '    Install it by following Erudite\DOCKING.md step 5c. Nothing was changed.' -ForegroundColor Yellow
    }
    else {
        Write-Host '    pre-commit hook: installed (core.hooksPath = .githooks, shim and hook present)'
    }
}
catch {
    Write-Host ''
    Write-Host "    WARNING: could not check the pre-commit hook: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host '    See Erudite\DOCKING.md step 5c. Nothing was changed.' -ForegroundColor Yellow
}

# ── 3. The one open feature ─────────────────────────────────
Write-Host ''
Write-Host '[3] CURRENT FEATURE'

$listPath = Join-Path $ProjectRoot $FeatureList
if (-not (Test-Path -LiteralPath $listPath -PathType Leaf)) {
    Write-Host "    $FeatureList NOT FOUND at $listPath" -ForegroundColor Red
    Write-Host '    Phase 3 has not run, or the file was never copied in.'
    exit 2
}

try {
    $list = Get-Content -LiteralPath $listPath -Raw -Encoding UTF8 | ConvertFrom-Json
}
catch {
    Write-Host "    $FeatureList could not be parsed:" -ForegroundColor Red
    Write-Host "    $($_.Exception.Message)"
    exit 2
}

$all  = @($list.features)
$open = @($all | Where-Object { -not $_.passes })
$done = @($all | Where-Object { $_.passes })

if ($all.Count -eq 0) {
    Write-Host '    The list is EMPTY. Phase 3 has not produced anything.' -ForegroundColor Red
    exit 2
}

if ($open.Count -eq 0) {
    Write-Host ''
    Write-Host "    NO OPEN FEATURES. All $($all.Count) pass."
    Write-Host '    Before believing that: every passing feature needs a command'
    Write-Host '    and its real output in evidence. A tick without evidence is F9.'

    $noEvidence = @($done | Where-Object { [string]::IsNullOrWhiteSpace($_.evidence.output) })
    if ($noEvidence.Count -gt 0) {
        Write-Host ''
        Write-Host "    *** $($noEvidence.Count) feature(s) pass with EMPTY evidence: ***" -ForegroundColor Red
        $noEvidence | ForEach-Object { Write-Host "      $($_.id)  $($_.description)" }
        Write-Host '    Those are not proven. Treat them as UNVERIFIED.'
    }
    Write-Host ''
    Write-Host '============================================================'
    exit 0
}

$cur = $open[0]

Write-Host ''
Write-Host "    $($cur.id)  [$($cur.category)]  $($cur.description)"
Write-Host ''
Write-Host '    Steps:'
$i = 1
foreach ($s in @($cur.steps)) { Write-Host "      $i. $s"; $i++ }

Write-Host ''
Write-Host "    $($done.Count) of $($all.Count) features pass. $($open.Count) open."
if ($open.Count -gt 1) {
    $rest = ($open[1..($open.Count - 1)] | ForEach-Object { $_.id }) -join ', '
    Write-Host "    Queued behind it: $rest"
    Write-Host '    DO NOT START THOSE. One unfinished feature at a time (RULES.md 1).'
}

Write-Host ''
Write-Host '    Status line for this session:'
Write-Host "      Working On: $name / Current Part: $($cur.id) / Complete: $($done.Count) of $($all.Count)"
Write-Host ''
Write-Host '    Next: read PROGRESS.md, then run the check command BEFORE editing'
Write-Host '    anything (Phase 4 step 4 - the one that gets skipped).'
Write-Host ''
Write-Host '============================================================'
exit 0
