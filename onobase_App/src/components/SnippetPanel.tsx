import { useState } from 'react'
import { SQL_SNIPPETS, SNIPPET_CATEGORIES, type SqlSnippet } from '../utils/sqlSnippets'

interface Props {
  onClose(): void
}

export default function SnippetPanel({ onClose }: Props) {
  const [category, setCategory] = useState<string>('SELECT')
  const [search, setSearch] = useState('')

  const filtered = SQL_SNIPPETS.filter(s => {
    const matchCat = s.category === category
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())
    return search ? matchSearch : matchCat
  })

  const insert = (snippet: SqlSnippet) => {
    // Strip snippet variable markers like ${1:name} → name
    const sql = snippet.sql.replace(/\$\{\d+:([^}]*)\}/g, '$1').replace(/\$\{\d+\}/g, '')
    const event = new CustomEvent('onobase:insertSnippet', { detail: { sql } })
    document.dispatchEvent(event)
    onClose()
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: 320, height: '100%',
      background: '#0D1117',
      borderLeft: '1px solid rgba(255,255,255,0.07)',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        height: 38, display: 'flex', alignItems: 'center',
        padding: '0 10px', gap: 8,
        background: '#161B22',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#C9D1D9', fontFamily: 'var(--font-body)', flex: 1 }}>
          SQL Snippets
        </span>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none',
          color: '#484F58', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#C9D1D9' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#484F58' }}
        >×</button>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search snippets…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 5, padding: '5px 8px',
            fontSize: 11, color: '#C9D1D9',
            fontFamily: 'var(--font-body)', outline: 'none',
          }}
          onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(0,229,176,0.5)' }}
          onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
        />
      </div>

      {/* Category tabs (hidden when searching) */}
      {!search && (
        <div style={{
          display: 'flex', overflowX: 'auto', gap: 0,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          {SNIPPET_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              style={{
                background: 'transparent', border: 'none',
                borderBottom: category === cat ? '2px solid #00E5B0' : '2px solid transparent',
                color: category === cat ? '#00E5B0' : '#484F58',
                padding: '5px 10px', fontSize: 10, cursor: 'pointer',
                fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
                transition: 'color 0.1s',
              }}
            >{cat}</button>
          ))}
        </div>
      )}

      {/* Snippet list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#484F58', fontSize: 11, fontFamily: 'var(--font-body)' }}>
            No snippets found
          </div>
        ) : filtered.map(snippet => (
          <SnippetRow key={snippet.id} snippet={snippet} onInsert={insert} />
        ))}
      </div>
    </div>
  )
}

function SnippetRow({ snippet, onInsert }: { snippet: SqlSnippet; onInsert(s: SqlSnippet): void }) {
  const [hover, setHover] = useState(false)
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: hover ? 'rgba(255,255,255,0.03)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 10px', gap: 6, cursor: 'pointer',
      }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#C9D1D9', fontFamily: 'var(--font-body)' }}>
            {snippet.title}
          </div>
          <div style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)', marginTop: 2 }}>
            {snippet.description}
          </div>
        </div>
        {hover && (
          <button
            onClick={e => { e.stopPropagation(); onInsert(snippet) }}
            style={{
              background: 'rgba(0,229,176,0.12)', border: '1px solid rgba(0,229,176,0.35)',
              borderRadius: 4, color: '#00E5B0', padding: '2px 8px', fontSize: 10,
              cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >Insert</button>
        )}
        <span style={{ color: '#484F58', fontSize: 10 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <pre style={{
          margin: 0, padding: '6px 10px 10px',
          fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
          fontSize: 10, color: '#8B949E', lineHeight: 1.6,
          background: 'rgba(0,0,0,0.2)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          {snippet.sql}
        </pre>
      )}
    </div>
  )
}
