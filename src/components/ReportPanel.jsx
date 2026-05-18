import React, { useState } from 'react'

const GROUPS = {
  noturno:        { label:'🌙 Vida Noturna',        btns:[{t:'cheio',e:'🍻',l:'Tá cheio',a:'#ff4757'},{t:'evento',e:'🎉',l:'Evento',a:'#7c5cfc'},{t:'morto',e:'😴',l:'Tá vazio',a:'#6b7280'},{t:'fila',e:'🚶',l:'Tem fila',a:'#ff6b35'},{t:'show',e:'🎤',l:'Show ao vivo',a:'#b44cf0'},{t:'promo',e:'💸',l:'Promoção',a:'#00f5a0'}]},
  estabelecimento:{ label:'🏪 Estabelecimento',      btns:[{t:'cheio',e:'👥',l:'Lotado',a:'#ff4757'},{t:'morto',e:'😴',l:'Vazio',a:'#6b7280'},{t:'evento',e:'🎉',l:'Promoção',a:'#7c5cfc'},{t:'fila',e:'🚶',l:'Fila',a:'#ff6b35'},{t:'fechado',e:'🔒',l:'Fechado',a:'#64748b'},{t:'promo',e:'💸',l:'Oferta',a:'#00f5a0'}]},
  bar:            { label:'🍺 Bar',                  btns:[{t:'cheio',e:'🍻',l:'Lotado',a:'#ff4757'},{t:'evento',e:'🎉',l:'Evento',a:'#7c5cfc'},{t:'morto',e:'😴',l:'Vazio',a:'#6b7280'},{t:'promo',e:'💸',l:'Happy Hour',a:'#00f5a0'},{t:'fila',e:'🚶',l:'Fila',a:'#ff6b35'},{t:'show',e:'🎤',l:'Show',a:'#b44cf0'}]},
  show:           { label:'🎭 Show / Evento',        btns:[{t:'cheio',e:'🔥',l:'Lotado',a:'#ff4757'},{t:'evento',e:'🎤',l:'Rolando',a:'#7c5cfc'},{t:'fila',e:'🚶',l:'Fila grande',a:'#ff6b35'},{t:'morto',e:'😴',l:'Cancelado',a:'#6b7280'}]},
  parque:         { label:'🌿 Parque / Área',        btns:[{t:'cheio',e:'🏃',l:'Movimentado',a:'#ff4757'},{t:'morto',e:'😌',l:'Tranquilo',a:'#00f5a0'},{t:'evento',e:'🎪',l:'Evento',a:'#7c5cfc'},{t:'perigo',e:'⚠️',l:'Perigo',a:'#ffa502'}]},
  transito:       { label:'🚦 Trânsito',             btns:[{t:'pesado',e:'🚗',l:'Trânsito',a:'#ff6b35'},{t:'bloqueio',e:'🚧',l:'Bloqueio',a:'#ffa502'},{t:'acidente',e:'💥',l:'Acidente',a:'#ff4757'},{t:'blitz',e:'🚔',l:'Blitz',a:'#4f8eff'},{t:'obra',e:'🏗️',l:'Obra',a:'#ffa502'},{t:'alagado',e:'🌊',l:'Alagado',a:'#4f8eff'}]},
}

const CAT_ICON = {noturno:'🌙',transito:'🚦',estabelecimento:'🏪',parque:'🌿',show:'🎭',bar:'🍺',cafe:'☕',evento:'🎉'}

function getGroups(cat) {
  if (!cat) return ['noturno','transito','estabelecimento'].map(k=>({key:k,...GROUPS[k]}))
  if (GROUPS[cat]) return [{key:cat,...GROUPS[cat]}]
  if (['noturno','club','balada'].includes(cat)) return [{key:'noturno',...GROUPS.noturno}]
  if (cat==='parque') return [{key:'parque',...GROUPS.parque}]
  if (cat==='transito') return [{key:'transito',...GROUPS.transito}]
  return ['noturno','transito','estabelecimento'].map(k=>({key:k,...GROUPS[k]}))
}

const Sheet = ({open,onClose,children}) => (
  <>
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:1500,background:'rgba(0,0,0,.78)',backdropFilter:'blur(9px)',WebkitBackdropFilter:'blur(9px)',opacity:open?1:0,pointerEvents:open?'all':'none',transition:'opacity .25s'}}/>
    <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:2000,background:'rgba(8,8,20,0.97)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',borderRadius:'28px 28px 0 0',maxHeight:'90vh',overflowY:'auto',transform:open?'translateY(0)':'translateY(100%)',transition:'transform .38s cubic-bezier(.32,.72,0,1)'}}>
      {children}
    </div>
  </>
)

