// components/NetworkBanner.jsx
// Banner não-intrusivo que aparece quando o app perde conexão.
// Fica no topo da tela, desliza suavemente, some quando reconectar.

import React from 'react'

export default function NetworkBanner({ status }) {
  const visible = status !== 'online'

  const config = {
    offline: {
      icon: '📡',
      msg: 'Sem conexão — você está offline',
      bg: '#1a1a26',
      border: 'rgba(255, 204, 0, .35)',
      color: '#ffcc00',
    },
    'firebase-error': {
      icon: '⚠️',
      msg: 'Problema ao conectar ao servidor. Tentando reconectar…',
      bg: '#1a1a26',
      border: 'rgba(255, 45, 85, .35)',
      color: '#ff2d55',
    },
  }[status] || {}

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 9999,
      transform: visible ? 'translateY(0)' : 'translateY(-110%)',
      transition: 'transform .35s cubic-bezier(.4,0,.2,1)',
      pointerEvents: visible ? 'all' : 'none',
    }}>
      <div style={{
        margin: '8px 12px',
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 12,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,.5)',
      }}>
        <span style={{ fontSize: 16 }}>{config.icon}</span>
        <span style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 600,
          color: config.color,
          fontFamily: "'Syne', sans-serif",
        }}>
          {config.msg}
        </span>
        {status === 'firebase-error' && (
          <div style={{
            width: 14, height: 14,
            border: `2px solid ${config.color}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin .8s linear infinite',
            flexShrink: 0,
          }} />
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
