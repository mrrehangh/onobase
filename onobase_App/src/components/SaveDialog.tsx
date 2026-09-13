import type React from 'react'

interface Props {
  tabTitle: string
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export default function SaveDialog({ tabTitle, onSave, onDiscard, onCancel }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9998,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#161B22',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          padding: '24px 28px',
          width: 340,
          boxShadow: '0 16px 48px rgba(0,0,0,0.85)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14, fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}>
          Unsaved Changes
        </div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          marginBottom: 22,
          lineHeight: 1.5,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {tabTitle}
          </span>{' '}has unsaved changes. Save before closing?
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel}  style={btn('ghost')}>Cancel</button>
          <button onClick={onDiscard} style={btn('danger')}>Don't Save</button>
          <button onClick={onSave}    style={btn('primary')}>Save</button>
        </div>
      </div>
    </div>
  )
}

function btn(variant: 'ghost' | 'danger' | 'primary'): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '6px 14px', fontSize: 12,
    fontFamily: 'var(--font-body)', fontWeight: 500,
    borderRadius: 6, cursor: 'pointer',
    border: '1px solid', transition: 'all 0.15s',
  }
  if (variant === 'ghost')   return { ...base, background: 'transparent', borderColor: 'rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }
  if (variant === 'danger')  return { ...base, background: 'transparent', borderColor: 'rgba(239,68,68,0.4)',    color: '#EF4444' }
  return { ...base, background: 'var(--accent)', borderColor: 'var(--accent)', color: '#080C12', fontWeight: 600 }
}
