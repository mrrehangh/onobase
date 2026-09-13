import type { ModuleColor } from '../types'

export const MODULE_COLORS: ModuleColor[] = [
  { id: 'teal',        hex: '#00E5B0', bg: '#00E5B01A' },
  { id: 'blue',        hex: '#3B82F6', bg: '#3B82F61A' },
  { id: 'purple',      hex: '#8B5CF6', bg: '#8B5CF61A' },
  { id: 'orange',      hex: '#F97316', bg: '#F973161A' },
  { id: 'pink',        hex: '#EC4899', bg: '#EC48991A' },
  { id: 'yellow',      hex: '#EAB308', bg: '#EAB3081A' },
  { id: 'red',         hex: '#EF4444', bg: '#EF44441A' },
  { id: 'cyan',        hex: '#06B6D4', bg: '#06B6D41A' },
  { id: 'green',       hex: '#22C55E', bg: '#22C55E1A' },
  { id: 'indigo',      hex: '#6366F1', bg: '#6366F11A' },
  { id: 'rose',        hex: '#F43F5E', bg: '#F43F5E1A' },
  { id: 'amber',       hex: '#F59E0B', bg: '#F59E0B1A' },
  { id: 'lime',        hex: '#84CC16', bg: '#84CC161A' },
  { id: 'emerald',     hex: '#10B981', bg: '#10B9811A' },
  { id: 'sky',         hex: '#0EA5E9', bg: '#0EA5E91A' },
  { id: 'violet',      hex: '#7C3AED', bg: '#7C3AED1A' },
  { id: 'fuchsia',     hex: '#D946EF', bg: '#D946EF1A' },
  { id: 'slate',       hex: '#64748B', bg: '#64748B1A' },
  { id: 'zinc',        hex: '#71717A', bg: '#71717A1A' },
  { id: 'coral',       hex: '#FF6B6B', bg: '#FF6B6B1A' },
  { id: 'gold',        hex: '#FFD700', bg: '#FFD7001A' },
  { id: 'mint',        hex: '#00FFB3', bg: '#00FFB31A' },
  { id: 'lavender',    hex: '#B794F4', bg: '#B794F41A' },
  { id: 'salmon',      hex: '#FA8072', bg: '#FA80721A' },
  { id: 'turquoise',   hex: '#40E0D0', bg: '#40E0D01A' },
  { id: 'crimson',     hex: '#DC143C', bg: '#DC143C1A' },
  { id: 'royalblue',   hex: '#4169E1', bg: '#4169E11A' },
  { id: 'seagreen',    hex: '#2E8B57', bg: '#2E8B571A' },
  { id: 'hotpink',     hex: '#FF69B4', bg: '#FF69B41A' },
  { id: 'deepskyblue', hex: '#00BFFF', bg: '#00BFFF1A' },
  { id: 'chartreuse',  hex: '#7FFF00', bg: '#7FFF001A' },
  { id: 'tomato',      hex: '#FF6347', bg: '#FF63471A' },
  { id: 'steelblue',   hex: '#4682B4', bg: '#4682B41A' },
  { id: 'medorchid',   hex: '#BA55D3', bg: '#BA55D31A' },
  { id: 'darkorange',  hex: '#FF8C00', bg: '#FF8C001A' },
  { id: 'medseagreen', hex: '#3CB371', bg: '#3CB3711A' },
  { id: 'dodgerblue',  hex: '#1E90FF', bg: '#1E90FF1A' },
  { id: 'paleviolet',  hex: '#DB7093', bg: '#DB70931A' },
  { id: 'springgreen', hex: '#00FA9A', bg: '#00FA9A1A' },
  { id: 'sandybrown',  hex: '#F4A460', bg: '#F4A4601A' },
]

export function getModuleColor(colorId: string, customHex?: string): ModuleColor {
  if (colorId.startsWith('custom_') && customHex) {
    return { id: colorId, hex: customHex, bg: customHex + '1A' }
  }
  return MODULE_COLORS.find(c => c.id === colorId) ?? MODULE_COLORS[0]
}

export function nextColor(usedIds: string[]): ModuleColor {
  const used = new Set(usedIds)
  return MODULE_COLORS.find(c => !used.has(c.id)) ?? MODULE_COLORS[usedIds.length % MODULE_COLORS.length]
}
