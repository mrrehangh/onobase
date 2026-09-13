/**
 * QueryWarningDialog.tsx
 * Pre-execution query safety warning dialog.
 * Shows analysis results before running SQL.
 * Onobase — Obnet Pty Ltd © 2026
 */

import { useState } from 'react'
import type { AnalysisResult, QueryWarning } from '../utils/queryAnalyzer'

interface Props {
  analysis: AnalysisResult
  sql: string
  onProceed: () => void
  onCancel: () => void
  onAutoFix: (fixedSql: string) => void
}

export default function QueryWarningDialog({
  analysis,
  sql,
  onProceed,
  onCancel,
  onAutoFix,
}: Props) {
  const [confirmed, setConfirmed] = useState(false)

  const hasWarnings = analysis.warnings.some(w => w.severity === 'warning')

  // Title bar config
  const titleBarBg = analysis.isDangerous
    ? 'rgba(239,68,68,0.18)'
    : hasWarnings
    ? 'rgba(234,179,8,0.15)'
    : 'rgba(59,130,246,0.12)'

  const titleBarBorder = analysis.isDangerous
    ? '1px solid rgba(239,68,68,0.3)'
    : hasWarnings
    ? '1px solid rgba(234,179,8,0.25)'
    : '1px solid rgba(59,130,246,0.25)'

  const titleIcon = analysis.isDangerous ? '⚠' : hasWarnings ? '⚠' : 'ℹ'
  const titleText = analysis.isDangerous
    ? 'Dangerous Query Detected'
    : hasWarnings
    ? 'Query Warnings'
    : 'Query Notice'

  const titleColor = analysis.isDangerous
    ? '#EF4444'
    : hasWarnings
    ? '#EAB308'
    : '#3B82F6'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        style={{
          width: 450,
          background: 'rgba(13,17,23,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          maxHeight: '80vh',
        }}
      >
        {/* Title bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            background: titleBarBg,
            borderBottom: titleBarBorder,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 15, color: titleColor }}>{titleIcon}</span>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 13,
              color: titleColor,
              letterSpacing: '0.03em',
            }}
          >
            {titleText}
          </span>
          <button
            onClick={onCancel}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              fontSize: 14,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Warnings list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {analysis.warnings.map((warning: QueryWarning) => (
            <div
              key={warning.id}
              style={{
                display: 'flex',
                gap: 12,
                padding: '10px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background:
                  warning.severity === 'danger'
                    ? 'rgba(239,68,68,0.05)'
                    : warning.severity === 'warning'
                    ? 'rgba(234,179,8,0.05)'
                    : 'rgba(59,130,246,0.05)',
              }}
            >
              {/* Severity icon */}
              <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
                {warning.severity === 'danger'
                  ? '🛑'
                  : warning.severity === 'warning'
                  ? '⚠️'
                  : 'ℹ️'}
              </div>

              <div style={{ flex: 1 }}>
                {/* Title */}
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 700,
                    fontSize: 13,
                    color:
                      warning.severity === 'danger'
                        ? '#EF4444'
                        : warning.severity === 'warning'
                        ? '#EAB308'
                        : '#3B82F6',
                    marginBottom: 4,
                  }}
                >
                  {warning.title}
                </div>

                {/* Message */}
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    marginBottom: warning.fix ? 6 : 0,
                  }}
                >
                  {warning.message}
                </div>

                {/* Fix suggestion */}
                {warning.fix && (
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      background: 'rgba(255,255,255,0.04)',
                      borderLeft: '2px solid rgba(255,255,255,0.2)',
                      padding: '4px 8px',
                      borderRadius: '0 4px 4px 0',
                      marginTop: 4,
                    }}
                  >
                    💡 {warning.fix}
                  </div>
                )}

                {/* Auto-fix button */}
                {warning.autoFixSql && (
                  <button
                    onClick={() => onAutoFix(warning.autoFixSql!)}
                    style={{
                      marginTop: 8,
                      background: 'rgba(0,229,176,0.08)',
                      border: '1px solid rgba(0,229,176,0.3)',
                      borderRadius: 5,
                      color: 'var(--accent)',
                      fontSize: 11,
                      padding: '3px 10px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    ✓ Auto-fix this
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* SQL preview */}
        <div
          style={{
            margin: '12px 16px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            padding: '8px 12px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-secondary)',
            whiteSpace: 'pre',
            overflow: 'hidden',
            maxHeight: 80,
            flexShrink: 0,
          }}
        >
          {sql.split('\n').slice(0, 3).join('\n')}
          {sql.split('\n').length > 3 ? '\n...' : ''}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px 14px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {analysis.requiresConfirm && (
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                style={{ accentColor: '#EF4444' }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  marginLeft: 6,
                  fontFamily: 'var(--font-body)',
                }}
              >
                I understand this action may be irreversible
              </span>
            </label>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 5,
                color: 'var(--text-secondary)',
                fontSize: 12,
                padding: '6px 14px',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Cancel
            </button>

            {analysis.requiresConfirm ? (
              <button
                onClick={onProceed}
                disabled={!confirmed}
                style={{
                  background: confirmed
                    ? 'rgba(239,68,68,0.15)'
                    : 'rgba(239,68,68,0.05)',
                  border: confirmed
                    ? '1px solid rgba(239,68,68,0.4)'
                    : '1px solid rgba(239,68,68,0.15)',
                  borderRadius: 5,
                  color: confirmed ? '#EF4444' : 'rgba(239,68,68,0.4)',
                  fontSize: 12,
                  padding: '6px 14px',
                  cursor: confirmed ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                Run Anyway — I understand the risk
              </button>
            ) : (
              <button
                onClick={onProceed}
                style={{
                  background: 'rgba(0,229,176,0.12)',
                  border: '1px solid rgba(0,229,176,0.35)',
                  borderRadius: 5,
                  color: 'var(--accent)',
                  fontSize: 12,
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                }}
              >
                Run Query
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
