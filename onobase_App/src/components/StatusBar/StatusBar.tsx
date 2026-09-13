import { Database, Clock, Rows3, ZoomIn } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useModuleStore } from '../../store/useModuleStore'
import { dbTypeLabel } from '../../store/useConnectionStore'
import type { Connection } from '../../types'
import pkg from '../../../package.json'

interface Props {
  connection: Connection | null
  tableCount: number
  sshActive?: boolean
}

export default function StatusBar({ connection, tableCount, sshActive }: Props) {
  const { lastQueryDuration, lastRowCount, zoom } = useAppStore()
  const { modules } = useModuleStore()


  return (
    <div style={{
      height: 28,
      background: 'rgba(8, 12, 18, 0.95)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center',
      padding: '0 12px',
      gap: 0,
      flexShrink: 0,
      zIndex: 10,
      userSelect: 'none',
    }}>

      {/* ── Left: connection ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginRight: 16 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: connection ? '#00E5B0' : '#484F58',
          boxShadow: connection ? '0 0 6px rgba(0,229,176,0.6)' : 'none',
        }} />
        {connection ? (
          <>
            <span style={{ fontSize: 11, color: '#8B949E', fontFamily: 'var(--font-mono)' }}>
              {connection.database}
            </span>
            <span style={{
              fontSize: 9, color: '#00E5B0',
              background: 'rgba(0,229,176,0.1)',
              border: '1px solid rgba(0,229,176,0.2)',
              borderRadius: 3, padding: '0px 4px',
              fontFamily: 'var(--font-mono)',
            }}>
              {dbTypeLabel(connection.type)}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 11, color: '#484F58' }}>Not connected</span>
        )}
      </div>

      <Divider />

      {/* ── Center-left: stats ── */}
      <StatusItem icon={<Database size={10} />} label={`${modules.length} modules`} />
      <StatusItem icon={<Rows3 size={10} />} label={`${tableCount} tables`} />

      {lastQueryDuration !== null && (
        <>
          <Divider />
          <StatusItem icon={<Clock size={10} />} label={`${lastQueryDuration}ms`} accent />
          {lastRowCount !== null && (
            <StatusItem icon={null} label={`${lastRowCount.toLocaleString()} rows`} />
          )}
        </>
      )}

      {/* ── Right: SSH + zoom + version ── */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
        {sshActive && (
          <>
            <Divider />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', fontSize: 10, color: '#8B5CF6', fontFamily: 'var(--font-mono)' }}>
              <span style={{ fontSize: 11 }}>🔒</span> SSH
            </div>
          </>
        )}
        <Divider />
        <StatusItem icon={<ZoomIn size={10} />} label={`${Math.round(zoom * 100)}%`} />
        <Divider />
        <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'var(--font-mono)', padding: '0 8px' }}>
          v{pkg.version}
        </span>
      </div>
    </div>
  )
}

function StatusItem({ icon, label, accent }: { icon: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '0 8px', height: '100%',
      fontSize: 11,
      color: accent ? '#00E5B0' : '#8B949E',
      fontFamily: 'var(--font-mono)',
    }}>
      {icon && <span style={{ opacity: 0.7 }}>{icon}</span>}
      {label}
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
}
