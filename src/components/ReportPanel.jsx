import React, { useState } from 'react'

// Reports organized by cat group
const REPORT_GROUPS = {
  noturno: {
    label:'🌙 Vida Noturna', 
    buttons:[
      { type:'cheio',    emoji:'🍻', label:'Tá cheio',    accent:'#ef4444', bg:'rgba(239,68,68,.12)'   },
      { type:'evento',   emoji:'🎉', label:'Evento',       accent:'#a855f7', bg:'rgba(168,85,247,.12)'  },
      { type:'morto',    emoji:'😴', label:'Tá vazio',    accent:'#6b7f70', bg:'rgba(107,127,112,.12)' },
      { type:'fila',     emoji:'🚶', label:'Tem fila',    accent:'#f97316', bg:'rgba(249,115,22,.12)'  },
      { type:'show',     emoji:'🎤', label:'Show ao vivo',accent:'#ec4899', bg:'rgba(236,72,153,.12)'  },
      { type:'promo',    emoji:'💸', label:'Promoção',    accent:'#22c55e', bg:'rgba(34,197,94,.12)'   },
    ]
  },
  estabelecimento: {
    label:'🏪 Estabelecimento',
    buttons:[
      { type:'cheio',    emoji:'👥', label:'Lotado',      accent:'#ef4444', bg:'rgba(239,68,68,.12)'   },
      { type:'morto',    emoji:'😴', label:'Vazio',        accent:'#6b7f70', bg:'rgba(107,127,112,.12)' },
      { type:'evento',   emoji:'🎉', label:'Promoção',    accent:'#a855f7', bg:'rgba(168,85,247,.12)'  },
      { type:'fila',     emoji:'🚶', label:'Tem fila',    accent:'#f97316', bg:'rgba(249,115,22,.12)'  },
      { type:'fechado',  emoji:'🔒', label:'Fechado',     accent:'#64748b', bg:'rgba(100,116,139,.12)' },
      { type:'promo',    emoji:'💸', label:'Oferta',      accent:'#22c55e', bg:'rgba(34,197,94,.12)'   },
    ]
  },
  parque: {
    label:'🌿 Parque / Área',
    buttons:[
      { type:'cheio',    emoji:'🏃', label:'Movimentado', accent:'#ef4444', bg:'rgba(239,68,68,.12)'   },
      { type:'morto',    emoji:'😌', label:'Tranquilo',   accent:'#22c55e', bg:'rgba(34,197,94,.12)'   },
      { type:'evento',   emoji:'🎪', label:'Evento',       accent:'#a855f7', bg:'rgba(168,85,247,.12)'  },
      { type:'perigo',   emoji:'⚠️', label:'Perigo',       accent:'#eab308', bg:'rgba(234,179,8,.12)'   },
    ]
  },
  show: {
    label:'🎭 Show / Evento',
    buttons:[
      { type:'cheio',    emoji:'🔥', label:'Lotado',      accent:'#ef4444', bg:'rgba(239,68,68,.12)'   },
      { type:'evento',   emoji:'🎤', label:'Rolando',      accent:'#a855f7', bg:'rgba(168,85,247,.12)'  },
      { type:'fila',     emoji:'🚶', label:'Fila grande', accent:'#f97316', bg:'rgba(249,115,22,.12)'  },
      { type:'morto',    emoji:'😴', label:'Cancelado',   accent:'#6b7f70', bg:'rgba(107,127,112,.12)' },
    ]
  },
  bar: {
    label:'🍺 Bar',
    buttons:[
      { type:'cheio',    emoji:'🍻', label:'Lotado',      accent:'#ef4444', bg:'rgba(239,68,68,.12)'   },
      { type:'evento',   emoji:'🎉', label:'Evento',       accent:'#a855f7', bg:'rgba(168,85,247,.12)'  },
      { type:'morto',    emoji:'😴', label:'Vazio',        accent:'#6b7f70', bg:'rgba(107,127,112,.12)' },
      { type:'promo',    emoji:'💸', label:'Happy Hour',  accent:'#22c55e', bg:'rgba(34,197,94,.12)'   },
      { type:'fila',     emoji:'🚶', label:'Tem fila',    accent:'#f97316', bg:'rgba(249,115,22,.12)'  },
      { type:'show',     emoji:'🎤', label:'Show ao vivo',accent:'#ec4899', bg:'rgba(236,72,153,.12)'  },
    ]
  },
  transito: {
    label:'🚦 Trânsito',
    buttons:[
      { type:'pesado',   emoji:'🚗', label:'Trânsito',    accent:'#f97316', bg:'rgba(249,115,22,.12)'  },
      { type:'bloqueio', emoji:'🚧', label:'Bloqueio',    accent:'#eab308', bg:'rgba(234,179,8,.12)'   },
      { type:'acidente', emoji:'💥', label:'Acidente',    accent:'#ef4444', bg:'rgba(239,68,68,.12)'   },
      { type:'blitz',    emoji:'🚔', label:'Blitz',       accent:'#3b82f6', bg:'rgba(59,130,246,.12)'  },
      { type:'obra',     emoji:'🏗️', label:'Obra',        accent:'#f59e0b', bg:'rgba(245,158,11,.12)'  },
      { type:'alagado',  emoji:'🌊', label:'Alagado',     accent:'#06b6d4', bg:'rgba(6,182,212,.12)'   },
    ]
  },
}

