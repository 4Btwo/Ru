import React from 'react'
import { useLeaderboard } from '../hooks/useLeaderboard'

const MEDALS = ['🥇','🥈','🥉']
const T = { muted:'rgba(240,240,255,0.38)', text:'#f0f0ff', dim:'rgba(240,240,255,0.16)' }

export default function Leaderboard({ open, onClose, currentUid }) {
  const leaders = useLeaderboard()
  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:1500,background:'rgba(0,0,0,.74)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',opacity:open?1:0,pointerEvents:open?'all':'none',transition:'opacity .3s'}}/>
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:2000,background:'rgba(8,8,20,0.97)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',borderRadius:'28px 28px 0 0',padding:'0 16px',paddingBottom:'calc(32px + env(safe-area-inset-bottom,0px))',maxHeight:'72vh',overflowY:'auto',transform:open?'translateY(0)':'translateY(100%)',transition:'transform .38s cubic-bezier(.32,.72,0,1)'}}>
        <div style={{width:36,height:4,background:'rgba(255,255,255,0.15)',borderRadius:2,margin:'14px auto 20px'}}/>
        
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
          <div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,letterSpacing:'-.03em',color:T.text,marginBottom:3}}>🏆 Ranking</div>
            <div style={{fontSize:12,color:T.muted,fontWeight:500}}>Top colaboradores da cidade</div>
          </div>
          <button onClick={onClose} style={{width:34,height:34,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)',cursor:'pointer',color:'rgba(240,240,255,0.45)',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        {leaders.length===0 ? (
          <div style={{textAlign:'center',padding:'40px 0',color:T.muted}}>
            <div style={{fontSize:36,marginBottom:12}}>🏅</div>
            <div style={{fontSize:13,fontWeight:600}}>Nenhum reporte ainda — seja o primeiro! 🚀</div>
          </div>
        ) : leaders.map((u,i)=>(
          <div key={u.uid} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:18,marginBottom:8,background:u.uid===currentUid?'rgba(79,142,255,0.08)':'rgba(255,255,255,0.03)',border:`1px solid ${u.uid===currentUid?'rgba(79,142,255,0.3)':'rgba(255,255,255,0.06)'}`,boxShadow:i===0?'0 0 16px rgba(255,174,0,0.1)':'none'}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:i===0?'rgba(255,174,0,0.15)':i===1?'rgba(148,163,184,0.12)':i===2?'rgba(161,98,7,0.12)':'rgba(255,255,255,0.05)',border:`1px solid ${i===0?'rgba(255,174,0,0.3)':i===1?'rgba(148,163,184,0.25)':i===2?'rgba(161,98,7,0.25)':'rgba(255,255,255,0.07)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0}}>
              {MEDALS[i]||<span style={{fontFamily:"'Space Mono',monospace",fontSize:10,fontWeight:700,color:T.muted}}>{i+1}</span>}
            </div>
            <div style={{width:38,height:38,borderRadius:'50%',overflow:'hidden',flexShrink:0,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
              {u.photo?<img src={u.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'👤'}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.name||'Anônimo'}</div>
              <div style={{fontSize:11,color:T.muted,marginTop:1}}>{u.reports||0} reportes</div>
            </div>
            <div style={{fontFamily:"'Space Mono',monospace",fontSize:16,fontWeight:700,color:'#ffd32a',letterSpacing:'-.02em'}}>{u.score||0}</div>
          </div>
        ))}
      </div>
    </>
  )
}
