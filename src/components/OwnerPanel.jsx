// ── PAINEL DO DONO ────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react'
import { useOwner } from '../hooks/useOwner'

const OCCUPANCY_STEPS = [0, 25, 50, 75, 90, 100]

function OccupancyColor(p) {
  if (p === null || p === undefined) return '#6666aa'
  if (p >= 90) return '#ff2d55'
  if (p >= 60) return '#ffcc00'
  return '#00ff88'
}

export default function OwnerPanel({ open, place, uid, onClose }) {
  const { setOccupancy, saveDescription } = useOwner(place?.id, uid)

  const [occupancy,    setOcc]    = useState(place?.occupancy ?? null)
  const [description,  setDesc]   = useState(place?.description || '')
  const [schedule,     setSched]  = useState(place?.schedule    || '')
  const [instagram,    setInsta]  = useState(place?.instagram   || '')
  const [phone,        setPhone]  = useState(place?.phone       || '')
  const [tab,          setTab]    = useState('lotacao')
  const [saving,       setSaving] = useState(false)
  const [saved,        setSaved]  = useState(false)

  // Sincroniza quando place muda
  useEffect(() => {
    setOcc(place?.occupancy ?? null)
    setDesc(place?.description || '')
    setSched(place?.schedule   || '')
    setInsta(place?.instagram  || '')
    setPhone(place?.phone      || '')
  }, [place?.id])

  const handleSaveOccupancy = async () => {
    setSaving(true)
    await setOccupancy(occupancy)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveInfo = async () => {
    setSaving(true)
    await saveDescription({ description, schedule, instagram, phone })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const oColor = OccupancyColor(occupancy)

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:2500,
        background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
        transition:'opacity .25s',
      }}/>

      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:2600,
        background:'#12121a', borderTop:'2px solid #ffcc00',
        borderRadius:'20px 20px 0 0', padding:'0 16px 40px',
        maxHeight:'88vh', overflowY:'auto',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ width:40, height:4, background:'#2a2a3d', borderRadius:2, margin:'12px auto 18px' }}/>

        {/* Header dono */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
          <div style={{
            background:'rgba(255,204,0,.15)', border:'1px solid rgba(255,204,0,.4)',
            borderRadius:10, padding:'6px 10px', fontSize:18,
          }}>👑</div>
          <div>
            <div style={{ fontWeight:800, fontSize:16 }}>Painel do Dono</div>
            <div style={{ fontSize:12, color:'#6666aa', marginTop:1 }}>{place?.name}</div>
          </div>
          <button onClick={onClose} style={{
            marginLeft:'auto', width:32, height:32, borderRadius:'50%',
            background:'#1a1a26', border:'1px solid #2a2a3d',
            cursor:'pointer', color:'#6666aa', fontSize:14,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {[
            { id:'lotacao', label:'📊 Lotação'  },
            { id:'info',    label:'📝 Info'      },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, padding:'10px 0', borderRadius:10, border:'none', cursor:'pointer',
              background: tab===t.id ? '#ffcc00' : '#1a1a26',
              color:       tab===t.id ? '#000'    : '#6666aa',
              fontFamily: "'Syne',sans-serif", fontWeight:700, fontSize:13,
              transition: 'all .15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── TAB LOTAÇÃO ── */}
        {tab === 'lotacao' && (
          <div>
            <p style={{ fontSize:12, color:'#6666aa', marginBottom:16, lineHeight:1.6 }}>
              Atualize a lotação do seu estabelecimento. Os usuários verão esse percentual em tempo real ao clicar no local.
            </p>

            {/* Indicador visual */}
            <div style={{
              background:'#1a1a26', border:`1px solid ${oColor}44`,
              borderRadius:16, padding:'20px', textAlign:'center', marginBottom:20,
            }}>
              <div style={{
                fontFamily:"'Space Mono',monospace", fontSize:48,
                fontWeight:700, color: oColor,
              }}>
                {occupancy === null ? '—' : `${occupancy}%`}
              </div>
              <div style={{ fontSize:13, color:'#6666aa', marginTop:4 }}>
                {occupancy === null   ? 'Não informado'    :
                 occupancy >= 90      ? '🚨 Lotado — sem espaço' :
                 occupancy >= 60      ? '⚡ Quase cheio'  :
                 occupancy > 0        ? '✅ Tem espaço'   : '✅ Aberto e vazio'}
              </div>

              {/* Barra de progresso */}
              {occupancy !== null && (
                <div style={{ background:'#2a2a3d', borderRadius:10, height:8,
                  marginTop:16, overflow:'hidden' }}>
                  <div style={{
                    height:'100%', borderRadius:10,
                    background: oColor,
                    width: `${occupancy}%`,
                    transition: 'width .4s ease, background .3s',
                  }}/>
                </div>
              )}
            </div>

            {/* Botões de seleção rápida */}
            <p style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.1em',
              color:'#6666aa', marginBottom:10 }}>Selecione a lotação atual</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
              {OCCUPANCY_STEPS.map(p => (
                <button key={p} onClick={() => setOcc(p)} style={{
                  padding:'12px 8px', borderRadius:12, cursor:'pointer',
                  background: occupancy===p ? `${OccupancyColor(p)}22` : '#1a1a26',
                  border:     `1px solid ${occupancy===p ? OccupancyColor(p) : '#2a2a3d'}`,
                  color:       occupancy===p ? OccupancyColor(p) : '#f0f0ff',
                  fontFamily:  "'Space Mono',monospace", fontWeight:700, fontSize:14,
                  transition:  'all .15s',
                }}>
                  {p === 0 ? 'Vazio' : p === 100 ? 'Lotado' : `${p}%`}
                </button>
              ))}
            </div>

            {/* Botão limpar */}
            <button onClick={() => setOcc(null)} style={{
              width:'100%', padding:'10px', borderRadius:10,
              border:'1px solid #2a2a3d', background:'transparent',
              color:'#6666aa', fontFamily:"'Syne',sans-serif",
              fontSize:12, cursor:'pointer', marginBottom:20,
            }}>
              ✕ Não informar lotação
            </button>

            <button onClick={handleSaveOccupancy} disabled={saving} style={{
              width:'100%', padding:15, borderRadius:14, border:'none',
              background: saved ? '#00ff88' : '#ffcc00',
              color: '#000', fontFamily:"'Syne',sans-serif",
              fontWeight:800, fontSize:15, cursor:'pointer', transition:'all .2s',
            }}>
              {saved ? '✅ Salvo!' : saving ? '⏳ Salvando...' : '💾 Atualizar lotação'}
            </button>
          </div>
        )}

        {/* ── TAB INFO ── */}
        {tab === 'info' && (
          <div>
            <p style={{ fontSize:12, color:'#6666aa', marginBottom:16, lineHeight:1.6 }}>
              Adicione informações do seu estabelecimento. Aparecem para todos que acessarem o local.
            </p>

            {[
              { label:'📝 Descrição / O que vai rolar', value:description, set:setDesc,
                placeholder:'Ex: Quinta tem rock ao vivo, happy hour das 18h às 20h...', multi:true },
              { label:'🕐 Horários', value:schedule, set:setSched,
                placeholder:'Ex: Seg–Sex 18h–00h, Sáb–Dom 14h–02h' },
              { label:'📸 Instagram', value:instagram, set:setInsta,
                placeholder:'@seuestabelecimento' },
              { label:'📞 WhatsApp / Telefone', value:phone, set:setPhone,
                placeholder:'(14) 99999-9999' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom:16 }}>
                <p style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.1em',
                  color:'#6666aa', marginBottom:8 }}>{f.label}</p>
                {f.multi ? (
                  <textarea
                    value={f.value} onChange={e => f.set(e.target.value)}
                    placeholder={f.placeholder} maxLength={300} rows={3}
                    style={{
                      width:'100%', background:'#1a1a26', border:'1px solid #2a2a3d',
                      borderRadius:12, padding:'12px 14px', color:'#f0f0ff',
                      fontFamily:"'Syne',sans-serif", fontSize:13, outline:'none',
                      resize:'none', lineHeight:1.5,
                    }}
                    onFocus={e => e.target.style.borderColor='#ffcc00'}
                    onBlur={e  => e.target.style.borderColor='#2a2a3d'}
                  />
                ) : (
                  <input
                    value={f.value} onChange={e => f.set(e.target.value)}
                    placeholder={f.placeholder} maxLength={100}
                    style={{
                      width:'100%', background:'#1a1a26', border:'1px solid #2a2a3d',
                      borderRadius:12, padding:'12px 14px', color:'#f0f0ff',
                      fontFamily:"'Syne',sans-serif", fontSize:13, outline:'none',
                    }}
                    onFocus={e => e.target.style.borderColor='#ffcc00'}
                    onBlur={e  => e.target.style.borderColor='#2a2a3d'}
                  />
                )}
              </div>
            ))}

            <button onClick={handleSaveInfo} disabled={saving} style={{
              width:'100%', padding:15, borderRadius:14, border:'none',
              background: saved ? '#00ff88' : '#ffcc00',
              color:'#000', fontFamily:"'Syne',sans-serif",
              fontWeight:800, fontSize:15, cursor:'pointer', transition:'all .2s',
            }}>
              {saved ? '✅ Salvo!' : saving ? '⏳ Salvando...' : '💾 Salvar informações'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
