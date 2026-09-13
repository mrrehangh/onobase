/**
 * JsonViewer.tsx
 * Interactive JSON tree viewer.
 * No external dependencies — built with pure React.
 * Onobase — Obnet Pty Ltd © 2026
 */

import { useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface JsonNodeProps {
  value: unknown
  keyName?: string
  depth: number
  isLast: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function copyToClipboard(value: unknown) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  navigator.clipboard.writeText(text).catch(() => {})
}

// ── JsonNode ──────────────────────────────────────────────────────────────────

function JsonNode({ value, keyName, depth, isLast }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2)
  const [copied, setCopied] = useState(false)

  const type = getType(value)
  const isExpandable = type === 'object' || type === 'array'
  const indent = depth * 16

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    copyToClipboard(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const colorFor = (t: string) => {
    if (t === 'null') return 'rgba(255,255,255,0.25)'
    if (t === 'boolean') return value ? '#00E5B0' : '#EF4444'
    if (t === 'number') return '#B5CEA8'
    if (t === 'string') return '#CE9178'
    return '#C9D1D9'
  }

  const renderValue = () => {
    if (type === 'null') return <span style={{ color: colorFor('null'), fontStyle: 'italic' }}>null</span>
    if (type === 'boolean') return <span style={{ color: colorFor('boolean') }}>{String(value)}</span>
    if (type === 'number') return <span style={{ color: colorFor('number') }}>{String(value)}</span>
    if (type === 'string') return <span style={{ color: colorFor('string') }}>"{value as string}"</span>
    return null
  }

  const entries: [string, unknown][] = isExpandable
    ? (type === 'array'
        ? (value as unknown[]).map((v, i): [string, unknown] => [String(i), v])
        : Object.entries(value as Record<string, unknown>))
    : []

  const preview = isExpandable
    ? (type === 'array'
        ? `[${(value as unknown[]).length} items]`
        : `{${Object.keys(value as object).length} keys}`)
    : ''

  return (
    <div style={{ paddingLeft: indent }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '1px 0', cursor: isExpandable ? 'pointer' : 'default', userSelect: 'none' }}
        onClick={() => isExpandable && setExpanded(v => !v)}
      >
        {/* Chevron */}
        {isExpandable ? (
          <span style={{ color: '#484F58', fontSize: 10, width: 10, flexShrink: 0, transition: 'transform 0.1s', display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
        ) : (
          <span style={{ width: 10, flexShrink: 0 }} />
        )}

        {/* Key */}
        {keyName !== undefined && (
          <span style={{ color: '#79B8FF', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            "{keyName}"
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>: </span>
          </span>
        )}

        {/* Value / preview */}
        {isExpandable ? (
          expanded ? (
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              {type === 'array' ? '[' : '{'}
            </span>
          ) : (
            <span style={{ color: '#8B949E', fontSize: 11 }}>
              {type === 'array' ? '[' : '{'}{' '}
              <span style={{ color: '#484F58', fontStyle: 'italic' }}>{preview}</span>
              {' '}{type === 'array' ? ']' : '}'}
            </span>
          )
        ) : (
          <span
            onClick={handleCopy}
            title="Click to copy"
            style={{ cursor: 'pointer' }}
          >
            {renderValue()}
          </span>
        )}

        {/* Copy confirmation */}
        {copied && <span style={{ fontSize: 9, color: '#00E5B0', marginLeft: 4, fontFamily: 'var(--font-body)' }}>copied!</span>}
        {!copied && !isExpandable && (
          <button
            onClick={handleCopy}
            title="Copy value"
            style={{ background: 'none', border: 'none', color: '#484F58', cursor: 'pointer', fontSize: 9, padding: '0 2px', opacity: 0.6 }}
          >
            ⎘
          </button>
        )}
      </div>

      {/* Children */}
      {isExpandable && expanded && (
        <div>
          {entries.map(([k, v], i) => (
            <JsonNode
              key={k}
              keyName={type === 'array' ? undefined : k}
              value={v}
              depth={depth + 1}
              isLast={i === entries.length - 1}
            />
          ))}
          <div style={{ paddingLeft: 10, color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            {type === 'array' ? ']' : '}'}{!isLast ? ',' : ''}
          </div>
        </div>
      )}
    </div>
  )
}

// ── JsonViewer ────────────────────────────────────────────────────────────────

interface JsonViewerProps {
  content: string
}

export default function JsonViewer({ content }: JsonViewerProps) {
  let parsed: unknown = null
  try {
    parsed = JSON.parse(content)
  } catch (e) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, color: '#EF4444', marginBottom: 8, fontFamily: 'var(--font-body)' }}>
          Invalid JSON — showing raw text:
        </div>
        <pre style={{ margin: 0, fontSize: 11, fontFamily: 'var(--font-mono)', color: '#C9D1D9', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {content}
        </pre>
      </div>
    )
  }

  return (
    <div style={{ padding: 12, fontSize: 11, fontFamily: 'var(--font-mono)', lineHeight: 1.7, overflowY: 'auto', height: '100%' }}>
      <JsonNode value={parsed} depth={0} isLast />
    </div>
  )
}
