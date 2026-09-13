import { useEffect } from 'react'
import { motion } from 'framer-motion'

interface Props {
  message: string
  type: 'warning' | 'info' | 'error'
  onClose: () => void
  duration?: number
}

const COLORS = {
  warning: { bg: '#1C1600', border: '#EAB308', icon: '⚠', text: '#FEF08A' },
  info:    { bg: '#001A26', border: '#3B82F6', icon: 'ℹ', text: '#93C5FD' },
  error:   { bg: '#1A0000', border: '#EF4444', icon: '✕', text: '#FCA5A5' },
}

export default function Toast({ message, type, onClose, duration = 3000 }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [duration, onClose])

  const c = COLORS[type]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px ${c.border}22`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 14 }}>{c.icon}</span>
      <span style={{ fontSize: 12, color: c.text, fontWeight: 500 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: c.text, opacity: 0.6, cursor: 'pointer', padding: '0 0 0 4px', fontSize: 14, lineHeight: 1 }}>×</button>
    </motion.div>
  )
}
