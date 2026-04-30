// ── Fluxo: marcador → escolhe tipo → confirma ────────────────────────────────
import React, { useState } from 'react'

const BUTTONS = [
  { type:'cheio',    emoji:'🍻', label:'Tá cheio',      group:'noturno',  accent:'#ff2d55', bg:'rgba(255,45,85,.12)'   },
  { type:'evento',   emoji:'🎉', label:'Evento',         group:'noturno',  accent:'#bf5fff', bg:'rgba(191,95,255,.12)'  },
  { type:'morto',    emoji:'😴', label:'Tá vazio',      group:'noturno',  accent:'#6666aa', bg:'rgba(102,102,170,.12)' },
  { type:'pesado',   emoji:'🚗', label:'Trânsito',      group:'transito', accent:'#ff6b35', bg:'rgba(255,107,53,.12)'  },
  { type:'bloqueio', emoji:'🚧', label:'Bloqueio',      group:'transito', accent:'#ffcc00', bg:'rgba(255,204,0,.12)'   },
  { type:'acidente', emoji:'💥', label:'Acidente',      group:'transito', accent:'#ff2d55', bg:'rgba(255,45,85,.12)'   },
  { type:'blitz',    emoji:'🚔', label:'Blitz Policial',group:'transito', accent:'#3b82f6', bg:'rgba(59,130,246,.12)'  },
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
        background:'rgba(0,0,0,.65)', backdropFilter:'blur(3px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
        transition:'opacity .25s',
      }}/>

      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:2000,
        background:'var(--surface)', borderTop:'1px solid #2a2a3d',
        borderRadius:'20px 20px 0 0', padding:'0 16px 36px',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ width:40, height:4, background:'#2a2a3d', borderRadius:2, margin:'12px auto 20px' }}/>

        {location && (
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            background:'var(--surface2)', border:'1px solid var(--border)',
            borderRadius:12, padding:'10px 14px', marginBottom:20,
          }}>
            <span style={{ fontSize:20 }}>
              {location.cat === 'transito' ? '🚦' : location.cat === 'estabelecimento' ? '🏪' : '📍'}
            </span>
            <div>
              <div style={{ fontSize:13, fontWeight:700 }}>{location.name}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>
                Reportando neste local
              </div>
            </div>
          </div>
        )}

        <p style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>O que está rolando?</p>
        <p style={{ fontSize:12, color:'var(--muted)', marginBottom:20 }}>
          Selecione e confirme em 1 toque
        </p>

        {showNight && (
          <>
            <p style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--muted)', marginBottom:10 }}>🌙 Vida Noturna</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:20 }}>
              {nightBtns.map(b => (
                <Btn key={b.type} {...b} active={selected === b.type}
                  onPress={() => setSelected(s => s === b.type ? null : b.type)} />
              ))}
            </div>
          </>
        )}

        {showTransit && (
          <>
            <p style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--muted)', marginBottom:10 }}>🚦 Trânsito</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:8 }}>
              {transitBtns.filter(b => b.type !== 'blitz').map(b => (
                <Btn key={b.type} {...b} active={selected === b.type}
                  onPress={() => setSelected(s => s === b.type ? null : b.type)} />
              ))}
            </div>

            {/* Blitz — destaque em linha separada */}
            <div style={{ marginBottom:24 }}>
              {transitBtns.filter(b => b.type === 'blitz').map(b => (
                <BlitzBtn key={b.type} {...b} active={selected === b.type}
                  onPress={() => setSelected(s => s === b.type ? null : b.type)} />
              ))}
            </div>
          </>
        )}

        <button onClick={confirm} disabled={!selected} style={{
          width:'100%', padding:16, borderRadius:14, border:'none',
          background: selected ? '#ff2d55' : '#2a2a3d',
          color: selected ? '#fff' : '#6666aa',
          fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15,
          cursor: selected ? 'pointer' : 'not-allowed',
          transition:'all .2s', textTransform:'uppercase', letterSpacing:'.05em',
        }}>
          {selected ? '✅ Confirmar reporte' : 'Selecione uma ocorrência'}
        </button>
      </div>
    </>
  )
}

function Btn({ emoji, label, active, onPress, accent, bg }) {
  return (
    <button onClick={onPress} style={{
      background:  active ? bg     : '#1a1a26',
      border:     `1px solid ${active ? accent : '#2a2a3d'}`,
      borderRadius:12, padding:'13px 6px', cursor:'pointer',
      color:       active ? accent : '#f0f0ff',
      fontFamily:  "'Syne',sans-serif", fontSize:11, fontWeight:600,
      display:'flex', flexDirection:'column', alignItems:'center', gap:6,
      transition:'all .15s',
    }}
      onMouseDown={e  => e.currentTarget.style.transform='scale(.93)'}
      onMouseUp={e    => e.currentTarget.style.transform='scale(1)'}
      onTouchStart={e => e.currentTarget.style.transform='scale(.93)'}
      onTouchEnd={e   => e.currentTarget.style.transform='scale(1)'}
    >
      <span style={{ fontSize:24 }}>{emoji}</span>
      {label}
    </button>
  )
}

// Blitz — botão largo em destaque
function BlitzBtn({ emoji, label, active, onPress, accent, bg }) {
  return (
    <button onClick={onPress} style={{
      width:'100%', padding:'12px 16px', borderRadius:12, cursor:'pointer',
      background:  active ? bg     : '#1a1a26',
      border:     `1px solid ${active ? accent : '#2a2a3d'}`,
      color:       active ? accent : '#f0f0ff',
      fontFamily:  "'Syne',sans-serif", fontSize:13, fontWeight:700,
      display:'flex', alignItems:'center', justifyContent:'center', gap:10,
      transition:'all .15s',
    }}
      onMouseDown={e  => e.currentTarget.style.transform='scale(.98)'}
      onMouseUp={e    => e.currentTarget.style.transform='scale(1)'}
      onTouchStart={e => e.currentTarget.style.transform='scale(.98)'}
      onTouchEnd={e   => e.currentTarget.style.transform='scale(1)'}
    >
      <span style={{ fontSize:22 }}>{emoji}</span>
      {label}
      {active && <span style={{ fontSize:11, opacity:.7 }}>✓</span>}
    </button>
  )
}
