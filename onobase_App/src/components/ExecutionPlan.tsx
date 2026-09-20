import { useMemo } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  type Node, type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface PlanNode {
  'Node Type': string
  // PostgreSQL's EXPLAIN (FORMAT JSON) returns [{ "Plan": { ... } }]. Declared
  // here so the root lookup below is typed, instead of falling through the
  // index signature and arriving as unknown.
  Plan?: PlanNode
  'Startup Cost'?: number
  'Total Cost'?: number
  'Plan Rows'?: number
  'Actual Rows'?: number
  'Actual Total Time'?: number
  Plans?: PlanNode[]
  [key: string]: unknown
}

interface Props {
  plan: object
  textPlan: string
}

// Flatten the tree plan into RF nodes + edges
function flattenPlan(node: PlanNode, parentId: string | null, acc: { nodes: Node[]; edges: Edge[] }, counter: { n: number }, depth = 0, index = 0) {
  const id = `plan-${counter.n++}`
  const isRoot = parentId === null

  const costStr = node['Total Cost'] !== undefined ? `cost=${node['Startup Cost']?.toFixed(2)}..${node['Total Cost']?.toFixed(2)}` : ''
  const rowsStr = node['Plan Rows'] !== undefined ? `rows=${node['Plan Rows']}` : ''
  const timeStr = node['Actual Total Time'] !== undefined ? `${node['Actual Total Time']?.toFixed(1)}ms` : ''

  acc.nodes.push({
    id,
    type: 'default',
    position: { x: depth * 280 + index * 0, y: (counter.n - 1) * 90 },
    data: {
      label: (
        <div style={{ textAlign: 'left', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
          <div style={{ fontWeight: 700, color: isRoot ? '#00E5B0' : '#C9D1D9', marginBottom: 3 }}>
            {node['Node Type']}
          </div>
          {costStr && <div style={{ color: '#8B949E', fontSize: 10 }}>{costStr}</div>}
          {rowsStr && <div style={{ color: '#8B949E', fontSize: 10 }}>{rowsStr}</div>}
          {timeStr && <div style={{ color: '#F97316', fontSize: 10 }}>⏱ {timeStr}</div>}
        </div>
      ),
    },
    style: {
      background: isRoot ? 'rgba(0,229,176,0.08)' : 'rgba(22,27,34,0.95)',
      border: `1px solid ${isRoot ? 'rgba(0,229,176,0.4)' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: 8,
      padding: '8px 12px',
      width: 220,
      color: '#C9D1D9',
    },
  })

  if (parentId) {
    acc.edges.push({
      id: `e-${parentId}-${id}`,
      source: parentId,
      target: id,
      style: { stroke: 'rgba(255,255,255,0.15)' },
    })
  }

  if (node.Plans) {
    node.Plans.forEach((child, i) => flattenPlan(child, id, acc, counter, depth + 1, i))
  }

  return id
}

// Auto-layout: position nodes top-down using BFS / simple tree layout
function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  // Build adjacency: parent → children
  const children = new Map<string, string[]>()
  const parents  = new Map<string, string>()
  for (const e of edges) {
    if (!children.has(e.source)) children.set(e.source, [])
    children.get(e.source)!.push(e.target)
    parents.set(e.target, e.source)
  }
  const roots = nodes.filter(n => !parents.has(n.id)).map(n => n.id)

  const xMap = new Map<string, number>()
  const yMap = new Map<string, number>()
  const NODE_W = 240, NODE_H = 110

  let leafX = 0

  function assignX(id: string): number {
    const ch = children.get(id) ?? []
    if (ch.length === 0) {
      xMap.set(id, leafX * NODE_W)
      leafX++
      return xMap.get(id)!
    }
    const xs = ch.map(c => assignX(c))
    const x = (xs[0] + xs[xs.length - 1]) / 2
    xMap.set(id, x)
    return x
  }

  function assignY(id: string, depth: number) {
    yMap.set(id, depth * NODE_H)
    const ch = children.get(id) ?? []
    ch.forEach(c => assignY(c, depth + 1))
  }

  roots.forEach(r => { assignX(r); assignY(r, 0) })

  return nodes.map(n => ({ ...n, position: { x: xMap.get(n.id) ?? 0, y: yMap.get(n.id) ?? 0 } }))
}

export default function ExecutionPlan({ plan, textPlan }: Props) {
  const { nodes, edges } = useMemo(() => {
    try {
      // plan may be an array (EXPLAIN returns array of plan objects) or single object
      const root = Array.isArray(plan) ? (plan as PlanNode[])[0]?.Plan ?? (plan as PlanNode[])[0] : (plan as { Plan?: PlanNode } & PlanNode).Plan ?? plan as PlanNode
      const acc = { nodes: [] as Node[], edges: [] as Edge[] }
      flattenPlan(root, null, acc, { n: 0 })
      const laid = layoutNodes(acc.nodes, acc.edges)
      return { nodes: laid, edges: acc.edges }
    } catch {
      return { nodes: [], edges: [] }
    }
  }, [plan])

  if (nodes.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16, background: '#0D1117' }}>
        <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#8B949E', whiteSpace: 'pre-wrap', lineHeight: 1.6, flex: 1, overflowY: 'auto' }}>
          {textPlan || 'No plan data'}
        </pre>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#0D1117' }}>
      {/* Graph */}
      <div style={{ flex: 1, width: '100%', height: '100%', minHeight: 0 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable={false}
          colorMode="dark"
        >
          <Background color="rgba(255,255,255,0.04)" gap={24} />
          <Controls style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.1)' }} />
          <MiniMap
            style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.1)' }}
            nodeColor="#00E5B0"
          />
        </ReactFlow>
      </div>

      {/* Text plan sidebar */}
      <div style={{
        width: 260, flexShrink: 0,
        borderLeft: '1px solid rgba(255,255,255,0.07)',
        overflowY: 'auto', padding: 10,
      }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#484F58', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
          Text Plan
        </div>
        <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#8B949E', whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>
          {textPlan}
        </pre>
      </div>
    </div>
  )
}