export default function ReportPanel({open, location, onClose, onConfirm}) {
  const [sel, setSel] = useState(null)
  const close  = () => { setSel(null); onClose() }
  const groups = getGroups(location?.cat)
  const allBtns = groups.flatMap(g=>g.btns)
  const selBtn  = allBtns.find(b=>b.t===sel)

  return (
    <Sheet open={open} onClose={close}>
      <div style={{width:36,height:4,background:'rgba(255,255,255,0.14)',borderRadius:2,margin:'14px auto 20px'}}/>

      {/* Location pill */}
      {location&&(
        <div style={{margin:'0 16px 20px',display:'flex',alignItems:'center',gap:11,background:'rgba(79,142,255,0.07)',border:'1px solid rgba(79,142,255,0.22)',borderRadius:18,padding:'12px 14px'}}>
          <div style={{width:42,height:42,borderRadius:13,flexShrink:0,background:'rgba(79,142,255,0.1)',border:'1px solid rgba(79,142,255,0.22)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{CAT_ICON[location.cat]||location.iconEmoji||'📍'}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:800,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#f0f0ff'}}>{location.name}</div>
            <div style={{fontSize:11,color:'rgba(240,240,255,0.38)',marginTop:1}}>Reportando neste local</div>
          </div>
          <div style={{background:'rgba(0,245,160,0.09)',border:'1px solid rgba(0,245,160,0.22)',borderRadius:999,padding:'4px 10px',fontSize:10,fontWeight:800,color:'#00f5a0',fontFamily:"'Space Mono',monospace"}}>+10 pts</div>
        </div>
      )}

      <div style={{padding:'0 16px'}}>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,letterSpacing:'-.03em',marginBottom:3,color:'#f0f0ff'}}>O que está rolando? 📡</div>
        <div style={{fontSize:12,color:'rgba(240,240,255,0.38)',marginBottom:22,fontWeight:500}}>1 toque para reportar — ganha pontos</div>
      </div>

      {groups.map(group=>(
        <div key={group.key} style={{marginBottom:20,padding:'0 16px'}}>
          <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.1em',color:'rgba(240,240,255,0.32)',marginBottom:11,fontWeight:700}}>{group.label}</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {group.btns.map(b=>{
              const active = sel===b.t
              return (
                <button key={b.t} onClick={()=>setSel(s=>s===b.t?null:b.t)} style={{
                  background:active?`${b.a}18`:'rgba(255,255,255,0.03)',
                  border:`1px solid ${active?b.a:'rgba(255,255,255,0.07)'}`,
                  borderRadius:16,padding:'14px 6px',cursor:'pointer',
                  color:active?b.a:'rgba(240,240,255,0.65)',
                  fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:700,
                  display:'flex',flexDirection:'column',alignItems:'center',gap:7,
                  transition:'all .15s',
                  boxShadow:active?`0 0 18px ${b.a}44`:'none',
                }}
                  onMouseDown={e=>e.currentTarget.style.transform='scale(.93)'}
                  onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
                  onTouchStart={e=>e.currentTarget.style.transform='scale(.93)'}
                  onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
                ><span style={{fontSize:26}}>{b.e}</span>{b.l}</button>
              )
            })}
          </div>
        </div>
      ))}

      <div style={{padding:'0 16px',paddingBottom:'calc(28px + env(safe-area-inset-bottom,0px))'}}>
        <button onClick={()=>{if(sel&&location){onConfirm(sel,location);setSel(null)}}} disabled={!sel} style={{
          width:'100%',padding:'15px',borderRadius:16,border:'none',
          background:sel?`linear-gradient(135deg,${selBtn?.a||'#4f8eff'},${selBtn?.a||'#7c5cfc'}88)`:'rgba(255,255,255,0.05)',
          color:sel?'#fff':'rgba(240,240,255,0.22)',
          border:`1px solid ${sel?(selBtn?.a||'#4f8eff')+'44':'rgba(255,255,255,0.07)'}`,
          fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:15,
          cursor:sel?'pointer':'not-allowed',transition:'all .2s',
          boxShadow:sel?`0 4px 28px ${selBtn?.a||'#4f8eff'}44`:'none',
        }}>
          {sel?`✅ Confirmar: ${selBtn?.e} ${selBtn?.l}`:'Selecione uma ocorrência'}
        </button>
      </div>
    </Sheet>
  )
}
