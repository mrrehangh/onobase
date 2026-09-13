import { create } from 'zustand'
import type { Module, ToastMessage } from '../types'
import { nextColor } from '../utils/colors'

let counter = 0

interface ModuleStore {
  modules: Module[]
  selectedModuleId: string | null
  toasts: ToastMessage[]

  addModule: () => string                       // returns new id
  updateModule: (id: string, patch: Partial<Module>) => void
  removeModule: (id: string) => void
  setSelectedModule: (id: string | null) => void

  addTableToModule: (tableId: string, moduleId: string, relPos?: { x: number; y: number }) => void
  removeTableFromModule: (tableId: string, moduleId: string) => void
  updateTablePosition: (tableId: string, moduleId: string, pos: { x: number; y: number }) => void

  reset: () => void
  dismissToast: (id: string) => void

  saveLayout: (connectionKey: string) => Promise<void>
  loadLayout: (connectionKey: string) => Promise<void>
}

function defaultRelPos(index: number) {
  const cols = 2
  return {
    x: 16 + (index % cols) * 240,
    y: 50 + Math.floor(index / cols) * 220,
  }
}

export const useModuleStore = create<ModuleStore>((set, get) => ({
  modules: [],
  selectedModuleId: null,
  toasts: [],

  // ── Module CRUD ────────────────────────────────────────────────────────────
  addModule: () => {
    counter++
    const id = 'mod' + Date.now()
    const usedColors = get().modules.map(m => m.colorId)
    const color = nextColor(usedColors)
    const col = Math.ceil(counter / 3)
    set(s => ({
      modules: [...s.modules, {
        id, name: 'Module ' + counter, colorId: color.id,
        position: { x: ((counter - 1) % 3) * 380 + 40, y: (col - 1) * 300 + 40 },
        size: { width: 340, height: 260 },
        collapsed: false,
        tableIds: [], tablePositions: {}, connections: [],
      }],
      selectedModuleId: id,
    }))
    return id
  },

  updateModule: (id, patch) => set(s => ({
    modules: s.modules.map(m => m.id === id ? { ...m, ...patch } : m),
  })),

  removeModule: (id) => set(s => ({
    modules: s.modules.filter(m => m.id !== id),
    selectedModuleId: s.selectedModuleId === id ? null : s.selectedModuleId,
  })),

  setSelectedModule: (selectedModuleId) => set({ selectedModuleId }),

  // ── Table membership — RULES ENFORCED HERE ─────────────────────────────────
  addTableToModule: (tableId, moduleId, relPos) => {
    const { modules, toasts } = get()
    const target = modules.find(m => m.id === moduleId)

    // Rule 2: Prevent duplicate in same module
    if (target?.tableIds.includes(tableId)) {
      set({ toasts: [...toasts, {
        id: Date.now().toString(),
        message: `Table is already in "${target.name}"`,
        type: 'warning',
      }]})
      return
    }

    set(s => {
      // Rule 1: Remove from existing module first (atomic)
      const withRemoved = s.modules.map(m => {
        if (m.tableIds.includes(tableId) && m.id !== moduleId) {
          const { [tableId]: _d, ...rest } = m.tablePositions
          return { ...m, tableIds: m.tableIds.filter(t => t !== tableId), tablePositions: rest }
        }
        return m
      })

      const pos = relPos ?? defaultRelPos(
        withRemoved.find(m => m.id === moduleId)?.tableIds.length ?? 0
      )

      return {
        modules: withRemoved.map(m =>
          m.id === moduleId
            ? { ...m, tableIds: [...m.tableIds, tableId], tablePositions: { ...m.tablePositions, [tableId]: pos } }
            : m
        ),
      }
    })
  },

  removeTableFromModule: (tableId, moduleId) => {
    set(s => ({
      modules: s.modules.map(m => {
        if (m.id !== moduleId) return m
        const { [tableId]: _d, ...rest } = m.tablePositions
        return { ...m, tableIds: m.tableIds.filter(t => t !== tableId), tablePositions: rest }
      }),
    }))
  },

  updateTablePosition: (tableId, moduleId, pos) => set(s => ({
    modules: s.modules.map(m =>
      m.id === moduleId
        ? { ...m, tablePositions: { ...m.tablePositions, [tableId]: pos } }
        : m
    ),
  })),

  reset: () => {
    counter = 0
    set({ modules: [], selectedModuleId: null, toasts: [] })
  },

  dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  saveLayout: async (connectionKey) => {
    const { modules } = get()
    const layout = modules.map(m => ({
      id: m.id,
      name: m.name,
      colorId: m.colorId,
      position: m.position,
      size: m.size,
      collapsed: m.collapsed,
      tableIds: m.tableIds,
      tablePositions: m.tablePositions,
      connections: m.connections,
    }))
    await window.electronAPI.saveLayout(connectionKey, layout)
  },

  loadLayout: async (connectionKey) => {
    const result = await window.electronAPI.loadLayout(connectionKey)
    if (!result.ok || !result.layout) return
    const layout = result.layout as Module[]
    counter = layout.length
    set({ modules: layout, selectedModuleId: null, toasts: [] })
  },
}))
