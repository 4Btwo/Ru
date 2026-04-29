// ── CRIAR NOVO LOCAL — fixos com moderação, temporários com duração ───────────
import React, { useState } from 'react'
import { PLACE_CATS, DURATION_OPTIONS } from '../lib/constants'

const ICON_OPTIONS = [
  { id:'bar',      emoji:'🍺', label:'Bar'      },
  { id:'club',     emoji:'🎉', label:'Balada'   },
  { id:'music',    emoji:'🎵', label:'Show'     },
  { id:'food',     emoji:'🍕', label:'Comida'   },
  { id:'coffee',   emoji:'☕', label:'Café'     },
  { id:'store',    emoji:'🏪', label:'Loja'     },
  { id:'gas',      emoji:'⛽', label:'Posto'    },
  { id:'park',     emoji:'🌳', label:'Parque'   },
  { id:'beach',    emoji:'🏖️', label:'Praia'   },
  { id:'sport',    emoji:'⚽', label:'Esporte'  },
  { id:'hospital', emoji:'🏥', label:'Saúde'    },
  { id:'school',   emoji:'🎓', label:'Educação' },
  { id:'church',   emoji:'⛪', label:'Igreja'   },
  { id:'road',     emoji:'🚦', label:'Via'      },
  { id:'star',     emoji:'⭐', label:'Destaque' },
  { id:'fire',     emoji:'🔥', label:'Agitado'  },
]

