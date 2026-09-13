import { create } from 'zustand'
import type { Connection, DbType } from '../types'

interface ConnectionStore {
  connections: Connection[]
  activeConnectionId: string | null

  addConnection: (conn: Connection) => void
  removeConnection: (id: string) => void
  updateConnection: (id: string, updates: Partial<Connection>) => void
  setActive: (id: string | null) => void
  getActive: () => Connection | undefined
  setStatus: (id: string, status: Connection['status'], errorMessage?: string) => void
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  connections: [],
  activeConnectionId: null,

  addConnection: (conn) => set(s => ({ connections: [...s.connections, conn] })),
  removeConnection: (id) => set(s => ({
    connections: s.connections.filter(c => c.id !== id),
    activeConnectionId: s.activeConnectionId === id ? null : s.activeConnectionId,
  })),
  updateConnection: (id, updates) => set(s => ({
    connections: s.connections.map(c => c.id === id ? { ...c, ...updates } : c),
  })),
  setActive: (activeConnectionId) => set({ activeConnectionId }),
  getActive: () => get().connections.find(c => c.id === get().activeConnectionId),
  setStatus: (id, status, errorMessage) => set(s => ({
    connections: s.connections.map(c =>
      c.id === id ? { ...c, status, errorMessage } : c
    ),
  })),
}))

// ── Helpers ────────────────────────────────────────────────────────────────────
export function dbTypeLabel(type: DbType): string {
  return { postgresql: 'PostgreSQL', mysql: 'MySQL', mssql: 'SQL Server', sqlite: 'SQLite', oracle: 'Oracle' }[type]
}

export function dbTypeBadge(type: DbType): string {
  return { postgresql: 'PG', mysql: 'MY', mssql: 'MS', sqlite: 'SL', oracle: 'OR' }[type]
}
