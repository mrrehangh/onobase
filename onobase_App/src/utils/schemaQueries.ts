/**
 * schemaQueries.ts
 * Per-database schema introspection SQL queries.
 * Onobase — Obnet Pty Ltd © 2026
 */

export type DbType = 'postgresql' | 'mysql' | 'mssql' | 'sqlite'

export const SCHEMA_QUERIES = {
  postgresql: {
    tables: `
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema','pg_catalog')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name`,

    columns: `
      SELECT
        c.table_schema,
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        EXISTS (
          SELECT 1
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_name = c.table_name
            AND tc.table_schema = c.table_schema
            AND kcu.column_name = c.column_name
        ) AS is_pk
      FROM information_schema.columns c
      WHERE c.table_schema NOT IN ('information_schema','pg_catalog')
      ORDER BY c.table_schema, c.table_name, c.ordinal_position`,

    fkRelations: `
      SELECT
        kcu.table_schema  AS source_schema,
        kcu.table_name    AS source_table,
        kcu.column_name   AS source_column,
        ccu.table_schema  AS target_schema,
        ccu.table_name    AS target_table,
        ccu.column_name   AS target_column
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.referential_constraints rc
        ON kcu.constraint_name = rc.constraint_name
       AND kcu.table_schema = rc.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_name = ccu.constraint_name
       AND rc.unique_constraint_schema = ccu.constraint_schema
      WHERE kcu.table_schema NOT IN ('information_schema','pg_catalog')`,
  },

  mysql: {
    tables: `
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_schema NOT IN ('information_schema','mysql','performance_schema','sys')
      ORDER BY table_schema, table_name`,

    columns: `
      SELECT
        table_schema,
        table_name,
        column_name,
        data_type,
        is_nullable,
        IF(column_key='PRI', 1, 0) AS is_pk
      FROM information_schema.columns
      WHERE table_schema NOT IN ('information_schema','mysql','performance_schema','sys')
      ORDER BY table_schema, table_name, ordinal_position`,

    fkRelations: `
      SELECT
        table_schema          AS source_schema,
        table_name            AS source_table,
        column_name           AS source_column,
        referenced_table_schema AS target_schema,
        referenced_table_name   AS target_table,
        referenced_column_name  AS target_column
      FROM information_schema.key_column_usage
      WHERE referenced_table_name IS NOT NULL`,
  },

  mssql: {
    tables: `
      SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS table_name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME`,

    columns: `
      SELECT
        c.TABLE_SCHEMA  AS table_schema,
        c.TABLE_NAME    AS table_name,
        c.COLUMN_NAME   AS column_name,
        c.DATA_TYPE     AS data_type,
        c.IS_NULLABLE   AS is_nullable,
        CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS is_pk
      FROM INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN (
        SELECT ku.TABLE_NAME, ku.COLUMN_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
          ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
        WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      ) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
      ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION`,

    fkRelations: `
      SELECT
        fk.TABLE_SCHEMA AS source_schema,
        fk.TABLE_NAME   AS source_table,
        cu.COLUMN_NAME  AS source_column,
        pk.TABLE_SCHEMA AS target_schema,
        pk.TABLE_NAME   AS target_table,
        pt.COLUMN_NAME  AS target_column
      FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
      JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS fk
        ON rc.CONSTRAINT_NAME = fk.CONSTRAINT_NAME
      JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk
        ON rc.UNIQUE_CONSTRAINT_NAME = pk.CONSTRAINT_NAME
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE cu
        ON fk.CONSTRAINT_NAME = cu.CONSTRAINT_NAME
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pt
        ON pk.CONSTRAINT_NAME = pt.CONSTRAINT_NAME`,
  },
}
