import React, { useState } from 'react'

const BUTTONS = [
  { type:'cheio',    emoji:'🍻', label:'Tá cheio',       group:'noturno',  accent:'#ef4444', bg:'rgba(239,68,68,.12)'   },
  { type:'evento',   emoji:'🎉', label:'Evento',          group:'noturno',  accent:'#a855f7', bg:'rgba(168,85,247,.12)'  },
  { type:'morto',    emoji:'😴', label:'Tá vazio',       group:'noturno',  accent:'#6b7f70', bg:'rgba(107,127,112,.12)' },
  { type:'pesado',   emoji:'🚗', label:'Trânsito',       group:'transito', accent:'#f97316', bg:'rgba(249,115,22,.12)'  },
  { type:'bloqueio', emoji:'🚧', label:'Bloqueio',       group:'transito', accent:'#eab308', bg:'rgba(234,179,8,.12)'   },
  { type:'acidente', emoji:'💥', label:'Acidente',       group:'transito', accent:'#ef4444', bg:'rgba(239,68,68,.12)'   },
  { type:'blitz',    emoji:'🚔', label:'Blitz Policial', group:'transito', accent:'#3b82f6', bg:'rgba(59,130,246,.12)'  },
]

export default function ReportPanel({ open, location, onClose, onConfirm }) {
  const [selected, setSelected] = useState(null)

  const handleClose = () => { setSelected(null); onClose() }
  const confirm = () => {
    if (!selected || !location) return
    onConfirm(selected, location)
    setSelected(null)
  }

  const nightBtns   = BUTTONS.filter(b => b.group === 'noturno')
  const transitBtns = BUTTONS.filter(b => b.group === 'transito')
  const showNight   = !location?.cat || location.cat === 'noturno' || location.cat === 'estabelecimento'
  const showTransit = !location?.cat || location.cat === 'transito'

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
      }}>
        <div style={{width:40, height:4, background:'var(--border2)', borderRadius:2, margin:'14px auto 20px'}}/>

        {/* Local */}
        {location && (
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            background:'var(--surface2)', border:'1px solid var(--border)',
            borderRadius:12, padding:'11px 14px', marginBottom:20,
          }}>
            <span style={{fontSize:22}}>
              {location.cat==='transito'?'🚦':location.cat==='estabelecimento'?'☕':'📍'}
            </span>
            <div>
              <div style={{fontSize:14, fontWeight:700}}>{location.name}</div>
              <div style={{fontSize:11, color:'var(--muted)', marginTop:1}}>Reportando neste local</div>
            </div>
          </div>
        )}

        <p style={{fontSize:17, fontWeight:800, marginBottom:4}}>O que está rolando?</p>
        <p style={{fontSize:12, color:'var(--muted)', marginBottom:20}}>Selecione e confirme em 1 toque</p>

        {showNight && (
          <>
            <p style={{fontSize:10, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--muted)', marginBottom:10}}>🌙 Vida Noturna</p>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:20}}>
              {nightBtns.map(b=>(
                <ReportBtn key={b.type} {...b} active={selected===b.type}
                  onPress={()=>setSelected(s=>s===b.type?null:b.type)}/>
              ))}
            </div>
          </>
        )}

        {showTransit && (
          <>
            <p style={{fontSize:10, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--muted)', marginBottom:10}}>🚦 Trânsito</p>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:8}}>
              {transitBtns.filter(b=>b.type!=='blitz').map(b=>(
                <ReportBtn key={b.type} {...b} active={selected===b.type}
                  onPress={()=>setSelected(s=>s===b.type?null:b.type)}/>
              ))}
            </div>
            <div style={{marginBottom:20}}>
              {transitBtns.filter(b=>b.type==='blitz').map(b=>(
                <BlitzBtn key={b.type} {...b} active={selected===b.type}
                  onPress={()=>setSelected(s=>s===b.type?null:b.type)}/>
              ))}
            </div>
          </>
        )}

        <button onClick={confirm} disabled={!selected} style={{
          width:'100%', padding:15, borderRadius:14, border:'none',
          background:selected?'var(--green)':'var(--surface2)',
          color:selected?'#052e16':'var(--muted)',
          border:`1px solid ${selected?'var(--green)':'var(--border)'}`,
          fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:15,
          cursor:selected?'pointer':'not-allowed', transition:'all .2s',
        }}>
          {selected?'✅ Confirmar reporte':'Selecione uma ocorrência'}
        </button>
      </div>
    </>
  )
}

function ReportBtn({emoji, label, active, onPress, accent, bg}) {
  return (
    <button onClick={onPress} style={{
      background:active?bg:'var(--surface2)',
      border:`1px solid ${active?accent:'var(--border)'}`,
      borderRadius:12, padding:'14px 6px', cursor:'pointer',
      color:active?accent:'var(--text)',
      fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600,
      display:'flex', flexDirection:'column', alignItems:'center', gap:6,
      transition:'all .15s',
    }}
      onMouseDown={e=>e.currentTarget.style.transform='scale(.93)'}
      onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
      onTouchStart={e=>e.currentTarget.style.transform='scale(.93)'}
      onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
    >
      <span style={{fontSize:26}}>{emoji}</span>
      {label}
    </button>
  )
}

function BlitzBtn({emoji, label, active, onPress, accent, bg}) {
  return (
    <button onClick={onPress} style={{
      width:'100%', padding:'13px 16px', borderRadius:12, cursor:'pointer',
      background:active?bg:'var(--surface2)',
      border:`1px solid ${active?accent:'var(--border)'}`,
      color:active?accent:'var(--text)',
      fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700,
      display:'flex', alignItems:'center', justifyContent:'center', gap:10,
      transition:'all .15s',
    }}
      onMouseDown={e=>e.currentTarget.style.transform='scale(.98)'}
      onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
      onTouchStart={e=>e.currentTarget.style.transform='scale(.98)'}
      onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
    >
      <span style={{fontSize:22}}>{emoji}</span>
      {label}
      {active&&<span style={{fontSize:14}}>✓</span>}
    </button>
  )
}
