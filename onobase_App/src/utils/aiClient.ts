import type { AiProvider } from './aiProviders'

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiRequestConfig {
  provider: AiProvider
  apiKey: string
  model: string
  baseUrl: string
  messages: AiMessage[]
  systemPrompt?: string
}

export interface AiResponse {
  ok: true
  text: string
}

export interface AiError {
  ok: false
  error: string
}

async function callAnthropic(cfg: AiRequestConfig): Promise<AiResponse | AiError> {
  const res = await fetch(`${cfg.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 2048,
      system: cfg.systemPrompt ?? 'You are a helpful SQL assistant.',
      messages: cfg.messages.map(m => ({ role: m.role, content: m.content })),
    }),
  })
  if (!res.ok) return { ok: false, error: `Anthropic error ${res.status}: ${await res.text()}` }
  const data = await res.json() as { content: { type: string; text: string }[] }
  const text = data.content.find(c => c.type === 'text')?.text ?? ''
  return { ok: true, text }
}

async function callOpenAI(cfg: AiRequestConfig): Promise<AiResponse | AiError> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`
  const body: Record<string, unknown> = {
    model: cfg.model,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: cfg.systemPrompt ?? 'You are a helpful SQL assistant.' },
      ...cfg.messages,
    ],
  }
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) return { ok: false, error: `API error ${res.status}: ${await res.text()}` }
  const data = await res.json() as { choices: { message: { content: string } }[] }
  return { ok: true, text: data.choices[0]?.message?.content ?? '' }
}

async function callGemini(cfg: AiRequestConfig): Promise<AiResponse | AiError> {
  const url = `${cfg.baseUrl}/models/${cfg.model}:generateContent?key=${cfg.apiKey}`
  const contents = cfg.messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  })
  if (!res.ok) return { ok: false, error: `Gemini error ${res.status}: ${await res.text()}` }
  const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] }
  const text = data.candidates[0]?.content?.parts[0]?.text ?? ''
  return { ok: true, text }
}

async function callOllama(cfg: AiRequestConfig): Promise<AiResponse | AiError> {
  const res = await fetch(`${cfg.baseUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: cfg.systemPrompt ?? 'You are a helpful SQL assistant.' },
        ...cfg.messages,
      ],
      stream: false,
    }),
  })
  if (!res.ok) return { ok: false, error: `Ollama error ${res.status}: ${await res.text()}` }
  const data = await res.json() as { message: { content: string } }
  return { ok: true, text: data.message?.content ?? '' }
}

export async function sendAiMessage(cfg: AiRequestConfig): Promise<AiResponse | AiError> {
  try {
    switch (cfg.provider) {
      case 'anthropic': return await callAnthropic(cfg)
      case 'openai':    return await callOpenAI(cfg)
      case 'gemini':    return await callGemini(cfg)
      case 'ollama':    return await callOllama(cfg)
      case 'custom':    return await callOpenAI(cfg)  // OpenAI-compatible
      default:          return { ok: false, error: 'Unknown provider' }
    }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
