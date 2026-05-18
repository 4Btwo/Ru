import React from 'react'
export default function NetworkBanner({ status }) {
  const visible = status !== 'online'
  const cfg = {
    offline: { icon:'📡', msg:'Sem conexão — você está offline', border:'rgba(255,211,42,0.35)', color:'#ffd32a' },
    'firebase-error': { icon:'⚠️', msg:'Problema ao conectar. Reconectando…', border:'rgba(255,71,87,0.35)', color:'#ff4757' },
  }[status] || {}
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,transform:visible?'translateY(0)':'translateY(-110%)',transition:'transform .35s cubic-bezier(.4,0,.2,1)',pointerEvents:visible?'all':'none'}}>
      <div style={{margin:'10px 14px',background:'rgba(8,8,20,0.96)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:`1px solid ${cfg.border||'rgba(255,255,255,0.1)'}`,borderRadius:16,padding:'12px 16px',display:'flex',alignItems:'center',gap:10,boxShadow:'0 8px 32px rgba(0,0,0,.7)'}}>
        <span style={{fontSize:16}}>{cfg.icon}</span>
        <span style={{flex:1,fontSize:13,fontWeight:700,color:cfg.color,fontFamily:"'DM Sans',sans-serif"}}>{cfg.msg}</span>
        {status==='firebase-error'&&<div style={{width:14,height:14,border:`2px solid ${cfg.color}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin .8s linear infinite',flexShrink:0}}/>}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
