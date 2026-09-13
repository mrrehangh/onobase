export interface SqlSnippet {
  id: string
  category: string
  title: string
  description: string
  sql: string
}

export const SQL_SNIPPETS: SqlSnippet[] = [
  // ── SELECT ──────────────────────────────────────────────────────────────────
  {
    id: 'select-all',
    category: 'SELECT',
    title: 'SELECT *',
    description: 'Select all columns from a table',
    sql: 'SELECT *\nFROM ${1:table_name}\nLIMIT 100;',
  },
  {
    id: 'select-cols',
    category: 'SELECT',
    title: 'SELECT columns',
    description: 'Select specific columns',
    sql: 'SELECT\n  ${1:col1},\n  ${2:col2}\nFROM ${3:table_name}\nWHERE ${4:condition}\nORDER BY ${5:col1} ASC\nLIMIT 100;',
  },
  {
    id: 'select-count',
    category: 'SELECT',
    title: 'COUNT rows',
    description: 'Count rows in a table',
    sql: 'SELECT COUNT(*) AS row_count\nFROM ${1:table_name};',
  },
  {
    id: 'select-distinct',
    category: 'SELECT',
    title: 'SELECT DISTINCT',
    description: 'Select unique values',
    sql: 'SELECT DISTINCT ${1:column}\nFROM ${2:table_name}\nORDER BY ${1:column};',
  },
  {
    id: 'select-group',
    category: 'SELECT',
    title: 'GROUP BY',
    description: 'Aggregate with GROUP BY',
    sql: 'SELECT\n  ${1:group_col},\n  COUNT(*) AS cnt,\n  SUM(${2:value_col}) AS total\nFROM ${3:table_name}\nGROUP BY ${1:group_col}\nHAVING COUNT(*) > ${4:1}\nORDER BY cnt DESC;',
  },

  // ── JOIN ────────────────────────────────────────────────────────────────────
  {
    id: 'join-inner',
    category: 'JOIN',
    title: 'INNER JOIN',
    description: 'Join two tables on a key',
    sql: 'SELECT\n  a.${1:id},\n  a.${2:col},\n  b.${3:col}\nFROM ${4:table_a} a\nINNER JOIN ${5:table_b} b ON a.${6:id} = b.${7:a_id}\nWHERE ${8:1=1}\nLIMIT 100;',
  },
  {
    id: 'join-left',
    category: 'JOIN',
    title: 'LEFT JOIN',
    description: 'Left outer join',
    sql: 'SELECT\n  a.*,\n  b.${1:col}\nFROM ${2:table_a} a\nLEFT JOIN ${3:table_b} b ON a.${4:id} = b.${5:a_id};',
  },

  // ── INSERT / UPDATE / DELETE ────────────────────────────────────────────────
  {
    id: 'insert-row',
    category: 'DML',
    title: 'INSERT row',
    description: 'Insert a single row',
    sql: 'INSERT INTO ${1:table_name} (${2:col1}, ${3:col2})\nVALUES (${4:val1}, ${5:val2});',
  },
  {
    id: 'update-row',
    category: 'DML',
    title: 'UPDATE rows',
    description: 'Update rows matching a condition',
    sql: 'UPDATE ${1:table_name}\nSET\n  ${2:col1} = ${3:val1},\n  ${4:col2} = ${5:val2}\nWHERE ${6:id} = ${7:value};',
  },
  {
    id: 'delete-row',
    category: 'DML',
    title: 'DELETE rows',
    description: 'Delete rows matching a condition',
    sql: 'DELETE FROM ${1:table_name}\nWHERE ${2:id} = ${3:value};',
  },
  {
    id: 'upsert',
    category: 'DML',
    title: 'UPSERT (ON CONFLICT)',
    description: 'Insert or update on conflict (PostgreSQL)',
    sql: 'INSERT INTO ${1:table_name} (${2:id}, ${3:col})\nVALUES (${4:val_id}, ${5:val})\nON CONFLICT (${2:id}) DO UPDATE\n  SET ${3:col} = EXCLUDED.${3:col};',
  },

  // ── DDL ─────────────────────────────────────────────────────────────────────
  {
    id: 'create-table',
    category: 'DDL',
    title: 'CREATE TABLE',
    description: 'Create a new table',
    sql: 'CREATE TABLE IF NOT EXISTS ${1:table_name} (\n  id          BIGSERIAL PRIMARY KEY,\n  ${2:name}    TEXT        NOT NULL,\n  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);',
  },
  {
    id: 'create-index',
    category: 'DDL',
    title: 'CREATE INDEX',
    description: 'Create an index on a column',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_${1:table}_${2:col}\n  ON ${1:table} (${2:col});',
  },
  {
    id: 'alter-add-col',
    category: 'DDL',
    title: 'ALTER TABLE — add column',
    description: 'Add a column to an existing table',
    sql: 'ALTER TABLE ${1:table_name}\n  ADD COLUMN IF NOT EXISTS ${2:col_name} ${3:TEXT};',
  },

  // ── CTE / Window ─────────────────────────────────────────────────────────────
  {
    id: 'cte',
    category: 'Advanced',
    title: 'CTE (WITH)',
    description: 'Common Table Expression',
    sql: 'WITH ${1:cte_name} AS (\n  SELECT\n    ${2:id},\n    ${3:col}\n  FROM ${4:table_name}\n  WHERE ${5:condition}\n)\nSELECT *\nFROM ${1:cte_name};',
  },
  {
    id: 'window-rank',
    category: 'Advanced',
    title: 'Window — RANK',
    description: 'Rank rows within partitions',
    sql: 'SELECT\n  ${1:id},\n  ${2:col},\n  RANK() OVER (PARTITION BY ${3:group_col} ORDER BY ${4:order_col} DESC) AS rnk\nFROM ${5:table_name}\nORDER BY ${3:group_col}, rnk;',
  },
  {
    id: 'window-lag',
    category: 'Advanced',
    title: 'Window — LAG',
    description: 'Access previous row value',
    sql: 'SELECT\n  ${1:date_col},\n  ${2:value_col},\n  LAG(${2:value_col}) OVER (ORDER BY ${1:date_col}) AS prev_value,\n  ${2:value_col} - LAG(${2:value_col}) OVER (ORDER BY ${1:date_col}) AS delta\nFROM ${3:table_name}\nORDER BY ${1:date_col};',
  },

  // ── Introspection ────────────────────────────────────────────────────────────
  {
    id: 'show-tables',
    category: 'Introspection',
    title: 'List tables',
    description: 'List all user tables in current schema',
    sql: "SELECT table_schema, table_name\nFROM information_schema.tables\nWHERE table_type = 'BASE TABLE'\n  AND table_schema NOT IN ('pg_catalog','information_schema')\nORDER BY table_schema, table_name;",
  },
  {
    id: 'show-columns',
    category: 'Introspection',
    title: 'List columns',
    description: 'List columns for a specific table',
    sql: "SELECT column_name, data_type, is_nullable, column_default\nFROM information_schema.columns\nWHERE table_name = '${1:table_name}'\n  AND table_schema = '${2:public}'\nORDER BY ordinal_position;",
  },
  {
    id: 'show-indexes',
    category: 'Introspection',
    title: 'List indexes',
    description: 'Show all indexes on a table (PostgreSQL)',
    sql: 'SELECT indexname, indexdef\nFROM pg_indexes\nWHERE tablename = \'${1:table_name}\'\nORDER BY indexname;',
  },
  {
    id: 'table-size',
    category: 'Introspection',
    title: 'Table sizes',
    description: 'Show disk size of each table',
    sql: "SELECT\n  schemaname,\n  tablename,\n  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,\n  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size\nFROM pg_tables\nWHERE schemaname NOT IN ('pg_catalog','information_schema')\nORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;",
  },
]

export const SNIPPET_CATEGORIES = [...new Set(SQL_SNIPPETS.map(s => s.category))]
