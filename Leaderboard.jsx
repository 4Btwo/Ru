import React from 'react'
import { useLeaderboard } from '../hooks/useLeaderboard'

const MEDALS = ['🥇','🥈','🥉']

export default function Leaderboard({ open, onClose, currentUid }) {
  const leaders = useLeaderboard()

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 1999,
        background: 'rgba(0,0,0,.55)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
        transition: 'opacity .3s',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 2000, background: '#12121a',
        borderTop: '1px solid #2a2a3d',
        borderRadius: '20px 20px 0 0',
        padding: '0 16px 36px',
        maxHeight: '70vh', overflowY: 'auto',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .35s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ width: 40, height: 4, background: '#2a2a3d', borderRadius: 2, margin: '12px auto 16px' }} />
        <h2 style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>🏆 Ranking</h2>
        <p style={{ color: '#6666aa', fontSize: 12, marginBottom: 20 }}>Top colaboradores da cidade</p>

        {leaders.map((u, i) => (
          <div key={u.uid} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', borderRadius: 12, marginBottom: 6,
            background: u.uid === currentUid ? 'rgba(255,45,85,.1)' : '#1a1a26',
            border: `1px solid ${u.uid === currentUid ? 'rgba(255,45,85,.4)' : '#2a2a3d'}`,
          }}>
            <span style={{ fontSize: 20, minWidth: 28 }}>{MEDALS[i] || `${i + 1}`}</span>
            <img src={u.photo} alt="" style={{ width: 34, height: 34, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{u.name}</div>
              <div style={{ fontSize: 11, color: '#6666aa' }}>{u.reports || 0} reportes</div>
            </div>
            <div style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: 16, fontWeight: 700, color: '#ffcc00',
            }}>{u.score}</div>
          </div>
        ))}

        {leaders.length === 0 &&
          <p style={{ color: '#6666aa', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            Nenhum reporte ainda. Seja o primeiro!
          </p>
        }
      </div>
    </>
  )
}
