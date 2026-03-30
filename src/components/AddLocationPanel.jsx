// ── CRIAR NOVO LOCAL ──────────────────────────────────────────────────────────
// Fluxo: botão "+" → mapa entra em modo seleção → usuário clica no ponto
// → painel pede nome + categoria → salva no Firebase
import React, { useState } from 'react'

const CATS = [
  { id:'noturno',  emoji:'🌙', label:'Festa / Noturno',
    desc:'Bar, balada, evento, show', color:'#bf5fff' },
  { id:'transito', emoji:'🚦', label:'Trânsito / Via',
    desc:'Avenida, cruzamento, rodovia', color:'#ff6b35' },
]

export default function AddLocationPanel({ open, coords, onClose, onSave }) {
  const [name, setName]   = useState('')
  const [cat,  setCat]    = useState(null)
  const [saving, setSaving] = useState(false)

  const reset = () => { setName(''); setCat(null); setSaving(false) }
  const handleClose = () => { reset(); onClose() }

  const handleSave = async () => {
    if (!name.trim() || !cat || !coords) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        cat,
        lat: coords.lat,
        lng: coords.lng,
      })
      reset()
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

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
        background:'#12121a', borderTop:'1px solid #2a2a3d',
        borderRadius:'20px 20px 0 0', padding:'0 16px 36px',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ width:40, height:4, background:'#2a2a3d', borderRadius:2, margin:'12px auto 20px' }}/>

        <p style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>📍 Novo local</p>

        {/* Coordenadas selecionadas */}
        {coords && (
          <div style={{
            display:'flex', alignItems:'center', gap:8,
            background:'rgba(0,255,136,.08)', border:'1px solid rgba(0,255,136,.2)',
            borderRadius:10, padding:'8px 12px', marginBottom:18,
          }}>
            <span style={{ fontSize:16 }}>✅</span>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#00ff88' }}>Ponto marcado no mapa</div>
              <div style={{ fontSize:11, color:'#6666aa', fontFamily:"'Space Mono',monospace" }}>
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </div>
            </div>
          </div>
        )}

        {/* Nome do local */}
        <p style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.1em',
          color:'#6666aa', marginBottom:8 }}>Nome do local</p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Ex: Bar do João, Av. Paulista..."
          maxLength={60}
          style={{
            width:'100%', background:'#1a1a26', border:'1px solid #2a2a3d',
            borderRadius:12, padding:'12px 14px', color:'#f0f0ff',
            fontFamily:"'Syne',sans-serif", fontSize:14, outline:'none',
            marginBottom:18,
            transition:'border-color .2s',
          }}
          onFocus={e => e.target.style.borderColor='#ff2d55'}
          onBlur={e  => e.target.style.borderColor='#2a2a3d'}
        />

        {/* Categoria */}
        <p style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.1em',
          color:'#6666aa', marginBottom:10 }}>Tipo de local</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
          {CATS.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} style={{
              background: cat === c.id ? `${c.color}18` : '#1a1a26',
              border:     `1px solid ${cat === c.id ? c.color : '#2a2a3d'}`,
              borderRadius:14, padding:'14px 10px', cursor:'pointer',
              color:       cat === c.id ? c.color : '#f0f0ff',
              fontFamily:  "'Syne',sans-serif", textAlign:'center',
              transition:  'all .15s',
            }}>
              <div style={{ fontSize:26, marginBottom:6 }}>{c.emoji}</div>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:3 }}>{c.label}</div>
              <div style={{ fontSize:11, color: cat === c.id ? c.color : '#6666aa', lineHeight:1.4 }}>
                {c.desc}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim() || !cat || !coords || saving}
          style={{
            width:'100%', padding:16, borderRadius:14, border:'none',
            background: (name.trim() && cat && coords) ? '#ff2d55' : '#2a2a3d',
            color:      (name.trim() && cat && coords) ? '#fff'    : '#6666aa',
            fontFamily: "'Syne',sans-serif", fontWeight:800, fontSize:15,
            cursor:     (name.trim() && cat && coords) ? 'pointer' : 'not-allowed',
            transition: 'all .2s', textTransform:'uppercase', letterSpacing:'.05em',
            opacity: saving ? .7 : 1,
          }}>
          {saving ? '⏳ Salvando...' : '✅ Criar local'}
        </button>
      </div>
    </>
  )
}