// Fallback for unknown cats
const DEFAULT_GROUPS = ['noturno','transito','estabelecimento']

function getGroupsForCat(cat) {
  if (!cat) return DEFAULT_GROUPS.map(k=>({key:k,...REPORT_GROUPS[k]}))
  const direct = REPORT_GROUPS[cat]
  if (direct) return [{key:cat,...direct}]
  // noturno covers bar/show/balada
  if (['noturno','bar','show','club','balada'].includes(cat)) return [{key:'noturno',...REPORT_GROUPS.noturno}]
  if (cat==='parque') return [{key:'parque',...REPORT_GROUPS.parque}]
  if (cat==='estabelecimento') return [{key:'estabelecimento',...REPORT_GROUPS.estabelecimento}]
  if (cat==='transito') return [{key:'transito',...REPORT_GROUPS.transito}]
  return DEFAULT_GROUPS.map(k=>({key:k,...REPORT_GROUPS[k]}))
}

const CAT_ICON = { noturno:'🌙', transito:'🚦', estabelecimento:'🏪', parque:'🌿', show:'🎭', bar:'🍺', cafe:'☕', evento:'🎉' }

export default function ReportPanel({ open, location, onClose, onConfirm }) {
  const [selected, setSelected] = useState(null)

  const handleClose = () => { setSelected(null); onClose() }
  const confirm = () => {
    if (!selected || !location) return
    onConfirm(selected, location)
    setSelected(null)
  }

  const groups = getGroupsForCat(location?.cat)

  return (
    <>
      <div onClick={handleClose} style={{
        position:'fixed', inset:0, zIndex:1500,
        background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)',
        opacity:open?1:0, pointerEvents:open?'all':'none', transition:'opacity .25s',
      }}/>

      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:2000,
        background:'var(--surface)', borderRadius:'24px 24px 0 0',
        padding:'0 16px',
        paddingBottom:'calc(24px + env(safe-area-inset-bottom,0px))',
        maxHeight:'85vh', overflowY:'auto',
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
            <span style={{fontSize:22}}>{CAT_ICON[location.cat]||location.iconEmoji||'📍'}</span>
            <div>
              <div style={{fontSize:14, fontWeight:700}}>{location.name}</div>
              <div style={{fontSize:11, color:'var(--muted)', marginTop:1}}>Reportando neste local</div>
            </div>
          </div>
        )}

        <p style={{fontSize:17, fontWeight:800, marginBottom:4}}>O que está rolando?</p>
        <p style={{fontSize:12, color:'var(--muted)', marginBottom:20}}>Selecione e confirme em 1 toque</p>

        {groups.map(group=>(
          <div key={group.key} style={{marginBottom:20}}>
            <p style={{fontSize:10, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--muted)', marginBottom:10}}>
              {group.label}
            </p>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8}}>
              {group.buttons.map(b=>(
                <button key={b.type} onClick={()=>setSelected(s=>s===b.type?null:b.type)} style={{
                  background:selected===b.type?b.bg:'var(--surface2)',
                  border:`1px solid ${selected===b.type?b.accent:'var(--border)'}`,
                  borderRadius:12, padding:'14px 6px', cursor:'pointer',
                  color:selected===b.type?b.accent:'var(--text)',
                  fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:11, fontWeight:600,
                  display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                  transition:'all .15s',
                }}
                  onMouseDown={e=>e.currentTarget.style.transform='scale(.93)'}
                  onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
                  onTouchStart={e=>e.currentTarget.style.transform='scale(.93)'}
                  onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
                >
                  <span style={{fontSize:26}}>{b.emoji}</span>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button onClick={confirm} disabled={!selected} style={{
          width:'100%', padding:15, borderRadius:14, border:'none',
          background:selected?'var(--green)':'var(--surface2)',
          color:selected?'#052e16':'var(--muted)',
          border:`1px solid ${selected?'var(--green)':'var(--border)'}`,
          fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:15,
          cursor:selected?'pointer':'not-allowed', transition:'all .2s',
        }}>
          {selected?'✅ Confirmar reporte':'Selecione uma ocorrência'}
        </button>
      </div>
    </>
  )
}
