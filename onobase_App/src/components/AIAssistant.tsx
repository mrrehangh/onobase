import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { getProvider } from '../utils/aiProviders'
import { sendAiMessage, type AiMessage } from '../utils/aiClient'
import type { SchemaData } from './ObjectExplorer'

interface Props {
  onClose(): void
  schema: SchemaData | null
}

const SYSTEM_PROMPT = `You are an expert SQL assistant integrated into Onobase, a database GUI tool.
Help the user write, optimize, and understand SQL queries.
When providing SQL, wrap it in triple backticks with the sql language tag.
Be concise and practical. If you suggest SQL, explain what it does briefly.`

const MONO = "'JetBrains Mono', 'Cascadia Code', monospace"

export default function AIAssistant({ onClose, schema }: Props) {
  const { aiProvider, aiModel, aiBaseUrl, aiApiKeys } = useAppStore()
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const providerConfig = getProvider(aiProvider)
  const effectiveBaseUrl = aiProvider === 'custom' ? aiBaseUrl : (aiBaseUrl || providerConfig.baseUrl)
  const apiKey = aiApiKeys[aiProvider] ?? ''

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    // Build context from schema if available
    let schemaContext = ''
    if (schema && schema.tables.length > 0 && messages.length === 0) {
      const tableList = schema.tables.slice(0, 30).map(t => `${t.table_schema}.${t.table_name}`).join(', ')
      schemaContext = `\n\n[Database context: tables available: ${tableList}]`
    }

    const userMsg: AiMessage = { role: 'user', content: text + schemaContext }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    const res = await sendAiMessage({
      provider: aiProvider,
      apiKey,
      model: aiModel,
      baseUrl: effectiveBaseUrl,
      messages: newMessages,
      systemPrompt: SYSTEM_PROMPT,
    })

    setLoading(false)
    if (res.ok) {
      setMessages(m => [...m, { role: 'assistant', content: res.text }])
    } else {
      setError(res.error)
    }
  }

  const insertSQL = (sql: string) => {
    const event = new CustomEvent('onobase:insertSnippet', { detail: { sql } })
    document.dispatchEvent(event)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: 360, height: '100%',
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
        <span style={{ fontSize: 10, background: 'rgba(0,229,176,0.15)', color: '#00E5B0', border: '1px solid rgba(0,229,176,0.3)', borderRadius: 3, padding: '1px 6px', fontFamily: 'var(--font-mono)' }}>
          AI
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#C9D1D9', fontFamily: 'var(--font-body)', flex: 1 }}>
          Query Assistant
        </span>
        <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-body)' }}>
          {aiProvider} · {aiModel.split('-').slice(0, 2).join('-')}
        </span>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none',
          color: '#484F58', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#C9D1D9' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#484F58' }}
        >×</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#484F58', fontSize: 11, fontFamily: 'var(--font-body)', lineHeight: 1.7 }}>
            Ask anything about SQL, your schema, or<br />
            query optimization.
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Write a SELECT with JOINs', 'Explain this query plan', 'How do I add an index?'].map(hint => (
                <button key={hint} onClick={() => { setInput(hint); textareaRef.current?.focus() }}
                  style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 5, color: '#8B949E', padding: '5px 10px', fontSize: 11,
                    cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left',
                  }}
                >{hint}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} onInsertSQL={insertSQL} />
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#00E5B0',
                opacity: 0.6,
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 5, padding: '8px 10px', fontSize: 11, color: '#EF4444', fontFamily: 'var(--font-body)' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: 10, flexShrink: 0 }}>
        {!apiKey && providerConfig.requiresKey && (
          <div style={{ fontSize: 10, color: '#EAB308', marginBottom: 6, fontFamily: 'var(--font-body)' }}>
            ⚠ No API key set for {aiProvider}. Configure in Settings → AI.
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
          }}
          placeholder="Ask about SQL… (Enter to send, Shift+Enter for newline)"
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 5, padding: '7px 8px',
            fontSize: 11, color: '#C9D1D9',
            fontFamily: 'var(--font-body)', resize: 'none', outline: 'none',
            lineHeight: 1.5,
          }}
          onFocus={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'rgba(0,229,176,0.4)' }}
          onBlur={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <button onClick={() => { setMessages([]); setError(null) }}
            style={{ background: 'transparent', border: 'none', color: '#484F58', fontSize: 10, cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0 }}>
            Clear chat
          </button>
          <button onClick={send} disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? 'rgba(0,229,176,0.2)' : 'var(--accent)',
              border: 'none', borderRadius: 5,
              color: loading || !input.trim() ? '#484F58' : '#0D1117',
              padding: '5px 14px', fontSize: 11, fontWeight: 600,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
            }}>
            {loading ? '…' : 'Send'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8) }
          50% { opacity: 1; transform: scale(1.2) }
        }
      `}</style>
    </div>
  )
}

// Extract SQL code blocks from markdown text
function parseContent(text: string): { type: 'text' | 'sql'; content: string }[] {
  const parts: { type: 'text' | 'sql'; content: string }[] = []
  const regex = /```(?:sql)?\n?([\s\S]*?)```/g
  let last = 0; let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index) })
    parts.push({ type: 'sql', content: m[1].trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) })
  return parts
}

function MessageBubble({ msg, onInsertSQL }: { msg: AiMessage; onInsertSQL(sql: string): void }) {
  const isUser = msg.role === 'user'
  const parts = isUser ? null : parseContent(msg.content)

  return (
    <div style={{
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      maxWidth: '90%',
    }}>
      {isUser ? (
        <div style={{
          background: 'rgba(0,229,176,0.12)', border: '1px solid rgba(0,229,176,0.2)',
          borderRadius: '10px 10px 2px 10px',
          padding: '7px 10px', fontSize: 11, color: '#C9D1D9',
          fontFamily: 'var(--font-body)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
        }}>
          {msg.content}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(parts ?? []).map((part, i) =>
            part.type === 'sql' ? (
              <div key={i} style={{ position: 'relative' }}>
                <pre style={{
                  margin: 0, padding: '8px 10px', paddingRight: 60,
                  background: '#161B22', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 5, fontFamily: MONO, fontSize: 10,
                  color: '#C9D1D9', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  lineHeight: 1.6,
                }}>
                  {part.content}
                </pre>
                <button
                  onClick={() => onInsertSQL(part.content)}
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    background: 'rgba(0,229,176,0.15)', border: '1px solid rgba(0,229,176,0.3)',
                    borderRadius: 4, color: '#00E5B0', padding: '2px 7px', fontSize: 9,
                    cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
                  }}
                >Insert</button>
              </div>
            ) : (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '2px 10px 10px 10px',
                padding: '7px 10px', fontSize: 11, color: '#C9D1D9',
                fontFamily: 'var(--font-body)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>
                {part.content.trim()}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
