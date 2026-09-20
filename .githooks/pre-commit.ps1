<#
  Erudite - pre-commit.ps1

  Runs the docked project's OWN check command and refuses the commit if it fails.

  SILENT ON SUCCESS. Exit 0, no output.
  ON FAILURE it prints the errors - the real output, nothing else - and exits 1.

  Traces to FAILURES.md F8: five files were reported clean on "exit 0" from a
  command that compiled nothing. Two rules follow from that and both are enforced
  here:

    1. THE CHECK COMMAND IS DECLARED, NOT GUESSED. It sits in $CheckCommand
       below, one line, edited when the project is docked. A hook that picks a
       command by convention will one day pick the wrong one and pass.

    2. AN EXIT CODE ALONE IS NOT PROOF. A command that emits nothing at all is
       treated as suspicious, not as clean - see the empty-output guard.

  INSTALL (DOCKING.md step 5c)
      Copy to <project>\.githooks\ together with the shim Erudite\hooks\pre-commit,
      then run: git config core.hooksPath .githooks

  EXIT CODES
      0   the check passed. Silent.
      1   the check failed. Its output is printed.
      2   this hook is misconfigured. Not a check failure - a setup failure.
#>

# ============================================================
# EDIT THIS ONE LINE WHEN DOCKING A PROJECT.
# It must be the command that genuinely checks THIS project.
# Verify it fails on broken code before trusting it (F8).
# ============================================================
$CheckCommand = 'npm run typecheck'

# Working directory the check runs in, relative to the repository root.
# '.' for the root. 'frontend' if the check lives in a sub-package.
$CheckWorkingDir = 'onobase_App'

# Set to $true only if this project's check legitimately prints nothing at all
# on success. Leave $false and the hook will warn rather than trust silence.
$SilentCheckIsExpected = $false

# ------------------------------------------------------------

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($CheckCommand)) {
    [Console]::Error.WriteLine('')
    [Console]::Error.WriteLine('pre-commit: $CheckCommand is empty.')
    [Console]::Error.WriteLine('An unconfigured hook that exits 0 is FAILURES.md F8 all over again.')
    [Console]::Error.WriteLine('Set it at the top of Erudite\hooks\pre-commit.ps1.')
    exit 2
}
# 'Continue' here only: on Windows PowerShell 5.1 git's error text must never stop the script (09-17-2026).
$repoRoot = & { $ErrorActionPreference = 'Continue'; & git rev-parse --show-toplevel 2>$null }
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repoRoot)) {
    [Console]::Error.WriteLine('pre-commit: not inside a git repository.')
    exit 2
}

$runDir = Join-Path $repoRoot $CheckWorkingDir
if (-not (Test-Path -LiteralPath $runDir)) {
    [Console]::Error.WriteLine("pre-commit: `$CheckWorkingDir '$CheckWorkingDir' does not exist under $repoRoot.")
    exit 2
}

Push-Location -LiteralPath $runDir
try {
    # Capture both streams. The failing line is often on stderr, and a hook that
    # drops stderr shows a red exit code with no reason.
    $output = & cmd /c "$CheckCommand 2>&1"
    $code   = $LASTEXITCODE
}
finally {
    Pop-Location
}

$text = ($output | Out-String).TrimEnd()
$real = @($output | ForEach-Object { "$_" } | Where-Object { $_.Trim() -ne '' -and -not $_.StartsWith('> ') })  # npm's '> ' header lines and blank lines are not output
if ($code -eq 0) {
    if (-not $SilentCheckIsExpected -and $real.Count -eq 0) {
        [Console]::Error.WriteLine('')
        [Console]::Error.WriteLine('pre-commit: the check exited 0 and printed NOTHING.')
        [Console]::Error.WriteLine("  Command: $CheckCommand")
        [Console]::Error.WriteLine("  In:      $runDir")
        [Console]::Error.WriteLine('')
        [Console]::Error.WriteLine('That is what a check inspecting zero files looks like (FAILURES.md F8).')
        [Console]::Error.WriteLine('Confirm it really examines this project, then either fix $CheckCommand')
        [Console]::Error.WriteLine('or set $SilentCheckIsExpected = $true.')
        exit 2
    }
    exit 0
}

[Console]::Error.WriteLine('')
[Console]::Error.WriteLine("pre-commit: FAILED (exit $code) - $CheckCommand")
[Console]::Error.WriteLine('')
[Console]::Error.WriteLine($text)
[Console]::Error.WriteLine('')
[Console]::Error.WriteLine('Commit refused. Fix the errors above, or explain why the commit should stand.')
exit 1