export default function AddLocationPanel({ open, coords, onClose, onSave }) {
  const [name,     setName]     = useState('')
  const [cat,      setCat]      = useState(null)
  const [icon,     setIcon]     = useState(null)
  const [duration, setDuration] = useState(null)
  const [saving,   setSaving]   = useState(false)

  const reset = () => { setName(''); setCat(null); setIcon(null); setDuration(null); setSaving(false) }
  const handleClose = () => { reset(); onClose() }

  const selectedCat   = PLACE_CATS.find(c => c.id === cat)
  const needsDuration = selectedCat?.durationRequired === true
  const isAutoExpiry  = selectedCat?.autoExpiry != null && !selectedCat?.durationRequired
  const canSave       = name.trim() && cat && coords && (!needsDuration || duration || isAutoExpiry)

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const expiresAt = needsDuration && duration
        ? Date.now() + duration * 60 * 60 * 1000
        : (selectedCat?.autoExpiry ? Date.now() + selectedCat.autoExpiry : null)

      const chosenIcon = ICON_OPTIONS.find(i => i.id === icon)

      await onSave({
        name: name.trim(),
        cat,
        icon: icon || null,
        iconEmoji: chosenIcon?.emoji || null,
        lat: coords.lat,
        lng: coords.lng,
        isFixed: selectedCat.isFixed ?? true,
        ...(expiresAt ? { expiresAt, durationHours: duration } : {}),
        ...(selectedCat?.needsModeration
          ? { status: 'pending', needsModeration: true }
          : { status: 'approved' }),
      })
      reset()
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  const previewIcon = ICON_OPTIONS.find(i => i.id === icon)

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
        maxHeight:'92dvh', overflowY:'auto',
      }}>
        <div style={{ width:40, height:4, background:'#2a2a3d', borderRadius:2, margin:'12px auto 20px' }}/>

        <p style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>📍 Novo local</p>
        <p style={{ fontSize:12, color:'#6666aa', marginBottom:16 }}>Marque um ponto no mapa da cidade</p>

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

        {/* ── NOME ── */}
        <p style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.1em', color:'#6666aa', marginBottom:8 }}>Nome do local</p>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Ex: Bar do João, Show da Banda X..."
          maxLength={60}
          style={{
            width:'100%', background:'#1a1a26', border:'1px solid #2a2a3d',
            borderRadius:12, padding:'12px 14px', color:'#f0f0ff',
            fontFamily:"'Syne',sans-serif", fontSize:14, outline:'none',
            marginBottom:18, transition:'border-color .2s', boxSizing:'border-box',
          }}
          onFocus={e => e.target.style.borderColor='#ff2d55'}
          onBlur={e  => e.target.style.borderColor='#2a2a3d'}
        />

        {/* ── ÍCONE ── */}
        <p style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.1em', color:'#6666aa', marginBottom:10 }}>
          Ícone no mapa {previewIcon && <span style={{ color:'#f0f0ff', textTransform:'none', letterSpacing:0 }}>— {previewIcon.emoji} {previewIcon.label}</span>}
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20 }}>
          {ICON_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => setIcon(icon === opt.id ? null : opt.id)} style={{
              background: icon === opt.id ? 'rgba(255,45,85,.15)' : '#1a1a26',
              border:     `1px solid ${icon === opt.id ? '#ff2d55' : '#2a2a3d'}`,
              borderRadius:12, padding:'10px 6px', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', gap:4,
              transition:'all .15s',
            }}>
              <span style={{ fontSize:22 }}>{opt.emoji}</span>
              <span style={{ fontSize:9, color: icon === opt.id ? '#ff2d55' : '#6666aa', fontWeight:700 }}>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* ── TIPO ── */}
        <p style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.1em', color:'#6666aa', marginBottom:10 }}>Tipo de local *</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:16 }}>
          {PLACE_CATS.map(c => (
            <button key={c.id} onClick={() => { setCat(c.id); setDuration(null) }} style={{
              background: cat === c.id ? `${c.color}18` : '#1a1a26',
              border:     `1px solid ${cat === c.id ? c.color : '#2a2a3d'}`,
              borderRadius:14, padding:'12px 10px', cursor:'pointer',
              color:       cat === c.id ? c.color : '#f0f0ff',
              fontFamily:  "'Syne',sans-serif", textAlign:'left',
              transition:  'all .15s', position:'relative',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ fontSize:20 }}>{c.emoji}</span>
                <span style={{ fontSize:13, fontWeight:700 }}>{c.label}</span>
              </div>
              <div style={{ fontSize:10, color: cat === c.id ? c.color : '#6666aa', lineHeight:1.4 }}>{c.desc}</div>

              {c.needsModeration && (
                <div style={{ position:'absolute', top:-6, right:-6, background:'#ffcc00', color:'#000', fontSize:8, fontWeight:800, borderRadius:10, padding:'1px 5px' }}>MOD</div>
              )}
              {c.durationRequired && (
                <div style={{ position:'absolute', top:-6, right:-6, background:'#ff2d55', color:'#fff', fontSize:8, fontWeight:800, borderRadius:10, padding:'1px 5px' }}>⏱ TEMP</div>
              )}
              {c.isFixed && !c.needsModeration && !c.durationRequired && (
                <div style={{ position:'absolute', top:-6, right:-6, background:'#00ff88', color:'#000', fontSize:8, fontWeight:800, borderRadius:10, padding:'1px 5px' }}>FIXO</div>
              )}
            </button>
          ))}
        </div>

        {/* ── DURAÇÃO ── */}
        {needsDuration && (
          <>
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              background:'rgba(255,45,85,.08)', border:'1px solid rgba(255,45,85,.25)',
              borderRadius:10, padding:'10px 14px', marginBottom:14,
            }}>
              <span style={{ fontSize:18 }}>⏱️</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#ff2d55', marginBottom:2 }}>Duração obrigatória</div>
                <div style={{ fontSize:11, color:'#6666aa', lineHeight:1.5 }}>
                  Este local some automaticamente após o tempo escolhido.
                </div>
              </div>
            </div>

            <p style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.1em', color:'#6666aa', marginBottom:10 }}>
              Por quanto tempo? *
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
              {DURATION_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setDuration(opt.value)} style={{
                  padding:'11px 6px',
                  background: duration === opt.value ? 'rgba(255,45,85,.15)' : '#1a1a26',
                  border:`1px solid ${duration === opt.value ? '#ff2d55' : '#2a2a3d'}`,
                  borderRadius:12, cursor:'pointer',
                  color: duration === opt.value ? '#ff2d55' : '#f0f0ff',
                  fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12,
                  transition:'all .15s',
                }}>
                  {opt.label}
                </button>
              ))}
            </div>

            {duration && (
              <div style={{
                background:'rgba(0,255,136,.06)', border:'1px solid rgba(0,255,136,.15)',
                borderRadius:10, padding:'8px 12px', marginBottom:14,
                fontSize:12, color:'#00ff88',
              }}>
                🕐 Expira em: {new Date(Date.now() + duration * 3600000).toLocaleString('pt-BR', {
                  day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'
                })}
              </div>
            )}
          </>
        )}

        {/* ── MODERAÇÃO ── */}
        {selectedCat?.needsModeration && (
          <div style={{
            background:'rgba(255,204,0,.08)', border:'1px solid rgba(255,204,0,.25)',
            borderRadius:10, padding:'10px 14px', marginBottom:14,
            display:'flex', gap:10, alignItems:'flex-start',
          }}>
            <span style={{ fontSize:16, flexShrink:0 }}>🛡️</span>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#ffcc00', marginBottom:3 }}>Passará por moderação</div>
              <div style={{ fontSize:11, color:'#6666aa', lineHeight:1.5 }}>
                Bares, baladas e estabelecimentos são revisados antes de aparecer para todos.
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{
            width:'100%', padding:16, borderRadius:14, border:'none',
            background: canSave ? '#ff2d55' : '#2a2a3d',
            color:      canSave ? '#fff'    : '#6666aa',
            fontFamily: "'Syne',sans-serif", fontWeight:800, fontSize:15,
            cursor:     canSave ? 'pointer' : 'not-allowed',
            transition: 'all .2s', textTransform:'uppercase', letterSpacing:'.05em',
            opacity: saving ? .7 : 1,
          }}>
          {saving ? '⏳ Salvando...' : selectedCat?.needsModeration ? '📤 Enviar para moderação' : '✅ Criar local'}
        </button>
      </div>
    </>
  )
}
