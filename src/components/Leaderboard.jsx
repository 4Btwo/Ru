import React from 'react'
import { useLeaderboard } from '../hooks/useLeaderboard'

const MEDALS = ['🥇','🥈','🥉']

export default function Leaderboard({ open, onClose, currentUid }) {
  const leaders = useLeaderboard()

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:1500,
        background:'rgba(0,0,0,.6)', backdropFilter:'blur(2px)',
        display: open ? 'block' : 'none',
      }}/>
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:2000,
        background:'var(--surface)', borderTop:'1px solid var(--border)',
        borderRadius:'20px 20px 0 0', padding:'0 16px 36px',
        maxHeight:'70vh', overflowY:'auto',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ width:40, height:4, background:'var(--border)', borderRadius:2, margin:'12px auto 16px' }}/>
        <p style={{ fontWeight:800, fontSize:17, marginBottom:4 }}>🏆 Ranking</p>
        <p style={{ color:'var(--muted)', fontSize:12, marginBottom:20 }}>Top colaboradores da cidade</p>

        {leaders.length === 0 && (
          <p style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:'20px 0' }}>
            Nenhum reporte ainda — seja o primeiro! 🚀
          </p>
        )}

        {leaders.map((u, i) => (
          <div key={u.uid} style={{
            display:'flex', alignItems:'center', gap:12,
            padding:'10px 12px', borderRadius:12, marginBottom:6,
            background:  u.uid === currentUid ? 'rgba(255,45,85,.08)' : 'var(--surface2)',
            border:      `1px solid ${u.uid === currentUid ? 'rgba(255,45,85,.35)' : 'var(--border)'}`,
          }}>
            <span style={{ fontSize:20, minWidth:28 }}>{MEDALS[i] || `${i+1}`}</span>
            {u.photo
              ? <img src={u.photo} alt="" style={{ width:34, height:34, borderRadius:'50%' }}/>
              : <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center' }}>👤</div>
            }
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:13 }}>{u.name || 'Anônimo'}</div>
              <div style={{ fontSize:11, color:'var(--muted)' }}>{u.reports || 0} reportes</div>
            </div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:16, fontWeight:700, color:'var(--yellow)' }}>
              {u.score || 0}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
