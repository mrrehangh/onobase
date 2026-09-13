import { AnimatePresence, motion } from 'framer-motion'
import { X, Zap, Share2, Table } from 'lucide-react'
import type { AppTab } from '../store/useAppStore'

interface Props {
  tabs: AppTab[]
  activeTabId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

export default function TabBar({ tabs, activeTabId, onSelect, onClose }: Props) {
  return (
    <div style={{
      height: 36,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'flex-end',
      background: 'rgba(13,17,23,0.95)',
      borderBottom: '1px solid var(--border)',
      paddingLeft: 8,
      gap: 2,
      overflow: 'hidden',
    }}>
      <AnimatePresence initial={false}>
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId
          const Icon = tab.type === 'query' ? Zap : tab.type === 'dataview' ? Table : Share2

          return (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              onClick={() => onSelect(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                height: 30,
                padding: '0 8px 0 10px',
                background: isActive ? 'var(--bg-primary, #080C12)' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'var(--border)' : 'transparent',
                borderBottom: isActive ? '1px solid var(--bg-primary, #080C12)' : '1px solid transparent',
                borderRadius: '6px 6px 0 0',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'var(--font-body)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                userSelect: 'none',
                transition: 'color 0.1s',
                marginBottom: -1,
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLDivElement).style.color = 'var(--text-primary)'
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLDivElement).style.color = 'var(--text-secondary)'
              }}
            >
              <Icon size={10} style={{ flexShrink: 0, opacity: 0.7 }} />

              <span style={{
                maxWidth: 110,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {tab.isDirty && (
                  <span style={{ color: 'var(--accent)', marginRight: 3, fontSize: 10 }}>●</span>
                )}
                {tab.title}
              </span>

              <button
                onClick={e => { e.stopPropagation(); onClose(tab.id) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 16, height: 16,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 3,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                  opacity: 0.6,
                }}
                onMouseEnter={e => {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.background = 'rgba(255,255,255,0.1)'
                  b.style.opacity = '1'
                }}
                onMouseLeave={e => {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.background = 'transparent'
                  b.style.opacity = '0.6'
                }}
              >
                <X size={10} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
