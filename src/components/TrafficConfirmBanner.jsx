// ── BANNER DE CONFIRMAÇÃO DE TRÂNSITO ────────────────────────────────────────
// Aparece quando o usuário está perto de um ponto de trânsito ativo
import React, { useState, useEffect } from 'react'
import { EVENT_META } from '../lib/constants'

export default function TrafficConfirmBanner({ prompt, onConfirm, onResolve, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (prompt) {
      setVisible(true)
    } else {
      setVisible(false)
    }
  }, [prompt])

  if (!prompt) return null

  const meta = EVENT_META[prompt.type]
  const color = meta?.color || '#ff6b35'

  const handleConfirm = () => {
    onConfirm(prompt.place.id, prompt.type)
    onDismiss()
  }
  const handleResolve = () => {
    onResolve(prompt.place.id, prompt.type)
    onDismiss()
  }

  return (
    <div style={{
      position:'fixed', top:0, left:0, right:0, zIndex:3100,
      transform: visible ? 'translateY(0)' : 'translateY(-110%)',
      transition:'transform .4s cubic-bezier(.4,0,.2,1)',
    }}>
      <div style={{
        margin:'12px 16px 0',
        background:'var(--surface)',
        border:`1px solid ${color}55`,
        borderRadius:16,
        padding:'14px 16px',
        boxShadow:`0 4px 24px rgba(0,0,0,.6), 0 0 0 1px ${color}22`,
      }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{
            width:36, height:36, borderRadius:10, flexShrink:0,
            background:`${color}20`, border:`1px solid ${color}44`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
          }}>
            {meta?.emoji || '🚗'}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:2 }}>
              Você está perto — ainda acontecendo?
            </div>
            <div style={{ fontSize:11, color:'var(--muted)' }}>
              📍 {prompt.place.name} · {meta?.label}
            </div>
          </div>
          <button onClick={onDismiss} style={{
            width:28, height:28, borderRadius:8, border:'none',
            background:'var(--surface2)', color:'var(--muted)', cursor:'pointer', fontSize:14,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>✕</button>
        </div>

        {/* Ações */}
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={handleConfirm} style={{
            flex:1, padding:'10px 8px', borderRadius:10, border:`1px solid ${color}44`,
            background:`${color}15`, color,
            fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:12, cursor:'pointer',
            transition:'all .15s',
          }}>
            ✅ Ainda acontecendo
          </button>
          <button onClick={handleResolve} style={{
            flex:1, padding:'10px 8px', borderRadius:10, border:'1px solid rgba(0,255,136,.3)',
            background:'rgba(0,255,136,.1)', color:'#00ff88',
            fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:12, cursor:'pointer',
            transition:'all .15s',
          }}>
            ✅ Já resolveu
          </button>
        </div>

        {/* Incentivo */}
        <div style={{ marginTop:8, fontSize:10, color:'#4a4a6a', textAlign:'center' }}>
          +5 pts por confirmar · +8 pts por resolver 🏅
        </div>
      </div>
    </div>
  )
}
