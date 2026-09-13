import { memo } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { TableInfo, OnoColor } from '../types'

export interface TableCardNodeData {
  tableInfo: TableInfo | undefined
  color: OnoColor | null    // null = free/unassigned
  moduleId: string | null
  onContextMenu: (tableId: string, moduleId: string | null, x: number, y: number) => void
}

const shortType = (t: string) =>
  t.replace('character varying', 'varchar')
   .replace('timestamp without time zone', 'ts')
   .replace('timestamp with time zone', 'tstz')
   .replace('double precision', 'float8')
   .replace('boolean', 'bool')
   .replace('integer', 'int4')
   .replace('bigint', 'int8')
   .replace('smallint', 'int2')
   .replace(/numeric\(\d+,\s*\d+\)/g, 'num')
   .replace(/^numeric$/, 'num')
   .replace('json', 'json')   // no-op: keeps jsonb as-is below
   .replace('jsonb', 'json')
   .replace('uuid', 'uuid')
   .replace('text', 'text')

// PK key icon — 8×8
const PkIcon = ({ color }: { color: string }) => (
  <svg width={8} height={8} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    <circle cx="12" cy="8" r="3" />
    <path d="M12 11v10M9 18h6" />
  </svg>
)

// FK arrow → inline after column name
const FkArrow = ({ color }: { color: string }) => (
  <svg width={8} height={8} viewBox="0 0 16 16" fill="none"
    style={{ flexShrink: 0, marginLeft: 2, opacity: 0.6 }}>
    <path d="M2 8h10M9 5l3 3-3 3" stroke={color} strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function TableCardNode({ id, data, selected }: NodeProps) {
  const { tableInfo: t, color: c, moduleId, onContextMenu } = data as unknown as TableCardNodeData
  const isFree = !moduleId || !c
  const tableId = id.startsWith('t:') ? id.slice(2) : id
  const accentColor = isFree ? 'rgba(255,255,255,0.35)' : c!.hex

  if (!t) return (
    <div style={{
      padding: '5px 8px', fontSize: 10,
      color: 'var(--text-secondary)',
      background: 'rgba(22,27,34,0.85)',
      borderRadius: 6,
      border: '1px solid var(--border)',
      fontFamily: 'var(--font-mono)',
    }}>
      …
    </div>
  )

  const showColBadge = t.cols.length > 8

  return (
    <div
      onContextMenu={e => { e.preventDefault(); e.stopPropagation(); onContextMenu(tableId, moduleId, e.clientX, e.clientY) }}
      style={{
        width: '100%',
        minWidth: 200,
        borderRadius: 6,
        border: isFree
          ? '1px dashed rgba(255,255,255,0.2)'
          : `1px solid ${selected ? c!.hex + '60' : c!.hex + '28'}`,
        background: 'rgba(22, 27, 34, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        overflow: 'hidden',
        boxShadow: selected
          ? `0 0 0 1px ${isFree ? 'rgba(255,255,255,0.15)' : c!.hex + '25'}, 0 4px 20px rgba(0,0,0,0.6)`
          : '0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        userSelect: 'none',
        cursor: 'grab',
      }}
    >
      {/* Resize handles */}
      <NodeResizer
        isVisible={selected}
        minWidth={160} minHeight={40}
        handleStyle={{
          background: isFree ? '#8B949E' : c!.hex,
          border: '2px solid #080C12',
          width: 6, height: 6, borderRadius: 1,
        }}
        lineStyle={{
          borderColor: isFree ? 'rgba(255,255,255,0.2)' : c!.hex + '55',
          borderWidth: 1,
        }}
      />

      {/* FK connection handles — 5×5 */}
      <Handle type="target" position={Position.Left}
        style={{ background: isFree ? '#8B949E' : c!.hex, width: 5, height: 5, border: '1.5px solid #080C12', opacity: 0.8 }}
      />
      <Handle type="source" position={Position.Right}
        style={{ background: isFree ? '#8B949E' : c!.hex, width: 5, height: 5, border: '1.5px solid #080C12', opacity: 0.8 }}
      />

      {/* ── Table header ── */}
      <div style={{
        height: 22,
        background: isFree ? 'rgba(255,255,255,0.04)' : `${c!.hex}15`,
        borderBottom: `1px solid ${isFree ? 'rgba(255,255,255,0.07)' : c!.hex + '20'}`,
        display: 'flex', alignItems: 'center',
        padding: '0 7px 0 0',
        gap: 0,
        overflow: 'hidden',
      }}>
        {/* Left accent bar */}
        <div style={{
          width: 2,
          alignSelf: 'stretch',
          background: isFree ? 'rgba(255,255,255,0.08)' : c!.hex,
          flexShrink: 0,
          marginRight: 6,
        }} />

        {/* Table name — Syne 700 10px */}
        <span style={{
          fontFamily: "'Syne', var(--font-mono), monospace",
          fontSize: 10,
          fontWeight: 700,
          color: isFree ? 'rgba(255,255,255,0.45)' : c!.hex,
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          letterSpacing: '0.01em',
        }}>
          {t.name}
        </span>

        {/* Column count badge — only if > 8 cols */}
        {showColBadge && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            color: isFree ? 'rgba(255,255,255,0.25)' : c!.hex + '66',
            background: isFree ? 'rgba(255,255,255,0.06)' : c!.hex + '18',
            borderRadius: 3,
            padding: '1px 4px',
            flexShrink: 0,
            marginRight: 4,
            lineHeight: 1,
          }}>
            {t.cols.length} cols
          </span>
        )}

        {/* Schema label — 8px right-aligned */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          color: 'rgba(255,255,255,0.22)',
          flexShrink: 0,
        }}>
          {t.schema}
        </span>
      </div>

      {/* ── Columns ── */}
      <div>
        {t.cols.map((col, i) => (
          <div key={col.name} style={{
            display: 'flex',
            alignItems: 'center',
            height: 18,
            padding: '0 7px 0 6px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
            boxSizing: 'border-box',
            gap: 0,
          }}>
            {/* PK icon or dot — 8px fixed zone */}
            <div style={{
              width: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginRight: 3,
            }}>
              {col.isPk ? (
                <PkIcon color={accentColor} />
              ) : (
                <div style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                }} />
              )}
            </div>

            {/* Column name — flex:1 */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: col.isPk ? 500 : 300,
              color: col.isPk ? 'var(--text-primary)' : 'var(--text-secondary)',
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: '18px',
            }}>
              {col.name}
            </span>

            {/* FK arrow — only for FK columns */}
            {col.isFk && (
              <FkArrow color={accentColor} />
            )}

            {/* Colon separator */}
            <span style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.15)',
              margin: '0 3px',
              flexShrink: 0,
              lineHeight: '18px',
            }}>:</span>

            {/* Data type — 9px mono, right-aligned, 52px fixed */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.28)',
              width: 52,
              flexShrink: 0,
              textAlign: 'right',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: '18px',
            }}>
              {shortType(col.type)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default memo(TableCardNode)
