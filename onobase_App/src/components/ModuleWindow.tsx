import { memo, useRef, useCallback, useState, useEffect } from 'react'
import { getModuleColor } from '../utils/colors'
import { useModuleStore } from '../store/useModuleStore'
import ModuleNameDialog from './ModuleNameDialog'
import type { OnoModule, TableInfo } from '../types'

interface Props {
  module: OnoModule
  tableData: Map<string, TableInfo>
  selected: boolean
  canvasTransform: { x: number; y: number; zoom: number }
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  onResize: (id: string, w: number, h: number) => void
  onCollapse: (id: string) => void
  onDelete: (id: string) => void
  onDismember: (tableId: string, moduleId: string) => void
}

export default memo(function ModuleWindow({
  module: mod, tableData, selected,
  canvasTransform,
  onSelect, onMove, onResize, onCollapse,
  onDelete, onDismember,
}: Props) {

  const c = getModuleColor(mod.cid, mod.customHex)
  const isCollapsed = mod.collapsed ?? false
  const dragRef = useRef({
    dragging: false,
    startMouseX: 0, startMouseY: 0,
    startModX: 0, startModY: 0,
  })

  // ── Context menu + edit dialog state ────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [ctxMenu])

  const zoom = canvasTransform.zoom
  const screenX = mod.x * zoom + canvasTransform.x
  const screenY = mod.y * zoom + canvasTransform.y
  const screenW = mod.width * zoom
  const screenH = isCollapsed ? 36 * zoom : mod.height * zoom

  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    onSelect(mod.id)
    const d = dragRef.current
    d.dragging = true
    d.startMouseX = e.clientX
    d.startMouseY = e.clientY
    d.startModX = mod.x
    d.startModY = mod.y

    const onMove_ = (ev: MouseEvent) => {
      if (!d.dragging) return
      const dx = (ev.clientX - d.startMouseX) / zoom
      const dy = (ev.clientY - d.startMouseY) / zoom
      onMove(mod.id, d.startModX + dx, d.startModY + dy)
    }
    const onUp = () => {
      d.dragging = false
      window.removeEventListener('mousemove', onMove_)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove_)
    window.addEventListener('mouseup', onUp)
  }, [mod.id, mod.x, mod.y, zoom, onMove, onSelect])

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const startW = mod.width
    const startH = mod.height

    const onMove_ = (ev: MouseEvent) => {
      const newW = Math.max(240, startW + (ev.clientX - startX) / zoom)
      const newH = Math.max(140, startH + (ev.clientY - startY) / zoom)
      onResize(mod.id, newW, newH)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove_)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove_)
    window.addEventListener('mouseup', onUp)
  }, [mod.id, mod.width, mod.height, zoom, onResize])

  return (
    <div
      onClick={() => onSelect(mod.id)}
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        width: screenW,
        height: screenH,
        borderRadius: 10 * zoom,
        background: 'rgba(13,17,23,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: selected
          ? `1px solid ${c.hex}66`
          : '1px solid rgba(255,255,255,0.09)',
        boxShadow: selected
          ? `0 0 0 1px ${c.hex}22, 0 12px 48px rgba(0,0,0,0.7)`
          : '0 4px 24px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: selected ? 10 : 5,
        pointerEvents: 'all',
        userSelect: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {/* HEADER */}
      <div
        onMouseDown={onHeaderMouseDown}
        onContextMenu={e => {
          e.preventDefault()
          e.stopPropagation()
          setCtxMenu({ x: e.clientX, y: e.clientY })
        }}
        style={{
          height: 36 * zoom,
          flexShrink: 0,
          background: `${c.hex}18`,
          borderBottom: isCollapsed ? 'none' : `1px solid ${c.hex}22`,
          display: 'flex',
          alignItems: 'center',
          padding: `0 ${10 * zoom}px`,
          gap: 7,
          cursor: 'grab',
        }}
      >
        {/* Colour dot */}
        <div style={{
          width: 9 * zoom, height: 9 * zoom,
          borderRadius: 2,
          background: c.hex,
          flexShrink: 0,
          boxShadow: `0 0 8px ${c.hex}88`,
        }} />

        {/* Module name */}
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 11 * zoom,
          fontWeight: 700,
          color: c.hex,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {mod.name}
        </span>

        {/* Count badge */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9 * zoom,
          color: `${c.hex}88`,
          background: `${c.hex}12`,
          border: `1px solid ${c.hex}20`,
          borderRadius: 3,
          padding: `1px ${5 * zoom}px`,
          flexShrink: 0,
        }}>
          {mod.tableIds.length}
        </span>

        {/* Collapse */}
        <div
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onCollapse(mod.id) }}
          style={{
            color: `${c.hex}55`,
            cursor: 'pointer',
            fontSize: 10 * zoom,
            lineHeight: 1,
            padding: '2px 3px',
            borderRadius: 3,
            flexShrink: 0,
            transition: 'color 0.1s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.color = c.hex
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.color = `${c.hex}55`
          }}
        >
          {isCollapsed ? '▶' : '▼'}
        </div>

        {/* Delete */}
        <div
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete(mod.id) }}
          style={{
            color: 'rgba(255,255,255,0.2)',
            cursor: 'pointer',
            fontSize: 16 * zoom,
            lineHeight: 1,
            padding: '2px 4px',
            borderRadius: 3,
            flexShrink: 0,
            transition: 'color 0.1s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.color = '#EF4444'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.color = 'rgba(255,255,255,0.2)'
          }}
        >×</div>
      </div>

      {/* TABLE LIST */}
      {!isCollapsed && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: `${6 * zoom}px 0`,
        }}>
          {mod.tableIds.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: 60,
              gap: 6,
              pointerEvents: 'none',
            }}>
              <svg width={20 * zoom} height={20 * zoom}
                viewBox="0 0 24 24" fill="none"
                stroke={`${c.hex}28`} strokeWidth={1.5}>
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <path d="M12 8v8M8 12h8"/>
              </svg>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: 10 * zoom,
                color: 'rgba(255,255,255,0.15)',
                textAlign: 'center',
              }}>
                No tables assigned
              </span>
            </div>
          ) : (
            mod.tableIds.map(tableId => {
              const info = tableData.get(tableId)
              const name = info?.name ?? tableId.split('.')[1] ?? tableId

              return (
                <div
                  key={tableId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: `${4 * zoom}px ${10 * zoom}px`,
                    marginLeft: 8 * zoom,
                    marginRight: 8 * zoom,
                    marginBottom: 2 * zoom,
                    borderLeft: `2px solid ${c.hex}`,
                    borderRadius: `0 ${4 * zoom}px ${4 * zoom}px 0`,
                    cursor: 'default',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.background = `${c.hex}10`
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                  }}
                >
                  {/* Dot */}
                  <div style={{
                    width: 5 * zoom,
                    height: 5 * zoom,
                    borderRadius: '50%',
                    background: c.hex,
                    flexShrink: 0,
                    marginRight: 8 * zoom,
                    opacity: 0.8,
                  }} />

                  {/* Name */}
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11 * zoom,
                    color: 'var(--text-mono)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {name}
                  </span>

                  {/* Dismember button */}
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => {
                      e.stopPropagation()
                      onDismember(tableId, mod.id)
                    }}
                    title="Dismember from module"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                      fontSize: 14 * zoom,
                      lineHeight: 1,
                      padding: `0 ${2 * zoom}px`,
                      flexShrink: 0,
                      transition: 'color 0.1s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.15)'
                    }}
                  >×</button>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── CONTEXT MENU ────────────────────────────────────────────────── */}
      {ctxMenu && (
        <div
          style={{
            position: 'fixed',
            top: ctxMenu.y,
            left: ctxMenu.x,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '4px 0',
            zIndex: 9999,
            minWidth: 140,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            pointerEvents: 'all',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div
            onClick={() => { setShowEditDialog(true); setCtxMenu(null) }}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-glass-hover)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
          >
            ⚙ Settings
          </div>
        </div>
      )}

      {/* ── EDIT DIALOG ─────────────────────────────────────────────────── */}
      {showEditDialog && (
        <ModuleNameDialog
          mode="edit"
          existingModules={useModuleStore.getState().modules
            .filter(m => m.id !== mod.id)
            .map(m => ({ name: m.name, color: getModuleColor(m.colorId, m.customHex).hex }))}
          initialName={mod.name}
          initialColor={getModuleColor(mod.cid, mod.customHex).hex}
          onConfirm={(name, hex) => {
            useModuleStore.getState().updateModule(mod.id, {
              name,
              colorId: `custom_${mod.id}`,
              customHex: hex,
            })
            setShowEditDialog(false)
          }}
          onCancel={() => setShowEditDialog(false)}
        />
      )}

      {/* RESIZE HANDLE */}
      {!isCollapsed && (
        <div
          onMouseDown={onResizeMouseDown}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 16 * zoom,
            height: 16 * zoom,
            cursor: 'nwse-resize',
          }}
        >
          <svg
            width={10 * zoom}
            height={10 * zoom}
            viewBox="0 0 10 10"
            style={{ position: 'absolute', right: 3, bottom: 3 }}
          >
            <path
              d="M9 1L1 9M9 5L5 9M9 9"
              stroke={`${c.hex}55`}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </div>
  )
})
