export type AiProvider = 'anthropic' | 'openai' | 'gemini' | 'ollama' | 'custom'

export interface AiProviderConfig {
  id: AiProvider
  label: string
  baseUrl: string
  defaultModel: string
  models: string[]
  requiresKey: boolean
}

export const AI_PROVIDERS: AiProviderConfig[] = [
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-6',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    requiresKey: true,
  },
  {
    id: 'openai',
    label: 'OpenAI (GPT)',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    requiresKey: true,
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    requiresKey: true,
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/api',
    defaultModel: 'llama3',
    models: ['llama3', 'mistral', 'codestral', 'qwen2.5-coder', 'deepseek-coder-v2'],
    requiresKey: false,
  },
  {
    id: 'custom',
    label: 'Custom / OpenAI-compatible',
    baseUrl: '',
    defaultModel: '',
    models: [],
    requiresKey: false,
  },
]

export function getProvider(id: AiProvider): AiProviderConfig {
  return AI_PROVIDERS.find(p => p.id === id) ?? AI_PROVIDERS[0]
}
