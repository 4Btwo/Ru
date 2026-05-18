import React, { useState } from 'react'
import { PLACE_CATS, DURATION_OPTIONS } from '../lib/constants'

const ICONS = [
  {id:'bar',e:'🍺',l:'Bar'},{id:'club',e:'🎉',l:'Balada'},{id:'music',e:'🎵',l:'Show'},
  {id:'food',e:'🍕',l:'Comida'},{id:'coffee',e:'☕',l:'Café'},{id:'store',e:'🏪',l:'Loja'},
  {id:'gas',e:'⛽',l:'Posto'},{id:'park',e:'🌳',l:'Parque'},{id:'beach',e:'🏖️',l:'Praia'},
  {id:'sport',e:'⚽',l:'Esporte'},{id:'hospital',e:'🏥',l:'Saúde'},{id:'school',e:'🎓',l:'Educação'},
  {id:'church',e:'⛪',l:'Igreja'},{id:'road',e:'🚦',l:'Via'},{id:'star',e:'⭐',l:'Destaque'},{id:'fire',e:'🔥',l:'Agitado'},
]

const T = { muted:'rgba(240,240,255,0.38)', text:'#f0f0ff', dim:'rgba(240,240,255,0.16)' }

const Label = ({children,extra}) => (
  <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.1em',color:T.muted,marginBottom:10,fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>{children}{extra}</p>
)
const Badge = ({children,bg,color}) => (
  <div style={{position:'absolute',top:-7,right:-7,background:bg,color,fontSize:8,fontWeight:800,borderRadius:10,padding:'2px 6px',zIndex:1}}>{children}</div>
)
const InfoBox = ({children,color,emoji,title}) => (
  <div style={{display:'flex',gap:10,alignItems:'flex-start',background:`${color}0e`,border:`1px solid ${color}40`,borderRadius:14,padding:'11px 14px',marginBottom:14}}>
    <span style={{fontSize:16,flexShrink:0}}>{emoji}</span>
    <div><div style={{fontSize:12,fontWeight:700,color,marginBottom:3,fontFamily:"'DM Sans',sans-serif"}}>{title}</div><div style={{fontSize:11,color:T.muted,lineHeight:1.5,fontFamily:"'DM Sans',sans-serif"}}>{children}</div></div>
  </div>
)

