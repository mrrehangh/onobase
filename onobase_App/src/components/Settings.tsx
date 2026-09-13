/**
 * Settings.tsx
 * Application settings panel.
 * Onobase — Obnet Pty Ltd © 2026
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { AI_PROVIDERS, type AiProvider } from '../utils/aiProviders'
import { THEMES } from '../utils/themes'
import { SHORTCUTS } from '../utils/shortcuts'

interface Props {
  onClose: () => void
}

type Section = 'query' | 'editor' | 'connections' | 'ai' | 'appearance' | 'shortcuts' | 'about'

// ── Shared styles ─────────────────────────────────────────────────────────────
const lbl: React.CSSProperties = {
  fontSize: 11, fontFamily: 'var(--font-body)',
  color: 'var(--text-secondary)', marginBottom: 4, display: 'block',
}
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center',
  justifyContent: 'space-between', gap: 12,
  padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
}
const numInp: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 5, padding: '5px 8px',
  fontSize: 12, color: 'var(--text-primary)',
  outline: 'none', width: 70, fontFamily: 'var(--font-mono)',
  textAlign: 'right' as const,
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
        position: 'relative', cursor: 'pointer',
        flexShrink: 0, transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: checked ? 19 : 3,
        width: 14, height: 14, borderRadius: '50%',
        background: checked ? '#0D1117' : '#8B949E',
        transition: 'left 0.2s',
      }} />
    </div>
  )
}

// ── Settings component ────────────────────────────────────────────────────────
export default function Settings({ onClose }: Props) {
  const [section, setSection] = useState<Section>('query')

  const {
    rowLimit, setRowLimit,
    autoFormat, setAutoFormat,
    editorFontSize, setEditorFontSize,
    wordWrap, setWordWrap,
    showLineNumbers, setShowLineNumbers,
    aiProvider, aiModel, aiBaseUrl, aiApiKeys,
    setAiProvider, setAiModel, setAiBaseUrl, setAiApiKey,
    themeId, setTheme,
  } = useAppStore()

  const history: { label: string; connectedAt: string }[] = (() => {
    try { return JSON.parse(localStorage.getItem('onobase_conn_history') || '[]') } catch { return [] }
  })()

  const navItems: { id: Section; label: string }[] = [
    { id: 'query',       label: 'Query Settings' },
    { id: 'editor',      label: 'Editor Settings' },
    { id: 'connections', label: 'Connections' },
    { id: 'ai',          label: 'AI Assistant' },
    { id: 'appearance',  label: '🎨 Appearance' },
    { id: 'shortcuts',   label: '⌨ Shortcuts' },
    { id: 'about',       label: 'About' },
  ]

  const selectedProvider = AI_PROVIDERS.find(p => p.id === aiProvider) ?? AI_PROVIDERS[0]

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, width: 600, maxHeight: '80vh',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Title bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>Settings</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left nav */}
          <div style={{ width: 160, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.07)', padding: '8px 0' }}>
            {navItems.map(item => (
              <div key={item.id} onClick={() => setSection(item.id)}
                style={{
                  padding: '8px 16px', fontSize: 12,
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                  color: section === item.id ? 'var(--accent)' : 'var(--text-secondary)',
                  background: section === item.id ? 'rgba(0,229,176,0.07)' : 'transparent',
                  borderLeft: `2px solid ${section === item.id ? 'var(--accent)' : 'transparent'}`,
                  transition: 'all 0.1s',
                }}
              >{item.label}</div>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>

            {section === 'query' && (
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Query Settings</div>

                <div style={{ ...row, alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>Row Limit</span>
                      <span style={{ ...lbl, marginTop: 2, marginBottom: 0 }}>Max rows returned per SELECT query</span>
                    </div>
                    <select
                      value={rowLimit}
                      onChange={e => setRowLimit(Number(e.target.value))}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border, rgba(255,255,255,0.12))',
                        borderRadius: 5,
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        padding: '6px 10px',
                        fontFamily: 'var(--font-mono)',
                        width: 160,
                        outline: 'none',
                      }}
                    >
                      <option value={500}>500 rows</option>
                      <option value={1000}>1,000 rows</option>
                      <option value={5000}>5,000 rows (default)</option>
                      <option value={10000}>10,000 rows</option>
                      <option value={50000}>50,000 rows</option>
                      <option value={100000}>100,000 rows</option>
                      <option value={0}>No Limit ⚠</option>
                    </select>
                  </div>
                  {rowLimit === 0 && (
                    <div style={{
                      fontSize: 11,
                      color: '#EF4444',
                      fontFamily: 'var(--font-body)',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 4,
                      padding: '5px 8px',
                      width: '100%',
                    }}>
                      ⚠ No limit removes protection against runaway queries on large tables. Use with caution.
                    </div>
                  )}
                </div>

                <div style={row}>
                  <div>
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>Auto-format on Execute</span>
                    <span style={{ ...lbl, marginTop: 2, marginBottom: 0 }}>Format SQL before running</span>
                  </div>
                  <Toggle checked={autoFormat} onChange={setAutoFormat} />
                </div>
              </div>
            )}

            {section === 'editor' && (
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Editor Settings</div>

                <div style={row}>
                  <div>
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>Font Size</span>
                    <span style={{ ...lbl, marginTop: 2, marginBottom: 0 }}>Editor font size (10–16px)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="range" min={10} max={16} value={editorFontSize}
                      onChange={e => setEditorFontSize(parseInt(e.target.value))}
                      style={{ width: 80, accentColor: 'var(--accent)' }}
                    />
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)', width: 32, textAlign: 'right' }}>{editorFontSize}px</span>
                  </div>
                </div>

                <div style={row}>
                  <div>
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>Word Wrap</span>
                    <span style={{ ...lbl, marginTop: 2, marginBottom: 0 }}>Wrap long lines</span>
                  </div>
                  <Toggle checked={wordWrap} onChange={setWordWrap} />
                </div>

                <div style={row}>
                  <div>
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>Line Numbers</span>
                    <span style={{ ...lbl, marginTop: 2, marginBottom: 0 }}>Show line numbers in editor</span>
                  </div>
                  <Toggle checked={showLineNumbers} onChange={setShowLineNumbers} />
                </div>

                <div style={{ ...row, borderBottom: 'none' }}>
                  <div>
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>Theme</span>
                    <span style={{ ...lbl, marginTop: 2, marginBottom: 0 }}>Dark theme only in this version</span>
                  </div>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '3px 8px' }}>Onobase Dark</span>
                </div>
              </div>
            )}

            {section === 'connections' && (
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Saved Connections</div>
                {history.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', padding: '20px 0' }}>No saved connections.</div>
                ) : history.map((entry, i) => (
                  <div key={i} style={{ ...row, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{entry.label}</div>
                    </div>
                    <button
                      onClick={() => {
                        const h = JSON.parse(localStorage.getItem('onobase_conn_history') || '[]') as { label: string }[]
                        const updated = h.filter((_, j) => j !== i)
                        localStorage.setItem('onobase_conn_history', JSON.stringify(updated))
                      }}
                      style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                        color: '#EF4444', borderRadius: 4, padding: '3px 8px',
                        fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)', flexShrink: 0,
                      }}
                    >Remove</button>
                  </div>
                ))}
              </div>
            )}

            {section === 'ai' && (
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>AI Assistant</div>

                {/* Provider */}
                <div style={row}>
                  <div>
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>Provider</span>
                  </div>
                  <select value={aiProvider}
                    onChange={e => {
                      const p = e.target.value as AiProvider
                      setAiProvider(p)
                      const cfg = AI_PROVIDERS.find(x => x.id === p)
                      if (cfg) setAiModel(cfg.defaultModel)
                    }}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '5px 8px', fontSize: 12, color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-body)' }}
                  >
                    {AI_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>

                {/* Model */}
                <div style={row}>
                  <div>
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>Model</span>
                  </div>
                  {selectedProvider.models.length > 0 ? (
                    <select value={aiModel} onChange={e => setAiModel(e.target.value)}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '5px 8px', fontSize: 12, color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-mono)' }}
                    >
                      {selectedProvider.models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  ) : (
                    <input value={aiModel} onChange={e => setAiModel(e.target.value)}
                      placeholder="model name"
                      style={{ ...numInp, width: 160, textAlign: 'left' }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                    />
                  )}
                </div>

                {/* API Key */}
                {selectedProvider.requiresKey && (
                  <div style={row}>
                    <div>
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>API Key</span>
                      <span style={{ ...lbl, marginTop: 2, marginBottom: 0 }}>Stored locally, never sent elsewhere</span>
                    </div>
                    <input
                      type="password"
                      value={aiApiKeys[aiProvider] ?? ''}
                      onChange={e => setAiApiKey(aiProvider, e.target.value)}
                      placeholder="sk-…"
                      style={{ ...numInp, width: 180, textAlign: 'left' }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                    />
                  </div>
                )}

                {/* Custom base URL */}
                {(aiProvider === 'custom' || aiProvider === 'ollama') && (
                  <div style={row}>
                    <div>
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}>Base URL</span>
                      <span style={{ ...lbl, marginTop: 2, marginBottom: 0 }}>{aiProvider === 'ollama' ? 'http://localhost:11434/api' : 'OpenAI-compatible endpoint'}</span>
                    </div>
                    <input value={aiBaseUrl} onChange={e => setAiBaseUrl(e.target.value)}
                      placeholder={selectedProvider.baseUrl}
                      style={{ ...numInp, width: 200, textAlign: 'left' }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                    />
                  </div>
                )}
              </div>
            )}

            {section === 'appearance' && (
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                  Theme
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {THEMES.map(theme => (
                    <div
                      key={theme.id}
                      onClick={() => setTheme(theme.id)}
                      style={{
                        padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        border: themeId === theme.id ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                        background: themeId === theme.id ? 'var(--accent-dim)' : 'transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
                        {['--bg-primary', '--accent', '--text-secondary'].map(v => (
                          <div key={v} style={{ width: 18, height: 18, borderRadius: 4, background: theme.vars[v], border: '1px solid rgba(255,255,255,0.15)' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 2 }}>{theme.name}</div>
                      <div style={{ fontSize: 10, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>{theme.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'shortcuts' && (
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                  Keyboard Shortcuts
                </div>
                {SHORTCUTS.map(cat => (
                  <div key={cat.category} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-body)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {cat.category}
                    </div>
                    {cat.shortcuts.map(sc => (
                      <div key={sc.action} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>{sc.action}</span>
                        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                          {sc.keys.map((k, i) => (
                            <span key={i}>
                              <kbd style={{
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: 4, padding: '2px 6px',
                                fontSize: 10, fontFamily: 'var(--font-mono)',
                                color: 'var(--text-mono)',
                              }}>{k}</kbd>
                              {i < sc.keys.length - 1 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, margin: '0 2px' }}>+</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {section === 'about' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, background: 'var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#0D1117', fontFamily: 'var(--font-mono)' }}>1</div>
                  <div>
                    <div style={{ fontSize: 18, fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>Onobase</div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', marginTop: 2 }}>One Base for Every Database</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginTop: 4 }}>v0.1.0</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  Onobase is a modern database client for developers.<br />
                  Built with Electron, React, and TypeScript.
                </div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.3)' }}>
                  © 2026 Obnet Pty Ltd. All rights reserved.
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
