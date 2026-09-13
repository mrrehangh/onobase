/**
 * DiagramView.tsx
 * ─────────────────────────────────────────────────────
 * ERD diagram component for Onobase.
 *
 * BUILT WITH:
 * React Flow (@xyflow/react) — MIT Licence
 * © xyflow
 * GitHub: https://github.com/xyflow/xyflow
 * https://reactflow.dev
 *
 * Onobase implementation by Obnet Pty Ltd © 2026
 * ─────────────────────────────────────────────────────
 */

import { useCallback, useMemo } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  type Node, type Edge, type NodeProps,
  Handle, Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { SchemaData } from './ObjectExplorer'

// ── Palette ───────────────────────────────────────────────────────────────────

const PALETTE = [
  '#00E5B0', '#3B82F6', '#A855F7', '#F59E0B',
  '#EF4444', '#10B981', '#EC4899', '#06B6D4',
]

// ── TableSchemaNode ───────────────────────────────────────────────────────────

interface TableNodeData {
  label: string
  schema: string
  columns: { name: string; type: string; isPk: boolean; isNullable: boolean }[]
  accent: string
  [key: string]: unknown
}

function TableSchemaNode({ data }: NodeProps) {
  const d = data as TableNodeData
  return (
    <div style={{
      background: '#161B22',
      border: `1px solid ${d.accent}55`,
      borderRadius: 8,
      minWidth: 200,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      overflow: 'hidden',
      boxShadow: `0 0 0 1px ${d.accent}22, 0 4px 20px rgba(0,0,0,0.5)`,
    }}>
      {/* Header */}
      <div style={{
        background: `${d.accent}22`,
        borderBottom: `1px solid ${d.accent}44`,
        padding: '6px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}>
        <span style={{ color: '#8B949E', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {d.schema}
        </span>
        <span style={{ color: d.accent, fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-body)' }}>
          {d.label}
        </span>
      </div>

      {/* Columns */}
      <div>
        {d.columns.map((col, i) => (
          <div
            key={col.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
              borderBottom: i < d.columns.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            {/* Source handle on left for FK edges */}
            <Handle
              type="source"
              position={Position.Left}
              id={`${col.name}-left`}
              style={{ left: -4, background: d.accent, width: 6, height: 6, border: 'none', opacity: 0 }}
            />
            <span style={{
              fontSize: 9, width: 14, flexShrink: 0,
              color: col.isPk ? '#F59E0B' : 'rgba(255,255,255,0.2)',
              fontWeight: col.isPk ? 700 : 400,
            }}>
              {col.isPk ? 'PK' : col.isNullable === false ? '!' : ''}
            </span>
            <span style={{ color: '#C9D1D9', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {col.name}
            </span>
            <span style={{ color: '#484F58', fontSize: 10, flexShrink: 0 }}>
              {col.type.replace('character varying', 'varchar').replace('timestamp without time zone', 'timestamp')}
            </span>
            {/* Target handle on right for FK edges */}
            <Handle
              type="target"
              position={Position.Right}
              id={`${col.name}-right`}
              style={{ right: -4, background: d.accent, width: 6, height: 6, border: 'none', opacity: 0 }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const NODE_TYPES = { tableSchema: TableSchemaNode }

// ── Layout helper: simple grid ────────────────────────────────────────────────

function gridLayout(count: number): { x: number; y: number }[] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)))
  const W = 260, H = 300, GAP_X = 60, GAP_Y = 80
  return Array.from({ length: count }, (_, i) => ({
    x: (i % cols) * (W + GAP_X),
    y: Math.floor(i / cols) * (H + GAP_Y),
  }))
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  schema: SchemaData | null
  connected: boolean
}

export default function DiagramView({ schema, connected }: Props) {

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!schema || schema.tables.length === 0) return { initialNodes: [], initialEdges: [] }

    const positions = gridLayout(schema.tables.length)

    const nodes: Node[] = schema.tables.map((tbl, i) => {
      const tableKey = `${tbl.table_schema}.${tbl.table_name}`
      const cols = schema.columns
        .filter(c => c.table_schema === tbl.table_schema && c.table_name === tbl.table_name)
        .map(c => ({ name: c.column_name, type: c.data_type, isPk: c.is_pk, isNullable: c.is_nullable === 'YES' }))

      return {
        id: tableKey,
        type: 'tableSchema',
        position: positions[i],
        data: {
          label: tbl.table_name,
          schema: tbl.table_schema,
          columns: cols,
          accent: PALETTE[i % PALETTE.length],
        },
      }
    })

    const edges: Edge[] = schema.fkRelations.map((fk, i) => ({
      id: `fk-${i}`,
      source: `${fk.source_schema}.${fk.source_table}`,
      target: `${fk.target_schema}.${fk.target_table}`,
      sourceHandle: `${fk.source_column}-left`,
      targetHandle: `${fk.target_column}-right`,
      type: 'smoothstep',
      style: { stroke: '#30363D', strokeWidth: 1.5 },
      markerEnd: { type: 'arrowclosed' as const, color: '#30363D' },
      label: `${fk.source_column} → ${fk.target_column}`,
      labelStyle: { fontSize: 9, fill: '#484F58' },
      labelBgStyle: { fill: '#0D1117', fillOpacity: 0.8 },
    }))

    return { initialNodes: nodes, initialEdges: edges }
  }, [schema])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  // Re-initialise when schema changes
  const memoNodes = useMemo(() => initialNodes, [initialNodes])
  const memoEdges = useMemo(() => initialEdges, [initialEdges])

  const onInit = useCallback(() => {}, [])

  // ── Empty states ─────────────────────────────────────────────────────────────

  if (!connected) {
    return (
      <div style={emptyStyle}>
        <svg width={36} height={36} viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.12)" strokeWidth={1.5}>
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M9 21V9"/>
        </svg>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
          Connect to a database to view the ERD
        </span>
      </div>
    )
  }

  if (!schema || schema.tables.length === 0) {
    return (
      <div style={emptyStyle}>
        <svg width={36} height={36} viewBox="0 0 24 24" fill="none"
          stroke="rgba(255,255,255,0.12)" strokeWidth={1.5}>
          <circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/>
        </svg>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
          No tables found in schema
        </span>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#0D1117' }}>
      <ReactFlow
        nodes={memoNodes}
        edges={memoEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        onInit={onInit}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#0D1117' }}
      >
        <Background color="#1C2128" gap={24} size={1} />
        <Controls
          style={{
            background: '#161B22',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8,
          }}
        />
        <MiniMap
          nodeColor={(n) => {
            const d = n.data as TableNodeData
            return d?.accent ?? '#30363D'
          }}
          style={{
            background: '#161B22',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8,
          }}
          maskColor="rgba(13,17,23,0.7)"
        />
      </ReactFlow>
    </div>
  )
}

const emptyStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  height: '100%', gap: 10,
  background: '#0D1117',
}
