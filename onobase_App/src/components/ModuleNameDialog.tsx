/**
 * ModuleNameDialog.tsx
 * Glass modal for creating or editing a canvas module.
 * 40-colour palette + custom hex/colour-picker input.
 * Onobase — Obnet Pty Ltd © 2026
 */

import { useState, useRef, useEffect } from 'react'

const COLORS = [
  // Teals & Greens
  '#00E5B0', '#00BCD4', '#00ACC1', '#26C6DA',
  '#00897B', '#43A047', '#66BB6A', '#00E676',
  // Blues
  '#4D9FFF', '#2979FF', '#448AFF', '#40C4FF',
  '#1565C0', '#1976D2', '#0288D1', '#039BE5',
  // Purples & Pinks
  '#A855F7', '#9C27B0', '#8E24AA', '#7B1FA2',
  '#EC4899', '#E91E63', '#F06292', '#CE93D8',
  // Reds & Oranges
  '#EF4444', '#F44336', '#FF5252', '#FF1744',
  '#F97316', '#FF9800', '#FB8C00', '#FF6D00',
  // Yellows & Ambers
  '#EAB308', '#FDD835', '#FFD600', '#FFAB00',
  // Neutrals & Special
  '#78909C', '#90A4AE', '#B0BEC5', '#FFFFFF',
]

interface ExistingModule {
  name: string
  color: string   // hex string, e.g. '#00E5B0'
}

interface Props {
  mode: 'create' | 'edit'
  existingModules: ExistingModule[]
  initialName?: string
  initialColor?: string   // hex string
  onConfirm: (name: string, color: string) => void   // returns hex
  onCancel: () => void
}

const lbl: React.CSSProperties = {
  fontSize: 10,
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 8,
}

export default function ModuleNameDialog({
  mode, existingModules, initialName, initialColor, onConfirm, onCancel,
}: Props) {
  const [name, setName]             = useState(initialName ?? '')
  const [color, setColor]           = useState(initialColor ?? COLORS[0])
  const [nameError, setNameError]   = useState('')
  const [colorError, setColorError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  const handleConfirm = () => {
    const trimmed = name.trim()
    let valid = true

    if (!trimmed) {
      setNameError('Module name is required.')
      valid = false
    } else if (existingModules.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) {
      setNameError('A module with this name already exists.')
      valid = false
    } else {
      setNameError('')
    }

    if (existingModules.some(m => m.color.toLowerCase() === color.toLowerCase())) {
      setColorError('Each module must have a unique colour.')
      valid = false
    } else {
      setColorError('')
    }

    if (valid) onConfirm(trimmed, color)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div style={{
        background: 'rgba(13,17,23,0.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        width: 400,
        boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '14px 16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{
            fontFamily: 'var(--font-heading)', fontSize: 13,
            fontWeight: 700, flex: 1, letterSpacing: '0.02em',
          }}>
            {mode === 'create' ? 'New Module' : 'Module Settings'}
          </span>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-secondary)', fontSize: 14,
              cursor: 'pointer', padding: '2px 6px',
              borderRadius: 4, lineHeight: 1,
            }}
          >✕</button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Name input */}
          <div>
            <label style={lbl}>Module Name</label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => { setName(e.target.value); if (nameError) setNameError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') onCancel() }}
              placeholder="e.g. Auth, Billing, Core…"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${nameError ? '#EF4444' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 5, padding: '8px 10px',
                fontSize: 13, color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)', outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { if (!nameError) e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={e  => { if (!nameError) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
            />
            {nameError && (
              <div style={{ fontSize: 11, color: '#EF4444', marginTop: 5, fontFamily: 'var(--font-body)' }}>
                {nameError}
              </div>
            )}
          </div>

          {/* Colour picker */}
          <div>
            <label style={lbl}>Colour</label>

            {/* 40-colour grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 1fr)',
              gap: 6,
              marginBottom: 10,
            }}>
              {COLORS.map(c => (
                <div
                  key={c}
                  title={c}
                  onClick={() => { setColor(c); setColorError('') }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: c,
                    cursor: 'pointer',
                    border: color.toLowerCase() === c.toLowerCase()
                      ? '2px solid #fff'
                      : '2px solid transparent',
                    boxShadow: color.toLowerCase() === c.toLowerCase()
                      ? `0 0 8px ${c}88`
                      : 'none',
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </div>

            {/* Custom colour input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 4,
            }}>
              <input
                type="color"
                value={color.length === 7 ? color : '#00E5B0'}
                onChange={e => { setColor(e.target.value); setColorError('') }}
                style={{
                  width: 36,
                  height: 36,
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: 'transparent',
                  padding: 0,
                }}
              />
              <input
                type="text"
                value={color}
                onChange={e => {
                  const val = e.target.value
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                    setColor(val)
                    setColorError('')
                  }
                }}
                placeholder="#00E5B0"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  padding: '6px 10px',
                  fontFamily: 'var(--font-mono)',
                  width: 100,
                  outline: 'none',
                }}
              />
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: color,
                border: '1px solid rgba(255,255,255,0.2)',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body)',
              }}>
                Custom
              </span>
            </div>

            {colorError && (
              <div style={{
                marginTop: 6,
                fontSize: 11,
                color: '#EF4444',
                fontFamily: 'var(--font-body)',
              }}>
                {colorError}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 5, color: 'var(--text-secondary)',
              padding: '7px 16px', fontSize: 12,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >Cancel</button>
          <button
            onClick={handleConfirm}
            style={{
              background: 'var(--accent)', border: 'none',
              borderRadius: 5, color: '#0D1117',
              padding: '7px 18px', fontSize: 12,
              fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            {mode === 'create' ? 'Create Module' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  )
}
