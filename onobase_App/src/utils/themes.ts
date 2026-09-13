/**
 * themes.ts
 * Application theme definitions for Onobase.
 * Onobase — Obnet Pty Ltd © 2026
 */

export type ThemeId = 'dark' | 'light' | 'midnight' | 'forest' | 'ocean'

export interface Theme {
  id: ThemeId
  name: string
  description: string
  vars: Record<string, string>
}

export const THEMES: Theme[] = [
  {
    id: 'dark',
    name: 'Dark (Default)',
    description: 'Classic dark glassmorphic theme',
    vars: {
      '--bg-primary':     '#080C12',
      '--bg-glass':       'rgba(13,17,23,0.80)',
      '--bg-glass-hover': 'rgba(22,27,34,0.90)',
      '--bg-surface':     'rgba(30,41,59,0.60)',
      '--bg-card':        'rgba(22,27,34,0.85)',
      '--border':         'rgba(255,255,255,0.08)',
      '--border-bright':  'rgba(255,255,255,0.15)',
      '--accent':         '#00E5B0',
      '--accent-dim':     'rgba(0,229,176,0.15)',
      '--text-primary':   '#E6EDF3',
      '--text-secondary': '#8B949E',
      '--text-mono':      '#C9D1D9',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Deep blue tones for night work',
    vars: {
      '--bg-primary':     '#0A0E1A',
      '--bg-glass':       'rgba(10,20,40,0.85)',
      '--bg-glass-hover': 'rgba(15,30,60,0.90)',
      '--bg-surface':     'rgba(20,40,80,0.60)',
      '--bg-card':        'rgba(15,25,50,0.90)',
      '--border':         'rgba(100,150,255,0.10)',
      '--border-bright':  'rgba(100,150,255,0.20)',
      '--accent':         '#4D9FFF',
      '--accent-dim':     'rgba(77,159,255,0.15)',
      '--text-primary':   '#E8EEFF',
      '--text-secondary': '#8B9ABE',
      '--text-mono':      '#C0CCEE',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Deep greens for extended sessions',
    vars: {
      '--bg-primary':     '#0A120A',
      '--bg-glass':       'rgba(10,25,10,0.85)',
      '--bg-glass-hover': 'rgba(15,35,15,0.90)',
      '--bg-surface':     'rgba(20,50,20,0.60)',
      '--bg-card':        'rgba(12,30,12,0.90)',
      '--border':         'rgba(100,200,100,0.10)',
      '--border-bright':  'rgba(100,200,100,0.20)',
      '--accent':         '#4CAF50',
      '--accent-dim':     'rgba(76,175,80,0.15)',
      '--text-primary':   '#E8F5E8',
      '--text-secondary': '#8BAA8B',
      '--text-mono':      '#C0DCC0',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Calming blue-green tones',
    vars: {
      '--bg-primary':     '#080F14',
      '--bg-glass':       'rgba(8,20,30,0.85)',
      '--bg-glass-hover': 'rgba(12,30,45,0.90)',
      '--bg-surface':     'rgba(15,40,60,0.60)',
      '--bg-card':        'rgba(10,25,40,0.90)',
      '--border':         'rgba(0,180,200,0.10)',
      '--border-bright':  'rgba(0,180,200,0.20)',
      '--accent':         '#00BCD4',
      '--accent-dim':     'rgba(0,188,212,0.15)',
      '--text-primary':   '#E0F4F8',
      '--text-secondary': '#7AAABB',
      '--text-mono':      '#B0D8E0',
    },
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Clean light theme for bright environments',
    vars: {
      '--bg-primary':     '#F5F7FA',
      '--bg-glass':       'rgba(255,255,255,0.90)',
      '--bg-glass-hover': 'rgba(245,247,250,0.95)',
      '--bg-surface':     'rgba(220,230,245,0.60)',
      '--bg-card':        'rgba(255,255,255,0.95)',
      '--border':         'rgba(0,0,0,0.08)',
      '--border-bright':  'rgba(0,0,0,0.15)',
      '--accent':         '#0070F3',
      '--accent-dim':     'rgba(0,112,243,0.12)',
      '--text-primary':   '#1A1F2E',
      '--text-secondary': '#5C6370',
      '--text-mono':      '#2D3748',
    },
  },
]

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value)
  }
  document.documentElement.setAttribute('data-theme', theme.id)
}
