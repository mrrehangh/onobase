/**
 * BookmarkPanel.tsx
 * Saved query bookmarks panel.
 * Onobase — Obnet Pty Ltd © 2026
 */

import { useState } from 'react'
import { useAppStore, type QueryBookmark } from '../store/useAppStore'

interface Props {
  onInsert: (sql: string) => void
  onClose: () => void
}

export default function BookmarkPanel({ onInsert, onClose }: Props) {
  const { bookmarks, removeBookmark, updateBookmark } = useAppStore()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const filtered = search
    ? bookmarks.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.sql.toLowerCase().includes(search.toLowerCase()) ||
        b.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : bookmarks

  const handleUse = (bm: QueryBookmark) => {
    updateBookmark(bm.id, {
      lastUsedAt: new Date().toISOString(),
      useCount: bm.useCount + 1,
    })
    onInsert(bm.sql)
  }

  return (
    <div style={{
      width: 280, flexShrink: 0,
      background: '#161B22',
      borderLeft: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#8B949E', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          🔖 Bookmarks ({bookmarks.length})
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#484F58', cursor: 'pointer', fontSize: 14 }}>×</button>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search bookmarks…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4, padding: '4px 8px', fontSize: 11,
            fontFamily: 'var(--font-mono)', color: '#C9D1D9', outline: 'none',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#484F58', fontSize: 11, fontFamily: 'var(--font-body)' }}>
            {bookmarks.length === 0 ? 'No bookmarks yet.\nSave a query with the 🔖 button.' : 'No matches'}
          </div>
        )}
        {filtered.map(bm => (
          <div key={bm.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {editingId === bm.id ? (
              <div style={{ padding: 10 }}>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { updateBookmark(bm.id, { name: editName }); setEditingId(null) }
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#0D1117', border: '1px solid var(--accent)',
                    borderRadius: 4, padding: '4px 8px', fontSize: 11,
                    fontFamily: 'var(--font-body)', color: '#C9D1D9', outline: 'none',
                  }}
                />
                <div style={{ fontSize: 9, color: '#484F58', marginTop: 4, fontFamily: 'var(--font-body)' }}>Enter to save · Esc to cancel</div>
              </div>
            ) : (
              <div
                style={{ padding: '8px 12px', cursor: 'pointer', transition: 'background 0.1s' }}
                onClick={() => handleUse(bm)}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {bm.name}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditingId(bm.id); setEditName(bm.name) }}
                      style={{ background: 'none', border: 'none', color: '#484F58', cursor: 'pointer', fontSize: 11, padding: '1px 4px' }}
                      title="Rename"
                    >✎</button>
                    <button
                      onClick={() => removeBookmark(bm.id)}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 11, padding: '1px 4px' }}
                      title="Remove"
                    >×</button>
                  </div>
                </div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#484F58', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                  {bm.sql.replace(/\s+/g, ' ').slice(0, 60)}{bm.sql.length > 60 ? '…' : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  {bm.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 9, background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 3, padding: '1px 5px', fontFamily: 'var(--font-mono)' }}>
                      {tag}
                    </span>
                  ))}
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: '#484F58', fontFamily: 'var(--font-mono)' }}>
                    Used {bm.useCount}×
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
