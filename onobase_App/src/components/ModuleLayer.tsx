/**
 * ModuleLayer.tsx
 * Canvas overlay rendering module windows and FK relationship lines.
 * Onobase — Obnet Pty Ltd © 2026
 */

import { memo } from 'react'
import ModuleWindow from './ModuleWindow'
import { getModuleColor } from '../utils/colors'
import type { OnoModule, TableInfo, FKRelation } from '../types'

interface Props {
  modules: OnoModule[]
  tableData: Map<string, TableInfo>
  selectedModuleId: string | null
  canvasTransform: { x: number; y: number; zoom: number }
  fkRelations: FKRelation[]
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  onResize: (id: string, w: number, h: number) => void
  onCollapse: (id: string) => void
  onDelete: (id: string) => void
  onDismember: (tableId: string, moduleId: string) => void
}

interface FKLine {
  x1: number; y1: number
  x2: number; y2: number
  color: string
}

export default memo(function ModuleLayer({
  modules, tableData, selectedModuleId,
  canvasTransform, fkRelations,
  onSelect, onMove, onResize, onCollapse,
  onDelete, onDismember,
}: Props) {
  const { x: cx, y: cy, zoom } = canvasTransform

  // Build screen-space bezier endpoints for each FK relation
  const fkLines: FKLine[] = []
  for (const fk of fkRelations) {
    const srcKey = `${fk.source_schema}.${fk.source_table}`
    const tgtKey = `${fk.target_schema}.${fk.target_table}`
    const srcMod = modules.find(m => m.tableIds.includes(srcKey))
    const tgtMod = modules.find(m => m.tableIds.includes(tgtKey))
    if (!srcMod || !tgtMod || srcMod.id === tgtMod.id) continue

    // Source: right edge centre; Target: left edge centre
    const x1 = cx + srcMod.x * zoom + srcMod.width * zoom
    const y1 = cy + srcMod.y * zoom + (srcMod.height * zoom) / 2
    const x2 = cx + tgtMod.x * zoom
    const y2 = cy + tgtMod.y * zoom + (tgtMod.height * zoom) / 2
    const color = getModuleColor(srcMod.cid, srcMod.customHex).hex
    fkLines.push({ x1, y1, x2, y2, color })
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 5,
      overflow: 'hidden',
    }}>

      {/* ── FK relationship lines (SVG, behind module windows) ── */}
      {fkLines.length > 0 && (
        <svg
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: 3,
            overflow: 'visible',
          }}
        >
          {fkLines.map((line, i) => {
            const offset = Math.max(60, Math.abs(line.x2 - line.x1) / 2)
            return (
              <path
                key={i}
                d={`M ${line.x1} ${line.y1} C ${line.x1 + offset} ${line.y1}, ${line.x2 - offset} ${line.y2}, ${line.x2} ${line.y2}`}
                fill="none"
                stroke={line.color}
                strokeOpacity={0.4}
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
            )
          })}
        </svg>
      )}

      {modules.map(mod => (
        <ModuleWindow
          key={mod.id}
          module={mod}
          tableData={tableData}
          selected={mod.id === selectedModuleId}
          canvasTransform={canvasTransform}
          onSelect={onSelect}
          onMove={onMove}
          onResize={onResize}
          onCollapse={onCollapse}
          onDelete={onDelete}
          onDismember={onDismember}
        />
      ))}
    </div>
  )
})
