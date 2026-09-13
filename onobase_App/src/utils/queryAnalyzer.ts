/**
 * queryAnalyzer.ts
 * Pre-execution SQL query safety analyser for Onobase.
 * Catches dangerous patterns before they run.
 * Onobase — Obnet Pty Ltd © 2026
 */

export type WarningSeverity = 'danger' | 'warning' | 'info'

export interface QueryWarning {
  id: string
  severity: WarningSeverity
  title: string
  message: string
  fix?: string          // suggested fix text
  canProceed: boolean   // false = must confirm
  autoFixSql?: string   // if we can auto-fix it
}

export interface AnalysisResult {
  warnings: QueryWarning[]
  isDestructive: boolean   // DELETE/DROP/TRUNCATE
  isDangerous: boolean     // no WHERE on destructive
  requiresConfirm: boolean // must click confirm
  safeToRun: boolean       // no issues found
}

// ── Helpers ────────────────────────────────────────────

function stripComments(sql: string): string {
  // Remove -- line comments
  let s = sql.replace(/--[^\n]*/g, '')
  // Remove /* block comments */
  s = s.replace(/\/\*[\s\S]*?\*\//g, '')
  return s.trim()
}

function normalise(sql: string): string {
  return stripComments(sql)
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function getFirstKeyword(sql: string): string {
  return normalise(sql).split(' ')[0] ?? ''
}

function hasWhereClause(sql: string): boolean {
  return /\bWHERE\b/i.test(stripComments(sql))
}

function hasLimit(sql: string): boolean {
  return /\bLIMIT\b|\bTOP\b|\bFETCH\b/i
    .test(stripComments(sql))
}

function hasSelectStar(sql: string): boolean {
  return /SELECT\s+\*/i.test(stripComments(sql))
}

function extractTableName(sql: string): string {
  // Try to extract table name from FROM or INTO clause
  const fromMatch = sql.match(
    /(?:FROM|INTO|UPDATE|TABLE)\s+"?(\w+)"?\."?(\w+)"?/i
  )
  if (fromMatch) {
    return fromMatch[2]
      ? `${fromMatch[1]}.${fromMatch[2]}`
      : fromMatch[1]
  }
  return 'this table'
}

// ── Main analyser ──────────────────────────────────────

export function analyseQuery(
  sql: string,
  rowLimit: number = 5000
): AnalysisResult {
  const warnings: QueryWarning[] = []
  const clean = stripComments(sql).trim()
  const upper = clean.toUpperCase()
  const first = getFirstKeyword(clean)

  // ── DANGER: DELETE without WHERE ────────────────────
  if (
    first === 'DELETE'
    && !hasWhereClause(clean)
  ) {
    warnings.push({
      id: 'delete-no-where',
      severity: 'danger',
      title: 'DELETE without WHERE',
      message:
        'This will delete ALL rows from '
        + extractTableName(clean)
        + '. This cannot be undone.',
      fix: 'Add a WHERE clause to target specific rows.',
      canProceed: false,
    })
  }

  // ── DANGER: UPDATE without WHERE ────────────────────
  if (
    first === 'UPDATE'
    && !hasWhereClause(clean)
  ) {
    warnings.push({
      id: 'update-no-where',
      severity: 'danger',
      title: 'UPDATE without WHERE',
      message:
        'This will update ALL rows in '
        + extractTableName(clean)
        + '. Every row will be changed.',
      fix: 'Add a WHERE clause to target specific rows.',
      canProceed: false,
    })
  }

  // ── DANGER: DROP TABLE ───────────────────────────────
  if (upper.includes('DROP TABLE')) {
    const tbl = extractTableName(clean)
    warnings.push({
      id: 'drop-table',
      severity: 'danger',
      title: 'DROP TABLE — Irreversible',
      message:
        `This will permanently delete the table `
        + `${tbl} and ALL its data. `
        + `This cannot be undone.`,
      fix: 'Consider RENAME instead, or back up data first.',
      canProceed: false,
    })
  }

  // ── DANGER: DROP DATABASE ────────────────────────────
  if (upper.includes('DROP DATABASE')
    || upper.includes('DROP SCHEMA')) {
    warnings.push({
      id: 'drop-database',
      severity: 'danger',
      title: 'DROP DATABASE — Catastrophic',
      message:
        'This will permanently delete the entire '
        + 'database and ALL tables and data inside it.',
      fix: 'Are you absolutely sure? Back up first.',
      canProceed: false,
    })
  }

  // ── DANGER: TRUNCATE ────────────────────────────────
  if (first === 'TRUNCATE') {
    warnings.push({
      id: 'truncate',
      severity: 'danger',
      title: 'TRUNCATE — Removes All Rows',
      message:
        'TRUNCATE will remove ALL rows from '
        + extractTableName(clean)
        + '. Unlike DELETE it cannot be rolled back '
        + 'in some databases.',
      fix: 'Use DELETE with WHERE if you want selective removal.',
      canProceed: false,
    })
  }

  // ── WARNING: ALTER TABLE ─────────────────────────────
  if (upper.includes('ALTER TABLE')) {
    warnings.push({
      id: 'alter-table',
      severity: 'warning',
      title: 'ALTER TABLE — Structural Change',
      message:
        'This modifies the structure of a table. '
        + 'On large tables this can lock the table '
        + 'and block reads/writes.',
      fix: 'Run during low-traffic periods on production.',
      canProceed: true,
    })
  }

  // ── WARNING: SELECT without LIMIT ───────────────────
  if (
    first === 'SELECT'
    && !hasLimit(clean)
    && !upper.includes('COUNT(')
    && !upper.includes('SUM(')
    && !upper.includes('AVG(')
    && !upper.includes('MAX(')
    && !upper.includes('MIN(')
  ) {
    warnings.push({
      id: 'no-limit',
      severity: 'warning',
      title: `No LIMIT clause`,
      message:
        `Query has no LIMIT. Onobase will cap results `
        + `at ${rowLimit.toLocaleString()} rows. `
        + `If the table is large this may be slow.`,
      fix: `Add LIMIT ${rowLimit} to control result size.`,
      canProceed: true,
      autoFixSql: clean.replace(
        /;?\s*$/,
        `\nLIMIT ${rowLimit};`
      ),
    })
  }

  // ── WARNING: SELECT * ────────────────────────────────
  if (first === 'SELECT' && hasSelectStar(clean)) {
    warnings.push({
      id: 'select-star',
      severity: 'info',
      title: 'SELECT * — All Columns',
      message:
        'Selecting all columns can be slow on wide '
        + 'tables and transfers unnecessary data.',
      fix: 'Specify only the columns you need.',
      canProceed: true,
    })
  }

  // ── WARNING: LIKE with leading wildcard ─────────────
  if (/LIKE\s+'%/i.test(clean)) {
    warnings.push({
      id: 'like-leading-wildcard',
      severity: 'warning',
      title: "LIKE '%...' — Full Table Scan",
      message:
        "A leading wildcard in LIKE prevents index "
        + "usage and forces a full table scan. "
        + "This will be slow on large tables.",
      fix: "Use full-text search or a trailing wildcard 'value%' instead.",
      canProceed: true,
    })
  }

  // ── INFO: Multiple statements ────────────────────────
  const stmtCount = clean
    .split(';')
    .filter(s => s.trim().length > 0)
    .length
  if (stmtCount > 1) {
    warnings.push({
      id: 'multiple-statements',
      severity: 'info',
      title: `${stmtCount} Statements Detected`,
      message:
        `This query contains ${stmtCount} statements `
        + `separated by semicolons. They will all run.`,
      fix: 'Select just the statement you want to run, then use Ctrl+Enter.',
      canProceed: true,
    })
  }

  // ── Compute summary flags ────────────────────────────
  const isDestructive = [
    'DELETE', 'UPDATE', 'DROP', 'TRUNCATE',
    'ALTER', 'INSERT',
  ].includes(first)
    || upper.includes('DROP TABLE')
    || upper.includes('DROP DATABASE')

  const isDangerous = warnings.some(
    w => w.severity === 'danger'
  )

  const requiresConfirm = warnings.some(
    w => !w.canProceed
  )

  const safeToRun =
    warnings.filter(w =>
      w.severity === 'danger'
      || w.severity === 'warning'
    ).length === 0

  return {
    warnings,
    isDestructive,
    isDangerous,
    requiresConfirm,
    safeToRun,
  }
}
