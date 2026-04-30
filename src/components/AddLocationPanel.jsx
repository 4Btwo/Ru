import React, { useState } from 'react'
import { PLACE_CATS, DURATION_OPTIONS } from '../lib/constants'

const ICON_OPTIONS = [
  {id:'bar',emoji:'🍺',label:'Bar'},{id:'club',emoji:'🎉',label:'Balada'},
  {id:'music',emoji:'🎵',label:'Show'},{id:'food',emoji:'🍕',label:'Comida'},
  {id:'coffee',emoji:'☕',label:'Café'},{id:'store',emoji:'🏪',label:'Loja'},
  {id:'gas',emoji:'⛽',label:'Posto'},{id:'park',emoji:'🌳',label:'Parque'},
  {id:'beach',emoji:'🏖️',label:'Praia'},{id:'sport',emoji:'⚽',label:'Esporte'},
  {id:'hospital',emoji:'🏥',label:'Saúde'},{id:'school',emoji:'🎓',label:'Educação'},
  {id:'church',emoji:'⛪',label:'Igreja'},{id:'road',emoji:'🚦',label:'Via'},
  {id:'star',emoji:'⭐',label:'Destaque'},{id:'fire',emoji:'🔥',label:'Agitado'},
]

export default function AddLocationPanel({open, coords, onClose, onSave}) {
  const [name,     setName]     = useState('')
  const [cat,      setCat]      = useState(null)
  const [icon,     setIcon]     = useState(null)
  const [duration, setDuration] = useState(null)
  const [saving,   setSaving]   = useState(false)

  const reset = () => { setName(''); setCat(null); setIcon(null); setDuration(null); setSaving(false) }
  const handleClose = () => { reset(); onClose() }

  const selectedCat  = PLACE_CATS.find(c=>c.id===cat)
  const needsDur     = selectedCat?.durationRequired===true
  const isAutoExpiry = selectedCat?.autoExpiry!=null && !needsDur
  const canSave      = name.trim() && cat && coords && (!needsDur || duration || isAutoExpiry)

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const expiresAt = needsDur && duration
        ? Date.now()+duration*3600000
        : selectedCat?.autoExpiry ? Date.now()+selectedCat.autoExpiry : null
      const chosenIcon = ICON_OPTIONS.find(i=>i.id===icon)
      await onSave({
        name:name.trim(), cat, icon:icon||null,
        iconEmoji:chosenIcon?.emoji||null,
        lat:coords.lat, lng:coords.lng,
        isFixed:selectedCat?.isFixed??true,
        ...(expiresAt?{expiresAt,durationHours:duration}:{}),
        ...(selectedCat?.needsModeration
          ?{status:'pending',needsModeration:true}
          :{status:'approved'}),
      })
      reset()
    } catch(e) { console.error(e); setSaving(false) }
  }

  const previewIcon = ICON_OPTIONS.find(i=>i.id===icon)

  return (
    <>
      <div onClick={handleClose} style={{
        position:'fixed', inset:0, zIndex:1500,
        background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)',
        opacity:open?1:0, pointerEvents:open?'all':'none',
        transition:'opacity .25s',
      }}/>

      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:2000,
        background:'var(--surface)', borderRadius:'24px 24px 0 0',
        padding:'0 16px',
        paddingBottom:'calc(24px + env(safe-area-inset-bottom,0px))',
        transform:open?'translateY(0)':'translateY(100%)',
        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
        maxHeight:'92dvh', overflowY:'auto',
      }}>
        <div style={{width:40, height:4, background:'var(--border2)', borderRadius:2, margin:'14px auto 20px'}}/>

        <p style={{fontSize:17, fontWeight:800, marginBottom:4}}>📍 Novo local</p>
        <p style={{fontSize:12, color:'var(--muted)', marginBottom:16}}>Adicione um ponto no mapa da cidade</p>

        {/* Coords badge */}
        {coords && (
          <div style={{
            display:'flex', alignItems:'center', gap:8,
            background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.25)',
            borderRadius:10, padding:'9px 12px', marginBottom:18,
          }}>
            <span style={{fontSize:16}}>✅</span>
            <div>
              <div style={{fontSize:12, fontWeight:700, color:'var(--green)'}}>Ponto marcado no mapa</div>
              <div style={{fontSize:11, color:'var(--muted)', fontFamily:"'Space Mono',monospace"}}>
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </div>
            </div>
          </div>
        )}

        {/* Nome */}
        <Label>Nome do local</Label>
        <input
          value={name} onChange={e=>setName(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&handleSave()}
          placeholder="Ex: Bar do João, Café Central..."
          maxLength={60}
          style={{
            width:'100%', background:'var(--surface2)', border:'1.5px solid var(--border)',
            borderRadius:12, padding:'12px 14px', color:'var(--text)',
            fontFamily:"'Inter',sans-serif", fontSize:14, outline:'none',
            marginBottom:18, boxSizing:'border-box', transition:'border-color .2s',
          }}
          onFocus={e=>e.target.style.borderColor='var(--green)'}
          onBlur={e=>e.target.style.borderColor='var(--border)'}
        />

        {/* Ícone */}
        <Label extra={previewIcon&&<span style={{color:'var(--text)', textTransform:'none', letterSpacing:0}}> — {previewIcon.emoji} {previewIcon.label}</span>}>Ícone no mapa</Label>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20}}>
          {ICON_OPTIONS.map(opt=>(
            <button key={opt.id} onClick={()=>setIcon(icon===opt.id?null:opt.id)} style={{
              background:icon===opt.id?'rgba(34,197,94,.12)':'var(--surface2)',
              border:`1px solid ${icon===opt.id?'var(--green)':'var(--border)'}`,
              borderRadius:12, padding:'10px 6px', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', gap:4,
              transition:'all .15s',
            }}>
              <span style={{fontSize:22}}>{opt.emoji}</span>
              <span style={{fontSize:9, color:icon===opt.id?'var(--green)':'var(--muted)', fontWeight:700}}>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Tipo */}
        <Label>Tipo de local *</Label>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:16}}>
          {PLACE_CATS.map(c=>(
            <button key={c.id} onClick={()=>{setCat(c.id);setDuration(null)}} style={{
              background:cat===c.id?`${c.color}14`:'var(--surface2)',
              border:`1px solid ${cat===c.id?c.color:'var(--border)'}`,
              borderRadius:14, padding:'13px 12px', cursor:'pointer',
              color:cat===c.id?c.color:'var(--text)',
              fontFamily:"'Inter',sans-serif", textAlign:'left',
              transition:'all .15s', position:'relative',
            }}>
              <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                <span style={{fontSize:20}}>{c.emoji}</span>
                <span style={{fontSize:13, fontWeight:700}}>{c.label}</span>
              </div>
              <div style={{fontSize:10, color:cat===c.id?c.color:'var(--muted)', lineHeight:1.4}}>{c.desc}</div>
              {c.needsModeration&&<Badge bg='var(--yellow)' color='#000'>MOD</Badge>}
              {c.durationRequired&&<Badge bg='var(--red)' color='#fff'>⏱ TEMP</Badge>}
              {c.isFixed&&!c.needsModeration&&!c.durationRequired&&<Badge bg='var(--green)' color='#052e16'>FIXO</Badge>}
            </button>
          ))}
        </div>

        {/* Duração */}
        {needsDur && (
          <>
            <InfoBox color='var(--red)' emoji='⏱️' title='Duração obrigatória'>
              Este local some automaticamente após o tempo escolhido.
            </InfoBox>
            <Label>Por quanto tempo? *</Label>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14}}>
              {DURATION_OPTIONS.map(opt=>(
                <button key={opt.value} onClick={()=>setDuration(opt.value)} style={{
                  padding:'11px 6px',
                  background:duration===opt.value?'rgba(34,197,94,.12)':'var(--surface2)',
                  border:`1px solid ${duration===opt.value?'var(--green)':'var(--border)'}`,
                  borderRadius:12, cursor:'pointer',
                  color:duration===opt.value?'var(--green)':'var(--text)',
                  fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:12,
                  transition:'all .15s',
                }}>{opt.label}</button>
              ))}
            </div>
            {duration&&(
              <div style={{background:'rgba(34,197,94,.06)', border:'1px solid rgba(34,197,94,.2)', borderRadius:10, padding:'8px 12px', marginBottom:14, fontSize:12, color:'var(--green)'}}>
                🕐 Expira em: {new Date(Date.now()+duration*3600000).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
              </div>
            )}
          </>
        )}

        {/* Moderação */}
        {selectedCat?.needsModeration&&(
          <InfoBox color='var(--yellow)' emoji='🛡️' title='Passará por moderação'>
            Bares e estabelecimentos são revisados antes de aparecer para todos.
          </InfoBox>
        )}

        <button onClick={handleSave} disabled={!canSave||saving} style={{
          width:'100%', padding:15, borderRadius:14, border:'none',
          background:canSave?'var(--green)':'var(--surface2)',
          color:canSave?'#052e16':'var(--muted)',
          border:`1px solid ${canSave?'var(--green)':'var(--border)'}`,
          fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:15,
          cursor:canSave?'pointer':'not-allowed',
          transition:'all .2s', opacity:saving?.7:1,
        }}>
          {saving?'⏳ Salvando...':selectedCat?.needsModeration?'📤 Enviar para moderação':'✅ Criar local'}
        </button>
      </div>
    </>
  )
}

const Label = ({children, extra}) => (
  <p style={{fontSize:11, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--muted)', marginBottom:10}}>
    {children}{extra}
  </p>
)

const Badge = ({children, bg, color}) => (
  <div style={{position:'absolute', top:-6, right:-6, background:bg, color, fontSize:8, fontWeight:800, borderRadius:10, padding:'1px 5px'}}>{children}</div>
)

const InfoBox = ({children, color, emoji, title}) => (
  <div style={{
    display:'flex', gap:10, alignItems:'flex-start',
    background:`${color}0d`, border:`1px solid ${color}40`,
    borderRadius:10, padding:'10px 14px', marginBottom:14,
  }}>
    <span style={{fontSize:16, flexShrink:0}}>{emoji}</span>
    <div>
      <div style={{fontSize:12, fontWeight:700, color, marginBottom:3}}>{title}</div>
      <div style={{fontSize:11, color:'var(--muted)', lineHeight:1.5}}>{children}</div>
    </div>
  </div>
)
