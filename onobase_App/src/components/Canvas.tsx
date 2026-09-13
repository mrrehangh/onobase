import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow, Background, BackgroundVariant, Controls, MiniMap,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import ModuleLayer from './ModuleLayer'
import { useAppStore } from '../store/useAppStore'
import { useModuleStore } from '../store/useModuleStore'
import type { OnoModule, TableInfo, FKRelation } from '../types'

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  modules: OnoModule[]
  tableData: Map<string, TableInfo>
  fkRelations: FKRelation[]
  selectedId: string | null
  onSelectModule: (id: string | null) => void
}

// ── Inner component (needs useReactFlow, must be inside ReactFlowProvider) ────
function CanvasInner({ modules, tableData, fkRelations, selectedId, onSelectModule }: Props) {
  const rfInstance = useReactFlow()
  const setZoom = useAppStore(s => s.setZoom)
  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0, zoom: 1 })

  // Stable callback ref
  const onSelectRef = useRef(onSelectModule)
  useEffect(() => { onSelectRef.current = onSelectModule }, [onSelectModule])

  // ── Module callbacks (for ModuleLayer) ────────────────────────────────────
  const handleCollapse = useCallback((id: string) => {
    const mod = useModuleStore.getState().modules.find(m => m.id === id)
    if (mod) useModuleStore.getState().updateModule(id, { collapsed: !mod.collapsed })
  }, [])

  const handleModuleDelete = useCallback((id: string) => {
    useModuleStore.getState().removeModule(id)
  }, [])

  const handleModuleMove = useCallback((id: string, x: number, y: number) => {
    useModuleStore.getState().updateModule(id, { position: { x, y } })
  }, [])

  const handleModuleResize = useCallback((id: string, w: number, h: number) => {
    useModuleStore.getState().updateModule(id, { size: { width: w, height: h } })
  }, [])

  const handleDismember = useCallback((tableId: string, moduleId: string) => {
    useModuleStore.getState().removeTableFromModule(tableId, moduleId)
  }, [])

  // ── Canvas click (deselect) ───────────────────────────────────────────────
  const handlePaneClick = useCallback(() => {
    onSelectRef.current(null as unknown as string)
  }, [])

  // ── Drop from ObjectExplorer ──────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const tableId = e.dataTransfer.getData('onobase/tableId')
    if (!tableId) return

    const pos = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY })

    const targetModule = modules.find(mod => {
      if (mod.collapsed) return false
      return pos.x >= mod.x && pos.x <= mod.x + mod.width
        && pos.y >= mod.y && pos.y <= mod.y + mod.height
    })

    if (targetModule) {
      useModuleStore.getState().addTableToModule(tableId, targetModule.id)
    }
    // Drop outside a module is ignored — tables only live in modules
  }, [rfInstance, modules])

  const isEmpty = modules.length === 0

  return (
    <div
      style={{ flex: 1, position: 'relative', width: '100%', height: '100%', minHeight: 0 }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={[]}
        edges={[]}
        onPaneClick={handlePaneClick}
        onMove={(_e, vp) => {
          setCanvasTransform({ x: vp.x, y: vp.y, zoom: vp.zoom })
        }}
        onMoveEnd={(_e, vp) => {
          setCanvasTransform({ x: vp.x, y: vp.y, zoom: vp.zoom })
          setZoom(vp.zoom)
        }}
        fitView={false}
        style={{ background: '#080C12' }}
        elementsSelectable={false}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag={[1, 2]}
        minZoom={0.15}
        maxZoom={2}
        deleteKeyCode={null}
        selectionKeyCode={null}
        disableKeyboardA11y={true}
      >
        <Background variant={BackgroundVariant.Lines} color="rgba(0,229,176,0.025)" gap={32} lineWidth={0.5} />
        <Controls />
        <MiniMap
          style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
          maskColor="rgba(8,12,18,0.7)"
          nodeColor={() => 'rgba(255,255,255,0.1)'}
        />
      </ReactFlow>

      <ModuleLayer
        modules={modules}
        tableData={tableData}
        fkRelations={fkRelations}
        selectedModuleId={selectedId}
        canvasTransform={canvasTransform}
        onSelect={onSelectModule}
        onMove={handleModuleMove}
        onResize={handleModuleResize}
        onCollapse={handleCollapse}
        onDelete={handleModuleDelete}
        onDismember={handleDismember}
      />

      {/* Empty state */}
      {isEmpty && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', gap: 12,
        }}>
          <div style={{ fontSize: 40, opacity: 0.2 }}>⬡</div>
          <div style={{ fontSize: 13, color: '#8B949E', fontWeight: 500 }}>Canvas is empty</div>
          <div style={{ fontSize: 11, color: '#484F58', textAlign: 'center', maxWidth: 260, lineHeight: 1.7 }}>
            Click <strong style={{ color: '#8B949E' }}>+ Module</strong> to create a module window,
            then drag tables from the Object Explorer into it.
          </div>
        </div>
      )}
    </div>
  )
}

export default function Canvas(props: Props) {
  return <CanvasInner {...props} />
}
