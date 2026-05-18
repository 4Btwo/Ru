import React, { useState, useEffect } from 'react'
import { EVENT_META } from '../lib/constants'
export default function TrafficConfirmBanner({ prompt, onConfirm, onResolve, onDismiss }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setVisible(!!prompt) }, [prompt])
  if (!prompt) return null
  const meta  = EVENT_META[prompt.type]
  const color = meta?.color || '#ff6b35'
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,zIndex:3100,transform:visible?'translateY(0)':'translateY(-110%)',transition:'transform .4s cubic-bezier(.32,.72,0,1)'}}>
      <div style={{margin:'12px 16px 0',background:'rgba(8,8,20,0.96)',backdropFilter:'blur(32px)',WebkitBackdropFilter:'blur(32px)',border:`1px solid ${color}44`,borderRadius:20,padding:'14px 16px',boxShadow:`0 8px 32px rgba(0,0,0,.7),0 0 0 1px ${color}1a`}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
          <div style={{width:40,height:40,borderRadius:12,flexShrink:0,background:`${color}18`,border:`1px solid ${color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{meta?.emoji||'🚗'}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:800,marginBottom:2,fontFamily:"'Outfit',sans-serif",color:'#f0f0ff'}}>Você está perto — ainda acontecendo?</div>
            <div style={{fontSize:11,color:'rgba(240,240,255,0.45)',fontFamily:"'DM Sans',sans-serif"}}>📍 {prompt.place.name} · {meta?.label}</div>
          </div>
          <button onClick={onDismiss} style={{width:30,height:30,borderRadius:999,border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.05)',color:'rgba(240,240,255,0.45)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>{onConfirm(prompt.place.id,prompt.type);onDismiss()}} style={{flex:1,padding:'10px',borderRadius:12,border:`1px solid ${color}44`,background:`${color}14`,color,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,cursor:'pointer'}}>✅ Ainda acontecendo</button>
          <button onClick={()=>{onResolve(prompt.place.id,prompt.type);onDismiss()}} style={{flex:1,padding:'10px',borderRadius:12,border:'1px solid rgba(0,245,160,0.3)',background:'rgba(0,245,160,0.08)',color:'#00f5a0',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,cursor:'pointer'}}>✅ Já resolveu</button>
        </div>
        <div style={{marginTop:8,fontSize:10,color:'rgba(240,240,255,0.25)',textAlign:'center',fontFamily:"'DM Sans',sans-serif"}}>+5 pts por confirmar · +8 pts por resolver 🏅</div>
      </div>
    </div>
  )
}
