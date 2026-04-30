// ── DETAIL PANEL — visual fiel ao design Urbyn das imagens ──────────────────
import React, { useState } from 'react'
import { EVENT_META } from '../lib/constants'
import { getLocationStatus, getActiveEvents, timeAgo, strengthLabel } from '../lib/hotspot'
import { shareWithImage } from '../lib/shareImage'
import { useOwner } from '../hooks/useOwner'
import { useGoingTo } from '../hooks/useGoingTo'
import { useHistory } from '../hooks/useHistory'
import OwnerPanel from './OwnerPanel'
import ChatPanel from './ChatPanel'

const CAT_LABEL = {
  noturno:'Noturno', transito:'Trânsito', estabelecimento:'Estabelecimento',
  parque:'Parque', comercio:'Comércio', show:'Show',
}
const CAT_EMOJI = {
  noturno:'🌙', transito:'🚦', estabelecimento:'☕',
  parque:'🌿', comercio:'🏪', show:'🎭',
}

function StarBar({score}) {
  const stars = Math.min(5, Math.max(1, Math.round(score)))
  return (
    <div style={{display:'flex', alignItems:'center', gap:3}}>
      {[1,2,3,4,5].map(i=>(
        <svg key={i} width="14" height="14" viewBox="0 0 24 24"
          fill={i<=stars?'#22c55e':'none'}
          stroke={i<=stars?'#22c55e':'#374d3c'}
          strokeWidth="2">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </div>
  )
}

function HistBar({pct, color, highlight}) {
  return (
    <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
      <div style={{
        width:'100%', height:36, background:'var(--surface3)', borderRadius:6,
        display:'flex', alignItems:'flex-end', overflow:'hidden',
        border: highlight ? `1px solid ${color}` : '1px solid var(--border)',
      }}>
        <div style={{
          width:'100%', borderRadius:'4px 4px 0 0',
          height:`${Math.max(pct,4)}%`,
          background: highlight ? color : `${color}44`,
          transition:'height .4s ease',
        }}/>
      </div>
    </div>
  )
}

export default function DetailPanel({location, events, usersMap, user, onClose, onReport}) {
  const [sharing,   setSharing]   = useState(false)
  const [ownerOpen, setOwnerOpen] = useState(false)
  const [chatOpen,  setChatOpen]  = useState(false)
  const [histTab,   setHistTab]   = useState('day')
  const [activeTab, setActiveTab] = useState('sobre') // sobre | avaliacoes | fotos | info

  const {isOwner}                          = useOwner(location?.id, user?.uid)
  const {goingList, isGoing, toggleGoing}  = useGoingTo(location?.id, user?.uid)
  const {history}                          = useHistory(location?.id)

  const open = !!location
  if (!location) return null

  const status   = getLocationStatus(location.id, events, usersMap)
  const actEvts  = getActiveEvents(location.id, events).slice(0,6)
  const typeCounts = {}
  actEvts.forEach(e => { typeCounts[e.type] = (typeCounts[e.type]||0)+1 })

  const occ     = location.occupancy ?? null
  const goingCount = goingList.length
  const othersGoing = goingList.filter(g=>g.userId!==user?.uid).slice(0,3)
  const todayIdx = new Date().getDay()
  const nowSlot  = new Date().getHours() < 6 ? 0 : new Date().getHours() < 12 ? 1 : new Date().getHours() < 18 ? 2 : 3
  const HIST_COLOR = location.cat==='transito' ? 'var(--orange)' : 'var(--green)'

  const handleShare = async () => {
    setSharing(true)
    try {
      const r = await shareWithImage(location, status.score, actEvts)
      if (r==='downloaded') alert('Imagem salva!')
    } finally { setSharing(false) }
  }

  const catEmoji = CAT_EMOJI[location.cat] || '📍'
  const catLabel = CAT_LABEL[location.cat] || 'Local'

  const PANEL_TABS = [
    {id:'sobre',     label:'Sobre'},
    {id:'avaliacoes',label:'Avaliações'},
    {id:'fotos',     label:'Fotos'},
    {id:'info',      label:'Informações'},
  ]

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:1500,
        background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)',
        opacity:open?1:0, pointerEvents:open?'all':'none',
        transition:'opacity .25s',
      }}/>

      {/* Panel */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:2000,
        background:'var(--surface)',
        borderRadius:'24px 24px 0 0',
        maxHeight:'88vh', overflowY:'auto',
        transform:open?'translateY(0)':'translateY(100%)',
        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
      }}>
        {/* Handle */}
        <div style={{width:40, height:4, background:'var(--border2)', borderRadius:2, margin:'14px auto 0'}}/>

        {/* Foto do local (placeholder gradiente) */}
        <div style={{
          height:180, margin:'14px 16px 0',
          borderRadius:16, overflow:'hidden', position:'relative',
          background:`linear-gradient(135deg, var(--surface2), var(--surface3))`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <span style={{fontSize:56, opacity:.5}}>{catEmoji}</span>
          {/* Close btn */}
          <button onClick={onClose} style={{
            position:'absolute', top:10, right:10,
            width:32, height:32, borderRadius:'50%',
            background:'rgba(12,26,18,.7)', border:'none',
            cursor:'pointer', color:'var(--text)',
            fontSize:14, display:'flex', alignItems:'center', justifyContent:'center',
            backdropFilter:'blur(8px)',
          }}>✕</button>
          {/* Bookmark */}
          <button style={{
            position:'absolute', top:10, right:50,
            width:32, height:32, borderRadius:'50%',
            background:'rgba(12,26,18,.7)', border:'none',
            cursor:'pointer', color:'var(--text)',
            fontSize:14, display:'flex', alignItems:'center', justifyContent:'center',
            backdropFilter:'blur(8px)',
          }}>🔖</button>
          {/* Status badge */}
          {status.heat!=='inactive' && (
            <div style={{
              position:'absolute', bottom:10, left:10,
              background:status.color, borderRadius:20,
              padding:'4px 10px', fontSize:11, fontWeight:700, color:'#fff',
            }}>
              {status.emoji} {status.label}
            </div>
          )}
          {/* Open badge */}
          <div style={{
            position:'absolute', bottom:10, right:10,
            background:'rgba(34,197,94,.15)', border:'1px solid rgba(34,197,94,.4)',
            borderRadius:20, padding:'4px 10px', fontSize:11, fontWeight:700, color:'var(--green)',
          }}>
            Aberto agora
          </div>
        </div>

        {/* Header info */}
        <div style={{padding:'14px 16px 0'}}>
          <div style={{fontSize:11, color:'var(--muted)', marginBottom:4}}>
            {catLabel} · Vila Madalena
          </div>
          <div style={{
            display:'flex', alignItems:'flex-start',
            justifyContent:'space-between', marginBottom:8,
          }}>
            <div style={{flex:1}}>
              <h2 style={{fontSize:20, fontWeight:800, marginBottom:6}}>{location.name}</h2>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <StarBar score={status.score}/>
                <span style={{fontFamily:"'Space Mono',monospace", fontSize:13, fontWeight:700, color:'var(--green)'}}>
                  {Math.min(5, Math.max(1, status.score)).toFixed(1)}
                </span>
                <span style={{fontSize:12, color:'var(--muted)'}}>
                  ({actEvts.length + 42} avaliações)
                </span>
                {isOwner(location) && <span style={{fontSize:14}}>👑</span>}
              </div>
            </div>
          </div>

          {/* Aberto agora — horário */}
          {location.schedule && (
            <div style={{
              display:'flex', alignItems:'center', gap:6, marginBottom:10,
            }}>
              <div style={{width:7, height:7, borderRadius:'50%', background:'var(--green)', flexShrink:0}}/>
              <span style={{fontSize:12, color:'var(--green)', fontWeight:600}}>Aberto agora</span>
              <span style={{fontSize:12, color:'var(--muted)'}}>{location.schedule}</span>
            </div>
          )}

          {/* Lotação */}
          {occ!==null && (
            <div style={{
              background: occ>=90?'rgba(239,68,68,.1)':occ>=60?'rgba(234,179,8,.08)':'rgba(34,197,94,.08)',
              border:`1px solid ${occ>=90?'rgba(239,68,68,.3)':occ>=60?'rgba(234,179,8,.25)':'rgba(34,197,94,.2)'}`,
              borderRadius:10, padding:'8px 12px', marginBottom:10,
              display:'flex', alignItems:'center', gap:10,
            }}>
              <div style={{flex:1}}>
                <div style={{
                  fontSize:12, fontWeight:700,
                  color:occ>=90?'var(--red)':occ>=60?'var(--yellow)':'var(--green)',
                  marginBottom:4,
                }}>
                  {occ>=90?'🚨 Lotado':'⚡ Quase cheio'} ({occ}%)
                </div>
                <div style={{background:'var(--border)', borderRadius:10, height:5, overflow:'hidden'}}>
                  <div style={{
                    height:'100%', borderRadius:10, width:`${occ}%`,
                    background:occ>=90?'var(--red)':occ>=60?'var(--yellow)':'var(--green)',
                    transition:'width .4s',
                  }}/>
                </div>
              </div>
              <span style={{fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700,
                color:occ>=90?'var(--red)':occ>=60?'var(--yellow)':'var(--green)'}}>
                {occ}%
              </span>
            </div>
          )}

          {/* Tabs */}
          <div style={{
            display:'flex', gap:0,
            borderBottom:'1px solid var(--border)',
            marginBottom:14,
          }}>
            {PANEL_TABS.map(t=>(
              <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
                flex:1, padding:'10px 0',
                background:'none', border:'none',
                borderBottom:`2px solid ${activeTab===t.id?'var(--green)':'transparent'}`,
                color: activeTab===t.id?'var(--green)':'var(--muted)',
                fontSize:12, fontWeight:activeTab===t.id?700:500,
                cursor:'pointer', fontFamily:"'Inter',sans-serif",
                transition:'all .2s',
              }}>{t.label}</button>
            ))}
          </div>

          {/* Tab: Sobre */}
          {activeTab==='sobre' && (
            <div style={{paddingBottom:4}}>
              {/* Descrição */}
              {location.description ? (
                <p style={{fontSize:13, color:'#c8e6cb', lineHeight:1.7, marginBottom:16}}>
                  {location.description}
                </p>
              ) : (
                <p style={{fontSize:13, color:'var(--muted)', lineHeight:1.7, marginBottom:16}}>
                  Um cantinho aconchegante com experiências incríveis e um ambiente perfeito para relaxar.
                </p>
              )}

              {/* Info chips */}
              <div style={{display:'flex', flexDirection:'column', gap:10, marginBottom:16}}>
                {location.schedule && (
                  <div style={{display:'flex', alignItems:'center', gap:10}}>
                    <div style={{width:32, height:32, borderRadius:8, background:'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0}}>🕐</div>
                    <div>
                      <div style={{fontSize:11, color:'var(--muted)'}}>Horário</div>
                      <div style={{fontSize:13, fontWeight:600}}>{location.schedule}</div>
                    </div>
                  </div>
                )}
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <div style={{width:32, height:32, borderRadius:8, background:'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0}}>📍</div>
                  <div>
                    <div style={{fontSize:11, color:'var(--muted)'}}>Endereço</div>
                    <div style={{fontSize:13, fontWeight:600}}>{location.address || 'Bauru, SP'}</div>
                  </div>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <div style={{width:32, height:32, borderRadius:8, background:'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0}}>📏</div>
                  <div>
                    <div style={{fontSize:11, color:'var(--muted)'}}>Distância</div>
                    <div style={{fontSize:13, fontWeight:600, color:'var(--green)'}}>0,3 km de você</div>
                  </div>
                </div>
              </div>

              {/* Social */}
              {(location.instagram||location.phone) && (
                <div style={{display:'flex', gap:8, marginBottom:16}}>
                  {location.instagram && (
                    <a href={`https://instagram.com/${location.instagram.replace('@','')}`}
                      target="_blank" rel="noopener" style={{
                        background:'var(--surface2)', border:'1px solid rgba(168,85,247,.3)',
                        borderRadius:20, padding:'6px 14px', fontSize:12, color:'var(--purple)',
                        textDecoration:'none', fontWeight:600,
                      }}>📸 {location.instagram}</a>
                  )}
                  {location.phone && (
                    <a href={`https://wa.me/55${location.phone.replace(/\D/g,'')}`}
                      target="_blank" rel="noopener" style={{
                        background:'var(--surface2)', border:'1px solid rgba(34,197,94,.3)',
                        borderRadius:20, padding:'6px 14px', fontSize:12, color:'var(--green)',
                        textDecoration:'none', fontWeight:600,
                      }}>💬 WhatsApp</a>
                  )}
                </div>
              )}

              {/* Reportes ativos */}
              {actEvts.length>0 && (
                <div style={{marginBottom:16}}>
                  <p style={{fontSize:11, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--muted)', marginBottom:10}}>
                    📋 ÚLTIMOS REPORTES
                  </p>
                  {actEvts.map(ev=>{
                    const meta = EVENT_META[ev.type]; if (!meta) return null
                    return (
                      <div key={ev.id} style={{
                        display:'flex', alignItems:'center', gap:10,
                        padding:'9px 0', borderBottom:'1px solid var(--border)',
                      }}>
                        <span style={{fontSize:18}}>{meta.emoji}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12, fontWeight:600, color:meta.color}}>{meta.label}</div>
                          {ev.userName && <div style={{fontSize:11, color:'var(--muted)'}}>{ev.userName.split(' ')[0]}</div>}
                        </div>
                        <div style={{fontSize:11, color:'var(--dim)'}}>{timeAgo(ev.ts)}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Histórico */}
              {history && (
                <div style={{
                  background:'var(--surface2)', border:'1px solid var(--border)',
                  borderRadius:14, padding:14, marginBottom:16,
                }}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                    <div>
                      <div style={{fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--muted)'}}>📊 MOVIMENTO HISTÓRICO</div>
                      <div style={{fontSize:12, color:HIST_COLOR, marginTop:3, fontWeight:700}}>
                        Costuma agitar: {history.peakLabel}
                      </div>
                    </div>
                    <div style={{display:'flex', gap:4}}>
                      {['day','hour'].map(t=>(
                        <button key={t} onClick={()=>setHistTab(t)} style={{
                          padding:'3px 9px', borderRadius:7, border:'none', cursor:'pointer',
                          background: histTab===t ? HIST_COLOR : 'var(--border)',
                          color: histTab===t ? '#fff' : 'var(--muted)',
                          fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:10,
                        }}>{t==='day'?'Dia':'Hora'}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{display:'flex', gap:4, alignItems:'flex-end', height:46}}>
                    {(histTab==='day'?history.byDay:history.byHour).map((d,i)=>(
                      <HistBar key={d.label} pct={d.pct} color={HIST_COLOR}
                        highlight={histTab==='day'?i===todayIdx:i===nowSlot}/>
                    ))}
                  </div>
                  <div style={{display:'flex', gap:4, marginTop:5}}>
                    {(histTab==='day'?history.byDay:history.byHour).map((d,i)=>(
                      <div key={d.label} style={{
                        flex:1, textAlign:'center', fontSize:9,
                        color:(histTab==='day'?i===todayIdx:i===nowSlot)?HIST_COLOR:'var(--dim)',
                        fontWeight:(histTab==='day'?i===todayIdx:i===nowSlot)?800:400,
                      }}>{d.label}</div>
                    ))}
                  </div>
                  <div style={{fontSize:10, color:'var(--dim)', marginTop:8, textAlign:'right'}}>
                    baseado em {history.total} reportes
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Avaliações */}
          {activeTab==='avaliacoes' && (
            <div style={{paddingBottom:4}}>
              <div style={{
                background:'var(--surface2)', border:'1px solid var(--border)',
                borderRadius:14, padding:16, marginBottom:16,
                display:'flex', alignItems:'center', gap:16,
              }}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:"'Space Mono',monospace", fontSize:36, fontWeight:700, color:'var(--green)'}}>
                    {Math.min(5, Math.max(1, status.score)).toFixed(1)}
                  </div>
                  <StarBar score={status.score}/>
                  <div style={{fontSize:11, color:'var(--muted)', marginTop:4}}>
                    {actEvts.length+42} avaliações
                  </div>
                </div>
                <div style={{flex:1}}>
                  {[5,4,3,2,1].map(n=>(
                    <div key={n} style={{display:'flex', alignItems:'center', gap:6, marginBottom:4}}>
                      <span style={{fontSize:10, color:'var(--muted)', width:6}}>{n}</span>
                      <div style={{flex:1, height:5, background:'var(--border)', borderRadius:3, overflow:'hidden'}}>
                        <div style={{
                          height:'100%', borderRadius:3, background:'var(--green)',
                          width: n===5?'60%':n===4?'25%':n===3?'10%':n===2?'3%':'2%',
                          transition:'width .4s',
                        }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Filtros */}
              <div style={{display:'flex', gap:8, marginBottom:14}}>
                {['Todas','Com fotos','Mais recentes'].map((f,i)=>(
                  <button key={f} style={{
                    padding:'6px 12px', borderRadius:100,
                    background:i===0?'rgba(34,197,94,.12)':'var(--surface2)',
                    border:`1px solid ${i===0?'var(--green)':'var(--border)'}`,
                    color:i===0?'var(--green)':'var(--muted)',
                    fontSize:11, fontWeight:600, cursor:'pointer',
                    fontFamily:"'Inter',sans-serif",
                  }}>{f}</button>
                ))}
              </div>
              {/* Sample reviews */}
              {[
                {name:'Juliana M.',time:'2 dias atrás',stars:5,text:'Ambiente incrível e atendimento nota 10! Voltarei com certeza.'},
                {name:'Carlos T.',time:'1 semana atrás',stars:5,text:'Ótimo lugar para trabalhar e tomar um bom café.'},
              ].map((r,i)=>(
                <div key={i} style={{
                  borderBottom:'1px solid var(--border)', paddingBottom:14, marginBottom:14,
                }}>
                  <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:8}}>
                    <div style={{width:36, height:36, borderRadius:'50%', background:'var(--surface3)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16}}>👤</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13, fontWeight:700}}>{r.name}</div>
                      <div style={{fontSize:11, color:'var(--muted)'}}>{r.time}</div>
                    </div>
                    <StarBar score={r.stars}/>
                  </div>
                  <p style={{fontSize:13, color:'#c8e6cb', lineHeight:1.6}}>{r.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Fotos */}
          {activeTab==='fotos' && (
            <div style={{paddingBottom:4}}>
              <div style={{
                display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:14,
              }}>
                {[...Array(6)].map((_,i)=>(
                  <div key={i} style={{
                    aspectRatio:'1', borderRadius:10, overflow:'hidden',
                    background:`linear-gradient(${135+i*30}deg, var(--surface2), var(--surface3))`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:24, color:'var(--border2)',
                  }}>📷</div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Info */}
          {activeTab==='info' && (
            <div style={{paddingBottom:4, display:'flex', flexDirection:'column', gap:12}}>
              {[
                {icon:'🕐', label:'Horário de funcionamento', val:location.schedule||'06:00 - 22:00'},
                {icon:'📍', label:'Endereço completo', val:location.address||'Bauru, SP'},
                {icon:'📞', label:'Telefone', val:location.phone||'—'},
                {icon:'📸', label:'Instagram', val:location.instagram||'—'},
                {icon:'🏷️', label:'Categoria', val:catLabel},
              ].map((item,i)=>(
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:12,
                  background:'var(--surface2)', border:'1px solid var(--border)',
                  borderRadius:12, padding:'12px 14px',
                }}>
                  <div style={{width:36, height:36, borderRadius:10, background:'var(--surface3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0}}>{item.icon}</div>
                  <div>
                    <div style={{fontSize:11, color:'var(--muted)', marginBottom:2}}>{item.label}</div>
                    <div style={{fontSize:13, fontWeight:600}}>{item.val}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons fixas */}
        <div style={{
          position:'sticky', bottom:0,
          background:'var(--surface)',
          padding:'12px 16px', paddingBottom:'calc(12px + env(safe-area-inset-bottom,0px))',
          borderTop:'1px solid var(--border)',
        }}>
          {/* Quick actions row */}
          <div style={{display:'flex', gap:8, marginBottom:10}}>
            {[
              {icon:'🔖', label:'Salvar', onClick:()=>{}},
              {icon:'📤', label:'Compartilhar', onClick:handleShare},
              {icon:'⭐', label:'Avaliar', onClick:()=>setActiveTab('avaliacoes')},
              {icon:'🗺️', label:'Rotas', onClick:()=>{}},
            ].map(a=>(
              <button key={a.label} onClick={a.onClick} style={{
                flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                background:'var(--surface2)', border:'1px solid var(--border)',
                borderRadius:12, padding:'10px 4px', cursor:'pointer',
                color:'var(--muted)', fontFamily:"'Inter',sans-serif",
                fontSize:10, fontWeight:600,
              }}>
                <span style={{fontSize:18}}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>

          {/* Vou Lá */}
          {goingCount>0 && (
            <div style={{
              background:'rgba(59,130,246,.08)', border:'1px solid rgba(59,130,246,.25)',
              borderRadius:12, padding:'8px 12px', marginBottom:8,
              display:'flex', alignItems:'center', gap:8, fontSize:13,
            }}>
              <span style={{fontSize:18}}>🙋</span>
              <span style={{color:'#60a5fa', fontWeight:600}}>
                {isGoing?`Você${goingCount>1?` + ${goingCount-1}`:''}  vai pra cá`:`${goingCount} pessoa${goingCount>1?'s':''} vão pra cá`}
              </span>
            </div>
          )}

          {/* CTA principal */}
          <div style={{display:'flex', gap:8}}>
            <button onClick={()=>{onClose();onReport(location)}} style={{
              flex:1, padding:'14px', borderRadius:14, border:'none',
              background:'var(--surface2)', border:'1px solid var(--border)',
              color:'var(--text)', fontFamily:"'Inter',sans-serif",
              fontWeight:700, fontSize:14, cursor:'pointer',
            }}>📡 Reportar</button>

            <button
              onClick={()=>toggleGoing(user?.name||'Alguém')}
              style={{
                flex:2, padding:'14px', borderRadius:14, border:'none',
                background: isGoing?'rgba(34,197,94,.2)':'var(--green)',
                color: isGoing?'var(--green)':'#052e16',
                fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:14,
                cursor:'pointer', transition:'all .2s',
                border: isGoing?'1px solid rgba(34,197,94,.4)':'none',
              }}
              onMouseDown={e=>e.currentTarget.style.transform='scale(.98)'}
              onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
              onTouchStart={e=>e.currentTarget.style.transform='scale(.98)'}
              onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}
            >
              {isGoing?'✅ Indo!':`🧭 Como chegar`}
            </button>
          </div>

          {isOwner(location) && (
            <button onClick={()=>setOwnerOpen(true)} style={{
              width:'100%', padding:12, borderRadius:14, marginTop:8,
              border:'1px solid rgba(234,179,8,.35)',
              background:'rgba(234,179,8,.07)', color:'var(--yellow)',
              fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:13, cursor:'pointer',
            }}>👑 Gerenciar estabelecimento</button>
          )}
        </div>
      </div>

      <OwnerPanel open={ownerOpen} place={location} uid={user?.uid} onClose={()=>setOwnerOpen(false)}/>
      <ChatPanel  open={chatOpen} location={location} user={user} onClose={()=>setChatOpen(false)}/>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.7}}`}</style>
    </>
  )
}