export default function AddLocationPanel({open, coords, onClose, onSave}) {
  const [name, setName] = useState('')
  const [cat,  setCat]  = useState(null)
  const [icon, setIcon] = useState(null)
  const [dur,  setDur]  = useState(null)
  const [saving, setSaving] = useState(false)

  const reset = () => { setName(''); setCat(null); setIcon(null); setDur(null); setSaving(false) }
  const close = () => { reset(); onClose() }

  const selCat   = PLACE_CATS.find(c=>c.id===cat)
  const needsDur = selCat?.durationRequired===true
  const autoExp  = selCat?.autoExpiry!=null && !needsDur
  const canSave  = name.trim() && cat && coords && (!needsDur || dur || autoExp)
  const previewIcon = ICONS.find(i=>i.id===icon)

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const expiresAt = needsDur && dur ? Date.now()+dur*3600000 : selCat?.autoExpiry ? Date.now()+selCat.autoExpiry : null
      const ci = ICONS.find(i=>i.id===icon)
      await onSave({name:name.trim(),cat,icon:icon||null,iconEmoji:ci?.emoji||null,lat:coords.lat,lng:coords.lng,isFixed:selCat?.isFixed??true,...(expiresAt?{expiresAt,durationHours:dur}:{}),...(selCat?.needsModeration?{status:'pending',needsModeration:true}:{status:'approved'})})
      reset()
    } catch(e) { console.error(e); setSaving(false) }
  }

  return (
    <>
      <div onClick={close} style={{position:'fixed',inset:0,zIndex:1500,background:'rgba(0,0,0,.78)',backdropFilter:'blur(9px)',WebkitBackdropFilter:'blur(9px)',opacity:open?1:0,pointerEvents:open?'all':'none',transition:'opacity .25s'}}/>
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:2000,background:'rgba(8,8,20,0.97)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',border:'1px solid rgba(255,255,255,0.07)',borderBottom:'none',borderRadius:'28px 28px 0 0',padding:'0 16px',paddingBottom:'calc(24px + env(safe-area-inset-bottom,0px))',transform:open?'translateY(0)':'translateY(100%)',transition:'transform .38s cubic-bezier(.32,.72,0,1)',maxHeight:'92dvh',overflowY:'auto'}}>
        
        <div style={{width:36,height:4,background:'rgba(255,255,255,0.14)',borderRadius:2,margin:'14px auto 20px'}}/>

        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,letterSpacing:'-.03em',marginBottom:3,color:T.text}}>📍 Novo local</div>
        <div style={{fontSize:12,color:T.muted,marginBottom:18,fontWeight:500}}>Adicione um ponto permanente no mapa</div>

        {coords&&(
          <div style={{display:'flex',alignItems:'center',gap:10,background:'rgba(0,245,160,0.07)',border:'1px solid rgba(0,245,160,0.25)',borderRadius:14,padding:'11px 14px',marginBottom:20}}>
            <span style={{fontSize:18}}>✅</span>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:'#00f5a0',fontFamily:"'DM Sans',sans-serif"}}>Ponto marcado no mapa</div>
              <div style={{fontSize:11,color:T.muted,fontFamily:"'Space Mono',monospace",marginTop:1}}>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>
            </div>
          </div>
        )}

        <Label>Nome do local</Label>
        <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&save()} placeholder="Ex: Bar do João, Café Central..." maxLength={60}
          style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1.5px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'13px 16px',color:T.text,fontFamily:"'DM Sans',sans-serif",fontSize:14,outline:'none',marginBottom:20,boxSizing:'border-box',transition:'border-color .2s,box-shadow .2s'}}
          onFocus={e=>{e.target.style.borderColor='rgba(0,245,160,0.5)';e.target.style.boxShadow='0 0 0 3px rgba(0,245,160,0.1)'}}
          onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.08)';e.target.style.boxShadow='none'}}
        />

        <Label extra={previewIcon&&<span style={{color:T.text,textTransform:'none',letterSpacing:0,fontWeight:500}}> — {previewIcon.e} {previewIcon.l}</span>}>Ícone no mapa</Label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:22}}>
          {ICONS.map(opt=>(
            <button key={opt.id} onClick={()=>setIcon(icon===opt.id?null:opt.id)} style={{background:icon===opt.id?'rgba(0,245,160,0.1)':'rgba(255,255,255,0.03)',border:`1px solid ${icon===opt.id?'rgba(0,245,160,0.45)':'rgba(255,255,255,0.07)'}`,borderRadius:14,padding:'11px 6px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:5,transition:'all .15s',boxShadow:icon===opt.id?'0 0 12px rgba(0,245,160,0.2)':'none'}}>
              <span style={{fontSize:22}}>{opt.e}</span>
              <span style={{fontSize:9,color:icon===opt.id?'#00f5a0':T.muted,fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>{opt.l}</span>
            </button>
          ))}
        </div>

        <Label>Tipo de local *</Label>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:9,marginBottom:18}}>
          {PLACE_CATS.map(c=>(
            <button key={c.id} onClick={()=>{setCat(c.id);setDur(null)}} style={{background:cat===c.id?`${c.color}14`:'rgba(255,255,255,0.03)',border:`1.5px solid ${cat===c.id?c.color:'rgba(255,255,255,0.07)'}`,borderRadius:16,padding:'14px 12px',cursor:'pointer',color:cat===c.id?c.color:T.text,fontFamily:"'DM Sans',sans-serif",textAlign:'left',transition:'all .15s',position:'relative',boxShadow:cat===c.id?`0 0 16px ${c.color}28`:'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}><span style={{fontSize:20}}>{c.emoji}</span><span style={{fontSize:13,fontWeight:700}}>{c.label}</span></div>
              <div style={{fontSize:10,color:cat===c.id?`${c.color}bb`:T.muted,lineHeight:1.4}}>{c.desc}</div>
              {c.needsModeration&&<Badge bg='#ffd32a' color='#000'>MOD</Badge>}
              {c.durationRequired&&<Badge bg='#ff4757' color='#fff'>⏱ TEMP</Badge>}
              {c.isFixed&&!c.needsModeration&&!c.durationRequired&&<Badge bg='#00f5a0' color='#001a0d'>FIXO</Badge>}
            </button>
          ))}
        </div>

        {needsDur&&(
          <>
            <InfoBox color='#ff4757' emoji='⏱️' title='Duração obrigatória'>Este local some automaticamente após o tempo escolhido.</InfoBox>
            <Label>Por quanto tempo? *</Label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
              {DURATION_OPTIONS.map(opt=>(
                <button key={opt.value} onClick={()=>setDur(opt.value)} style={{padding:'12px 6px',background:dur===opt.value?'rgba(0,245,160,0.1)':'rgba(255,255,255,0.03)',border:`1px solid ${dur===opt.value?'rgba(0,245,160,0.45)':'rgba(255,255,255,0.07)'}`,borderRadius:12,cursor:'pointer',color:dur===opt.value?'#00f5a0':T.text,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,transition:'all .15s'}}>{opt.label}</button>
              ))}
            </div>
            {dur&&<div style={{background:'rgba(0,245,160,0.06)',border:'1px solid rgba(0,245,160,0.2)',borderRadius:12,padding:'9px 14px',marginBottom:14,fontSize:12,color:'#00f5a0',fontFamily:"'DM Sans',sans-serif"}}>🕐 Expira em: {new Date(Date.now()+dur*3600000).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>}
          </>
        )}

        {selCat?.needsModeration&&<InfoBox color='#ffd32a' emoji='🛡️' title='Passará por moderação'>Estabelecimentos são revisados antes de aparecer para todos.</InfoBox>}

        <button onClick={save} disabled={!canSave||saving} style={{width:'100%',padding:15,borderRadius:16,border:'none',background:canSave?'linear-gradient(135deg,#4f8eff,#7c5cfc)':'rgba(255,255,255,0.05)',color:canSave?'#fff':'rgba(240,240,255,0.22)',border:`1px solid ${canSave?'rgba(79,142,255,0.4)':'rgba(255,255,255,0.07)'}`,fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:15,cursor:canSave?'pointer':'not-allowed',transition:'all .2s',opacity:saving?0.7:1,boxShadow:canSave?'0 4px 24px rgba(79,142,255,0.35)':'none'}}>
          {saving?'⏳ Salvando...':selCat?.needsModeration?'📤 Enviar para moderação':'✅ Criar local'}
        </button>
      </div>
    </>
  )
}
